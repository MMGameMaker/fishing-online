using FishingOnline.Domain.Config;
using FishingOnline.Domain.Rules;

namespace FishingOnline.Domain.Attempts;

/// <summary>
/// Máy trạng thái một lần câu (SPEC 2.6, 2.7). Không có timer thật: thời điểm <c>now</c> do bên ngoài truyền vào.
/// Mọi lệnh đều cập nhật theo thời gian trước khi xử lý, nên kết quả không phụ thuộc nhịp gọi <see cref="Tick"/>.
/// </summary>
public sealed class FishingAttempt
{
    private static readonly string[] CancelReasons =
    [
        AttemptReasons.SessionExpired,
        AttemptReasons.Disconnected,
        AttemptReasons.LeftSeat,
    ];

    private readonly AttemptContext context;
    private AttemptSnapshot state;

    private FishingAttempt(AttemptContext context, AttemptSnapshot state)
    {
        this.context = context;
        this.state = state;
    }

    private GameplayConfig Config => context.Config;

    private bool IsTerminal => state.Phase is FishingPhase.Success or FishingPhase.Failed or FishingPhase.Cancelled;

    /// <summary>Stats chốt từ lúc quăng cần: rareLuck cần ở bước bite, và người chơi không đổi được cần khi đang câu.</summary>
    public static FishingAttempt Start(AttemptContext context, Stats stats, DateTimeOffset now, int waitMs) =>
        new(context, new AttemptSnapshot(
            context.Config.ConfigVersion,
            stats,
            FishingPhase.Waiting,
            Reason: null,
            BiteAt: now.AddMilliseconds(waitMs),
            BiteDeadlineAt: null,
            SpeciesId: null,
            Minigame: null,
            LengthTenthCm: null,
            Exp: null));

    public static FishingAttempt Restore(AttemptContext context, AttemptSnapshot snapshot)
    {
        if (snapshot.ConfigVersion != context.Config.ConfigVersion)
            throw new ArgumentException(
                $"Snapshot uses config '{snapshot.ConfigVersion}', not '{context.Config.ConfigVersion}'.",
                nameof(snapshot));
        return new FishingAttempt(context, snapshot);
    }

    public AttemptSnapshot Snapshot() => state;

    public AttemptStep Tick(DateTimeOffset now)
    {
        var events = new List<AttemptEvent>();
        Advance(now, events);
        return new AttemptStep(events, Error: null);
    }

    public AttemptStep Hook(DateTimeOffset now)
    {
        var events = new List<AttemptEvent>();
        Advance(now, events);

        if (state is { Phase: FishingPhase.Failed, Reason: AttemptReasons.MissedBite })
            return new AttemptStep(events, AttemptError.BiteExpired);
        if (state.Phase != FishingPhase.Bite)
            return new AttemptStep(events, AttemptError.StateConflict);

        var minigame = MinigameParams.Create(Config.Minigame, CurrentFish(), state.Stats, NextSeed(), now);
        state = state with { Phase = FishingPhase.Minigame, Minigame = minigame };
        events.Add(new PhaseChanged(FishingPhase.Minigame, Reason: null));
        return new AttemptStep(events, Error: null);
    }

    /// <summary>Nhận kết quả Client báo. Gửi lặp đúng kết quả đã ghi thì không có sự kiện và không lỗi.</summary>
    public AttemptStep ReportOutcome(AttemptOutcome outcome, DateTimeOffset now)
    {
        var events = new List<AttemptEvent>();
        Advance(now, events);

        if (state.Phase != FishingPhase.Minigame)
            return new AttemptStep(events, RejectionFor(outcome, now));

        if (outcome == AttemptOutcome.Success)
            Succeed(events);
        else
            Fail(AttemptReasons.Timeout, events);
        return new AttemptStep(events, Error: null);
    }

    public AttemptStep Cancel(string reason)
    {
        if (!CancelReasons.Contains(reason))
            throw new ArgumentException($"Unknown cancel reason '{reason}'.", nameof(reason));
        if (IsTerminal)
            return new AttemptStep([], Error: null);

        state = state with { Phase = FishingPhase.Cancelled, Reason = reason };
        return new AttemptStep([new PhaseChanged(FishingPhase.Cancelled, reason)], Error: null);
    }

    private void Advance(DateTimeOffset now, List<AttemptEvent> events)
    {
        if (state.Phase == FishingPhase.Waiting && now >= state.BiteAt)
            EnterBite(events);
        if (state.Phase == FishingPhase.Bite
            && now > state.BiteDeadlineAt!.Value.AddMilliseconds(Config.Fishing.BiteGraceMs))
            Fail(AttemptReasons.MissedBite, events);
        if (state.Phase == FishingPhase.Minigame && now > state.Minigame!.DeadlineAt)
            Fail(AttemptReasons.Timeout, events);
    }

    private void EnterBite(List<AttemptEvent> events)
    {
        state = state with
        {
            Phase = FishingPhase.Bite,
            BiteDeadlineAt = state.BiteAt.AddMilliseconds(Config.Fishing.BiteWindowMs),
            SpeciesId = context.PickSpecies(state.Stats.RareLuck),
        };
        events.Add(new PhaseChanged(FishingPhase.Bite, Reason: null));
    }

    private void Succeed(List<AttemptEvent> events)
    {
        var fish = CurrentFish();
        var (length, _) = LengthRoller.Roll(context.Random, Config.LengthTiers, fish, state.Stats.LargeLuck);
        state = state with { Phase = FishingPhase.Success, LengthTenthCm = length, Exp = fish.Exp };
        events.Add(new PhaseChanged(FishingPhase.Success, Reason: null));
        events.Add(new Succeeded(fish.SpeciesId, length, fish.Exp));
    }

    private void Fail(string reason, List<AttemptEvent> events)
    {
        state = state with { Phase = FishingPhase.Failed, Reason = reason };
        events.Add(new PhaseChanged(FishingPhase.Failed, reason));
    }

    private AttemptError? RejectionFor(AttemptOutcome outcome, DateTimeOffset now)
    {
        if (state.Phase == FishingPhase.Success)
            return outcome == AttemptOutcome.Success ? null : AttemptError.StateConflict;

        if (state is { Phase: FishingPhase.Failed, Reason: AttemptReasons.Timeout })
        {
            if (outcome == AttemptOutcome.Failed)
                return null;
            if (now > state.Minigame!.DeadlineAt)
                return AttemptError.ResultExpired;
        }

        return AttemptError.StateConflict;
    }

    private Fish CurrentFish() => Config.Fish.Single(fish => fish.SpeciesId == state.SpeciesId);

    /// <summary>Ghép hai nửa 16 bit vì <see cref="IRandomSource.NextInt"/> không phủ hết khoảng uint32.</summary>
    private uint NextSeed()
    {
        var high = (uint)context.Random.NextInt(0, ushort.MaxValue);
        var low = (uint)context.Random.NextInt(0, ushort.MaxValue);
        return high << 16 | low;
    }
}
