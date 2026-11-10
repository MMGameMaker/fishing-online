using System.Text.Json;
using FishingOnline.Domain.Attempts;
using FishingOnline.Domain.Rules;

namespace FishingOnline.Domain.Tests;

public class FishingAttemptTests
{
    private const int WaitMs = 4000;
    private const int BiteWindowMs = 3000;
    private const int BiteGraceMs = 300;
    private const string Species = "perch";

    private static readonly DateTimeOffset T0 = new(2026, 11, 9, 10, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset BiteAt = T0.AddMilliseconds(WaitMs);
    private static readonly DateTimeOffset BiteLimit = BiteAt.AddMilliseconds(BiteWindowMs + BiteGraceMs);
    private static readonly DateTimeOffset HookAt = BiteAt.AddMilliseconds(500);
    private static readonly DateTimeOffset ResultDeadline = HookAt.AddMilliseconds(12000 + 1500);

    private static readonly Stats PlayerStats = new(11, 0, 0, RareLuck: 3, LargeLuck: 2);

    /// <summary>Đủ số cho seed và một lần random chiều dài.</summary>
    private static ScriptedRandomSource Script() => new([0x1234, 0x5678, 0], [0.5]);

    private static AttemptContext Context(IRandomSource random) =>
        new(TestData.Config, random, _ => Species);

    private static FishingAttempt Waiting() => FishingAttempt.Start(Context(Script()), PlayerStats, T0, WaitMs);

    private static FishingAttempt InBite()
    {
        var attempt = Waiting();
        attempt.Tick(BiteAt);
        return attempt;
    }

    private static FishingAttempt InMinigame()
    {
        var attempt = InBite();
        attempt.Hook(HookAt);
        return attempt;
    }

    private static FishingAttempt InPhase(FishingPhase phase) => phase switch
    {
        FishingPhase.Waiting => Waiting(),
        FishingPhase.Bite => InBite(),
        FishingPhase.Minigame => InMinigame(),
        _ => throw new ArgumentOutOfRangeException(nameof(phase)),
    };

    private static FishingAttempt Won()
    {
        var attempt = InMinigame();
        attempt.ReportOutcome(AttemptOutcome.Success, HookAt.AddSeconds(1));
        return attempt;
    }

    private static FishingAttempt Lost()
    {
        var attempt = InMinigame();
        attempt.ReportOutcome(AttemptOutcome.Failed, HookAt.AddSeconds(1));
        return attempt;
    }

    private static FishingAttempt TimedOut()
    {
        var attempt = InMinigame();
        attempt.Tick(ResultDeadline.AddMilliseconds(1));
        return attempt;
    }

    private static FishingAttempt MissedBite()
    {
        var attempt = InBite();
        attempt.Tick(BiteLimit.AddMilliseconds(1));
        return attempt;
    }

    private static FishingAttempt Cancelled()
    {
        var attempt = Waiting();
        attempt.Cancel(AttemptReasons.LeftSeat);
        return attempt;
    }

    public static TheoryData<string> Terminals => new("won", "lost", "timedOut", "missedBite", "cancelled");

    private static FishingAttempt Terminal(string name) => name switch
    {
        "won" => Won(),
        "lost" => Lost(),
        "timedOut" => TimedOut(),
        "missedBite" => MissedBite(),
        "cancelled" => Cancelled(),
        _ => throw new ArgumentOutOfRangeException(nameof(name)),
    };

    [Fact]
    public void Start_IsWaiting_UntilBiteAt()
    {
        var attempt = Waiting();

        var state = attempt.Snapshot();
        Assert.Equal(FishingPhase.Waiting, state.Phase);
        Assert.Equal(BiteAt, state.BiteAt);
        Assert.Null(state.SpeciesId);
    }

    [Fact]
    public void Tick_BeforeBiteAt_ChangesNothing()
    {
        var attempt = Waiting();
        var before = attempt.Snapshot();

        var step = attempt.Tick(BiteAt.AddMilliseconds(-1));

        Assert.Empty(step.Events);
        Assert.Equal(before, attempt.Snapshot());
    }

    [Fact]
    public void Tick_AtBiteAt_EntersBite_AndFixesSpecies()
    {
        var attempt = Waiting();

        var step = attempt.Tick(BiteAt);

        Assert.Equal([new PhaseChanged(FishingPhase.Bite, null)], step.Events);
        var state = attempt.Snapshot();
        Assert.Equal(Species, state.SpeciesId);
        Assert.Equal(BiteAt.AddMilliseconds(BiteWindowMs), state.BiteDeadlineAt);
    }

    [Fact]
    public void SpeciesPicker_ReceivesRareLuck_AndRunsOnce()
    {
        var calls = new List<int>();
        var context = new AttemptContext(TestData.Config, Script(), luck =>
        {
            calls.Add(luck);
            return Species;
        });
        var attempt = FishingAttempt.Start(context, PlayerStats, T0, WaitMs);

        attempt.Tick(BiteAt);
        attempt.Tick(BiteAt.AddMilliseconds(50));
        attempt.Hook(HookAt);

        Assert.Equal([PlayerStats.RareLuck], calls);
    }

    [Fact]
    public void DefaultContext_PicksSpeciesFromConfig()
    {
        var attempt = FishingAttempt.Start(
            AttemptContext.Create(TestData.Config, new SeededRandomSource(5)), PlayerStats, T0, WaitMs);

        attempt.Tick(BiteAt);

        Assert.Contains(TestData.Config.Fish, fish => fish.SpeciesId == attempt.Snapshot().SpeciesId);
    }

    [Fact]
    public void Tick_InBite_StaysUntilGraceEnds_ThenMissedBite()
    {
        var attempt = InBite();

        Assert.Empty(attempt.Tick(BiteLimit).Events);
        Assert.Equal(FishingPhase.Bite, attempt.Snapshot().Phase);

        var step = attempt.Tick(BiteLimit.AddMilliseconds(1));

        Assert.Equal([new PhaseChanged(FishingPhase.Failed, AttemptReasons.MissedBite)], step.Events);
    }

    [Fact]
    public void LateTick_DoesBothTransitions_SoCadenceDoesNotChangeTheResult()
    {
        var attempt = Waiting();

        var step = attempt.Tick(BiteLimit.AddSeconds(5));

        Assert.Equal(
            [new PhaseChanged(FishingPhase.Bite, null), new PhaseChanged(FishingPhase.Failed, AttemptReasons.MissedBite)],
            step.Events);
    }

    [Fact]
    public void Hook_BeforeBite_IsRejected_WithoutChange()
    {
        var attempt = Waiting();
        var before = attempt.Snapshot();

        var step = attempt.Hook(BiteAt.AddMilliseconds(-1));

        Assert.Equal(AttemptError.StateConflict, step.Error);
        Assert.Empty(step.Events);
        Assert.Equal(before, attempt.Snapshot());
    }

    [Fact]
    public void Hook_AtLastAllowedMoment_StartsMinigame()
    {
        var attempt = InBite();

        var step = attempt.Hook(BiteLimit);

        Assert.Null(step.Error);
        Assert.Equal([new PhaseChanged(FishingPhase.Minigame, null)], step.Events);
        var minigame = attempt.Snapshot().Minigame!;
        Assert.Equal(0x12345678u, minigame.Seed);
        Assert.Equal(BiteLimit, minigame.StartedAt);
        Assert.Equal(BiteLimit.AddMilliseconds(13500), minigame.DeadlineAt);
        Assert.Equal(PlayerStats.Strength, minigame.Atk);
    }

    [Fact]
    public void Hook_AfterGrace_FailsAsMissedBite()
    {
        var attempt = InBite();

        var step = attempt.Hook(BiteLimit.AddMilliseconds(1));

        Assert.Equal(AttemptError.BiteExpired, step.Error);
        Assert.Equal([new PhaseChanged(FishingPhase.Failed, AttemptReasons.MissedBite)], step.Events);
    }

    [Fact]
    public void Hook_WithoutPriorTick_StillSeesTheBite()
    {
        var attempt = Waiting();

        var step = attempt.Hook(HookAt);

        Assert.Null(step.Error);
        Assert.Equal(
            [new PhaseChanged(FishingPhase.Bite, null), new PhaseChanged(FishingPhase.Minigame, null)],
            step.Events);
    }

    [Fact]
    public void Hook_Twice_SecondIsRejected_AndSeedStays()
    {
        var attempt = InMinigame();
        var before = attempt.Snapshot();

        var step = attempt.Hook(HookAt.AddMilliseconds(10));

        Assert.Equal(AttemptError.StateConflict, step.Error);
        Assert.Empty(step.Events);
        Assert.Equal(before, attempt.Snapshot());
    }

    [Theory]
    [InlineData(FishingPhase.Waiting)]
    [InlineData(FishingPhase.Bite)]
    public void Report_BeforeHook_IsRejected_WithoutChange(FishingPhase phase)
    {
        var attempt = InPhase(phase);
        var before = attempt.Snapshot();
        var at = phase == FishingPhase.Waiting ? T0.AddMilliseconds(1) : BiteAt.AddMilliseconds(1);

        var step = attempt.ReportOutcome(AttemptOutcome.Success, at);

        Assert.Equal(AttemptError.StateConflict, step.Error);
        Assert.Empty(step.Events);
        Assert.Equal(before, attempt.Snapshot());
    }

    [Fact]
    public void Report_Success_RollsLengthFromLargeLuck_AndGrantsSpeciesExp()
    {
        var fish = TestData.Species(Species);
        var attempt = InMinigame();
        var expected = LengthRoller.Roll(
            new ScriptedRandomSource([0], [0.5]), TestData.Config.LengthTiers, fish, PlayerStats.LargeLuck).LengthTenthCm;

        var step = attempt.ReportOutcome(AttemptOutcome.Success, HookAt.AddSeconds(1));

        Assert.Null(step.Error);
        Assert.Equal(
            [new PhaseChanged(FishingPhase.Success, null), new Succeeded(Species, expected, fish.Exp)],
            step.Events);
        var state = attempt.Snapshot();
        Assert.Equal(expected, state.LengthTenthCm);
        Assert.Equal(fish.Exp, state.Exp);
    }

    [Fact]
    public void Report_Failed_EndsWithoutReward()
    {
        var attempt = InMinigame();

        var step = attempt.ReportOutcome(AttemptOutcome.Failed, HookAt.AddSeconds(1));

        Assert.Null(step.Error);
        Assert.Equal([new PhaseChanged(FishingPhase.Failed, AttemptReasons.Timeout)], step.Events);
        Assert.Null(attempt.Snapshot().LengthTenthCm);
    }

    [Fact]
    public void Report_RightAfterHook_IsAccepted()
    {
        var attempt = InMinigame();

        var step = attempt.ReportOutcome(AttemptOutcome.Success, HookAt);

        Assert.Null(step.Error);
        Assert.Equal(FishingPhase.Success, attempt.Snapshot().Phase);
    }

    [Fact]
    public void Report_AtDeadline_IsAccepted()
    {
        var attempt = InMinigame();

        var step = attempt.ReportOutcome(AttemptOutcome.Success, ResultDeadline);

        Assert.Null(step.Error);
        Assert.Equal(FishingPhase.Success, attempt.Snapshot().Phase);
    }

    [Fact]
    public void Report_Success_AfterDeadline_TimesOutWithoutReward()
    {
        var attempt = InMinigame();

        var step = attempt.ReportOutcome(AttemptOutcome.Success, ResultDeadline.AddMilliseconds(1));

        Assert.Equal(AttemptError.ResultExpired, step.Error);
        Assert.Equal([new PhaseChanged(FishingPhase.Failed, AttemptReasons.Timeout)], step.Events);
    }

    [Fact]
    public void Tick_InMinigame_TimesOutOnlyAfterDeadline()
    {
        var attempt = InMinigame();

        Assert.Empty(attempt.Tick(ResultDeadline).Events);

        var step = attempt.Tick(ResultDeadline.AddMilliseconds(1));

        Assert.Equal([new PhaseChanged(FishingPhase.Failed, AttemptReasons.Timeout)], step.Events);
    }

    [Fact]
    public void Report_SameSuccessAgain_ReturnsNoEvents_AndKeepsTheRecordedCatch()
    {
        var attempt = Won();
        var before = attempt.Snapshot();

        var step = attempt.ReportOutcome(AttemptOutcome.Success, ResultDeadline.AddSeconds(30));

        Assert.Null(step.Error);
        Assert.Empty(step.Events);
        Assert.Equal(before, attempt.Snapshot());
    }

    [Theory]
    [InlineData("lost")]
    [InlineData("timedOut")]
    public void Report_SameFailedAgain_ReturnsNoEvents(string terminal)
    {
        var attempt = Terminal(terminal);

        var step = attempt.ReportOutcome(AttemptOutcome.Failed, ResultDeadline.AddSeconds(30));

        Assert.Null(step.Error);
        Assert.Empty(step.Events);
    }

    [Fact]
    public void Report_DifferentOutcomeAfterSuccess_IsConflict()
    {
        var attempt = Won();

        Assert.Equal(AttemptError.StateConflict, attempt.ReportOutcome(AttemptOutcome.Failed, HookAt.AddSeconds(2)).Error);
        Assert.Equal(FishingPhase.Success, attempt.Snapshot().Phase);
    }

    [Fact]
    public void Report_SuccessAfterReportedFailure_IsConflict()
    {
        var attempt = Lost();

        var step = attempt.ReportOutcome(AttemptOutcome.Success, HookAt.AddSeconds(2));

        Assert.Equal(AttemptError.StateConflict, step.Error);
        Assert.Equal(FishingPhase.Failed, attempt.Snapshot().Phase);
    }

    [Fact]
    public void Report_SuccessAfterTimeout_IsExpired()
    {
        var attempt = TimedOut();

        var step = attempt.ReportOutcome(AttemptOutcome.Success, ResultDeadline.AddMilliseconds(5));

        Assert.Equal(AttemptError.ResultExpired, step.Error);
        Assert.Empty(step.Events);
    }

    [Theory]
    [InlineData("missedBite")]
    [InlineData("cancelled")]
    public void Report_AfterMissedBiteOrCancel_IsConflict(string terminal)
    {
        var attempt = Terminal(terminal);

        foreach (var outcome in Enum.GetValues<AttemptOutcome>())
            Assert.Equal(AttemptError.StateConflict, attempt.ReportOutcome(outcome, BiteLimit.AddSeconds(1)).Error);
    }

    [Theory]
    [InlineData(FishingPhase.Waiting, AttemptReasons.TicketExpired)]
    [InlineData(FishingPhase.Bite, AttemptReasons.Disconnected)]
    [InlineData(FishingPhase.Minigame, AttemptReasons.LeftSeat)]
    public void Cancel_FromOpenPhase_EndsWithoutReward(FishingPhase phase, string reason)
    {
        var attempt = InPhase(phase);

        var step = attempt.Cancel(reason);

        Assert.Equal([new PhaseChanged(FishingPhase.Cancelled, reason)], step.Events);
        var state = attempt.Snapshot();
        Assert.Equal(FishingPhase.Cancelled, state.Phase);
        Assert.Equal(reason, state.Reason);
        Assert.Null(state.LengthTenthCm);
    }

    [Fact]
    public void Cancel_WithUnknownReason_Throws() =>
        Assert.Throws<ArgumentException>(() => Waiting().Cancel(AttemptReasons.Timeout));

    [Theory]
    [MemberData(nameof(Terminals))]
    public void Terminal_IgnoresCancelAndTick(string terminal)
    {
        var attempt = Terminal(terminal);
        var before = attempt.Snapshot();

        Assert.Empty(attempt.Cancel(AttemptReasons.Disconnected).Events);
        Assert.Empty(attempt.Tick(ResultDeadline.AddMinutes(5)).Events);

        Assert.Equal(before, attempt.Snapshot());
    }

    [Theory]
    [MemberData(nameof(Terminals))]
    public void Terminal_RejectsHook(string terminal)
    {
        var attempt = Terminal(terminal);
        var before = attempt.Snapshot();

        var step = attempt.Hook(ResultDeadline.AddMinutes(5));

        Assert.NotNull(step.Error);
        Assert.Empty(step.Events);
        Assert.Equal(before, attempt.Snapshot());
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(2)]
    public void Restore_ContinuesExactlyLikeTheOriginal(int snapshotAfterSteps)
    {
        var uninterrupted = FishingAttempt.Start(
            AttemptContext.Create(TestData.Config, new SeededRandomSource(42)), PlayerStats, T0, WaitMs);
        var expected = RunSteps(uninterrupted, 0, int.MaxValue).Skip(snapshotAfterSteps).ToArray();

        var random = new SeededRandomSource(42);
        var context = AttemptContext.Create(TestData.Config, random);
        var original = FishingAttempt.Start(context, PlayerStats, T0, WaitMs);
        _ = RunSteps(original, 0, snapshotAfterSteps).ToArray();

        var json = JsonSerializer.Serialize(original.Snapshot(), JsonSerializerOptions.Web);
        var restored = FishingAttempt.Restore(context, JsonSerializer.Deserialize<AttemptSnapshot>(json, JsonSerializerOptions.Web)!);
        var actual = RunSteps(restored, snapshotAfterSteps, int.MaxValue).ToArray();

        Assert.Equal(expected, actual);
        Assert.Equal(uninterrupted.Snapshot(), restored.Snapshot());
    }

    [Fact]
    public void Restore_WithAnotherConfigVersion_Throws()
    {
        var snapshot = Waiting().Snapshot() with { ConfigVersion = "other" };

        Assert.Throws<ArgumentException>(() => FishingAttempt.Restore(Context(Script()), snapshot));
    }

    /// <summary>Chạy các bước từ <paramref name="from"/> đến trước <paramref name="until"/>, trả sự kiện từng bước.</summary>
    private static IEnumerable<AttemptEvent> RunSteps(FishingAttempt attempt, int from, int until)
    {
        Func<AttemptStep>[] steps =
        [
            () => attempt.Tick(BiteAt),
            () => attempt.Hook(HookAt),
            () => attempt.ReportOutcome(AttemptOutcome.Success, HookAt.AddSeconds(1)),
        ];

        return steps
            .Skip(from)
            .Take(Math.Min(until, steps.Length) - from)
            .SelectMany(step => step().Events)
            .ToArray();
    }
}
