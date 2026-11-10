using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Modules.Config;
using FishingOnline.Api.Modules.Wallet;
using FishingOnline.Api.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace FishingOnline.Api.Modules.Identity;

public static partial class DisplayNames
{
    [GeneratedRegex(@"^[\p{L}\p{N} _]{3,16}$")]
    public static partial Regex Allowed();

    public static string Key(string displayName) => displayName.ToLowerInvariant();
}

public sealed record IssuedTokens(string AccessToken, DateTimeOffset ExpiresAt, string RefreshToken, DateTimeOffset RefreshExpiresAt);

public sealed record LoginOutcome(IssuedTokens Tokens, bool IsNew, PlayerProfileView Player);

public sealed class JwtIssuer(IOptions<AuthOptions> options, SigningKeyHolder keys, TimeProvider time)
{
    public const string Audience = "player";
    public const string Issuer = "fishing-online";

    public (string Token, DateTimeOffset ExpiresAt) Issue(Guid accountId, Guid playerId, Guid sessionId, int authVersion)
    {
        var now = time.GetUtcNow();
        var expiresAt = now.AddMinutes(options.Value.AccessTokenMinutes);
        var token = new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Issuer = Issuer,
            Audience = Audience,
            IssuedAt = now.UtcDateTime,
            NotBefore = now.UtcDateTime,
            Expires = expiresAt.UtcDateTime,
            SigningCredentials = new SigningCredentials(keys.Key, SecurityAlgorithms.HmacSha256),
            Claims = new Dictionary<string, object>
            {
                [JwtRegisteredClaimNames.Sub] = accountId.ToString(),
                [PlayerClaims.PlayerId] = playerId.ToString(),
                [PlayerClaims.SessionId] = sessionId.ToString(),
                [PlayerClaims.AuthVersion] = authVersion,
            },
        });
        return (token, expiresAt);
    }
}

/// <summary>Khóa ký access token. Ngoài Development bắt buộc cấu hình; Development thiếu thì sinh khóa tạm.</summary>
public sealed class SigningKeyHolder
{
    private const int MinimumKeyBytes = 32;

    public SigningKeyHolder(IOptions<AuthOptions> options, IHostEnvironment environment)
    {
        var configured = options.Value.JwtSigningKey;
        if (string.IsNullOrWhiteSpace(configured))
        {
            if (!environment.IsDevelopment()) throw new InvalidOperationException("Auth:JwtSigningKey is required.");
            Key = new SymmetricSecurityKey(RandomNumberGenerator.GetBytes(MinimumKeyBytes));
            return;
        }
        var bytes = Encoding.UTF8.GetBytes(configured);
        if (bytes.Length < MinimumKeyBytes) throw new InvalidOperationException($"Auth:JwtSigningKey needs at least {MinimumKeyBytes} bytes.");
        Key = new SymmetricSecurityKey(bytes);
    }

    public SymmetricSecurityKey Key { get; }
}

public sealed class AuthService(
    GameDbContext db,
    IFirebaseTokenVerifier verifier,
    IWallet wallet,
    INewPlayerGrant newPlayerGrant,
    IConfigProvider configs,
    JwtIssuer issuer,
    IOptions<AuthOptions> options,
    TimeProvider time)
{
    public async Task<LoginOutcome> LoginAsync(string firebaseIdToken, bool rememberMe, CancellationToken ct)
    {
        var identity = await verifier.VerifyAsync(firebaseIdToken, ct);
        var (account, isNew) = await FindOrCreateAccountAsync(identity, playerId: null, ct);
        if (account.Status != AccountStatus.Active) throw new GameException("UNAUTHENTICATED");

        var tokens = await OpenSessionAsync(account, rememberMe, ct);
        return new LoginOutcome(tokens, isNew, await GetProfileAsync(account.PlayerId, ct));
    }

    public async Task<Guid> EnsureDevPlayerAsync(Guid playerId, CancellationToken ct)
    {
        var (account, _) = await FindOrCreateAccountAsync(new FirebaseIdentity("dev", playerId.ToString(), "dev"), playerId, ct);
        return account.AccountId;
    }

    public async Task<IssuedTokens> RefreshAsync(string? refreshToken, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(refreshToken)) throw new GameException("UNAUTHENTICATED");
        var hash = GameJson.Sha256Hex(refreshToken);
        var now = time.GetUtcNow();

        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var session = await db.Set<AuthSession>()
            .FromSqlInterpolated($"""
                select * from game.sessions
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
        var account = await db.Set<Account>().AsNoTracking().SingleAsync(row => row.AccountId == session.AccountId, ct);
        if (session.RevokedAt is not null || session.ExpiresAt <= now || account.Status != AccountStatus.Active)
            throw new GameException("UNAUTHENTICATED");

        var refresh = NewRefreshToken();
        session.PreviousRefreshTokenHash = hash;
        session.RefreshTokenHash = GameJson.Sha256Hex(refresh);
        session.ExpiresAt = now.AddDays(LifetimeDays(session.RememberMe));
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        var (token, expiresAt) = issuer.Issue(account.AccountId, account.PlayerId, session.Id, account.AuthVersion);
        return new IssuedTokens(token, expiresAt, refresh, session.ExpiresAt);
    }

    public async Task LogoutAsync(string? refreshToken, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(refreshToken)) return;
        var hash = GameJson.Sha256Hex(refreshToken);
        var now = time.GetUtcNow();
        await db.Set<AuthSession>().Where(session => session.RefreshTokenHash == hash && session.RevokedAt == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(session => session.RevokedAt, now), ct);
    }

    public async Task<PlayerProfileView> GetProfileAsync(Guid playerId, CancellationToken ct)
    {
        var player = await db.Players.AsNoTracking().SingleOrDefaultAsync(row => row.Id == playerId, ct)
            ?? throw new GameException("UNAUTHENTICATED");
        return await ViewAsync(player, ct);
    }

    public async Task<PlayerProfileView> RenameAsync(Guid playerId, string displayName, CancellationToken ct)
    {
        var name = displayName?.Trim() ?? string.Empty;
        if (!DisplayNames.Allowed().IsMatch(name)) throw new GameException(ErrorCatalog.ValidationFailed);

        var player = await db.Players.SingleOrDefaultAsync(row => row.Id == playerId, ct)
            ?? throw new GameException("UNAUTHENTICATED");
        player.DisplayName = name;
        player.DisplayNameKey = DisplayNames.Key(name);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException exception) when (exception.UniqueConstraint() is not null)
        {
            throw new GameException("STATE_CONFLICT");
        }
        return await ViewAsync(player, ct);
    }

    private async Task<PlayerProfileView> ViewAsync(PlayerProfile player, CancellationToken ct) => new(
        player.Id,
        player.DisplayName,
        player.Level,
        player.Exp,
        (await wallet.GetBalanceAsync(player.Id, ct)).ToString(System.Globalization.CultureInfo.InvariantCulture),
        player.SelectedSkinId,
        player.EquippedRodId);

    /// <summary>
    /// Tạo account, player, ví, cần mặc định trong một transaction. Unique (project, uid) chặn hai login song song
    /// cùng tạo; bên thua đọc lại account của bên thắng, nên chỉ có một lần tặng Gold.
    /// </summary>
    private async Task<(Account Account, bool IsNew)> FindOrCreateAccountAsync(FirebaseIdentity identity, Guid? playerId, CancellationToken ct)
    {
        var existing = await FindAccountAsync(identity, ct);
        if (existing is not null) return (existing, false);

        var config = configs.Current;
        var newPlayerId = playerId ?? Guid.CreateVersion7();
        var name = "Fisher" + Guid.NewGuid().ToString("N")[..8];
        var account = new Account
        {
            AccountId = Guid.CreateVersion7(),
            FirebaseProjectId = identity.ProjectId,
            FirebaseUid = identity.Uid,
            PlayerId = newPlayerId,
            Provider = identity.Provider,
            CreatedAt = time.GetUtcNow(),
        };
        try
        {
            await using var transaction = await db.Database.BeginTransactionAsync(ct);
            db.Players.Add(new PlayerProfile
            {
                Id = newPlayerId,
                DisplayName = name,
                DisplayNameKey = DisplayNames.Key(name),
                CreatedAt = account.CreatedAt,
                SelectedSkinId = options.Value.DefaultSkinId,
                EquippedRodId = config.NewPlayer.RodId,
            });
            db.Add(account);
            await db.SaveChangesAsync(ct);
            await wallet.CreditAsync(newPlayerId, config.NewPlayer.Gold, LedgerReasons.GrantNewPlayer, account.AccountId.ToString(), ct);
            await newPlayerGrant.GrantAsync(newPlayerId, ct);
            await transaction.CommitAsync(ct);
            return (account, true);
        }
        catch (DbUpdateException exception) when (exception.UniqueConstraint() is not null)
        {
            db.ChangeTracker.Clear();
            return (await FindAccountAsync(identity, ct) ?? throw new GameException("STATE_CONFLICT"), false);
        }
    }

    private Task<Account?> FindAccountAsync(FirebaseIdentity identity, CancellationToken ct) =>
        db.Set<Account>().AsNoTracking()
            .SingleOrDefaultAsync(row => row.FirebaseProjectId == identity.ProjectId && row.FirebaseUid == identity.Uid, ct);

    private async Task<IssuedTokens> OpenSessionAsync(Account account, bool rememberMe, CancellationToken ct)
    {
        var refresh = NewRefreshToken();
        var now = time.GetUtcNow();
        var session = new AuthSession
        {
            Id = Guid.CreateVersion7(),
            AccountId = account.AccountId,
            RefreshTokenHash = GameJson.Sha256Hex(refresh),
            RememberMe = rememberMe,
            CreatedAt = now,
            ExpiresAt = now.AddDays(LifetimeDays(rememberMe)),
        };
        db.Add(session);
        await db.SaveChangesAsync(ct);
        var (token, expiresAt) = issuer.Issue(account.AccountId, account.PlayerId, session.Id, account.AuthVersion);
        return new IssuedTokens(token, expiresAt, refresh, session.ExpiresAt);
    }

    private int LifetimeDays(bool rememberMe) => rememberMe ? options.Value.RememberMeDays : options.Value.RefreshDays;

    private static string NewRefreshToken() => Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(32));
}

public sealed class HttpCurrentPlayer(IHttpContextAccessor accessor) : ICurrentPlayer
{
    public Guid PlayerId => accessor.HttpContext?.User.GetPlayerId() ?? throw new GameException("UNAUTHENTICATED");
}

public static class AccessTokenChecks
{
    /// <summary>Token chữ ký đúng vẫn bị từ chối nếu phiên đã thu hồi, tài khoản bị khóa hoặc authVersion đã đổi.</summary>
    public static async Task<bool> IsStillValidAsync(GameDbContext db, ClaimsPrincipal user, DateTimeOffset now, CancellationToken ct)
    {
        if (!Guid.TryParse(user.FindFirst(PlayerClaims.SessionId)?.Value, out var sessionId)) return false;
        if (!int.TryParse(user.FindFirst(PlayerClaims.AuthVersion)?.Value, out var authVersion)) return false;

        return await db.Set<AuthSession>().AsNoTracking()
            .Where(session => session.Id == sessionId && session.RevokedAt == null && session.ExpiresAt > now)
            .Join(db.Set<Account>(), session => session.AccountId, account => account.AccountId, (_, account) => account)
            .AnyAsync(account => account.Status == AccountStatus.Active && account.AuthVersion == authVersion, ct);
    }
}
