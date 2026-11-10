using FishingOnline.Domain.Config;
using FishingOnline.Domain.Rules;

namespace FishingOnline.Domain.Tests;

public sealed class SpawnPickerTests
{
    private const int Samples = 100_000;
    private const double RarityTolerancePct = 0.5;
    private const double SpeciesTolerancePct = 1.0;

    private static Dictionary<string, int> Sample(int rareLuck, int seed)
    {
        var random = new SeededRandomSource(seed);
        var counts = TestData.Config.Fish.ToDictionary(fish => fish.SpeciesId, _ => 0);
        for (var sample = 0; sample < Samples; sample++) counts[SpawnPicker.Pick(random, TestData.Config, rareLuck)]++;
        return counts;
    }

    private static double RarityPct(Dictionary<string, int> counts, Rarity rarity) =>
        100.0 * TestData.Config.Fish.Where(fish => fish.Rarity == rarity).Sum(fish => counts[fish.SpeciesId]) / Samples;

    [Theory]
    [InlineData(0, 60.5, 25, 10, 4, 0.5)]
    [InlineData(6, 49.1, 28, 14.8, 7, 1.1)]
    public void RarityRates_MatchSpec(int luck, double common, double uncommon, double rare, double epic, double legendary)
    {
        var counts = Sample(luck, seed: 11);

        Assert.Equal(common, RarityPct(counts, Rarity.Common), RarityTolerancePct);
        Assert.Equal(uncommon, RarityPct(counts, Rarity.Uncommon), RarityTolerancePct);
        Assert.Equal(rare, RarityPct(counts, Rarity.Rare), RarityTolerancePct);
        Assert.Equal(epic, RarityPct(counts, Rarity.Epic), RarityTolerancePct);
        Assert.Equal(legendary, RarityPct(counts, Rarity.Legendary), RarityTolerancePct);
    }

    [Fact]
    public void CommonSpecies_AreEquallyLikely()
    {
        var counts = Sample(rareLuck: 0, seed: 12);
        var common = TestData.Config.Fish.Where(fish => fish.Rarity == Rarity.Common).ToArray();
        var total = common.Sum(fish => counts[fish.SpeciesId]);

        Assert.Equal(3, common.Length);
        foreach (var fish in common)
            Assert.Equal(100.0 / 3, 100.0 * counts[fish.SpeciesId] / total, SpeciesTolerancePct);
    }

    [Theory]
    [InlineData(6049, "minnow")]
    [InlineData(6050, "trout")]
    [InlineData(8549, "trout")]
    [InlineData(8550, "goldcarp")]
    [InlineData(9549, "goldcarp")]
    [InlineData(9550, "koi")]
    [InlineData(9949, "koi")]
    [InlineData(9950, "moonfin")]
    [InlineData(9999, "moonfin")]
    public void RollBoundaries_AtZeroLuck(int roll, string speciesId)
    {
        var random = new ScriptedRandomSource([roll, 0]);

        Assert.Equal(speciesId, SpawnPicker.Pick(random, TestData.Config, 0));
        Assert.Equal((0, 9999), random.IntRequests[0]);
    }

    [Theory]
    [InlineData(9, 6)]
    [InlineData(-3, 0)]
    public void RareLuck_IsClamped(int given, int effective)
    {
        var clamped = new SeededRandomSource(5);
        var exact = new SeededRandomSource(5);

        foreach (var _ in Enumerable.Range(0, 1000))
            Assert.Equal(SpawnPicker.Pick(exact, TestData.Config, effective), SpawnPicker.Pick(clamped, TestData.Config, given));
    }

    [Fact]
    public void OtherRareLuckMode_IsRejected()
    {
        var config = TestData.Config with { Spawn = TestData.Config.Spawn with { RareLuckMode = "none" } };

        Assert.Throws<NotSupportedException>(() => SpawnPicker.Pick(new SeededRandomSource(1), config, 0));
    }

    [Fact]
    public void RarityWithoutSpecies_IsConfigError()
    {
        var config = TestData.Config with { Fish = TestData.Config.Fish.Where(fish => fish.Rarity != Rarity.Common).ToArray() };

        Assert.Throws<InvalidOperationException>(() => SpawnPicker.Pick(new ScriptedRandomSource([0]), config, 0));
    }

    [Fact]
    public void WeightsNotSummingToFullRange_AreConfigError()
    {
        var spawn = TestData.Config.Spawn;
        var config = TestData.Config with { Spawn = spawn with { RarityBaseBp = spawn.RarityBaseBp with { Common = 6000 } } };

        Assert.Throws<InvalidOperationException>(() => SpawnPicker.Pick(new ScriptedRandomSource([0]), config, 0));
    }
}

public sealed class LengthRollerTests
{
    private const int Samples = 100_000;
    private const double TolerancePct = 0.5;

    private static readonly LengthTierConfig Tiers = TestData.Config.LengthTiers;

    [Theory]
    [InlineData(0, 70, 25, 4.9, 0.1)]
    [InlineData(6, 58, 34, 7.9, 0.1)]
    public void TierRates_MatchSpec(int luck, double normal, double large, double huge, double max)
    {
        var random = new SeededRandomSource(21 + luck);
        var fish = TestData.Species("koi");
        var counts = Tiers.Tiers.ToDictionary(tier => tier.Id, _ => 0);

        for (var sample = 0; sample < Samples; sample++)
        {
            var (length, tierId) = LengthRoller.Roll(random, Tiers, fish, luck);
            Assert.InRange(length, fish.MinTenthCm, fish.MaxTenthCm);
            counts[tierId]++;
        }

        Assert.Equal(normal, 100.0 * counts["normal"] / Samples, TolerancePct);
        Assert.Equal(large, 100.0 * counts["large"] / Samples, TolerancePct);
        Assert.Equal(huge, 100.0 * counts["huge"] / Samples, TolerancePct);
        Assert.Equal(max, 100.0 * counts["max"] / Samples, TolerancePct);
    }

    [Theory]
    [InlineData("normal", 75, 165)]
    [InlineData("large", 165, 210)]
    [InlineData("huge", 210, 225)]
    [InlineData("max", 225, 225)]
    public void EachTier_StaysInsideItsPositionRange(string tierId, int min, int max)
    {
        var random = new SeededRandomSource(31);
        var fish = TestData.Species("minnow");

        for (var sample = 0; sample < Samples; sample++)
        {
            var (length, rolledTier) = LengthRoller.Roll(random, Tiers, fish, 6);
            if (rolledTier == tierId) Assert.InRange(length, min, max);
        }
    }

    [Theory]
    [InlineData(6999, "normal")]
    [InlineData(7000, "large")]
    [InlineData(9499, "large")]
    [InlineData(9500, "huge")]
    [InlineData(9989, "huge")]
    [InlineData(9990, "max")]
    public void RollBoundaries_AtZeroLuck(int roll, string tierId)
    {
        var random = new ScriptedRandomSource([roll], [0.5]);

        var (_, rolledTier) = LengthRoller.Roll(random, Tiers, TestData.Species("minnow"), 0);

        Assert.Equal(tierId, rolledTier);
        Assert.Equal((0, 9999), Assert.Single(random.IntRequests));
    }

    [Fact]
    public void MaxTier_GivesExactMaximum()
    {
        var fish = TestData.Species("moonfin");

        var (length, tierId) = LengthRoller.Roll(new ScriptedRandomSource([9999], [0.25]), Tiers, fish, 0);

        Assert.Equal("max", tierId);
        Assert.Equal(fish.MaxTenthCm, length);
    }

    [Fact]
    public void Minnow_AtHalfPosition_Is150() =>
        Assert.Equal(150, LengthRoller.LengthAt(TestData.Species("minnow"), 0.5));

    [Theory]
    [InlineData(2, 3, 3)]
    [InlineData(3, 4, 4)]
    public void LengthAt_RoundsHalfUp(int min, int max, int expected)
    {
        var fish = TestData.Species("minnow") with { MinTenthCm = min, MaxTenthCm = max };

        Assert.Equal(expected, LengthRoller.LengthAt(fish, 0.5));
    }

    [Theory]
    [InlineData(9, 6)]
    [InlineData(-3, 0)]
    public void LargeLuck_IsClamped(int given, int effective)
    {
        var fish = TestData.Species("koi");
        var clamped = new SeededRandomSource(5);
        var exact = new SeededRandomSource(5);

        foreach (var _ in Enumerable.Range(0, 1000))
            Assert.Equal(LengthRoller.Roll(exact, Tiers, fish, effective), LengthRoller.Roll(clamped, Tiers, fish, given));
    }
}
