using System.Net.Http.Json;
using System.Text.Json;
using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Modules.Economy;
using FishingOnline.Api.Modules.Fishing;
using FishingOnline.Api.Modules.Lake;
using FishingOnline.Api.Modules.Wallet;
using Microsoft.EntityFrameworkCore;

namespace FishingOnline.Api.Tests;

public sealed class FishingTests(PostgresServer postgres) : GameTestBase(postgres)
{
    private const int MaxWaitMs = 6000;

    private FishingService Fishing => App.Service<FishingService>();

    private async Task<TestPlayer> SeatedAsync(string seatId = "seat-11")
    {
        var player = await App.ConnectAsync(await App.NewPlayerAsync(1000));
        await player.OkAsync("JoinLake");
        await SitAsync(player, seatId);
        return player;
    }

    private async Task<Guid> CastAsync(TestPlayer player) =>
        (await player.OkAsync("CastLine")).GetProperty("attemptId").GetGuid();

    private async Task TickAfterAsync(double ms)
    {
        App.Clock.AdvanceMs(ms);
        await Fishing.TickOnceAsync(default);
    }

    private async Task<Guid> ToBiteAsync(TestPlayer player)
    {
        var attemptId = await CastAsync(player);
        await TickAfterAsync(MaxWaitMs);
        return attemptId;
    }

    private async Task<Guid> ToMinigameAsync(TestPlayer player)
    {
        var attemptId = await ToBiteAsync(player);
        await player.OkAsync("HookFish", new { attemptId });
        return attemptId;
    }

    private Task<FishingAttemptRow> RowAsync(Guid attemptId) =>
        App.WithDbAsync(db => db.Set<FishingAttemptRow>().AsNoTracking().SingleAsync(row => row.AttemptId == attemptId));

    private Task<int> CatchCountAsync(Guid playerId) =>
        App.WithDbAsync(db => db.Set<CatchRow>().CountAsync(row => row.PlayerId == playerId));

    private static object Result(Guid attemptId, string outcome = "success") => new { attemptId, outcome };

    [Fact]
    public async Task SecondOpenAttempt_IsBlockedByDatabase()
    {
        var playerId = await App.NewPlayerAsync();
        FishingAttemptRow Row() => new()
        {
            AttemptId = Guid.NewGuid(), PlayerId = playerId, SessionId = Guid.NewGuid(), Phase = "waiting",
            ConfigVersion = "v", SnapshotJson = "{}", StartedAt = App.Clock.GetUtcNow(),
        };
        await App.WithDbAsync(db => { db.Add(Row()); return db.SaveChangesAsync(); });

        var error = await Assert.ThrowsAsync<DbUpdateException>(() => App.WithDbAsync(db => { db.Add(Row()); return db.SaveChangesAsync(); }));

        Assert.Equal(FishingAttemptRowConfig.OpenPlayerIndex, error.UniqueConstraint());
    }

    [Fact]
    public async Task Cast_WithoutSeat_NotInSeat()
    {
        await using var player = await App.ConnectAsync();

        Assert.Equal("NOT_IN_SEAT", await player.ErrorAsync("CastLine"));
    }

    [Fact]
    public async Task Cast_Twice_AttemptActive_RetrySameRequestReturnsSameAttempt()
    {
        await using var player = await SeatedAsync();
        var requestId = Guid.NewGuid();

        var first = await player.OkAsync("CastLine", requestId: requestId);
        var retry = await player.OkAsync("CastLine", requestId: requestId);

        Assert.Equal(first.GetRawText(), retry.GetRawText());
        Assert.Equal("ATTEMPT_ACTIVE", await player.ErrorAsync("CastLine"));
    }

    [Theory]
    [InlineData("seat-11", 2999, 6000)]
    [InlineData("seat-01", 2999, 6000)]
    public async Task Bite_ArrivesInsideWaitWindow_SameOnEverySeat(string seatId, int stillWaitingAt, int biteBy)
    {
        await using var player = await SeatedAsync(seatId);
        var attemptId = await CastAsync(player);

        await TickAfterAsync(stillWaitingAt);
        Assert.Equal("waiting", (await RowAsync(attemptId)).Phase);

        await TickAfterAsync(biteBy - stillWaitingAt);
        var row = await RowAsync(attemptId);
        Assert.Equal("bite", row.Phase);
        Assert.NotNull(row.SpeciesId);
        var bite = await player.WaitForAsync("AttemptUpdate", update => update.GetProperty("phase").GetString() == "bite");
        Assert.NotEqual(JsonValueKind.Null, bite.GetProperty("biteDeadlineAt").ValueKind);
    }

    [Fact]
    public async Task Waiting_PublishesFishingFlagToRoom()
    {
        await using var watcher = await App.ConnectAsync();
        await watcher.OkAsync("JoinLake");
        await using var player = await SeatedAsync();

        await CastAsync(player);

        await watcher.WaitForAsync("PlayerJoined", view => view.GetProperty("playerId").GetGuid() == player.PlayerId && view.GetProperty("fishing").GetBoolean());
    }

    [Fact]
    public async Task Hook_GivesMinigameParams_ToOwnerOnly()
    {
        await using var watcher = await App.ConnectAsync();
        await watcher.OkAsync("JoinLake");
        await using var player = await SeatedAsync();

        var attemptId = await ToMinigameAsync(player);

        var update = await player.WaitForAsync("AttemptUpdate", item => item.GetProperty("phase").GetString() == "minigame");
        Assert.Equal(attemptId, update.GetProperty("attemptId").GetGuid());
        var minigame = update.GetProperty("minigame");
        Assert.Equal(13, minigame.EnumerateObject().Count());
        Assert.False(string.IsNullOrEmpty(minigame.GetProperty("rarity").GetString()));
        Assert.DoesNotContain(watcher.Received, item => item.Name == "AttemptUpdate");
        Assert.NotNull((await RowAsync(attemptId)).Seed);
    }

    [Fact]
    public async Task Hook_Late_FailsMissedBite()
    {
        await using var player = await SeatedAsync();
        var attemptId = await CastAsync(player);
        App.Clock.AdvanceMs(MaxWaitMs + 3301);

        Assert.Equal("BITE_EXPIRED", await player.ErrorAsync("HookFish", new { attemptId }));

        var row = await RowAsync(attemptId);
        Assert.Equal("failed", row.Phase);
        Assert.Equal("missed_bite", row.Reason);
    }

    [Fact]
    public async Task Hook_NoReaction_TickerMarksMissedBite()
    {
        await using var player = await SeatedAsync();
        var attemptId = await ToBiteAsync(player);

        await TickAfterAsync(3301);
        await TickAfterAsync(3301);

        Assert.Equal("missed_bite", (await RowAsync(attemptId)).Reason);
        Assert.False(App.Service<IFishingState>().IsBusy(player.PlayerId));
    }

    [Fact]
    public async Task MissedBite_KeepsPlayerSeated_CanCastAgain()
    {
        await using var watcher = await App.ConnectAsync();
        await watcher.OkAsync("JoinLake");
        await using var player = await SeatedAsync();
        var attemptId = await ToBiteAsync(player);

        await TickAfterAsync(3301);

        Assert.Equal("missed_bite", (await RowAsync(attemptId)).Reason);
        Assert.NotNull(await App.Service<ISeatSessions>().GetActiveAsync(player.PlayerId, default));
        Assert.DoesNotContain(player.Received, item => item.Name == "MySeat" && item.Payload.TryGetProperty("ended", out _));
        Assert.DoesNotContain(watcher.Received, item => item.Name == "FailShown");
        await CastAsync(player);
    }

    [Fact]
    public async Task Hundred_ParallelResults_OneCatchOneExp()
    {
        await using var player = await SeatedAsync();
        var attemptId = await ToMinigameAsync(player);

        var outcomes = await Task.WhenAll(Enumerable.Range(0, 100).Select(_ => Task.Run(async () =>
        {
            try
            {
                return (await Fishing.SubmitResultAsync(player.PlayerId, attemptId, "success", default)).Phase;
            }
            catch (GameException exception)
            {
                return exception.Code;
            }
        })));

        Assert.All(outcomes, outcome => Assert.Equal("success", outcome));
        Assert.Equal(1, await CatchCountAsync(player.PlayerId));
        var exp = await App.WithDbAsync(db => db.Players.Where(row => row.Id == player.PlayerId).Select(row => row.Exp).SingleAsync());
        var gained = await App.WithDbAsync(db => db.Set<CatchRow>().Where(row => row.PlayerId == player.PlayerId).Select(row => row.ExpGained).SingleAsync());
        Assert.Equal(gained, exp);
    }

    [Fact]
    public async Task Result_BeforeHook_IsRejected()
    {
        await using var player = await SeatedAsync();
        var attemptId = await CastAsync(player);

        Assert.Equal("STATE_CONFLICT", await player.ErrorAsync("SubmitFishingResult", Result(attemptId)));
        Assert.Equal(0, await CatchCountAsync(player.PlayerId));
    }

    [Fact]
    public async Task Result_FromOtherPlayerOrFakeAttempt_IsRejected()
    {
        await using var owner = await SeatedAsync();
        await using var other = await SeatedAsync("seat-12");
        var attemptId = await ToMinigameAsync(owner);

        Assert.Equal("NO_ACTIVE_ATTEMPT", await other.ErrorAsync("SubmitFishingResult", Result(attemptId)));
        Assert.Equal("NO_ACTIVE_ATTEMPT", await other.ErrorAsync("SubmitFishingResult", Result(Guid.NewGuid())));
        Assert.Equal(0, await CatchCountAsync(owner.PlayerId));
        Assert.Equal(0, await CatchCountAsync(other.PlayerId));
    }

    [Fact]
    public async Task Result_AfterDeadline_ResultExpired()
    {
        await using var player = await SeatedAsync();
        var attemptId = await ToMinigameAsync(player);
        App.Clock.Advance(TimeSpan.FromSeconds(30));

        Assert.Equal("RESULT_EXPIRED", await player.ErrorAsync("SubmitFishingResult", Result(attemptId)));

        Assert.Equal("timeout", (await RowAsync(attemptId)).Reason);
        Assert.Equal(0, await CatchCountAsync(player.PlayerId));
    }

    [Fact]
    public async Task Result_RepeatReturnsSame_OppositeIsConflict()
    {
        await using var player = await SeatedAsync();
        var attemptId = await ToMinigameAsync(player);

        var first = await player.OkAsync("SubmitFishingResult", Result(attemptId));
        var repeat = await player.OkAsync("SubmitFishingResult", Result(attemptId));

        Assert.Equal(first.GetRawText(), repeat.GetRawText());
        Assert.Equal("STATE_CONFLICT", await player.ErrorAsync("SubmitFishingResult", Result(attemptId, "failed")));
        Assert.Equal(1, await CatchCountAsync(player.PlayerId));
    }

    [Fact]
    public async Task Result_InvalidOutcome_ValidationFailed()
    {
        await using var player = await SeatedAsync();
        var attemptId = await ToMinigameAsync(player);

        Assert.Equal("VALIDATION_FAILED", await player.ErrorAsync("SubmitFishingResult", Result(attemptId, "win")));
    }

    [Fact]
    public async Task Success_ReachesOthersAsCatchShownOnly()
    {
        await using var watcher = await App.ConnectAsync();
        await watcher.OkAsync("JoinLake");
        await using var player = await SeatedAsync();
        var attemptId = await ToMinigameAsync(player);

        var attempt = (await player.OkAsync("SubmitFishingResult", Result(attemptId))).GetProperty("attempt");

        Assert.Equal("success", attempt.GetProperty("phase").GetString());
        var result = attempt.GetProperty("result");
        Assert.True(result.GetProperty("isNew").GetBoolean());
        Assert.True(result.GetProperty("lengthTenthCm").GetInt32() > 0);
        var shown = await watcher.WaitForAsync("CatchShown");
        Assert.Equal(player.PlayerId, shown.GetProperty("playerId").GetGuid());
        await player.WaitForAsync("AttemptUpdate", item => item.GetProperty("phase").GetString() == "success");
        await watcher.WaitForAsync("PlayerJoined", view => view.GetProperty("playerId").GetGuid() == player.PlayerId && !view.GetProperty("fishing").GetBoolean());
        Assert.DoesNotContain(watcher.Received, item => item.Name == "AttemptUpdate");
    }

    [Fact]
    public async Task Failed_GivesNothing_OwnerCanCastAgain()
    {
        await using var player = await SeatedAsync();
        var attemptId = await ToMinigameAsync(player);

        var attempt = (await player.OkAsync("SubmitFishingResult", Result(attemptId, "failed"))).GetProperty("attempt");

        Assert.Equal("failed", attempt.GetProperty("phase").GetString());
        Assert.Equal(0, await CatchCountAsync(player.PlayerId));
        await CastAsync(player);
    }

    [Fact]
    public async Task MinigameLoss_ShowsSadIconToTheRoom_PlayerStaysSeated()
    {
        await using var watcher = await App.ConnectAsync();
        await watcher.OkAsync("JoinLake");
        await using var player = await SeatedAsync();
        var attemptId = await ToMinigameAsync(player);

        await player.OkAsync("SubmitFishingResult", Result(attemptId, "failed"));

        var shown = await watcher.WaitForAsync("FailShown");
        Assert.Equal(player.PlayerId, shown.GetProperty("playerId").GetGuid());
        Assert.Equal(App.Clock.GetUtcNow() + TimeSpan.FromSeconds(2), shown.GetProperty("shownUntil").GetDateTimeOffset(), TimeSpan.FromMilliseconds(1));
        Assert.NotNull(await App.Service<ISeatSessions>().GetActiveAsync(player.PlayerId, default));
    }

    [Fact]
    public async Task TicketExpiringWhileWaiting_CancelsAndStandsUp()
    {
        await using var player = await SeatedAsync();
        var attemptId = await CastAsync(player);
        await App.WithDbAsync(db => db.Set<TicketRow>().Where(row => row.PlayerId == player.PlayerId)
            .ExecuteUpdateAsync(setters => setters.SetProperty(row => row.ExpiresAt, App.Clock.GetUtcNow())));

        await App.Service<SeatSessions>().SweepOnceAsync(default);

        var row = await RowAsync(attemptId);
        Assert.Equal("cancelled", row.Phase);
        Assert.Equal("ticket_expired", row.Reason);
        Assert.Null(await App.Service<ISeatSessions>().GetActiveAsync(player.PlayerId, default));
    }

    [Fact]
    public async Task TicketExpiringInMinigame_FinishesTheCatch_ThenStandsUp()
    {
        await using var player = await SeatedAsync();
        var attemptId = await ToMinigameAsync(player);
        await App.WithDbAsync(db => db.Set<TicketRow>().Where(row => row.PlayerId == player.PlayerId)
            .ExecuteUpdateAsync(setters => setters.SetProperty(row => row.ExpiresAt, App.Clock.GetUtcNow())));
        var seats = App.Service<SeatSessions>();

        await seats.SweepOnceAsync(default);
        Assert.NotNull(await App.Service<ISeatSessions>().GetActiveAsync(player.PlayerId, default));
        var attempt = (await player.OkAsync("SubmitFishingResult", Result(attemptId))).GetProperty("attempt");
        await seats.SweepOnceAsync(default);

        Assert.Equal("success", attempt.GetProperty("phase").GetString());
        Assert.Equal(1, await CatchCountAsync(player.PlayerId));
        Assert.Null(await App.Service<ISeatSessions>().GetActiveAsync(player.PlayerId, default));
        var ended = await player.WaitForAsync("MySeat", payload => payload.TryGetProperty("ended", out _));
        Assert.Equal("ticket_expired", ended.GetProperty("reason").GetString());
    }

    [Fact]
    public async Task Cast_WithExpiredTicketBeforeSweep_NoTicket()
    {
        await using var player = await SeatedAsync();
        await App.WithDbAsync(db => db.Set<TicketRow>().Where(row => row.PlayerId == player.PlayerId)
            .ExecuteUpdateAsync(setters => setters.SetProperty(row => row.ExpiresAt, App.Clock.GetUtcNow())));

        Assert.Equal("NO_TICKET", await player.ErrorAsync("CastLine"));
    }

    [Fact]
    public async Task LeaveSeat_CancelsAttempt()
    {
        await using var player = await SeatedAsync();
        var attemptId = await CastAsync(player);

        await player.OkAsync("LeaveSeat");

        var row = await RowAsync(attemptId);
        Assert.Equal("cancelled", row.Phase);
        Assert.Equal("left_seat", row.Reason);
    }

    [Fact]
    public async Task LeaveSeat_InMinigame_IsRejected()
    {
        await using var player = await SeatedAsync();
        var attemptId = await ToMinigameAsync(player);

        Assert.Equal("STATE_CONFLICT", await player.ErrorAsync("LeaveSeat"));

        Assert.Equal("minigame", (await RowAsync(attemptId)).Phase);
        Assert.NotNull(await App.Service<ISeatSessions>().GetActiveAsync(player.PlayerId, default));
    }

    [Fact]
    public async Task Disconnect_CancelsAttempt_SeatStays()
    {
        var player = await SeatedAsync();
        var attemptId = await CastAsync(player);

        await player.DisposeAsync();

        for (var i = 0; i < 500 && (await RowAsync(attemptId)).Phase != "cancelled"; i++) await Task.Delay(10);
        var row = await RowAsync(attemptId);
        Assert.Equal("cancelled", row.Phase);
        Assert.Equal("disconnected", row.Reason);
        Assert.NotNull(await App.Service<ISeatSessions>().GetActiveAsync(player.PlayerId, default));
    }

    [Fact]
    public async Task BuyingTickets_WhileFishing_KeepsAttemptRunning()
    {
        await using var player = await SeatedAsync();
        var attemptId = await ToMinigameAsync(player);

        await player.OkAsync("BuyTicket", TicketArgs());

        Assert.Equal("minigame", (await RowAsync(attemptId)).Phase);
    }

    [Fact]
    public async Task Restart_CancelsOpenAttempt_PlayerCanFishAgain()
    {
        await using var player = await SeatedAsync();
        var attemptId = await ToMinigameAsync(player);
        var crashed = await RowAsync(attemptId);
        await player.DisposeAsync();
        await App.DisposeAsync();

        // Tắt êm vẫn báo disconnect; đưa dữ liệu về đúng trạng thái lúc Server chết đột ngột.
        var clock = new ManualClock(App.Clock.GetUtcNow().AddSeconds(5));
        await using (var connection = new Npgsql.NpgsqlConnection(ConnectionString))
        {
            await connection.OpenAsync();
            await using var command = new Npgsql.NpgsqlCommand(
                """update game.fishing_attempts set "Phase" = 'minigame', "Reason" = null, "EndedAt" = null, "SnapshotJson" = @snapshot::jsonb where "AttemptId" = @id""", connection);
            command.Parameters.AddWithValue("snapshot", crashed.SnapshotJson);
            command.Parameters.AddWithValue("id", attemptId);
            await command.ExecuteNonQueryAsync();
        }

        var restarted = StartApp(clock);

        var row = await restarted.WithDbAsync(db => db.Set<FishingAttemptRow>().AsNoTracking().SingleAsync(item => item.AttemptId == attemptId));
        Assert.Equal("cancelled", row.Phase);
        Assert.Equal("disconnected", row.Reason);
        Assert.Equal(0, await restarted.WithDbAsync(db => db.Set<CatchRow>().CountAsync(item => item.PlayerId == player.PlayerId)));
        await using var again = await restarted.ConnectAsync(player.PlayerId);
        await again.OkAsync("JoinLake");
        await again.OkAsync("CastLine");
    }
}

public sealed class MonitoringTests(PostgresServer postgres) : GameTestBase(postgres)
{
    private const string ConfigVersion = "v0-test-2026-11-10-ticket-01";

    private SecurityMonitor Monitor => App.Service<SecurityMonitor>();

    private Task AddOutcomesAsync(Guid playerId, int count, bool success, TimeSpan elapsed) => App.WithDbAsync(db =>
    {
        var now = App.Clock.GetUtcNow();
        for (var i = 0; i < count; i++)
            db.Add(new FishingOutcomeEvent
            {
                AttemptId = Guid.NewGuid(), PlayerId = playerId, Success = success,
                MinigameStartedAt = now.AddSeconds(i) - elapsed, ResultReceivedAt = now.AddSeconds(i), ConfigVersion = ConfigVersion,
            });
        return db.SaveChangesAsync();
    });

    [Fact]
    public async Task FiftyWins_OpensOneInformationalSignal()
    {
        var playerId = await App.NewPlayerAsync();
        await AddOutcomesAsync(playerId, 50, true, TimeSpan.FromSeconds(5));

        await Monitor.ProcessBatchAsync(default);

        var signal = Assert.Single(await Monitor.QueryAsync(playerId, SecurityRules.WinRateHigh, null, null, default));
        Assert.Equal(SecurityRules.Informational, signal.Severity);
        Assert.Equal(1, signal.Occurrences);
        Assert.Equal(50, signal.SampleCount);
        Assert.Equal(ConfigVersion, signal.RuleVersion);
        Assert.True(signal.RepresentativeAttemptIds.Length <= 10);
    }

    [Fact]
    public async Task FortyNineWins_NoSignal()
    {
        var playerId = await App.NewPlayerAsync();
        await AddOutcomesAsync(playerId, 49, true, TimeSpan.FromSeconds(5));

        await Monitor.ProcessBatchAsync(default);

        Assert.Empty(await Monitor.QueryAsync(playerId, null, null, null, default));
    }

    [Fact]
    public async Task FastSuccess_FourNo_FifthYes()
    {
        var playerId = await App.NewPlayerAsync();
        await AddOutcomesAsync(playerId, 4, true, TimeSpan.FromMilliseconds(800));
        await Monitor.ProcessBatchAsync(default);
        Assert.Empty(await Monitor.QueryAsync(playerId, SecurityRules.FastSuccess, null, null, default));

        App.Clock.Advance(TimeSpan.FromSeconds(10));
        await AddOutcomesAsync(playerId, 1, true, TimeSpan.FromMilliseconds(800));
        await Monitor.ProcessBatchAsync(default);

        Assert.Single(await Monitor.QueryAsync(playerId, SecurityRules.FastSuccess, null, null, default));
    }

    [Fact]
    public async Task Reprocessing_DoesNotDuplicateSignal()
    {
        var playerId = await App.NewPlayerAsync();
        await AddOutcomesAsync(playerId, 50, true, TimeSpan.FromSeconds(5));
        await Monitor.ProcessBatchAsync(default);

        Assert.Equal(0, await Monitor.ProcessBatchAsync(default));

        Assert.Equal(1, (await Monitor.QueryAsync(playerId, SecurityRules.WinRateHigh, null, null, default)).Single().Occurrences);
    }

    [Fact]
    public async Task InvalidBurst_SignalsWarning_AndStaysRejected()
    {
        await using var player = await App.ConnectAsync();
        for (var i = 0; i < 10; i++)
            Assert.Equal("NO_ACTIVE_ATTEMPT", await player.ErrorAsync("SubmitFishingResult", new { attemptId = Guid.NewGuid(), outcome = "success" }));

        await Monitor.ProcessBatchAsync(default);

        var signal = Assert.Single(await Monitor.QueryAsync(player.PlayerId, SecurityRules.InvalidResultBurst, null, null, default));
        Assert.Equal(SecurityRules.Warning, signal.Severity);
        Assert.Equal(0, await App.WithDbAsync(db => db.Set<CatchRow>().CountAsync(row => row.PlayerId == player.PlayerId)));
    }

    [Fact]
    public async Task RetryingValidResult_AddsOneSampleOnly()
    {
        await using var player = await App.ConnectAsync(await App.NewPlayerAsync(1000));
        await player.OkAsync("JoinLake");
        await SitAsync(player, "seat-11");
        var attemptId = (await player.OkAsync("CastLine")).GetProperty("attemptId").GetGuid();
        App.Clock.AdvanceMs(6000);
        await App.Service<FishingService>().TickOnceAsync(default);
        await player.OkAsync("HookFish", new { attemptId });

        for (var i = 0; i < 100; i++)
            await player.OkAsync("SubmitFishingResult", new { attemptId, outcome = "success" });

        Assert.Equal(1, await App.WithDbAsync(db => db.Set<FishingOutcomeEvent>().CountAsync(row => row.PlayerId == player.PlayerId)));
        Assert.Equal(0, await App.WithDbAsync(db => db.Set<InvalidResultEvent>().CountAsync(row => row.PlayerId == player.PlayerId)));
        Assert.Equal(1, await App.WithDbAsync(db => db.Set<CatchRow>().CountAsync(row => row.PlayerId == player.PlayerId)));
    }

    [Fact]
    public async Task Purge_RemovesOnlyExpiredData()
    {
        var playerId = await App.NewPlayerAsync();
        await AddOutcomesAsync(playerId, 50, true, TimeSpan.FromSeconds(5));
        await Monitor.ProcessBatchAsync(default);

        Assert.Equal(0, await Monitor.PurgeAsync(default));
        App.Clock.Advance(TimeSpan.FromDays(31));
        Assert.True(await Monitor.PurgeAsync(default) > 0);
        Assert.Empty(await Monitor.QueryAsync(playerId, null, null, null, default));
    }
}

[Trait("Category", "E2E")]
public sealed class EndToEndTests(PostgresServer postgres) : GameTestBase(postgres)
{
    [Fact]
    public async Task FullFishingLoop_OnRealTimers()
    {
        var app = StartApp(realTimers: true);
        var playerId = Guid.NewGuid();
        var http = app.Http(playerId);
        var profile = await ReadDataAsync(await http.GetAsync("/api/v1/me"));
        Assert.Equal("100", profile.GetProperty("gold").GetString());

        await using var player = await app.ConnectAsync(playerId);
        await player.OkAsync("JoinLake");
        var bought = await player.OkAsync("BuyTicket", TicketArgs());
        Assert.Equal("50", bought.GetProperty("gold").GetString());
        await SitAsync(player, "seat-11", tickets: 0, app);

        var attemptId = (await player.OkAsync("CastLine")).GetProperty("attemptId").GetGuid();
        await player.WaitForAsync("AttemptUpdate", update => update.GetProperty("phase").GetString() == "bite");
        await player.OkAsync("HookFish", new { attemptId });
        await player.WaitForAsync("AttemptUpdate", update => update.GetProperty("phase").GetString() == "minigame");
        var attempt = (await player.OkAsync("SubmitFishingResult", new { attemptId, outcome = "success" })).GetProperty("attempt");
        Assert.Equal("success", attempt.GetProperty("phase").GetString());
        var expGained = attempt.GetProperty("result").GetProperty("expGained").GetInt32();

        var inventory = await ReadDataAsync(await http.GetAsync("/api/v1/me/inventory"));
        var fish = Assert.Single(inventory.GetProperty("fish").EnumerateArray());
        var progress = await ReadDataAsync(await http.GetAsync("/api/v1/me/progress"));
        Assert.Equal(expGained, progress.GetProperty("exp").GetInt32());

        var sell = new HttpRequestMessage(HttpMethod.Post, "/api/v1/shop/sell-fish") { Content = JsonContent.Create(new { catchIds = new[] { fish.GetProperty("catchId").GetGuid() } }) };
        sell.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString());
        var sold = await ReadDataAsync(await http.SendAsync(sell));
        Assert.Equal(50 + long.Parse(sold.GetProperty("goldEarned").GetString()!), long.Parse(sold.GetProperty("gold").GetString()!));

        var ledger = await app.WithDbAsync(db => db.Set<LedgerEntry>().Where(row => row.PlayerId == playerId).OrderBy(row => row.CreatedAt).Select(row => row.Reason).ToListAsync());
        Assert.Equal([LedgerReasons.GrantNewPlayer, LedgerReasons.TicketPurchase, LedgerReasons.SellFish], ledger);
    }
}
