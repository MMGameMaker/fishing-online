using FishingOnline.Api.Modules.Fishing;
using Microsoft.AspNetCore.Mvc;

namespace FishingOnline.Api.Modules.Common;

public sealed partial class GameHub
{
    public async Task<CommandAck> CastLine(CastLineCommand command, [FromServices] FishingService fishing)
    {
        var attemptId = await fishing.CastAsync(PlayerId, Guid.Parse(command.RequestId), Context.ConnectionAborted);
        return CommandAck.Success(command.RequestId, new CastLineAck(attemptId));
    }

    public async Task<CommandAck> HookFish(HookFishCommand command, [FromServices] FishingService fishing)
    {
        await fishing.HookAsync(PlayerId, command.AttemptId, Context.ConnectionAborted);
        return CommandAck.Success(command.RequestId);
    }

    public async Task<CommandAck> SubmitFishingResult(SubmitFishingResultCommand command, [FromServices] FishingService fishing)
    {
        var attempt = await fishing.SubmitResultAsync(PlayerId, command.AttemptId, command.Outcome, Context.ConnectionAborted);
        return CommandAck.Success(command.RequestId, new SubmitResultAck(attempt));
    }
}
