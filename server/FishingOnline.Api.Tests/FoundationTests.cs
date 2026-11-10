using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using FishingOnline.Api.Modules.Config;
using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Modules.Identity;
using FishingOnline.Api.Modules.Wallet;
using FishingOnline.Api.Persistence;
using FishingOnline.Domain.Config;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace FishingOnline.Api.Tests;

public sealed class AuthTests(PostgresServer postgres) : GameTestBase(postgres)
{
    private const string Cookie = "fo_refresh";

    private static string? RefreshFrom(HttpResponseMessage response) =>
        response.Headers.GetValues("Set-Cookie").Select(value => value.Split(';')[0])
            .Single(value => value.StartsWith(Cookie + "=", StringComparison.Ordinal))[(Cookie.Length + 1)..];

    private Task<HttpResponseMessage> LoginAsync(string token) =>
        App.CreateClient().PostAsJsonAsync("/api/v1/auth/login", new { firebaseIdToken = token });

    private Task<HttpResponseMessage> SendWithCookieAsync(string path, string refresh)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, path);
        request.Headers.Add("Cookie", $"{Cookie}={refresh}");
        return App.CreateClient().SendAsync(request);
    }

    [Fact]
    public async Task BadFirebaseToken_Returns401()
    {
        await AssertErrorAsync(await LoginAsync("garbage"), 401, "UNAUTHENTICATED");
    }

    [Fact]
    public async Task LoginTwice_SamePlayer_GrantedOnce()
    {
        var first = await ReadDataAsync(await LoginAsync("uid:same"));
        var second = await ReadDataAsync(await LoginAsync("uid:same"));

        Assert.True(first.GetProperty("isNew").GetBoolean());
        Assert.False(second.GetProperty("isNew").GetBoolean());
        var player = first.GetProperty("player");
        Assert.Equal(player.GetProperty("playerId").GetString(), second.GetProperty("player").GetProperty("playerId").GetString());
        Assert.Equal("100", second.GetProperty("player").GetProperty("gold").GetString());
        Assert.Equal("rod_old", player.GetProperty("equippedRodId").GetString());
        var playerId = player.GetProperty("playerId").GetGuid();
        Assert.Equal(1, await App.WithDbAsync(db => db.Set<LedgerEntry>().CountAsync(row => row.PlayerId == playerId)));
    }

    [Fact]
    public async Task ConcurrentFirstLogin_CreatesOneAccount()
    {
        var results = await Task.WhenAll(Enumerable.Range(0, 10).Select(_ => LoginAsync("uid:racer")));

        Assert.All(results, response => Assert.Equal(HttpStatusCode.OK, response.StatusCode));
        Assert.Equal(1, await App.WithDbAsync(db => db.Set<Account>().CountAsync(row => row.FirebaseUid == "racer")));
        Assert.Equal(1, await App.WithDbAsync(db => db.Set<LedgerEntry>().CountAsync()));
    }

    [Fact]
    public async Task AccessToken_OpensMeAndHub()
    {
        var login = await ReadDataAsync(await LoginAsync("uid:reader"));
        var token = login.GetProperty("accessToken").GetString();
        var client = App.CreateClient();
        client.DefaultRequestHeaders.Authorization = new("Bearer", token);

        var me = await ReadDataAsync(await client.GetAsync("/api/v1/me"));
        Assert.Equal(login.GetProperty("player").GetProperty("playerId").GetString(), me.GetProperty("playerId").GetString());

        var hub = Connect(options => options.AccessTokenProvider = () => Task.FromResult<string?>(token));
        await hub.StartAsync();
        Assert.Equal(HubConnectionState.Connected, hub.State);
        await hub.DisposeAsync();
    }

    [Fact]
    public async Task Hub_WithoutToken_IsRejected()
    {
        await using var hub = Connect(_ => { });

        var error = await Assert.ThrowsAsync<HttpRequestException>(() => hub.StartAsync());
        Assert.Equal(HttpStatusCode.Unauthorized, error.StatusCode);
    }

    [Fact]
    public async Task Me_WithoutToken_ReturnsEnvelope401()
    {
        await AssertErrorAsync(await App.CreateClient().GetAsync("/api/v1/me"), 401, "UNAUTHENTICATED");
    }

    [Fact]
    public async Task Refresh_Rotates_AndOldTokenFails()
    {
        var login = await LoginAsync("uid:rotate");
        var original = RefreshFrom(login)!;

        var refreshed = await SendWithCookieAsync("/api/v1/auth/refresh", original);
        await ReadDataAsync(refreshed);
        var rotated = RefreshFrom(refreshed)!;
        Assert.NotEqual(original, rotated);

        await AssertErrorAsync(await SendWithCookieAsync("/api/v1/auth/refresh", original), 401, "UNAUTHENTICATED");
        // Dùng lại token cũ là dấu hiệu lộ token: cả phiên bị thu hồi.
        await AssertErrorAsync(await SendWithCookieAsync("/api/v1/auth/refresh", rotated), 401, "UNAUTHENTICATED");
    }

    [Fact]
    public async Task Logout_RevokesRefresh_AndAccessToken()
    {
        var login = await LoginAsync("uid:bye");
        var refresh = RefreshFrom(login)!;
        var token = (await ReadDataAsync(login)).GetProperty("accessToken").GetString();

        Assert.Equal(HttpStatusCode.NoContent, (await SendWithCookieAsync("/api/v1/auth/logout", refresh)).StatusCode);

        await AssertErrorAsync(await SendWithCookieAsync("/api/v1/auth/refresh", refresh), 401, "UNAUTHENTICATED");
        var client = App.CreateClient();
        client.DefaultRequestHeaders.Authorization = new("Bearer", token);
        await AssertErrorAsync(await client.GetAsync("/api/v1/me"), 401, "UNAUTHENTICATED");
    }

    [Fact]
    public async Task RefreshCookie_IsHttpOnlySecureLax()
    {
        var cookie = (await LoginAsync("uid:cookie")).Headers.GetValues("Set-Cookie").Single();

        Assert.Contains("httponly", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("secure", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=lax", cookie, StringComparison.OrdinalIgnoreCase);
    }

    private Microsoft.AspNetCore.SignalR.Client.HubConnection Connect(Action<Microsoft.AspNetCore.Http.Connections.Client.HttpConnectionOptions> configure) =>
        new HubConnectionBuilder().WithUrl(new Uri(App.Server.BaseAddress, "/hubs/game"), options =>
        {
            options.HttpMessageHandlerFactory = _ => App.Server.CreateHandler();
            options.Transports = Microsoft.AspNetCore.Http.Connections.HttpTransportType.LongPolling;
            configure(options);
        }).Build();
}

public sealed class FirebaseVerifierTests : IDisposable
{
    private const string ProjectId = "unit-project";
    private readonly RSA rsa = RSA.Create(2048);
    private readonly RsaSecurityKey key;

    public FirebaseVerifierTests() => key = new RsaSecurityKey(rsa) { KeyId = "k1" };

    private JwksFirebaseTokenVerifier Verifier()
    {
        var jwk = JsonWebKeyConverter.ConvertFromRSASecurityKey(new RsaSecurityKey(rsa.ExportParameters(false)) { KeyId = "k1" });
        var jwks = JsonSerializer.Serialize(new { keys = new[] { new { kty = "RSA", alg = "RS256", use = "sig", kid = "k1", n = jwk.N, e = jwk.E } } });
        return new JwksFirebaseTokenVerifier(
            new HttpClient(new StaticHandler(jwks)), Options.Create(new AuthOptions { FirebaseProjectId = ProjectId }), TimeProvider.System,
            Microsoft.Extensions.Logging.Abstractions.NullLogger<JwksFirebaseTokenVerifier>.Instance);
    }

    private string Token(string issuer = $"https://securetoken.google.com/{ProjectId}", string audience = ProjectId, string provider = "google.com", int expiresInMinutes = 30, SecurityKey? signWith = null)
    {
        var now = DateTime.UtcNow;
        return new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Issuer = issuer,
            Audience = audience,
            NotBefore = now.AddHours(-2),
            IssuedAt = now.AddHours(-2),
            Expires = now.AddMinutes(expiresInMinutes),
            SigningCredentials = new SigningCredentials(signWith ?? key, SecurityAlgorithms.RsaSha256),
            Claims = new Dictionary<string, object>
            {
                ["sub"] = "firebase-uid",
                ["firebase"] = new Dictionary<string, object> { ["sign_in_provider"] = provider },
            },
        });
    }

    [Fact]
    public async Task ValidGoogleToken_ReturnsIdentity()
    {
        var identity = await Verifier().VerifyAsync(Token(), default);

        Assert.Equal("firebase-uid", identity.Uid);
        Assert.Equal(ProjectId, identity.ProjectId);
        Assert.Equal("google.com", identity.Provider);
    }

    [Theory]
    [InlineData("issuer")]
    [InlineData("audience")]
    [InlineData("expired")]
    [InlineData("provider")]
    [InlineData("signature")]
    public async Task InvalidToken_IsRejected(string defect)
    {
        var token = defect switch
        {
            "issuer" => Token(issuer: "https://securetoken.google.com/other"),
            "audience" => Token(audience: "other"),
            "expired" => Token(expiresInMinutes: -30),
            "provider" => Token(provider: "anonymous"),
            _ => Token(signWith: new RsaSecurityKey(RSA.Create(2048)) { KeyId = "k1" }),
        };

        var error = await Assert.ThrowsAsync<GameException>(() => Verifier().VerifyAsync(token, default));
        Assert.Equal("UNAUTHENTICATED", error.Code);
    }

    public void Dispose() => rsa.Dispose();

    private sealed class StaticHandler(string body) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(body) });
    }
}

public sealed class WalletTests(PostgresServer postgres) : GameTestBase(postgres)
{
    private async Task<long> DebitInNewScopeAsync(Guid playerId, long amount)
    {
        await using var scope = App.Services.CreateAsyncScope();
        return await scope.ServiceProvider.GetRequiredService<IWallet>().DebitAsync(playerId, amount, LedgerReasons.BuyRod, Guid.NewGuid().ToString(), default);
    }

    [Fact]
    public async Task FiftyParallelDebits_ExactlyTenSucceed_AndLedgerMatchesBalance()
    {
        var playerId = await App.NewPlayerAsync();

        var attempts = await Task.WhenAll(Enumerable.Range(0, 50).Select(async _ =>
        {
            try
            {
                await DebitInNewScopeAsync(playerId, 10);
                return true;
            }
            catch (InsufficientGoldException)
            {
                return false;
            }
        }));

        Assert.Equal(10, attempts.Count(ok => ok));
        Assert.Equal(0, await App.WithDbAsync(db => db.Set<WalletRow>().Where(row => row.PlayerId == playerId).Select(row => row.Gold).SingleAsync()));
        Assert.Equal(0, await App.WithDbAsync(db => db.Set<LedgerEntry>().Where(row => row.PlayerId == playerId).SumAsync(row => row.Delta)));
    }

    [Fact]
    public async Task CallerRollback_RemovesLedger()
    {
        var playerId = await App.NewPlayerAsync();
        var before = await App.WithDbAsync(db => db.Set<LedgerEntry>().CountAsync(row => row.PlayerId == playerId));

        await using (var scope = App.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
            await using var transaction = await db.Database.BeginTransactionAsync();
            await scope.ServiceProvider.GetRequiredService<IWallet>().DebitAsync(playerId, 10, LedgerReasons.BuyRod, "r", default);
            await transaction.RollbackAsync();
        }

        Assert.Equal(before, await App.WithDbAsync(db => db.Set<LedgerEntry>().CountAsync(row => row.PlayerId == playerId)));
        Assert.Equal(100, await App.WithDbAsync(db => db.Set<WalletRow>().Where(row => row.PlayerId == playerId).Select(row => row.Gold).SingleAsync()));
    }
}

public sealed class IdempotencyTests(PostgresServer postgres) : GameTestBase(postgres)
{
    private static HttpRequestMessage Buy(string key, string offerId = "offer_rod_steel_awl")
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/shop/buy") { Content = JsonContent.Create(new { offerId, quantity = 1 }) };
        if (key.Length > 0) request.Headers.Add("Idempotency-Key", key);
        return request;
    }

    private Task<int> BuyLedgerCountAsync(Guid playerId) =>
        App.WithDbAsync(db => db.Set<LedgerEntry>().CountAsync(row => row.PlayerId == playerId && row.Reason == LedgerReasons.BuyRod));

    [Fact]
    public async Task SameKeySameBody_ReturnsIdenticalResponse_OneLedger()
    {
        var playerId = await App.NewPlayerAsync(1000);
        var client = App.Http(playerId);
        var key = Guid.NewGuid().ToString();

        var first = await (await client.SendAsync(Buy(key))).Content.ReadAsStringAsync();
        var second = await (await client.SendAsync(Buy(key))).Content.ReadAsStringAsync();

        Assert.Contains("\"gold\":\"800\"", first);
        Assert.Equal(JsonDocument.Parse(first).RootElement.GetRawText(), JsonDocument.Parse(second).RootElement.GetRawText());
        Assert.Equal(1, await BuyLedgerCountAsync(playerId));
    }

    [Fact]
    public async Task SameKeyDifferentBody_Returns409()
    {
        var playerId = await App.NewPlayerAsync(1000);
        var client = App.Http(playerId);
        var key = Guid.NewGuid().ToString();
        (await client.SendAsync(Buy(key))).EnsureSuccessStatusCode();

        await AssertErrorAsync(await client.SendAsync(Buy(key, "offer_rod_bliss")), 409, "IDEMPOTENCY_CONFLICT");
    }

    [Fact]
    public async Task MissingHeader_Returns400()
    {
        var playerId = await App.NewPlayerAsync(1000);

        await AssertErrorAsync(await App.Http(playerId).SendAsync(Buy(string.Empty)), 400, "VALIDATION_FAILED");
    }

    [Fact]
    public async Task SameKeyInParallel_ExecutesOnce()
    {
        var playerId = await App.NewPlayerAsync(1000);
        var key = Guid.NewGuid().ToString();

        var responses = await Task.WhenAll(Enumerable.Range(0, 8).Select(_ => App.Http(playerId).SendAsync(Buy(key))));

        Assert.All(responses, response => Assert.Equal(HttpStatusCode.OK, response.StatusCode));
        Assert.Equal(1, await BuyLedgerCountAsync(playerId));
    }

    [Fact]
    public async Task Cleanup_RemovesOnlyOldReceipts()
    {
        var playerId = await App.NewPlayerAsync(1000);
        (await App.Http(playerId).SendAsync(Buy(Guid.NewGuid().ToString()))).EnsureSuccessStatusCode();
        var cleanup = App.Services.GetServices<Microsoft.Extensions.Hosting.IHostedService>().OfType<IdempotencyCleanup>().Single();

        Assert.Equal(0, await cleanup.PurgeAsync(default));
        App.Clock.Advance(TimeSpan.FromDays(8));
        Assert.Equal(1, await cleanup.PurgeAsync(default));
    }
}

public sealed class ConfigTests(PostgresServer postgres) : GameTestBase(postgres)
{
    private static GameplayConfig Fixture() => GameplayConfigJson.Parse(File.ReadAllText(
        Path.Combine(AppContext.BaseDirectory, "fixtures", "gameplay-config.v0.json")));

    [Fact]
    public void Fixture_IsValid() => Assert.Empty(GameplayConfigValidator.Validate(Fixture()));

    [Fact]
    public void MissingSpecies_IsRejectedWithErrorList()
    {
        var config = Fixture();
        var broken = config with { Fish = config.Fish.Skip(1).ToArray(), Rods = [] };

        var errors = GameplayConfigValidator.Validate(broken);

        Assert.Contains(errors, error => error.StartsWith("fish:", StringComparison.Ordinal));
        Assert.Contains(errors, error => error.StartsWith("rods:", StringComparison.Ordinal));
        var stored = Assert.Throws<InvalidGameplayConfigException>(() => new ConfigProvider().Store(broken, isActive: true));
        Assert.Equal(errors, stored.Errors);
    }

    [Fact]
    public async Task EmptyTable_LoadsFixture_AndCatalogHidesSpawn()
    {
        var catalog = await ReadDataAsync(await App.CreateClient().GetAsync("/api/v1/catalog"));

        Assert.False(catalog.TryGetProperty("spawn", out _));
        var fixture = Fixture();
        Assert.Equal(fixture.ConfigVersion, catalog.GetProperty("configVersion").GetString());
        Assert.Equal(fixture.Fish.Count, catalog.GetProperty("fish").GetArrayLength());
        Assert.Equal(fixture.Levels.Count, catalog.GetProperty("levels").GetArrayLength());
        Assert.Equal("50", catalog.GetProperty("ticketPricing").GetProperty("unitPriceGold").GetString());
        Assert.False(catalog.TryGetProperty("seatTiers", out _));
        Assert.Equal(fixture, App.Service<IConfigProvider>().Current, GameplayConfigComparer.Instance);
        Assert.Equal(1, await App.WithDbAsync(db => db.Set<ConfigVersionRow>().CountAsync(row => row.IsActive)));
    }

    private sealed class GameplayConfigComparer : IEqualityComparer<GameplayConfig>
    {
        public static readonly GameplayConfigComparer Instance = new();

        public bool Equals(GameplayConfig? x, GameplayConfig? y) =>
            GameplayConfigJson.Serialize(x!) == GameplayConfigJson.Serialize(y!);

        public int GetHashCode(GameplayConfig obj) => 0;
    }
}

public sealed class ProfileTests(PostgresServer postgres) : GameTestBase(postgres)
{
    private static object Name(string displayName) => new { displayName };

    [Fact]
    public async Task ShortName_Returns400()
    {
        var client = App.Http(await App.NewPlayerAsync());

        await AssertErrorAsync(await client.PutAsJsonAsync("/api/v1/me/display-name", Name("ab")), 400, "VALIDATION_FAILED");
    }

    [Fact]
    public async Task DuplicateName_IgnoringCase_Returns409()
    {
        (await App.Http(await App.NewPlayerAsync()).PutAsJsonAsync("/api/v1/me/display-name", Name("Zen Master"))).EnsureSuccessStatusCode();

        var response = await App.Http(await App.NewPlayerAsync()).PutAsJsonAsync("/api/v1/me/display-name", Name("zen master"));

        await AssertErrorAsync(response, 409, "STATE_CONFLICT");
    }

    [Fact]
    public async Task Me_MatchesSampleShape()
    {
        var sample = JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "fixtures", "api-samples.v0.json")))
            .RootElement.GetProperty("http").GetProperty("GET /api/v1/me 200").GetProperty("data");

        var me = await ReadDataAsync(await App.Http(await App.NewPlayerAsync()).GetAsync("/api/v1/me"));

        Assert.Equal(sample.EnumerateObject().Select(p => p.Name).Order(), me.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal(JsonValueKind.String, me.GetProperty("gold").ValueKind);
    }
}
