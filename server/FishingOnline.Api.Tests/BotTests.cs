using System.Net.Http.Json;
using System.Text.Json;
using FishingOnline.Api.Modules.Admin;
using FishingOnline.Api.Modules.Bots;
using FishingOnline.Api.Modules.Economy;
using FishingOnline.Api.Modules.Fishing;
using Microsoft.EntityFrameworkCore;

namespace FishingOnline.Api.Tests;

/// <summary>Bot giữ hồ không vắng (yêu cầu 2026-11-16): thêm/bớt theo ngưỡng, hành xử như người chơi, đánh dấu cho Admin, không lộ cho Client.</summary>
public sealed class BotTests(PostgresServer postgres) : AdminTestBase(postgres)
{
    private const int MaxWaitMs = 6000;

    private Task SetSettingsAsync(GameApp app, bool enabled = true, int min = 10, int max = 10, int successPct = 60) =>
        app.WithDbAsync(async db =>
        {
            await new BotSettingsService(db, app.Service<TimeProvider>())
                .UpdateAsync("test", new BotSettingsRequest(enabled, min, 60, max, successPct), default);
            return 0;
        });

    private static readonly string[] ClientPlayerFields =
        ["playerId", "displayName", "skinId", "rodId", "x", "y", "dir", "seatId", "fishing"];

    [Fact]
    public async Task Check_AddsBotBelowThreshold_StopsAtIt_RemovesWhenOver()
    {
        await SetSettingsAsync(App, min: 2, max: 5);
        var manager = App.Service<BotManager>();

        Assert.Equal(BotChecks.Spawned, (await manager.CheckOnceAsync(default)).Action);
        Assert.Equal(BotChecks.Spawned, (await manager.CheckOnceAsync(default)).Action);
        var steady = await manager.CheckOnceAsync(default);
        Assert.Equal(BotChecks.None, steady.Action);
        Assert.Equal(2, steady.TotalPlayers);
        Assert.Equal(2, manager.ActiveCount);

        // Người thật vào làm tổng 3 > 2: một bot rời để nhường chỗ.
        await using var real = await App.ConnectAsync();
        await real.OkAsync("JoinLake");
        var over = await manager.CheckOnceAsync(default);
        Assert.Equal(BotChecks.Removed, over.Action);
        Assert.Equal(1, manager.ActiveCount);
        Assert.Equal(2, await App.WithDbAsync(db => db.Players.CountAsync(player => player.IsBot)));
    }

    [Fact]
    public async Task Check_RespectsMaxBots_AndDisabledRemovesAll()
    {
        await SetSettingsAsync(App, min: 10, max: 2);
        var manager = App.Service<BotManager>();
        await manager.CheckOnceAsync(default);
        await manager.CheckOnceAsync(default);
        Assert.Equal(BotChecks.None, (await manager.CheckOnceAsync(default)).Action);
        Assert.Equal(2, manager.ActiveCount);

        await SetSettingsAsync(App, enabled: false, min: 10, max: 2);
        Assert.Equal(BotChecks.Removed, (await manager.CheckOnceAsync(default)).Action);
        Assert.Equal(0, manager.ActiveCount);
        Assert.Equal(BotChecks.Disabled, (await manager.CheckOnceAsync(default)).Action);
    }

    [Fact]
    public async Task ResumedBot_ReusesExistingIdentity()
    {
        await SetSettingsAsync(App, min: 1, max: 1);
        var manager = App.Service<BotManager>();
        await manager.CheckOnceAsync(default);
        var firstId = manager.ActiveIds.Single();

        await SetSettingsAsync(App, enabled: false, min: 1, max: 1);
        await manager.CheckOnceAsync(default);
        await SetSettingsAsync(App, min: 1, max: 1);
        await manager.CheckOnceAsync(default);

        Assert.Equal(firstId, manager.ActiveIds.Single());
        Assert.Equal(1, await App.WithDbAsync(db => db.Players.CountAsync(player => player.IsBot)));
    }

    [Fact]
    public async Task Bot_LooksLikeAnyPlayerToClients_NoBotFlagInPackets()
    {
        await SetSettingsAsync(App, min: 3, max: 3);
        var manager = App.Service<BotManager>();

        await using var watcher = await App.ConnectAsync();
        var snapshot = await watcher.OkAsync("JoinLake");
        await manager.CheckOnceAsync(default);
        await manager.CheckOnceAsync(default);
        var botId = manager.ActiveIds.First();

        var joined = await watcher.WaitForAsync("PlayerJoined", item => item.GetProperty("playerId").GetGuid() == botId);
        Assert.Equal(ClientPlayerFields.Order(), joined.EnumerateObject().Select(property => property.Name).Order());

        await using var late = await App.ConnectAsync();
        var lateSnapshot = await late.OkAsync("JoinLake");
        var bots = lateSnapshot.GetProperty("players").EnumerateArray().Where(player => manager.IsActive(player.GetProperty("playerId").GetGuid())).ToArray();
        Assert.NotEmpty(bots);
        foreach (var bot in bots)
            Assert.Equal(ClientPlayerFields.Order(), bot.EnumerateObject().Select(property => property.Name).Order());

        var http = App.Http(watcher.PlayerId);
        foreach (var path in new[] { "/api/v1/me", "/api/v1/rankings/total-catch-weekly", "/api/v1/me/codex" })
            Assert.DoesNotContain("isbot", await (await http.GetAsync(path)).Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("isbot", lateSnapshot.GetRawText(), StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(watcher.Received, item => item.Payload.GetRawText().Contains("isbot", StringComparison.OrdinalIgnoreCase));
        Assert.NotEmpty(snapshot.GetProperty("seats").EnumerateArray());
    }

    [Fact]
    public async Task Catch_IsMarkedBotOrHuman_AdminSeesIt_ClientNeverDoes()
    {
        // Đăng nhập Admin trước khi đẩy đồng hồ giả: token ký theo giờ giả, đi trước giờ thật quá 5 giây sẽ bị từ chối.
        var admin = await AdminAsync(AdminPermissions.PlayerRead);
        var botId = await App.NewPlayerAsync(1000);
        var humanId = await App.NewPlayerAsync(1000);
        await App.WithDbAsync(db => db.Players.Where(player => player.Id == botId).ExecuteUpdateAsync(set => set.SetProperty(player => player.IsBot, true)));

        async Task CatchOneAsync(Guid playerId, string seatId)
        {
            await using var player = await App.ConnectAsync(playerId);
            await player.OkAsync("JoinLake");
            await SitAsync(player, seatId);
            var attemptId = (await player.OkAsync("CastLine")).GetProperty("attemptId").GetGuid();
            App.Clock.AdvanceMs(MaxWaitMs);
            await App.Service<FishingService>().TickOnceAsync(default);
            await player.OkAsync("HookFish", new { attemptId });
            await player.OkAsync("SubmitFishingResult", new { attemptId, outcome = "success" });
        }

        await CatchOneAsync(botId, "seat-03");
        await CatchOneAsync(humanId, "seat-04");

        var rows = await App.WithDbAsync(db => db.Set<CatchRow>().AsNoTracking().ToListAsync());
        Assert.True(rows.Single(row => row.PlayerId == botId).IsBot);
        Assert.False(rows.Single(row => row.PlayerId == humanId).IsBot);

        var catches = await DataAsync(admin.GetAsync($"/api/v1/admin/players/{botId}/catches"));
        Assert.True(catches.GetProperty("items")[0].GetProperty("isBot").GetBoolean());
        var detail = await DataAsync(admin.GetAsync($"/api/v1/admin/players/{botId}"));
        Assert.True(detail.GetProperty("isBot").GetBoolean());
        var lake = await DataAsync(admin.GetAsync("/api/v1/admin/lake"));
        Assert.Contains(botId, lake.GetProperty("botPlayerIds").EnumerateArray().Select(id => id.GetGuid()));
        Assert.DoesNotContain(humanId, lake.GetProperty("botPlayerIds").EnumerateArray().Select(id => id.GetGuid()));

        // Client xem lại cá của mình và bảng xếp hạng: không có dấu vết cờ bot.
        var http = App.Http(botId);
        Assert.DoesNotContain("isbot", await (await http.GetAsync("/api/v1/me/inventory")).Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("isbot", await (await http.GetAsync("/api/v1/rankings/total-catch-weekly")).Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task AdminSettings_ReadUpdateValidateAndAudit()
    {
        var admin = await AdminAsync(AdminPermissions.ConfigRead, AdminPermissions.ConfigWrite, AdminPermissions.AuditRead, AdminPermissions.PlayerRead);

        var defaults = await DataAsync(admin.GetAsync("/api/v1/admin/bots/settings"));
        Assert.True(defaults.GetProperty("enabled").GetBoolean());
        Assert.Equal(10, defaults.GetProperty("minTotalPlayers").GetInt32());
        Assert.Equal(180, defaults.GetProperty("checkIntervalSeconds").GetInt32());

        var updated = await DataAsync(admin.PutAsJsonAsync("/api/v1/admin/bots/settings",
            new { enabled = true, minTotalPlayers = 12, checkIntervalSeconds = 120, maxBots = 6, successRatePct = 40 }));
        Assert.Equal(12, updated.GetProperty("minTotalPlayers").GetInt32());
        Assert.Equal(40, (await DataAsync(admin.GetAsync("/api/v1/admin/bots/settings"))).GetProperty("successRatePct").GetInt32());

        foreach (var bad in new object[]
        {
            new { enabled = true, minTotalPlayers = 12, checkIntervalSeconds = 5, maxBots = 6, successRatePct = 40 },
            new { enabled = true, minTotalPlayers = 99, checkIntervalSeconds = 120, maxBots = 6, successRatePct = 40 },
            new { enabled = true, minTotalPlayers = 12, checkIntervalSeconds = 120, maxBots = 6, successRatePct = 101 },
        })
            await AssertErrorAsync(await admin.PutAsJsonAsync("/api/v1/admin/bots/settings", bad), 400, "VALIDATION_FAILED");

        var audit = await DataAsync(admin.GetAsync("/api/v1/admin/audit"));
        Assert.Contains(audit.GetProperty("items").EnumerateArray(), row => row.GetProperty("action").GetString() == "bots.settings");

        var reader = await AdminAsync(AdminPermissions.ConfigRead);
        await AssertErrorAsync(await reader.PutAsJsonAsync("/api/v1/admin/bots/settings",
            new { enabled = true, minTotalPlayers = 1, checkIntervalSeconds = 60, maxBots = 1, successRatePct = 10 }), 403, "FORBIDDEN");
        var player = App.Http(await App.NewPlayerAsync());
        await AssertErrorAsync(await player.GetAsync("/api/v1/admin/bots/settings"), 403, "FORBIDDEN");
    }

    [Fact]
    public async Task Bot_FishesLikeAPlayer_CatchGoesToLeaderboard_FlaggedForAdmin()
    {
        var app = StartApp(realTimers: true);
        await SetSettingsAsync(app, min: 1, max: 1, successPct: 100);

        await app.Service<BotManager>().CheckOnceAsync(default);
        var botId = app.Service<BotManager>().ActiveIds.Single();

        // Bot đi dạo, mua vé, ngồi ghế và câu qua FishingService thật (cá cắn do Server định, vài giây).
        CatchRow? first = null;
        var deadline = DateTime.UtcNow.AddSeconds(90);
        while (first is null && DateTime.UtcNow < deadline)
        {
            await Task.Delay(500);
            first = await app.WithDbAsync(db => db.Set<CatchRow>().AsNoTracking().FirstOrDefaultAsync(row => row.PlayerId == botId));
        }

        Assert.NotNull(first);
        Assert.True(first.IsBot);
        var ledger = await app.WithDbAsync(db => db.Set<FishingOnline.Api.Modules.Wallet.LedgerEntry>().AsNoTracking()
            .Where(row => row.PlayerId == botId).Select(row => row.Reason).ToListAsync());
        Assert.Contains("ticket_purchase", ledger);

        var viewer = await app.NewPlayerAsync();
        var board = await ReadDataAsync(await app.Http(viewer).GetAsync("/api/v1/rankings/total-catch-weekly"));
        Assert.DoesNotContain("isbot", board.GetRawText(), StringComparison.OrdinalIgnoreCase);
        Assert.True(await app.WithDbAsync(db => db.Set<CatchRow>().AnyAsync(row => row.PlayerId == botId && row.IsBot)));
    }
}
