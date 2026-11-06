using FishingOnline.Api.Infrastructure;
using FishingOnline.Api.Persistence;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);
var postgresConnection = builder.Configuration.GetConnectionString("Postgres");
if (!string.IsNullOrWhiteSpace(postgresConnection))
    builder.Services.AddDbContext<GameDbContext>(options => options.UseNpgsql(postgresConnection,
        postgres => postgres.CommandTimeout(2)));
var redisConnection = builder.Configuration.GetConnectionString("Redis");
if (!string.IsNullOrWhiteSpace(redisConnection))
{
    builder.Services.AddSingleton<IConnectionMultiplexer>(_ =>
    {
        var options = ConfigurationOptions.Parse(redisConnection);
        options.AbortOnConnectFail = false;
        options.ConnectTimeout = 1000;
        options.ConnectRetry = 0;
        options.AsyncTimeout = 1000;
        return ConnectionMultiplexer.Connect(options);
    });
}
builder.Services.AddHealthChecks()
    .AddCheck<PostgresHealthCheck>("postgres", timeout: TimeSpan.FromSeconds(3))
    .AddCheck<RedisHealthCheck>("redis", timeout: TimeSpan.FromSeconds(3));
builder.Services.AddSignalR(options => options.MaximumReceiveMessageSize = 16 * 1024);
builder.Services.AddCors(options => options.AddPolicy("Client", policy =>
    policy.WithOrigins(builder.Configuration.GetSection("ClientOrigins").Get<string[]>() ?? [])
        .AllowAnyHeader().AllowAnyMethod().AllowCredentials()));
var app = builder.Build();
app.UseCors("Client");
app.MapGet("/health/live", () => Results.Ok(new { status = "alive" }));
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new
        {
            status = report.Status == Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Healthy ? "ready" : "notReady",
            checks = report.Entries.ToDictionary(entry => entry.Key,
                entry => entry.Value.Status == Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Healthy ? "ready" : "notReady")
        }, context.RequestAborted);
    }
});
app.MapGet("/api/v1/bootstrap", () => Results.Ok(new
{
    contractVersion = "0.1-draft", mode = "transport-only",
    gameplayAvailable = false, hubPath = "/hubs/game"
}));
// Transport diagnostics only; no player identity or gameplay is accepted here.
if (app.Environment.IsDevelopment()) app.MapHub<DiagnosticHub>("/hubs/game");
app.Run();

public sealed class DiagnosticHub : Hub
{
    public object Ping() => new { contractVersion = "0.1-draft", serverTime = DateTimeOffset.UtcNow };
}
