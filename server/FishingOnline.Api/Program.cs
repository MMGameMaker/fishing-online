using Microsoft.AspNetCore.SignalR;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSignalR(options => options.MaximumReceiveMessageSize = 16 * 1024);
builder.Services.AddCors(options => options.AddPolicy("Client", policy =>
    policy.WithOrigins(builder.Configuration.GetSection("ClientOrigins").Get<string[]>() ?? [])
        .AllowAnyHeader().AllowAnyMethod().AllowCredentials()));
var app = builder.Build();
app.UseCors("Client");
app.MapGet("/health/live", () => Results.Ok(new { status = "alive" }));
// Readiness must not claim that unconfigured persistence is ready.
app.MapGet("/health/ready", () => Results.Json(new
{
    status = "notReady", reason = "PostgreSQL/Redis adapters and migrations are not implemented"
}, statusCode: 503));
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
