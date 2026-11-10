using FishingOnline.Api.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FishingOnline.Api.Modules.Identity;

public sealed class AuthOptions
{
    public string? FirebaseProjectId { get; set; }
    public string? JwtSigningKey { get; set; }
    public int AccessTokenMinutes { get; set; } = 10;
    public int RefreshDays { get; set; } = 7;
    public int RememberMeDays { get; set; } = 30;
    public bool DevBypass { get; set; }
    public string DefaultSkinId { get; set; } = "skin_01";
}

public static class AccountStatus
{
    public const string Active = "active";
}

public sealed class Account
{
    public Guid AccountId { get; set; }
    public string FirebaseProjectId { get; set; } = string.Empty;
    public string FirebaseUid { get; set; } = string.Empty;
    public Guid PlayerId { get; set; }
    public string Provider { get; set; } = string.Empty;
    public string Status { get; set; } = AccountStatus.Active;
    public int AuthVersion { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class AuthSession
{
    public Guid Id { get; set; }
    public Guid AccountId { get; set; }
    public string RefreshTokenHash { get; set; } = string.Empty;

    /// <summary>Hash của token vừa bị xoay; dùng lại token này là dấu hiệu lộ token nên thu hồi cả phiên.</summary>
    public string? PreviousRefreshTokenHash { get; set; }

    public bool RememberMe { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }
}

public sealed class AccountConfig : IEntityTypeConfiguration<Account>
{
    public void Configure(EntityTypeBuilder<Account> entity)
    {
        entity.ToTable("accounts");
        entity.HasKey(account => account.AccountId);
        entity.Property(account => account.FirebaseProjectId).HasMaxLength(128);
        entity.Property(account => account.FirebaseUid).HasMaxLength(128);
        entity.Property(account => account.Provider).HasMaxLength(32);
        entity.Property(account => account.Status).HasMaxLength(32);
        entity.HasIndex(account => new { account.FirebaseProjectId, account.FirebaseUid }).IsUnique();
        entity.HasIndex(account => account.PlayerId).IsUnique();
    }
}

public sealed class AuthSessionConfig : IEntityTypeConfiguration<AuthSession>
{
    public void Configure(EntityTypeBuilder<AuthSession> entity)
    {
        entity.ToTable("sessions");
        entity.HasKey(session => session.Id);
        entity.Property(session => session.RefreshTokenHash).HasMaxLength(64);
        entity.Property(session => session.PreviousRefreshTokenHash).HasMaxLength(64);
        entity.HasIndex(session => session.RefreshTokenHash).IsUnique();
        entity.HasIndex(session => session.PreviousRefreshTokenHash);
    }
}

/// <summary>Bản BE-D triển khai: cấp cần mặc định khi tạo player, chạy trong transaction của login.</summary>
public interface INewPlayerGrant
{
    Task GrantAsync(Guid playerId, CancellationToken ct);
}

public interface ICurrentPlayer
{
    Guid PlayerId { get; }
}

public sealed record PlayerProfileView(
    Guid PlayerId, string DisplayName, int Level, int Exp, string Gold, string SelectedSkinId, string EquippedRodId);

public sealed record LoginRequest(string FirebaseIdToken, bool RememberMe = false);

public sealed record LoginResponse(string AccessToken, DateTimeOffset ExpiresAt, bool IsNew, PlayerProfileView Player);

public sealed record RefreshResponse(string AccessToken, DateTimeOffset ExpiresAt);

public sealed record DisplayNameRequest(string DisplayName);
