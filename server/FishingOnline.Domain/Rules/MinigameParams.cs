using FishingOnline.Domain.Config;

namespace FishingOnline.Domain.Rules;

/// <summary>
/// Thông số Server gửi Client lúc HookFish (SPEC 2.7). Client tự chạy minigame theo các số này;
/// Server không tính từng tap và không kiểm chứng thắng/thua.
/// </summary>
public sealed record MinigameParams(
    uint Seed,
    DateTimeOffset StartedAt,
    int DurationMs,
    int NeedlePassMs,
    double GreenWidth,
    double YellowWidth,
    double ShiftMin,
    double ShiftMax,
    int MissPenaltyMs,
    int FishHp,
    int Atk,
    DateTimeOffset DeadlineAt)
{
    /// <summary>
    /// Kích thước vùng = gốc × (1 + Hit Zone Increase / 100); vùng vàng không rộng hơn vùng xanh.
    /// Minigame bắt đầu sau <see cref="MinigameConfig.IntroMs"/> kể từ lúc thu cần, nên hạn cũng lùi theo.
    /// </summary>
    public static MinigameParams Create(
        MinigameConfig config, Fish fish, Stats stats, uint seed, DateTimeOffset hookedAt)
    {
        var startedAt = hookedAt.AddMilliseconds(config.IntroMs);
        var row = config.Rarity.Single(entry => entry.Rarity == fish.Rarity);
        var greenWidth = Math.Min(1, row.GreenBasePct / 100 * (1 + stats.NormalHitZonePct / 100d));
        var yellowWidth = Math.Min(greenWidth, row.YellowBasePct / 100 * (1 + stats.WeaknessHitZonePct / 100d));
        if (row.DurationMs <= 0 || greenWidth <= 0 || yellowWidth <= 0)
            throw new ArgumentException($"Invalid minigame config for rarity {fish.Rarity}.", nameof(config));

        return new MinigameParams(
            seed,
            startedAt,
            row.DurationMs,
            row.NeedlePassMs,
            greenWidth,
            yellowWidth,
            row.ShiftMin,
            row.ShiftMax,
            row.MissPenaltyMs,
            fish.Hp,
            stats.Strength,
            startedAt.AddMilliseconds(row.DurationMs + config.ResultGraceMs));
    }
}
