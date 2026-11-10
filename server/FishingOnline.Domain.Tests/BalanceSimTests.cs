using System.Text.Json;
using FishingOnline.Domain.Attempts;
using FishingOnline.Domain.Config;
using FishingOnline.Domain.Rules;
using FishingOnline.Sim;

namespace FishingOnline.Domain.Tests;

public sealed class BalanceSimTests
{
    private const double Tolerance = 1e-9;

    private static readonly SimOptions Small = new(Sessions: 3, Trials: 20, Seed: 7, DurationUnits: [1]);

    private static MinigameParams ParamsFrom(JsonElement json) => new(
        json.GetProperty("seed").GetUInt32(),
        DateTimeOffset.UnixEpoch,
        json.GetProperty("durationMs").GetInt32(),
        json.GetProperty("needlePassMs").GetInt32(),
        json.GetProperty("greenWidth").GetDouble(),
        json.GetProperty("yellowWidth").GetDouble(),
        json.GetProperty("shiftMin").GetDouble(),
        json.GetProperty("shiftMax").GetDouble(),
        json.GetProperty("missPenaltyMs").GetInt32(),
        json.GetProperty("fishHp").GetInt32(),
        json.GetProperty("atk").GetInt32(),
        DateTimeOffset.UnixEpoch);

    [Fact]
    public void Model_MatchesEveryAcceptedTapInTheClientVectors()
    {
        using var vectors = JsonDocument.Parse(
            File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "fixtures", "client-minigame-vectors.v0.json")));

        var checkedTaps = 0;
        foreach (var vector in vectors.RootElement.GetProperty("cases").EnumerateArray())
        {
            var model = new ClientMinigameModel(ParamsFrom(vector.GetProperty("params")));
            var initial = vector.GetProperty("initial");
            Assert.Equal(initial.GetProperty("greenStart").GetDouble(), model.GreenStart, Tolerance);
            Assert.Equal(initial.GetProperty("yellowStart").GetDouble(), model.YellowStart, Tolerance);

            foreach (var tap in vector.GetProperty("taps").EnumerateArray())
            {
                if (!tap.GetProperty("accepted").GetBoolean()) continue;

                var kind = model.Strike(tap.GetProperty("tMs").GetDouble());
                Assert.Equal(tap.GetProperty("kind").GetString(), kind.ToString().ToLowerInvariant());
                Assert.Equal(tap.GetProperty("hp").GetInt32(), model.Hp);
                Assert.Equal(tap.GetProperty("remainingMs").GetDouble(), model.RemainingMs(tap.GetProperty("tMs").GetDouble()));
                Assert.Equal(tap.GetProperty("greenStart").GetDouble(), model.GreenStart, Tolerance);
                Assert.Equal(tap.GetProperty("yellowStart").GetDouble(), model.YellowStart, Tolerance);
                Assert.Equal(tap.GetProperty("won").GetBoolean(), model.Won);
                checkedTaps++;
            }
        }
        Assert.True(checkedTaps > 0);
    }

    [Theory]
    [InlineData(0.25, 900, 0, 225)]
    [InlineData(0.25, 900, 226, 1575)]
    [InlineData(0.25, 900, 1576, 2025)]
    public void NextCrossing_FindsTheNeedlePassAfterTheGivenTime(double position, int passMs, double after, double expected)
    {
        var crossing = PlayerModel.NextCrossing(position, passMs, after);

        Assert.Equal(expected, crossing, Tolerance);
        Assert.Equal(position, ClientMinigameModel.NeedlePosition(crossing, passMs), Tolerance);
    }

    [Fact]
    public void Report_IsReproducible_AndHasEverySection()
    {
        var first = new BalanceReport(TestData.Config, Small).Generate();
        var second = new BalanceReport(TestData.Config, Small).Generate();

        Assert.Equal(first, second);
        Assert.Contains(TestData.Config.ConfigVersion, first);
        foreach (var heading in new[]
                 {
                     "## Tỷ lệ thắng theo rarity × level × cần",
                     "## So sánh theo kỹ năng",
                     "## Số lần câu và Gold mỗi lượt vé",
                     "## Thời gian lên level cao nhất",
                 })
            Assert.Contains(heading, first);
    }

    [Fact]
    public void Report_ChangesWithTheSeed()
    {
        var first = new BalanceReport(TestData.Config, Small).Generate();
        var other = new BalanceReport(TestData.Config, Small with { Seed = 8 }).Generate();

        Assert.NotEqual(first, other);
    }

    [Fact]
    public void WinRate_RisesWithSkillAndEquipment_AndFallsWithRarity()
    {
        var report = new BalanceReport(TestData.Config, new SimOptions(1, 4000, 1, [1]));
        var low = TestData.Level(1);
        var high = TestData.Level(10);
        var starter = TestData.Rod("rod_old");
        var best = TestData.Rod("rod_giant_caster");
        double Rate(Rarity rarity, LevelConfig level, Rod rod, SkillProfile skill) =>
            report.WinRate(rarity, level, rod, skill, new SimRandom(5));

        Assert.True(Rate(Rarity.Rare, low, starter, PlayerModel.Expert) > Rate(Rarity.Rare, low, starter, PlayerModel.Beginner));
        Assert.True(Rate(Rarity.Rare, high, best, PlayerModel.Average) > Rate(Rarity.Rare, low, starter, PlayerModel.Average));
        Assert.True(Rate(Rarity.Common, low, starter, PlayerModel.Average) > Rate(Rarity.Legendary, low, starter, PlayerModel.Average));
    }

    [Fact]
    public void Attempt_StillRunningWhenTheSessionEnds_IsCancelledWithoutReward()
    {
        var simulator = new SessionSimulator(TestData.Config, PlayerModel.Default(PlayerModel.Expert), new SimRandom(3));
        var stats = new StatCalculator(TestData.Config).Compute(TestData.Level(1), TestData.Rod("rod_old"));

        var run = simulator.RunAttempt(stats, startMs: 0, sessionEndMs: 1000);

        Assert.Equal(FishingPhase.Cancelled, run.Phase);
        Assert.Null(run.Caught);
    }

    [Fact]
    public void Session_KeepsCatchesWithinAttempts_AndGoldMatchesCatches()
    {
        var simulator = new SessionSimulator(TestData.Config, PlayerModel.Default(PlayerModel.Average), new SimRandom(11));

        var run = simulator.RunSession(TestData.Level(5), TestData.Rod("rod_steel_awl"), durationUnits: 1);

        var cheapest = TestData.Config.Fish.Min(fish => fish.SellGold);
        var dearest = TestData.Config.Fish.Max(fish => fish.SellGold);
        Assert.InRange(run.Attempts, 1, 1000);
        Assert.InRange(run.Catches, 1, run.Attempts);
        Assert.InRange(run.GoldEarned, run.Catches * cheapest, run.Catches * dearest);
    }

    [Fact]
    public void Progression_StopsWhenTheFirstTicketIsNotAffordable()
    {
        var unaffordable = TestData.Config.NewPlayer.Gold + 1;
        var simulator = new SessionSimulator(TestData.Config, PlayerModel.Default(PlayerModel.Average), new SimRandom(2));

        var run = simulator.RunToMaxLevel(unaffordable, buyRods: false);

        Assert.False(run.ReachedMax);
        Assert.Equal(0, run.TicketsBought);
        Assert.Equal(0, run.Attempts);
    }

    [Fact]
    public void Progression_ReachesTheMaxLevelWithTheTestTicketPrice()
    {
        var simulator = new SessionSimulator(TestData.Config, PlayerModel.Default(PlayerModel.Expert), new SimRandom(4));

        var run = simulator.RunToMaxLevel(TestData.Config.TicketPricing.UnitPriceGold, buyRods: true);

        Assert.True(run.ReachedMax);
        Assert.True(run.PlayedMinutes > 0);
    }
}
