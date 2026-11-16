using System.Globalization;
using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Modules.Config;
using FishingOnline.Api.Modules.Economy;
using FishingOnline.Api.Modules.Identity;
using FishingOnline.Api.Modules.Lake;
using FishingOnline.Api.Modules.Wallet;
using FishingOnline.Api.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FishingOnline.Api.Modules.Profile;

/// <summary>
/// Màn Tài khoản của Client (người dùng duyệt giao diện 2026-11-16): danh hiệu, lời nhắn, ô cá khoe và Thành tựu
/// theo doc/GAMEPLAY_SCOPE mục Thành tựu. Contract: docs/work/W02-art-map-ho.md (mục Popup Tài khoản).
/// </summary>
public static class ProfileRules
{
    public const int BioMaxLength = 100;
    public const int ShowcaseSlots = 3;
    public const int AchievementLevels = 5;
    public const long AchievementRewardGold = 100;

    /// <summary>Danh hiệu tạm, trùng bảng của Client (profileModel.ts). Mục đầu là mặc định.</summary>
    public static readonly IReadOnlyList<string> TitleIds = ["master", "rookie", "hunter", "lake_king", "sea_friend", "legend"];

    public static string DefaultTitleId => TitleIds[0];
}

public sealed record AchievementDefinition(string Id, string Name, IReadOnlyList<long> Thresholds);

public static class Achievements
{
    public const string Diligent = "diligent";
    public const string Collector = "collector";
    public const string RareHunter = "rare_hunter";
    public const string LegendLake = "legend_lake";
    public const string GiantFish = "giant_fish";
    public const string Pioneer = "pioneer";
    public const string Merchant = "merchant";
    public const string Persistent = "persistent";

    /// <summary>8 thành tựu × 5 mốc, GD chốt 2026-11-13 (số tạm để test).</summary>
    public static readonly IReadOnlyList<AchievementDefinition> All =
    [
        new(Diligent, "Cần thủ chăm chỉ", [10, 50, 200, 500, 1000]),
        new(Collector, "Nhà sưu tầm", [3, 6, 9, 12, 15]),
        new(RareHunter, "Săn cá hiếm", [5, 20, 50, 100, 150]),
        new(LegendLake, "Huyền thoại hồ câu", [1, 3, 5, 10, 15]),
        new(GiantFish, "Cá khủng", [1, 3, 5, 7, 10]),
        new(Pioneer, "Người tiên phong", [1, 3, 5, 7, 10]),
        new(Merchant, "Thương nhân", [500, 2000, 10000, 50000, 70000]),
        new(Persistent, "Người bền bỉ", [60, 360, 600, 3000, 5000]),
    ];
}

public sealed class AchievementClaimRow
{
    public Guid PlayerId { get; set; }
    public string AchievementId { get; set; } = string.Empty;
    public int Level { get; set; }
    public DateTimeOffset ClaimedAt { get; set; }
}

public sealed class ShowcaseSlotRow
{
    public Guid PlayerId { get; set; }
    public int Slot { get; set; }
    public string SpeciesId { get; set; } = string.Empty;
}

public sealed class AchievementClaimRowConfig : IEntityTypeConfiguration<AchievementClaimRow>
{
    public void Configure(EntityTypeBuilder<AchievementClaimRow> entity)
    {
        entity.ToTable("achievement_claims");
        // Khóa chính chặn nhận hai lần cùng một level kể cả hai request song song.
        entity.HasKey(row => new { row.PlayerId, row.AchievementId, row.Level });
        entity.Property(row => row.AchievementId).HasMaxLength(32);
    }
}

public sealed class ShowcaseSlotRowConfig : IEntityTypeConfiguration<ShowcaseSlotRow>
{
    public void Configure(EntityTypeBuilder<ShowcaseSlotRow> entity)
    {
        entity.ToTable("showcase_slots");
        entity.HasKey(row => new { row.PlayerId, row.Slot });
        entity.Property(row => row.SpeciesId).HasMaxLength(64);
        entity.HasIndex(row => new { row.PlayerId, row.SpeciesId }).IsUnique();
    }
}

public sealed record TitleRequest(string? TitleId);

public sealed record BioRequest(string? Bio);

public sealed record ShowcaseRequest(int Slot, string? SpeciesId);

public sealed record ShowcaseSlotView(int Slot, string? SpeciesId, int? LengthTenthCm);

public sealed record ShowcaseView(IReadOnlyList<ShowcaseSlotView> Slots);

public sealed record AchievementView(
    string Id, string Name, long Counter, IReadOnlyList<long> Thresholds, int ClaimedLevels, long RewardGold);

public sealed record AchievementsView(IReadOnlyList<AchievementView> Achievements);

public sealed record ClaimAchievementRequest(string? AchievementId) : IIdempotentBody;

public sealed record ClaimAchievementView(AchievementView Achievement, string GoldAdded, string Gold);

public sealed class ProfileService(GameDbContext db, IWallet wallet, IConfigProvider configs, TimeProvider time)
{
    public async Task<PlayerProfileView> SetTitleAsync(Guid playerId, string? titleId, AuthService auth, CancellationToken ct)
    {
        if (titleId is null || !ProfileRules.TitleIds.Contains(titleId)) throw new GameException(ErrorCatalog.ValidationFailed);
        await db.Players.Where(row => row.Id == playerId).ExecuteUpdateAsync(setters => setters.SetProperty(row => row.TitleId, titleId), ct);
        return await auth.GetProfileAsync(playerId, ct);
    }

    public async Task<PlayerProfileView> SetBioAsync(Guid playerId, string? bio, AuthService auth, CancellationToken ct)
    {
        var text = bio?.Trim() ?? string.Empty;
        if (text.EnumerateRunes().Count() > ProfileRules.BioMaxLength) throw new GameException(ErrorCatalog.ValidationFailed);
        await db.Players.Where(row => row.Id == playerId).ExecuteUpdateAsync(setters => setters.SetProperty(row => row.Bio, text), ct);
        return await auth.GetProfileAsync(playerId, ct);
    }

    // ---------- Ô cá khoe ----------

    public async Task<ShowcaseView> GetShowcaseAsync(Guid playerId, CancellationToken ct)
    {
        var slots = await db.Set<ShowcaseSlotRow>().AsNoTracking().Where(row => row.PlayerId == playerId).ToDictionaryAsync(row => row.Slot, ct);
        var best = await db.Set<SpeciesRecordRow>().AsNoTracking().Where(row => row.PlayerId == playerId)
            .ToDictionaryAsync(row => row.SpeciesId, row => row.BestLengthTenthCm, ct);
        return new ShowcaseView(Enumerable.Range(0, ProfileRules.ShowcaseSlots).Select(slot =>
            slots.TryGetValue(slot, out var row) && best.TryGetValue(row.SpeciesId, out var length)
                ? new ShowcaseSlotView(slot, row.SpeciesId, length)
                : new ShowcaseSlotView(slot, null, null)).ToArray());
    }

    /// <summary>Đặt loài đã mở khóa vào ô (hiện con dài nhất đã câu); <c>null</c> để gỡ. Một loài chỉ nằm ở một ô.</summary>
    public async Task<ShowcaseView> SetShowcaseAsync(Guid playerId, ShowcaseRequest request, CancellationToken ct)
    {
        if (request.Slot is < 0 or >= ProfileRules.ShowcaseSlots) throw new GameException(ErrorCatalog.ValidationFailed);
        if (request.SpeciesId is not null
            && !await db.Set<SpeciesRecordRow>().AsNoTracking().AnyAsync(row => row.PlayerId == playerId && row.SpeciesId == request.SpeciesId, ct))
            throw new GameException(ErrorCatalog.ValidationFailed);

        await using var owned = db.Database.CurrentTransaction is null ? await db.Database.BeginTransactionAsync(ct) : null;
        // Khóa player để hai lần đặt song song chạy lần lượt.
        await db.Database.ExecuteSqlInterpolatedAsync($"""select 1 from game.players where "Id" = {playerId} for update""", ct);
        await db.Set<ShowcaseSlotRow>().Where(row => row.PlayerId == playerId && (row.Slot == request.Slot
            || (request.SpeciesId != null && row.SpeciesId == request.SpeciesId))).ExecuteDeleteAsync(ct);
        if (request.SpeciesId is not null)
        {
            db.Add(new ShowcaseSlotRow { PlayerId = playerId, Slot = request.Slot, SpeciesId = request.SpeciesId });
            await db.SaveChangesAsync(ct);
        }
        if (owned is not null) await owned.CommitAsync(ct);
        return await GetShowcaseAsync(playerId, ct);
    }

    // ---------- Thành tựu ----------

    public async Task<AchievementsView> GetAchievementsAsync(Guid playerId, CancellationToken ct)
    {
        var counters = await CountersAsync(playerId, ct);
        var claimed = await ClaimedLevelsAsync(playerId, ct);
        return new AchievementsView(Achievements.All.Select(def => ViewOf(def, counters, claimed)).ToArray());
    }

    /// <summary>Nhận thưởng một level đã đạt mốc. Khóa chính của bảng claim chặn nhận trùng; ví được cộng cùng transaction.</summary>
    public async Task<ClaimAchievementView> ClaimAsync(Guid playerId, string? achievementId, CancellationToken ct)
    {
        var def = Achievements.All.SingleOrDefault(row => row.Id == achievementId) ?? throw new GameException(ErrorCatalog.ValidationFailed);

        await using var owned = db.Database.CurrentTransaction is null ? await db.Database.BeginTransactionAsync(ct) : null;
        await db.Database.ExecuteSqlInterpolatedAsync($"""select 1 from game.players where "Id" = {playerId} for update""", ct);

        var counters = await CountersAsync(playerId, ct);
        var claimed = await ClaimedLevelsAsync(playerId, ct);
        var done = claimed.GetValueOrDefault(def.Id);
        if (done >= ProfileRules.AchievementLevels || counters[def.Id] < def.Thresholds[done]) throw new GameException("STATE_CONFLICT");

        var level = done + 1;
        db.Add(new AchievementClaimRow { PlayerId = playerId, AchievementId = def.Id, Level = level, ClaimedAt = time.GetUtcNow() });
        await db.SaveChangesAsync(ct);
        var gold = await wallet.CreditAsync(
            playerId, ProfileRules.AchievementRewardGold, LedgerReasons.GrantAchievement, $"{def.Id}:{level}", ct);
        if (owned is not null) await owned.CommitAsync(ct);

        claimed[def.Id] = level;
        return new ClaimAchievementView(
            ViewOf(def, counters, claimed), Text(ProfileRules.AchievementRewardGold), Text(gold));
    }

    private static AchievementView ViewOf(AchievementDefinition def, Dictionary<string, long> counters, Dictionary<string, int> claimed) =>
        new(def.Id, def.Name, counters[def.Id], def.Thresholds, claimed.GetValueOrDefault(def.Id), ProfileRules.AchievementRewardGold);

    private async Task<Dictionary<string, int>> ClaimedLevelsAsync(Guid playerId, CancellationToken ct) =>
        await db.Set<AchievementClaimRow>().AsNoTracking().Where(row => row.PlayerId == playerId)
            .GroupBy(row => row.AchievementId)
            .Select(group => new { Id = group.Key, Levels = group.Count() })
            .ToDictionaryAsync(row => row.Id, row => row.Levels, ct);

    /// <summary>
    /// Số đếm suy ra từ dữ liệu đã có nên không thể lệch với lịch sử câu: cá (catches, tính cả đã bán), loài (species_records),
    /// Gold bán cá (ledger), thời gian ngồi (seat_sessions, tính cả Idle vì GD chưa chốt loại trừ).
    /// </summary>
    private async Task<Dictionary<string, long>> CountersAsync(Guid playerId, CancellationToken ct)
    {
        var catches = db.Set<CatchRow>().AsNoTracking().Where(row => row.PlayerId == playerId);
        var total = await catches.CountAsync(ct);
        var rare = await catches.CountAsync(row => row.Rarity == "rare" || row.Rarity == "epic" || row.Rarity == "legendary", ct);
        var legendary = await catches.CountAsync(row => row.Rarity == "legendary", ct);

        long giant = 0;
        foreach (var fish in configs.Current.Fish)
        {
            var max = fish.MaxTenthCm;
            giant += await catches.CountAsync(row => row.SpeciesId == fish.SpeciesId && row.LengthTenthCm >= max, ct);
        }

        var mine = await db.Set<SpeciesRecordRow>().AsNoTracking().Where(row => row.PlayerId == playerId)
            .Select(row => new { row.SpeciesId, row.FirstCaughtAt }).ToListAsync(ct);
        var firsts = await db.Set<SpeciesRecordRow>().AsNoTracking().GroupBy(row => row.SpeciesId)
            .Select(group => new { group.Key, First = group.Min(row => row.FirstCaughtAt) })
            .ToDictionaryAsync(row => row.Key, row => row.First, ct);
        var pioneer = mine.Count(row => firsts.TryGetValue(row.SpeciesId, out var first) && first == row.FirstCaughtAt);

        var sold = await db.Set<LedgerEntry>().AsNoTracking()
            .Where(row => row.PlayerId == playerId && row.Reason == LedgerReasons.SellFish)
            .SumAsync(row => (long?)row.Delta, ct) ?? 0;

        var now = time.GetUtcNow();
        var sessions = await db.Set<SeatSessionRow>().AsNoTracking().Where(row => row.PlayerId == playerId)
            .Select(row => new { row.StartedAt, row.EndedAt }).ToListAsync(ct);
        var minutes = (long)sessions.Sum(row => Math.Max(0, ((row.EndedAt ?? now) - row.StartedAt).TotalMinutes));

        return new Dictionary<string, long>
        {
            [Achievements.Diligent] = total,
            [Achievements.Collector] = mine.Count,
            [Achievements.RareHunter] = rare,
            [Achievements.LegendLake] = legendary,
            [Achievements.GiantFish] = giant,
            [Achievements.Pioneer] = pioneer,
            [Achievements.Merchant] = sold,
            [Achievements.Persistent] = minutes,
        };
    }

    private static string Text(long value) => value.ToString(CultureInfo.InvariantCulture);
}

public static class ProfileModule
{
    public static IServiceCollection AddProfile(this IServiceCollection services) => services.AddScoped<ProfileService>();

    public static WebApplication MapProfile(this WebApplication app)
    {
        var me = app.MapGroup("/api/v1/me").RequireAuthorization();
        me.MapPut("/title", async (TitleRequest request, ProfileService profile, AuthService auth, ICurrentPlayer player, CancellationToken ct) =>
            ApiResult.Ok(await profile.SetTitleAsync(player.PlayerId, request.TitleId, auth, ct)));
        me.MapPut("/bio", async (BioRequest request, ProfileService profile, AuthService auth, ICurrentPlayer player, CancellationToken ct) =>
            ApiResult.Ok(await profile.SetBioAsync(player.PlayerId, request.Bio, auth, ct)));
        me.MapGet("/showcase", async (ProfileService profile, ICurrentPlayer player, CancellationToken ct) =>
            ApiResult.Ok(await profile.GetShowcaseAsync(player.PlayerId, ct)));
        me.MapPut("/showcase", async (ShowcaseRequest request, ProfileService profile, ICurrentPlayer player, CancellationToken ct) =>
            ApiResult.Ok(await profile.SetShowcaseAsync(player.PlayerId, request, ct)));
        me.MapGet("/achievements", async (ProfileService profile, ICurrentPlayer player, CancellationToken ct) =>
            ApiResult.Ok(await profile.GetAchievementsAsync(player.PlayerId, ct)));
        me.MapPost("/achievements/claim", async (ClaimAchievementRequest request, ProfileService profile, ICurrentPlayer player, CancellationToken ct) =>
            ApiResult.Ok(await profile.ClaimAsync(player.PlayerId, request.AchievementId, ct))).Idempotent("achievement.claim");
        return app;
    }
}
