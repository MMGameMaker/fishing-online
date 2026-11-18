using System.Net.Http.Json;
using FishingOnline.Api.Modules.Economy;
using Microsoft.EntityFrameworkCore;

namespace FishingOnline.Api.Tests;

/// <summary>Kết bạn, tin riêng, hồ sơ công khai và icon cá (BOT-02 mục 2–4) giữa người chơi thật.</summary>
public sealed class FriendsTests(PostgresServer postgres) : GameTestBase(postgres)
{
    private async Task MakeFriendsAsync(Guid a, Guid b)
    {
        (await App.Http(a).PostAsJsonAsync("/api/v1/friends/requests", new { playerId = b })).EnsureSuccessStatusCode();
        (await App.Http(b).PostAsync($"/api/v1/friends/requests/{a}/accept", null)).EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task Request_Accept_ListsFriendsWithOnline_RealtimeEvents()
    {
        await using var alice = await App.ConnectAsync();
        await using var bob = await App.ConnectAsync();
        await bob.OkAsync("JoinLake");
        var aliceHttp = App.Http(alice.PlayerId);
        var bobHttp = App.Http(bob.PlayerId);

        var sent = await ReadDataAsync(await aliceHttp.PostAsJsonAsync("/api/v1/friends/requests", new { playerId = bob.PlayerId }));
        Assert.Equal("sent", sent.GetProperty("status").GetString());
        var received = await bob.WaitForAsync("FriendRequestReceived");
        Assert.Equal(alice.PlayerId, received.GetProperty("playerId").GetGuid());

        var bobList = await ReadDataAsync(await bobHttp.GetAsync("/api/v1/friends"));
        Assert.Equal(alice.PlayerId, bobList.GetProperty("incoming")[0].GetProperty("playerId").GetGuid());
        var aliceList = await ReadDataAsync(await aliceHttp.GetAsync("/api/v1/friends"));
        Assert.Equal(bob.PlayerId, aliceList.GetProperty("outgoing")[0].GetGuid());

        (await bobHttp.PostAsync($"/api/v1/friends/requests/{alice.PlayerId}/accept", null)).EnsureSuccessStatusCode();
        Assert.Equal(bob.PlayerId, (await alice.WaitForAsync("FriendAdded")).GetProperty("playerId").GetGuid());
        Assert.Equal(alice.PlayerId, (await bob.WaitForAsync("FriendAdded")).GetProperty("playerId").GetGuid());

        aliceList = await ReadDataAsync(await aliceHttp.GetAsync("/api/v1/friends"));
        var friend = aliceList.GetProperty("friends")[0];
        Assert.Equal(bob.PlayerId, friend.GetProperty("playerId").GetGuid());
        Assert.True(friend.GetProperty("online").GetBoolean());
        Assert.Equal(0, aliceList.GetProperty("outgoing").GetArrayLength());
        bobList = await ReadDataAsync(await bobHttp.GetAsync("/api/v1/friends"));
        Assert.False(bobList.GetProperty("friends")[0].GetProperty("online").GetBoolean());

        // Đã là bạn: mời lại trả "friends"; đồng ý lần nữa là lỗi trạng thái.
        Assert.Equal("friends", (await ReadDataAsync(await aliceHttp.PostAsJsonAsync("/api/v1/friends/requests", new { playerId = bob.PlayerId })))
            .GetProperty("status").GetString());
        await AssertErrorAsync(await bobHttp.PostAsync($"/api/v1/friends/requests/{alice.PlayerId}/accept", null), 409, "STATE_CONFLICT");
    }

    [Fact]
    public async Task Decline_ThenInviteAgain_CrossInviteAccepts_UnknownPlayer404()
    {
        var alice = await App.NewPlayerAsync();
        var bob = await App.NewPlayerAsync();
        var aliceHttp = App.Http(alice);
        var bobHttp = App.Http(bob);

        (await aliceHttp.PostAsJsonAsync("/api/v1/friends/requests", new { playerId = bob })).EnsureSuccessStatusCode();
        (await bobHttp.PostAsync($"/api/v1/friends/requests/{alice}/decline", null)).EnsureSuccessStatusCode();
        Assert.Equal(0, (await ReadDataAsync(await bobHttp.GetAsync("/api/v1/friends"))).GetProperty("incoming").GetArrayLength());

        (await aliceHttp.PostAsJsonAsync("/api/v1/friends/requests", new { playerId = bob })).EnsureSuccessStatusCode();
        Assert.Equal(1, (await ReadDataAsync(await bobHttp.GetAsync("/api/v1/friends"))).GetProperty("incoming").GetArrayLength());
        // Bob mời lại Alice trong lúc Alice đang mời Bob: thành bạn luôn.
        Assert.Equal("friends", (await ReadDataAsync(await bobHttp.PostAsJsonAsync("/api/v1/friends/requests", new { playerId = alice })))
            .GetProperty("status").GetString());
        Assert.Equal(1, (await ReadDataAsync(await aliceHttp.GetAsync("/api/v1/friends"))).GetProperty("friends").GetArrayLength());

        await AssertErrorAsync(await aliceHttp.PostAsJsonAsync("/api/v1/friends/requests", new { playerId = Guid.NewGuid() }), 404, "PLAYER_NOT_FOUND");
        await AssertErrorAsync(await aliceHttp.PostAsJsonAsync("/api/v1/friends/requests", new { playerId = alice }), 400, "VALIDATION_FAILED");
    }

    [Fact]
    public async Task DirectMessage_OnlyBetweenFriends_BothReceive_HistoryAndConversations()
    {
        await using var alice = await App.ConnectAsync();
        await using var bob = await App.ConnectAsync();
        await using var bobSecondTab = await App.ConnectAsync(bob.PlayerId);

        Assert.Equal("NOT_FRIENDS", await alice.ErrorAsync("SendDirectMessage", new { toPlayerId = bob.PlayerId, text = "Chào" }));

        await MakeFriendsAsync(alice.PlayerId, bob.PlayerId);
        // Không cần vào hồ: tin tới mọi kết nối của cả hai người.
        var ack = await alice.OkAsync("SendDirectMessage", new { toPlayerId = bob.PlayerId, text = "  Chào Bob  " });
        Assert.Equal("Chào Bob", ack.GetProperty("text").GetString());
        foreach (var tab in new[] { alice, bob, bobSecondTab })
        {
            var message = await tab.WaitForAsync("DirectMessageReceived");
            Assert.Equal(alice.PlayerId, message.GetProperty("fromPlayerId").GetGuid());
            Assert.Equal(bob.PlayerId, message.GetProperty("toPlayerId").GetGuid());
            Assert.Equal("Chào Bob", message.GetProperty("text").GetString());
        }

        App.Clock.AdvanceMs(2500);
        await bob.OkAsync("SendDirectMessage", new { toPlayerId = alice.PlayerId, text = "Chào Alice" });
        var history = await ReadDataAsync(await App.Http(alice.PlayerId).GetAsync($"/api/v1/me/dm/{bob.PlayerId}"));
        Assert.Equal(["Chào Bob", "Chào Alice"], history.GetProperty("messages").EnumerateArray().Select(item => item.GetProperty("text").GetString()!));
        var conversations = await ReadDataAsync(await App.Http(bob.PlayerId).GetAsync("/api/v1/me/dm"));
        var only = conversations.GetProperty("conversations").EnumerateArray().Single();
        Assert.Equal(alice.PlayerId, only.GetProperty("playerId").GetGuid());
        Assert.Equal("Chào Alice", only.GetProperty("lastText").GetString());
        Assert.True(await App.WithDbAsync(db => db.Set<FishingOnline.Api.Modules.Social.DirectMessageRow>().CountAsync()) == 2);
    }

    [Fact]
    public async Task DirectMessage_LengthAndRateLimits()
    {
        await using var alice = await App.ConnectAsync();
        var bob = await App.NewPlayerAsync();
        await MakeFriendsAsync(alice.PlayerId, bob);

        Assert.Equal("VALIDATION_FAILED", await alice.ErrorAsync("SendDirectMessage", new { toPlayerId = bob, text = new string('a', 161) }));
        Assert.Equal("VALIDATION_FAILED", await alice.ErrorAsync("SendDirectMessage", new { toPlayerId = bob, text = "   " }));
        await alice.OkAsync("SendDirectMessage", new { toPlayerId = bob, text = "một" });
        Assert.Equal("RATE_LIMITED", await alice.ErrorAsync("SendDirectMessage", new { toPlayerId = bob, text = "hai" }));
        // Đếm riêng với chat chung.
        await alice.OkAsync("JoinLake");
        await alice.OkAsync("SendChat", new { text = "chat chung" });
    }

    [Fact]
    public async Task PublicProfile_ShowsPublicFields_FriendStatus_NoPrivateData()
    {
        var owner = await App.NewPlayerAsync();
        var viewer = await App.NewPlayerAsync();
        (await App.Http(owner).PutAsJsonAsync("/api/v1/me/bio", new { bio = "Xin chào hồ" })).EnsureSuccessStatusCode();
        (await App.Http(owner).PutAsJsonAsync("/api/v1/me/title", new { titleId = "hunter" })).EnsureSuccessStatusCode();
        var viewerHttp = App.Http(viewer);

        var profile = await ReadDataAsync(await viewerHttp.GetAsync($"/api/v1/players/{owner}/profile"));
        Assert.Equal(owner, profile.GetProperty("playerId").GetGuid());
        Assert.Equal("Xin chào hồ", profile.GetProperty("bio").GetString());
        Assert.Equal("hunter", profile.GetProperty("titleId").GetString());
        Assert.Equal(1, profile.GetProperty("level").GetInt32());
        Assert.Equal(3, profile.GetProperty("showcase").GetArrayLength());
        Assert.False(profile.GetProperty("online").GetBoolean());
        Assert.Equal("none", profile.GetProperty("friendStatus").GetString());
        foreach (var hidden in new[] { "gold", "isbot", "equippedRodId" })
            Assert.DoesNotContain(hidden, profile.GetRawText(), StringComparison.OrdinalIgnoreCase);

        (await viewerHttp.PostAsJsonAsync("/api/v1/friends/requests", new { playerId = owner })).EnsureSuccessStatusCode();
        Assert.Equal("pending_out", (await ReadDataAsync(await viewerHttp.GetAsync($"/api/v1/players/{owner}/profile"))).GetProperty("friendStatus").GetString());
        Assert.Equal("pending_in", (await ReadDataAsync(await App.Http(owner).GetAsync($"/api/v1/players/{viewer}/profile"))).GetProperty("friendStatus").GetString());
        Assert.Equal("self", (await ReadDataAsync(await viewerHttp.GetAsync($"/api/v1/players/{viewer}/profile"))).GetProperty("friendStatus").GetString());
        await AssertErrorAsync(await viewerHttp.GetAsync($"/api/v1/players/{Guid.NewGuid()}/profile"), 404, "PLAYER_NOT_FOUND");
    }

    [Fact]
    public async Task FishEmoji_OnlyForSpeciesTheSenderCaught()
    {
        await using var player = await App.ConnectAsync();
        await player.OkAsync("JoinLake");
        await using var watcher = await App.ConnectAsync();
        await watcher.OkAsync("JoinLake");

        Assert.Equal("VALIDATION_FAILED", await player.ErrorAsync("SendEmoji", new { emojiId = "fish:koi" }));
        await App.WithDbAsync(async db =>
        {
            db.Add(new SpeciesRecordRow
            {
                PlayerId = player.PlayerId, SpeciesId = "koi", FirstCaughtAt = DateTimeOffset.UtcNow, TotalCaught = 1,
                BestLengthTenthCm = 300, BestCatchId = Guid.NewGuid(),
            });
            return await db.SaveChangesAsync();
        });

        await player.OkAsync("SendEmoji", new { emojiId = "fish:koi" });
        var emoji = await watcher.WaitForAsync("EmojiReceived", item => item.GetProperty("playerId").GetGuid() == player.PlayerId);
        Assert.Equal("fish:koi", emoji.GetProperty("emojiId").GetString());
        App.Clock.AdvanceMs(2500);
        Assert.Equal("VALIDATION_FAILED", await player.ErrorAsync("SendEmoji", new { emojiId = "fish:nope" }));
        Assert.Equal("VALIDATION_FAILED", await player.ErrorAsync("SendEmoji", new { emojiId = "fish:perch" }));
        await player.OkAsync("SendEmoji", new { emojiId = "emoji_03" });
    }
}
