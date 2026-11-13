using System.Globalization;
using System.Text;
using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Modules.Config;
using FishingOnline.Api.Modules.Fishing;
using FishingOnline.Api.Modules.Identity;
using FishingOnline.Api.Modules.Lake;
using FishingOnline.Api.Modules.Wallet;
using FishingOnline.Api.Persistence;
using FishingOnline.Domain.Config;
using FishingOnline.Domain.Rules;
using Microsoft.EntityFrameworkCore;

namespace FishingOnline.Api.Modules.Economy;

public sealed class NewPlayerGrant(GameDbContext db, IConfigProvider configs, TimeProvider time) : INewPlayerGrant
{
    public async Task GrantAsync(Guid playerId, CancellationToken ct)
    {
        db.Add(new RodOwnedRow { PlayerId = playerId, RodId = configs.Current.NewPlayer.RodId, AcquiredAt = time.GetUtcNow() });
        await db.SaveChangesAsync(ct);
    }
}

public sealed class InventoryService(
    GameDbContext db, IWallet wallet, IConfigProvider configs, IFishingState fishing, TimeProvider time, LakeRoom room)
{
    private const int MaxSellIds = 200;

    public async Task<InventoryView> GetAsync(Guid playerId, CancellationToken ct)
    {
        var player = await db.Players.AsNoTracking().SingleAsync(row => row.Id == playerId, ct);
        var rods = await db.Set<RodOwnedRow>().AsNoTracking().Where(row => row.PlayerId == playerId)
            .OrderBy(row => row.AcquiredAt).Select(row => row.RodId).ToListAsync(ct);
        var fish = await db.Set<CatchRow>().AsNoTracking().Where(row => row.PlayerId == playerId && row.SoldAt == null)
            .OrderByDescending(row => row.CaughtAt)
            .Select(row => new InventoryFishView(row.CatchId, row.SpeciesId, row.LengthTenthCm, row.CaughtAt))
            .ToListAsync(ct);
        return new InventoryView(player.InventoryVersion, Text(await wallet.GetBalanceAsync(playerId, ct)), player.EquippedRodId, rods, [], fish);
    }

    public async Task<EquipRodResponse> EquipAsync(Guid playerId, string rodId, CancellationToken ct)
    {
        if (fishing.IsBusy(playerId)) throw new GameException("ATTEMPT_ACTIVE");
        if (!await db.Set<RodOwnedRow>().AsNoTracking().AnyAsync(row => row.PlayerId == playerId && row.RodId == rodId, ct))
            throw new GameException("ROD_NOT_OWNED");
        await db.Players.Where(row => row.Id == playerId).ExecuteUpdateAsync(setters => setters
            .SetProperty(row => row.EquippedRodId, rodId)
            .SetProperty(row => row.InventoryVersion, row => row.InventoryVersion + 1), ct);
        // Cả hồ thấy cần mới ngay (feedback 2026-11-13), giống SkinChanged; người chưa ở hồ thì thôi.
        await room.Queue.RunAsync(async () =>
        {
            if (room.Find(playerId) is { } member)
            {
                member.RodId = rodId;
                await room.BroadcastAsync("RodChanged", new RodChangedView(playerId, rodId));
            }
            return true;
        });
        return new EquipRodResponse(rodId);
    }

    public async Task<BuyResponse> BuyAsync(Guid playerId, BuyRequest request, CancellationToken ct)
    {
        var config = configs.Current;
        var offer = config.ShopOffers.SingleOrDefault(row => row.OfferId == request.OfferId)
            ?? throw new GameException(ErrorCatalog.ValidationFailed);
        if (config.Rods.All(rod => rod.RodId != offer.ItemId) || request.Quantity != 1)
            throw new GameException(ErrorCatalog.ValidationFailed);
        if (await db.Set<RodOwnedRow>().AsNoTracking().AnyAsync(row => row.PlayerId == playerId && row.RodId == offer.ItemId, ct))
            throw new GameException("ROD_ALREADY_OWNED");

        var gold = await wallet.DebitAsync(playerId, offer.PriceGold, LedgerReasons.BuyRod, offer.OfferId, ct);
        db.Add(new RodOwnedRow { PlayerId = playerId, RodId = offer.ItemId, AcquiredAt = time.GetUtcNow() });
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException exception) when (exception.UniqueConstraint() is not null)
        {
            throw new GameException("ROD_ALREADY_OWNED");
        }
        await BumpInventoryAsync(playerId, ct);
        return new BuyResponse(Text(gold), await GetAsync(playerId, ct));
    }

    public async Task<SellFishResponse> SellAsync(Guid playerId, SellFishRequest request, Guid requestKey, CancellationToken ct)
    {
        var sellAll = request.All == true;
        var ids = request.CatchIds?.Distinct().ToArray() ?? [];
        if (sellAll == ids.Length > 0 || ids.Length > MaxSellIds) throw new GameException(ErrorCatalog.ValidationFailed);

        var locked = sellAll
            ? await db.Set<CatchRow>()
                .FromSqlInterpolated($"""select * from game.catches where "PlayerId" = {playerId} and "SoldAt" is null for update""")
                .AsTracking().ToListAsync(ct)
            : await db.Set<CatchRow>()
                .FromSqlInterpolated($"""select * from game.catches where "CatchId" = any({ids}) for update""")
                .AsTracking().ToListAsync(ct);
        if (!sellAll && (locked.Count != ids.Length || locked.Any(row => row.PlayerId != playerId || row.SoldAt is not null)))
            throw new GameException("FISH_NOT_FOUND");

        if (locked.Count == 0)
            return new SellFishResponse(0, "0", Text(await wallet.GetBalanceAsync(playerId, ct)));

        var now = time.GetUtcNow();
        long earned = 0;
        foreach (var row in locked)
        {
            earned += configs.Get(row.ConfigVersion).Fish.Single(fish => fish.SpeciesId == row.SpeciesId).SellGold;
            row.SoldAt = now;
        }
        await db.SaveChangesAsync(ct);
        var gold = await wallet.CreditAsync(playerId, earned, LedgerReasons.SellFish, requestKey.ToString(), ct);
        await BumpInventoryAsync(playerId, ct);
        return new SellFishResponse(locked.Count, Text(earned), Text(gold));
    }

    private Task BumpInventoryAsync(Guid playerId, CancellationToken ct) =>
        db.Players.Where(row => row.Id == playerId)
            .ExecuteUpdateAsync(setters => setters.SetProperty(row => row.InventoryVersion, row => row.InventoryVersion + 1), ct);

    private static string Text(long gold) => gold.ToString(CultureInfo.InvariantCulture);
}

public sealed class CatchRecorder(GameDbContext db, IConfigProvider configs, TimeProvider time) : ICatchRecorder
{
    public async Task<CatchRecordResult> RecordAsync(
        Guid playerId, Guid attemptId, string speciesId, int lengthTenthCm, int exp, string configVersion, CancellationToken ct)
    {
        await using var owned = db.Database.CurrentTransaction is null ? await db.Database.BeginTransactionAsync(ct) : null;

        // Khóa player trước để hai lần ghi cùng attempt chạy lần lượt và EXP không bị mất cập nhật.
        var player = await db.Players
            .FromSqlInterpolated($"""select * from game.players where "Id" = {playerId} for update""")
            .AsTracking().SingleAsync(ct);

        var existing = await db.Set<CatchRow>().AsNoTracking().SingleOrDefaultAsync(row => row.AttemptId == attemptId, ct);
        if (existing is not null) return Result(existing);

        var config = configs.Get(configVersion);
        var fish = config.Fish.Single(row => row.SpeciesId == speciesId);
        var now = time.GetUtcNow();
        var record = await db.Set<SpeciesRecordRow>().SingleOrDefaultAsync(row => row.PlayerId == playerId && row.SpeciesId == speciesId, ct);
        var isNew = record is null;
        var isRecord = record is not null && lengthTenthCm > record.BestLengthTenthCm;

        var levels = new LevelTable(config.Levels);
        var previousLevel = levels.LevelForExp(player.Exp);
        player.Exp += exp;
        player.Level = levels.LevelForExp(player.Exp);
        player.InventoryVersion++;

        var row = new CatchRow
        {
            CatchId = Guid.CreateVersion7(),
            PlayerId = playerId,
            AttemptId = attemptId,
            SpeciesId = speciesId,
            Rarity = fish.Rarity.ToString().ToLowerInvariant(),
            LengthTenthCm = lengthTenthCm,
            CaughtAt = now,
            ConfigVersion = configVersion,
            IsNew = isNew,
            IsRecord = isRecord,
            ExpGained = exp,
            LevelAfter = player.Level,
            LevelUp = player.Level > previousLevel,
        };
        db.Add(row);

        if (record is null)
        {
            db.Add(new SpeciesRecordRow
            {
                PlayerId = playerId, SpeciesId = speciesId, FirstCaughtAt = now, TotalCaught = 1,
                BestLengthTenthCm = lengthTenthCm, BestCatchId = row.CatchId,
            });
        }
        else
        {
            record.TotalCaught++;
            if (isRecord)
            {
                record.BestLengthTenthCm = lengthTenthCm;
                record.BestCatchId = row.CatchId;
            }
        }

        await db.SaveChangesAsync(ct);
        if (owned is not null) await owned.CommitAsync(ct);
        return Result(row);
    }

    private static CatchRecordResult Result(CatchRow row) =>
        new(row.CatchId, row.IsNew, row.IsRecord, row.ExpGained, row.LevelAfter, row.LevelUp);
}

public sealed class ProgressService(GameDbContext db, IConfigProvider configs) : IProgress
{
    public async Task<PlayerStats> GetStatsAsync(Guid playerId, CancellationToken ct)
    {
        var player = await db.Players.AsNoTracking().SingleAsync(row => row.Id == playerId, ct);
        var config = configs.Current;

        var table = new LevelTable(config.Levels);
        var levelNumber = table.LevelForExp(player.Exp);
        var level = config.Levels.Single(row => row.Level == levelNumber);
        var rod = config.Rods.Single(row => row.RodId == player.EquippedRodId);

        return new PlayerStats(
            levelNumber, player.Exp, table.ExpToNext(player.Exp), rod.RodId,
            new StatCalculator(config).Compute(level, rod),
            new Stats(level.Strength, level.NormalHitZonePct, level.WeaknessHitZonePct, level.RareLuck, level.LargeLuck),
            new Stats(rod.Strength, rod.NormalHitZonePct, rod.WeaknessHitZonePct, rod.RareLuck, rod.LargeLuck));
    }
}

public sealed class JournalService(GameDbContext db, IConfigProvider configs)
{
    private const int DefaultPageSize = 20;
    private const int MaxPageSize = 100;

    public async Task<CodexView> CodexAsync(Guid playerId, CancellationToken ct)
    {
        var records = await db.Set<SpeciesRecordRow>().AsNoTracking().Where(row => row.PlayerId == playerId).ToDictionaryAsync(row => row.SpeciesId, ct);
        return new CodexView(configs.Current.Fish.Select(fish =>
            records.TryGetValue(fish.SpeciesId, out var record)
                ? new CodexSpeciesView(fish.SpeciesId, true, record.TotalCaught, record.BestLengthTenthCm, record.FirstCaughtAt)
                : new CodexSpeciesView(fish.SpeciesId, false, null, null, null)).ToArray());
    }

    public async Task<HistoryView> HistoryAsync(Guid playerId, string? cursor, int? limit, CancellationToken ct)
    {
        var size = limit ?? DefaultPageSize;
        if (size is < 1 or > MaxPageSize) throw new GameException(ErrorCatalog.ValidationFailed);

        var query = db.Set<FishingAttemptRow>().AsNoTracking().Where(row => row.PlayerId == playerId && row.EndedAt != null);
        if (cursor is not null)
        {
            var (endedAt, attemptId) = ParseCursor(cursor);
            query = query.Where(row => row.EndedAt < endedAt || (row.EndedAt == endedAt && row.AttemptId.CompareTo(attemptId) < 0));
        }

        var rows = await query.OrderByDescending(row => row.EndedAt).ThenByDescending(row => row.AttemptId).Take(size + 1).ToListAsync(ct);
        var page = rows.Take(size).ToArray();
        var next = rows.Count > size ? FormatCursor(page[^1].EndedAt!.Value, page[^1].AttemptId) : null;
        return new HistoryView(
            page.Select(row => new HistoryItemView(row.AttemptId, row.Phase, row.Reason, row.SpeciesId, row.LengthTenthCm, row.EndedAt!.Value)).ToArray(),
            next);
    }

    private static string FormatCursor(DateTimeOffset endedAt, Guid attemptId) =>
        Convert.ToBase64String(Encoding.UTF8.GetBytes($"{endedAt.UtcTicks}|{attemptId:N}"));

    private static (DateTimeOffset EndedAt, Guid AttemptId) ParseCursor(string cursor)
    {
        try
        {
            var parts = Encoding.UTF8.GetString(Convert.FromBase64String(cursor)).Split('|');
            return (new DateTimeOffset(long.Parse(parts[0], CultureInfo.InvariantCulture), TimeSpan.Zero), Guid.Parse(parts[1]));
        }
        catch (Exception exception) when (exception is FormatException or IndexOutOfRangeException or ArgumentOutOfRangeException)
        {
            throw new GameException(ErrorCatalog.ValidationFailed);
        }
    }
}

public static class EconomyModule
{
    public static IServiceCollection AddEconomy(this IServiceCollection services) => services
        .AddScoped<INewPlayerGrant, NewPlayerGrant>()
        .AddScoped<InventoryService>()
        .AddScoped<ICatchRecorder, CatchRecorder>()
        .AddScoped<IProgress, ProgressService>()
        .AddScoped<JournalService>();

    public static WebApplication MapEconomy(this WebApplication app)
    {
        var me = app.MapGroup("/api/v1/me").RequireAuthorization();
        me.MapGet("/inventory", async (InventoryService inventory, ICurrentPlayer player, CancellationToken ct) =>
            ApiResult.Ok(await inventory.GetAsync(player.PlayerId, ct)));
        me.MapPut("/equipped-rod", async (EquipRodRequest request, InventoryService inventory, ICurrentPlayer player, CancellationToken ct) =>
            ApiResult.Ok(await inventory.EquipAsync(player.PlayerId, request.RodId, ct)));
        me.MapGet("/progress", async (IProgress progress, ICurrentPlayer player, CancellationToken ct) =>
        {
            var stats = await progress.GetStatsAsync(player.PlayerId, ct);
            return ApiResult.Ok(new ProgressView(stats.Level, stats.Exp, stats.ExpToNext, stats.Total, new ProgressBreakdown(stats.LevelPart, stats.RodPart)));
        });
        me.MapGet("/codex", async (JournalService journal, ICurrentPlayer player, CancellationToken ct) =>
            ApiResult.Ok(await journal.CodexAsync(player.PlayerId, ct)));
        me.MapGet("/history", async (string? cursor, int? limit, JournalService journal, ICurrentPlayer player, CancellationToken ct) =>
            ApiResult.Ok(await journal.HistoryAsync(player.PlayerId, cursor, limit, ct)));

        var shop = app.MapGroup("/api/v1/shop").RequireAuthorization();
        shop.MapPost("/buy", async (BuyRequest request, InventoryService inventory, ICurrentPlayer player, CancellationToken ct) =>
            ApiResult.Ok(await inventory.BuyAsync(player.PlayerId, request, ct))).Idempotent("shop.buy");
        shop.MapPost("/sell-fish", async (SellFishRequest request, InventoryService inventory, ICurrentPlayer player, HttpContext http, CancellationToken ct) =>
            ApiResult.Ok(await inventory.SellAsync(player.PlayerId, request, Guid.Parse(http.Request.Headers["Idempotency-Key"]!), ct))).Idempotent("shop.sell");
        return app;
    }
}
