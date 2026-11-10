using System.Text.Json;
using FishingOnline.Api.Modules.Lake;
using FishingOnline.Api.Modules.Wallet;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;

namespace FishingOnline.Api.Tests;

public sealed class LakeMapTests
{
    private static readonly LakeMap Map = LakeMap.Parse(File.ReadAllText(
        Path.Combine(AppContext.BaseDirectory, "fixtures", "lake-map.placeholder.json")));

    [Fact]
    public void Water_CannotStand() => Assert.False(Map.CanStand(768, 500));

    [Fact]
    public void Spawn_CanStand() => Assert.True(Map.CanStand(Map.Data.Spawn.X, Map.Data.Spawn.Y));

    [Fact]
    public void EverySeat_CanStand()
    {
        Assert.Equal(20, Map.Data.Seats.Count);
        Assert.All(Map.Data.Seats, seat => Assert.True(Map.CanStand(seat.X, seat.Y), seat.SeatId));
    }

    [Fact]
    public void FeetBox_TouchingWater_CannotStand()
    {
        // Ô nước đầu tiên bắt đầu ở x = 384; chân rộng 7 px mỗi bên.
        Assert.True(Map.CanStand(377, 500));
        Assert.False(Map.CanStand(378, 500));
    }

    [Fact]
    public void OutsideMap_CannotStand() => Assert.False(Map.CanStand(-20, 100));

    [Fact]
    public void InLakeArea_FollowsPolygon()
    {
        Assert.True(Map.InLakeArea(100, 100));
        Assert.False(Map.InLakeArea(10, 10));
    }

    [Fact]
    public void Seat_LookupByIdAndUnknown()
    {
        Assert.Equal(1, Map.Seat("seat-01")!.Tier);
        Assert.Null(Map.Seat("seat-99"));
    }
}

public sealed class LakeRoomTests(PostgresServer postgres) : GameTestBase(postgres)
{
    private static IEnumerable<JsonElement> Players(JsonElement snapshot) => snapshot.GetProperty("players").EnumerateArray();

    [Fact]
    public async Task TwoClients_SeeEachOther()
    {
        await using var first = await App.ConnectAsync();
        var firstSnapshot = await first.OkAsync("JoinLake");
        await using var second = await App.ConnectAsync();

        var snapshot = await second.OkAsync("JoinLake");

        Assert.Single(Players(firstSnapshot));
        Assert.Equal(2, Players(snapshot).Count());
        var joined = await first.WaitForAsync("PlayerJoined");
        Assert.Equal(second.PlayerId, joined.GetProperty("playerId").GetGuid());
        Assert.Equal(20, snapshot.GetProperty("seats").GetArrayLength());
        Assert.Equal("lake-01", snapshot.GetProperty("mapId").GetString());
    }

    [Fact]
    public async Task SecondTab_ReplacesFirst_OneAvatar()
    {
        var playerId = await App.NewPlayerAsync();
        await using var watcher = await App.ConnectAsync();
        await watcher.OkAsync("JoinLake");
        var firstTab = await App.ConnectAsync(playerId);
        await firstTab.OkAsync("JoinLake");
        await watcher.WaitForAsync("PlayerJoined");
        var closed = new TaskCompletionSource();
        firstTab.Connection.Closed += _ => { closed.TrySetResult(); return Task.CompletedTask; };
        await using var secondTab = await App.ConnectAsync(playerId);

        var snapshot = await secondTab.OkAsync("JoinLake");

        await closed.Task.WaitAsync(TimeSpan.FromSeconds(10));
        Assert.Single(Players(snapshot), player => player.GetProperty("playerId").GetGuid() == playerId);
        await Task.Delay(100);
        Assert.DoesNotContain(watcher.Received, item => item.Name == "PlayerLeft");
        Assert.Single(watcher.Received, item => item.Name == "PlayerJoined");
        await firstTab.DisposeAsync();
    }

    [Fact]
    public async Task JumpFar_IsCorrected()
    {
        await using var player = await App.ConnectAsync();
        await player.OkAsync("JoinLake");

        await player.OkAsync("Move", new { seq = 1, x = 644, y = 976, dir = "right" });

        var corrected = await player.WaitForAsync("PositionCorrected");
        Assert.Equal(144, corrected.GetProperty("x").GetDouble());
    }

    [Fact]
    public async Task WalkIntoWater_IsCorrected()
    {
        await using var player = await App.ConnectAsync();
        await player.OkAsync("JoinLake");
        App.Clock.Advance(TimeSpan.FromSeconds(1));
        await player.OkAsync("Move", new { seq = 1, x = 250, y = 850, dir = "right" });
        App.Clock.Advance(TimeSpan.FromSeconds(1));
        await player.OkAsync("Move", new { seq = 2, x = 370, y = 800, dir = "right" });
        Assert.DoesNotContain(player.Received, item => item.Name == "PositionCorrected");
        App.Clock.Advance(TimeSpan.FromSeconds(1));

        await player.OkAsync("Move", new { seq = 3, x = 400, y = 800, dir = "right" });

        var corrected = await player.WaitForAsync("PositionCorrected");
        Assert.Equal(370, corrected.GetProperty("x").GetDouble());
    }

    [Fact]
    public async Task ValidMove_ReachesOthers_StaleSeqIgnored()
    {
        await using var mover = await App.ConnectAsync();
        await mover.OkAsync("JoinLake");
        await using var watcher = await App.ConnectAsync();
        await watcher.OkAsync("JoinLake");
        App.Clock.Advance(TimeSpan.FromMilliseconds(500));

        await mover.OkAsync("Move", new { seq = 5, x = 200, y = 976, dir = "right" });
        await mover.OkAsync("Move", new { seq = 4, x = 210, y = 976, dir = "right" });

        var moved = await watcher.WaitForAsync("PlayerMoved");
        Assert.Equal(200, moved.GetProperty("x").GetDouble());
        Assert.Single(watcher.Received, item => item.Name == "PlayerMoved");
    }

    [Fact]
    public async Task SeatedPlayer_LeavingRoamRadius_IsCorrected()
    {
        await using var player = await App.ConnectAsync(await App.NewPlayerAsync(1000));
        await player.OkAsync("JoinLake");
        await player.OkAsync("BuySeatTicket", new { seatId = "seat-01", durationUnits = 1, expectedPriceVersion = PriceVersion });
        App.Clock.Advance(TimeSpan.FromSeconds(1));
        player.Received.Clear();

        await player.OkAsync("Move", new { seq = 10, x = 564, y = 240, dir = "right" });

        var corrected = await player.WaitForAsync("PositionCorrected");
        Assert.Equal(464, corrected.GetProperty("x").GetDouble());
    }

    [Fact]
    public async Task TooManyMoves_AreRateLimited()
    {
        await using var player = await App.ConnectAsync();
        await player.OkAsync("JoinLake");

        for (var seq = 1; seq <= 20; seq++)
            await player.OkAsync("Move", new { seq, x = 144, y = 976, dir = "down" });

        Assert.Equal("RATE_LIMITED", await player.ErrorAsync("Move", new { seq = 21, x = 144, y = 976, dir = "down" }));
    }
}

public sealed class SeatTests(PostgresServer postgres) : GameTestBase(postgres)
{
    private static object BuyArgs(string seatId, int units = 1) => new { seatId, durationUnits = units, expectedPriceVersion = PriceVersion };

    private Task<SeatSessionRow> SessionOfAsync(Guid playerId) => App.WithDbAsync(db =>
        db.Set<SeatSessionRow>().AsNoTracking().OrderByDescending(row => row.StartedAt).FirstAsync(row => row.PlayerId == playerId));

    private Task<long> GoldOfAsync(Guid playerId) => App.WithDbAsync(db =>
        db.Set<WalletRow>().Where(row => row.PlayerId == playerId).Select(row => row.Gold).SingleAsync());

    private Task<int> LedgerCountAsync(Guid playerId, string reason) => App.WithDbAsync(db =>
        db.Set<LedgerEntry>().CountAsync(row => row.PlayerId == playerId && row.Reason == reason));

    private Task SweepAsync() => App.Service<SeatSessions>().SweepOnceAsync(default);

    [Fact]
    public async Task TenClientsBuySameSeat_OneWins()
    {
        var players = new List<TestPlayer>();
        for (var i = 0; i < 10; i++)
        {
            var player = await App.ConnectAsync(await App.NewPlayerAsync(1000));
            await player.OkAsync("JoinLake");
            players.Add(player);
        }

        var acks = await Task.WhenAll(players.Select(player => player.InvokeAsync("BuySeatTicket", BuyArgs("seat-11"))));

        Assert.Equal(1, acks.Count(ack => ack.GetProperty("ok").GetBoolean()));
        Assert.All(acks.Where(ack => !ack.GetProperty("ok").GetBoolean()),
            ack => Assert.Equal("SEAT_TAKEN", ack.GetProperty("error").GetProperty("code").GetString()));
        Assert.Equal(1, await App.WithDbAsync(db => db.Set<LedgerEntry>().CountAsync(row => row.Reason == LedgerReasons.SeatPurchase)));
        foreach (var player in players) await player.DisposeAsync();
    }

    [Fact]
    public async Task Buy_ChargesByDuration_AndPublishes()
    {
        await using var buyer = await App.ConnectAsync();
        await buyer.OkAsync("JoinLake");
        await using var watcher = await App.ConnectAsync();
        await watcher.OkAsync("JoinLake");

        var data = await buyer.OkAsync("BuySeatTicket", BuyArgs("seat-11", 2));

        Assert.Equal("80", data.GetProperty("chargedGold").GetString());
        Assert.Equal("20", data.GetProperty("gold").GetString());
        Assert.Equal(20, data.GetProperty("session").GetProperty("purchasedMinutes").GetInt32());
        var seat = await watcher.WaitForAsync("SeatChanged");
        Assert.Equal("occupied", seat.GetProperty("state").GetString());
        await buyer.WaitForAsync("MySeatSession");
        await buyer.WaitForAsync("PositionCorrected");
        var moved = await watcher.WaitForAsync("PlayerMoved");
        Assert.Equal(App.Service<LakeMap>().Seat("seat-11")!.X, moved.GetProperty("x").GetDouble());
    }

    [Fact]
    public async Task SecondSeat_AlreadyHasSeat()
    {
        await using var player = await App.ConnectAsync(await App.NewPlayerAsync(1000));
        await player.OkAsync("BuySeatTicket", BuyArgs("seat-01"));

        Assert.Equal("ALREADY_HAS_SEAT", await player.ErrorAsync("BuySeatTicket", BuyArgs("seat-02")));
    }

    [Fact]
    public async Task NotEnoughGold_SeatStaysFree()
    {
        await using var player = await App.ConnectAsync();

        Assert.Equal("INSUFFICIENT_GOLD", await player.ErrorAsync("BuySeatTicket", BuyArgs("seat-01")));

        var seats = await App.Service<SeatSessions>().SeatViewsAsync(default);
        Assert.Equal("available", seats.Single(seat => seat.SeatId == "seat-01").State);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(int.MaxValue)]
    public async Task BadDuration_IsRejected(int units)
    {
        await using var player = await App.ConnectAsync(await App.NewPlayerAsync(1000));

        Assert.Equal("INVALID_DURATION", await player.ErrorAsync("BuySeatTicket", BuyArgs("seat-01", units)));
    }

    [Fact]
    public async Task StalePriceVersion_IsRejectedBeforeCharging()
    {
        await using var player = await App.ConnectAsync();

        Assert.Equal("PRICE_CHANGED", await player.ErrorAsync("BuySeatTicket", new { seatId = "seat-11", durationUnits = 1, expectedPriceVersion = "old" }));
        Assert.Equal(100, await GoldOfAsync(player.PlayerId));
    }

    [Fact]
    public async Task BuyRetrySameRequest_ChargesOnce()
    {
        await using var player = await App.ConnectAsync();
        var requestId = Guid.NewGuid();

        var first = await player.OkAsync("BuySeatTicket", BuyArgs("seat-11"), requestId);
        var second = await player.OkAsync("BuySeatTicket", BuyArgs("seat-11"), requestId);

        Assert.Equal(first.GetRawText(), second.GetRawText());
        Assert.Equal(60, await GoldOfAsync(player.PlayerId));
    }

    [Fact]
    public async Task Session_EndsAtExpiry_ThenCooldownTenSeconds()
    {
        await using var player = await App.ConnectAsync(await App.NewPlayerAsync(1000));
        await player.OkAsync("JoinLake");
        await player.OkAsync("BuySeatTicket", BuyArgs("seat-11"));

        App.Clock.Advance(TimeSpan.FromMinutes(10) - TimeSpan.FromMilliseconds(1));
        await SweepAsync();
        Assert.Null((await SessionOfAsync(player.PlayerId)).EndedAt);

        App.Clock.AdvanceMs(1);
        await SweepAsync();
        var ended = await SessionOfAsync(player.PlayerId);
        Assert.Equal(SeatEndReasons.Expired, ended.EndReason);
        await player.WaitForAsync("MySeatSession", payload => payload.TryGetProperty("ended", out _));
        await player.WaitForAsync("SeatChanged", payload => payload.GetProperty("state").GetString() == "cooldown");

        Assert.Equal("SEAT_COOLDOWN", await player.ErrorAsync("BuySeatTicket", BuyArgs("seat-11")));

        App.Clock.AdvanceMs(9999);
        await SweepAsync();
        Assert.Equal("cooldown", (await App.Service<SeatSessions>().SeatViewsAsync(default)).Single(s => s.SeatId == "seat-11").State);

        App.Clock.AdvanceMs(1);
        await SweepAsync();
        Assert.Equal("available", (await App.Service<SeatSessions>().SeatViewsAsync(default)).Single(s => s.SeatId == "seat-11").State);
        await player.WaitForAsync("SeatChanged", payload => payload.GetProperty("state").GetString() == "available");
    }

    [Fact]
    public async Task LeaveSeat_EndsSession_AndWithoutSeatFails()
    {
        await using var player = await App.ConnectAsync(await App.NewPlayerAsync(1000));
        await player.OkAsync("JoinLake");
        await player.OkAsync("BuySeatTicket", BuyArgs("seat-11"));

        await player.OkAsync("LeaveSeat");

        Assert.Equal(SeatEndReasons.LeftSeat, (await SessionOfAsync(player.PlayerId)).EndReason);
        Assert.Equal("SEAT_COOLDOWN", await player.ErrorAsync("BuySeatTicket", BuyArgs("seat-11")));
        Assert.Equal("NOT_IN_SEAT", await player.ErrorAsync("LeaveSeat"));
    }

    [Fact]
    public async Task Disconnect60s_KeepsSeat_ExpiryUnchanged()
    {
        var playerId = await App.NewPlayerAsync(1000);
        var first = await App.ConnectAsync(playerId);
        await first.OkAsync("JoinLake");
        var bought = await first.OkAsync("BuySeatTicket", BuyArgs("seat-11", 3));
        await first.DisposeAsync();
        await WaitDisconnectedAsync(playerId);

        App.Clock.Advance(TimeSpan.FromSeconds(60));
        await SweepAsync();
        await using var second = await App.ConnectAsync(playerId);
        var snapshot = await second.OkAsync("JoinLake");

        Assert.Equal(bought.GetProperty("session").GetProperty("expiresAt").GetDateTimeOffset(), snapshot.GetProperty("mySession").GetProperty("expiresAt").GetDateTimeOffset());
        Assert.Null((await SessionOfAsync(playerId)).DisconnectedAt);
        Assert.Equal("seat-11", Assert.Single(snapshot.GetProperty("players").EnumerateArray()).GetProperty("seatId").GetString());
    }

    [Fact]
    public async Task Disconnect125s_LosesSeat_IntoCooldown()
    {
        var playerId = await App.NewPlayerAsync(1000);
        var first = await App.ConnectAsync(playerId);
        await first.OkAsync("JoinLake");
        await using var watcher = await App.ConnectAsync();
        await watcher.OkAsync("JoinLake");
        await first.OkAsync("BuySeatTicket", BuyArgs("seat-11", 3));
        await first.DisposeAsync();
        await WaitDisconnectedAsync(playerId);

        App.Clock.Advance(TimeSpan.FromSeconds(125));
        await SweepAsync();

        Assert.Equal(SeatEndReasons.DisconnectTimeout, (await SessionOfAsync(playerId)).EndReason);
        Assert.Equal("cooldown", (await App.Service<SeatSessions>().SeatViewsAsync(default)).Single(s => s.SeatId == "seat-11").State);
        await watcher.WaitForAsync("PlayerLeft");
    }

    [Fact]
    public async Task DisconnectWithoutSeat_LeavesRoomImmediately()
    {
        var leaving = await App.ConnectAsync();
        await leaving.OkAsync("JoinLake");
        await using var watcher = await App.ConnectAsync();
        await watcher.OkAsync("JoinLake");

        await leaving.DisposeAsync();

        Assert.Equal(leaving.PlayerId, (await watcher.WaitForAsync("PlayerLeft")).GetProperty("playerId").GetGuid());
    }

    [Theory]
    [InlineData(30, false)]
    [InlineData(180, true)]
    public async Task Restart_KeepsOrLosesSeatByDowntime(int downtimeSeconds, bool lost)
    {
        var playerId = await App.NewPlayerAsync(1000);
        await App.Service<SeatSessions>().BuyAsync(playerId, Guid.NewGuid(), "seat-11", 1, PriceVersion, default);
        await App.Service<SeatSessions>().WriteHeartbeatAsync(default);
        await App.DisposeAsync();

        var clock = new ManualClock(App.Clock.GetUtcNow() + TimeSpan.FromSeconds(downtimeSeconds));
        var restarted = StartApp(clock);

        var session = await restarted.WithDbAsync(db => db.Set<SeatSessionRow>().AsNoTracking().SingleAsync(row => row.PlayerId == playerId));
        Assert.Equal(lost, session.EndedAt is not null);
        if (lost) Assert.Equal(SeatEndReasons.DisconnectTimeout, session.EndReason);
        else Assert.NotNull(session.DisconnectedAt);
    }

    [Fact]
    public async Task Extend_AddsToExpiry_RetryChargesOnce()
    {
        await using var player = await App.ConnectAsync(await App.NewPlayerAsync(1000));
        var bought = await player.OkAsync("BuySeatTicket", BuyArgs("seat-11", 2));
        var session = bought.GetProperty("session");
        var startedAt = session.GetProperty("startedAt").GetDateTimeOffset();
        var extendArgs = new { sessionId = session.GetProperty("sessionId").GetGuid(), durationUnits = 1, expectedPriceVersion = PriceVersion };
        var requestId = Guid.NewGuid();
        App.Clock.Advance(TimeSpan.FromMinutes(5));

        var first = await player.OkAsync("ExtendSeatSession", extendArgs, requestId);
        var second = await player.OkAsync("ExtendSeatSession", extendArgs, requestId);

        Assert.Equal(first.GetRawText(), second.GetRawText());
        var extended = first.GetProperty("session");
        Assert.Equal(startedAt + TimeSpan.FromMinutes(30), extended.GetProperty("expiresAt").GetDateTimeOffset());
        Assert.Equal(startedAt, extended.GetProperty("startedAt").GetDateTimeOffset());
        Assert.Equal(30, extended.GetProperty("purchasedMinutes").GetInt32());
        Assert.Equal(2, extended.GetProperty("sessionVersion").GetInt32());
        Assert.Equal(1, await LedgerCountAsync(player.PlayerId, LedgerReasons.SeatExtension));
        Assert.Equal(1100 - 80 - 40, await GoldOfAsync(player.PlayerId));
    }

    [Fact]
    public async Task Extend_NotEnoughGold_KeepsExpiry()
    {
        await using var player = await App.ConnectAsync();
        var bought = await player.OkAsync("BuySeatTicket", BuyArgs("seat-11", 2));
        var sessionId = bought.GetProperty("session").GetProperty("sessionId").GetGuid();
        var expiresAt = (await SessionOfAsync(player.PlayerId)).ExpiresAt;

        Assert.Equal("INSUFFICIENT_GOLD", await player.ErrorAsync("ExtendSeatSession", new { sessionId, durationUnits = 1, expectedPriceVersion = PriceVersion }));

        Assert.Equal(expiresAt, (await SessionOfAsync(player.PlayerId)).ExpiresAt);
    }

    [Fact]
    public async Task Extend_AfterExpiryOrLeaving_IsRejected()
    {
        await using var player = await App.ConnectAsync(await App.NewPlayerAsync(1000));
        var bought = await player.OkAsync("BuySeatTicket", BuyArgs("seat-11"));
        var sessionId = bought.GetProperty("session").GetProperty("sessionId").GetGuid();
        var args = new { sessionId, durationUnits = 1, expectedPriceVersion = PriceVersion };

        App.Clock.Advance(TimeSpan.FromMinutes(10));
        Assert.Equal("SEAT_SESSION_EXPIRED", await player.ErrorAsync("ExtendSeatSession", args));

        await SweepAsync();
        Assert.Equal("SEAT_SESSION_EXPIRED", await player.ErrorAsync("ExtendSeatSession", args));
    }

    [Fact]
    public async Task Extend_StalePrice_IsRejected()
    {
        await using var player = await App.ConnectAsync(await App.NewPlayerAsync(1000));
        var bought = await player.OkAsync("BuySeatTicket", BuyArgs("seat-11"));
        var sessionId = bought.GetProperty("session").GetProperty("sessionId").GetGuid();

        Assert.Equal("PRICE_CHANGED", await player.ErrorAsync("ExtendSeatSession", new { sessionId, durationUnits = 1, expectedPriceVersion = "old" }));
    }

    [Fact]
    public async Task Extend_RacingExpiryTimer_HasOneConsistentResult()
    {
        for (var round = 0; round < 5; round++)
        {
            var playerId = await App.NewPlayerAsync(1000);
            var seatId = $"seat-{round + 11}";
            var seats = App.Service<SeatSessions>();
            var bought = await seats.BuyAsync(playerId, Guid.NewGuid(), seatId, 1, PriceVersion, default);
            App.Clock.Advance(TimeSpan.FromMinutes(10) - TimeSpan.FromMilliseconds(1));

            var extend = seats.ExtendCommandAsync(playerId, Guid.NewGuid(), bought.Session.SessionId, 1, PriceVersion, default);
            var sweep = seats.SweepOnceAsync(default);
            App.Clock.AdvanceMs(1);
            var sweepLate = seats.SweepOnceAsync(default);
            var extended = await extend.ContinueWith(task => task.IsCompletedSuccessfully);
            await sweep;
            await sweepLate;

            var session = await SessionOfAsync(playerId);
            if (extended) Assert.Null(session.EndedAt);
            else Assert.NotNull(session.EndedAt);
            if (session.EndedAt is null) await App.Service<ISeatSessions>().EndAsync(playerId, SeatEndReasons.LeftSeat, default);
        }
    }

    private async Task WaitDisconnectedAsync(Guid playerId)
    {
        for (var i = 0; i < 500; i++)
        {
            if ((await SessionOfAsync(playerId)).DisconnectedAt is not null) return;
            await Task.Delay(10);
        }
        throw new TimeoutException("Disconnect was not recorded.");
    }
}
