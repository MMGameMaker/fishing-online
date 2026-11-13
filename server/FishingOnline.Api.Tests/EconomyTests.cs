using System.Net.Http.Json;
using System.Text.Json;
using FishingOnline.Api.Modules.Economy;
using FishingOnline.Api.Modules.Fishing;
using FishingOnline.Api.Modules.Lake;
using FishingOnline.Api.Modules.Wallet;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace FishingOnline.Api.Tests;

public sealed class EconomyTests(PostgresServer postgres) : GameTestBase(postgres)
{
    private static HttpRequestMessage Post(string path, object body, string? key = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, path) { Content = JsonContent.Create(body) };
        request.Headers.Add("Idempotency-Key", key ?? Guid.NewGuid().ToString());
        return request;
    }

    private async Task<CatchRecordResult> RecordAsync(Guid playerId, string species, int length, int exp = 5, Guid? attemptId = null)
    {
        await using var scope = App.Services.CreateAsyncScope();
        return await scope.ServiceProvider.GetRequiredService<ICatchRecorder>().RecordAsync(
            playerId, attemptId ?? Guid.NewGuid(), species, length, exp, "v0-test-2026-11-10-ticket-01", default);
    }

    private Task<long> GoldOfAsync(Guid playerId) =>
        App.WithDbAsync(db => db.Set<WalletRow>().Where(row => row.PlayerId == playerId).Select(row => row.Gold).SingleAsync());

    private async Task<JsonElement> InventoryAsync(Guid playerId) =>
        await ReadDataAsync(await App.Http(playerId).GetAsync("/api/v1/me/inventory"));

    [Fact]
    public async Task NewPlayer_OwnsDefaultRod()
    {
        var inventory = await InventoryAsync(await App.NewPlayerAsync());

        Assert.Equal(["rod_old"], inventory.GetProperty("rods").EnumerateArray().Select(rod => rod.GetString()));
        Assert.Equal("rod_old", inventory.GetProperty("equippedRodId").GetString());
    }

    [Fact]
    public async Task EquipRodNotOwned_Returns422()
    {
        var client = App.Http(await App.NewPlayerAsync());

        await AssertErrorAsync(await client.PutAsJsonAsync("/api/v1/me/equipped-rod", new { rodId = "rod_bliss" }), 422, "ROD_NOT_OWNED");
    }

    [Fact]
    public async Task EquipOwnedRod_SavesAndLakeSeesNewRod()
    {
        var playerId = await App.NewPlayerAsync(1000);
        await using var player = await App.ConnectAsync(playerId);
        await player.OkAsync("JoinLake");
        await using var watcher = await App.ConnectAsync();
        await watcher.OkAsync("JoinLake");
        var client = App.Http(playerId);
        await ReadDataAsync(await client.SendAsync(Post("/api/v1/shop/buy", new { offerId = "offer_rod_bliss", quantity = 1 })));

        var equipped = await ReadDataAsync(await client.PutAsJsonAsync("/api/v1/me/equipped-rod", new { rodId = "rod_bliss" }));

        Assert.Equal("rod_bliss", equipped.GetProperty("equippedRodId").GetString());
        Assert.Equal("rod_bliss", (await InventoryAsync(playerId)).GetProperty("equippedRodId").GetString());
        var changed = await watcher.WaitForAsync("RodChanged");
        Assert.Equal(playerId, changed.GetProperty("playerId").GetGuid());
        Assert.Equal("rod_bliss", changed.GetProperty("rodId").GetString());
    }

    [Fact]
    public async Task EquipRod_WhileFishing_IsBlocked()
    {
        var playerId = await App.NewPlayerAsync(1000);
        await using var player = await App.ConnectAsync(playerId);
        await player.OkAsync("JoinLake");
        await SitAsync(player, "seat-11");
        await player.OkAsync("CastLine");

        await AssertErrorAsync(await App.Http(playerId).PutAsJsonAsync("/api/v1/me/equipped-rod", new { rodId = "rod_old" }), 409, "ATTEMPT_ACTIVE");
    }

    [Fact]
    public async Task Inventory_MatchesSampleShape()
    {
        var sample = JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "fixtures", "api-samples.v0.json")))
            .RootElement.GetProperty("http").GetProperty("GET /api/v1/me/inventory 200").GetProperty("data");
        var playerId = await App.NewPlayerAsync();
        await RecordAsync(playerId, "perch", 143);

        var inventory = await InventoryAsync(playerId);

        Assert.Equal(sample.EnumerateObject().Select(p => p.Name).Order(), inventory.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal(
            sample.GetProperty("fish")[0].EnumerateObject().Select(p => p.Name).Order(),
            inventory.GetProperty("fish")[0].EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal(JsonValueKind.String, inventory.GetProperty("gold").ValueKind);
    }

    [Fact]
    public async Task Inventory_NewestFirst_VersionGrows()
    {
        var playerId = await App.NewPlayerAsync();
        await RecordAsync(playerId, "perch", 100);
        var first = (await InventoryAsync(playerId)).GetProperty("inventoryVersion").GetInt32();
        App.Clock.Advance(TimeSpan.FromSeconds(1));
        await RecordAsync(playerId, "carp", 110);

        var inventory = await InventoryAsync(playerId);

        Assert.True(inventory.GetProperty("inventoryVersion").GetInt32() > first);
        Assert.Equal("carp", inventory.GetProperty("fish")[0].GetProperty("speciesId").GetString());
    }

    [Fact]
    public async Task Buy_With299Gold_FailsWithoutChanges()
    {
        var playerId = await App.NewPlayerAsync(199);

        await AssertErrorAsync(await App.Http(playerId).SendAsync(Post("/api/v1/shop/buy", new { offerId = "offer_rod_steel_awl", quantity = 1 })), 422, "INSUFFICIENT_GOLD");

        Assert.Equal(299, await GoldOfAsync(playerId));
        Assert.DoesNotContain("rod_steel_awl", (await InventoryAsync(playerId)).GetProperty("rods").EnumerateArray().Select(rod => rod.GetString()));
    }

    [Fact]
    public async Task Buy_ThenBuyAgain_AlreadyOwned_RetryChargesOnce()
    {
        var playerId = await App.NewPlayerAsync(1000);
        var client = App.Http(playerId);
        var body = new { offerId = "offer_rod_steel_awl", quantity = 1 };
        var key = Guid.NewGuid().ToString();

        var bought = await ReadDataAsync(await client.SendAsync(Post("/api/v1/shop/buy", body, key)));
        (await client.SendAsync(Post("/api/v1/shop/buy", body, key))).EnsureSuccessStatusCode();

        Assert.Equal("800", bought.GetProperty("gold").GetString());
        Assert.Equal(800, await GoldOfAsync(playerId));
        await AssertErrorAsync(await client.SendAsync(Post("/api/v1/shop/buy", body)), 409, "ROD_ALREADY_OWNED");
    }

    [Fact]
    public async Task Buy_QuantityOtherThanOne_IsRejected()
    {
        var client = App.Http(await App.NewPlayerAsync(1000));

        await AssertErrorAsync(await client.SendAsync(Post("/api/v1/shop/buy", new { offerId = "offer_rod_steel_awl", quantity = 2 })), 400, "VALIDATION_FAILED");
    }

    [Fact]
    public async Task SellPerch_AddsFive_SellingAgainFails_RecordKept()
    {
        var playerId = await App.NewPlayerAsync();
        var result = await RecordAsync(playerId, "perch", 143);
        var client = App.Http(playerId);

        var sold = await ReadDataAsync(await client.SendAsync(Post("/api/v1/shop/sell-fish", new { catchIds = new[] { result.CatchId } })));

        Assert.Equal(1, sold.GetProperty("soldCount").GetInt32());
        Assert.Equal("5", sold.GetProperty("goldEarned").GetString());
        Assert.Equal("105", sold.GetProperty("gold").GetString());
        await AssertErrorAsync(await client.SendAsync(Post("/api/v1/shop/sell-fish", new { catchIds = new[] { result.CatchId } })), 404, "FISH_NOT_FOUND");

        var codex = await ReadDataAsync(await client.GetAsync("/api/v1/me/codex"));
        var perch = codex.GetProperty("species").EnumerateArray().Single(item => item.GetProperty("speciesId").GetString() == "perch");
        Assert.Equal(143, perch.GetProperty("bestLengthTenthCm").GetInt32());
    }

    [Fact]
    public async Task Sell_MixedOwnership_SellsNothing()
    {
        var playerId = await App.NewPlayerAsync();
        var mine = await RecordAsync(playerId, "perch", 143);
        var theirs = await RecordAsync(await App.NewPlayerAsync(), "perch", 143);

        await AssertErrorAsync(await App.Http(playerId).SendAsync(Post("/api/v1/shop/sell-fish", new { catchIds = new[] { mine.CatchId, theirs.CatchId } })), 404, "FISH_NOT_FOUND");

        Assert.Single((await InventoryAsync(playerId)).GetProperty("fish").EnumerateArray());
        Assert.Equal(100, await GoldOfAsync(playerId));
    }

    [Fact]
    public async Task DevTopUp_AddsPackGold_ReplaySameKeyOnce_UnknownPackRejected()
    {
        var playerId = await App.NewPlayerAsync();
        var client = App.Http(playerId);
        var key = Guid.NewGuid().ToString();

        var first = await ReadDataAsync(await client.SendAsync(Post("/api/v1/dev/topup", new { packId = "gold_5000" }, key)));
        var replay = await ReadDataAsync(await client.SendAsync(Post("/api/v1/dev/topup", new { packId = "gold_5000" }, key)));

        Assert.Equal("5000", first.GetProperty("goldAdded").GetString());
        Assert.Equal("5100", first.GetProperty("gold").GetString());
        Assert.Equal("5100", replay.GetProperty("gold").GetString());
        Assert.Equal(5100, await GoldOfAsync(playerId));
        Assert.Equal(1, await App.WithDbAsync(db => db.Set<LedgerEntry>().CountAsync(row => row.PlayerId == playerId && row.Reason == DevTopUp.Reason)));
        await AssertErrorAsync(await client.SendAsync(Post("/api/v1/dev/topup", new { packId = "gold_999999" })), 400, "VALIDATION_FAILED");
    }

    [Fact]
    public async Task SellAll_EmptyBag_NoLedger()
    {
        var playerId = await App.NewPlayerAsync();

        var sold = await ReadDataAsync(await App.Http(playerId).SendAsync(Post("/api/v1/shop/sell-fish", new { all = true })));

        Assert.Equal(0, sold.GetProperty("soldCount").GetInt32());
        Assert.Equal(0, await App.WithDbAsync(db => db.Set<LedgerEntry>().CountAsync(row => row.PlayerId == playerId && row.Reason == LedgerReasons.SellFish)));
    }

    [Fact]
    public async Task SellAll_SoldEverything()
    {
        var playerId = await App.NewPlayerAsync();
        await RecordAsync(playerId, "perch", 143);
        await RecordAsync(playerId, "koi", 400, 20);

        var sold = await ReadDataAsync(await App.Http(playerId).SendAsync(Post("/api/v1/shop/sell-fish", new { all = true })));

        Assert.Equal(2, sold.GetProperty("soldCount").GetInt32());
        Assert.Equal("55", sold.GetProperty("goldEarned").GetString());
        Assert.Empty((await InventoryAsync(playerId)).GetProperty("fish").EnumerateArray());
    }

    [Fact]
    public async Task Record_FirstLongerShorter_NewAndRecordFlags()
    {
        var playerId = await App.NewPlayerAsync();

        var first = await RecordAsync(playerId, "perch", 100);
        var longer = await RecordAsync(playerId, "perch", 120);
        var shorter = await RecordAsync(playerId, "perch", 110);

        Assert.True(first.IsNew);
        Assert.False(first.IsRecord);
        Assert.False(longer.IsNew);
        Assert.True(longer.IsRecord);
        Assert.False(shorter.IsNew);
        Assert.False(shorter.IsRecord);
    }

    [Fact]
    public async Task Record_Exp35Plus5_LevelsUp_RepeatDoesNotDoubleExp()
    {
        var playerId = await App.NewPlayerAsync();
        await RecordAsync(playerId, "perch", 100, exp: 35);
        var attemptId = Guid.NewGuid();

        var result = await RecordAsync(playerId, "perch", 100, exp: 5, attemptId);
        var repeat = await RecordAsync(playerId, "perch", 100, exp: 5, attemptId);

        Assert.Equal(2, result.Level);
        Assert.True(result.LevelUp);
        Assert.Equal(result, repeat);
        var me = await ReadDataAsync(await App.Http(playerId).GetAsync("/api/v1/me"));
        Assert.Equal(40, me.GetProperty("exp").GetInt32());
        Assert.Equal(2, me.GetProperty("level").GetInt32());
    }

    [Fact]
    public async Task Progress_Level1_SeatAddsNoBuff()
    {
        var playerId = await App.NewPlayerAsync(1000);
        var client = App.Http(playerId);
        await using var player = await App.ConnectAsync(playerId);
        await player.OkAsync("JoinLake");

        var before = await ReadDataAsync(await client.GetAsync("/api/v1/me/progress"));
        await SitAsync(player, "seat-01");
        var seated = await ReadDataAsync(await client.GetAsync("/api/v1/me/progress"));

        Assert.Equal(11, before.GetProperty("stats").GetProperty("strength").GetInt32());
        Assert.Equal(40, before.GetProperty("expToNext").GetInt32());
        Assert.Equal(0, before.GetProperty("stats").GetProperty("largeLuck").GetInt32());
        Assert.Equal(before.GetProperty("stats").GetRawText(), seated.GetProperty("stats").GetRawText());
        Assert.Equal(10, seated.GetProperty("breakdown").GetProperty("level").GetProperty("strength").GetInt32());
        Assert.Equal(1, seated.GetProperty("breakdown").GetProperty("rod").GetProperty("strength").GetInt32());
    }

    [Fact]
    public async Task Codex_ListsAllSpecies_UndiscoveredAreNull()
    {
        var playerId = await App.NewPlayerAsync();
        await RecordAsync(playerId, "perch", 100);

        var species = (await ReadDataAsync(await App.Http(playerId).GetAsync("/api/v1/me/codex"))).GetProperty("species").EnumerateArray().ToArray();

        Assert.Equal(9, species.Length);
        Assert.True(species.Single(item => item.GetProperty("speciesId").GetString() == "perch").GetProperty("discovered").GetBoolean());
        var koi = species.Single(item => item.GetProperty("speciesId").GetString() == "koi");
        Assert.False(koi.GetProperty("discovered").GetBoolean());
        Assert.Equal(JsonValueKind.Null, koi.GetProperty("totalCaught").ValueKind);
    }

    [Fact]
    public async Task History_45Attempts_ThreePagesNoGaps()
    {
        var playerId = await App.NewPlayerAsync();
        var start = App.Clock.GetUtcNow();
        await App.WithDbAsync(async db =>
        {
            for (var i = 0; i < 45; i++)
                db.Add(new FishingAttemptRow
                {
                    AttemptId = Guid.NewGuid(), PlayerId = playerId, SessionId = Guid.NewGuid(), Phase = "failed", Reason = "timeout",
                    ConfigVersion = "v", SnapshotJson = "{}", StartedAt = start, EndedAt = i < 10 ? start : start.AddSeconds(i),
                });
            return await db.SaveChangesAsync();
        });
        var client = App.Http(playerId);
        var seen = new List<string>();
        var sizes = new List<int>();
        string? cursor = null;

        do
        {
            var path = "/api/v1/me/history" + (cursor is null ? string.Empty : $"?cursor={Uri.EscapeDataString(cursor)}");
            var page = await ReadDataAsync(await client.GetAsync(path));
            var items = page.GetProperty("items").EnumerateArray().ToArray();
            sizes.Add(items.Length);
            seen.AddRange(items.Select(item => item.GetProperty("attemptId").GetString()!));
            cursor = page.GetProperty("nextCursor").GetString();
        }
        while (cursor is not null);

        Assert.Equal([20, 20, 5], sizes);
        Assert.Equal(45, seen.Distinct().Count());
    }

    [Theory]
    [InlineData("?limit=0")]
    [InlineData("?limit=101")]
    [InlineData("?cursor=not-base64!")]
    public async Task History_BadParameters_Return400(string query)
    {
        var client = App.Http(await App.NewPlayerAsync());

        await AssertErrorAsync(await client.GetAsync("/api/v1/me/history" + query), 400, "VALIDATION_FAILED");
    }
}
