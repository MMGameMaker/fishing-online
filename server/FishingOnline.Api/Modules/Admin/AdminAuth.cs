using System.Security.Claims;
using System.Security.Cryptography;
using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Modules.Identity;
using FishingOnline.Api.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace FishingOnline.Api.Modules.Admin;

public sealed record AdminTokens(string AccessToken, DateTimeOffset ExpiresAt, string RefreshToken, DateTimeOffset RefreshExpiresAt, string Email, string[] Permissions);

/// <summary>
/// Đăng nhập Admin bằng Google qua Firebase (AD-01, theo ACCOUNT_AUTH): email phải đã xác minh và có trong
/// <c>admin_users</c>; mặc định bắt buộc MFA. Quyền chỉ lấy từ bảng, không suy ra từ email hay domain.
/// </summary>
public sealed class AdminAuthService(
    GameDbContext db, IFirebaseTokenVerifier verifier, SigningKeyHolder keys, IOptions<AdminOptions> options, TimeProvider time)
{
    public const string Audience = "admin";
    public const string PermissionClaim = "perm";

    private AdminOptions Settings => options.Value;

    public async Task<AdminTokens> LoginAsync(string firebaseIdToken, CancellationToken ct)
    {
        var identity = await verifier.VerifyAsync(firebaseIdToken, ct);
        if (!identity.EmailVerified || string.IsNullOrWhiteSpace(identity.Email)) throw new GameException("UNAUTHENTICATED");
        var email = identity.Email.Trim().ToLowerInvariant();
        var user = await db.Set<AdminUser>().AsNoTracking().SingleOrDefaultAsync(row => row.Email == email, ct);
        if (user is null || user.Disabled) throw new GameException("UNAUTHENTICATED");
        if (Settings.RequireMfa && string.IsNullOrEmpty(identity.SecondFactor))
            throw new GameException("UNAUTHENTICATED", message: "Multi-factor authentication is required.");

        var refresh = NewRefreshToken();
        var now = time.GetUtcNow();
        var session = new AdminSession
        {
            Id = Guid.CreateVersion7(),
            Email = email,
            RefreshTokenHash = GameJson.Sha256Hex(refresh),
            CreatedAt = now,
            AbsoluteExpiresAt = now.AddHours(Settings.SessionHours),
        };
        db.Add(session);
        AdminAudit.Add(db, time, email, "admin.login", email, before: null, after: null);
        await db.SaveChangesAsync(ct);
        return Issue(user, session, refresh);
    }

    /// <summary>Xoay refresh token; phiên có hạn tuyệt đối, refresh không kéo dài thêm.</summary>
    public async Task<AdminTokens> RefreshAsync(string? refreshToken, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(refreshToken)) throw new GameException("UNAUTHENTICATED");
        var hash = GameJson.Sha256Hex(refreshToken);
        var now = time.GetUtcNow();
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var session = await db.Set<AdminSession>()
            .FromSqlInterpolated($"""
                select * from game.admin_sessions
                where "RefreshTokenHash" = {hash} or "PreviousRefreshTokenHash" = {hash}
                for update
                """)
            .SingleOrDefaultAsync(ct) ?? throw new GameException("UNAUTHENTICATED");
        if (session.RefreshTokenHash != hash)
        {
            session.RevokedAt ??= now;
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            throw new GameException("UNAUTHENTICATED");
        }

        var user = await db.Set<AdminUser>().AsNoTracking().SingleOrDefaultAsync(row => row.Email == session.Email, ct);
        if (session.RevokedAt is not null || session.AbsoluteExpiresAt <= now || user is null || user.Disabled)
            throw new GameException("UNAUTHENTICATED");

        var refresh = NewRefreshToken();
        session.PreviousRefreshTokenHash = hash;
        session.RefreshTokenHash = GameJson.Sha256Hex(refresh);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Issue(user, session, refresh);
    }

    public async Task LogoutAsync(string? refreshToken, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(refreshToken)) return;
        var hash = GameJson.Sha256Hex(refreshToken);
        var now = time.GetUtcNow();
        await db.Set<AdminSession>().Where(row => row.RefreshTokenHash == hash && row.RevokedAt == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(row => row.RevokedAt, now), ct);
    }

    public static async Task<bool> IsSessionValidAsync(GameDbContext db, ClaimsPrincipal user, DateTimeOffset now, CancellationToken ct)
    {
        if (!Guid.TryParse(user.FindFirst(PlayerClaims.SessionId)?.Value, out var sessionId)) return false;
        return await db.Set<AdminSession>().AsNoTracking()
            .Where(session => session.Id == sessionId && session.RevokedAt == null && session.AbsoluteExpiresAt > now)
            .Join(db.Set<AdminUser>(), session => session.Email, admin => admin.Email, (_, admin) => admin)
            .AnyAsync(admin => !admin.Disabled, ct);
    }

    private AdminTokens Issue(AdminUser user, AdminSession session, string refresh)
    {
        var now = time.GetUtcNow();
        var expiresAt = Min(now.AddMinutes(Settings.AccessTokenMinutes), session.AbsoluteExpiresAt);
        var permissions = user.Roles.Where(AdminPermissions.All.Contains).Distinct().Order().ToArray();
        var identity = new ClaimsIdentity(
            [new Claim(JwtRegisteredClaimNames.Sub, user.Email), new Claim(PlayerClaims.SessionId, session.Id.ToString())]);
        identity.AddClaims(permissions.Select(permission => new Claim(PermissionClaim, permission)));
        var token = new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Issuer = JwtIssuer.Issuer,
            Audience = Audience,
            Subject = identity,
            IssuedAt = now.UtcDateTime,
            NotBefore = now.UtcDateTime,
            Expires = expiresAt.UtcDateTime,
            SigningCredentials = new SigningCredentials(keys.Key, SecurityAlgorithms.HmacSha256),
        });
        return new AdminTokens(token, expiresAt, refresh, session.AbsoluteExpiresAt, user.Email, permissions);
    }

    private static DateTimeOffset Min(DateTimeOffset a, DateTimeOffset b) => a < b ? a : b;

    private static string NewRefreshToken() => Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(32));
}

/// <summary>Tạo tài khoản Admin từ cấu hình vận hành khi chưa có; không ghi đè quyền đã sửa trong DB.</summary>
public sealed class AdminBootstrapper(IServiceScopeFactory scopes, IOptions<AdminOptions> options, TimeProvider time) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        var users = options.Value.BootstrapUsers.Where(user => !string.IsNullOrWhiteSpace(user.Email)).ToArray();
        if (users.Length == 0) return;
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        foreach (var user in users)
        {
            var email = user.Email.Trim().ToLowerInvariant();
            var unknown = user.Roles.Except(AdminPermissions.All).ToArray();
            if (unknown.Length > 0) throw new InvalidOperationException($"Unknown admin permissions: {string.Join(", ", unknown)}.");
            if (await db.Set<AdminUser>().AnyAsync(row => row.Email == email, cancellationToken)) continue;
            db.Add(new AdminUser { Email = email, Roles = [.. user.Roles.Distinct()], CreatedAt = time.GetUtcNow() });
            AdminAudit.Add(db, time, "system:bootstrap", "admin_user.create", email, before: null, after: user.Roles);
        }
        await db.SaveChangesAsync(cancellationToken);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
