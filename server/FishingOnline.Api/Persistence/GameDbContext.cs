using Microsoft.EntityFrameworkCore;

namespace FishingOnline.Api.Persistence;

public sealed class PlayerProfile
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>Tên viết thường, để unique không phân biệt hoa thường.</summary>
    public string DisplayNameKey { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }
    public int Level { get; set; } = 1;
    public int Exp { get; set; }
    public string SelectedSkinId { get; set; } = string.Empty;
    public string EquippedRodId { get; set; } = string.Empty;

    /// <summary>Đã chọn nhân vật ở panel Chọn nhân vật (hiện một lần khi vào game lần đầu, 2026-11-25); bot luôn true.</summary>
    public bool CharacterChosen { get; set; }

    /// <summary>Trang phục đang mặc (mũ, áo, quần; null = chưa mặc), mua ở Cửa hàng (Modules/Wardrobe).</summary>
    public string? HatId { get; set; }

    public string? TopId { get; set; }
    public string? LegsId { get; set; }

    /// <summary>Nguyên bộ (bộ liền) đang mặc; khi có thì TopId và LegsId là null.</summary>
    public string? SetId { get; set; }
    public int InventoryVersion { get; set; }

    /// <summary>Danh hiệu đang đeo; null là mặc định (Profile/ProfileModule.cs).</summary>
    public string? TitleId { get; set; }

    /// <summary>Lời nhắn tối đa 100 ký tự.</summary>
    public string Bio { get; set; } = string.Empty;

    /// <summary>Tài khoản bot do Server điều khiển (Modules/Bots). Chỉ Admin và nội bộ Server được biết, không gửi cho Client.</summary>
    public bool IsBot { get; set; }
}

public sealed class GameDbContext(DbContextOptions<GameDbContext> options) : DbContext(options)
{
    public DbSet<PlayerProfile> Players => Set<PlayerProfile>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("game");
        modelBuilder.Entity<PlayerProfile>(entity =>
        {
            entity.ToTable("players");
            entity.HasKey(player => player.Id);
            entity.Property(player => player.Id).ValueGeneratedNever();
            entity.Property(player => player.DisplayName).HasMaxLength(80).IsRequired();
            entity.Property(player => player.DisplayNameKey).HasMaxLength(80).IsRequired();
            entity.HasIndex(player => player.DisplayNameKey).IsUnique();
            entity.Property(player => player.CreatedAt).IsRequired();
            entity.Property(player => player.Level).HasDefaultValue(1);
            entity.Property(player => player.SelectedSkinId).HasMaxLength(64);
            entity.Property(player => player.EquippedRodId).HasMaxLength(64);
            entity.Property(player => player.TitleId).HasMaxLength(32);
            entity.Property(player => player.HatId).HasMaxLength(64);
            entity.Property(player => player.TopId).HasMaxLength(64);
            entity.Property(player => player.LegsId).HasMaxLength(64);
            entity.Property(player => player.SetId).HasMaxLength(64);
            entity.Property(player => player.Bio).HasMaxLength(400).HasDefaultValue(string.Empty);
            entity.Property(player => player.IsBot).HasDefaultValue(false);
            entity.Property(player => player.CharacterChosen).HasDefaultValue(false);
        });
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(GameDbContext).Assembly);
    }
}
