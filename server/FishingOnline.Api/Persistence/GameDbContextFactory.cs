using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace FishingOnline.Api.Persistence;

public sealed class GameDbContextFactory : IDesignTimeDbContextFactory<GameDbContext>
{
    public GameDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__Postgres");
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("Set ConnectionStrings__Postgres before running EF tools.");
        return new GameDbContext(new DbContextOptionsBuilder<GameDbContext>()
            .UseNpgsql(connectionString, options => options.CommandTimeout(5)).Options);
    }
}
