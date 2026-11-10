using FishingOnline.Domain.Config;

namespace FishingOnline.Domain.Rules;

public sealed record Stats(int Strength, int NormalHitZonePct, int WeaknessHitZonePct, int RareLuck, int LargeLuck);

/// <summary>Chỉ số tổng theo SPEC 2.4: level cộng cần; ghế không còn buff từ SPEC 0.9.</summary>
public sealed class StatCalculator(GameplayConfig config)
{
    public Stats Compute(LevelConfig level, Rod rod) => new(
        level.Strength + rod.Strength,
        level.NormalHitZonePct + rod.NormalHitZonePct,
        level.WeaknessHitZonePct + rod.WeaknessHitZonePct,
        Math.Min(config.Spawn.MaxRareLuck, level.RareLuck + rod.RareLuck),
        Math.Min(config.LengthTiers.MaxLargeLuck, level.LargeLuck + rod.LargeLuck));
}
