using FishingOnline.Domain.Rules;

namespace FishingOnline.Domain.Tests;

public sealed class LevelTableTests
{
    private readonly LevelTable table = new(TestData.Config.Levels);

    [Theory]
    [InlineData(0, 1)]
    [InlineData(39, 1)]
    [InlineData(40, 2)]
    [InlineData(109, 2)]
    [InlineData(110, 3)]
    [InlineData(1849, 9)]
    [InlineData(1850, 10)]
    [InlineData(99999, 10)]
    public void LevelForExp_UsesCumulativeRequirement(int exp, int level) =>
        Assert.Equal(level, table.LevelForExp(exp));

    [Theory]
    [InlineData(0, 40)]
    [InlineData(5, 35)]
    [InlineData(39, 1)]
    [InlineData(40, 70)]
    [InlineData(1849, 1)]
    [InlineData(1850, 0)]
    [InlineData(99999, 0)]
    public void ExpToNext_ReturnsRemainingExp(int exp, int remaining) =>
        Assert.Equal(remaining, table.ExpToNext(exp));

    [Fact]
    public void NegativeExp_IsRejected() =>
        Assert.Throws<ArgumentOutOfRangeException>(() => table.LevelForExp(-1));

    [Fact]
    public void LevelTable_DoesNotDependOnConfigOrder()
    {
        var reversed = new LevelTable(TestData.Config.Levels.Reverse().ToArray());

        Assert.Equal(3, reversed.LevelForExp(110));
    }
}

public sealed class StatCalculatorTests
{
    private readonly StatCalculator calculator = new(TestData.Config);

    [Fact]
    public void Level10_GiantCaster_ReachesTheLuckCapOfSix()
    {
        var stats = calculator.Compute(TestData.Level(10), TestData.Rod("rod_giant_caster"));

        Assert.Equal(new Stats(33, 35, 30, 6, 6), stats);
    }

    [Fact]
    public void NewPlayer_HasOnlyLevelAndRodStats()
    {
        var stats = calculator.Compute(TestData.Level(1), TestData.Rod("rod_old"));

        Assert.Equal(new Stats(11, 0, 0, 0, 0), stats);
    }

    [Fact]
    public void Luck_IsCappedByConfig()
    {
        var rod = TestData.Rod("rod_giant_caster") with { RareLuck = 9, LargeLuck = 9 };

        var stats = calculator.Compute(TestData.Level(10), rod);

        Assert.Equal(6, stats.RareLuck);
        Assert.Equal(6, stats.LargeLuck);
    }
}

public sealed class FishingRulesTests
{
    private const int Samples = 10_000;

    [Fact]
    public void WaitMs_StaysInTheConfiguredRange()
    {
        var random = new SeededRandomSource(3);

        for (var sample = 0; sample < Samples; sample++)
            Assert.InRange(FishingRules.WaitMs(random, TestData.Config.Fishing), 3000, 6000);
    }

    [Fact]
    public void WaitMs_RequestsConfiguredRange_WithoutSeatBuff()
    {
        var random = new ScriptedRandomSource([4000]);

        var wait = FishingRules.WaitMs(random, TestData.Config.Fishing);

        Assert.Equal(4000, wait);
        Assert.Equal((3000, 6000), Assert.Single(random.IntRequests));
    }
}
