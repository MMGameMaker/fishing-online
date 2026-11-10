using FishingOnline.Api.Modules.Economy;
using FishingOnline.Api.Modules.Fishing;
using Microsoft.EntityFrameworkCore;

namespace FishingOnline.Api.Tests;

public sealed class PopulationTests(PostgresServer postgres) : GameTestBase(postgres)
{
    private FishingService Fishing => App.Service<FishingService>();

    private FishPopulation Population => App.Service<FishPopulation>();

    /// <summary>Đặt thẳng tồn cho test; chỉ loài được nêu còn cá.</summary>
    private Task OnlyAsync(string speciesId, int remaining, int reserved = 0) => App.WithDbAsync(db =>
        db.Set<LakeFishPopulation>().ExecuteUpdateAsync(setters => setters
            .SetProperty(row => row.Remaining, row => row.SpeciesId == speciesId ? remaining : 0)
            .SetProperty(row => row.Reserved, row => row.SpeciesId == speciesId ? reserved : 0)));

    private Task<LakeFishPopulation> RowAsync(string speciesId) =>
        App.WithDbAsync(db => db.Set<LakeFishPopulation>().AsNoTracking().SingleAsync(row => row.SpeciesId == speciesId));

    private Task<FishingAttemptRow> AttemptAsync(Guid attemptId) =>
        App.WithDbAsync(db => db.Set<FishingAttemptRow>().AsNoTracking().SingleAsync(row => row.AttemptId == attemptId));

    private async Task<(TestPlayer Player, Guid AttemptId)> CastAsync(string seatId)
    {
        var player = await App.ConnectAsync(await App.NewPlayerAsync(1000));
        await player.OkAsync("JoinLake");
        await SitAsync(player, seatId);
        return (player, (await player.OkAsync("CastLine")).GetProperty("attemptId").GetGuid());
    }

    private async Task TickAfterAsync(double ms)
    {
        App.Clock.AdvanceMs(ms);
        await Fishing.TickOnceAsync(default);
    }

    [Fact]
    public async Task Seed_UsesApprovedStockPerRarity_AndDoesNotResetOnRestart()
    {
        Assert.Equal(200, (await RowAsync("perch")).Remaining);
        Assert.Equal(3, (await RowAsync("moonfin")).Remaining);
        await OnlyAsync("perch", 7);

        await Population.EnsureSeededAsync(default);

        Assert.Equal(7, (await RowAsync("perch")).Remaining);
    }

    [Fact]
    public async Task OneFish_TwoAttempts_OnlyOneCanCatch()
    {
        await OnlyAsync("perch", 1);
        var (first, firstAttempt) = await CastAsync("seat-11");
        var (second, secondAttempt) = await CastAsync("seat-12");

        await TickAfterAsync(6000);

        var phases = new[] { (await AttemptAsync(firstAttempt)).Phase, (await AttemptAsync(secondAttempt)).Phase };
        Assert.Equal(["bite", "waiting"], phases.Order());
        Assert.Equal(1, (await RowAsync("perch")).Reserved);

        var (winner, winnerAttempt) = phases[0] == "bite" ? (first, firstAttempt) : (second, secondAttempt);
        var (loser, loserAttempt) = phases[0] == "bite" ? (second, secondAttempt) : (first, firstAttempt);
        await winner.OkAsync("HookFish", new { attemptId = winnerAttempt });
        await winner.OkAsync("SubmitFishingResult", new { attemptId = winnerAttempt, outcome = "success" });
        await TickAfterAsync(2000);

        var perch = await RowAsync("perch");
        Assert.Equal(0, perch.Remaining);
        Assert.Equal(0, perch.Reserved);
        Assert.Equal("waiting", (await AttemptAsync(loserAttempt)).Phase);
        Assert.Equal(1, await App.WithDbAsync(db => db.Set<CatchRow>().CountAsync()));
        await first.DisposeAsync();
        await second.DisposeAsync();
        _ = loser;
    }

    [Fact]
    public async Task Failed_ReleasesReservation_WithoutReducingRemaining()
    {
        await OnlyAsync("perch", 1);
        var (player, attemptId) = await CastAsync("seat-11");
        await TickAfterAsync(6000);
        await player.OkAsync("HookFish", new { attemptId });

        await player.OkAsync("SubmitFishingResult", new { attemptId, outcome = "failed" });

        var perch = await RowAsync("perch");
        Assert.Equal(1, perch.Remaining);
        Assert.Equal(0, perch.Reserved);
        await player.DisposeAsync();
    }

    [Fact]
    public async Task Cancel_And_Restart_ReleaseReservation()
    {
        await OnlyAsync("perch", 2);
        var (leaving, leavingAttempt) = await CastAsync("seat-11");
        var (crashing, crashingAttempt) = await CastAsync("seat-12");
        await TickAfterAsync(6000);
        Assert.Equal(2, (await RowAsync("perch")).Reserved);

        await leaving.OkAsync("LeaveSeat");
        await Fishing.RecoverAsync(default);

        Assert.Equal("cancelled", (await AttemptAsync(leavingAttempt)).Phase);
        Assert.Equal("cancelled", (await AttemptAsync(crashingAttempt)).Phase);
        var perch = await RowAsync("perch");
        Assert.Equal(2, perch.Remaining);
        Assert.Equal(0, perch.Reserved);
        await leaving.DisposeAsync();
        await crashing.DisposeAsync();
    }

    [Fact]
    public async Task RepeatedSuccess_ReducesOnce()
    {
        await OnlyAsync("perch", 5);
        var (player, attemptId) = await CastAsync("seat-11");
        await TickAfterAsync(6000);
        await player.OkAsync("HookFish", new { attemptId });

        for (var i = 0; i < 20; i++)
            await player.OkAsync("SubmitFishingResult", new { attemptId, outcome = "success" });

        Assert.Equal(4, (await RowAsync("perch")).Remaining);
        Assert.Equal(1, await App.WithDbAsync(db => db.Set<LakeFishMovement>().CountAsync(row => row.Kind == MovementKinds.Catch)));
        await player.DisposeAsync();
    }

    [Fact]
    public async Task EmptyLake_NoBite_UntilStocked()
    {
        await OnlyAsync("perch", 0);
        var (player, attemptId) = await CastAsync("seat-11");

        await TickAfterAsync(6000);
        await TickAfterAsync(5000);
        Assert.Equal("waiting", (await AttemptAsync(attemptId)).Phase);
        Assert.Equal("STATE_CONFLICT", await player.ErrorAsync("HookFish", new { attemptId }));

        await Population.StockAsync(Guid.NewGuid(), [new StockLine("carp", 1)], default);
        await TickAfterAsync(1000);

        var row = await AttemptAsync(attemptId);
        Assert.Equal("bite", row.Phase);
        Assert.Equal("carp", row.SpeciesId);
        await player.DisposeAsync();
    }

    [Fact]
    public async Task Stocking_IsAdditive_KeepsReserved_BatchRetryOnce()
    {
        await OnlyAsync("perch", 30, reserved: 5);
        var batch = Guid.NewGuid();

        var first = await Population.StockAsync(batch, [new StockLine("perch", 100)], default);
        var retry = await Population.StockAsync(batch, [new StockLine("perch", 100)], default);
        var another = await Population.StockAsync(Guid.NewGuid(), [new StockLine("perch", 100)], default);

        Assert.True(first.Applied);
        Assert.False(retry.Applied);
        Assert.True(another.Applied);
        var perch = await RowAsync("perch");
        Assert.Equal(230, perch.Remaining);
        Assert.Equal(5, perch.Reserved);
    }

    [Theory]
    [InlineData("perch", 0)]
    [InlineData("nope", 5)]
    public async Task Stocking_BadLine_IsRejected(string speciesId, int quantity)
    {
        var error = await Assert.ThrowsAsync<Modules.Common.GameException>(() =>
            Population.StockAsync(Guid.NewGuid(), [new StockLine(speciesId, quantity)], default));

        Assert.Equal("VALIDATION_FAILED", error.Code);
    }

    [Fact]
    public async Task StockingDuringCatch_LosesNoUpdate_AndLedgerReconciles()
    {
        await Population.StockAsync(Guid.NewGuid(), [new StockLine("perch", 3)], default);
        var players = new List<(TestPlayer Player, Guid AttemptId)>();
        for (var seat = 11; seat <= 15; seat++) players.Add(await CastAsync($"seat-{seat}"));
        await TickAfterAsync(6000);
        foreach (var (player, attemptId) in players) await player.OkAsync("HookFish", new { attemptId });

        var catches = players.Select(item => Fishing.SubmitResultAsync(item.Player.PlayerId, item.AttemptId, "success", default));
        var stocks = Enumerable.Range(0, 5).Select(_ => Population.StockAsync(Guid.NewGuid(), [new StockLine("perch", 2), new StockLine("koi", 1)], default));
        await Task.WhenAll(catches.Cast<Task>().Concat(stocks));

        var movements = await App.WithDbAsync(db => db.Set<LakeFishMovement>().GroupBy(row => row.SpeciesId)
            .Select(group => new { group.Key, Total = group.Sum(row => row.Delta) }).ToDictionaryAsync(item => item.Key, item => item.Total));
        var rows = await Population.SnapshotAsync(default);
        Assert.All(rows, row => Assert.Equal(movements[row.SpeciesId], row.Remaining));
        Assert.All(rows, row => Assert.Equal(0, row.Reserved));
        Assert.Equal(5, await App.WithDbAsync(db => db.Set<LakeFishMovement>().CountAsync(row => row.Kind == MovementKinds.Catch)));
        foreach (var (player, _) in players) await player.DisposeAsync();
    }
}
