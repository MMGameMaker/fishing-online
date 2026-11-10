using FishingOnline.Domain.Config;

namespace FishingOnline.Domain.Rules;

/// <summary>
/// Chọn loài theo SPEC 2.8: random rarity theo basis point rồi chọn đều trong rarity.
/// <see cref="PickAvailable"/> thêm luật cạn cá của BE-E-08 (user duyệt 2026-11-10).
/// </summary>
public static class SpawnPicker
{
    private const string LinearBasisPoints = "linear_basis_points";
    private static readonly Rarity[] Rarities = Enum.GetValues<Rarity>();

    public static string Pick(IRandomSource random, GameplayConfig config, int rareLuck) =>
        PickAvailable(random, config, rareLuck, _ => true)
        ?? throw new InvalidOperationException("Config has no species.");

    /// <summary>
    /// Tỷ lệ rarity giữ nguyên, không chuẩn hóa lại. Loài hết thì chọn đều trong các loài cùng rarity còn cá;
    /// cả rarity hết thì hạ dần xuống rarity thấp hơn; không còn rarity thấp hơn thì lên rarity gần nhất còn cá.
    /// Cả hồ hết cá trả null: cá không cắn.
    /// </summary>
    public static string? PickAvailable(IRandomSource random, GameplayConfig config, int rareLuck, Func<string, bool> hasFish)
    {
        var picked = Array.IndexOf(Rarities, PickRarity(random, config, rareLuck));
        var order = Enumerable.Range(0, picked + 1).Reverse().Concat(Enumerable.Range(picked + 1, Rarities.Length - picked - 1));
        foreach (var index in order)
        {
            var species = config.Fish.Where(fish => fish.Rarity == Rarities[index] && hasFish(fish.SpeciesId)).ToArray();
            if (species.Length > 0) return species[random.NextInt(0, species.Length - 1)].SpeciesId;
        }
        return null;
    }

    public static Rarity PickRarity(IRandomSource random, GameplayConfig config, int rareLuck)
    {
        var spawn = config.Spawn;
        if (spawn.RareLuckMode != LinearBasisPoints)
            throw new NotSupportedException($"Unsupported rare luck mode '{spawn.RareLuckMode}'.");

        var luck = Math.Clamp(rareLuck, 0, spawn.MaxRareLuck);
        var weights = Rarities
            .Select(rarity => spawn.RarityBaseBp.For(rarity) + spawn.RarityDeltaBpPerLuck.For(rarity) * luck)
            .ToArray();
        return Rarities[BasisPoints.PickIndex(random, weights)];
    }
}
