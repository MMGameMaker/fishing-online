using System.Collections.Concurrent;
using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Modules.Config;
using FishingOnline.Api.Modules.Economy;
using FishingOnline.Api.Modules.Fishing;
using FishingOnline.Api.Modules.Identity;
using FishingOnline.Api.Modules.Lake;
using FishingOnline.Api.Modules.Profile;
using FishingOnline.Api.Modules.Social;
using FishingOnline.Api.Modules.Wallet;
using FishingOnline.Api.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FishingOnline.Api.Modules.Bots;

/// <summary>
/// Bot theo số user thật trong hồ (BOT-02, Zen duyệt 2026-11-18). Mỗi lần kiểm tra (mặc định 3 phút) đếm user thật, lấy mốc
/// trong <see cref="BotSettingsRow.Tiers"/> rồi đưa số bot về đúng mục tiêu, vào/ra dần vài giây một con; tổng người không vượt
/// Lake:MaxPlayers. Chỉ đúng số "bot được câu" mới có suất ngồi ghế, và luôn chừa một ghế trống khi có user thật đang đứng.
/// Bot chat world qua <see cref="SocialService"/> (cả hồ 20–40 giây một câu), mời kết bạn khi đi gần user thật, tự đồng ý
/// khi được mời và trả lời tin riêng. Bot là người chơi thật về mặt dữ liệu (Players.IsBot) nên cá của bot vào bảng xếp hạng
/// như mọi người; cờ IsBot chỉ phục vụ Admin và không bao giờ gửi cho Client.
/// </summary>
public sealed class BotManager : IBotCoordinator
{
    /// <summary>
    /// Skin bot random: 5 thỏ miễn phí + 20 skin thú chỉ-bot (skin_bot_*, GD chốt 2026-11-18, loại bear-panda, cat-calico, fox-red,
    /// raccoon, shiba-orange). Skin skin_bot_* không nằm trong Social.Skins nên người chơi không chọn được. Bot đã tạo trước đó giữ skin cũ.
    /// Khớp BAKED_BOT_SKINS ở client-v0/src/online/entities/characterArt.ts.
    /// </summary>
    public static readonly string[] Skins =
    [
        "skin_01", "skin_02", "skin_03", "skin_04", "skin_05",
        "skin_bot_bear_brown", "skin_bot_bear_polar", "skin_bot_beaver_brown", "skin_bot_cat_black", "skin_bot_cat_orange_tabby",
        "skin_bot_cat_purple", "skin_bot_cat_tuxedo", "skin_bot_cat_white", "skin_bot_duck_white", "skin_bot_fox_arctic",
        "skin_bot_fox_cascade_grey", "skin_bot_fox_silver", "skin_bot_harlequin", "skin_bot_rat_grey", "skin_bot_red_spotted_bunny",
        "skin_bot_shiba_cream", "skin_bot_shiba_dark", "skin_bot_turtle_green", "skin_bot_turtle_hermann", "skin_bot_turtle_leatherback",
    ];

    /// <summary>Bot mời kết bạn khi đứng cách user thật trong khoảng này (px).</summary>
    public const double InviteRadiusPx = 80;

    private readonly ConcurrentDictionary<Guid, BotAgent> active = new();
    private readonly SemaphoreSlim gate = new(1, 1);
    private readonly Random random = new();
    private readonly BotSpots spots = new();
    private readonly object seatLock = new();
    private readonly HashSet<Guid> seatHolders = [];
    private readonly ConcurrentDictionary<(Guid Bot, Guid Human), DateTimeOffset> lastDirect = new();
    private readonly ConcurrentDictionary<Guid, DateTimeOffset> lastInvite = new();
    private readonly ConcurrentDictionary<(Guid Bot, Guid Human), bool> invitedPairs = new();
    private readonly IServiceScopeFactory scopes;
    private readonly LakeRoom room;
    private readonly LakeLayout layout;
    private readonly SeatSessions seats;
    private readonly FishingService fishing;
    private readonly IConfigProvider configs;
    private readonly BotMap map;
    private readonly BotContent content;
    private readonly SocialService social;
    private readonly FriendService friends;
    private readonly IOptions<SocialOptions> socialOptions;
    private readonly IConfiguration configuration;
    private readonly TimeProvider time;
    private readonly ILogger<BotManager> logger;
    private readonly SemaphoreSlim rosterGate = new(1, 1);
    private volatile ConcurrentDictionary<Guid, bool>? botIds;
    private int fishingTarget;
    private DateTimeOffset nextWorldChatAt;
    private DateTimeOffset nextEmojiAt;
    private DateTimeOffset nextDirectAt;
    private DateTimeOffset nextInviteScanAt;
    private DateTimeOffset lastBotChatAt;

    public BotManager(
        IServiceScopeFactory scopes,
        LakeRoom room,
        LakeLayout layout,
        SeatSessions seats,
        FishingService fishing,
        IConfigProvider configs,
        BotMap map,
        BotContent content,
        SocialService social,
        FriendService friends,
        IOptions<SocialOptions> socialOptions,
        IConfiguration configuration,
        TimeProvider time,
        ILogger<BotManager> logger)
    {
        this.scopes = scopes;
        this.room = room;
        this.layout = layout;
        this.seats = seats;
        this.fishing = fishing;
        this.configs = configs;
        this.map = map;
        this.content = content;
        this.social = social;
        this.friends = friends;
        this.socialOptions = socialOptions;
        this.configuration = configuration;
        this.time = time;
        this.logger = logger;
        room.BotEvicted += OnBotEvictedAsync;
        social.DirectMessageSent += OnDirectMessageAsync;
        friends.RequestCreated += OnFriendRequestAsync;
    }

    private double TimeScale => Math.Max(1.0, configuration.GetValue("Bots:TimeScale", 1.0));

    private int MaxPlayers => configuration.GetValue("Lake:MaxPlayers", 50);

    public int ActiveCount => active.Count;

    public bool IsActive(Guid playerId) => active.ContainsKey(playerId);

    public IReadOnlyCollection<Guid> ActiveIds => active.Keys.ToArray();

    /// <summary>Bot đang giữ suất ngồi ghế (đang tới ghế hoặc đang câu).</summary>
    public IReadOnlyCollection<Guid> SeatHolderIds
    {
        get
        {
            lock (seatLock) return seatHolders.ToArray();
        }
    }

    /// <summary>Số bot được câu theo mốc ở lần kiểm tra gần nhất.</summary>
    public int FishingTarget => Volatile.Read(ref fishingTarget);

    // ---------- Kiểm tra theo mốc ----------

    /// <summary>
    /// Một lần kiểm tra: đếm user thật, lấy mốc, rồi thêm/bớt từng bot (cách nhau Bots:StaggerMinMs..MaxMs) tới đúng mục tiêu.
    /// Mỗi bước tính lại chỗ trống của hồ để user thật vào giữa chừng vẫn không vượt Lake:MaxPlayers.
    /// </summary>
    public async Task<BotCheckResult> CheckOnceAsync(CancellationToken ct)
    {
        await gate.WaitAsync(ct);
        try
        {
            var settings = await ReadSettingsAsync(ct);
            await EnsureRosterAsync(ct);
            var humans = await HumanCountAsync();
            var tier = settings.Enabled ? BotTiers.Pick(settings.Tiers, humans) : new BotTier(0, 0, 0);
            var capacity = Math.Max(0, MaxPlayers - humans);
            var target = Math.Min(tier.TotalBots, capacity);
            Volatile.Write(ref fishingTarget, Math.Min(tier.FishingBots, target));

            var spawned = 0;
            var removed = 0;
            for (var step = 0; ; step++)
            {
                var desired = Math.Min(target, Math.Max(0, MaxPlayers - await HumanCountAsync()));
                if (active.Count == desired) break;
                if (step > 0) await StaggerAsync(ct);
                if (active.Count < desired)
                {
                    if (!await SpawnCoreAsync(ct)) break;
                    spawned++;
                }
                else
                {
                    await RemoveOneCoreAsync();
                    removed++;
                }
            }
            await BalanceSeatsAsync();

            var action = spawned > 0 ? BotChecks.Spawned
                : removed > 0 ? BotChecks.Removed
                : settings.Enabled ? BotChecks.None : BotChecks.Disabled;
            return new BotCheckResult(action, humans, active.Count, target, FishingTarget, settings.CheckIntervalSeconds);
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
            foreach (var id in active.Keys.ToArray()) await RemoveCoreAsync(id);
        }
        finally
        {
            gate.Release();
        }
    }

    /// <summary>Nhịp ngắn (mỗi Bots:PollMs): giữ ghế cho user thật, chat world, emoji, mời kết bạn, nhắn riêng.</summary>
    public async Task TickAsync(CancellationToken ct)
    {
        foreach (var step in new Func<CancellationToken, Task>[]
                 {
                     _ => BalanceSeatsAsync(), WorldChatTickAsync, EmojiTickAsync, InviteTickAsync, DirectTickAsync,
                 })
        {
            try
            {
                await step(ct);
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                logger.LogWarning(exception, "Bot tick step failed");
            }
        }
    }

    /// <summary>Bot đứng yên quá lâu (không bước, không bước nào của lượt câu) thì coi là kẹt và khởi động lại vòng đời.</summary>
    public static readonly TimeSpan StallLimit = TimeSpan.FromSeconds(150);

    /// <summary>
    /// Khởi động lại mọi bot kẹt từ <paramref name="limit"/> trở lên; trả số bot đã khởi động lại. Không giữ khóa kiểm tra mốc
    /// (lần kiểm tra có thể chạy vài chục giây); bot bị bớt giữa chừng thì RestartAsync bỏ qua.
    /// </summary>
    public async Task<int> RestartStalledAsync(TimeSpan limit, CancellationToken ct = default)
    {
        var restarted = 0;
        foreach (var agent in active.Values.Where(agent => agent.StalledFor >= limit).ToArray())
        {
            ct.ThrowIfCancellationRequested();
            logger.LogWarning("Bot {Bot} stalled for {Seconds:0}s, restarting its loop", agent.DisplayName, agent.StalledFor.TotalSeconds);
            try
            {
                if (await agent.RestartAsync()) restarted++;
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                logger.LogWarning(exception, "Bot {Bot} could not be restarted", agent.DisplayName);
            }
        }
        return restarted;
    }

    private Task StaggerAsync(CancellationToken ct)
    {
        var min = configuration.GetValue("Bots:StaggerMinMs", 2000);
        var max = Math.Max(min, configuration.GetValue("Bots:StaggerMaxMs", 5000));
        return DelayAsync(random.Next(min, max + 1), ct);
    }

    private Task DelayAsync(int ms, CancellationToken ct) =>
        Task.Delay(TimeSpan.FromMilliseconds(Math.Max(1, ms / TimeScale)), ct);

    private Task<int> HumanCountAsync() => room.Queue.RunAsync(() => Task.FromResult(room.HumanCount));

    private async Task<BotSettingsRow> ReadSettingsAsync(CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        return await scope.ServiceProvider.GetRequiredService<BotSettingsService>().GetRowAsync(ct);
    }

    private async Task<int> SuccessPctAsync(CancellationToken ct) => (await ReadSettingsAsync(ct)).SuccessRatePct;

    private async Task<bool> SpawnCoreAsync(CancellationToken ct)
    {
        if (await PickOrCreateBotAsync(ct) is not { } profile) return false;
        var deps = new BotDeps(this, scopes, room, layout, seats, fishing, configs, map, spots, time, TimeScale, SuccessPctAsync, logger);
        var agent = new BotAgent(profile.Id, profile.DisplayName, profile.SelectedSkinId, profile.EquippedRodId, deps, profile.TitleId);
        active[profile.Id] = agent;
        await agent.StartAsync();
        logger.LogInformation("Bot {Bot} joined the lake", profile.DisplayName);
        return true;
    }

    /// <summary>Bớt một bot, ưu tiên bot không giữ suất ngồi ghế.</summary>
    private async Task RemoveOneCoreAsync()
    {
        Guid[] holders;
        lock (seatLock) holders = [.. seatHolders];
        var ids = active.Keys.ToArray();
        var walkers = ids.Where(id => !holders.Contains(id)).ToArray();
        var pool = walkers.Length > 0 ? walkers : ids;
        if (pool.Length == 0) return;
        await RemoveCoreAsync(pool[random.Next(pool.Length)]);
    }

    private async Task RemoveCoreAsync(Guid id)
    {
        if (!active.TryRemove(id, out var agent)) return;
        ReleaseSeat(id);
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

    /// <summary>User thật vào hồ đầy: phòng đã bỏ bot ra, giờ dừng hẳn bot đó.</summary>
    private Task OnBotEvictedAsync(Guid botId) => RemoveCoreAsync(botId);

    // ---------- Danh sách bot (50 tên) ----------

    /// <summary>
    /// Một lần mỗi lần chạy: bot cũ có tên ngoài danh sách được đổi sang tên mới còn trống (tên user thật đã dùng thì bỏ qua),
    /// gán lời nhắn và danh hiệu cố định cho bot chưa có. Bot mới tạo dần khi cần (tối đa đúng số tên).
    /// </summary>
    public async Task EnsureRosterAsync(CancellationToken ct)
    {
        if (botIds is not null) return;
        await rosterGate.WaitAsync(ct);
        try
        {
            if (botIds is null) await LoadRosterAsync(ct);
        }
        finally
        {
            rosterGate.Release();
        }
    }

    private async Task LoadRosterAsync(CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        var bots = await db.Players.AsTracking().Where(player => player.IsBot).OrderBy(player => player.CreatedAt).ToListAsync(ct);
        var humanKeys = (await db.Players.AsNoTracking().Where(player => !player.IsBot).Select(player => player.DisplayNameKey).ToListAsync(ct)).ToHashSet();
        var listed = content.Names.Where(name => !humanKeys.Contains(DisplayNames.Key(name))).ToList();
        var listedKeys = listed.Select(DisplayNames.Key).ToHashSet();
        var kept = bots.Where(bot => listedKeys.Contains(bot.DisplayNameKey)).Select(bot => bot.DisplayNameKey).ToHashSet();
        var free = new Queue<string>(listed.Where(name => !kept.Contains(DisplayNames.Key(name))));
        foreach (var bot in bots)
        {
            if (!listedKeys.Contains(bot.DisplayNameKey) && free.TryDequeue(out var name))
            {
                bot.DisplayName = name;
                bot.DisplayNameKey = DisplayNames.Key(name);
            }
            if (string.IsNullOrEmpty(bot.Bio)) bot.Bio = content.BioFor(bot.Id);
            // Theo id nên ổn định; ghi lại mỗi lần để bot cũ nhận luôn các danh hiệu mới (2026-11-18).
            bot.TitleId = BotContent.TitleFor(bot.Id, ProfileRules.TitleIds);
        }
        await db.SaveChangesAsync(ct);
        botIds = new ConcurrentDictionary<Guid, bool>(bots.Select(bot => KeyValuePair.Create(bot.Id, true)));
    }

    private bool IsBot(Guid playerId) => botIds?.ContainsKey(playerId) == true;

    /// <summary>Dùng lại bot đã có nhưng đang nghỉ (giữ danh tính và điểm xếp hạng); chưa đủ 50 thì tạo mới; hết tên thì null.</summary>
    private async Task<PlayerProfile?> PickOrCreateBotAsync(CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        var busy = active.Keys.ToArray();
        var inRoom = await room.Queue.RunAsync(() => Task.FromResult(room.Views().Select(view => view.PlayerId).ToArray()));
        var keys = content.Names.Select(DisplayNames.Key).ToArray();
        var resting = await db.Players.AsNoTracking()
            .Where(player => player.IsBot && keys.Contains(player.DisplayNameKey) && !busy.Contains(player.Id) && !inRoom.Contains(player.Id))
            .ToListAsync(ct);
        if (resting.Count > 0) return resting[random.Next(resting.Count)];
        return await CreateBotAsync(scope.ServiceProvider, db, ct);
    }

    private async Task<PlayerProfile?> CreateBotAsync(IServiceProvider services, GameDbContext db, CancellationToken ct)
    {
        var used = (await db.Players.AsNoTracking().Select(player => player.DisplayNameKey).ToListAsync(ct)).ToHashSet();
        var name = content.Names.Where(candidate => !used.Contains(DisplayNames.Key(candidate))).OrderBy(_ => random.Next()).FirstOrDefault();
        if (name is null) return null;

        var config = configs.Current;
        var id = Guid.CreateVersion7();
        var player = new PlayerProfile
        {
            Id = id,
            DisplayName = name,
            DisplayNameKey = DisplayNames.Key(name),
            CreatedAt = time.GetUtcNow(),
            SelectedSkinId = Skins[random.Next(Skins.Length)],
            EquippedRodId = config.NewPlayer.RodId,
            Bio = content.BioFor(id),
            TitleId = BotContent.TitleFor(id, ProfileRules.TitleIds),
            IsBot = true,
        };
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        db.Players.Add(player);
        await db.SaveChangesAsync(ct);
        await services.GetRequiredService<IWallet>()
            .CreditAsync(player.Id, config.NewPlayer.Gold, LedgerReasons.GrantNewPlayer, "bot", ct);
        await services.GetRequiredService<INewPlayerGrant>().GrantAsync(player.Id, ct);
        await transaction.CommitAsync(ct);
        botIds?.TryAdd(player.Id, true);
        return player;
    }

    // ---------- Ghế: bot được câu, nhường ghế ----------

    /// <summary>
    /// Số bot được giữ suất ngồi: không quá mốc "bot được câu", và chừa ghế cho user thật (ghế đang có user thật ngồi,
    /// thêm một ghế trống nếu có user thật đang đứng).
    /// </summary>
    private async Task<int> AllowedSeatHoldersAsync()
    {
        var (seated, standing) = await room.Queue.RunAsync(() => Task.FromResult((
            room.Players.Count(player => !player.IsBot && player.SeatId is not null),
            room.Players.Count(player => !player.IsBot && player.SeatId is null))));
        var free = layout.Seats.Count - seated - (standing > 0 ? 1 : 0);
        return Math.Max(0, Math.Min(FishingTarget, free));
    }

    public async Task<bool> TryTakeSeatAsync(Guid botId)
    {
        var allowed = await AllowedSeatHoldersAsync();
        lock (seatLock)
        {
            if (!active.ContainsKey(botId) || seatHolders.Count >= allowed) return false;
            seatHolders.Add(botId);
            return true;
        }
    }

    public void ReleaseSeat(Guid botId)
    {
        lock (seatLock) seatHolders.Remove(botId);
    }

    /// <summary>Thừa suất (mốc giảm, user thật cần ghế): bot thừa đứng dậy, ưu tiên bot chưa ngồi (đang đi tới ghế).</summary>
    public async Task BalanceSeatsAsync()
    {
        var allowed = await AllowedSeatHoldersAsync();
        var seated = await room.Queue.RunAsync(() => Task.FromResult(
            room.Players.Where(player => player.IsBot && player.SeatId is not null).Select(player => player.PlayerId).ToHashSet()));
        List<BotAgent> stand = [];
        lock (seatLock)
        {
            seatHolders.RemoveWhere(id => !active.ContainsKey(id));
            var excess = seatHolders.Count - allowed;
            foreach (var id in seatHolders.OrderBy(id => seated.Contains(id) ? 1 : 0).Take(Math.Max(0, excess)).ToArray())
            {
                seatHolders.Remove(id);
                if (active.TryGetValue(id, out var agent)) stand.Add(agent);
            }
        }
        foreach (var agent in stand) agent.RequestStand();
    }

    // ---------- Chat world, emoji ----------

    private TimeSpan Scaled(int minSeconds, int maxSeconds) =>
        TimeSpan.FromMilliseconds(random.Next(minSeconds * 1000, maxSeconds * 1000 + 1) / TimeScale);

    private async Task WorldChatTickAsync(CancellationToken ct)
    {
        var now = time.GetUtcNow();
        if (active.IsEmpty) return;
        if (nextWorldChatAt == default)
        {
            nextWorldChatAt = now + Scaled(20, 40);
            return;
        }
        if (now < nextWorldChatAt) return;
        await ChatOnceAsync(ct);
    }

    /// <summary>Một câu chat world của một bot bất kỳ, chọn theo trạng thái của bot đó; hẹn câu kế sau 20–40 giây.</summary>
    public async Task<Guid?> ChatOnceAsync(CancellationToken ct)
    {
        var now = time.GetUtcNow();
        nextWorldChatAt = now + Scaled(20, 40);
        var agents = active.Values.ToArray();
        if (agents.Length == 0) return null;
        var agent = agents[random.Next(agents.Length)];
        if (!await TrySayAsync(agent.PlayerId, content.PickChat(agent.ChatState, random), ct)) return null;
        lastBotChatAt = now;
        return agent.PlayerId;
    }

    /// <summary>Bot câu được cá: thường nói một câu "câu thành công" (mềm theo nhịp chat chung) và đôi khi thả icon loài đó.</summary>
    public async Task OnCaughtAsync(Guid botId, string speciesId)
    {
        var now = time.GetUtcNow();
        if (random.NextDouble() < 0.6 && now - lastBotChatAt >= TimeSpan.FromMilliseconds(5000 / TimeScale))
        {
            if (await TrySayAsync(botId, content.PickSuccess(random), CancellationToken.None))
            {
                lastBotChatAt = now;
                var next = now + Scaled(20, 40);
                if (next > nextWorldChatAt) nextWorldChatAt = next;
            }
        }
        if (random.NextDouble() < 0.3) await TryEmojiAsync(botId, FishEmoji.Of(speciesId));
    }

    private async Task EmojiTickAsync(CancellationToken ct)
    {
        var now = time.GetUtcNow();
        if (active.IsEmpty) return;
        if (nextEmojiAt == default || now < nextEmojiAt)
        {
            if (nextEmojiAt == default) nextEmojiAt = now + Scaled(25, 50);
            return;
        }
        nextEmojiAt = now + Scaled(25, 50);
        var agents = active.Values.ToArray();
        var botId = agents[random.Next(agents.Length)].PlayerId;
        string? emojiId = null;
        if (random.NextDouble() < 0.5)
        {
            await using var scope = scopes.CreateAsyncScope();
            var caught = await scope.ServiceProvider.GetRequiredService<GameDbContext>().Set<SpeciesRecordRow>().AsNoTracking()
                .Where(row => row.PlayerId == botId).Select(row => row.SpeciesId).ToListAsync(ct);
            if (caught.Count > 0) emojiId = FishEmoji.Of(caught[random.Next(caught.Count)]);
        }
        var emojis = socialOptions.Value.Emojis;
        emojiId ??= emojis.Count > 0 ? emojis[random.Next(emojis.Count)] : null;
        if (emojiId is not null) await TryEmojiAsync(botId, emojiId);
    }

    private async Task<bool> TrySayAsync(Guid botId, string text, CancellationToken ct)
    {
        try
        {
            await social.SendChatAsync(botId, text, ct);
            return true;
        }
        catch (GameException exception)
        {
            logger.LogDebug("Bot chat skipped: {Code}", exception.Code);
            return false;
        }
    }

    private async Task TryEmojiAsync(Guid botId, string emojiId)
    {
        try
        {
            await social.SendEmojiAsync(botId, emojiId);
        }
        catch (GameException exception)
        {
            logger.LogDebug("Bot emoji skipped: {Code}", exception.Code);
        }
    }

    // ---------- Kết bạn ----------

    /// <summary>Bot đứng gần user thật (trong <see cref="InviteRadiusPx"/>) mà chưa là bạn, chưa từng mời: gửi lời mời (mỗi cặp một lần).</summary>
    private async Task InviteTickAsync(CancellationToken ct)
    {
        var now = time.GetUtcNow();
        if (active.IsEmpty || now < nextInviteScanAt) return;
        nextInviteScanAt = now + TimeSpan.FromMilliseconds(2000 / TimeScale);
        await InviteNearbyOnceAsync(ct);
    }

    /// <summary>Gửi tối đa một lời mời mỗi lần quét; trả cặp (bot, user) vừa mời.</summary>
    public async Task<(Guid Bot, Guid Human)?> InviteNearbyOnceAsync(CancellationToken ct)
    {
        var now = time.GetUtcNow();
        var cooldown = TimeSpan.FromMilliseconds(configuration.GetValue("Bots:InviteCooldownMs", 60000) / TimeScale);
        var people = await room.Queue.RunAsync(() => Task.FromResult(room.Players.Select(player => (player.PlayerId, player.IsBot, player.X, player.Y)).ToArray()));
        var humans = people.Where(person => !person.IsBot).ToArray();
        foreach (var bot in people.Where(person => person.IsBot && active.ContainsKey(person.PlayerId)).OrderBy(_ => random.Next()))
        {
            if (lastInvite.TryGetValue(bot.PlayerId, out var last) && now - last < cooldown) continue;
            foreach (var human in humans)
            {
                var dx = human.X - bot.X;
                var dy = human.Y - bot.Y;
                if (dx * dx + dy * dy > InviteRadiusPx * InviteRadiusPx) continue;
                if (!invitedPairs.TryAdd((bot.PlayerId, human.PlayerId), true)) continue;
                if (await friends.AreFriendsAsync(bot.PlayerId, human.PlayerId, ct)
                    || await friends.EverRequestedAsync(bot.PlayerId, human.PlayerId, ct)) continue;
                await friends.RequestAsync(bot.PlayerId, human.PlayerId, ct);
                lastInvite[bot.PlayerId] = now;
                return (bot.PlayerId, human.PlayerId);
            }
        }
        return null;
    }

    /// <summary>User thật mời bot: bot đồng ý sau vài giây.</summary>
    private async Task OnFriendRequestAsync(FriendRequestCreated created)
    {
        await EnsureRosterAsync(CancellationToken.None);
        if (!IsBot(created.ToPlayerId) || IsBot(created.FromPlayerId)) return;
        _ = Task.Run(async () =>
        {
            try
            {
                await DelayAsync(random.Next(2000, 5001), CancellationToken.None);
                await friends.AcceptAsync(created.ToPlayerId, created.FromPlayerId, CancellationToken.None);
            }
            catch (Exception exception)
            {
                logger.LogDebug(exception, "Bot could not accept a friend request");
            }
        });
    }

    // ---------- Tin riêng ----------

    /// <summary>User nhắn cho bot: bot trả lời sau 2–6 giây bằng một câu "Chat bình thường".</summary>
    private async Task OnDirectMessageAsync(DirectMessageView message)
    {
        await EnsureRosterAsync(CancellationToken.None);
        if (!IsBot(message.ToPlayerId) || IsBot(message.FromPlayerId)) return;
        _ = Task.Run(async () =>
        {
            try
            {
                await DelayAsync(random.Next(2000, 6001), CancellationToken.None);
                await social.SendDirectAsync(message.ToPlayerId, message.FromPlayerId, content.PickNormal(random), CancellationToken.None);
                lastDirect[(message.ToPlayerId, message.FromPlayerId)] = time.GetUtcNow();
            }
            catch (Exception exception)
            {
                logger.LogDebug(exception, "Bot could not reply to a direct message");
            }
        });
    }

    /// <summary>Thỉnh thoảng (1–2 phút một lần) một bot nhắn riêng cho một user thật là bạn và đang ở hồ; mỗi cặp tối đa 1 tin / 10 phút.</summary>
    private async Task DirectTickAsync(CancellationToken ct)
    {
        var now = time.GetUtcNow();
        if (active.IsEmpty) return;
        if (nextDirectAt == default || now < nextDirectAt)
        {
            if (nextDirectAt == default) nextDirectAt = now + Scaled(60, 120);
            return;
        }
        nextDirectAt = now + Scaled(60, 120);
        await DirectOnceAsync(ct);
    }

    public async Task<(Guid Bot, Guid Human)?> DirectOnceAsync(CancellationToken ct)
    {
        var now = time.GetUtcNow();
        var gap = TimeSpan.FromMilliseconds(600_000 / TimeScale);
        var humans = await room.Queue.RunAsync(() => Task.FromResult(
            room.Players.Where(player => !player.IsBot).Select(player => player.PlayerId).ToHashSet()));
        foreach (var botId in active.Keys.OrderBy(_ => random.Next()))
        {
            var candidates = (await friends.FriendIdsAsync(botId, ct)).Where(humans.Contains)
                .Where(human => !lastDirect.TryGetValue((botId, human), out var last) || now - last >= gap).ToArray();
            if (candidates.Length == 0) continue;
            var human = candidates[random.Next(candidates.Length)];
            lastDirect[(botId, human)] = now;
            try
            {
                await social.SendDirectAsync(botId, human, content.PickNormal(random), ct);
                return (botId, human);
            }
            catch (GameException exception)
            {
                logger.LogDebug("Bot direct message skipped: {Code}", exception.Code);
            }
        }
        return null;
    }
}

/// <summary>
/// Chạy BotManager: kiểm tra mốc theo chu kỳ trong cài đặt (mặc định 3 phút, chạy nền vì vào/ra dần mất vài chục giây) và
/// nhịp ngắn mỗi Bots:PollMs cho ghế, chat, kết bạn. Đọc lại cài đặt ở mỗi lần nên Admin đổi là áp dụng.
/// </summary>
public sealed class BotDirector(BotManager manager, IConfiguration configuration, ILogger<BotDirector> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var pollMs = configuration.GetValue("Bots:PollMs", 1000);
        if (pollMs <= 0) return;

        var next = DateTimeOffset.UtcNow.AddSeconds(configuration.GetValue("Bots:StartDelaySeconds", 15));
        Task<BotCheckResult>? running = null;
        using var timer = new PeriodicTimer(TimeSpan.FromMilliseconds(pollMs));
        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                if (running is { IsCompleted: true })
                {
                    var seconds = 180;
                    try
                    {
                        var result = await running;
                        seconds = result.NextCheckSeconds;
                        if (result.Action != BotChecks.None)
                            logger.LogInformation("Bot check: {Action}, {Real} real players, {Bots} bots (target {Target}, fishing {Fishing})",
                                result.Action, result.RealPlayers, result.Bots, result.TargetBots, result.TargetFishing);
                    }
                    catch (Exception exception) when (exception is not OperationCanceledException)
                    {
                        logger.LogError(exception, "Bot check failed");
                    }
                    running = null;
                    next = DateTimeOffset.UtcNow.AddSeconds(seconds);
                }
                if (running is null && DateTimeOffset.UtcNow >= next) running = manager.CheckOnceAsync(stoppingToken);
                await manager.TickAsync(stoppingToken);
                try
                {
                    // Mỗi nhịp (không chờ chu kỳ 3 phút): bot đứng yên quá lâu thì khởi động lại.
                    await manager.RestartStalledAsync(BotManager.StallLimit, stoppingToken);
                }
                catch (Exception exception) when (exception is not OperationCanceledException)
                {
                    logger.LogError(exception, "Bot watchdog failed");
                }
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
        services.AddSingleton(_ => BotContent.Load());
        services.AddSingleton<BotManager>();
        services.AddScoped<BotSettingsService>();
        services.AddHostedService<BotDirector>();
        return services;
    }
}
