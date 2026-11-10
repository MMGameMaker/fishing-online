using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace FishingOnline.Api.Modules.Common;

public static class PlayerClaims
{
    public const string PlayerId = "playerId";
    public const string SessionId = "sid";
    public const string AuthVersion = "authVersion";

    public static Guid GetPlayerId(this ClaimsPrincipal? user) =>
        Guid.TryParse(user?.FindFirst(PlayerId)?.Value, out var playerId)
            ? playerId
            : throw new GameException("UNAUTHENTICATED");
}

public static class GameJson
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);

    /// <summary>SHA-256 dạng hex, dùng cho hash payload idempotency và refresh token.</summary>
    public static string Sha256Hex(string value) =>
        Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
}

public static class PostgresErrors
{
    public const string UniqueViolation = "23505";

    /// <summary>Tên constraint nếu lỗi là vi phạm unique; null nếu là lỗi khác.</summary>
    public static string? UniqueConstraint(this Exception exception) =>
        (exception as Npgsql.PostgresException ?? exception.InnerException as Npgsql.PostgresException) is
        { SqlState: UniqueViolation } postgres
            ? postgres.ConstraintName
            : null;
}
