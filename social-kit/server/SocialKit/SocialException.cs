namespace SocialKit;

/// <summary>
/// Lỗi nghiệp vụ của SocialKit. Ứng dụng chủ đổi thành phản hồi lỗi của mình (ví dụ middleware bắt <see cref="SocialException"/> rồi ghi
/// <see cref="HttpStatus"/> và <see cref="Code"/>). Mã lỗi dùng: UNAUTHENTICATED (401), VALIDATION_FAILED (400), RATE_LIMITED (429),
/// GROUP_CODE_INVALID (422).
/// </summary>
public sealed class SocialException(string code, int httpStatus, string? message = null, bool retryable = false)
    : Exception(message ?? code)
{
    public string Code { get; } = code;
    public int HttpStatus { get; } = httpStatus;
    public bool Retryable { get; } = retryable;

    public static SocialException Unauthenticated() => new("UNAUTHENTICATED", 401, "Authentication required");
    public static SocialException Validation() => new("VALIDATION_FAILED", 400, "Invalid request");
    public static SocialException RateLimited() => new("RATE_LIMITED", 429, "Too many requests", retryable: true);
    public static SocialException GroupCodeInvalid() => new("GROUP_CODE_INVALID", 422, "Group code is not valid");
}
