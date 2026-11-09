using FishingOnline.Domain.Config;

namespace FishingOnline.Domain.Rules;

/// <summary>Random chiều dài theo SPEC 2.9, đơn vị 0,1 cm.</summary>
public static class LengthRoller
{
    public static (int LengthTenthCm, string TierId) Roll(
        IRandomSource random, LengthTierConfig config, Fish fish, int largeLuck)
    {
        var luck = Math.Clamp(largeLuck, 0, config.MaxLargeLuck);
        var weights = config.Tiers.Select(tier => tier.BaseBp + tier.PerLuckBp * luck).ToArray();
        var picked = config.Tiers[BasisPoints.PickIndex(random, weights)];
        var position = picked.PosMin + random.NextDouble() * (picked.PosMax - picked.PosMin);
        return (LengthAt(fish, position), picked.Id);
    }

    /// <summary><c>round(min + (max − min) × pos)</c>, làm tròn nửa lên.</summary>
    public static int LengthAt(Fish fish, double position) =>
        (int)Math.Floor(fish.MinTenthCm + (fish.MaxTenthCm - fish.MinTenthCm) * position + 0.5);
}
