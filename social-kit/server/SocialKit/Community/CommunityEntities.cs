using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace SocialKit.Community;

// Bảng của SocialKit. Ứng dụng chủ thêm vào DbContext của mình bằng
//   modelBuilder.ApplyConfigurationsFromAssembly(typeof(SocialKitModule).Assembly);
// rồi tự tạo migration (SocialKit không giữ migration vì DbContext thuộc ứng dụng).

/// <summary>Ảnh đại diện lấy từ Google/Facebook khi đăng nhập, lưu trong DB để không phụ thuộc URL hết hạn của nhà cung cấp.</summary>
public sealed class PlayerAvatar
{
    public Guid PlayerId { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public byte[] Data { get; set; } = [];
    public string Provider { get; set; } = string.Empty;
    public string SourceUrl { get; set; } = string.Empty;
    public DateTimeOffset UpdatedAt { get; set; }
}

public sealed class PlayerAvatarConfig : IEntityTypeConfiguration<PlayerAvatar>
{
    public void Configure(EntityTypeBuilder<PlayerAvatar> entity)
    {
        entity.ToTable("player_avatars");
        entity.HasKey(row => row.PlayerId);
        entity.Property(row => row.ContentType).HasMaxLength(64);
        entity.Property(row => row.Provider).HasMaxLength(32);
        entity.Property(row => row.SourceUrl).HasMaxLength(1024);
    }
}

/// <summary>Trạng thái cộng đồng của người chơi (một hàng mỗi người).</summary>
public sealed class CommunityState
{
    public Guid PlayerId { get; set; }
    public DateTimeOffset? JoinClickedAt { get; set; }
    public int JoinClicks { get; set; }
    public DateTimeOffset? GroupVerifiedAt { get; set; }
}

public sealed class CommunityStateConfig : IEntityTypeConfiguration<CommunityState>
{
    public void Configure(EntityTypeBuilder<CommunityState> entity)
    {
        entity.ToTable("community_state");
        entity.HasKey(row => row.PlayerId);
    }
}

/// <summary>Một lượt bấm chia sẻ (lên trang cá nhân hoặc vào nhóm).</summary>
public sealed class ShareEvent
{
    public long Id { get; set; }
    public Guid PlayerId { get; set; }
    public string Kind { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class ShareEventConfig : IEntityTypeConfiguration<ShareEvent>
{
    public void Configure(EntityTypeBuilder<ShareEvent> entity)
    {
        entity.ToTable("share_events");
        entity.HasKey(row => row.Id);
        entity.Property(row => row.Kind).HasMaxLength(16);
        entity.HasIndex(row => new { row.PlayerId, row.CreatedAt });
    }
}
