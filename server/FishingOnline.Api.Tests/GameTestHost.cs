using System.Collections.Concurrent;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using DotNet.Testcontainers.Builders;
using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Modules.Identity;
using FishingOnline.Api.Modules.Lake;
using FishingOnline.Api.Modules.Wallet;
using FishingOnline.Api.Persistence;
using FishingOnline.Domain;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using Testcontainers.PostgreSql;

namespace FishingOnline.Api.Tests;

/// <summary>
/// PostgreSQL thật cho test: ưu tiên server local (FISHING_TEST_POSTGRES hoặc bản portable ở cổng 55432),
/// nếu không có thì dùng Testcontainers. Migrate một database mẫu rồi nhân bản cho từng test.
/// </summary>
public sealed class PostgresServer : IAsyncLifetime
{
    private const string LocalPortable = "Host=127.0.0.1;Port=55432;Username=postgres;Database=postgres;Maximum Pool Size=200;Timeout=5";
    private const string TemplateName = "fishing_test_template";
    private PostgreSqlContainer? container;
    private string? adminConnection;

    public string? UnavailableReason { get; private set; }

    public async ValueTask InitializeAsync()
    {
        foreach (var candidate in new[] { Environment.GetEnvironmentVariable("FISHING_TEST_POSTGRES"), LocalPortable })
        {
            if (string.IsNullOrWhiteSpace(candidate)) continue;
            try
            {
                await using var probe = new NpgsqlConnection(candidate);
                await probe.OpenAsync();
                adminConnection = candidate;
                break;
            }
            catch (NpgsqlException)
            {
                // Thử nguồn tiếp theo.
            }
        }

        if (adminConnection is null)
        {
            try
            {
                container = new PostgreSqlBuilder("postgres:17.6-alpine").Build();
                await container.StartAsync();
                adminConnection = container.GetConnectionString();
            }
            catch (DockerUnavailableException exception)
            {
                UnavailableReason = exception.Message;
                return;
            }
        }

        await ExecuteAsync($"DROP DATABASE IF EXISTS \"{TemplateName}\" WITH (FORCE)");
        await ExecuteAsync($"CREATE DATABASE \"{TemplateName}\"");
        await using var db = new GameDbContext(new DbContextOptionsBuilder<GameDbContext>().UseNpgsql(For(TemplateName)).Options);
        await db.Database.MigrateAsync();
        await db.Database.MigrateAsync();
        NpgsqlConnection.ClearAllPools();
    }

    public async ValueTask DisposeAsync()
    {
        if (container is not null) await container.DisposeAsync();
    }

    public async Task<string> CreateDatabaseAsync()
    {
        if (UnavailableReason is { } reason) Assert.Skip($"Cần PostgreSQL: {reason}");
        var name = "fishing_test_" + Guid.NewGuid().ToString("N");
        await ExecuteAsync($"CREATE DATABASE \"{name}\" TEMPLATE \"{TemplateName}\"");
        return For(name);
    }

    public async Task DropDatabaseAsync(string connectionString)
    {
        var name = new NpgsqlConnectionStringBuilder(connectionString).Database;
        NpgsqlConnection.ClearAllPools();
        await ExecuteAsync($"DROP DATABASE IF EXISTS \"{name}\" WITH (FORCE)");
    }

    private string For(string database) => new NpgsqlConnectionStringBuilder(adminConnection) { Database = database }.ConnectionString;

    private async Task ExecuteAsync(string sql)
    {
        await using var connection = new NpgsqlConnection(adminConnection);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(sql, connection);
        await command.ExecuteNonQueryAsync();
    }
}

[CollectionDefinition(Name)]
public sealed class PostgresCollection : ICollectionFixture<PostgresServer>
{
    public const string Name = "postgres";
}

public sealed class ManualClock(DateTimeOffset start) : TimeProvider
{
    private long ticks = start.UtcTicks;

    public override DateTimeOffset GetUtcNow() => new(Interlocked.Read(ref ticks), TimeSpan.Zero);

    public void Advance(TimeSpan by) => Interlocked.Add(ref ticks, by.Ticks);

    public void AdvanceMs(double ms) => Advance(TimeSpan.FromMilliseconds(ms));
}

public sealed class SeededRandom(int seed) : IRandomSource
{
    private readonly Random random = new(seed);

    public double NextDouble()
    {
        lock (random) return random.NextDouble();
    }

    public int NextInt(int minInclusive, int maxInclusive)
    {
        lock (random) return random.Next(minInclusive, maxInclusive + 1);
    }
}

/// <summary>
/// Token "uid:&lt;id&gt;" là Player; "admin:&lt;email&gt;" là email đã xác minh và đã qua MFA;
/// "admin-nomfa:&lt;email&gt;" chưa qua MFA. Còn lại bị từ chối.
/// </summary>
public sealed class FakeFirebaseVerifier : IFirebaseTokenVerifier
{
    public Task<FirebaseIdentity> VerifyAsync(string idToken, CancellationToken ct)
    {
        if (idToken.StartsWith("uid:", StringComparison.Ordinal))
            return Task.FromResult(new FirebaseIdentity("test-project", idToken[4..], "google.com"));
        if (idToken.StartsWith("admin:", StringComparison.Ordinal))
            return Task.FromResult(new FirebaseIdentity("test-project", idToken, "google.com", idToken[6..], true, "totp"));
        if (idToken.StartsWith("admin-nomfa:", StringComparison.Ordinal))
            return Task.FromResult(new FirebaseIdentity("test-project", idToken, "google.com", idToken[12..], true));
        throw new GameException("UNAUTHENTICATED");
    }
}

public sealed class GameApp : WebApplicationFactory<Program>
{
    private static readonly string[] Events =
    [
        "PlayerJoined", "PlayerLeft", "PlayerMoved", "SeatChanged", "MyTicket", "MySeat", "AttemptUpdate", "CatchShown",
        "FailShown",
        "SkinChanged", "ChatReceived", "EmojiReceived",
    ];

    public required string ConnectionString { get; init; }
    public bool RealTimers { get; init; }
    public ManualClock Clock { get; init; } = new(DateTimeOffset.UtcNow);

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("ConnectionStrings:Postgres", ConnectionString);
        builder.UseSetting("Auth:DevBypass", "true");
        builder.UseSetting("Auth:JwtSigningKey", Convert.ToBase64String(RandomNumberGenerator.GetBytes(48)));
        if (!RealTimers)
        {
            builder.UseSetting("Lake:SweepIntervalMs", "0");
            builder.UseSetting("Fishing:TickIntervalMs", "0");
            builder.UseSetting("Admin:StockingPollMs", "0");
        }
        builder.ConfigureTestServices(services =>
        {
            services.AddSingleton<IFirebaseTokenVerifier, FakeFirebaseVerifier>();
            if (RealTimers) return;
            services.AddSingleton<TimeProvider>(Clock);
            services.AddSingleton<IRandomSource>(new SeededRandom(7));
        });
    }

    public T Service<T>() where T : notnull => Services.GetRequiredService<T>();

    public async Task<T> WithDbAsync<T>(Func<GameDbContext, Task<T>> action)
    {
        await using var scope = Services.CreateAsyncScope();
        return await action(scope.ServiceProvider.GetRequiredService<GameDbContext>());
    }

    public async Task CreditAsync(Guid playerId, long gold)
    {
        await using var scope = Services.CreateAsyncScope();
        await scope.ServiceProvider.GetRequiredService<IWallet>().CreditAsync(playerId, gold, LedgerReasons.AdminAdjust, "test", default);
    }

    public HttpClient Http(Guid? playerId)
    {
        var client = CreateClient();
        if (playerId is not null) client.DefaultRequestHeaders.Add("X-Dev-Player", playerId.ToString());
        return client;
    }

    /// <summary>Gọi một request bất kỳ để tạo player dev kèm ví 100 Gold và cần mặc định.</summary>
    public async Task<Guid> NewPlayerAsync(long? gold = null)
    {
        var playerId = Guid.NewGuid();
        (await Http(playerId).GetAsync("/api/v1/me")).EnsureSuccessStatusCode();
        if (gold is > 0) await CreditAsync(playerId, gold.Value);
        return playerId;
    }

    public async Task<TestPlayer> ConnectAsync(Guid? playerId = null)
    {
        var id = playerId ?? await NewPlayerAsync();
        var connection = new HubConnectionBuilder()
            .WithUrl(new Uri(Server.BaseAddress, "/hubs/game"), options =>
            {
                options.HttpMessageHandlerFactory = _ => Server.CreateHandler();
                options.Transports = Microsoft.AspNetCore.Http.Connections.HttpTransportType.LongPolling;
                options.Headers["X-Dev-Player"] = id.ToString();
            })
            .Build();
        var player = new TestPlayer(id, connection);
        foreach (var name in Events)
            connection.On<JsonElement>(name, payload => player.Received.Enqueue((name, payload)));
        await connection.StartAsync();
        return player;
    }
}

public sealed class TestPlayer(Guid playerId, HubConnection connection) : IAsyncDisposable
{
    private static readonly TimeSpan WaitLimit = TimeSpan.FromSeconds(10);

    public Guid PlayerId { get; } = playerId;
    public HubConnection Connection { get; } = connection;
    public ConcurrentQueue<(string Name, JsonElement Payload)> Received { get; } = new();

    public Task<JsonElement> InvokeAsync(string method, object? arguments = null, Guid? requestId = null)
    {
        var body = JsonSerializer.SerializeToElement(arguments ?? new { }, GameJson.Options).EnumerateObject()
            .ToDictionary(property => property.Name, property => (object?)property.Value);
        body["requestId"] = (requestId ?? Guid.NewGuid()).ToString();
        return Connection.InvokeAsync<JsonElement>(method, body);
    }

    public async Task<JsonElement> OkAsync(string method, object? arguments = null, Guid? requestId = null)
    {
        var ack = await InvokeAsync(method, arguments, requestId);
        Assert.True(ack.GetProperty("ok").GetBoolean(), ack.GetRawText());
        return ack.GetProperty("data");
    }

    public async Task<string> ErrorAsync(string method, object? arguments = null, Guid? requestId = null)
    {
        var ack = await InvokeAsync(method, arguments, requestId);
        Assert.False(ack.GetProperty("ok").GetBoolean(), ack.GetRawText());
        return ack.GetProperty("error").GetProperty("code").GetString()!;
    }

    public async Task<JsonElement> WaitForAsync(string name, Func<JsonElement, bool>? match = null)
    {
        var deadline = DateTime.UtcNow + WaitLimit;
        while (DateTime.UtcNow < deadline)
        {
            foreach (var (eventName, payload) in Received)
                if (eventName == name && (match is null || match(payload)))
                    return payload;
            await Task.Delay(10);
        }
        throw new TimeoutException($"Event {name} did not arrive. Received: {string.Join(", ", Received.Select(item => item.Name))}");
    }

    public ValueTask DisposeAsync() => Connection.DisposeAsync();
}

[Collection(PostgresCollection.Name)]
public abstract class GameTestBase(PostgresServer postgres) : IAsyncLifetime
{
    private readonly List<GameApp> apps = [];
    private string? connectionString;

    protected GameApp App { get; private set; } = null!;

    protected PostgresServer Postgres => postgres;

    protected string ConnectionString => connectionString!;

    public async ValueTask InitializeAsync()
    {
        connectionString = await postgres.CreateDatabaseAsync();
        App = StartApp();
    }

    public async ValueTask DisposeAsync()
    {
        foreach (var app in apps) await app.DisposeAsync();
        if (connectionString is not null) await postgres.DropDatabaseAsync(connectionString);
    }

    protected GameApp StartApp(ManualClock? clock = null, bool realTimers = false)
    {
        var app = new GameApp { ConnectionString = connectionString!, Clock = clock ?? new ManualClock(DateTimeOffset.UtcNow), RealTimers = realTimers };
        _ = app.Server;
        apps.Add(app);
        return app;
    }

    protected const string PriceVersion = "ticket-price-test-01";

    protected static object TicketArgs(int quantity = 1) => new { quantity, expectedPriceVersion = PriceVersion };

    /// <summary>Mua vé (nếu <paramref name="tickets"/> &gt; 0), đứng cạnh ghế rồi ngồi. Player phải đã JoinLake.</summary>
    protected async Task<JsonElement> SitAsync(TestPlayer player, string seatId, int tickets = 1, GameApp? app = null)
    {
        app ??= App;
        if (tickets > 0) await player.OkAsync("BuyTicket", TicketArgs(tickets));
        return await player.OkAsync("SitDown", new { seatId });
    }

    protected static async Task<JsonElement> ReadDataAsync(HttpResponseMessage response)
    {
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
    }

    protected static async Task AssertErrorAsync(HttpResponseMessage response, int status, string code)
    {
        Assert.Equal(status, (int)response.StatusCode);
        Assert.Equal(code, (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("error").GetProperty("code").GetString());
    }
}
