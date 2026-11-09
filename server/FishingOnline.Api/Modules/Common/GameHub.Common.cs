using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace FishingOnline.Api.Modules.Common;

public sealed record DevProbeCommand(string RequestId, string? Code) : IHubCommand;

// Chỉ dùng cho chẩn đoán Development; không nhận định danh người chơi hay luật gameplay.
public sealed partial class GameHub
{
    public object Ping([FromServices] IHostEnvironment environment)
    {
        if (!environment.IsDevelopment()) throw new HubException("Not available.");
        return new { contractVersion = "0.1-draft", serverTime = DateTimeOffset.UtcNow };
    }

    /// <summary>Không có code: ack thành công; có code: ném GameException với code đó.</summary>
    public CommandAck DevProbe(DevProbeCommand command, [FromServices] IHostEnvironment environment)
    {
        if (!environment.IsDevelopment())
            throw new GameException(ErrorCatalog.ValidationFailed, message: "Not available.");
        if (command.Code is not null) throw new GameException(command.Code);
        return CommandAck.Success(command.RequestId, new { pong = true });
    }
}
