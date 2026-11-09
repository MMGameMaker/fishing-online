using Microsoft.EntityFrameworkCore;

namespace FishingOnline.Api.Persistence;

// Foundation only: no authentication method, economy or gameplay rules are seeded here.
public sealed class PlayerProfile
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
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
            entity.Property(player => player.CreatedAt).IsRequired();
        });
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(GameDbContext).Assembly);
    }
}
