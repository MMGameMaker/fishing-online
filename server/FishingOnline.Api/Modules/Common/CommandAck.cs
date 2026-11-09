namespace FishingOnline.Api.Modules.Common;

/// <summary>Tham số của mọi lệnh hub (SPEC mục 4); RequestId là uuid.</summary>
public interface IHubCommand
{
    string RequestId { get; }
}

public sealed record CommandError(string Code, string Message);

/// <summary>Ack của lệnh hub: <c>ok</c> chỉ nghĩa lệnh được nhận, state đổi đến qua event.</summary>
public sealed record CommandAck(string RequestId, bool Ok, CommandError? Error, object? Data)
{
    public static CommandAck Success(string requestId, object? data = null) => new(requestId, true, null, data);

    public static CommandAck Failure(string requestId, string code, string message) =>
        new(requestId, false, new CommandError(code, message), null);
}
