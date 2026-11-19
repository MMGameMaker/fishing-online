using System.Text.Json;
using FishingOnline.Api.Modules.Economy;
using FishingOnline.Api.Modules.Ranking;
using Microsoft.Extensions.DependencyInjection;

namespace FishingOnline.Api.Tests;

public sealed class RankingTests(PostgresServer postgres) : GameTestBase(postgres)
{
    private const string Board = "/api/v1/rankings/total-catch-weekly";

    private async Task CatchAsync(Guid playerId, int times, Guid? attemptId = null)
    {
        for (var i = 0; i < times; i++)
        {
            await using var scope = App.Services.CreateAsyncScope();
            await scope.ServiceProvider.GetRequiredService<ICatchRecorder>().RecordAsync(
                playerId, attemptId ?? Guid.NewGuid(), "perch", 100 + i, 5, "v0-test-2026-11-19-ticket10-01", default);
        }
    }

    /// <summary>Qua mốc làm mới 30 phút kế tiếp để catch vừa ghi vào bản chụp thứ hạng.</summary>
    private void NextSnapshot() => App.Clock.Advance(TimeSpan.FromMinutes(31));

    [Fact]
    public void WeekStart_IsMondayMidnightVietnamTime()
    {
        // Chủ nhật 2026-11-15 20:00 UTC = thứ Hai 2026-11-16 03:00 giờ VN: tuần mới đã bắt đầu 00:00 giờ VN.
        Assert.Equal(new DateTimeOffset(2026, 11, 16, 0, 0, 0, TimeSpan.FromHours(7)),
            RankingService.WeekStart(new DateTimeOffset(2026, 11, 15, 20, 0, 0, TimeSpan.Zero)));
        Assert.Equal(new DateTimeOffset(2026, 11, 9, 0, 0, 0, TimeSpan.FromHours(7)),
            RankingService.WeekStart(new DateTimeOffset(2026, 11, 15, 10, 0, 0, TimeSpan.Zero)));
    }

    [Fact]
    public void RewardOf_FollowsGameDesignTable()
    {
        string?[] expected = ["400", "300", "250", "200", "150", "100", "100", "100", "100", "100"];
        Assert.Equal(expected, Enumerable.Range(1, 10).Select(RankingService.RewardOf));
        Assert.Equal("75", RankingService.RewardOf(11));
        Assert.Equal("75", RankingService.RewardOf(20));
        Assert.Equal("50", RankingService.RewardOf(21));
        Assert.Equal("50", RankingService.RewardOf(50));
        Assert.Null(RankingService.RewardOf(51));
    }

    [Fact]
    public async Task Weekly_ranksByCatchCount_andMeIsNullWhenNoCatch()
    {
        var more = await App.NewPlayerAsync();
        var fewer = await App.NewPlayerAsync();
        var none = await App.NewPlayerAsync();
        await CatchAsync(more, 3);
        await CatchAsync(fewer, 1);
        NextSnapshot();

        var moreView = await ReadDataAsync(await App.Http(more).GetAsync($"{Board}?limit=50"));
        var fewerView = await ReadDataAsync(await App.Http(fewer).GetAsync($"{Board}?limit=50"));
        var noneView = await ReadDataAsync(await App.Http(none).GetAsync(Board));

        Assert.Equal(3, moreView.GetProperty("me").GetProperty("value").GetInt32());
        Assert.Equal(1, fewerView.GetProperty("me").GetProperty("value").GetInt32());
        Assert.True(moreView.GetProperty("me").GetProperty("rank").GetInt32() < fewerView.GetProperty("me").GetProperty("rank").GetInt32());
        var values = moreView.GetProperty("items").EnumerateArray().Select(item => item.GetProperty("value").GetInt32()).ToArray();
        Assert.Equal(values.OrderByDescending(value => value), values);
        var me = noneView.GetProperty("me");
        Assert.Equal(JsonValueKind.Null, me.GetProperty("rank").ValueKind);
        Assert.Equal(JsonValueKind.Null, me.GetProperty("value").ValueKind);
        Assert.Equal(JsonValueKind.Null, me.GetProperty("reward").ValueKind);
        Assert.False(string.IsNullOrEmpty(me.GetProperty("displayName").GetString()));
    }

    [Fact]
    public async Task OwnScoreIsLive_ButRankWaitsForNextSnapshot()
    {
        var playerId = await App.NewPlayerAsync();
        NextSnapshot();
        await CatchAsync(playerId, 2);

        var before = (await ReadDataAsync(await App.Http(playerId).GetAsync(Board))).GetProperty("me");
        Assert.Equal(2, before.GetProperty("value").GetInt32());
        Assert.Equal(JsonValueKind.Null, before.GetProperty("rank").ValueKind);

        NextSnapshot();
        var after = (await ReadDataAsync(await App.Http(playerId).GetAsync(Board))).GetProperty("me");
        Assert.Equal(2, after.GetProperty("value").GetInt32());
        Assert.NotEqual(JsonValueKind.Null, after.GetProperty("rank").ValueKind);
    }

    [Fact]
    public async Task ResubmittedAttempt_IsCountedOnce()
    {
        var playerId = await App.NewPlayerAsync();
        var attemptId = Guid.NewGuid();
        await CatchAsync(playerId, 1, attemptId);
        // Ghi lại cùng attempt không tạo thêm catch (unique AttemptId), nên điểm không tăng lần hai.
        await CatchAsync(playerId, 1, attemptId);
        NextSnapshot();

        var me = (await ReadDataAsync(await App.Http(playerId).GetAsync(Board))).GetProperty("me");
        Assert.Equal(1, me.GetProperty("value").GetInt32());
    }

    [Fact]
    public async Task Paging_UsesCursor_andStopsAtTop50()
    {
        var playerId = await App.NewPlayerAsync();
        await CatchAsync(playerId, 1);
        await CatchAsync(await App.NewPlayerAsync(), 1);
        NextSnapshot();

        var first = await ReadDataAsync(await App.Http(playerId).GetAsync($"{Board}?limit=1"));
        Assert.Single(first.GetProperty("items").EnumerateArray());
        var cursor = first.GetProperty("nextCursor").GetString();
        Assert.Equal("1", cursor);
        var second = await ReadDataAsync(await App.Http(playerId).GetAsync($"{Board}?limit=1&cursor={cursor}"));
        Assert.Equal(2, second.GetProperty("items")[0].GetProperty("rank").GetInt32());
    }

    [Fact]
    public async Task UnknownBoard_BadLimit_OrBadCursor_IsRejected()
    {
        var client = App.Http(await App.NewPlayerAsync());

        await AssertErrorAsync(await client.GetAsync("/api/v1/rankings/longest-perch"), 400, "VALIDATION_FAILED");
        await AssertErrorAsync(await client.GetAsync($"{Board}?limit=0"), 400, "VALIDATION_FAILED");
        await AssertErrorAsync(await client.GetAsync($"{Board}?cursor=abc"), 400, "VALIDATION_FAILED");
        await AssertErrorAsync(await client.GetAsync($"{Board}?cursor=50"), 400, "VALIDATION_FAILED");
    }

    private async Task CatchSpeciesAsync(Guid playerId, string species, int length)
    {
        await using var scope = App.Services.CreateAsyncScope();
        await scope.ServiceProvider.GetRequiredService<ICatchRecorder>().RecordAsync(
            playerId, Guid.NewGuid(), species, length, 5, "v0-test-2026-11-19-ticket10-01", default);
    }

    private async Task<JsonElement> DailyAsync(Guid viewer, string species, string metric) =>
        await ReadDataAsync(await App.Http(viewer).GetAsync($"/api/v1/rankings/daily-fish/{species}?metric={metric}"));

    [Fact]
    public async Task DailyFish_LengthAndEarliest_TopPerPlayer_ResetsAtVietnamMidnight()
    {
        var alice = await App.NewPlayerAsync();
        var bob = await App.NewPlayerAsync();
        var carol = await App.NewPlayerAsync();
        // Đưa giờ giả về 2 giờ sáng giờ VN của ngày kế để các mốc +giờ không vượt nửa đêm.
        App.Clock.Advance(RankingService.DayStart(App.Clock.GetUtcNow()).AddDays(1).AddHours(2) - App.Clock.GetUtcNow());

        await CatchSpeciesAsync(alice, "perch", 100);
        App.Clock.Advance(TimeSpan.FromHours(1));
        await CatchSpeciesAsync(bob, "perch", 150);
        App.Clock.Advance(TimeSpan.FromHours(1));
        await CatchSpeciesAsync(alice, "perch", 120);
        await CatchSpeciesAsync(carol, "koi", 300);

        var length = await DailyAsync(carol, "perch", "length");
        Assert.Equal("perch", length.GetProperty("speciesId").GetString());
        var items = length.GetProperty("items").EnumerateArray().ToArray();
        Assert.Equal([bob, alice], items.Select(item => item.GetProperty("playerId").GetGuid()));
        Assert.Equal([150, 120], items.Select(item => item.GetProperty("lengthTenthCm").GetInt32()));
        Assert.Equal([1, 2], items.Select(item => item.GetProperty("rank").GetInt32()));
        Assert.Equal(JsonValueKind.Null, length.GetProperty("me").ValueKind);

        // Sớm nhất: alice (con đầu lúc 2h) trước bob (3h); mỗi người một dòng.
        var earliest = await DailyAsync(bob, "perch", "earliest");
        var early = earliest.GetProperty("items").EnumerateArray().ToArray();
        Assert.Equal([alice, bob], early.Select(item => item.GetProperty("playerId").GetGuid()));
        Assert.Equal(100, early[0].GetProperty("lengthTenthCm").GetInt32());
        Assert.Equal(2, earliest.GetProperty("me").GetProperty("rank").GetInt32());

        // Mỗi loài một bảng riêng.
        Assert.Single((await DailyAsync(alice, "koi", "length")).GetProperty("items").EnumerateArray());

        await AssertErrorAsync(await App.Http(alice).GetAsync("/api/v1/rankings/daily-fish/khong-co?metric=length"), 400, "VALIDATION_FAILED");
        await AssertErrorAsync(await App.Http(alice).GetAsync("/api/v1/rankings/daily-fish/perch?metric=lol"), 400, "VALIDATION_FAILED");

        // Qua 0h giờ VN: bảng ngày mới trống.
        App.Clock.Advance(TimeSpan.FromHours(23));
        Assert.Equal(0, (await DailyAsync(alice, "perch", "length")).GetProperty("items").GetArrayLength());
    }

    [Fact]
    public async Task DailyFish_OnlyTop10_MeBeyondTopHasNoRank()
    {
        App.Clock.Advance(RankingService.DayStart(App.Clock.GetUtcNow()).AddDays(1).AddHours(2) - App.Clock.GetUtcNow());
        var viewer = await App.NewPlayerAsync();
        await CatchSpeciesAsync(viewer, "perch", 10);
        for (var i = 0; i < 10; i++) await CatchSpeciesAsync(await App.NewPlayerAsync(), "perch", 100 + i);

        var board = await DailyAsync(viewer, "perch", "length");
        Assert.Equal(10, board.GetProperty("items").GetArrayLength());
        Assert.Equal(JsonValueKind.Null, board.GetProperty("me").GetProperty("rank").ValueKind);
        Assert.Equal(10, board.GetProperty("me").GetProperty("lengthTenthCm").GetInt32());
    }}
