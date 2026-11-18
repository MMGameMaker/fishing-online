using System.Net.Http.Json;
using System.Text.Json;
using FishingOnline.Api.Modules.Admin;
using FishingOnline.Api.Modules.Bots;
using FishingOnline.Api.Modules.Economy;
using FishingOnline.Api.Modules.Fishing;
using FishingOnline.Api.Modules.Lake;
using FishingOnline.Api.Modules.Social;
using FishingOnline.Api.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FishingOnline.Api.Tests;

/// <summary>Bảng mốc và dữ liệu bot (BOT-02), không cần DB.</summary>
public sealed class BotContentTests
{
    [Theory]
    [InlineData(0, 30, 20)]
    [InlineData(9, 30, 20)]
    [InlineData(10, 30, 20)]
    [InlineData(19, 30, 20)]
    [InlineData(20, 20, 8)]
    [InlineData(30, 20, 8)]
    [InlineData(31, 10, 0)]
    [InlineData(40, 10, 0)]
    [InlineData(41, 3, 0)]
    [InlineData(200, 3, 0)]
    public void DefaultTiers_EachLevel(int realPlayers, int totalBots, int fishingBots)
    {
        var tier = BotTiers.Pick(BotTiers.Default, realPlayers);
        Assert.Equal(totalBots, tier.TotalBots);
        Assert.Equal(fishingBots, tier.FishingBots);
    }

    [Fact]
    public void TierValidation()
    {
        Assert.True(BotTiers.IsValid(BotTiers.Default, 50));
        Assert.False(BotTiers.IsValid([], 50));
        Assert.False(BotTiers.IsValid([new BotTier(1, 3, 0)], 50));
        Assert.False(BotTiers.IsValid([new BotTier(0, 3, 0), new BotTier(0, 2, 0)], 50));
        Assert.False(BotTiers.IsValid([new BotTier(0, 51, 0)], 50));
        Assert.False(BotTiers.IsValid([new BotTier(0, 3, 4)], 50));
    }

    [Fact]
    public void Content_HasApprovedNamesAndLines()
    {
        var content = BotContent.Load();
        Assert.Equal(50, content.Names.Count);
        Assert.Equal(50, content.Names.Distinct().Count());
        Assert.All(content.Names, name => Assert.InRange(name.Length, 3, 16));
        Assert.Equal(100, content.NormalChat.Count);
        Assert.Equal(50, content.SuccessChat.Count);
        Assert.Equal("Cá đâu hết rồi, trốn kỹ thế!", content.WaitingLines[0]);
        Assert.Equal("Ôi, dính rồi! Dính rồi!", content.FightingLines[0]);
        Assert.Equal(60, content.GeneralLines.Count);
    }

    [Fact]
    public void PickChat_ByState()
    {
        var content = BotContent.Load();
        var random = new Random(3);
        for (var i = 0; i < 300; i++)
        {
            Assert.Contains(content.PickChat(BotChatState.Idle, random), content.GeneralLines);
            var waiting = content.PickChat(BotChatState.Waiting, random);
            Assert.True(content.WaitingLines.Contains(waiting) || content.GeneralLines.Contains(waiting));
            var fighting = content.PickChat(BotChatState.Fighting, random);
            Assert.True(content.FightingLines.Contains(fighting) || content.GeneralLines.Contains(fighting));
        }
        Assert.Contains(Enumerable.Range(0, 100).Select(_ => content.PickChat(BotChatState.Waiting, random)), content.WaitingLines.Contains);
        Assert.Contains(Enumerable.Range(0, 100).Select(_ => content.PickChat(BotChatState.Fighting, random)), content.FightingLines.Contains);
    }

    [Fact]
    public void BioAndTitle_AreStablePerBot()
    {
        var content = BotContent.Load();
        var id = Guid.NewGuid();
        Assert.Equal(content.BioFor(id), content.BioFor(id));
        Assert.Contains(content.BioFor(id), content.NormalChat);
        Assert.Equal(BotContent.TitleFor(id, ["a", "b", "c"]), BotContent.TitleFor(id, ["a", "b", "c"]));
    }
}

/// <summary>Bot theo số user thật trong hồ (BOT-02): mốc, giới hạn hồ, ghế, chat, kết bạn; hành xử như người chơi, không lộ cho Client.</summary>
public sealed class BotTests(PostgresServer postgres) : AdminTestBase(postgres)
{
    private const int MaxWaitMs = 6000;

    private static BotTier[] Tiers(params (int Min, int Total, int Fishing)[] tiers) =>
        tiers.Select(tier => new BotTier(tier.Min, tier.Total, tier.Fishing)).ToArray();

    private Task SetSettingsAsync(GameApp app, BotTier[] tiers, bool enabled = true, int successPct = 60) =>
        app.WithDbAsync(async db =>
        {
            await new BotSettingsService(db, app.Service<TimeProvider>())
                .UpdateAsync("test", new BotSettingsRequest(enabled, 60, successPct, tiers), default);
            return 0;
        });

    private static readonly string[] ClientPlayerFields =
        ["playerId", "displayName", "skinId", "rodId", "x", "y", "dir", "seatId", "fishing"];

    private static async Task<T> EventuallyAsync<T>(Func<Task<T>> read, Func<T, bool> done, int timeoutMs = 20000)
    {
        var deadline = DateTime.UtcNow.AddMilliseconds(timeoutMs);
        var value = await read();
        while (!done(value) && DateTime.UtcNow < deadline)
        {
            await Task.Delay(50);
            value = await read();
        }
        return value;
    }

    [Fact]
    public async Task Check_FollowsTierForRealPlayers()
    {
        await SetSettingsAsync(App, Tiers((0, 3, 0), (1, 1, 0), (2, 0, 0)));
        var manager = App.Service<BotManager>();

        var empty = await manager.CheckOnceAsync(default);
        Assert.Equal(BotChecks.Spawned, empty.Action);
        Assert.Equal(0, empty.RealPlayers);
        Assert.Equal(3, manager.ActiveCount);
        Assert.Equal(BotChecks.None, (await manager.CheckOnceAsync(default)).Action);

        // Một user thật vào: mốc 1 → còn 1 bot (bot là người nên không tính vào user thật).
        await using var first = await App.ConnectAsync();
        await first.OkAsync("JoinLake");
        var one = await manager.CheckOnceAsync(default);
        Assert.Equal(BotChecks.Removed, one.Action);
        Assert.Equal(1, one.RealPlayers);
        Assert.Equal(1, manager.ActiveCount);

        await using var second = await App.ConnectAsync();
        await second.OkAsync("JoinLake");
        Assert.Equal(0, (await manager.CheckOnceAsync(default)).Bots);
        Assert.Equal(3, await App.WithDbAsync(db => db.Players.CountAsync(player => player.IsBot)));
    }

    [Fact]
    public async Task Check_JoinsAndLeavesGradually()
    {
        var app = StartApp(settings: new Dictionary<string, string> { ["Bots:StaggerMinMs"] = "10000", ["Bots:StaggerMaxMs"] = "10000" });
        await SetSettingsAsync(app, Tiers((0, 3, 0)));
        var manager = app.Service<BotManager>();
        var room = app.Service<LakeRoom>();

        var started = DateTime.UtcNow;
        await manager.CheckOnceAsync(default);
        // TimeScale 50: 10 giây → 200 ms giữa hai bot; 3 bot mất ít nhất 2 khoảng.
        Assert.True(DateTime.UtcNow - started >= TimeSpan.FromMilliseconds(380));
        Assert.Equal(3, await room.Queue.RunAsync(() => Task.FromResult(room.Count)));
    }

    [Fact]
    public async Task Lake_NeverExceedsMaxPlayers_HumanAlwaysGetsIn()
    {
        var app = StartApp(settings: new Dictionary<string, string> { ["Lake:MaxPlayers"] = "4" });
        await SetSettingsAsync(app, Tiers((0, 10, 0)));
        var manager = app.Service<BotManager>();
        var room = app.Service<LakeRoom>();

        var full = await manager.CheckOnceAsync(default);
        Assert.Equal(4, full.TargetBots);
        Assert.Equal(4, manager.ActiveCount);

        // Hồ đầy bot: user thật vẫn vào được, một bot rời ngay để tổng vẫn là 4.
        await using var human = await app.ConnectAsync();
        var snapshot = await human.OkAsync("JoinLake");
        Assert.Equal(4, snapshot.GetProperty("players").GetArrayLength());
        Assert.Equal(4, await room.Queue.RunAsync(() => Task.FromResult(room.Count)));
        await EventuallyAsync(() => Task.FromResult(manager.ActiveCount), count => count == 3);
        Assert.Equal(3, manager.ActiveCount);

        var after = await manager.CheckOnceAsync(default);
        Assert.Equal(3, after.TargetBots);
        Assert.Equal(3, after.Bots);
    }

    [Fact]
    public async Task Disabled_RemovesAll()
    {
        await SetSettingsAsync(App, Tiers((0, 2, 0)));
        var manager = App.Service<BotManager>();
        await manager.CheckOnceAsync(default);
        Assert.Equal(2, manager.ActiveCount);

        await SetSettingsAsync(App, Tiers((0, 2, 0)), enabled: false);
        Assert.Equal(BotChecks.Removed, (await manager.CheckOnceAsync(default)).Action);
        Assert.Equal(0, manager.ActiveCount);
        Assert.Equal(BotChecks.Disabled, (await manager.CheckOnceAsync(default)).Action);
    }

    [Fact]
    public async Task ResumedBot_ReusesExistingIdentity()
    {
        await SetSettingsAsync(App, Tiers((0, 1, 0)));
        var manager = App.Service<BotManager>();
        await manager.CheckOnceAsync(default);
        var firstId = manager.ActiveIds.Single();

        await SetSettingsAsync(App, Tiers((0, 1, 0)), enabled: false);
        await manager.CheckOnceAsync(default);
        await SetSettingsAsync(App, Tiers((0, 1, 0)));
        await manager.CheckOnceAsync(default);

        Assert.Equal(firstId, manager.ActiveIds.Single());
        Assert.Equal(1, await App.WithDbAsync(db => db.Players.CountAsync(player => player.IsBot)));
    }

    [Fact]
    public async Task Roster_RenamesOldBots_SkipsNamesTakenByRealPlayers()
    {
        var content = App.Service<BotContent>();
        var takenByHuman = content.Names[0];
        PlayerProfile Player(string name, bool bot) => new()
        {
            Id = Guid.CreateVersion7(),
            DisplayName = name,
            DisplayNameKey = name.ToLowerInvariant(),
            CreatedAt = DateTimeOffset.UtcNow,
            SelectedSkinId = "skin_01",
            EquippedRodId = "rod_old",
            IsBot = bot,
        };
        var oldBots = new[] { Player("Minh Khoa", true), Player("Alex Turner", true), Player(content.Names[5], true) };
        await App.WithDbAsync(async db =>
        {
            db.Players.AddRange(oldBots);
            db.Players.Add(Player(takenByHuman, false));
            return await db.SaveChangesAsync();
        });

        await App.Service<BotManager>().EnsureRosterAsync(default);

        var bots = await App.WithDbAsync(db => db.Players.AsNoTracking().Where(player => player.IsBot).ToListAsync());
        Assert.Equal(3, bots.Count);
        Assert.All(bots, bot => Assert.Contains(bot.DisplayName, content.Names));
        Assert.DoesNotContain(bots, bot => bot.DisplayName == takenByHuman);
        // Bot đã mang tên trong danh sách giữ nguyên tên.
        Assert.Equal(content.Names[5], bots.Single(bot => bot.Id == oldBots[2].Id).DisplayName);
        Assert.All(bots, bot => Assert.Contains(bot.Bio, content.NormalChat));
        Assert.All(bots, bot => Assert.False(string.IsNullOrEmpty(bot.TitleId)));
    }

    [Fact]
    public async Task BotsWithoutFishingSlot_NeverSit()
    {
        await SetSettingsAsync(App, Tiers((0, 3, 0)));
        var manager = App.Service<BotManager>();
        await manager.CheckOnceAsync(default);
        Assert.Equal(0, manager.FishingTarget);
        foreach (var id in manager.ActiveIds) Assert.False(await manager.TryTakeSeatAsync(id));

        // Bot dạo vài vòng (TimeScale 50) mà không mua vé hay ngồi ghế.
        await Task.Delay(1500);
        var ids = manager.ActiveIds.ToArray();
        Assert.False(await App.WithDbAsync(db => db.Set<SeatSessionRow>().AnyAsync(row => ids.Contains(row.PlayerId))));
        Assert.Empty(manager.SeatHolderIds);
    }

    [Fact]
    public async Task FishingTierDrops_SeatedBotsStandUp()
    {
        var app = StartApp(settings: new Dictionary<string, string> { ["Lake:SeatCount"] = "2" });
        await SetSettingsAsync(app, Tiers((0, 2, 2)));
        var manager = app.Service<BotManager>();
        await manager.CheckOnceAsync(default);
        // Cả hai bot lấy được suất ngồi (đang tới ghế hoặc đã ngồi).
        Assert.Equal(2, await EventuallyAsync(() => Task.FromResult(manager.SeatHolderIds.Count), count => count == 2, 30000));

        // User thật vào và đứng: bot nhường để luôn còn một ghế trống.
        await using var human = await app.ConnectAsync();
        await app.CreditAsync(human.PlayerId, 1000);
        await human.OkAsync("JoinLake");
        await manager.BalanceSeatsAsync();
        Assert.True(manager.SeatHolderIds.Count <= 1);
        var occupied = await EventuallyAsync(
            () => app.WithDbAsync(db => db.Set<SeatSessionRow>().CountAsync(row => row.EndedAt == null)), count => count <= 1);
        Assert.True(occupied <= 1);
        // Bot còn suất có thể vừa tới đúng ghế user chọn: thử lần lượt các ghế đang trống.
        await human.OkAsync("BuyTicket", TicketArgs());
        var sat = false;
        for (var attempt = 0; attempt < 20 && !sat; attempt++)
        {
            foreach (var seat in (await human.OkAsync("JoinLake")).GetProperty("seats").EnumerateArray()
                         .Where(seat => seat.GetProperty("state").GetString() == "available"))
            {
                sat = (await human.InvokeAsync("SitDown", new { seatId = seat.GetProperty("seatId").GetString() })).GetProperty("ok").GetBoolean();
                if (sat) break;
            }
        }
        Assert.True(sat);
        // User đã ngồi: một bot còn suất có thể ngồi ghế kia (không bắt buộc kịp trong thời gian test).
        await EventuallyAsync(() => app.WithDbAsync(db => db.Set<SeatSessionRow>().CountAsync(row => row.EndedAt == null)), count => count == 2, 10000);

        // Mốc bot câu về 0: bot còn ngồi phải đứng dậy.
        await SetSettingsAsync(app, Tiers((0, 2, 0)));
        await manager.CheckOnceAsync(default);
        var bots = manager.ActiveIds.ToArray();
        var botSeats = await EventuallyAsync(
            () => app.WithDbAsync(db => db.Set<SeatSessionRow>().CountAsync(row => row.EndedAt == null && bots.Contains(row.PlayerId))),
            count => count == 0);
        Assert.Equal(0, botSeats);
        Assert.Empty(manager.SeatHolderIds);
    }

    [Fact]
    public async Task Bot_LooksLikeAnyPlayerToClients_NoBotFlagInPackets()
    {
        await SetSettingsAsync(App, Tiers((0, 3, 0)));
        var manager = App.Service<BotManager>();

        await using var watcher = await App.ConnectAsync();
        var snapshot = await watcher.OkAsync("JoinLake");
        // User thật đã vào: mốc 0 vẫn áp vì bảng chỉ có mốc 0.
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
        foreach (var path in new[] { "/api/v1/me", "/api/v1/rankings/total-catch-weekly", "/api/v1/me/codex", $"/api/v1/players/{botId}/profile", "/api/v1/friends" })
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

        // Profile công khai của bot: ô khoe là loài có con to nhất bot đã câu, gói giống người thường.
        var profile = await ReadDataAsync(await App.Http(humanId).GetAsync($"/api/v1/players/{botId}/profile"));
        Assert.Equal(rows.Single(row => row.PlayerId == botId).SpeciesId, profile.GetProperty("showcase")[0].GetProperty("speciesId").GetString());
        Assert.DoesNotContain("isbot", profile.GetRawText(), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task AdminSettings_ReadUpdateValidateAndAudit()
    {
        var admin = await AdminAsync(AdminPermissions.ConfigRead, AdminPermissions.ConfigWrite, AdminPermissions.AuditRead, AdminPermissions.PlayerRead);

        var defaults = await DataAsync(admin.GetAsync("/api/v1/admin/bots/settings"));
        Assert.True(defaults.GetProperty("enabled").GetBoolean());
        Assert.Equal(180, defaults.GetProperty("checkIntervalSeconds").GetInt32());
        var tiers = defaults.GetProperty("tiers").EnumerateArray().ToArray();
        Assert.Equal(5, tiers.Length);
        Assert.Equal(30, tiers[0].GetProperty("totalBots").GetInt32());
        Assert.Equal(20, tiers[0].GetProperty("fishingBots").GetInt32());
        Assert.Equal(41, tiers[4].GetProperty("minRealPlayers").GetInt32());

        var newTiers = new[] { new { minRealPlayers = 0, totalBots = 12, fishingBots = 6 }, new { minRealPlayers = 5, totalBots = 2, fishingBots = 0 } };
        var updated = await DataAsync(admin.PutAsJsonAsync("/api/v1/admin/bots/settings",
            new { enabled = true, checkIntervalSeconds = 120, successRatePct = 40, tiers = newTiers }));
        Assert.Equal(2, updated.GetProperty("tiers").GetArrayLength());
        var reread = await DataAsync(admin.GetAsync("/api/v1/admin/bots/settings"));
        Assert.Equal(40, reread.GetProperty("successRatePct").GetInt32());
        Assert.Equal(12, reread.GetProperty("tiers")[0].GetProperty("totalBots").GetInt32());

        foreach (var bad in new object[]
        {
            new { enabled = true, checkIntervalSeconds = 5, successRatePct = 40, tiers = newTiers },
            new { enabled = true, checkIntervalSeconds = 120, successRatePct = 101, tiers = newTiers },
            new { enabled = true, checkIntervalSeconds = 120, successRatePct = 40, tiers = new[] { new { minRealPlayers = 3, totalBots = 1, fishingBots = 0 } } },
            new { enabled = true, checkIntervalSeconds = 120, successRatePct = 40, tiers = new[] { new { minRealPlayers = 0, totalBots = 99, fishingBots = 0 } } },
            new { enabled = true, checkIntervalSeconds = 120, successRatePct = 40, tiers = new[] { new { minRealPlayers = 0, totalBots = 2, fishingBots = 3 } } },
        })
            await AssertErrorAsync(await admin.PutAsJsonAsync("/api/v1/admin/bots/settings", bad), 400, "VALIDATION_FAILED");

        var audit = await DataAsync(admin.GetAsync("/api/v1/admin/audit"));
        Assert.Contains(audit.GetProperty("items").EnumerateArray(), row => row.GetProperty("action").GetString() == "bots.settings");

        var reader = await AdminAsync(AdminPermissions.ConfigRead);
        await AssertErrorAsync(await reader.PutAsJsonAsync("/api/v1/admin/bots/settings",
            new { enabled = true, checkIntervalSeconds = 60, successRatePct = 10, tiers = newTiers }), 403, "FORBIDDEN");
        var player = App.Http(await App.NewPlayerAsync());
        await AssertErrorAsync(await player.GetAsync("/api/v1/admin/bots/settings"), 403, "FORBIDDEN");
    }

    private static async Task<(double X, double Y)> PositionAsync(GameApp app, Guid playerId) =>
        await app.Service<FishingOnline.Api.Modules.Lake.LakeRoom>().Queue.RunAsync(() =>
            Task.FromResult(app.Service<FishingOnline.Api.Modules.Lake.LakeRoom>().Find(playerId) is { } p ? (p.X, p.Y) : (double.NaN, double.NaN)));

    [Fact]
    public async Task Watchdog_RestartsOnlyStalledBots_AndTheyKeepMoving()
    {
        var app = StartApp(realTimers: true);
        await SetSettingsAsync(app, Tiers((0, 1, 1)));
        var manager = app.Service<BotManager>();
        await manager.CheckOnceAsync(default);
        var botId = manager.ActiveIds.Single();

        // Bot mới chạy không bị coi là kẹt.
        Assert.Equal(0, await manager.RestartStalledAsync(BotManager.StallLimit));

        // Ngưỡng 0: mọi bot đều bị khởi động lại, rồi vẫn tiếp tục đi (vòng đời mới thật sự chạy).
        var before = await PositionAsync(app, botId);
        Assert.Equal(1, await manager.RestartStalledAsync(TimeSpan.Zero));
        var deadline = DateTime.UtcNow.AddSeconds(20);
        var moved = false;
        while (!moved && DateTime.UtcNow < deadline)
        {
            await Task.Delay(300);
            var now = await PositionAsync(app, botId);
            moved = Math.Abs(now.X - before.X) + Math.Abs(now.Y - before.Y) > 2;
        }
        Assert.True(moved, "Bot did not move after a watchdog restart.");
        Assert.True(manager.IsActive(botId));
    }

    private static async Task<string> WaitForSeatedAsync(GameApp app, Guid botId, int seconds = 150)
    {
        var deadline = DateTime.UtcNow.AddSeconds(seconds);
        while (DateTime.UtcNow < deadline)
        {
            var seatId = await app.WithDbAsync(db => db.Set<FishingOnline.Api.Modules.Lake.SeatSessionRow>().AsNoTracking()
                .Where(row => row.PlayerId == botId && row.EndedAt == null).Select(row => row.SeatId).FirstOrDefaultAsync());
            if (seatId is not null) return seatId;
            await Task.Delay(300);
        }
        throw new TimeoutException("The bot never sat down.");
    }

    [Fact]
    public async Task Player_CannotSitOnASeatABotIsSittingOn()
    {
        var app = StartApp(realTimers: true);
        await SetSettingsAsync(app, Tiers((0, 1, 1)));
        var manager = app.Service<BotManager>();
        await manager.CheckOnceAsync(default);
        var seatId = await WaitForSeatedAsync(app, manager.ActiveIds.Single());

        await using var real = await app.ConnectAsync();
        await real.OkAsync("JoinLake");
        await real.OkAsync("BuyTicket", TicketArgs());
        Assert.Equal("SEAT_TAKEN", await real.ErrorAsync("SitDown", new { seatId }));
    }

    [Fact]
    public async Task Bot_LeavesTheSeatSpot_WhenTheServerEndsItsSession_SoNobodyStacksOnIt()
    {
        var app = StartApp(realTimers: true);
        await SetSettingsAsync(app, Tiers((0, 1, 1)));
        var manager = app.Service<BotManager>();
        await manager.CheckOnceAsync(default);
        var botId = manager.ActiveIds.Single();
        await WaitForSeatedAsync(app, botId);
        var seatSpot = await PositionAsync(app, botId);

        // Hết vé giữa chừng: Server kết thúc phiên ngồi. Bot không được đứng "ngồi ma" ở vị trí ghế.
        await app.Service<FishingOnline.Api.Modules.Lake.SeatSessions>().EndAsync(botId, "ticket_expired", default);

        var deadline = DateTime.UtcNow.AddSeconds(30);
        var left = false;
        while (!left && DateTime.UtcNow < deadline)
        {
            await Task.Delay(300);
            var now = await PositionAsync(app, botId);
            left = !BotMap.TooClose(now.X, now.Y, seatSpot.X, seatSpot.Y);
        }
        Assert.True(left, "The bot stayed on the seat spot after its session ended.");
    }

    [Fact]
    public async Task Soak_ManyBots_NeverStackOnASeatedPlayer_AndSeatsStayUnique()
    {
        var app = StartApp(realTimers: true);
        await SetSettingsAsync(app, Tiers((0, 8, 8)));
        var manager = app.Service<BotManager>();
        for (var i = 0; i < 8; i++) await manager.CheckOnceAsync(default);
        Assert.Equal(8, manager.ActiveCount);
        var room = app.Service<FishingOnline.Api.Modules.Lake.LakeRoom>();

        var violations = new List<string>();
        var seatedSeen = 0;
        var deadline = DateTime.UtcNow.AddSeconds(100);
        while (DateTime.UtcNow < deadline)
        {
            var views = await room.Queue.RunAsync(() => Task.FromResult(room.Views()));
            var seated = views.Where(view => view.SeatId is not null).ToArray();
            seatedSeen = Math.Max(seatedSeen, seated.Length);
            foreach (var group in seated.GroupBy(view => view.SeatId).Where(group => group.Count() > 1))
                violations.Add($"seat {group.Key} has {group.Count()} occupants");
            foreach (var sitter in seated)
                foreach (var other in views.Where(view => view.PlayerId != sitter.PlayerId))
                    if (Math.Abs(other.X - sitter.X) < 4 && Math.Abs(other.Y - sitter.Y) < 4)
                        violations.Add($"{other.DisplayName} stands on {sitter.DisplayName} at seat {sitter.SeatId} ({sitter.X:0},{sitter.Y:0})");
            var open = await app.WithDbAsync(db => db.Set<FishingOnline.Api.Modules.Lake.SeatSessionRow>().AsNoTracking()
                .Where(row => row.EndedAt == null).Select(row => row.SeatId).ToListAsync());
            if (open.Count != open.Distinct().Count()) violations.Add("duplicate open seat sessions in DB");
            await Task.Delay(250);
        }

        Assert.Empty(violations.Distinct());
        Assert.True(seatedSeen > 0, "No bot ever sat down during the soak run.");
    }

    [Fact]
    public async Task Bot_MovesAwayWhenAPlayerStandsOnIt_AndNeverRestsOnAnotherBot()
    {
        var app = StartApp(realTimers: true);
        await SetSettingsAsync(app, Tiers((0, 3, 3)));
        var manager = app.Service<BotManager>();
        await manager.CheckOnceAsync(default);
        await manager.CheckOnceAsync(default);
        await manager.CheckOnceAsync(default);
        var bots = manager.ActiveIds.ToArray();
        Assert.Equal(3, bots.Length);

        // Người thật bước chồng lên một bot: bot phải tự đi sang chỗ khác.
        await using var real = await app.ConnectAsync();
        await real.OkAsync("JoinLake");
        var room = app.Service<FishingOnline.Api.Modules.Lake.LakeRoom>();
        var target = bots[0];
        var deadline = DateTime.UtcNow.AddSeconds(30);
        var separated = false;
        while (!separated && DateTime.UtcNow < deadline)
        {
            var (bx, by) = await PositionAsync(app, target);
            await room.Queue.RunAsync(() =>
            {
                if (room.Find(real.PlayerId) is { } player)
                {
                    player.X = bx;
                    player.Y = by;
                }
                return Task.FromResult(true);
            });
            await Task.Delay(1500);
            var (nx, ny) = await PositionAsync(app, target);
            var (px, py) = await PositionAsync(app, real.PlayerId);
            separated = !BotMap.TooClose(nx, ny, px, py);
        }
        Assert.True(separated, "Bot stayed on top of the player.");
    }

    [Fact]
    public async Task BotWorldChat_GoesThroughSocialService()
    {
        await SetSettingsAsync(App, Tiers((0, 1, 0)));
        var manager = App.Service<BotManager>();
        await using var watcher = await App.ConnectAsync();
        await watcher.OkAsync("JoinLake");
        await manager.CheckOnceAsync(default);
        var botId = manager.ActiveIds.Single();

        Assert.Equal(botId, await manager.ChatOnceAsync(default));
        var chat = await watcher.WaitForAsync("ChatReceived", item => item.GetProperty("playerId").GetGuid() == botId);
        // Bot không có suất câu nên luôn ở trạng thái đi dạo: chỉ dùng câu chung (1–35, 76–100).
        Assert.Contains(chat.GetProperty("text").GetString(), App.Service<BotContent>().GeneralLines);
        Assert.True(await App.WithDbAsync(db => db.Set<ChatMessageRow>().AnyAsync(row => row.PlayerId == botId)));
    }

    [Fact]
    public async Task Bot_InvitesNearbyHumanOnce_AcceptsInvites_RepliesToDirectMessages()
    {
        // Thời gian thật (TimeScale 1) để bot đi chậm như người, kịp đứng gần user trong lúc quét.
        var app = StartApp(settings: new Dictionary<string, string> { ["Bots:TimeScale"] = "1" });
        await SetSettingsAsync(app, Tiers((0, 1, 0)));
        var manager = app.Service<BotManager>();
        var room = app.Service<LakeRoom>();
        await manager.CheckOnceAsync(default);
        var botId = manager.ActiveIds.Single();

        await using var human = await app.ConnectAsync();
        async Task<(Guid Bot, Guid Human)?> InviteNearAsync()
        {
            var spot = await room.Queue.RunAsync(() => Task.FromResult(room.Find(botId)!));
            await human.OkAsync("JoinLake", new { x = spot.X, y = spot.Y, dir = "down" });
            return await manager.InviteNearbyOnceAsync(default);
        }

        Assert.Equal((botId, human.PlayerId), await InviteNearAsync());
        var invite = await human.WaitForAsync("FriendRequestReceived");
        Assert.Equal(botId, invite.GetProperty("playerId").GetGuid());
        Assert.Null(await InviteNearAsync());

        // Từ chối thì bot không mời lại (mỗi cặp một lần).
        var http = app.Http(human.PlayerId);
        (await http.PostAsync($"/api/v1/friends/requests/{botId}/decline", null)).EnsureSuccessStatusCode();
        Assert.Null(await InviteNearAsync());

        // User mời bot: bot tự đồng ý sau vài giây.
        var sent = await ReadDataAsync(await http.PostAsJsonAsync("/api/v1/friends/requests", new { playerId = botId }));
        Assert.Equal("sent", sent.GetProperty("status").GetString());
        var added = await human.WaitForAsync("FriendAdded");
        Assert.Equal(botId, added.GetProperty("playerId").GetGuid());

        // Nhắn riêng cho bot: bot trả lời một câu "Chat bình thường".
        await human.OkAsync("SendDirectMessage", new { toPlayerId = botId, text = "Chào bạn" });
        var reply = await human.WaitForAsync("DirectMessageReceived", item => item.GetProperty("fromPlayerId").GetGuid() == botId);
        Assert.Contains(reply.GetProperty("text").GetString(), app.Service<BotContent>().NormalChat);
    }

    [Fact]
    public async Task Bot_FishesLikeAPlayer_CatchGoesToLeaderboard_FlaggedForAdmin()
    {
        var app = StartApp(realTimers: true);
        await SetSettingsAsync(app, Tiers((0, 1, 1)), successPct: 100);

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
