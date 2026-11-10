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
    public int InventoryVersion { get; set; }
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
        });
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(GameDbContext).Assembly);
    }
}
