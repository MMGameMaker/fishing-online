using System.Text.Json;
using FishingOnline.Api.Modules.Lake;
using FishingOnline.Api.Modules.Wallet;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;

namespace FishingOnline.Api.Tests;

public sealed class LakeLayoutTests
{
    private static readonly LakeLayout Layout = new("lake-01", "1", 20);

    [Fact]
    public void Seats_AreNumberedFromOne()
    {
        Assert.Equal(20, Layout.Seats.Count);
        Assert.Equal("seat-01", Layout.Seats[0].SeatId);
        Assert.Equal("seat-20", Layout.Seats[^1].SeatId);
    }

    [Fact]
    public void Seat_LookupByIdAndUnknown()
    {
        Assert.Equal(1, Layout.Seat("seat-01")!.Number);
        Assert.Null(Layout.Seat("seat-99"));
        Assert.Null(Layout.Seat("seat-00"));
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
    public async Task Move_IsTrusted_AnyPositionReachesOthers()
    {
        await using var mover = await App.ConnectAsync();
        await mover.OkAsync("JoinLake");
        await using var watcher = await App.ConnectAsync();
        await watcher.OkAsync("JoinLake");

        await mover.OkAsync("Move", new { seq = 1, x = 5000, y = -300, dir = "left" });

        var moved = await watcher.WaitForAsync("PlayerMoved");
        Assert.Equal(5000, moved.GetProperty("x").GetDouble());
        Assert.Equal(-300, moved.GetProperty("y").GetDouble());
        Assert.Equal("left", moved.GetProperty("dir").GetString());
        Assert.DoesNotContain(mover.Received, item => item.Name == "PositionCorrected");
    }

    [Fact]
    public async Task SeatedPlayer_CanReportPosition()
    {
        await using var player = await App.ConnectAsync(await App.NewPlayerAsync(1000));
        await player.OkAsync("JoinLake");
        await using var watcher = await App.ConnectAsync();
        await watcher.OkAsync("JoinLake");
        await SitAsync(player, "seat-01");

        await player.OkAsync("Move", new { seq = 10, x = 470, y = 240, dir = "right" });

        var moved = await watcher.WaitForAsync("PlayerMoved");
        Assert.Equal(470, moved.GetProperty("x").GetDouble());
    }

    [Fact]
    public async Task JoinLake_WithPosition_IsSeenByOthers()
    {
        await using var first = await App.ConnectAsync();
        await first.OkAsync("JoinLake", new { x = 300, y = 400, dir = "up" });
        await using var second = await App.ConnectAsync();

        var snapshot = await second.OkAsync("JoinLake");

        var other = Players(snapshot).Single(player => player.GetProperty("playerId").GetGuid() == first.PlayerId);
        Assert.Equal(300, other.GetProperty("x").GetDouble());
        Assert.Equal(400, other.GetProperty("y").GetDouble());
        Assert.Equal("up", other.GetProperty("dir").GetString());
        var joined = await first.WaitForAsync("PlayerJoined");
        Assert.Equal(second.PlayerId, joined.GetProperty("playerId").GetGuid());
    }

    [Fact]
    public async Task JoinLake_PositionMustBeComplete()
    {
        await using var player = await App.ConnectAsync();

        Assert.Equal("VALIDATION_FAILED", await player.ErrorAsync("JoinLake", new { x = 300 }));
        Assert.Equal("VALIDATION_FAILED", await player.ErrorAsync("JoinLake", new { x = 1, y = 2, dir = "sideways" }));
    }

    [Fact]
    public async Task Move_WithBadDirection_IsRejected()
    {
        await using var player = await App.ConnectAsync();
        await player.OkAsync("JoinLake");

        Assert.Equal("VALIDATION_FAILED", await player.ErrorAsync("Move", new { seq = 1, x = 1, y = 1, dir = "sideways" }));
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

public sealed class TicketTests(PostgresServer postgres) : GameTestBase(postgres)
{
    private Task<TicketRow?> TicketOfAsync(Guid playerId) => App.WithDbAsync(db =>
        db.Set<TicketRow>().AsNoTracking().SingleOrDefaultAsync(row => row.PlayerId == playerId));

    private Task<long> GoldOfAsync(Guid playerId) => App.WithDbAsync(db =>
        db.Set<WalletRow>().Where(row => row.PlayerId == playerId).Select(row => row.Gold).SingleAsync());

    [Fact]
    public async Task Buy_ChargesByQuantity_AndSendsMyTicket()
    {
        await using var buyer = await App.ConnectAsync();
        await buyer.OkAsync("JoinLake");
        var now = App.Clock.GetUtcNow();

        var data = await buyer.OkAsync("BuyTicket", TicketArgs(2));

        Assert.Equal("100", data.GetProperty("chargedGold").GetString());
        Assert.Equal("0", data.GetProperty("gold").GetString());
        var ticket = data.GetProperty("ticket");
        Assert.Equal(20, ticket.GetProperty("purchasedMinutes").GetInt32());
        Assert.Equal(now + TimeSpan.FromMinutes(20), ticket.GetProperty("expiresAt").GetDateTimeOffset(), TimeSpan.FromMilliseconds(1));
        await buyer.WaitForAsync("MyTicket");
        Assert.Equal(1, await App.WithDbAsync(db => db.Set<LedgerEntry>().CountAsync(row => row.PlayerId == buyer.PlayerId && row.Reason == LedgerReasons.TicketPurchase)));
        Assert.Equal(1, await App.WithDbAsync(db => db.Set<TicketPurchaseRow>().CountAsync(row => row.PlayerId == buyer.PlayerId)));
    }

    [Fact]
    public async Task BuyWhileValid_AddsOnTop_EvenPastSixtyMinutes()
    {
        await using var player = await App.ConnectAsync(await App.NewPlayerAsync(1000));
        var first = await player.OkAsync("BuyTicket", TicketArgs(6));
        var expiresAt = first.GetProperty("ticket").GetProperty("expiresAt").GetDateTimeOffset();
        App.Clock.Advance(TimeSpan.FromMinutes(5));

        var second = await player.OkAsync("BuyTicket", TicketArgs(1));

        var ticket = second.GetProperty("ticket");
        Assert.Equal(expiresAt + TimeSpan.FromMinutes(10), ticket.GetProperty("expiresAt").GetDateTimeOffset());
        Assert.Equal(70, ticket.GetProperty("purchasedMinutes").GetInt32());
        Assert.Equal(2, ticket.GetProperty("ticketVersion").GetInt32());
        Assert.Equal(65 * 60_000, Math.Round((ticket.GetProperty("expiresAt").GetDateTimeOffset() - App.Clock.GetUtcNow()).TotalMilliseconds));
    }

    [Fact]
    public async Task BuyAfterExpiry_StartsFromNow()
    {
        await using var player = await App.ConnectAsync(await App.NewPlayerAsync(1000));
        await player.OkAsync("BuyTicket", TicketArgs(1));
        App.Clock.Advance(TimeSpan.FromMinutes(30));
        var now = App.Clock.GetUtcNow();

        var data = await player.OkAsync("BuyTicket", TicketArgs(1));

        Assert.Equal(now + TimeSpan.FromMinutes(10), data.GetProperty("ticket").GetProperty("expiresAt").GetDateTimeOffset(), TimeSpan.FromMilliseconds(1));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(7)]
    public async Task QuantityOutsideOneToSix_IsRejected(int quantity)
    {
        await using var player = await App.ConnectAsync(await App.NewPlayerAsync(1000));

        Assert.Equal("INVALID_QUANTITY", await player.ErrorAsync("BuyTicket", TicketArgs(quantity)));
        Assert.Null(await TicketOfAsync(player.PlayerId));
    }

    [Fact]
    public async Task StalePriceVersion_IsRejectedBeforeCharging()
    {
        await using var player = await App.ConnectAsync();

        Assert.Equal("PRICE_CHANGED", await player.ErrorAsync("BuyTicket", new { quantity = 1, expectedPriceVersion = "old" }));
        Assert.Equal(100, await GoldOfAsync(player.PlayerId));
    }

    [Fact]
    public async Task NotEnoughGold_NoTicket()
    {
        await using var player = await App.ConnectAsync();

        Assert.Equal("INSUFFICIENT_GOLD", await player.ErrorAsync("BuyTicket", TicketArgs(3)));

        Assert.Null(await TicketOfAsync(player.PlayerId));
        Assert.Equal(100, await GoldOfAsync(player.PlayerId));
    }

    [Fact]
    public async Task RetrySameRequest_ChargesOnce()
    {
        await using var player = await App.ConnectAsync();
        var requestId = Guid.NewGuid();

        var first = await player.OkAsync("BuyTicket", TicketArgs(1), requestId);
        var second = await player.OkAsync("BuyTicket", TicketArgs(1), requestId);

        Assert.Equal(first.GetRawText(), second.GetRawText());
        Assert.Equal(50, await GoldOfAsync(player.PlayerId));
        Assert.Equal(10, (await TicketOfAsync(player.PlayerId))!.PurchasedMinutes);
    }
}

public sealed class SeatTests(PostgresServer postgres) : GameTestBase(postgres)
{
    private Task<SeatSessionRow> SessionOfAsync(Guid playerId) => App.WithDbAsync(db =>
        db.Set<SeatSessionRow>().AsNoTracking().OrderByDescending(row => row.StartedAt).FirstAsync(row => row.PlayerId == playerId));

    private Task SweepAsync() => App.Service<SeatSessions>().SweepOnceAsync(default);

    private async Task<string> SeatStateAsync(string seatId) =>
        (await App.Service<SeatSessions>().SeatViewsAsync(default)).Single(seat => seat.SeatId == seatId).State;

    private async Task<TestPlayer> InLakeAsync(Guid? playerId = null)
    {
        var player = await App.ConnectAsync(playerId ?? await App.NewPlayerAsync(1000));
        await player.OkAsync("JoinLake");
        return player;
    }

    [Fact]
    public async Task TenClientsSitOnSameSeat_OneWins()
    {
        var players = new List<TestPlayer>();
        for (var i = 0; i < 10; i++)
        {
            var player = await InLakeAsync();
            await player.OkAsync("BuyTicket", TicketArgs());
            players.Add(player);
        }

        var acks = await Task.WhenAll(players.Select(player => player.InvokeAsync("SitDown", new { seatId = "seat-11" })));

        Assert.Equal(1, acks.Count(ack => ack.GetProperty("ok").GetBoolean()));
        Assert.All(acks.Where(ack => !ack.GetProperty("ok").GetBoolean()),
            ack => Assert.Equal("SEAT_TAKEN", ack.GetProperty("error").GetProperty("code").GetString()));
        foreach (var player in players) await player.DisposeAsync();
    }

    [Fact]
    public async Task Sit_Publishes_SeatAndMySeat()
    {
        await using var sitter = await InLakeAsync();
        await using var watcher = await InLakeAsync();

        var data = await SitAsync(sitter, "seat-11");

        Assert.Equal("seat-11", data.GetProperty("seat").GetProperty("seatId").GetString());
        var seat = await watcher.WaitForAsync("SeatChanged");
        Assert.Equal("occupied", seat.GetProperty("state").GetString());
        Assert.Equal(sitter.PlayerId, seat.GetProperty("occupantPlayerId").GetGuid());
        await sitter.WaitForAsync("MySeat");
    }

    [Fact]
    public async Task Sit_WithoutTicket_NoTicket_ThenAfterBuyingWorks()
    {
        await using var player = await InLakeAsync();

        Assert.Equal("NO_TICKET", await player.ErrorAsync("SitDown", new { seatId = "seat-11" }));

        await player.OkAsync("BuyTicket", TicketArgs());
        await player.OkAsync("SitDown", new { seatId = "seat-11" });
        Assert.Equal("occupied", await SeatStateAsync("seat-11"));
    }

    [Fact]
    public async Task Sit_DoesNotCheckDistance()
    {
        await using var player = await InLakeAsync();
        await player.OkAsync("BuyTicket", TicketArgs());

        await player.OkAsync("SitDown", new { seatId = "seat-11" });

        Assert.Equal("occupied", await SeatStateAsync("seat-11"));
    }

    [Fact]
    public async Task Sit_WithExpiredTicket_NoTicket()
    {
        await using var player = await InLakeAsync();
        await player.OkAsync("BuyTicket", TicketArgs());
        App.Clock.Advance(TimeSpan.FromMinutes(10));

        Assert.Equal("NO_TICKET", await player.ErrorAsync("SitDown", new { seatId = "seat-11" }));
    }

    [Fact]
    public async Task SecondSeat_AlreadyHasSeat_SameSeatReturnsIt()
    {
        await using var player = await InLakeAsync();
        var first = await SitAsync(player, "seat-01");

        Assert.Equal("ALREADY_HAS_SEAT", await player.ErrorAsync("SitDown", new { seatId = "seat-02" }));
        var again = await player.OkAsync("SitDown", new { seatId = "seat-01" });
        Assert.Equal(first.GetRawText(), again.GetRawText());
    }

    [Fact]
    public async Task LeaveSeat_FreesSeatAtOnce_TicketStays()
    {
        await using var player = await InLakeAsync();
        await SitAsync(player, "seat-11");

        await player.OkAsync("LeaveSeat");

        Assert.Equal(SeatEndReasons.LeftSeat, (await SessionOfAsync(player.PlayerId)).EndReason);
        Assert.Equal("available", await SeatStateAsync("seat-11"));
        await player.WaitForAsync("MySeat", payload => payload.TryGetProperty("ended", out _));
        Assert.Equal("NOT_IN_SEAT", await player.ErrorAsync("LeaveSeat"));
        await SitAsync(player, "seat-11", tickets: 0);
        Assert.Equal("occupied", await SeatStateAsync("seat-11"));
    }

    [Fact]
    public async Task TicketExpiry_StandsUpSeatedPlayer()
    {
        await using var player = await InLakeAsync();
        await SitAsync(player, "seat-11");

        App.Clock.Advance(TimeSpan.FromMinutes(10) - TimeSpan.FromMilliseconds(1));
        await SweepAsync();
        Assert.Null((await SessionOfAsync(player.PlayerId)).EndedAt);

        App.Clock.AdvanceMs(1);
        await SweepAsync();

        Assert.Equal(SeatEndReasons.TicketExpired, (await SessionOfAsync(player.PlayerId)).EndReason);
        var ended = await player.WaitForAsync("MySeat", payload => payload.TryGetProperty("ended", out _));
        Assert.Equal("ticket_expired", ended.GetProperty("reason").GetString());
        Assert.Equal("available", await SeatStateAsync("seat-11"));
    }

    [Fact]
    public async Task Disconnect60s_KeepsSeat_TicketUnchanged()
    {
        var playerId = await App.NewPlayerAsync(1000);
        var first = await InLakeAsync(playerId);
        var bought = await first.OkAsync("BuyTicket", TicketArgs(3));
        await SitAsync(first, "seat-11", tickets: 0);
        await first.DisposeAsync();
        await WaitDisconnectedAsync(playerId);

        App.Clock.Advance(TimeSpan.FromSeconds(60));
        await SweepAsync();
        await using var second = await App.ConnectAsync(playerId);
        var snapshot = await second.OkAsync("JoinLake");

        Assert.Equal(bought.GetProperty("ticket").GetProperty("expiresAt").GetDateTimeOffset(), snapshot.GetProperty("myTicket").GetProperty("expiresAt").GetDateTimeOffset());
        Assert.Equal("seat-11", snapshot.GetProperty("mySeat").GetProperty("seatId").GetString());
        Assert.Null((await SessionOfAsync(playerId)).DisconnectedAt);
        Assert.Equal("seat-11", Assert.Single(snapshot.GetProperty("players").EnumerateArray()).GetProperty("seatId").GetString());
    }

    [Fact]
    public async Task Disconnect125s_LosesSeat_SeatFreeAtOnce()
    {
        var playerId = await App.NewPlayerAsync(1000);
        var first = await InLakeAsync(playerId);
        await using var watcher = await InLakeAsync();
        await SitAsync(first, "seat-11", tickets: 3);
        await first.DisposeAsync();
        await WaitDisconnectedAsync(playerId);

        App.Clock.Advance(TimeSpan.FromSeconds(125));
        await SweepAsync();

        Assert.Equal(SeatEndReasons.DisconnectTimeout, (await SessionOfAsync(playerId)).EndReason);
        Assert.Equal("available", await SeatStateAsync("seat-11"));
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
        await using (var player = await InLakeAsync(playerId))
            await SitAsync(player, "seat-11", tickets: 3);
        await App.Service<SeatSessions>().WriteHeartbeatAsync(default);
        await App.DisposeAsync();

        var clock = new ManualClock(App.Clock.GetUtcNow() + TimeSpan.FromSeconds(downtimeSeconds));
        var restarted = StartApp(clock);

        var session = await restarted.WithDbAsync(db => db.Set<SeatSessionRow>().AsNoTracking().SingleAsync(row => row.PlayerId == playerId));
        Assert.Equal(lost, session.EndedAt is not null);
        if (lost) Assert.Equal(SeatEndReasons.DisconnectTimeout, session.EndReason);
        else Assert.NotNull(session.DisconnectedAt);
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
