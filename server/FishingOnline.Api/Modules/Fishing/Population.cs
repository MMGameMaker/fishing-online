using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Modules.Config;
using FishingOnline.Api.Modules.Lake;
using FishingOnline.Api.Persistence;
using FishingOnline.Domain;
using FishingOnline.Domain.Config;
using FishingOnline.Domain.Rules;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FishingOnline.Api.Modules.Fishing;

public sealed class LakeFishPopulation
{
    public string LakeId { get; set; } = string.Empty;
    public string SpeciesId { get; set; } = string.Empty;
    public int Remaining { get; set; }
    public int Reserved { get; set; }
    public int Version { get; set; }
}

/// <summary>Lịch sử chỉ thêm. Một nguồn (đợt thả, lần câu, tồn đầu) chỉ ghi một lần cho mỗi loài.</summary>
public sealed class LakeFishMovement
{
    public Guid Id { get; set; }
    public string LakeId { get; set; } = string.Empty;
    public string SpeciesId { get; set; } = string.Empty;
    public int Delta { get; set; }
    public string Kind { get; set; } = string.Empty;
    public string SourceId { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class LakeFishPopulationConfig : IEntityTypeConfiguration<LakeFishPopulation>
{
    public void Configure(EntityTypeBuilder<LakeFishPopulation> entity)
    {
        entity.ToTable("lake_fish_populations", table =>
        {
            table.HasCheckConstraint("CK_lake_fish_populations_reserved", "\"Reserved\" >= 0");
            table.HasCheckConstraint("CK_lake_fish_populations_remaining", "\"Remaining\" >= \"Reserved\"");
        });
        entity.HasKey(row => new { row.LakeId, row.SpeciesId });
        entity.Property(row => row.LakeId).HasMaxLength(64);
        entity.Property(row => row.SpeciesId).HasMaxLength(64);
    }
}

public sealed class LakeFishMovementConfig : IEntityTypeConfiguration<LakeFishMovement>
{
    public void Configure(EntityTypeBuilder<LakeFishMovement> entity)
    {
        entity.ToTable("lake_fish_movements");
        entity.HasKey(row => row.Id);
        entity.Property(row => row.LakeId).HasMaxLength(64);
        entity.Property(row => row.SpeciesId).HasMaxLength(64);
        entity.Property(row => row.Kind).HasMaxLength(16);
        entity.Property(row => row.SourceId).HasMaxLength(128);
        entity.HasIndex(row => new { row.Kind, row.SourceId, row.LakeId, row.SpeciesId }).IsUnique();
    }
}

public static class MovementKinds
{
    public const string Initial = "initial";
    public const string Stock = "stock";
    public const string Catch = "catch";
}

public sealed class InitialStockOptions
{
    public Dictionary<string, int> InitialStock { get; set; } = [];
}

public sealed record StockLine(string SpeciesId, int Quantity);

public sealed record StockResult(bool Applied, IReadOnlyDictionary<string, int> Remaining);

/// <summary>
/// Quần thể hữu hạn theo hồ/loài (SPEC 2.12, BE-E-08). Mọi thao tác khóa hàng quần thể theo thứ tự speciesId
/// trong transaction của caller, nên thả cá và bắt cá cùng lúc không mất cập nhật.
/// </summary>
public sealed class FishPopulation(IServiceScopeFactory scopes, LakeMap map, IConfigProvider configs, IConfiguration configuration, TimeProvider time)
{
    public string LakeId => map.Data.MapId;

    /// <summary>Tạo tồn đầu cho loài chưa có. Không bao giờ ghi đè hồ đã có cá (login, restart, publish config).</summary>
    public async Task EnsureSeededAsync(CancellationToken ct)
    {
        var initial = configuration.GetSection("Fishing:InitialStock").Get<Dictionary<string, int>>() ?? [];
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        var existing = await db.Set<LakeFishPopulation>().Where(row => row.LakeId == LakeId).Select(row => row.SpeciesId).ToListAsync(ct);
        var now = time.GetUtcNow();
        foreach (var fish in configs.Current.Fish.Where(fish => !existing.Contains(fish.SpeciesId)))
        {
            var quantity = initial.GetValueOrDefault(fish.Rarity.ToString().ToLowerInvariant());
            if (quantity < 0) throw new InvalidOperationException("Fishing:InitialStock must not be negative.");
            db.Add(new LakeFishPopulation { LakeId = LakeId, SpeciesId = fish.SpeciesId, Remaining = quantity });
            db.Add(Movement(fish.SpeciesId, quantity, MovementKinds.Initial, LakeId, now));
        }
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException exception) when (exception.UniqueConstraint() is not null)
        {
            // Instance khác vừa tạo xong.
        }
    }

    /// <summary>Đợt thả cộng dồn vào remaining. Gửi lại cùng batchId không cộng lần hai; batch mới thì luôn cộng.</summary>
    public async Task<StockResult> StockAsync(Guid batchId, IReadOnlyList<StockLine> lines, CancellationToken ct)
    {
        var known = configs.Current.Fish.Select(fish => fish.SpeciesId).ToHashSet();
        if (lines.Count == 0 || lines.Any(line => line.Quantity <= 0 || !known.Contains(line.SpeciesId))
            || lines.Select(line => line.SpeciesId).Distinct().Count() != lines.Count)
            throw new GameException(ErrorCatalog.ValidationFailed);

        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var result = await StockInTransactionAsync(db, batchId, lines, ct);
        await transaction.CommitAsync(ct);
        return result;
    }

    /// <summary>Bản chạy trong transaction của caller, để đợt thả và trạng thái batch commit cùng nhau (AD-06).</summary>
    public async Task<StockResult> StockInTransactionAsync(GameDbContext db, Guid batchId, IReadOnlyList<StockLine> lines, CancellationToken ct)
    {
        var rows = await LockAsync(db, ct);
        var source = batchId.ToString();
        var applied = !await db.Set<LakeFishMovement>().AnyAsync(row => row.Kind == MovementKinds.Stock && row.SourceId == source, ct);
        if (applied)
        {
            var now = time.GetUtcNow();
            foreach (var line in lines)
            {
                var row = rows.GetValueOrDefault(line.SpeciesId);
                if (row is null)
                {
                    row = new LakeFishPopulation { LakeId = LakeId, SpeciesId = line.SpeciesId };
                    db.Add(row);
                    rows[line.SpeciesId] = row;
                }
                row.Remaining += line.Quantity;
                row.Version++;
                db.Add(Movement(line.SpeciesId, line.Quantity, MovementKinds.Stock, source, now));
            }
            await db.SaveChangesAsync(ct);
        }
        return new StockResult(applied, rows.ToDictionary(pair => pair.Key, pair => pair.Value.Remaining));
    }

    /// <summary>Chọn loài theo cá còn lại (remaining − reserved). Gọi trong transaction của lần câu; trả về hàng đã khóa.</summary>
    public async Task<(string? SpeciesId, Dictionary<string, LakeFishPopulation> Rows)> PickAsync(
        GameDbContext db, IRandomSource random, GameplayConfig config, int rareLuck, CancellationToken ct)
    {
        var rows = await LockAsync(db, ct);
        var species = SpawnPicker.PickAvailable(random, config, rareLuck,
            speciesId => rows.TryGetValue(speciesId, out var row) && row.Remaining > row.Reserved);
        return (species, rows);
    }

    public void Reserve(LakeFishPopulation row)
    {
        row.Reserved++;
        row.Version++;
    }

    /// <summary>Kết thúc lần câu đang giữ cá: thắng thì trừ hẳn một con, còn lại chỉ trả chỗ giữ.</summary>
    public async Task SettleAsync(GameDbContext db, string speciesId, Guid attemptId, bool caught, CancellationToken ct)
    {
        var rows = await LockAsync(db, ct);
        var row = rows[speciesId];
        row.Reserved--;
        row.Version++;
        if (!caught) return;
        row.Remaining--;
        db.Add(Movement(speciesId, -1, MovementKinds.Catch, attemptId.ToString(), time.GetUtcNow()));
    }

    public async Task<IReadOnlyList<LakeFishPopulation>> SnapshotAsync(CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        return await db.Set<LakeFishPopulation>().AsNoTracking().Where(row => row.LakeId == LakeId).OrderBy(row => row.SpeciesId).ToListAsync(ct);
    }

    private async Task<Dictionary<string, LakeFishPopulation>> LockAsync(GameDbContext db, CancellationToken ct)
    {
        var lakeId = LakeId;
        return await db.Set<LakeFishPopulation>()
            .FromSqlInterpolated($"""select * from game.lake_fish_populations where "LakeId" = {lakeId} order by "SpeciesId" for update""")
            .AsTracking()
            .ToDictionaryAsync(row => row.SpeciesId, ct);
    }

    private LakeFishMovement Movement(string speciesId, int delta, string kind, string source, DateTimeOffset now) => new()
    {
        Id = Guid.CreateVersion7(), LakeId = LakeId, SpeciesId = speciesId, Delta = delta, Kind = kind, SourceId = source, CreatedAt = now,
    };
}
