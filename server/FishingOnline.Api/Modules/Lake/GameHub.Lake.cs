using FishingOnline.Api.Modules.Lake;
using Microsoft.AspNetCore.Mvc;

namespace FishingOnline.Api.Modules.Common;

public sealed partial class GameHub
{
    public async Task<CommandAck> JoinLake(JoinLakeCommand command, [FromServices] LakeCommands lake)
    {
        var snapshot = await lake.JoinAsync(PlayerId, Context.ConnectionId, Context.Abort, Context.ConnectionAborted);
        return CommandAck.Success(command.RequestId, snapshot);
    }

    public async Task<CommandAck> Move(MoveCommand command, [FromServices] LakeCommands lake)
    {
        await lake.MoveAsync(PlayerId, command);
        return CommandAck.Success(command.RequestId);
    }

    public async Task<CommandAck> BuyTicket(BuyTicketCommand command, [FromServices] SeatSessions seats)
    {
        var result = await seats.BuyTicketAsync(PlayerId, Guid.Parse(command.RequestId), command.Quantity,
            command.ExpectedPriceVersion, Context.ConnectionAborted);
        return CommandAck.Success(command.RequestId, result);
    }

    public async Task<CommandAck> SitDown(SitDownCommand command, [FromServices] SeatSessions seats)
    {
        var result = await seats.SitDownAsync(PlayerId, command.SeatId, Context.ConnectionAborted);
        return CommandAck.Success(command.RequestId, result);
    }

    public async Task<CommandAck> LeaveSeat(LeaveSeatCommand command, [FromServices] SeatSessions seats)
    {
        await seats.LeaveAsync(PlayerId, Context.ConnectionAborted);
        return CommandAck.Success(command.RequestId);
    }
}
