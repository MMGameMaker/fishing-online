using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace SocialKit.Community;

// Cộng đồng Facebook: Meta đã gỡ Groups API (22/4/2024) nên KHÔNG kiểm tra thành viên nhóm, đọc react hay bài trong nhóm qua API:
// "đã vào nhóm" là người chơi nhập mã công khai trong nhóm (ghim ở bài giới thiệu), "đã chia sẻ" là lượt bấm nút chia sẻ do Server đếm.
public sealed class CommunityService(
    DbContext db, IOptions<CommunityOptions> options, TimeProvider time, CodeAttemptLimiter limiter, ISocialAccountStats accountStats)
{
    private CommunityOptions Settings => options.Value;

    public async Task<CommunityView> GetAsync(Guid playerId, CancellationToken ct)
    {
        var state = await db.Set<CommunityState>().AsNoTracking().SingleOrDefaultAsync(row => row.PlayerId == playerId, ct);
        var avatar = await db.Set<PlayerAvatar>().AsNoTracking().Where(row => row.PlayerId == playerId)
            .Select(row => new { row.Provider, row.UpdatedAt }).SingleOrDefaultAsync(ct);
        var counts = await db.Set<ShareEvent>().AsNoTracking().Where(row => row.PlayerId == playerId)
            .GroupBy(row => row.Kind).Select(group => new { Kind = group.Key, Count = group.Count() }).ToListAsync(ct);
        return new CommunityView(
            avatar is null ? null : $"/api/v1/me/avatar?v={avatar.UpdatedAt.ToUnixTimeSeconds()}",
            avatar?.Provider,
            NullIfBlank(Settings.GroupUrl),
            NullIfBlank(Settings.ShareUrl),
            !string.IsNullOrWhiteSpace(Settings.GroupCode),
            state?.JoinClickedAt is not null,
            state?.GroupVerifiedAt is not null,
            new ShareCounts(
                counts.SingleOrDefault(row => row.Kind == ShareKinds.Feed)?.Count ?? 0,
                counts.SingleOrDefault(row => row.Kind == ShareKinds.Group)?.Count ?? 0));
    }

    /// <summary>Người chơi bấm nút "Vào nhóm": ghi nhận lần bấm (không có nghĩa đã vào nhóm).</summary>
    public async Task<CommunityView> JoinClickAsync(Guid playerId, CancellationToken ct)
    {
        var state = await StateAsync(playerId, ct);
        state.JoinClickedAt ??= time.GetUtcNow();
        state.JoinClicks += 1;
        await db.SaveChangesAsync(ct);
        return await GetAsync(playerId, ct);
    }

    /// <summary>Xác nhận đã vào nhóm bằng mã ghim trong nhóm (so sánh không phân biệt hoa thường, thời gian cố định).</summary>
    public async Task<CommunityView> VerifyGroupAsync(Guid playerId, string code, CancellationToken ct)
    {
        var expected = Settings.GroupCode?.Trim();
        if (string.IsNullOrEmpty(expected)) throw SocialException.Validation();
        if (!limiter.TryAcquire(playerId, time.GetUtcNow(), Settings.MaxCodeAttemptsPerHour)) throw SocialException.RateLimited();
        var given = (code ?? string.Empty).Trim();
        var same = given.Length == expected.Length
            && CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(given.ToUpperInvariant()), Encoding.UTF8.GetBytes(expected.ToUpperInvariant()));
        if (!same) throw SocialException.GroupCodeInvalid();

        var state = await StateAsync(playerId, ct);
        state.GroupVerifiedAt ??= time.GetUtcNow();
        await db.SaveChangesAsync(ct);
        return await GetAsync(playerId, ct);
    }

    /// <summary>Ghi một lượt bấm chia sẻ; quá hạn mức mỗi ngày thì không đếm thêm.</summary>
    public async Task<CommunityView> ShareAsync(Guid playerId, string kind, CancellationToken ct)
    {
        if (!ShareKinds.IsValid(kind)) throw SocialException.Validation();
        var now = time.GetUtcNow();
        var since = new DateTimeOffset(now.UtcDateTime.Date, TimeSpan.Zero);
        var today = await db.Set<ShareEvent>().CountAsync(row => row.PlayerId == playerId && row.CreatedAt >= since, ct);
        if (today < Settings.MaxSharesPerDay)
        {
            db.Add(new ShareEvent { PlayerId = playerId, Kind = kind, CreatedAt = now });
            await db.SaveChangesAsync(ct);
        }
        return await GetAsync(playerId, ct);
    }

    public async Task<(string ContentType, byte[] Data, DateTimeOffset UpdatedAt)?> AvatarAsync(Guid playerId, CancellationToken ct)
    {
        var row = await db.Set<PlayerAvatar>().AsNoTracking().SingleOrDefaultAsync(avatar => avatar.PlayerId == playerId, ct);
        return row is null ? null : (row.ContentType, row.Data, row.UpdatedAt);
    }

    /// <summary>Tổng hợp cho trang quản trị. Không có số react hay bài đã đăng vào nhóm vì Meta không cho đọc.</summary>
    public async Task<CommunityStats> StatsAsync(CancellationToken ct)
    {
        var now = time.GetUtcNow();
        var since = new DateTimeOffset(now.UtcDateTime.Date.AddDays(-6), TimeSpan.Zero);
        var shares = db.Set<ShareEvent>().AsNoTracking();
        var daily = await shares.Where(row => row.CreatedAt >= since)
            .GroupBy(row => new { row.CreatedAt.UtcDateTime.Date, row.Kind })
            .Select(group => new { group.Key.Date, group.Key.Kind, Count = group.Count() }).ToListAsync(ct);
        var days = Enumerable.Range(0, 7).Select(offset => since.UtcDateTime.Date.AddDays(offset)).Select(day => new DailyShares(
            day.ToString("yyyy-MM-dd"),
            daily.Where(row => row.Date == day && row.Kind == ShareKinds.Feed).Sum(row => row.Count),
            daily.Where(row => row.Date == day && row.Kind == ShareKinds.Group).Sum(row => row.Count))).ToList();
        var state = db.Set<CommunityState>().AsNoTracking();
        var accounts = await accountStats.CountsAsync(ct);
        return new CommunityStats(
            accounts.Players,
            accounts.GoogleAccounts,
            accounts.FacebookAccounts,
            await db.Set<PlayerAvatar>().CountAsync(ct),
            await state.CountAsync(row => row.JoinClickedAt != null, ct),
            await state.CountAsync(row => row.GroupVerifiedAt != null, ct),
            new ShareCounts(await shares.CountAsync(row => row.Kind == ShareKinds.Feed, ct), await shares.CountAsync(row => row.Kind == ShareKinds.Group, ct)),
            await shares.Select(row => row.PlayerId).Distinct().CountAsync(ct),
            days);
    }

    private async Task<CommunityState> StateAsync(Guid playerId, CancellationToken ct)
    {
        var state = await db.Set<CommunityState>().SingleOrDefaultAsync(row => row.PlayerId == playerId, ct);
        if (state is not null) return state;
        state = new CommunityState { PlayerId = playerId };
        db.Add(state);
        return state;
    }

    private static string? NullIfBlank(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

/// <summary>Giới hạn số lần nhập mã sai theo người chơi (trong bộ nhớ, đủ chặn dò mã).</summary>
public sealed class CodeAttemptLimiter
{
    private readonly Dictionary<Guid, Queue<DateTimeOffset>> attempts = [];
    private readonly object gate = new();

    public bool TryAcquire(Guid playerId, DateTimeOffset now, int maxPerHour)
    {
        lock (gate)
        {
            if (!attempts.TryGetValue(playerId, out var queue)) attempts[playerId] = queue = new Queue<DateTimeOffset>();
            while (queue.Count > 0 && now - queue.Peek() > TimeSpan.FromHours(1)) queue.Dequeue();
            if (queue.Count >= maxPerHour) return false;
            queue.Enqueue(now);
            return true;
        }
    }
}
