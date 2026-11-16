using System.Net.Http.Json;
using System.Text.Json;
using FishingOnline.Api.Modules.Economy;
using FishingOnline.Api.Modules.Profile;
using Microsoft.EntityFrameworkCore;

namespace FishingOnline.Api.Tests;

/// <summary>MÃ n TÃ i khoáº£n: danh hiá»‡u, lá»i nháº¯n, Ã´ cÃ¡ khoe, ThÃ nh tá»±u (ngÆ°á»i dÃ¹ng duyá»‡t giao diá»‡n 2026-11-16).</summary>
public sealed class AccountScreenTests(PostgresServer postgres) : GameTestBase(postgres)
{
    private const string Perch = "perch";

    private static HttpRequestMessage Claim(string id, Guid key) => new(HttpMethod.Post, "/api/v1/me/achievements/claim")
    {
        Content = JsonContent.Create(new { achievementId = id }),
        Headers = { { "Idempotency-Key", key.ToString() } },
    };

    private Task AddCatchesAsync(Guid playerId, int count, string speciesId = Perch, int length = 100) => App.WithDbAsync(async db =>
    {
        for (var i = 0; i < count; i++)
        {
            db.Add(new CatchRow
            {
                CatchId = Guid.CreateVersion7(), PlayerId = playerId, AttemptId = Guid.NewGuid(), SpeciesId = speciesId,
                Rarity = "common", LengthTenthCm = length, CaughtAt = DateTimeOffset.UtcNow, ConfigVersion = "test",
            });
        }
        if (!await db.Set<SpeciesRecordRow>().AnyAsync(row => row.PlayerId == playerId && row.SpeciesId == speciesId))
        {
            db.Add(new SpeciesRecordRow
            {
                PlayerId = playerId, SpeciesId = speciesId, FirstCaughtAt = DateTimeOffset.UtcNow, TotalCaught = count,
                BestLengthTenthCm = length, BestCatchId = Guid.CreateVersion7(),
            });
        }
        await db.SaveChangesAsync();
        return 0;
    });

    private async Task<JsonElement> AchievementAsync(Guid playerId, string id)
    {
        var data = await ReadDataAsync(await App.Http(playerId).GetAsync("/api/v1/me/achievements"));
        return data.GetProperty("achievements").EnumerateArray().Single(row => row.GetProperty("id").GetString() == id);
    }

    [Fact]
    public async Task TitleAndBio_AreSavedAndValidated()
    {
        var playerId = await App.NewPlayerAsync();
        var http = App.Http(playerId);

        var profile = await ReadDataAsync(await http.GetAsync("/api/v1/me"));
        Assert.Equal("master", profile.GetProperty("titleId").GetString());
        Assert.Equal("", profile.GetProperty("bio").GetString());

        profile = await ReadDataAsync(await http.PutAsJsonAsync("/api/v1/me/title", new { titleId = "lake_king" }));
        Assert.Equal("lake_king", profile.GetProperty("titleId").GetString());
        await AssertErrorAsync(await http.PutAsJsonAsync("/api/v1/me/title", new { titleId = "nope" }), 400, "VALIDATION_FAILED");

        profile = await ReadDataAsync(await http.PutAsJsonAsync("/api/v1/me/bio", new { bio = "  ChÃºc cÃ¢u vui  " }));
        Assert.Equal("ChÃºc cÃ¢u vui", profile.GetProperty("bio").GetString());
        await ReadDataAsync(await http.PutAsJsonAsync("/api/v1/me/bio", new { bio = new string('a', 100) }));
        await AssertErrorAsync(await http.PutAsJsonAsync("/api/v1/me/bio", new { bio = new string('a', 101) }), 400, "VALIDATION_FAILED");

        profile = await ReadDataAsync(await http.GetAsync("/api/v1/me"));
        Assert.Equal("lake_king", profile.GetProperty("titleId").GetString());
    }

    [Fact]
    public async Task Achievement_ClaimsOneLevelAtATime_AndPaysOnce()
    {
        var playerId = await App.NewPlayerAsync();
        var http = App.Http(playerId);
        await AddCatchesAsync(playerId, 60);

        var diligent = await AchievementAsync(playerId, "diligent");
        Assert.Equal(60, diligent.GetProperty("counter").GetInt64());
        Assert.Equal(0, diligent.GetProperty("claimedLevels").GetInt32());

        var key = Guid.NewGuid();
        var first = await ReadDataAsync(await http.SendAsync(Claim("diligent", key)));
        Assert.Equal(1, first.GetProperty("achievement").GetProperty("claimedLevels").GetInt32());
        Assert.Equal("100", first.GetProperty("goldAdded").GetString());
        Assert.Equal("200", first.GetProperty("gold").GetString());

        // Gá»­i láº¡i cÃ¹ng Idempotency-Key: tráº£ láº¡i káº¿t quáº£ cÅ©, khÃ´ng cá»™ng Gold láº§n hai.
        var repeat = await ReadDataAsync(await http.SendAsync(Claim("diligent", key)));
        Assert.Equal("200", repeat.GetProperty("gold").GetString());

        // 60 cÃ¡ vÆ°á»£t cáº£ má»‘c 10 láº«n 50: nháº­n level 2 á»Ÿ láº§n báº¥m sau, má»—i láº§n má»™t level.
        var second = await ReadDataAsync(await http.SendAsync(Claim("diligent", Guid.NewGuid())));
        Assert.Equal(2, second.GetProperty("achievement").GetProperty("claimedLevels").GetInt32());
        Assert.Equal("300", second.GetProperty("gold").GetString());

        // Level 3 cáº§n 200 cÃ¡, má»›i cÃ³ 60.
        await AssertErrorAsync(await http.SendAsync(Claim("diligent", Guid.NewGuid())), 409, "STATE_CONFLICT");
        await AssertErrorAsync(await http.SendAsync(Claim("unknown", Guid.NewGuid())), 400, "VALIDATION_FAILED");
    }

    [Fact]
    public async Task Achievement_CountersFollowCatches()
    {
        var playerId = await App.NewPlayerAsync();
        await AddCatchesAsync(playerId, 3, Perch, length: 99999);

        Assert.Equal(3, (await AchievementAsync(playerId, "giant_fish")).GetProperty("counter").GetInt64());
        Assert.Equal(1, (await AchievementAsync(playerId, "collector")).GetProperty("counter").GetInt64());
        Assert.Equal(1, (await AchievementAsync(playerId, "pioneer")).GetProperty("counter").GetInt64());
        Assert.Equal(0, (await AchievementAsync(playerId, "merchant")).GetProperty("counter").GetInt64());
        Assert.Equal(0, (await AchievementAsync(playerId, "persistent")).GetProperty("counter").GetInt64());
    }

    [Fact]
    public async Task Showcase_PlacesDiscoveredSpeciesOnce()
    {
        var playerId = await App.NewPlayerAsync();
        var http = App.Http(playerId);
        await AddCatchesAsync(playerId, 1, Perch, length: 124);

        var empty = await ReadDataAsync(await http.GetAsync("/api/v1/me/showcase"));
        Assert.Equal(3, empty.GetProperty("slots").GetArrayLength());
        Assert.Equal(JsonValueKind.Null, empty.GetProperty("slots")[0].GetProperty("speciesId").ValueKind);

        var placed = await ReadDataAsync(await http.PutAsJsonAsync("/api/v1/me/showcase", new { slot = 0, speciesId = Perch }));
        Assert.Equal(Perch, placed.GetProperty("slots")[0].GetProperty("speciesId").GetString());
        Assert.Equal(124, placed.GetProperty("slots")[0].GetProperty("lengthTenthCm").GetInt32());

        // CÃ¹ng loÃ i sang Ã´ khÃ¡c thÃ¬ Ã´ cÅ© Ä‘Æ°á»£c trá»‘ng.
        var moved = await ReadDataAsync(await http.PutAsJsonAsync("/api/v1/me/showcase", new { slot = 2, speciesId = Perch }));
        Assert.Equal(JsonValueKind.Null, moved.GetProperty("slots")[0].GetProperty("speciesId").ValueKind);
        Assert.Equal(Perch, moved.GetProperty("slots")[2].GetProperty("speciesId").GetString());

        await AssertErrorAsync(await http.PutAsJsonAsync("/api/v1/me/showcase", new { slot = 3, speciesId = Perch }), 400, "VALIDATION_FAILED");
        await AssertErrorAsync(await http.PutAsJsonAsync("/api/v1/me/showcase", new { slot = 1, speciesId = "moonfin" }), 400, "VALIDATION_FAILED");

        var cleared = await ReadDataAsync(await http.PutAsJsonAsync("/api/v1/me/showcase", new { slot = 2, speciesId = (string?)null }));
        Assert.Equal(JsonValueKind.Null, cleared.GetProperty("slots")[2].GetProperty("speciesId").ValueKind);
    }
}

