using FishingOnline.Domain.Config;

namespace FishingOnline.Domain.Rules;

/// <summary>
/// Chọn loài theo SPEC 2.8: random rarity theo basis point rồi chọn đều trong rarity.
/// Chưa xét tồn cá; phần chọn theo quần thể và fallback khi cạn thuộc BE-E-08.
/// </summary>
public static class SpawnPicker
{
    private const string LinearBasisPoints = "linear_basis_points";
    private static readonly Rarity[] Rarities = Enum.GetValues<Rarity>();

    public static string Pick(IRandomSource random, GameplayConfig config, int rareLuck)
    {
        var spawn = config.Spawn;
        if (spawn.RareLuckMode != LinearBasisPoints)
            throw new NotSupportedException($"Unsupported rare luck mode '{spawn.RareLuckMode}'.");

        var luck = Math.Clamp(rareLuck, 0, spawn.MaxRareLuck);
        var weights = Rarities
            .Select(rarity => spawn.RarityBaseBp.For(rarity) + spawn.RarityDeltaBpPerLuck.For(rarity) * luck)
            .ToArray();
        var picked = Rarities[BasisPoints.PickIndex(random, weights)];

        var species = config.Fish.Where(fish => fish.Rarity == picked).ToArray();
        if (species.Length == 0)
            throw new InvalidOperationException($"Config has no species for rarity {picked}.");
        return species[random.NextInt(0, species.Length - 1)].SpeciesId;
    }
}
