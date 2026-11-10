using System.Linq.Expressions;
using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Modules.Economy;
using FishingOnline.Api.Modules.Fishing;
using FishingOnline.Api.Modules.Lake;
using FishingOnline.Api.Modules.Wallet;
using FishingOnline.Api.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FishingOnline.Api.Modules.Admin;

public sealed record AdminPlayerSummary(Guid PlayerId, string DisplayName, int Level, DateTimeOffset CreatedAt);

public sealed record AdminPlayerDetail(
    Guid PlayerId, string DisplayName, int Level, int Exp, string SelectedSkinId, string EquippedRodId,
    string Gold, string LedgerTotal, IReadOnlyList<string> Rods, int OpenSignals);

public sealed record PopulationView(string SpeciesId, int Remaining, int Reserved, int Available, int Stocked, int Caught);

public sealed record AdminLakeView(string LakeId, IReadOnlyList<SeatView> Seats, IReadOnlyList<PlayerView> OnlinePlayers, IReadOnlyList<PopulationView> Population);

public sealed record SignalReviewRequest(string Status, string? Note);

/// <summary>AD-03: chỉ đọc dữ liệu của nhóm khác; không có thao tác sửa tiền.</summary>
public sealed class AdminLookupService(GameDbContext db, SeatSessions seats, LakeRoom room, FishPopulation population, TimeProvider time)
{
    private const int MaxSearchResults = 50;
    private const int DefaultPageSize = 50;
    private const int MaxPageSize = 200;
    private static readonly HashSet<string> ReviewStatuses = ["reviewed", "dismissed"];

    public async Task<IReadOnlyList<AdminPlayerSummary>> SearchAsync(string? query, CancellationToken ct)
    {
        var text = query?.Trim() ?? string.Empty;
        if (text.Length == 0) throw new GameException(ErrorCatalog.ValidationFailed);
        var players = db.Players.AsNoTracking();
        players = Guid.TryParse(text, out var playerId)
            ? players.Where(row => row.Id == playerId)
            : players.Where(row => row.DisplayNameKey.Contains(text.ToLowerInvariant()));
        return await players.OrderBy(row => row.DisplayNameKey).Take(MaxSearchResults)
            .Select(row => new AdminPlayerSummary(row.Id, row.DisplayName, row.Level, row.CreatedAt)).ToListAsync(ct);
    }

    public async Task<AdminPlayerDetail> DetailAsync(Guid playerId, CancellationToken ct)
    {
        var player = await db.Players.AsNoTracking().SingleOrDefaultAsync(row => row.Id == playerId, ct)
            ?? throw new GameException(ErrorCatalog.ValidationFailed, message: "Unknown player.");
        var gold = await db.Set<WalletRow>().AsNoTracking().Where(row => row.PlayerId == playerId).Select(row => (long?)row.Gold).SingleOrDefaultAsync(ct) ?? 0;
        var ledgerTotal = await db.Set<LedgerEntry>().AsNoTracking().Where(row => row.PlayerId == playerId).SumAsync(row => row.Delta, ct);
        var rods = await db.Set<RodOwnedRow>().AsNoTracking().Where(row => row.PlayerId == playerId).OrderBy(row => row.AcquiredAt).Select(row => row.RodId).ToListAsync(ct);
        var openSignals = await db.Set<PlayerSecuritySignal>().AsNoTracking().CountAsync(row => row.PlayerId == playerId && row.Status == "open", ct);
        return new AdminPlayerDetail(player.Id, player.DisplayName, player.Level, player.Exp, player.SelectedSkinId, player.EquippedRodId,
            Text(gold), Text(ledgerTotal), rods, openSignals);
    }

    public Task<Page<LedgerEntry>> LedgerAsync(Guid playerId, string? cursor, int? limit, CancellationToken ct) =>
        PageAsync(db.Set<LedgerEntry>().Where(row => row.PlayerId == playerId), row => row.Id, cursor, limit, ct);

    public Task<Page<CatchRow>> CatchesAsync(Guid playerId, string? cursor, int? limit, CancellationToken ct) =>
        PageAsync(db.Set<CatchRow>().Where(row => row.PlayerId == playerId), row => row.CatchId, cursor, limit, ct);

    public Task<Page<FishingAttemptRow>> AttemptsAsync(Guid playerId, string? cursor, int? limit, CancellationToken ct) =>
        PageAsync(db.Set<FishingAttemptRow>().Where(row => row.PlayerId == playerId), row => row.AttemptId, cursor, limit, ct);

    public Task<Page<SeatSessionRow>> SeatSessionsAsync(Guid playerId, string? cursor, int? limit, CancellationToken ct) =>
        PageAsync(db.Set<SeatSessionRow>().Where(row => row.PlayerId == playerId), row => row.Id, cursor, limit, ct);

    public Task<Page<PlayerSecuritySignal>> SignalsAsync(Guid playerId, string? cursor, int? limit, CancellationToken ct) =>
        PageAsync(db.Set<PlayerSecuritySignal>().Where(row => row.PlayerId == playerId), row => row.SignalId, cursor, limit, ct);

    /// <summary><paramref name="target"/> lọc theo đối tượng, ví dụ lịch sử của một đợt thả cá.</summary>
    public Task<Page<AdminAuditRow>> AuditAsync(string? target, string? cursor, int? limit, CancellationToken ct) =>
        PageAsync(target is null ? db.Set<AdminAuditRow>() : db.Set<AdminAuditRow>().Where(row => row.Target == target), row => row.Id, cursor, limit, ct);

    /// <summary>Chỉ đổi trạng thái xem xét của cảnh báo; không ban, không thu hồi thưởng.</summary>
    public async Task<PlayerSecuritySignal> ReviewSignalAsync(string actor, Guid signalId, SignalReviewRequest request, CancellationToken ct)
    {
        if (!ReviewStatuses.Contains(request.Status) || request.Note?.Length > 500) throw new GameException(ErrorCatalog.ValidationFailed);
        var signal = await db.Set<PlayerSecuritySignal>().AsTracking().SingleOrDefaultAsync(row => row.SignalId == signalId, ct)
            ?? throw new GameException(ErrorCatalog.ValidationFailed, message: "Unknown signal.");
        var before = new { signal.Status, signal.ReviewNote };
        signal.Status = request.Status;
        signal.ReviewNote = request.Note;
        signal.ReviewedBy = actor;
        signal.ReviewedAt = time.GetUtcNow();
        AdminAudit.Add(db, time, actor, "signal.review", signalId.ToString(), before, new { signal.Status, signal.ReviewNote });
        await db.SaveChangesAsync(ct);
        return signal;
    }

    public async Task<AdminLakeView> LakeAsync(CancellationToken ct)
    {
        var seatViews = await seats.SeatViewsAsync(ct);
        var players = await room.Queue.RunAsync(() => Task.FromResult(room.Views()));
        var totals = await db.Set<LakeFishMovement>().AsNoTracking().Where(row => row.LakeId == population.LakeId)
            .GroupBy(row => new { row.SpeciesId, row.Kind })
            .Select(group => new { group.Key.SpeciesId, group.Key.Kind, Total = group.Sum(row => row.Delta) })
            .ToListAsync(ct);
        int Sum(string species, params string[] kinds) => totals.Where(row => row.SpeciesId == species && kinds.Contains(row.Kind)).Sum(row => row.Total);
        var rows = await population.SnapshotAsync(ct);
        return new AdminLakeView(population.LakeId, seatViews, players, rows.Select(row => new PopulationView(
            row.SpeciesId, row.Remaining, row.Reserved, row.Remaining - row.Reserved,
            Sum(row.SpeciesId, MovementKinds.Initial, MovementKinds.Stock), -Sum(row.SpeciesId, MovementKinds.Catch))).ToArray());
    }

    /// <summary>Phân trang theo id Guid v7 giảm dần (cũng là thứ tự thời gian tạo); cursor là id cuối của trang trước.</summary>
    public static async Task<Page<T>> PageAsync<T>(IQueryable<T> query, Expression<Func<T, Guid>> key, string? cursor, int? limit, CancellationToken ct)
        where T : class
    {
        var size = limit ?? DefaultPageSize;
        if (size is < 1 or > MaxPageSize) throw new GameException(ErrorCatalog.ValidationFailed);
        if (cursor is not null)
        {
            if (!Guid.TryParse(cursor, out var after)) throw new GameException(ErrorCatalog.ValidationFailed);
            var compare = Expression.Call(key.Body, nameof(Guid.CompareTo), Type.EmptyTypes, Expression.Constant(after));
            var before = Expression.Lambda<Func<T, bool>>(Expression.LessThan(compare, Expression.Constant(0)), key.Parameters);
            query = query.Where(before);
        }
        var rows = await query.AsNoTracking().OrderByDescending(key).Take(size + 1).ToListAsync(ct);
        var page = rows.Take(size).ToArray();
        return new Page<T>(page, rows.Count > size ? key.Compile()(page[^1]).ToString() : null);
    }

    private static string Text(long value) => value.ToString(System.Globalization.CultureInfo.InvariantCulture);
}
