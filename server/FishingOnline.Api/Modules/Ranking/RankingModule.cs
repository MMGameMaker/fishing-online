using System.Globalization;
using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Modules.Config;
using FishingOnline.Api.Modules.Economy;
using FishingOnline.Api.Modules.Identity;
using FishingOnline.Api.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FishingOnline.Api.Modules.Ranking;

/// <summary>
/// Một dòng bảng xếp hạng. Reward là Gold (chuỗi, như mọi số tiền khác của API), chỉ để hiển thị.
/// Dòng <c>me</c>: Value là điểm hiện tại (cập nhật ngay); Rank/Reward lấy theo bản chụp thứ hạng 30 phút một lần,
/// nên người chưa vào bản chụp (hoặc ngoài top 50) có Rank/Reward null.
/// </summary>
public sealed record RankingEntryView(int? Rank, Guid PlayerId, string DisplayName, int? Value, string? Reward);

/// <param name="UpdatedAt">Thời điểm của bản chụp thứ hạng (làm mới 30 phút một lần).</param>
/// <param name="NextCursor">Cursor trang kế (null khi hết, tối đa 50 hạng).</param>
public sealed record RankingView(
    string BoardId, DateTimeOffset UpdatedAt, DateTimeOffset PeriodStartsAt, DateTimeOffset PeriodEndsAt,
    IReadOnlyList<RankingEntryView> Items, string? NextCursor, RankingEntryView Me);

/// <summary>
/// Bảng "tổng số cá câu được trong tuần" theo doc/GAMEPLAY_SCOPE.md mục Bảng xếp hạng (GD chốt 2026-11-14):
/// điểm = số cá câu thành công từ thứ Hai 00:00 giờ VN (mỗi attempt đúng một catch nhờ unique AttemptId nên gửi lặp
/// không cộng thêm); đồng hạng: ai đạt số đó trước (lần câu cuối sớm hơn) xếp trên; hiện top 50, phân trang;
/// thứ hạng làm mới 30 phút một lần, điểm của chính user cập nhật ngay. Đọc từ bảng catches (không migration).
/// Chưa làm: tự cộng thưởng lúc hết tuần (GD chưa xác nhận), Giải đấu cần thủ, loại trừ tài khoản nghi gian lận.
/// </summary>
public sealed class RankingService(GameDbContext db, TimeProvider time, IConfigProvider configs)
{
    public const string WeeklyCatchBoard = "total-catch-weekly";
    public const int DefaultLimit = 20;
    public const int MaxLimit = 50;
    public const int MaxRank = 50;
    public static readonly TimeSpan RefreshInterval = TimeSpan.FromMinutes(30);
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    /// <summary>Thưởng bảng tuần theo hạng (GD 2026-11-14): 1..5 = 400/300/250/200/150, 6–10 = 100, 11–20 = 75, 21–50 = 50.</summary>
    public static string? RewardOf(int rank) => rank switch
    {
        < 1 or > MaxRank => null,
        1 => "400",
        2 => "300",
        3 => "250",
        4 => "200",
        5 => "150",
        <= 10 => "100",
        <= 20 => "75",
        _ => "50",
    };

    /// <summary>Thứ Hai 00:00 giờ VN gần nhất không sau <paramref name="now"/>.</summary>
    public static DateTimeOffset WeekStart(DateTimeOffset now)
    {
        var local = now.ToOffset(VietnamOffset);
        var daysSinceMonday = ((int)local.DayOfWeek + 6) % 7;
        return new DateTimeOffset(local.Date.AddDays(-daysSinceMonday), VietnamOffset);
    }

    /// <summary>Mốc làm mới thứ hạng gần nhất (bội số của 30 phút), không trước đầu tuần.</summary>
    public static DateTimeOffset SnapshotAt(DateTimeOffset now, DateTimeOffset weekStart)
    {
        var ticks = now.UtcTicks - now.UtcTicks % RefreshInterval.Ticks;
        var slot = new DateTimeOffset(ticks, TimeSpan.Zero);
        return slot < weekStart ? weekStart : slot;
    }

    public async Task<RankingView> GetAsync(string boardId, Guid playerId, string? cursor, int? limit, CancellationToken ct)
    {
        if (boardId != WeeklyCatchBoard) throw new GameException(ErrorCatalog.ValidationFailed);
        var size = limit ?? DefaultLimit;
        if (size is < 1 or > MaxLimit) throw new GameException(ErrorCatalog.ValidationFailed);
        var skip = 0;
        if (cursor is not null && (!int.TryParse(cursor, NumberStyles.None, CultureInfo.InvariantCulture, out skip) || skip >= MaxRank))
            throw new GameException(ErrorCatalog.ValidationFailed);

        var now = time.GetUtcNow();
        // Npgsql chỉ nhận DateTimeOffset có offset 0 cho timestamptz.
        var start = WeekStart(now).ToUniversalTime();
        var end = start.AddDays(7);
        var snapshotAt = SnapshotAt(now, start);

        var weekly = db.Set<CatchRow>().AsNoTracking().Where(row => row.CaughtAt >= start && row.CaughtAt < end);
        var snapshot = weekly.Where(row => row.CaughtAt < snapshotAt).GroupBy(row => row.PlayerId)
            .Select(group => new { PlayerId = group.Key, Count = group.Count(), Last = group.Max(row => row.CaughtAt) });

        var take = Math.Min(size, MaxRank - skip);
        var page = await snapshot.OrderByDescending(row => row.Count).ThenBy(row => row.Last).ThenBy(row => row.PlayerId)
            .Skip(skip).Take(take).ToListAsync(ct);
        var next = page.Count == take && skip + take < MaxRank ? (skip + take).ToString(CultureInfo.InvariantCulture) : null;

        var live = await weekly.CountAsync(row => row.PlayerId == playerId, ct);
        var mineAtSnapshot = await snapshot.Where(row => row.PlayerId == playerId).SingleOrDefaultAsync(ct);
        int? myRank = null;
        if (mineAtSnapshot is not null)
        {
            var ahead = await snapshot.CountAsync(row =>
                row.Count > mineAtSnapshot.Count || (row.Count == mineAtSnapshot.Count && row.Last < mineAtSnapshot.Last), ct);
            myRank = ahead + 1 <= MaxRank ? ahead + 1 : null;
        }

        var ids = page.Select(row => row.PlayerId).Append(playerId).Distinct().ToArray();
        var names = await db.Players.AsNoTracking().Where(player => ids.Contains(player.Id))
            .ToDictionaryAsync(player => player.Id, player => player.DisplayName, ct);

        var items = page.Select((row, index) =>
            new RankingEntryView(skip + index + 1, row.PlayerId, names.GetValueOrDefault(row.PlayerId, string.Empty), row.Count, RewardOf(skip + index + 1))).ToArray();
        var me = new RankingEntryView(myRank, playerId, names.GetValueOrDefault(playerId, string.Empty),
            live > 0 ? live : null, myRank is { } rank ? RewardOf(rank) : null);
        return new RankingView(boardId, snapshotAt, start, end, items, next, me);
    }

    public const string DailyLength = "length";
    public const string DailyEarliest = "earliest";
    public const int DailyTop = 10;

    /// <summary>0h giờ VN của ngày chứa <paramref name="now"/>.</summary>
    public static DateTimeOffset DayStart(DateTimeOffset now) => new(now.ToOffset(VietnamOffset).Date, VietnamOffset);

    /// <summary>
    /// BXH cá riêng theo ngày (người dùng chốt 2026-11-18): mỗi loài hai bảng top 10 người chơi thật (không tính bot).
    /// <c>length</c>: con dài nhất trong ngày, bằng nhau thì ai câu sớm hơn xếp trên. <c>earliest</c>: ai câu được loài này
    /// sớm nhất trong ngày theo giờ thật (6h00 xếp trên 7h00). Mỗi người một dòng (con tốt nhất của họ), tính theo người câu
    /// kể cả khi cá đã bán hoặc đổi tay. Ngày tính từ 0h giờ VN, tính trực tiếp từ bảng catches, chưa có thưởng.
    /// </summary>
    public async Task<DailyFishRankingView> DailyFishAsync(string speciesId, string metric, Guid playerId, CancellationToken ct)
    {
        if (metric is not (DailyLength or DailyEarliest) || configs.Current.Fish.All(fish => fish.SpeciesId != speciesId))
            throw new GameException(ErrorCatalog.ValidationFailed);

        var start = DayStart(time.GetUtcNow()).ToUniversalTime();
        var end = start.AddDays(1);
        var rows = await db.Set<CatchRow>().AsNoTracking()
            .Where(row => row.SpeciesId == speciesId && !row.IsBot && row.CaughtAt >= start && row.CaughtAt < end)
            .Select(row => new { row.PlayerId, row.LengthTenthCm, row.CaughtAt }).ToListAsync(ct);

        var ordered = (metric == DailyLength
            ? rows.OrderByDescending(row => row.LengthTenthCm).ThenBy(row => row.CaughtAt)
            : rows.OrderBy(row => row.CaughtAt).ThenByDescending(row => row.LengthTenthCm))
            .ThenBy(row => row.PlayerId);
        // Mỗi người chỉ giữ con đứng trên nhất của họ.
        var best = ordered.DistinctBy(row => row.PlayerId).ToList();

        var top = best.Take(DailyTop).ToList();
        var mine = best.FindIndex(row => row.PlayerId == playerId);
        var ids = top.Select(row => row.PlayerId).Append(playerId).Distinct().ToArray();
        var names = await db.Players.AsNoTracking().Where(player => ids.Contains(player.Id))
            .ToDictionaryAsync(player => player.Id, player => player.DisplayName, ct);

        var items = top.Select((row, index) => new DailyFishEntryView(
            index + 1, row.PlayerId, names.GetValueOrDefault(row.PlayerId, string.Empty), row.LengthTenthCm, row.CaughtAt)).ToArray();
        var me = mine < 0 ? null : new DailyFishEntryView(
            mine < DailyTop ? mine + 1 : null, playerId, names.GetValueOrDefault(playerId, string.Empty), best[mine].LengthTenthCm, best[mine].CaughtAt);
        return new DailyFishRankingView(speciesId, metric, start, end, items, me);
    }
}

/// <summary>Một dòng BXH cá ngày: con tốt nhất của người đó trong ngày theo tiêu chí của bảng.</summary>
public sealed record DailyFishEntryView(int? Rank, Guid PlayerId, string DisplayName, int LengthTenthCm, DateTimeOffset CaughtAt);

/// <param name="Metric"><c>length</c> (dài nhất) hoặc <c>earliest</c> (câu sớm nhất trong ngày).</param>
/// <param name="Me">Con tốt nhất của mình trong ngày cho loài này; Rank null khi ngoài top 10 hoặc chưa câu.</param>
public sealed record DailyFishRankingView(
    string SpeciesId, string Metric, DateTimeOffset PeriodStartsAt, DateTimeOffset PeriodEndsAt,
    IReadOnlyList<DailyFishEntryView> Items, DailyFishEntryView? Me);

public static class RankingModule
{
    public static IServiceCollection AddRanking(this IServiceCollection services) => services.AddScoped<RankingService>();

    public static WebApplication MapRanking(this WebApplication app)
    {
        app.MapGroup("/api/v1/rankings").RequireAuthorization()
            .MapGet("/{boardId}", async (string boardId, string? cursor, int? limit, RankingService ranking, ICurrentPlayer player, CancellationToken ct) =>
                ApiResult.Ok(await ranking.GetAsync(boardId, player.PlayerId, cursor, limit, ct)));
        app.MapGet("/api/v1/rankings/daily-fish/{speciesId}", async (string speciesId, string? metric, RankingService ranking, ICurrentPlayer player, CancellationToken ct) =>
            ApiResult.Ok(await ranking.DailyFishAsync(speciesId, metric ?? RankingService.DailyLength, player.PlayerId, ct))).RequireAuthorization();
        return app;
    }
}
