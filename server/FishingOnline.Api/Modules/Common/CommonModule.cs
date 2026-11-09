using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.SignalR;

namespace FishingOnline.Api.Modules.Common;

/// <summary>Mẫu module: mỗi module có <c>AddX(IServiceCollection)</c> và <c>MapX(WebApplication)</c>.</summary>
public static class CommonModule
{
    private const int MaxHubMessageBytes = 16 * 1024;

    public sealed record DevEchoBody(string Text);

    public static IServiceCollection AddCommon(this IServiceCollection services)
    {
        // Mặc định chỉ Development mới ném; bật mọi môi trường để body/tham số sai luôn ra envelope lỗi.
        services.Configure<RouteHandlerOptions>(options => options.ThrowOnBadRequest = true);
        services.AddSignalR(options =>
        {
            options.MaximumReceiveMessageSize = MaxHubMessageBytes;
            options.AddFilter<CommandAckHubFilter>();
        });
        return services;
    }

    public static WebApplication MapCommon(this WebApplication app)
    {
        app.MapHub<GameHub>("/hubs/game");
        if (app.Environment.IsDevelopment())
        {
            app.MapGet("/api/v1/dev/probe", (string? code) =>
                code is null ? ApiResult.Ok(new { pong = true }) : throw new GameException(code));
            app.MapPost("/api/v1/dev/echo", (DevEchoBody body) => ApiResult.Ok(body));
        }
        return app;
    }
}
