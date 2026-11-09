using DotNet.Testcontainers.Builders;
using FishingOnline.Api.Persistence;
using Microsoft.EntityFrameworkCore;
using Testcontainers.PostgreSql;

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

/// <summary>PostgreSQL thật qua Testcontainers, cùng image với server/compose.yaml. Thiếu Docker thì test báo Skipped.</summary>
public sealed class PostgresFixture : IAsyncLifetime
{
    private PostgreSqlContainer? container;

    public string? ConnectionString { get; private set; }
    public string? UnavailableReason { get; private set; }

    public async ValueTask InitializeAsync()
    {
        try
        {
            container = new PostgreSqlBuilder("postgres:17.6-alpine").Build();
            await container.StartAsync();
            ConnectionString = container.GetConnectionString();
        }
        catch (DockerUnavailableException exception)
        {
            UnavailableReason = exception.Message;
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (container is not null) await container.DisposeAsync();
    }
}

public sealed class PostgresTests(PostgresFixture postgres) : IClassFixture<PostgresFixture>
{
    [Fact]
    public async Task Migrations_ApplyOnEmptyDatabase_AndPersistPlayer()
    {
        if (postgres.UnavailableReason is { } reason) Assert.Skip($"Cần Docker: {reason}");
        var options = new DbContextOptionsBuilder<GameDbContext>().UseNpgsql(postgres.ConnectionString).Options;
        var player = new PlayerProfile { Id = Guid.NewGuid(), DisplayName = "tester", CreatedAt = DateTimeOffset.UtcNow };

        await using (var db = new GameDbContext(options))
        {
            await db.Database.MigrateAsync();
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
}
