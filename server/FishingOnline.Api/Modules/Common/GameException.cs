namespace FishingOnline.Api.Modules.Common;

/// <summary>Lỗi nghiệp vụ trả cho Client. Status/retryable/message mặc định lấy từ <see cref="ErrorCatalog"/>.</summary>
public class GameException : Exception
{
    public GameException(string code, int? httpStatus = null, bool? retryable = null, string? message = null)
        : base(message ?? ErrorCatalog.Get(code).Message)
    {
        var definition = ErrorCatalog.Get(code);
        Code = code;
        HttpStatus = httpStatus ?? definition.HttpStatus;
        Retryable = retryable ?? definition.Retryable;
    }

    public string Code { get; }
    public int HttpStatus { get; }
    public bool Retryable { get; }
}
