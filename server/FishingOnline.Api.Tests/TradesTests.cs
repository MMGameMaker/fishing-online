using System.Net.Http.Json;
using FishingOnline.Api.Modules.Economy;
using FishingOnline.Api.Modules.Social;
using Microsoft.EntityFrameworkCore;

namespace FishingOnline.Api.Tests;

/// <summary>Trao đổi cá giữa bạn bè: đề nghị, đồng ý/từ chối/rút lại, kiểm tra lại lúc đồng ý, không tính thành tích người nhận.</summary>
public sealed class TradesTests(PostgresServer postgres) : GameTestBase(postgres)
{
    private async Task MakeFriendsAsync(Guid a, Guid b)
    {
        (await App.Http(a).PostAsJsonAsync("/api/v1/friends/requests", new { playerId = b })).EnsureSuccessStatusCode();
        (await App.Http(b).PostAsync($"/api/v1/friends/requests/{a}/accept", null)).EnsureSuccessStatusCode();
    }

    private async Task<Guid> AddFishAsync(Guid playerId, string speciesId = "perch", int length = 100)
    {
        var id = Guid.CreateVersion7();
        await App.WithDbAsync(async db =>
        {
            db.Add(new CatchRow
            {
                CatchId = id, PlayerId = playerId, AttemptId = Guid.NewGuid(), SpeciesId = speciesId, Rarity = "common",
                LengthTenthCm = length, CaughtAt = DateTimeOffset.UtcNow, ConfigVersion = "test",
            });
            return await db.SaveChangesAsync();
        });
        return id;
    }

    private async Task<HashSet<Guid>> BagAsync(Guid playerId)
    {
        var inventory = await ReadDataAsync(await App.Http(playerId).GetAsync("/api/v1/me/inventory"));
        return inventory.GetProperty("fish").EnumerateArray().Select(item => item.GetProperty("catchId").GetGuid()).ToHashSet();
    }

    private async Task<HttpResponseMessage> ProposeAsync(Guid from, Guid to, Guid[] offer, Guid[] request) =>
        await App.Http(from).PostAsJsonAsync("/api/v1/trades", new { toPlayerId = to, offerCatchIds = offer, requestCatchIds = request });

    [Fact]
    public async Task Propose_Accept_SwapsFish_EventsToBoth_StatsStayWithCatcher()
    {
        await using var alice = await App.ConnectAsync();
        await using var bob = await App.ConnectAsync();
        await MakeFriendsAsync(alice.PlayerId, bob.PlayerId);
        var mine = await AddFishAsync(alice.PlayerId, "perch", 120);
        var theirs = await AddFishAsync(bob.PlayerId, "koi", 300);

        // Xem cá của bạn để chọn.
        var friendFish = await ReadDataAsync(await App.Http(alice.PlayerId).GetAsync($"/api/v1/friends/{bob.PlayerId}/fish"));
        Assert.Equal(theirs, friendFish.GetProperty("fish")[0].GetProperty("catchId").GetGuid());

        var created = await ReadDataAsync(await ProposeAsync(alice.PlayerId, bob.PlayerId, [mine], [theirs]));
        var tradeId = created.GetProperty("tradeId").GetGuid();
        var received = await bob.WaitForAsync("TradeReceived");
        Assert.Equal(tradeId, received.GetProperty("tradeId").GetGuid());
        Assert.Equal("perch", received.GetProperty("offer")[0].GetProperty("speciesId").GetString());
        Assert.Equal("koi", received.GetProperty("request")[0].GetProperty("speciesId").GetString());

        var bobTrades = await ReadDataAsync(await App.Http(bob.PlayerId).GetAsync("/api/v1/trades"));
        Assert.Equal(tradeId, bobTrades.GetProperty("incoming")[0].GetProperty("tradeId").GetGuid());
        var aliceTrades = await ReadDataAsync(await App.Http(alice.PlayerId).GetAsync("/api/v1/trades"));
        Assert.Equal(tradeId, aliceTrades.GetProperty("outgoing")[0].GetProperty("tradeId").GetGuid());

        // Người đề nghị không tự đồng ý được.
        await AssertErrorAsync(await App.Http(alice.PlayerId).PostAsync($"/api/v1/trades/{tradeId}/accept", null), 404, "TRADE_NOT_FOUND");
        (await App.Http(bob.PlayerId).PostAsync($"/api/v1/trades/{tradeId}/accept", null)).EnsureSuccessStatusCode();
        foreach (var tab in new[] { alice, bob })
            Assert.Equal("accepted", (await tab.WaitForAsync("TradeUpdated")).GetProperty("status").GetString());

        Assert.Equal(new[] { theirs }, (await BagAsync(alice.PlayerId)).ToArray());
        Assert.Equal(new[] { mine }, (await BagAsync(bob.PlayerId)).ToArray());
        await AssertErrorAsync(await App.Http(bob.PlayerId).PostAsync($"/api/v1/trades/{tradeId}/accept", null), 409, "STATE_CONFLICT");

        // Người câu vẫn là chủ thành tích: bản ghi cá không đổi PlayerId.
        Assert.Equal(bob.PlayerId, await App.WithDbAsync(async db => (await db.Set<CatchRow>().SingleAsync(row => row.CatchId == theirs)).PlayerId));
        Assert.Equal(0, await App.WithDbAsync(db => db.Set<SpeciesRecordRow>().CountAsync(row => row.PlayerId == alice.PlayerId)));

        // Cá đã đổi đi thì không còn của người cũ.
        await AssertErrorAsync(await App.Http(alice.PlayerId).PostAsJsonAsync("/api/v1/trades",
            new { toPlayerId = bob.PlayerId, offerCatchIds = new[] { mine }, requestCatchIds = new[] { theirs } }), 404, "FISH_NOT_FOUND");
    }

    [Fact]
    public async Task Decline_Cancel_AndValidation()
    {
        var alice = await App.NewPlayerAsync();
        var bob = await App.NewPlayerAsync();
        var carol = await App.NewPlayerAsync();
        await MakeFriendsAsync(alice, bob);
        var a1 = await AddFishAsync(alice);
        var b1 = await AddFishAsync(bob);

        // Không phải bạn.
        await AssertErrorAsync(await ProposeAsync(alice, carol, [a1], [await AddFishAsync(carol)]), 403, "NOT_FRIENDS");
        // Không có con nào, hoặc quá 5 con, hoặc trùng hai phía, hoặc tự đổi với mình.
        await AssertErrorAsync(await ProposeAsync(alice, bob, [], [b1]), 400, "VALIDATION_FAILED");
        await AssertErrorAsync(await ProposeAsync(alice, bob, [a1], []), 400, "VALIDATION_FAILED");
        var many = new List<Guid>();
        for (var i = 0; i < 6; i++) many.Add(await AddFishAsync(alice));
        await AssertErrorAsync(await ProposeAsync(alice, bob, many.ToArray(), [b1]), 400, "VALIDATION_FAILED");
        await AssertErrorAsync(await ProposeAsync(alice, alice, [a1], [b1]), 400, "VALIDATION_FAILED");
        // Cá của người khác / không tồn tại.
        await AssertErrorAsync(await ProposeAsync(alice, bob, [b1], [b1]), 400, "VALIDATION_FAILED");
        await AssertErrorAsync(await ProposeAsync(alice, bob, [b1], [await AddFishAsync(bob)]), 404, "FISH_NOT_FOUND");
        await AssertErrorAsync(await ProposeAsync(alice, bob, [a1], [Guid.NewGuid()]), 404, "FISH_NOT_FOUND");

        // Từ chối: chỉ người nhận; đề nghị không còn trong danh sách; cá không đổi.
        var first = (await ReadDataAsync(await ProposeAsync(alice, bob, [a1], [b1]))).GetProperty("tradeId").GetGuid();
        await AssertErrorAsync(await App.Http(alice).PostAsync($"/api/v1/trades/{first}/decline", null), 404, "TRADE_NOT_FOUND");
        (await App.Http(bob).PostAsync($"/api/v1/trades/{first}/decline", null)).EnsureSuccessStatusCode();
        Assert.Equal(0, (await ReadDataAsync(await App.Http(bob).GetAsync("/api/v1/trades"))).GetProperty("incoming").GetArrayLength());
        Assert.Contains(a1, await BagAsync(alice));

        // Rút lại: chỉ người đề nghị.
        var second = (await ReadDataAsync(await ProposeAsync(alice, bob, [a1], [b1]))).GetProperty("tradeId").GetGuid();
        await AssertErrorAsync(await App.Http(bob).PostAsync($"/api/v1/trades/{second}/cancel", null), 404, "TRADE_NOT_FOUND");
        (await App.Http(alice).PostAsync($"/api/v1/trades/{second}/cancel", null)).EnsureSuccessStatusCode();
        await AssertErrorAsync(await App.Http(bob).PostAsync($"/api/v1/trades/{second}/accept", null), 409, "STATE_CONFLICT");
        await AssertErrorAsync(await App.Http(bob).PostAsync($"/api/v1/trades/{Guid.NewGuid()}/accept", null), 404, "TRADE_NOT_FOUND");
    }

    [Fact]
    public async Task Accept_FailsAndChangesNothing_WhenFishSoldOrUnfriended()
    {
        var alice = await App.NewPlayerAsync();
        var bob = await App.NewPlayerAsync();
        await MakeFriendsAsync(alice, bob);
        var a1 = await AddFishAsync(alice);
        var a2 = await AddFishAsync(alice);
        var b1 = await AddFishAsync(bob);

        var trade = (await ReadDataAsync(await ProposeAsync(alice, bob, [a1, a2], [b1]))).GetProperty("tradeId").GetGuid();
        // Alice bán a2 trước khi Bob đồng ý.
        await App.WithDbAsync(db => db.Set<CatchRow>().Where(row => row.CatchId == a2)
            .ExecuteUpdateAsync(setters => setters.SetProperty(row => row.SoldAt, DateTimeOffset.UtcNow)));
        await AssertErrorAsync(await App.Http(bob).PostAsync($"/api/v1/trades/{trade}/accept", null), 404, "FISH_NOT_FOUND");
        Assert.Equal(new[] { a1 }, (await BagAsync(alice)).ToArray());
        Assert.Equal(new[] { b1 }, (await BagAsync(bob)).ToArray());
        // Giao dịch vẫn đang chờ (chưa bị đánh dấu accepted do rollback), Bob từ chối được.
        Assert.Equal(1, (await ReadDataAsync(await App.Http(bob).GetAsync("/api/v1/trades"))).GetProperty("incoming").GetArrayLength());

        // Huỷ kết bạn thì không đồng ý được nữa.
        (await App.Http(alice).DeleteAsync($"/api/v1/friends/{bob}")).EnsureSuccessStatusCode();
        await AssertErrorAsync(await App.Http(bob).PostAsync($"/api/v1/trades/{trade}/accept", null), 403, "NOT_FRIENDS");
        await AssertErrorAsync(await App.Http(alice).GetAsync($"/api/v1/friends/{bob}/fish"), 403, "NOT_FRIENDS");
    }

    [Fact]
    public async Task PendingOutgoing_IsLimited()
    {
        var alice = await App.NewPlayerAsync();
        var bob = await App.NewPlayerAsync();
        await MakeFriendsAsync(alice, bob);
        var a1 = await AddFishAsync(alice);
        var b1 = await AddFishAsync(bob);
        for (var i = 0; i < TradeService.MaxPendingOutgoing; i++)
            (await ProposeAsync(alice, bob, [a1], [b1])).EnsureSuccessStatusCode();
        await AssertErrorAsync(await ProposeAsync(alice, bob, [a1], [b1]), 409, "TRADE_LIMIT_REACHED");
    }
}

