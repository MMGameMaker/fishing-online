using FishingOnline.Api.Infrastructure;
using FishingOnline.Api.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Npgsql;
using StackExchange.Redis;

var source = Environment.GetEnvironmentVariable("ConnectionStrings__Postgres")
    ?? throw new InvalidOperationException("Load server/load-local-env.ps1 first.");
var connection = new NpgsqlConnectionStringBuilder(source);
if (connection.Host is not ("127.0.0.1" or "localhost") || connection.Database != "fishing_online")
    throw new InvalidOperationException("Checks only run against the local fishing_online development server.");
var databaseName = "fishing_check_" + Guid.NewGuid().ToString("N");
var adminConnection = new NpgsqlConnectionStringBuilder(source) { Database = "postgres", Pooling = false };
await using var admin = new NpgsqlConnection(adminConnection.ConnectionString);
await admin.OpenAsync();
await using (var create = new NpgsqlCommand($"CREATE DATABASE \"{databaseName}\"", admin))
    await create.ExecuteNonQueryAsync();
try
{
    connection.Database = databaseName;
    var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
    {
        ["ConnectionStrings:Postgres"] = connection.ConnectionString
    }).Build();
    var services = new ServiceCollection();
    services.AddDbContext<GameDbContext>(options => options.UseNpgsql(connection.ConnectionString));
    using var provider = services.BuildServiceProvider();
    var health = new PostgresHealthCheck(provider.GetRequiredService<IServiceScopeFactory>(), config);
    Check((await health.CheckHealthAsync(new HealthCheckContext())).Status == HealthStatus.Unhealthy,
        "Empty database is not ready before migrations");
    var playerId = Guid.NewGuid();
    await using (var scope = provider.CreateAsyncScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        await db.Database.MigrateAsync();
        await db.Database.MigrateAsync();
        Check(!(await db.Database.GetPendingMigrationsAsync()).Any(), "Migration repeat is idempotent");
        Check(!db.Database.HasPendingModelChanges(), "Model matches migration snapshot");
        db.Players.Add(new PlayerProfile { Id = playerId, DisplayName = "Integration check", CreatedAt = DateTimeOffset.UtcNow });
        await db.SaveChangesAsync();
    }
    await using (var scope = provider.CreateAsyncScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        var player = await db.Players.AsNoTracking().SingleAsync(player => player.Id == playerId);
        Check(player.DisplayName == "Integration check", "Profile persists across DbContext instances");
        db.Players.Add(new PlayerProfile { Id = playerId, DisplayName = "Duplicate", CreatedAt = DateTimeOffset.UtcNow });
        try { await db.SaveChangesAsync(); throw new InvalidOperationException("Duplicate key unexpectedly accepted"); }
        catch (DbUpdateException exception) when (exception.InnerException is PostgresException { SqlState: "23505" })
        { Console.WriteLine("PASS: Database enforces unique player ID"); }
    }
    Check((await health.CheckHealthAsync(new HealthCheckContext())).Status == HealthStatus.Healthy,
        "Migrated schema is ready");
    await using (var scope = provider.CreateAsyncScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        await db.Database.ExecuteSqlRawAsync("DROP TABLE game.players");
    }
    Check((await health.CheckHealthAsync(new HealthCheckContext())).Status == HealthStatus.Unhealthy,
        "Missing application table is not ready even when migration history exists");
}
finally
{
    // Only the randomly named database created above is removed. Never touch the app DB.
    NpgsqlConnection.ClearAllPools();
    await using var drop = new NpgsqlCommand($"DROP DATABASE \"{databaseName}\" WITH (FORCE)", admin);
    await drop.ExecuteNonQueryAsync();
}
var redisConnection = Environment.GetEnvironmentVariable("ConnectionStrings__Redis")
    ?? throw new InvalidOperationException("Set ConnectionStrings__Redis.");
using var redis = await ConnectionMultiplexer.ConnectAsync(redisConnection);
var cache = redis.GetDatabase();
var key = "fishing:integration:" + Guid.NewGuid().ToString("N");
try
{
    await cache.StringSetAsync(key, "roundtrip", TimeSpan.FromMinutes(1));
    Check(await cache.StringGetAsync(key) == "roundtrip", "Redis SET/GET roundtrip");
    Check(await cache.KeyTimeToLiveAsync(key) is { TotalSeconds: > 0 and <= 60 }, "Redis test key has TTL");
}
finally { await cache.KeyDeleteAsync(key); }
Console.WriteLine("PASS: Isolated database and Redis test data cleaned up");

static void Check(bool condition, string name)
{
    if (!condition) throw new InvalidOperationException(name);
    Console.WriteLine("PASS: " + name);
}
