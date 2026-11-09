using System.Diagnostics;

namespace FishingOnline.Api.Modules.Common;

public sealed record ApiEnvelope<T>(T Data, string TraceId);
public sealed record ApiErrorBody(string Code, string Message, bool Retryable);
public sealed record ApiErrorEnvelope(ApiErrorBody Error, string TraceId);

/// <summary>Envelope thành công của HTTP API: <c>{ data, traceId }</c>.</summary>
public static class ApiResult
{
    public static IResult Ok<T>(T data) => Results.Ok(new ApiEnvelope<T>(data, CurrentTraceId));

    /// <summary>TraceId của Activity hiện tại; không có Activity thì sinh mới để field luôn có giá trị.</summary>
    public static string CurrentTraceId =>
        (Activity.Current?.TraceId ?? ActivityTraceId.CreateRandom()).ToHexString();
}
