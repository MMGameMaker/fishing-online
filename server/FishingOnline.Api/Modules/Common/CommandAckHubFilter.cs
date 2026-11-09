using System.Reflection;
using Microsoft.AspNetCore.SignalR;

namespace FishingOnline.Api.Modules.Common;

/// <summary>
/// Áp dụng cho hub method trả <see cref="CommandAck"/>: kiểm tra requestId và đổi exception
/// thành ack <c>ok=false</c>, để từng module chỉ cần ném <see cref="GameException"/>.
/// </summary>
public sealed class CommandAckHubFilter(ILogger<CommandAckHubFilter> logger) : IHubFilter
{
    public async ValueTask<object?> InvokeMethodAsync(
        HubInvocationContext invocationContext,
        Func<HubInvocationContext, ValueTask<object?>> next)
    {
        if (!ReturnsCommandAck(invocationContext.HubMethod))
            return await next(invocationContext);

        var requestId = invocationContext.HubMethodArguments.OfType<IHubCommand>().FirstOrDefault()?.RequestId ?? string.Empty;
        if (!Guid.TryParse(requestId, out _))
            return Failure(requestId, ErrorCatalog.ValidationFailed);

        try
        {
            return await next(invocationContext);
        }
        catch (GameException exception)
        {
            return CommandAck.Failure(requestId, exception.Code, exception.Message);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogError(exception, "Unhandled exception in hub method {Method}", invocationContext.HubMethodName);
            return Failure(requestId, ErrorCatalog.InternalError);
        }
    }

    private static CommandAck Failure(string requestId, string code) =>
        CommandAck.Failure(requestId, code, ErrorCatalog.Get(code).Message);

    private static bool ReturnsCommandAck(MethodInfo method) =>
        method.ReturnType == typeof(CommandAck)
        || method.ReturnType == typeof(Task<CommandAck>)
        || method.ReturnType == typeof(ValueTask<CommandAck>);
}
