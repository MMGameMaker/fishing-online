using FishingOnline.Api.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace FishingOnline.Api.Tests;

public sealed class ModelTests
{
    [Fact]
    public void Model_MatchesMigrationSnapshot()
    {
        // Không mở kết nối: chỉ so model hiện tại với snapshot migration.
        using var db = new GameDbContext(new DbContextOptionsBuilder<GameDbContext>()
            .UseNpgsql("Host=localhost;Database=model_only").Options);

        Assert.False(db.Database.HasPendingModelChanges());
        Assert.Equal("game", db.Model.GetDefaultSchema());
    }
}

[Collection(PostgresCollection.Name)]
public sealed class PostgresTests(PostgresServer postgres)
{
    [Fact]
    public async Task Migrations_UpgradeDatabaseWithExistingPlayers()
    {
        var connectionString = await postgres.CreateDatabaseAsync();
        try
        {
            await using var connection = new Npgsql.NpgsqlConnection(connectionString);
            await connection.OpenAsync();
            await using (var reset = new Npgsql.NpgsqlCommand("""DROP SCHEMA game CASCADE; DROP TABLE IF EXISTS public."__EFMigrationsHistory";""", connection))
                await reset.ExecuteNonQueryAsync();

            var options = new DbContextOptionsBuilder<GameDbContext>().UseNpgsql(connectionString).Options;
            await using var db = new GameDbContext(options);
            var migrator = db.GetService<IMigrator>();
            await migrator.MigrateAsync("20261103110934_InitialPlayerProfiles");
            await using (var seed = new Npgsql.NpgsqlCommand("""
                insert into game.players ("Id", "DisplayName", "CreatedAt") values
                (gen_random_uuid(), 'Zen', now()), (gen_random_uuid(), 'zen', now()), (gen_random_uuid(), 'Bob', now())
                """, connection))
                await seed.ExecuteNonQueryAsync();

            await db.Database.MigrateAsync();

            var keys = await db.Players.AsNoTracking().Select(player => player.DisplayNameKey).ToListAsync();
            Assert.Equal(3, keys.Distinct().Count());
            Assert.Contains("zen", keys);
            Assert.Contains("bob", keys);
        }
        finally
        {
            await postgres.DropDatabaseAsync(connectionString);
        }
    }

    [Fact]
    public async Task Migrations_ApplyOnEmptyDatabase_AndPersistPlayer()
    {
        var connectionString = await postgres.CreateDatabaseAsync();
        var options = new DbContextOptionsBuilder<GameDbContext>().UseNpgsql(connectionString).Options;
        var player = new PlayerProfile { Id = Guid.NewGuid(), DisplayName = "tester", DisplayNameKey = "tester", CreatedAt = DateTimeOffset.UtcNow };
        try
        {
            await using (var db = new GameDbContext(options))
            {
                await db.Database.MigrateAsync();
                Assert.Empty(await db.Database.GetPendingMigrationsAsync());
                db.Players.Add(player);
                await db.SaveChangesAsync();
            }

            await using (var db = new GameDbContext(options))
            {
                var stored = await db.Players.SingleAsync(p => p.Id == player.Id);
                Assert.Equal("tester", stored.DisplayName);
            }
        }
        finally
        {
            await postgres.DropDatabaseAsync(connectionString);
        }
    }
}
