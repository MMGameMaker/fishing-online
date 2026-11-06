using FishingOnline.Api.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using StackExchange.Redis;

namespace FishingOnline.Api.Infrastructure;

public sealed class PostgresHealthCheck(IServiceScopeFactory scopeFactory, IConfiguration configuration) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(configuration.GetConnectionString("Postgres")))
            return HealthCheckResult.Unhealthy("Not configured");
        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
            if (!await db.Database.CanConnectAsync(cancellationToken))
                return HealthCheckResult.Unhealthy("Unavailable");
            if ((await db.Database.GetPendingMigrationsAsync(cancellationToken)).Any())
                return HealthCheckResult.Unhealthy("Migration required");
            // Also verify that the application schema is actually readable, not just the TCP port.
            await db.Players.AsNoTracking().AnyAsync(cancellationToken);
            return HealthCheckResult.Healthy();
        }
        catch (Exception exception) when (exception is not OutOfMemoryException)
        {
            // Do not attach connection exceptions: endpoints/logs must not disclose credentials.
            return HealthCheckResult.Unhealthy("Unavailable");
        }
    }
}

public sealed class RedisHealthCheck(IServiceProvider services, IConfiguration configuration) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(configuration.GetConnectionString("Redis")))
            return HealthCheckResult.Unhealthy("Not configured");
        try
        {
            var redis = services.GetRequiredService<IConnectionMultiplexer>();
            await redis.GetDatabase().PingAsync().WaitAsync(cancellationToken);
            return HealthCheckResult.Healthy();
        }
        catch (Exception exception) when (exception is not OutOfMemoryException)
        {
            return HealthCheckResult.Unhealthy("Unavailable");
        }
    }
}
