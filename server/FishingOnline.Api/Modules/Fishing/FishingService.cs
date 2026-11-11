using System.Text.Json;
using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Modules.Config;
using FishingOnline.Api.Modules.Economy;
using FishingOnline.Api.Modules.Lake;
using FishingOnline.Api.Persistence;
using FishingOnline.Domain;
using FishingOnline.Domain.Attempts;
using FishingOnline.Domain.Config;
using Microsoft.EntityFrameworkCore;

namespace FishingOnline.Api.Modules.Fishing;

/// <summary>
/// Điều phối lần câu qua hub. Mỗi lệnh khóa hàng attempt, dựng lại máy trạng thái từ snapshot rồi ghi kết quả
/// trong một transaction; event chỉ gửi sau commit. RAM chỉ giữ lịch cho ticker.
/// </summary>
public sealed class FishingService(
    IServiceScopeFactory scopes,
    IConfigProvider configs,
    ISeatSessions seats,
    IRandomSource random,
    FishingState state,
    LakeRoom room,
    SecurityMonitor monitor,
    FishPopulation population,
    IConfiguration configuration,
    TimeProvider time,
    ILogger<FishingService> logger)
{
    private int EmptyLakeRetryMs => configuration.GetValue("Fishing:EmptyLakeRetryMs", 1000);

    private sealed record Applied(FishingAttemptRow Row, AttemptSnapshot Snapshot, AttemptStep Step, CatchShownView? Shown);

    private DateTimeOffset Now => time.GetUtcNow();

    public void Subscribe()
    {
        seats.SessionEnded += OnSessionEndedAsync;
        seats.PlayerDisconnected += OnPlayerDisconnectedAsync;
    }

    public async Task<AttemptView?> GetActiveViewAsync(Guid playerId, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        var row = await db.Set<FishingAttemptRow>().AsNoTracking().SingleOrDefaultAsync(item => item.PlayerId == playerId && item.EndedAt == null, ct);
        return row is null ? null : ViewOf(row, Deserialize(row));
    }

    public async Task<Guid> CastAsync(Guid playerId, Guid requestId, CancellationToken ct)
    {
        var fresh = false;
        FishingAttemptRow? created = null;
        AttemptSnapshot? snapshot = null;
        Guid attemptId;
        try
        {
            await using var scope = scopes.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
            var progress = scope.ServiceProvider.GetRequiredService<IProgress>();
            attemptId = await scope.ServiceProvider.GetRequiredService<IIdempotency>().RunAsync(playerId, "fishing.cast", requestId, string.Empty, async () =>
            {
                fresh = true;
                var session = await seats.GetActiveAsync(playerId, ct) ?? throw new GameException("NOT_IN_SEAT");
                var now = Now;
                if (session.TicketExpiresAt is not { } expiresAt || expiresAt <= now) throw new GameException("NO_TICKET");
                if (await db.Set<FishingAttemptRow>().AsNoTracking().AnyAsync(row => row.PlayerId == playerId && row.EndedAt == null, ct))
                    throw new GameException("ATTEMPT_ACTIVE");

                var config = configs.Current;
                var stats = await progress.GetStatsAsync(playerId, ct);
                var waitMs = Domain.Rules.FishingRules.WaitMs(random, config.Fishing);
                var attempt = FishingAttempt.Start(AttemptContext.Create(config, random), stats.Total, now, waitMs);
                snapshot = attempt.Snapshot();
                created = new FishingAttemptRow
                {
                    AttemptId = Guid.CreateVersion7(),
                    PlayerId = playerId,
                    SessionId = session.SessionId,
                    Phase = PhaseName(snapshot.Phase),
                    ConfigVersion = config.ConfigVersion,
                    SnapshotJson = Serialize(snapshot),
                    StartedAt = now,
                };
                db.Add(created);
                await db.SaveChangesAsync(ct);
                return created.AttemptId;
            });
        }
        catch (DbUpdateException exception) when (exception.UniqueConstraint() == FishingAttemptRowConfig.OpenPlayerIndex)
        {
            throw new GameException("ATTEMPT_ACTIVE");
        }

        if (fresh)
        {
            state.Set(new FishingState.ActiveEntry(created!.AttemptId, playerId, DueAt(snapshot!, configs.Get(created.ConfigVersion))));
            await room.SendToPlayerAsync(playerId, "AttemptUpdate", ViewOf(created, snapshot!));
            await room.PublishPlayerAsync(playerId);
        }
        return attemptId;
    }

    public async Task HookAsync(Guid playerId, Guid attemptId, CancellationToken ct)
    {
        var applied = await ApplyAsync(attemptId, playerId, (attempt, _) => attempt.Hook(Now), ct);
        await PublishAsync(applied);
        ThrowIfRejected(applied.Step.Error);
    }

    public async Task<AttemptView> SubmitResultAsync(Guid playerId, Guid attemptId, string outcomeText, CancellationToken ct)
    {
        AttemptOutcome outcome = outcomeText switch
        {
            "success" => AttemptOutcome.Success,
            "failed" => AttemptOutcome.Failed,
            _ => throw new GameException(ErrorCatalog.ValidationFailed),
        };

        // Vé hết giữa minigame vẫn được câu nốt (SPEC 2.2); rời ghế hay mất kết nối đã hủy attempt từ trước.
        Applied applied;
        try
        {
            applied = await ApplyAsync(attemptId, playerId, (attempt, _) => attempt.ReportOutcome(outcome, Now), ct);
        }
        catch (GameException exception) when (exception.Code == "NO_ACTIVE_ATTEMPT")
        {
            await monitor.RecordInvalidAsync(playerId, attemptId, "unknown_attempt");
            throw;
        }

        await PublishAsync(applied);
        if (applied.Step.Error == AttemptError.StateConflict) await monitor.RecordInvalidAsync(playerId, attemptId, "invalid_phase");
        ThrowIfRejected(applied.Step.Error);
        return ViewOf(applied.Row, applied.Snapshot);
    }

    public async Task TickOnceAsync(CancellationToken ct)
    {
        foreach (var entry in state.Due(Now))
        {
            try
            {
                await PublishAsync(await ApplyAsync(entry.AttemptId, entry.PlayerId, (attempt, _) => attempt.Tick(Now), ct));
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                logger.LogError(exception, "Fishing tick failed for attempt {AttemptId}", entry.AttemptId);
            }
        }
    }

    /// <summary>Sau restart mọi kết nối đã mất nên mọi lần câu đang mở đều bị hủy, không có thưởng.</summary>
    public async Task RecoverAsync(CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        var open = await db.Set<FishingAttemptRow>().AsNoTracking().Where(row => row.EndedAt == null)
            .Select(row => new { row.AttemptId, row.PlayerId }).ToListAsync(ct);
        foreach (var item in open)
            await ApplyAsync(item.AttemptId, item.PlayerId, (attempt, _) => attempt.Cancel(AttemptReasons.Disconnected), ct);
    }

    private Task OnPlayerDisconnectedAsync(Guid playerId) => CancelActiveAsync(playerId, AttemptReasons.Disconnected);

    /// <summary>Trượt cá thì attempt đã kết thúc trước khi ghế kết thúc, lệnh hủy không còn tác dụng.</summary>
    private Task OnSessionEndedAsync(SeatSessionEnded ended) => CancelActiveAsync(ended.PlayerId, ended.Reason switch
    {
        SeatEndReasons.TicketExpired => AttemptReasons.TicketExpired,
        SeatEndReasons.DisconnectTimeout => AttemptReasons.Disconnected,
        _ => AttemptReasons.LeftSeat,
    });

    private async Task CancelActiveAsync(Guid playerId, string reason)
    {
        Guid? attemptId;
        await using (var scope = scopes.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
            attemptId = await db.Set<FishingAttemptRow>().AsNoTracking()
                .Where(row => row.PlayerId == playerId && row.EndedAt == null)
                .Select(row => (Guid?)row.AttemptId).SingleOrDefaultAsync();
        }
        if (attemptId is not null)
            await PublishAsync(await ApplyAsync(attemptId.Value, playerId, (attempt, _) => attempt.Cancel(reason), CancellationToken.None));
    }

    private async Task<Applied> ApplyAsync(Guid attemptId, Guid playerId, Func<FishingAttempt, AttemptSnapshot, AttemptStep> command, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        var row = await db.Set<FishingAttemptRow>()
            .FromSqlInterpolated($"""select * from game.fishing_attempts where "AttemptId" = {attemptId} for update""")
            .AsTracking().SingleOrDefaultAsync(ct);
        if (row is null || row.PlayerId != playerId) throw new GameException("NO_ACTIVE_ATTEMPT");

        var config = configs.Get(row.ConfigVersion);
        var before = Deserialize(row);

        // Tới giờ cắn thì chọn loài theo cá còn trong hồ; hồ hết cá thì picked = null và attempt chờ tiếp.
        string? picked = null;
        Dictionary<string, LakeFishPopulation>? populationRows = null;
        if (before.Phase == FishingPhase.Waiting && Now >= before.BiteAt)
            (picked, populationRows) = await population.PickAsync(db, random, config, before.Stats.RareLuck, ct);

        var attempt = FishingAttempt.Restore(new AttemptContext(config, random, _ => picked), before);
        var step = command(attempt, before);
        var after = attempt.Snapshot();
        CatchShownView? shown = null;

        // Hoãn cắn vì hồ hết cá không có event nhưng vẫn đổi snapshot, nên cũng phải lưu.
        if (step.Events.Count > 0 || after != before)
        {
            var now = Now;
            if (picked is not null && before.SpeciesId is null && after.SpeciesId == picked)
            {
                population.Reserve(populationRows![picked]);
                row.PopulationReserved = true;
            }
            if (row.PopulationReserved && after.Phase is FishingPhase.Success or FishingPhase.Failed or FishingPhase.Cancelled)
            {
                await population.SettleAsync(db, after.SpeciesId!, attemptId, after.Phase == FishingPhase.Success, ct);
                row.PopulationReserved = false;
            }
            row.Phase = PhaseName(after.Phase);
            row.Reason = after.Reason;
            row.SpeciesId = after.SpeciesId;
            row.Rarity = after.SpeciesId is null ? null : RarityName(config.Fish.Single(fish => fish.SpeciesId == after.SpeciesId).Rarity);
            row.Seed = after.Minigame?.Seed;
            row.LengthTenthCm = after.LengthTenthCm;
            row.SnapshotJson = Serialize(after);
            if (after.Phase is FishingPhase.Success or FishingPhase.Failed or FishingPhase.Cancelled) row.EndedAt = now;

            if (step.Events.OfType<Succeeded>().SingleOrDefault() is { } succeeded)
            {
                var recorded = await scope.ServiceProvider.GetRequiredService<ICatchRecorder>()
                    .RecordAsync(playerId, attemptId, succeeded.SpeciesId, succeeded.LengthTenthCm, succeeded.Exp, row.ConfigVersion, ct);
                row.ResultJson = JsonSerializer.Serialize(new AttemptResultView(
                    succeeded.SpeciesId, row.Rarity!, succeeded.LengthTenthCm, recorded.IsNew, recorded.IsRecord,
                    recorded.ExpGained, recorded.Level, recorded.LevelUp), GameJson.Options);
                shown = new CatchShownView(playerId, succeeded.SpeciesId, row.Rarity!, now.AddMilliseconds(config.Fishing.CatchShownMs));
            }

            if (after is { Phase: FishingPhase.Success or FishingPhase.Failed, Minigame: { } minigame })
                db.Add(new FishingOutcomeEvent
                {
                    AttemptId = attemptId,
                    PlayerId = playerId,
                    Success = after.Phase == FishingPhase.Success,
                    MinigameStartedAt = minigame.StartedAt,
                    ResultReceivedAt = now,
                    ConfigVersion = row.ConfigVersion,
                });
            await db.SaveChangesAsync(ct);
        }
        await transaction.CommitAsync(ct);
        return new Applied(row, after, step, shown);
    }

    private async Task PublishAsync(Applied applied)
    {
        var row = applied.Row;
        var terminal = row.EndedAt is not null;
        // Lịch có thể còn sót khi hủy chạy trước lúc Cast ghi lịch, nên kết thúc là luôn xóa.
        if (terminal) state.Remove(row.PlayerId, row.AttemptId);
        if (applied.Step.Events.Count == 0)
        {
            // Hồ hết cá: thử lại sau, không quét DB mỗi nhịp ticker.
            if (applied.Snapshot.Phase == FishingPhase.Waiting && Now >= applied.Snapshot.BiteAt)
                state.Set(new FishingState.ActiveEntry(row.AttemptId, row.PlayerId, Now.AddMilliseconds(EmptyLakeRetryMs)));
            return;
        }
        if (!terminal) state.Set(new FishingState.ActiveEntry(row.AttemptId, row.PlayerId, DueAt(applied.Snapshot, configs.Get(row.ConfigVersion))));

        await room.SendToPlayerAsync(row.PlayerId, "AttemptUpdate", ViewOf(row, applied.Snapshot));
        if (applied.Shown is not null) await room.BroadcastAsync("CatchShown", applied.Shown);
        if (terminal) await room.PublishPlayerAsync(row.PlayerId);
        if (applied.Snapshot.Phase != FishingPhase.Failed) return;

        // Trượt cá: vẫn ngồi ghế, Client tự câu lại sau khoảng 1 giây (feedback 2026-11-11).
        // Thua minigame thì cả phòng thấy icon buồn.
        if (applied.Snapshot.Reason != AttemptReasons.MissedBite)
            await room.BroadcastAsync("FailShown", new FailShownView(
                row.PlayerId, Now.AddMilliseconds(configs.Get(row.ConfigVersion).Fishing.FailShownMs)));
    }

    private static void ThrowIfRejected(AttemptError? error)
    {
        if (error is { } value)
            throw new GameException(value switch
            {
                AttemptError.BiteExpired => "BITE_EXPIRED",
                AttemptError.ResultExpired => "RESULT_EXPIRED",
                _ => "STATE_CONFLICT",
            });
    }

    /// <summary>Thời điểm ticker cần xem lại; cộng 1 ms vì Domain chỉ hết hạn khi vượt qua mốc.</summary>
    private static DateTimeOffset DueAt(AttemptSnapshot snapshot, GameplayConfig config) => snapshot.Phase switch
    {
        FishingPhase.Waiting => snapshot.BiteAt,
        FishingPhase.Bite => snapshot.BiteDeadlineAt!.Value.AddMilliseconds(config.Fishing.BiteGraceMs + 1),
        FishingPhase.Minigame => snapshot.Minigame!.DeadlineAt.AddMilliseconds(1),
        _ => DateTimeOffset.MaxValue,
    };

    private static AttemptView ViewOf(FishingAttemptRow row, AttemptSnapshot snapshot) => new(
        row.AttemptId,
        row.Phase,
        row.Reason,
        snapshot.Phase == FishingPhase.Bite ? snapshot.BiteDeadlineAt : null,
        snapshot.Phase == FishingPhase.Minigame ? snapshot.Minigame : null,
        State: null,
        row.ResultJson is null ? null : JsonSerializer.Deserialize<AttemptResultView>(row.ResultJson, GameJson.Options));

    private static string PhaseName(FishingPhase phase) => phase.ToString().ToLowerInvariant();

    private static string RarityName(Rarity rarity) => rarity.ToString().ToLowerInvariant();

    private static string Serialize(AttemptSnapshot snapshot) => JsonSerializer.Serialize(snapshot, GameJson.Options);

    private static AttemptSnapshot Deserialize(FishingAttemptRow row) => JsonSerializer.Deserialize<AttemptSnapshot>(row.SnapshotJson, GameJson.Options)!;
}

public sealed class FishingBackground(
    FishingService fishing, FishPopulation population, SecurityMonitor monitor, IConfiguration configuration, ILogger<FishingBackground> logger)
    : BackgroundService
{
    private static readonly TimeSpan MonitorEvery = TimeSpan.FromSeconds(1);
    private static readonly TimeSpan PurgeEvery = TimeSpan.FromHours(1);

    public override async Task StartAsync(CancellationToken cancellationToken)
    {
        await population.EnsureSeededAsync(cancellationToken);
        await fishing.RecoverAsync(cancellationToken);
        fishing.Subscribe();
        await base.StartAsync(cancellationToken);
    }

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var tickMs = configuration.GetValue("Fishing:TickIntervalMs", 50);
        if (tickMs <= 0) return Task.CompletedTask;
        return Task.WhenAll(
            LoopAsync(TimeSpan.FromMilliseconds(tickMs), fishing.TickOnceAsync, stoppingToken),
            LoopAsync(MonitorEvery, async ct => await monitor.ProcessBatchAsync(ct), stoppingToken),
            LoopAsync(PurgeEvery, async ct => await monitor.PurgeAsync(ct), stoppingToken));
    }

    private async Task LoopAsync(TimeSpan period, Func<CancellationToken, Task> work, CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(period);
        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    await work(stoppingToken);
                }
                catch (Exception exception) when (exception is not OperationCanceledException)
                {
                    logger.LogError(exception, "Fishing background work failed");
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Host đang dừng.
        }
    }
}

public static class FishingModule
{
    public static IServiceCollection AddFishing(this IServiceCollection services)
    {
        services.AddSingleton<IRandomSource, CryptoRandomSource>();
        services.AddSingleton<FishingState>();
        services.AddSingleton<IFishingState>(provider => provider.GetRequiredService<FishingState>());
        services.AddSingleton<SecurityMonitor>();
        services.AddSingleton<FishPopulation>();
        services.AddSingleton<FishingService>();
        services.AddHostedService<FishingBackground>();
        return services;
    }
}
