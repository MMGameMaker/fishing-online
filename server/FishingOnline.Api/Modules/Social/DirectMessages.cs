using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Modules.Identity;
using FishingOnline.Api.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FishingOnline.Api.Modules.Social;

/// <summary>Tin riêng giữa hai người bạn (BOT-02 mục 3), giữ cùng hạn với chat chung (<see cref="SocialOptions.ChatRetentionDays"/>).</summary>
public sealed class DirectMessageRow
{
    public Guid MessageId { get; set; }
    public Guid FromPlayerId { get; set; }
    public Guid ToPlayerId { get; set; }
    public string FromName { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public DateTimeOffset SentAt { get; set; }
}

public sealed class DirectMessageRowConfig : IEntityTypeConfiguration<DirectMessageRow>
{
    public void Configure(EntityTypeBuilder<DirectMessageRow> entity)
    {
        entity.ToTable("direct_messages");
        entity.HasKey(row => row.MessageId);
        entity.Property(row => row.FromName).HasMaxLength(80);
        entity.Property(row => row.Text).HasMaxLength(400);
        entity.HasIndex(row => row.SentAt);
        entity.HasIndex(row => new { row.FromPlayerId, row.ToPlayerId, row.SentAt });
        entity.HasIndex(row => new { row.ToPlayerId, row.SentAt });
    }
}

public sealed record SendDirectMessageCommand(string RequestId, Guid ToPlayerId, string Text) : IHubCommand;

/// <summary>Event <c>DirectMessageReceived</c>: gửi cho cả người gửi và người nhận (mọi kết nối của họ).</summary>
public sealed record DirectMessageView(Guid MessageId, Guid FromPlayerId, Guid ToPlayerId, string FromName, string Text, DateTimeOffset SentAt);

public sealed record DirectMessagesView(IReadOnlyList<DirectMessageView> Messages);

/// <summary>Một hội thoại trong tab "Tin riêng": người kia, tin cuối cùng.</summary>
public sealed record ConversationView(
    Guid PlayerId, string DisplayName, string SkinId, bool Online, string LastText, Guid LastFromPlayerId, DateTimeOffset LastAt);

public sealed record ConversationsView(IReadOnlyList<ConversationView> Conversations);

public static class DirectMessageEndpoints
{
    public const int DefaultLimit = 50;
    public const int MaxLimit = 100;

    public static WebApplication MapDirectMessages(this WebApplication app)
    {
        var dm = app.MapGroup("/api/v1/me/dm").RequireAuthorization();
        dm.MapGet("", async (SocialService social, ICurrentPlayer player, CancellationToken ct) =>
            ApiResult.Ok(await social.ConversationsAsync(player.PlayerId, ct)));
        dm.MapGet("/{otherId:guid}", async (Guid otherId, int? limit, SocialService social, ICurrentPlayer player, CancellationToken ct) =>
            ApiResult.Ok(await social.DirectHistoryAsync(player.PlayerId, otherId, limit, ct)));
        return app;
    }

    public static IQueryable<DirectMessageRow> Between(this IQueryable<DirectMessageRow> rows, Guid a, Guid b) =>
        rows.Where(row => (row.FromPlayerId == a && row.ToPlayerId == b) || (row.FromPlayerId == b && row.ToPlayerId == a));

    public static DirectMessageView View(this DirectMessageRow row) =>
        new(row.MessageId, row.FromPlayerId, row.ToPlayerId, row.FromName, row.Text, row.SentAt);
}

/// <summary>Truy vấn lịch sử DM; tách khỏi SocialService để file đó gọn.</summary>
internal static class DirectMessageQueries
{
    public static async Task<ConversationsView> ConversationsAsync(GameDbContext db, Guid playerId, Func<IReadOnlyCollection<Guid>, Task<HashSet<Guid>>> online, CancellationToken ct)
    {
        var rows = await db.Set<DirectMessageRow>().AsNoTracking()
            .Where(row => row.FromPlayerId == playerId || row.ToPlayerId == playerId)
            .OrderByDescending(row => row.SentAt).Take(500).ToListAsync(ct);
        var latest = rows.GroupBy(row => row.FromPlayerId == playerId ? row.ToPlayerId : row.FromPlayerId)
            .Select(group => (Other: group.Key, Last: group.First())).ToArray();
        var ids = latest.Select(item => item.Other).ToArray();
        var players = await db.Players.AsNoTracking().Where(row => ids.Contains(row.Id)).ToDictionaryAsync(row => row.Id, ct);
        var here = await online(ids);
        return new ConversationsView(latest.Where(item => players.ContainsKey(item.Other)).Select(item => new ConversationView(
            item.Other, players[item.Other].DisplayName, players[item.Other].SelectedSkinId, here.Contains(item.Other),
            item.Last.Text, item.Last.FromPlayerId, item.Last.SentAt)).ToArray());
    }

    public static async Task<DirectMessagesView> HistoryAsync(GameDbContext db, Guid playerId, Guid otherId, int? limit, CancellationToken ct)
    {
        var size = limit ?? DirectMessageEndpoints.DefaultLimit;
        if (size is < 1 or > DirectMessageEndpoints.MaxLimit) throw new GameException(ErrorCatalog.ValidationFailed);
        var rows = await db.Set<DirectMessageRow>().AsNoTracking().Between(playerId, otherId)
            .OrderByDescending(row => row.SentAt).Take(size).ToListAsync(ct);
        rows.Reverse();
        return new DirectMessagesView(rows.Select(row => row.View()).ToArray());
    }
}
