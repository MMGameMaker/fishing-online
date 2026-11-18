using System.Text.Json;
using FishingOnline.Api.Modules.Lake;

namespace FishingOnline.Api.Tests;

/// <summary>Chỗ ngồi chơi (ghế quanh bàn, không câu; yêu cầu 2026-11-18): Server giữ chỗ, không ai ngồi chồng.</summary>
public sealed class RestSeatTests(PostgresServer postgres) : GameTestBase(postgres)
{
    private GameApp? app;

    private GameApp RestApp => app ??= StartApp(settings: new Dictionary<string, string> { ["Lake:RestSeatCount"] = "4" });

    private async Task<TestPlayer> InLakeAsync()
    {
        var player = await RestApp.ConnectAsync(await RestApp.NewPlayerAsync(1000));
        await player.OkAsync("JoinLake");
        return player;
    }

    private static object Sit(string restSeatId, double x = 100, double y = 200) =>
        new { restSeatId, x, y, dir = "right" };

    private static string? RestOf(JsonElement view) =>
        view.TryGetProperty("restSeatId", out var rest) && rest.ValueKind == JsonValueKind.String ? rest.GetString() : null;

    private Task<RoomPlayer?> RoomPlayerAsync(Guid playerId)
    {
        var room = RestApp.Service<LakeRoom>();
        return room.Queue.RunAsync(() => Task.FromResult(room.Find(playerId)));
    }

    [Fact]
    public void Layout_KnowsRestSeats()
    {
        var layout = new LakeLayout("fishing-pier", "pier-3", 38, 28);
        Assert.True(layout.IsRestSeat("rest-01"));
        Assert.True(layout.IsRestSeat("rest-28"));
        Assert.False(layout.IsRestSeat("rest-29"));
        Assert.False(layout.IsRestSeat("seat-01"));
    }

    [Fact]
    public async Task Sit_HoldsSeat_PublishesToEveryone_AndPlacesPlayer()
    {
        await using var sitter = await InLakeAsync();
        await using var watcher = await InLakeAsync();

        await sitter.OkAsync("SitRest", Sit("rest-02", 137, 598));

        var seen = await watcher.WaitForAsync("PlayerJoined", view => RestOf(view) == "rest-02");
        Assert.Equal(sitter.PlayerId, seen.GetProperty("playerId").GetGuid());
        Assert.Equal(137, seen.GetProperty("x").GetDouble());
        // Người ngồi cũng nhận PlayerView của mình để Client đặt nhân vật vào ghế.
        await sitter.WaitForAsync("PlayerJoined", view => view.GetProperty("playerId").GetGuid() == sitter.PlayerId && RestOf(view) == "rest-02");
        Assert.Equal("rest-02", (await RoomPlayerAsync(sitter.PlayerId))!.RestSeatId);
    }

    [Fact]
    public async Task TakenSeat_SeatTaken_OtherHalfOfBenchWorks()
    {
        await using var first = await InLakeAsync();
        await using var second = await InLakeAsync();

        await first.OkAsync("SitRest", Sit("rest-01"));

        Assert.Equal("SEAT_TAKEN", await second.ErrorAsync("SitRest", Sit("rest-01")));
        await second.OkAsync("SitRest", Sit("rest-02"));
    }

    [Fact]
    public async Task ManyClientsSitOnSameSeat_OneWins()
    {
        var players = new List<TestPlayer>();
        for (var i = 0; i < 6; i++) players.Add(await InLakeAsync());

        var acks = await Task.WhenAll(players.Select(player => player.InvokeAsync("SitRest", Sit("rest-03"))));

        Assert.Equal(1, acks.Count(ack => ack.GetProperty("ok").GetBoolean()));
        Assert.All(acks.Where(ack => !ack.GetProperty("ok").GetBoolean()),
            ack => Assert.Equal("SEAT_TAKEN", ack.GetProperty("error").GetProperty("code").GetString()));
        foreach (var player in players) await player.DisposeAsync();
    }

    [Fact]
    public async Task StandRest_FreesSeat()
    {
        await using var first = await InLakeAsync();
        await using var second = await InLakeAsync();
        await first.OkAsync("SitRest", Sit("rest-01"));

        await first.OkAsync("StandRest", new { });

        Assert.Null((await RoomPlayerAsync(first.PlayerId))!.RestSeatId);
        await second.OkAsync("SitRest", Sit("rest-01"));
    }

    [Fact]
    public async Task MovingAway_FreesSeat_StayingDoesNot()
    {
        await using var player = await InLakeAsync();
        await player.OkAsync("SitRest", Sit("rest-01", 100, 200));

        await player.OkAsync("Move", new { seq = 1, x = 100.0, y = 200.0, dir = "right" });
        Assert.Equal("rest-01", (await RoomPlayerAsync(player.PlayerId))!.RestSeatId);

        await player.OkAsync("Move", new { seq = 2, x = 110.0, y = 200.0, dir = "right" });
        Assert.Null((await RoomPlayerAsync(player.PlayerId))!.RestSeatId);
    }

    [Fact]
    public async Task LeavingLake_FreesSeat()
    {
        await using var second = await InLakeAsync();
        var first = await InLakeAsync();
        await first.OkAsync("SitRest", Sit("rest-04"));

        await first.DisposeAsync();
        await second.WaitForAsync("PlayerLeft");

        await second.OkAsync("SitRest", Sit("rest-04"));
    }

    [Fact]
    public async Task UnknownSeat_ValidationFailed()
    {
        await using var player = await InLakeAsync();
        Assert.Equal("VALIDATION_FAILED", await player.ErrorAsync("SitRest", Sit("rest-05")));
        Assert.Equal("VALIDATION_FAILED", await player.ErrorAsync("SitRest", Sit("seat-01")));
    }

    [Fact]
    public async Task FishingSeat_And_RestSeat_NotAtOnce()
    {
        await using var player = await InLakeAsync();
        await player.OkAsync("SitRest", Sit("rest-01"));
        await player.OkAsync("BuyTicket", TicketArgs());

        // Ngồi ghế câu thì trả chỗ ngồi chơi; đang ngồi ghế câu thì không ngồi chơi được.
        await player.OkAsync("SitDown", new { seatId = "seat-01" });
        Assert.Null((await RoomPlayerAsync(player.PlayerId))!.RestSeatId);
        Assert.Equal("ALREADY_HAS_SEAT", await player.ErrorAsync("SitRest", Sit("rest-01")));
    }
}
