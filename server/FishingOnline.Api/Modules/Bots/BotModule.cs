using System.Collections.Concurrent;
using FishingOnline.Api.Modules.Config;
using FishingOnline.Api.Modules.Fishing;
using FishingOnline.Api.Modules.Identity;
using FishingOnline.Api.Modules.Lake;
using FishingOnline.Api.Modules.Wallet;
using FishingOnline.Api.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FishingOnline.Api.Modules.Bots;

/// <summary>
/// Giữ số người trong hồ không dưới ngưỡng bằng bot (yêu cầu 2026-11-16): mỗi lần kiểm tra, tổng người (cả bot) dưới
/// <see cref="BotSettingsRow.MinTotalPlayers"/> thì thêm 1 bot, trên ngưỡng thì cho 1 bot rời. Bot là người chơi thật về mặt
/// dữ liệu (Players.IsBot) nên cá của bot vào bảng xếp hạng như mọi người; cờ IsBot chỉ phục vụ Admin và không bao giờ gửi cho Client.
/// </summary>
public sealed class BotManager(
    IServiceScopeFactory scopes,
    LakeRoom room,
    LakeLayout layout,
    SeatSessions seats,
    FishingService fishing,
    IConfigProvider configs,
    BotMap map,
    IConfiguration configuration,
    TimeProvider time,
    ILogger<BotManager> logger)
{
    private static readonly string[] Names =
    [
        "Minh Khoa", "Thu Hà", "Quang Huy", "Bảo Ngọc", "Đức Anh", "Lan Anh", "Hoàng Nam", "Thanh Tùng", "Mai Phương", "Gia Bảo",
        "Tuấn Kiệt", "Ngọc Diệp", "Việt Hùng", "Khánh Linh", "Trung Hiếu", "Hải Yến", "Phúc An", "Bích Trâm", "Tiến Dũng", "Cẩm Tú",
        "Sơn Tùng", "Hồng Nhung", "Anh Khoa", "Diệu Linh", "Nhật Minh", "Thảo Vy", "Công Phượng", "Kim Chi", "Đăng Khoa", "Yến Nhi",
        "Alex Turner", "Emma Davis", "Lucas Meyer", "Sofia Rossi", "Kenji Sato", "Yuki Tanaka", "Min Jun", "Seo Yeon",
    ];

    private static readonly string[] Skins = ["skin_01", "skin_02", "skin_03", "skin_04", "skin_05"];

    private readonly ConcurrentDictionary<Guid, BotAgent> active = new();
    private readonly SemaphoreSlim gate = new(1, 1);
    private readonly Random random = new();

    private double TimeScale => Math.Max(1.0, configuration.GetValue("Bots:TimeScale", 1.0));

    public int ActiveCount => active.Count;

    public bool IsActive(Guid playerId) => active.ContainsKey(playerId);

    public IReadOnlyCollection<Guid> ActiveIds => active.Keys.ToArray();

    /// <summary>Một lần kiểm tra theo cài đặt hiện tại; trả hành động đã làm và khoảng chờ tới lần kiểm tra kế.</summary>
    public async Task<BotCheckResult> CheckOnceAsync(CancellationToken ct)
    {
        await gate.WaitAsync(ct);
        try
        {
            var settings = await ReadSettingsAsync(ct);
            var total = await room.Queue.RunAsync(() => Task.FromResult(room.Count));
            if (!settings.Enabled)
            {
                var wasActive = active.Count;
                await RemoveAllCoreAsync();
                return new BotCheckResult(wasActive > 0 ? BotChecks.Removed : BotChecks.Disabled, total, 0, settings.CheckIntervalSeconds);
            }

            var action = BotChecks.None;
            if (total < settings.MinTotalPlayers && active.Count < settings.MaxBots)
            {
                await SpawnCoreAsync(ct);
                action = BotChecks.Spawned;
            }
            else if ((total > settings.MinTotalPlayers && !active.IsEmpty) || active.Count > settings.MaxBots)
            {
                await RemoveOneCoreAsync();
                action = BotChecks.Removed;
            }
            return new BotCheckResult(action, total, active.Count, settings.CheckIntervalSeconds);
        }
        finally
        {
            gate.Release();
        }
    }

    public async Task StopAllAsync()
    {
        await gate.WaitAsync();
        try
        {
            await RemoveAllCoreAsync();
        }
        finally
        {
            gate.Release();
        }
    }

    private async Task<BotSettingsRow> ReadSettingsAsync(CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        return await scope.ServiceProvider.GetRequiredService<BotSettingsService>().GetRowAsync(ct);
    }

    private async Task<int> SuccessPctAsync(CancellationToken ct) => (await ReadSettingsAsync(ct)).SuccessRatePct;

    private async Task SpawnCoreAsync(CancellationToken ct)
    {
        var profile = await PickOrCreateBotAsync(ct);
        var deps = new BotDeps(scopes, room, layout, seats, fishing, configs, map, time, TimeScale, SuccessPctAsync, logger);
        var agent = new BotAgent(profile.Id, profile.DisplayName, profile.SelectedSkinId, profile.EquippedRodId, deps);
        await agent.StartAsync();
        active[profile.Id] = agent;
        logger.LogInformation("Bot {Bot} joined the lake", profile.DisplayName);
    }

    private async Task RemoveOneCoreAsync()
    {
        var id = active.Keys.ElementAt(random.Next(active.Count));
        await RemoveCoreAsync(id);
    }

    private async Task RemoveAllCoreAsync()
    {
        foreach (var id in active.Keys.ToArray()) await RemoveCoreAsync(id);
    }

    private async Task RemoveCoreAsync(Guid id)
    {
        if (!active.TryRemove(id, out var agent)) return;
        try
        {
            await agent.StopAsync();
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Bot {Bot} did not leave cleanly", agent.DisplayName);
        }
        logger.LogInformation("Bot {Bot} left the lake", agent.DisplayName);
    }

    /// <summary>Dùng lại bot đã có nhưng đang nghỉ (giữ nguyên danh tính và điểm bảng xếp hạng); chưa có thì tạo mới.</summary>
    private async Task<PlayerProfile> PickOrCreateBotAsync(CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        var busy = active.Keys.ToArray();
        var inRoom = await room.Queue.RunAsync(() => Task.FromResult(room.Views().Select(view => view.PlayerId).ToArray()));
        var resting = await db.Players.AsNoTracking()
            .Where(player => player.IsBot && !busy.Contains(player.Id) && !inRoom.Contains(player.Id)).ToListAsync(ct);
        if (resting.Count > 0) return resting[random.Next(resting.Count)];
        return await CreateBotAsync(scope.ServiceProvider, db, ct);
    }

    private async Task<PlayerProfile> CreateBotAsync(IServiceProvider services, GameDbContext db, CancellationToken ct)
    {
        var used = (await db.Players.AsNoTracking().Select(player => player.DisplayNameKey).ToListAsync(ct)).ToHashSet();
        var name = Names.OrderBy(_ => random.Next()).FirstOrDefault(candidate => !used.Contains(DisplayNames.Key(candidate)));
        while (name is null)
        {
            var candidate = $"{Names[random.Next(Names.Length)]} {random.Next(10, 99)}";
            if (candidate.Length <= 16 && !used.Contains(DisplayNames.Key(candidate))) name = candidate;
        }

        var config = configs.Current;
        var player = new PlayerProfile
        {
            Id = Guid.CreateVersion7(),
            DisplayName = name,
            DisplayNameKey = DisplayNames.Key(name),
            CreatedAt = time.GetUtcNow(),
            SelectedSkinId = Skins[random.Next(Skins.Length)],
            EquippedRodId = config.NewPlayer.RodId,
            IsBot = true,
        };
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        db.Players.Add(player);
        await db.SaveChangesAsync(ct);
        await services.GetRequiredService<IWallet>()
            .CreditAsync(player.Id, config.NewPlayer.Gold, LedgerReasons.GrantNewPlayer, "bot", ct);
        await services.GetRequiredService<INewPlayerGrant>().GrantAsync(player.Id, ct);
        await transaction.CommitAsync(ct);
        return player;
    }
}

/// <summary>Chạy BotManager theo chu kỳ trong cài đặt (mặc định 3 phút); đọc lại cài đặt ở mỗi lần nên Admin đổi là áp dụng.</summary>
public sealed class BotDirector(BotManager manager, IConfiguration configuration, ILogger<BotDirector> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var pollMs = configuration.GetValue("Bots:PollMs", 1000);
        if (pollMs <= 0) return;

        var next = DateTimeOffset.UtcNow.AddSeconds(configuration.GetValue("Bots:StartDelaySeconds", 15));
        using var timer = new PeriodicTimer(TimeSpan.FromMilliseconds(pollMs));
        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                if (DateTimeOffset.UtcNow < next) continue;
                var seconds = 180;
                try
                {
                    var result = await manager.CheckOnceAsync(stoppingToken);
                    seconds = result.NextCheckSeconds;
                    if (result.Action != BotChecks.None)
                        logger.LogInformation("Bot check: {Action}, {Total} in lake, {Bots} bots", result.Action, result.TotalPlayers, result.Bots);
                }
                catch (Exception exception) when (exception is not OperationCanceledException)
                {
                    logger.LogError(exception, "Bot check failed");
                }
                next = DateTimeOffset.UtcNow.AddSeconds(seconds);
            }
        }
        catch (OperationCanceledException)
        {
            // Host đang dừng.
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        await base.StopAsync(cancellationToken);
        await manager.StopAllAsync();
    }
}

public static class BotModule
{
    public static IServiceCollection AddBots(this IServiceCollection services)
    {
        services.AddSingleton(_ => BotMap.Load());
        services.AddSingleton<BotManager>();
        services.AddScoped<BotSettingsService>();
        services.AddHostedService<BotDirector>();
        return services;
    }
}
