using FishingOnline.Api.Infrastructure;
using FishingOnline.Api.Modules.Admin;
using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Modules.Config;
using FishingOnline.Api.Modules.Economy;
using FishingOnline.Api.Modules.Fishing;
using FishingOnline.Api.Modules.Identity;
using FishingOnline.Api.Modules.Lake;
using FishingOnline.Api.Modules.Social;
using FishingOnline.Api.Modules.Wallet;
using FishingOnline.Api.Persistence;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);
var postgresConnection = builder.Configuration.GetConnectionString("Postgres");
var hasDatabase = !string.IsNullOrWhiteSpace(postgresConnection);
if (hasDatabase)
    builder.Services.AddDbContext<GameDbContext>(options => options.UseNpgsql(postgresConnection,
        postgres => postgres.CommandTimeout(10)));
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
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddCommon();
builder.Services.AddIdentityModule(builder.Configuration, hasDatabase);
if (hasDatabase)
{
    builder.Services.AddScoped<IdempotencyService>();
    builder.Services.AddScoped<IIdempotency>(provider => provider.GetRequiredService<IdempotencyService>());
    builder.Services.AddHostedService<IdempotencyCleanup>();
    builder.Services.AddConfigModule();
    builder.Services.AddWallet();
    builder.Services.AddLake();
    builder.Services.AddEconomy();
    builder.Services.AddFishing();
    builder.Services.AddSocial(builder.Configuration);
    builder.Services.AddAdmin(builder.Configuration);
}
var clientOrigins = builder.Configuration.GetSection("ClientOrigins").Get<string[]>() ?? [];
var isDevelopment = builder.Environment.IsDevelopment();
builder.Services.AddCors(options => options.AddPolicy("Client", policy =>
    policy.SetIsOriginAllowed(origin => clientOrigins.Contains(origin) || (isDevelopment && IsLocalDevOrigin(origin)))
        .AllowAnyHeader().AllowAnyMethod().AllowCredentials()));
var app = builder.Build();
app.UseCors("Client");
app.UseMiddleware<GameExceptionMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
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
app.MapCommon();
if (hasDatabase)
{
    app.MapIdentityModule();
    app.MapConfigModule();
    app.MapEconomy();
    app.MapSocial();
    app.MapAdmin();
    // Nạp Gold thử cho tab "Nạp Gold" khi chưa có cổng thanh toán; không có ở môi trường khác.
    if (isDevelopment)
    {
        app.MapDevTopUp();
        // Lệnh test thanh thông báo khoe cá (POST /api/v1/dev/announce-catch).
        app.MapDevCatchAnnouncement();
    }
}
app.Run();

/// <summary>
/// Development: Vite tự đổi cổng (5173, 5174, 5175…) khi cổng trước bận, nên chấp nhận mọi cổng
/// của localhost/127.0.0.1 qua http. Môi trường khác chỉ dùng danh sách ClientOrigins.
/// </summary>
static bool IsLocalDevOrigin(string origin) =>
    Uri.TryCreate(origin, UriKind.Absolute, out var uri)
    && uri.Scheme == Uri.UriSchemeHttp
    && (uri.Host == "localhost" || uri.Host == "127.0.0.1");
