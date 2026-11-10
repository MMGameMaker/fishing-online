using FishingOnline.Domain.Attempts;
using FishingOnline.Domain.Config;
using FishingOnline.Domain.Rules;

namespace FishingOnline.Domain.Tests;

public sealed class PopulationPickTests
{
    private static string RarityOf(string speciesId) => TestData.Species(speciesId).Rarity.ToString();

    [Fact]
    public void EmptySpecies_PicksAnotherOfSameRarity()
    {
        var random = new SeededRandomSource(1);
        for (var i = 0; i < 500; i++)
        {
            var picked = SpawnPicker.PickAvailable(random, TestData.Config, 0, species => species != "perch");
            Assert.NotEqual("perch", picked);
        }
    }

    [Fact]
    public void EmptyRarity_FallsToLowerRarity()
    {
        // Chỉ còn common và rare: mọi lượt rơi vào uncommon phải ra common, không lên rare.
        bool Has(string species) => RarityOf(species) is nameof(Rarity.Common) or nameof(Rarity.Rare);
        var random = new SeededRandomSource(2);
        var picks = Enumerable.Range(0, 5000).Select(_ => SpawnPicker.PickAvailable(random, TestData.Config, 0, Has)!).ToArray();

        Assert.All(picks, species => Assert.True(Has(species)));
        var rareShare = picks.Count(species => RarityOf(species) == nameof(Rarity.Rare)) / (double)picks.Length;
        // Rare chỉ nhận đúng phần của rare (10%) cộng phần của epic/legendary rơi xuống (4,5%), không nhận phần uncommon.
        Assert.InRange(rareShare, 0.12, 0.17);
    }

    [Fact]
    public void NoLowerRarity_GoesToNearestHigher()
    {
        // Chỉ còn epic và legendary: lượt rơi vào common..rare lên epic, legendary vẫn chỉ theo tỷ lệ của nó.
        var random = new SeededRandomSource(3);
        var picks = Enumerable.Range(0, 4000)
            .Select(_ => SpawnPicker.PickAvailable(random, TestData.Config, 0, species => species is "koi" or "moonfin"))
            .ToArray();

        Assert.All(picks, species => Assert.Contains(species, new[] { "koi", "moonfin" }));
        Assert.InRange(picks.Count(species => species == "moonfin") / (double)picks.Length, 0.001, 0.02);
    }

    [Fact]
    public void LateFish_BiteWindowStartsWhenFishArrives()
    {
        string? species = null;
        var context = new AttemptContext(TestData.Config, new SeededRandomSource(6), _ => species);
        var start = DateTimeOffset.UnixEpoch;
        var attempt = FishingAttempt.Start(context, new Stats(11, 0, 0, 0, 0), start, 3000);
        attempt.Tick(start.AddSeconds(5));

        species = "carp";
        attempt.Tick(start.AddSeconds(20));

        var snapshot = attempt.Snapshot();
        Assert.Equal(FishingPhase.Bite, snapshot.Phase);
        Assert.Equal(start.AddSeconds(23), snapshot.BiteDeadlineAt);
        Assert.Null(attempt.Hook(start.AddSeconds(22)).Error);
    }

    [Fact]
    public void EmptyLake_ReturnsNull() =>
        Assert.Null(SpawnPicker.PickAvailable(new SeededRandomSource(4), TestData.Config, 0, _ => false));

    [Fact]
    public void NoSpecies_AttemptKeepsWaiting()
    {
        var context = new AttemptContext(TestData.Config, new SeededRandomSource(5), _ => null);
        var start = DateTimeOffset.UnixEpoch;
        var attempt = FishingAttempt.Start(context, new Stats(11, 0, 0, 0, 0), start, 3000);

        var step = attempt.Tick(start.AddSeconds(10));

        Assert.Empty(step.Events);
        Assert.Equal(FishingPhase.Waiting, attempt.Snapshot().Phase);
        Assert.Equal(AttemptError.StateConflict, attempt.Hook(start.AddSeconds(10)).Error);
    }
}
