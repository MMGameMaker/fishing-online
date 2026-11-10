using System.Net.Http.Json;
using FishingOnline.Api.Modules.Social;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace FishingOnline.Api.Tests;

public sealed class SocialTests(PostgresServer postgres) : GameTestBase(postgres)
{
    private static object Chat(string text) => new { text };

    [Fact]
    public async Task UnknownSkin_Returns400()
    {
        var client = App.Http(await App.NewPlayerAsync());

        await AssertErrorAsync(await client.PutAsJsonAsync("/api/v1/me/skin", new { skinId = "nope" }), 400, "VALIDATION_FAILED");
    }

    [Fact]
    public async Task SelectSkin_OthersReceiveEvent_ListShowsSelection()
    {
        var playerId = await App.NewPlayerAsync();
        await using var player = await App.ConnectAsync(playerId);
        await player.OkAsync("JoinLake");
        await using var watcher = await App.ConnectAsync();
        await watcher.OkAsync("JoinLake");
        var client = App.Http(playerId);

        (await client.PutAsJsonAsync("/api/v1/me/skin", new { skinId = "skin_02" })).EnsureSuccessStatusCode();

        var changed = await watcher.WaitForAsync("SkinChanged");
        Assert.Equal(playerId, changed.GetProperty("playerId").GetGuid());
        Assert.Equal("skin_02", changed.GetProperty("skinId").GetString());
        var list = await ReadDataAsync(await client.GetAsync("/api/v1/skins"));
        Assert.Equal("skin_02", list.GetProperty("selectedSkinId").GetString());
        Assert.True(list.GetProperty("skins").GetArrayLength() > 0);
    }

    [Fact]
    public async Task Chat_ReachesRoom_AndIsStored()
    {
        await using var player = await App.ConnectAsync();
        await player.OkAsync("JoinLake");
        await using var watcher = await App.ConnectAsync();
        await watcher.OkAsync("JoinLake");

        await player.OkAsync("SendChat", Chat("  xin chao  "));

        var received = await watcher.WaitForAsync("ChatReceived");
        Assert.Equal("xin chao", received.GetProperty("text").GetString());
        Assert.Equal(player.PlayerId, received.GetProperty("playerId").GetGuid());
        Assert.Equal(1, await App.WithDbAsync(db => db.Set<ChatMessageRow>().CountAsync()));
    }

    [Theory]
    [InlineData(101)]
    [InlineData(0)]
    public async Task Chat_BadLength_IsRejected(int length)
    {
        await using var player = await App.ConnectAsync();
        await player.OkAsync("JoinLake");

        Assert.Equal("VALIDATION_FAILED", await player.ErrorAsync("SendChat", Chat(new string('a', length))));
    }

    [Fact]
    public async Task Chat_ThreeInOneSecond_SecondAndThirdBlocked()
    {
        await using var player = await App.ConnectAsync();
        await player.OkAsync("JoinLake");

        await player.OkAsync("SendChat", Chat("one"));
        Assert.Equal("RATE_LIMITED", await player.ErrorAsync("SendChat", Chat("two")));
        Assert.Equal("RATE_LIMITED", await player.ErrorAsync("SendChat", Chat("three")));

        App.Clock.AdvanceMs(1000);
        await player.OkAsync("SendChat", Chat("four"));
    }

    [Fact]
    public async Task Chat_BurstLimit_TenPerThirtySeconds()
    {
        await using var player = await App.ConnectAsync();
        await player.OkAsync("JoinLake");
        for (var i = 0; i < 10; i++)
        {
            await player.OkAsync("SendChat", Chat($"m{i}"));
            App.Clock.AdvanceMs(1000);
        }

        Assert.Equal("RATE_LIMITED", await player.ErrorAsync("SendChat", Chat("m10")));

        App.Clock.AdvanceMs(21000);
        await player.OkAsync("SendChat", Chat("m11"));
    }

    [Fact]
    public async Task Chat_BannedWords_AreMasked()
    {
        App.Services.GetRequiredService<IOptions<SocialOptions>>().Value.BannedWords.Add("xau");
        await using var player = await App.ConnectAsync();
        await player.OkAsync("JoinLake");

        await player.OkAsync("SendChat", Chat("ca XAU qua"));

        Assert.Equal("ca *** qua", (await player.WaitForAsync("ChatReceived")).GetProperty("text").GetString());
    }

    [Fact]
    public async Task Chat_RetentionPurge_RemovesOldMessages()
    {
        await using var player = await App.ConnectAsync();
        await player.OkAsync("JoinLake");
        await player.OkAsync("SendChat", Chat("old"));

        App.Clock.Advance(TimeSpan.FromDays(8));

        Assert.Equal(1, await App.Service<SocialService>().PurgeChatAsync(default));
    }

    [Fact]
    public async Task Emoji_Unknown_IsRejected_RateLimited()
    {
        await using var player = await App.ConnectAsync();
        await player.OkAsync("JoinLake");

        Assert.Equal("VALIDATION_FAILED", await player.ErrorAsync("SendEmoji", new { emojiId = "lol" }));
        await player.OkAsync("SendEmoji", new { emojiId = "emoji_01" });
        Assert.Equal("RATE_LIMITED", await player.ErrorAsync("SendEmoji", new { emojiId = "emoji_02" }));

        await player.WaitForAsync("EmojiReceived");
        App.Clock.AdvanceMs(2000);
        await player.OkAsync("SendEmoji", new { emojiId = "emoji_02" });
    }
}
