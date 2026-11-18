using System.Collections.Concurrent;
using System.Text.RegularExpressions;
using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Modules.Config;
using FishingOnline.Api.Modules.Economy;
using FishingOnline.Api.Modules.Identity;
using FishingOnline.Api.Modules.Lake;
using FishingOnline.Api.Persistence;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.Extensions.Options;

namespace FishingOnline.Api.Modules.Social;

public sealed record SkinOption(string SkinId, string Name, string Unlock);

/// <summary>Giá trị của <see cref="SkinOption.Unlock"/>: free dùng ngay, shop phải mua bằng offer cùng itemId trong gameplay-config.</summary>
public static class SkinUnlock
{
    public const string Free = "free";
    public const string Shop = "shop";
}

/// <summary><c>Owned</c>: skin free hoặc skin shop người chơi đã mua.</summary>
public sealed record SkinView(string SkinId, string Name, string Unlock, bool Owned);

/// <summary>Toàn bộ là giá trị [Đề xuất] của SOC, đặt trong appsettings để GD đổi không cần sửa code.</summary>
public sealed class SocialOptions
{
    public List<SkinOption> Skins { get; set; } = [];
    public List<string> Emojis { get; set; } = [];
    public List<string> BannedWords { get; set; } = [];
    /// <summary>GD chốt 2026-11-13: tối đa 160 ký tự, mỗi người gửi cách nhau ít nhất 2 giây.</summary>
    public int ChatMaxLength { get; set; } = 160;
    public int ChatMinIntervalMs { get; set; } = 2000;
    public int ChatBurstCount { get; set; } = 10;
    public int ChatBurstWindowSeconds { get; set; } = 30;
    public int EmojiMinIntervalMs { get; set; } = 2000;
    public int ChatRetentionDays { get; set; } = 7;
}

public sealed class ChatMessageRow
{
    public Guid MessageId { get; set; }
    public Guid PlayerId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public DateTimeOffset SentAt { get; set; }
}

public sealed class ChatMessageRowConfig : IEntityTypeConfiguration<ChatMessageRow>
{
    public void Configure(EntityTypeBuilder<ChatMessageRow> entity)
    {
        entity.ToTable("chat_messages");
        entity.HasKey(row => row.MessageId);
        entity.Property(row => row.DisplayName).HasMaxLength(80);
        entity.Property(row => row.Text).HasMaxLength(400);
        entity.HasIndex(row => row.SentAt);
        entity.HasIndex(row => new { row.PlayerId, row.SentAt });
    }
}

public sealed record SendChatCommand(string RequestId, string Text) : IHubCommand;

public sealed record SendEmojiCommand(string RequestId, string EmojiId) : IHubCommand;

public sealed record ChatReceivedView(Guid MessageId, Guid PlayerId, string DisplayName, string Text, DateTimeOffset SentAt);

public sealed record EmojiReceivedView(Guid PlayerId, string EmojiId);

public sealed record SkinChangedView(Guid PlayerId, string SkinId);

public sealed record SkinListView(IReadOnlyList<SkinView> Skins, string SelectedSkinId);

public sealed record SelectSkinRequest(string SkinId);

public sealed record SelectSkinResponse(string SelectedSkinId);

/// <summary>Tiền tố emoji icon cá (BOT-02 mục 2): <c>fish:&lt;speciesId&gt;</c>, chỉ gửi được khi đã câu loài đó.</summary>
public static class FishEmoji
{
    public const string Prefix = "fish:";

    public static string Of(string speciesId) => Prefix + speciesId;
}

public sealed class SocialService(
    IServiceScopeFactory scopes,
    LakeRoom room,
    FriendService friends,
    IConfigProvider configs,
    IHubContext<GameHub> hub,
    IOptions<SocialOptions> options,
    TimeProvider time,
    ILogger<SocialService> logger)
{
    private readonly ConcurrentDictionary<Guid, Queue<DateTimeOffset>> chatHistory = new();
    private readonly ConcurrentDictionary<Guid, Queue<DateTimeOffset>> directHistory = new();

    /// <summary>Phát sau khi một tin riêng đã lưu và gửi đi (BotManager nghe để bot trả lời).</summary>
    public event Func<DirectMessageView, Task>? DirectMessageSent;
    private readonly ConcurrentDictionary<Guid, DateTimeOffset> lastEmoji = new();
    private readonly Lazy<Regex?> bannedPattern = new(() => BuildPattern(options.Value.BannedWords));

    private SocialOptions Settings => options.Value;

    public async Task SendChatAsync(Guid playerId, string text, CancellationToken ct)
    {
        var trimmed = text?.Trim() ?? string.Empty;
        if (trimmed.Length == 0 || trimmed.Length > Settings.ChatMaxLength) throw new GameException(ErrorCatalog.ValidationFailed);

        var displayName = await room.Queue.RunAsync(() => Task.FromResult(room.Find(playerId)?.DisplayName))
            ?? throw new GameException("STATE_CONFLICT");
        var now = time.GetUtcNow();
        if (!TryCount(chatHistory, playerId, now)) throw new GameException("RATE_LIMITED");

        var message = new ChatMessageRow
        {
            MessageId = Guid.CreateVersion7(),
            PlayerId = playerId,
            DisplayName = displayName,
            Text = bannedPattern.Value?.Replace(trimmed, "***") ?? trimmed,
            SentAt = now,
        };
        await using (var scope = scopes.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
            db.Add(message);
            await db.SaveChangesAsync(ct);
        }
        await room.BroadcastAsync("ChatReceived", new ChatReceivedView(message.MessageId, playerId, displayName, message.Text, now));
    }

    public async Task SendEmojiAsync(Guid playerId, string emojiId)
    {
        if (!await IsAllowedEmojiAsync(playerId, emojiId)) throw new GameException(ErrorCatalog.ValidationFailed);
        if (await room.Queue.RunAsync(() => Task.FromResult(room.Find(playerId) is null))) throw new GameException("STATE_CONFLICT");

        var now = time.GetUtcNow();
        var minimum = TimeSpan.FromMilliseconds(Settings.EmojiMinIntervalMs);
        if (lastEmoji.TryGetValue(playerId, out var previous) && now - previous < minimum) throw new GameException("RATE_LIMITED");
        lastEmoji[playerId] = now;
        await room.BroadcastAsync("EmojiReceived", new EmojiReceivedView(playerId, emojiId));
    }

    /// <summary>16 emoji thường, hoặc icon cá <c>fish:&lt;speciesId&gt;</c> của loài người gửi đã câu được (Sổ tay cá).</summary>
    private async Task<bool> IsAllowedEmojiAsync(Guid playerId, string? emojiId)
    {
        if (emojiId is null) return false;
        if (!emojiId.StartsWith(FishEmoji.Prefix, StringComparison.Ordinal)) return Settings.Emojis.Contains(emojiId);
        var speciesId = emojiId[FishEmoji.Prefix.Length..];
        if (configs.Current.Fish.All(fish => fish.SpeciesId != speciesId)) return false;
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        return await db.Set<SpeciesRecordRow>().AsNoTracking().AnyAsync(row => row.PlayerId == playerId && row.SpeciesId == speciesId);
    }

    /// <summary>
    /// Tin riêng (BOT-02 mục 3): chỉ giữa bạn bè, cùng luật độ dài và tần suất như chat chung (đếm riêng).
    /// Người gửi không cần đang ở hồ; event tới mọi kết nối của cả hai người.
    /// </summary>
    public async Task<DirectMessageView> SendDirectAsync(Guid fromId, Guid toId, string? text, CancellationToken ct)
    {
        var trimmed = text?.Trim() ?? string.Empty;
        if (trimmed.Length == 0 || trimmed.Length > Settings.ChatMaxLength || fromId == toId)
            throw new GameException(ErrorCatalog.ValidationFailed);
        if (!await friends.AreFriendsAsync(fromId, toId, ct)) throw new GameException("NOT_FRIENDS");
        var now = time.GetUtcNow();
        if (!TryCount(directHistory, fromId, now)) throw new GameException("RATE_LIMITED");

        DirectMessageRow message;
        await using (var scope = scopes.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
            var name = await db.Players.AsNoTracking().Where(row => row.Id == fromId).Select(row => row.DisplayName).SingleAsync(ct);
            message = new DirectMessageRow
            {
                MessageId = Guid.CreateVersion7(),
                FromPlayerId = fromId,
                ToPlayerId = toId,
                FromName = name,
                Text = bannedPattern.Value?.Replace(trimmed, "***") ?? trimmed,
                SentAt = now,
            };
            db.Add(message);
            await db.SaveChangesAsync(ct);
        }
        var view = message.View();
        await hub.Clients.Users([fromId.ToString(), toId.ToString()]).SendAsync("DirectMessageReceived", view, CancellationToken.None);
        if (DirectMessageSent is { } handlers)
        {
            foreach (var handler in handlers.GetInvocationList().Cast<Func<DirectMessageView, Task>>())
            {
                try
                {
                    await handler(view);
                }
                catch (Exception exception)
                {
                    logger.LogWarning(exception, "Direct message listener failed");
                }
            }
        }
        return view;
    }

    public async Task<ConversationsView> ConversationsAsync(Guid playerId, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        return await DirectMessageQueries.ConversationsAsync(
            scope.ServiceProvider.GetRequiredService<GameDbContext>(), playerId, friends.OnlineAsync, ct);
    }

    public async Task<DirectMessagesView> DirectHistoryAsync(Guid playerId, Guid otherId, int? limit, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        return await DirectMessageQueries.HistoryAsync(scope.ServiceProvider.GetRequiredService<GameDbContext>(), playerId, otherId, limit, ct);
    }

    public async Task<SkinListView> ListSkinsAsync(Guid playerId, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        var selected = await db.Players.AsNoTracking().Where(row => row.Id == playerId).Select(row => row.SelectedSkinId).SingleAsync(ct);
        var bought = await db.Set<SkinOwnedRow>().AsNoTracking().Where(row => row.PlayerId == playerId).Select(row => row.SkinId).ToListAsync(ct);
        var skins = Settings.Skins
            .Select(skin => new SkinView(skin.SkinId, skin.Name, skin.Unlock, skin.Unlock != SkinUnlock.Shop || bought.Contains(skin.SkinId)))
            .ToList();
        return new SkinListView(skins, selected);
    }

    public async Task<SelectSkinResponse> SelectSkinAsync(Guid playerId, string skinId, CancellationToken ct)
    {
        var option = Settings.Skins.SingleOrDefault(skin => skin.SkinId == skinId) ?? throw new GameException(ErrorCatalog.ValidationFailed);
        await using (var scope = scopes.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
            if (option.Unlock == SkinUnlock.Shop
                && !await db.Set<SkinOwnedRow>().AsNoTracking().AnyAsync(row => row.PlayerId == playerId && row.SkinId == skinId, ct))
                throw new GameException("SKIN_NOT_OWNED");
            await db.Players.Where(row => row.Id == playerId).ExecuteUpdateAsync(setters => setters.SetProperty(row => row.SelectedSkinId, skinId), ct);
        }
        await room.Queue.RunAsync(async () =>
        {
            if (room.Find(playerId) is { } player)
            {
                player.SkinId = skinId;
                await room.BroadcastAsync("SkinChanged", new SkinChangedView(playerId, skinId));
            }
            return true;
        });
        return new SelectSkinResponse(skinId);
    }

    public async Task<int> PurgeChatAsync(CancellationToken ct)
    {
        var cutoff = time.GetUtcNow().AddDays(-Settings.ChatRetentionDays);
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        var removed = await db.Set<ChatMessageRow>().Where(row => row.SentAt < cutoff).ExecuteDeleteAsync(ct);
        removed += await db.Set<DirectMessageRow>().Where(row => row.SentAt < cutoff).ExecuteDeleteAsync(ct);
        if (removed > 0) logger.LogInformation("Purged {Count} chat messages", removed);
        return removed;
    }

    private bool TryCount(ConcurrentDictionary<Guid, Queue<DateTimeOffset>> histories, Guid playerId, DateTimeOffset now)
    {
        var history = histories.GetOrAdd(playerId, _ => new Queue<DateTimeOffset>());
        lock (history)
        {
            var window = TimeSpan.FromSeconds(Settings.ChatBurstWindowSeconds);
            while (history.TryPeek(out var oldest) && now - oldest >= window) history.Dequeue();

            var tooSoon = history.Count > 0 && now - history.Last() < TimeSpan.FromMilliseconds(Settings.ChatMinIntervalMs);
            if (tooSoon || history.Count >= Settings.ChatBurstCount) return false;
            history.Enqueue(now);
            return true;
        }
    }

    private static Regex? BuildPattern(IReadOnlyCollection<string> words) =>
        words.Count == 0
            ? null
            : new Regex(string.Join('|', words.Select(Regex.Escape)), RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
}

public sealed class SocialCleanup(SocialService social, ILogger<SocialCleanup> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    await social.PurgeChatAsync(stoppingToken);
                }
                catch (Exception exception) when (exception is not OperationCanceledException)
                {
                    logger.LogWarning(exception, "Chat cleanup failed");
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Host đang dừng.
        }
    }
}

public static class SocialModule
{
    public static IServiceCollection AddSocial(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<SocialOptions>(configuration.GetSection("Social"));
        services.AddSingleton<FriendService>();
        services.AddSingleton<SocialService>();
        services.AddSingleton<IUserIdProvider, PlayerUserIdProvider>();
        services.AddHostedService<SocialCleanup>();
        return services;
    }

    public static WebApplication MapSocial(this WebApplication app)
    {
        app.MapGet("/api/v1/skins", async (SocialService social, ICurrentPlayer player, CancellationToken ct) =>
            ApiResult.Ok(await social.ListSkinsAsync(player.PlayerId, ct))).RequireAuthorization();
        app.MapPut("/api/v1/me/skin", async (SelectSkinRequest request, SocialService social, ICurrentPlayer player, CancellationToken ct) =>
            ApiResult.Ok(await social.SelectSkinAsync(player.PlayerId, request.SkinId, ct))).RequireAuthorization();
        app.MapFriends();
        app.MapDirectMessages();
        return app;
    }
}
