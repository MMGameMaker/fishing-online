namespace FishingOnline.Api.Modules.Common;

/// <summary>
/// Đổi exception thành envelope lỗi <c>{ error, traceId }</c>. Phải đặt sau UseCors để
/// trình duyệt đọc được response lỗi.
/// </summary>
public sealed class GameExceptionMiddleware(RequestDelegate next, ILogger<GameExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (GameException exception) when (!context.Response.HasStarted)
        {
            await WriteAsync(context, exception.HttpStatus, exception.Code, exception.Message, exception.Retryable);
        }
        catch (BadHttpRequestException exception) when (!context.Response.HasStarted)
        {
            // JSON hỏng hoặc sai kiểu tham số; không trả message gốc vì có thể lộ chi tiết binding.
            var definition = ErrorCatalog.Get(ErrorCatalog.ValidationFailed);
            await WriteAsync(context, exception.StatusCode, ErrorCatalog.ValidationFailed, definition.Message, definition.Retryable);
        }
        catch (Exception exception) when (!context.Response.HasStarted && !context.RequestAborted.IsCancellationRequested)
        {
            logger.LogError(exception, "Unhandled exception on {Method} {Path}", context.Request.Method, context.Request.Path);
            var definition = ErrorCatalog.Get(ErrorCatalog.InternalError);
            await WriteAsync(context, definition.HttpStatus, ErrorCatalog.InternalError, definition.Message, definition.Retryable);
        }
    }

    private static Task WriteAsync(HttpContext context, int status, string code, string message, bool retryable)
    {
        context.Response.StatusCode = status;
        return context.Response.WriteAsJsonAsync(
            new ApiErrorEnvelope(new ApiErrorBody(code, message, retryable), ApiResult.CurrentTraceId));
    }
}
