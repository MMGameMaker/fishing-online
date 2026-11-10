using System.Text.Json;
using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FishingOnline.Api.Modules.Admin;

public static class AdminPermissions
{
    public const string ConfigRead = "config.read";
    public const string ConfigWrite = "config.write";
    public const string ConfigPublish = "config.publish";
    public const string PlayerRead = "player.read";
    public const string AuditRead = "audit.read";
    public const string SignalReview = "signal.review";
    public const string StockingRead = "stocking.read";
    public const string StockingWrite = "stocking.write";
    public const string StockingExecute = "stocking.execute";

    public static readonly IReadOnlySet<string> All = new HashSet<string>
    {
        ConfigRead, ConfigWrite, ConfigPublish, PlayerRead, AuditRead, SignalReview, StockingRead, StockingWrite, StockingExecute,
    };

    public static string Policy(string permission) => "admin:" + permission;
}

public sealed class AdminBootstrapUser
{
    public string Email { get; set; } = string.Empty;
    public List<string> Roles { get; set; } = [];
}

public sealed class AdminOptions
{
    public bool RequireMfa { get; set; } = true;
    public int AccessTokenMinutes { get; set; } = 5;
    public int SessionHours { get; set; } = 8;
    public int StockingPollMs { get; set; } = 1000;
    public List<AdminBootstrapUser> BootstrapUsers { get; set; } = [];
}

/// <summary><c>Roles</c> chứa tên quyền trong <see cref="AdminPermissions"/>.</summary>
public sealed class AdminUser
{
    public string Email { get; set; } = string.Empty;
    public string[] Roles { get; set; } = [];
    public bool Disabled { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class AdminSession
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string RefreshTokenHash { get; set; } = string.Empty;
    public string? PreviousRefreshTokenHash { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset AbsoluteExpiresAt { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }
}

public sealed class AdminAuditRow
{
    public Guid Id { get; set; }
    public string Actor { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Target { get; set; } = string.Empty;
    public string? BeforeJson { get; set; }
    public string? AfterJson { get; set; }
    public DateTimeOffset At { get; set; }
}

public sealed class ConfigDraftRow
{
    public Guid Id { get; set; }
    public string BaseVersion { get; set; } = string.Empty;
    public string DocumentJson { get; set; } = string.Empty;
    public int Revision { get; set; }
    public string Status { get; set; } = "open";
    public string? PublishedVersion { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public string UpdatedBy { get; set; } = string.Empty;
    public DateTimeOffset UpdatedAt { get; set; }
}

public sealed class StockingBatchRow
{
    public Guid BatchId { get; set; }
    public string LakeId { get; set; } = string.Empty;
    public string Status { get; set; } = StockingStatus.Draft;
    public DateTimeOffset? ScheduledAt { get; set; }
    public string? TimeZone { get; set; }
    public string? Note { get; set; }
    public string LinesJson { get; set; } = "[]";
    public string PayloadHash { get; set; } = string.Empty;
    public int Revision { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public string UpdatedBy { get; set; } = string.Empty;
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? ExecutedAt { get; set; }
    public string? ExecutedBy { get; set; }
    public string? Error { get; set; }
}

public static class StockingStatus
{
    public const string Draft = "draft";
    public const string Scheduled = "scheduled";
    public const string Completed = "completed";
    public const string Cancelled = "cancelled";
    public const string Failed = "failed";
}

public sealed class AdminUserConfig : IEntityTypeConfiguration<AdminUser>
{
    public void Configure(EntityTypeBuilder<AdminUser> entity)
    {
        entity.ToTable("admin_users");
        entity.HasKey(row => row.Email);
        entity.Property(row => row.Email).HasMaxLength(254);
    }
}

public sealed class AdminSessionConfig : IEntityTypeConfiguration<AdminSession>
{
    public void Configure(EntityTypeBuilder<AdminSession> entity)
    {
        entity.ToTable("admin_sessions");
        entity.HasKey(row => row.Id);
        entity.Property(row => row.Email).HasMaxLength(254);
        entity.Property(row => row.RefreshTokenHash).HasMaxLength(64);
        entity.Property(row => row.PreviousRefreshTokenHash).HasMaxLength(64);
        entity.HasIndex(row => row.RefreshTokenHash).IsUnique();
        entity.HasIndex(row => row.PreviousRefreshTokenHash);
    }
}

public sealed class AdminAuditRowConfig : IEntityTypeConfiguration<AdminAuditRow>
{
    public void Configure(EntityTypeBuilder<AdminAuditRow> entity)
    {
        entity.ToTable("admin_audit");
        entity.HasKey(row => row.Id);
        entity.Property(row => row.Actor).HasMaxLength(254);
        entity.Property(row => row.Action).HasMaxLength(64);
        entity.Property(row => row.Target).HasMaxLength(128);
        entity.HasIndex(row => row.At);
    }
}

public sealed class ConfigDraftRowConfig : IEntityTypeConfiguration<ConfigDraftRow>
{
    public void Configure(EntityTypeBuilder<ConfigDraftRow> entity)
    {
        entity.ToTable("config_drafts");
        entity.HasKey(row => row.Id);
        entity.Property(row => row.BaseVersion).HasMaxLength(128);
        entity.Property(row => row.PublishedVersion).HasMaxLength(128);
        entity.Property(row => row.Status).HasMaxLength(16);
        entity.Property(row => row.CreatedBy).HasMaxLength(254);
        entity.Property(row => row.UpdatedBy).HasMaxLength(254);
    }
}

public sealed class StockingBatchRowConfig : IEntityTypeConfiguration<StockingBatchRow>
{
    public void Configure(EntityTypeBuilder<StockingBatchRow> entity)
    {
        entity.ToTable("fish_stocking_batches");
        entity.HasKey(row => row.BatchId);
        entity.Property(row => row.LakeId).HasMaxLength(64);
        entity.Property(row => row.Status).HasMaxLength(16);
        entity.Property(row => row.TimeZone).HasMaxLength(64);
        entity.Property(row => row.Note).HasMaxLength(500);
        entity.Property(row => row.LinesJson).HasColumnType("jsonb");
        entity.Property(row => row.PayloadHash).HasMaxLength(64);
        entity.Property(row => row.CreatedBy).HasMaxLength(254);
        entity.Property(row => row.UpdatedBy).HasMaxLength(254);
        entity.Property(row => row.ExecutedBy).HasMaxLength(254);
        entity.HasIndex(row => new { row.Status, row.ScheduledAt });
    }
}

/// <summary>Audit ghi cùng transaction với thay đổi; không ghi token hay payload nhạy cảm.</summary>
public static class AdminAudit
{
    public static void Add(GameDbContext db, TimeProvider time, string actor, string action, string target, object? before, object? after) =>
        db.Add(new AdminAuditRow
        {
            Id = Guid.CreateVersion7(),
            Actor = actor,
            Action = action,
            Target = target,
            BeforeJson = before is null ? null : JsonSerializer.Serialize(before, GameJson.Options),
            AfterJson = after is null ? null : JsonSerializer.Serialize(after, GameJson.Options),
            At = time.GetUtcNow(),
        });
}

public sealed record AdminLoginRequest(string FirebaseIdToken);

public sealed record AdminLoginResponse(string AccessToken, DateTimeOffset ExpiresAt, string Email, IReadOnlyList<string> Permissions);

public sealed record Page<T>(IReadOnlyList<T> Items, string? NextCursor);
