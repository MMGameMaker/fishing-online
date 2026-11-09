namespace FishingOnline.Api.Modules.Common;

public sealed record ErrorDefinition(int HttpStatus, bool Retryable, string Message);

/// <summary>Bảng mã lỗi SPEC_CHUNG mục 5 và HTTP status tương ứng (BE-A-01).</summary>
public static class ErrorCatalog
{
    public const string ValidationFailed = "VALIDATION_FAILED";

    /// <summary>Lỗi không lường trước; chưa có trong SPEC mục 5, không bao giờ trả chi tiết exception.</summary>
    public const string InternalError = "INTERNAL_ERROR";

    private static readonly Dictionary<string, ErrorDefinition> Definitions = new()
    {
        [ValidationFailed] = new(400, false, "Invalid request"),
        ["INVALID_DURATION"] = new(400, false, "Invalid duration"),
        ["UNAUTHENTICATED"] = new(401, false, "Authentication required"),
        ["SESSION_EXPIRED"] = new(401, false, "Session expired"),
        ["FISH_NOT_FOUND"] = new(404, false, "Fish not found"),
        ["SEAT_TAKEN"] = new(409, false, "Seat is in use"),
        ["SEAT_COOLDOWN"] = new(409, false, "Seat is cooling down"),
        ["ALREADY_HAS_SEAT"] = new(409, false, "Player already holds a seat"),
        ["ATTEMPT_ACTIVE"] = new(409, false, "A fishing attempt is already active"),
        ["IDEMPOTENCY_CONFLICT"] = new(409, false, "Idempotency key reused with a different payload"),
        ["ROD_ALREADY_OWNED"] = new(409, false, "Rod already owned"),
        ["PRICE_CHANGED"] = new(409, false, "Price has changed"),
        ["SEAT_SESSION_EXPIRED"] = new(409, false, "Seat session can no longer be extended"),
        ["STATE_CONFLICT"] = new(409, false, "State conflict"),
        ["NO_ACTIVE_ATTEMPT"] = new(409, false, "Attempt is not active"),
        ["BITE_EXPIRED"] = new(409, false, "Bite window has passed"),
        ["RESULT_EXPIRED"] = new(409, false, "Result arrived after the deadline"),
        ["INSUFFICIENT_GOLD"] = new(422, false, "Not enough gold"),
        ["ROD_NOT_OWNED"] = new(422, false, "Rod not owned"),
        ["NOT_IN_SEAT"] = new(422, false, "Player is not in a seat"),
        ["OUT_OF_RANGE"] = new(422, false, "Position out of range"),
        ["RATE_LIMITED"] = new(429, true, "Too many requests"),
        [InternalError] = new(500, false, "Internal server error"),
    };

    public static ErrorDefinition Get(string code) =>
        Definitions.TryGetValue(code, out var definition)
            ? definition
            : throw new ArgumentException($"Unknown error code '{code}'.", nameof(code));
}
