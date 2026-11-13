using System.Reflection;
using System.Text.Json;
using FishingOnline.Domain.Attempts;
using FishingOnline.Domain.Config;
using FishingOnline.Domain.Rules;

namespace FishingOnline.Domain.Tests;

public class MinigameParamsTests
{
    private static readonly DateTimeOffset StartedAt = new(2026, 11, 9, 10, 1, 10, TimeSpan.Zero);

    private static Stats StatsFor(int level, string rodId) =>
        new StatCalculator(TestData.Config).Compute(TestData.Level(level), TestData.Rod(rodId));

    [Theory]
    [InlineData("perch", 0.2, 0.06)]
    [InlineData("trout", 0.16, 0.05)]
    [InlineData("goldcarp", 0.13, 0.045)]
    [InlineData("koi", 0.11, 0.04)]
    [InlineData("moonfin", 0.09, 0.04)]
    public void Level1_UsesBaseValuesOfTheRarity(string speciesId, double green, double yellow)
    {
        var fish = TestData.Species(speciesId);
        var row = TestData.Config.Minigame.Rarity.Single(entry => entry.Rarity == fish.Rarity);

        var minigame = MinigameParams.Create(
            TestData.Config.Minigame, fish, StatsFor(1, "rod_old"), seed: 7, StartedAt);

        Assert.Equal(green, minigame.GreenWidth, 1e-12);
        Assert.Equal(yellow, minigame.YellowWidth, 1e-12);
        Assert.Equal(row.DurationMs, minigame.DurationMs);
        Assert.Equal(row.NeedlePassMs, minigame.NeedlePassMs);
        Assert.Equal(row.MissPenaltyMs, minigame.MissPenaltyMs);
        Assert.Equal(row.ShiftMin, minigame.ShiftMin);
        Assert.Equal(row.ShiftMax, minigame.ShiftMax);
        Assert.Equal(fish.Hp, minigame.FishHp);
        Assert.Equal(11, minigame.Atk);
        Assert.Equal(7u, minigame.Seed);
    }

    [Fact]
    public void HitZoneIncrease_WidensZones_AndAtkIsStrength()
    {
        var minigame = MinigameParams.Create(
            TestData.Config.Minigame, TestData.Species("goldcarp"), StatsFor(10, "rod_giant_caster"), 1, StartedAt);

        Assert.Equal(0.13 * 1.35, minigame.GreenWidth, 1e-12);
        Assert.Equal(0.045 * 1.30, minigame.YellowWidth, 1e-12);
        Assert.Equal(33, minigame.Atk);
    }

    [Fact]
    public void StartsAfterIntro_DeadlineIsDurationPlusResultGrace()
    {
        var hookedAt = StartedAt;
        var minigame = MinigameParams.Create(
            TestData.Config.Minigame, TestData.Species("perch"), StatsFor(1, "rod_old"), 1, hookedAt);

        Assert.Equal(750, TestData.Config.Minigame.IntroMs);
        Assert.Equal(hookedAt.AddMilliseconds(750), minigame.StartedAt);
        Assert.Equal(hookedAt.AddMilliseconds(750 + 12000 + 1500), minigame.DeadlineAt);
    }

    [Fact]
    public void EveryCombination_HasPositiveDuration_AndZonesInsideTheBar()
    {
        foreach (var fish in TestData.Config.Fish)
        foreach (var level in TestData.Config.Levels)
        foreach (var rod in TestData.Config.Rods)
        {
            var stats = new StatCalculator(TestData.Config).Compute(level, rod);
            var minigame = MinigameParams.Create(TestData.Config.Minigame, fish, stats, 1, StartedAt);

            Assert.True(minigame.DurationMs > 0);
            Assert.InRange(minigame.GreenWidth, double.Epsilon, 1);
            Assert.InRange(minigame.YellowWidth, double.Epsilon, minigame.GreenWidth);
        }
    }

    [Fact]
    public void HugeIncrease_IsClampedToTheBar_AndYellowStaysInsideGreen()
    {
        var stats = new Stats(10, NormalHitZonePct: 1000, WeaknessHitZonePct: 5000, 0, 0);

        var minigame = MinigameParams.Create(TestData.Config.Minigame, TestData.Species("perch"), stats, 1, StartedAt);

        Assert.Equal(1, minigame.GreenWidth);
        Assert.Equal(1, minigame.YellowWidth);
    }

    [Fact]
    public void NonPositiveDuration_IsRejected()
    {
        var config = TestData.Config.Minigame with
        {
            Rarity = TestData.Config.Minigame.Rarity
                .Select(row => row with { DurationMs = 0 })
                .ToArray(),
        };

        Assert.Throws<ArgumentException>(() =>
            MinigameParams.Create(config, TestData.Species("perch"), StatsFor(1, "rod_old"), 1, StartedAt));
    }

    [Fact]
    public void Json_HasExactlyTheContractFields()
    {
        var minigame = MinigameParams.Create(
            TestData.Config.Minigame, TestData.Species("perch"), StatsFor(1, "rod_old"), uint.MaxValue, StartedAt);

        using var json = JsonDocument.Parse(JsonSerializer.Serialize(minigame, JsonSerializerOptions.Web));

        string[] expected =
        [
            "atk", "deadlineAt", "durationMs", "fishHp", "greenWidth", "missPenaltyMs",
            "needlePassMs", "rarity", "seed", "shiftMax", "shiftMin", "startedAt", "yellowWidth",
        ];
        Assert.Equal(expected, json.RootElement.EnumerateObject().Select(field => field.Name).Order(StringComparer.Ordinal));
        Assert.Equal(uint.MaxValue, json.RootElement.GetProperty("seed").GetUInt32());
        Assert.Equal("common", json.RootElement.GetProperty("rarity").GetString());
    }

    [Fact]
    public void ClientReport_CarriesOnlyTheOutcome()
    {
        var parameters = typeof(FishingAttempt).GetMethod(nameof(FishingAttempt.ReportOutcome))!.GetParameters();

        Assert.Equal([typeof(AttemptOutcome), typeof(DateTimeOffset)], parameters.Select(parameter => parameter.ParameterType));
    }

    [Fact]
    public void Domain_HasNoPerTapOrReplayLogic()
    {
        var names = typeof(FishingAttempt).Assembly.GetTypes()
            .SelectMany(type => type.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.Static)
                .Select(method => method.Name)
                .Append(type.Name));

        Assert.DoesNotContain(names, name =>
            name.Contains("Tap", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Replay", StringComparison.OrdinalIgnoreCase));
    }
}
