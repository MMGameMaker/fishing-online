using System.Collections.Concurrent;
using System.Text.RegularExpressions;
using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Modules.Identity;
using FishingOnline.Api.Modules.Lake;
using FishingOnline.Api.Persistence;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.Extensions.Options;

namespace FishingOnline.Api.Modules.Social;

public sealed record SkinOption(string SkinId, string Name, string Unlock);

/// <summary>Toàn bộ là giá trị [Đề xuất] của SOC, đặt trong appsettings để GD đổi không cần sửa code.</summary>
public sealed class SocialOptions
{
    public List<SkinOption> Skins { get; set; } = [];
    public List<string> Emojis { get; set; } = [];
    public List<string> BannedWords { get; set; } = [];
    public int ChatMaxLength { get; set; } = 100;
    public int ChatMinIntervalMs { get; set; } = 1000;
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

public sealed record SkinListView(IReadOnlyList<SkinOption> Skins, string SelectedSkinId);

public sealed record SelectSkinRequest(string SkinId);

public sealed record SelectSkinResponse(string SelectedSkinId);

public sealed class SocialService(
    IServiceScopeFactory scopes, LakeRoom room, IOptions<SocialOptions> options, TimeProvider time, ILogger<SocialService> logger)
{
    private readonly ConcurrentDictionary<Guid, Queue<DateTimeOffset>> chatHistory = new();
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
        if (!TryCountChat(playerId, now)) throw new GameException("RATE_LIMITED");

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
        if (!Settings.Emojis.Contains(emojiId)) throw new GameException(ErrorCatalog.ValidationFailed);
        if (await room.Queue.RunAsync(() => Task.FromResult(room.Find(playerId) is null))) throw new GameException("STATE_CONFLICT");

        var now = time.GetUtcNow();
        var minimum = TimeSpan.FromMilliseconds(Settings.EmojiMinIntervalMs);
        if (lastEmoji.TryGetValue(playerId, out var previous) && now - previous < minimum) throw new GameException("RATE_LIMITED");
        lastEmoji[playerId] = now;
        await room.BroadcastAsync("EmojiReceived", new EmojiReceivedView(playerId, emojiId));
    }

    public async Task<SkinListView> ListSkinsAsync(Guid playerId, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        var selected = await db.Players.AsNoTracking().Where(row => row.Id == playerId).Select(row => row.SelectedSkinId).SingleAsync(ct);
        return new SkinListView(Settings.Skins, selected);
    }

    public async Task<SelectSkinResponse> SelectSkinAsync(Guid playerId, string skinId, CancellationToken ct)
    {
        if (Settings.Skins.All(skin => skin.SkinId != skinId)) throw new GameException(ErrorCatalog.ValidationFailed);
        await using (var scope = scopes.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
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
        if (removed > 0) logger.LogInformation("Purged {Count} chat messages", removed);
        return removed;
    }

    private bool TryCountChat(Guid playerId, DateTimeOffset now)
    {
        var history = chatHistory.GetOrAdd(playerId, _ => new Queue<DateTimeOffset>());
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
        services.AddSingleton<SocialService>();
        services.AddHostedService<SocialCleanup>();
        return services;
    }

    public static WebApplication MapSocial(this WebApplication app)
    {
        app.MapGet("/api/v1/skins", async (SocialService social, ICurrentPlayer player, CancellationToken ct) =>
            ApiResult.Ok(await social.ListSkinsAsync(player.PlayerId, ct))).RequireAuthorization();
        app.MapPut("/api/v1/me/skin", async (SelectSkinRequest request, SocialService social, ICurrentPlayer player, CancellationToken ct) =>
            ApiResult.Ok(await social.SelectSkinAsync(player.PlayerId, request.SkinId, ct))).RequireAuthorization();
        return app;
    }
}
