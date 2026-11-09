using FishingOnline.Domain;
using FishingOnline.Domain.Attempts;
using FishingOnline.Domain.Config;
using FishingOnline.Domain.Rules;

namespace FishingOnline.Sim;

public sealed class SimRandom(int seed) : IRandomSource
{
    private readonly Random random = new(seed);

    public double NextDouble() => random.NextDouble();

    public int NextInt(int minInclusive, int maxInclusive) => random.Next(minInclusive, maxInclusive + 1);

    public uint NextSeed() => (uint)random.NextInt64(0, 1L << 32);
}

public sealed record AttemptRun(FishingPhase Phase, long EndMs, Fish? Caught);

public sealed record SessionRun(int Attempts, int Catches, long GoldEarned);

public sealed record ProgressionRun(bool ReachedMax, double PlayedMinutes, int Attempts, int TicketsBought);

/// <summary>Chạy lần câu qua <see cref="FishingAttempt"/> thật; mốc 0 là lúc phiên ghế bắt đầu.</summary>
public sealed class SessionSimulator(GameplayConfig config, PlayerModel player, IRandomSource random)
{
    private static readonly DateTimeOffset Epoch = new(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);
    private const int MaxTicketsPerProgression = 5000;

    private readonly StatCalculator calculator = new(config);
    private readonly LevelTable levelTable = new(config.Levels);
    private readonly AttemptContext context = AttemptContext.Create(config, random);

    public AttemptRun RunAttempt(Stats stats, SeatTier seat, long startMs, long sessionEndMs)
    {
        var waitMs = FishingRules.WaitMs(random, config.Fishing, seat.LureTimeMs);
        var attempt = FishingAttempt.Start(context, stats, At(startMs), waitMs);

        var biteMs = startMs + waitMs;
        if (biteMs >= sessionEndMs) return Expire(attempt, sessionEndMs);
        attempt.Tick(At(biteMs));

        var hookMs = biteMs + random.NextInt(player.ReactionMinMs, player.ReactionMaxMs);
        if (hookMs >= sessionEndMs) return Expire(attempt, sessionEndMs);
        attempt.Hook(At(hookMs));

        var play = player.Play(attempt.Snapshot().Minigame!, random);
        var endMs = hookMs + play.ElapsedMs;
        if (endMs >= sessionEndMs) return Expire(attempt, sessionEndMs);

        var step = attempt.ReportOutcome(play.Won ? AttemptOutcome.Success : AttemptOutcome.Failed, At(endMs));
        var caught = step.Events.OfType<Succeeded>().SingleOrDefault();
        return new AttemptRun(
            attempt.Snapshot().Phase,
            endMs,
            caught is null ? null : config.Fish.Single(fish => fish.SpeciesId == caught.SpeciesId));
    }

    /// <summary>Một phiên ghế với chỉ số cố định, bán hết cá theo giá loài. Lần câu chưa xong khi hết phiên thì bị hủy.</summary>
    public SessionRun RunSession(LevelConfig level, Rod rod, SeatTier seat, int durationUnits)
    {
        var stats = calculator.Compute(level, rod, seat);
        var sessionEndMs = SessionMs(durationUnits);
        int attempts = 0, catches = 0;
        long gold = 0;
        for (var now = 0L; now < sessionEndMs;)
        {
            var run = RunAttempt(stats, seat, now, sessionEndMs);
            if (run.Phase == FishingPhase.Cancelled) break;
            attempts++;
            if (run.Caught is not null)
            {
                catches++;
                gold += run.Caught.SellGold;
            }
            now = NextCastAt(run);
        }
        return new SessionRun(attempts, catches, gold);
    }

    /// <summary>Từ người chơi mới tới level cao nhất, mua vé một block mỗi phiên và bán cá ngay khi bắt được.</summary>
    public ProgressionRun RunToMaxLevel(SeatTier seat, bool buyRods)
    {
        var maxLevel = config.Levels.Max(level => level.Level);
        var upgrades = new Queue<Rod>(config.Rods
            .Where(rod => !rod.IsDefault)
            .OrderBy(rod => rod.PriceGold)
            .DistinctBy(rod => rod.PriceGold));
        var rod = config.Rods.Single(entry => entry.RodId == config.NewPlayer.RodId);
        var sessionMs = SessionMs(durationUnits: 1);
        var gold = config.NewPlayer.Gold;
        var exp = 0;
        var attempts = 0;
        var playedMs = 0L;

        for (var tickets = 0; tickets < MaxTicketsPerProgression; tickets++)
        {
            if (gold < seat.UnitPriceGold)
                return new ProgressionRun(false, playedMs / 60000d, attempts, tickets);
            gold -= seat.UnitPriceGold;

            for (var now = 0L; now < sessionMs;)
            {
                var run = RunAttempt(Stats(exp, rod, seat), seat, now, sessionMs);
                if (run.Phase == FishingPhase.Cancelled) break;
                attempts++;
                if (run.Caught is not null)
                {
                    exp += run.Caught.Exp;
                    gold += run.Caught.SellGold;
                    if (levelTable.LevelForExp(exp) == maxLevel)
                        return new ProgressionRun(true, (playedMs + run.EndMs) / 60000d, attempts, tickets + 1);
                }
                now = NextCastAt(run);
            }
            playedMs += sessionMs;

            while (buyRods && upgrades.TryPeek(out var next) && gold >= next.PriceGold!.Value + seat.UnitPriceGold)
            {
                gold -= next.PriceGold.Value;
                rod = upgrades.Dequeue();
            }
        }
        return new ProgressionRun(false, playedMs / 60000d, attempts, MaxTicketsPerProgression);
    }

    private Stats Stats(int exp, Rod rod, SeatTier seat)
    {
        var level = levelTable.LevelForExp(exp);
        return calculator.Compute(config.Levels.Single(entry => entry.Level == level), rod, seat);
    }

    private long SessionMs(int durationUnits) => durationUnits * config.SeatPricing.BillingUnitMinutes * 60000L;

    private long NextCastAt(AttemptRun run) =>
        run.EndMs + (run.Caught is null ? player.FailHoldMs : config.Fishing.ResultPopupMs) + player.RecastMs;

    private static AttemptRun Expire(FishingAttempt attempt, long sessionEndMs)
    {
        attempt.Cancel(AttemptReasons.SessionExpired);
        return new AttemptRun(FishingPhase.Cancelled, sessionEndMs, Caught: null);
    }

    private static DateTimeOffset At(long ms) => Epoch.AddMilliseconds(ms);
}
