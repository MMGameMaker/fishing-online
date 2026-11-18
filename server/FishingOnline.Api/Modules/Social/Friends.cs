using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Modules.Identity;
using FishingOnline.Api.Modules.Lake;
using FishingOnline.Api.Persistence;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FishingOnline.Api.Modules.Social;

/// <summary>Trạng thái lời mời kết bạn (BOT-02 mục 4). Dòng giữ lại sau khi trả lời để bot không mời lại cùng một người.</summary>
public static class FriendRequestStatus
{
    public const string Pending = "pending";
    public const string Accepted = "accepted";
    public const string Declined = "declined";
}

/// <summary>Trạng thái quan hệ của người xem với người khác, trả trong profile công khai.</summary>
public static class FriendStatus
{
    public const string Self = "self";
    public const string Friends = "friends";
    public const string PendingOut = "pending_out";
    public const string PendingIn = "pending_in";
    public const string None = "none";
}

public sealed class FriendRequestRow
{
    public Guid FromPlayerId { get; set; }
    public Guid ToPlayerId { get; set; }
    public string Status { get; set; } = FriendRequestStatus.Pending;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? RespondedAt { get; set; }
}

/// <summary>Mỗi cặp bạn bè lưu hai dòng (A→B và B→A) để truy vấn danh sách bạn của một người đơn giản.</summary>
public sealed class FriendshipRow
{
    public Guid PlayerId { get; set; }
    public Guid FriendId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class FriendRequestRowConfig : IEntityTypeConfiguration<FriendRequestRow>
{
    public void Configure(EntityTypeBuilder<FriendRequestRow> entity)
    {
        entity.ToTable("friend_requests");
        entity.HasKey(row => new { row.FromPlayerId, row.ToPlayerId });
        entity.Property(row => row.Status).HasMaxLength(16);
        entity.HasIndex(row => new { row.ToPlayerId, row.Status });
    }
}

public sealed class FriendshipRowConfig : IEntityTypeConfiguration<FriendshipRow>
{
    public void Configure(EntityTypeBuilder<FriendshipRow> entity)
    {
        entity.ToTable("friendships");
        entity.HasKey(row => new { row.PlayerId, row.FriendId });
    }
}

/// <summary><c>Online</c> = đang có mặt trong hồ (BOT-02 mục 4).</summary>
public sealed record FriendView(Guid PlayerId, string DisplayName, string SkinId, int Level, bool Online);

public sealed record FriendRequestView(Guid PlayerId, string DisplayName, string SkinId, int Level, DateTimeOffset SentAt);

public sealed record FriendsView(IReadOnlyList<FriendView> Friends, IReadOnlyList<FriendRequestView> Incoming, IReadOnlyList<Guid> Outgoing);

public sealed record SendFriendRequestBody(Guid PlayerId);

/// <summary><c>sent</c>: đã gửi lời mời (hoặc đang chờ); <c>friends</c>: đã là bạn (người kia đã mời mình trước thì đồng ý luôn).</summary>
public sealed record FriendRequestResult(string Status);

public sealed record FriendRequestCreated(Guid FromPlayerId, Guid ToPlayerId);

/// <summary>Event <c>FriendRemoved</c>: <paramref name="PlayerId"/> là người kia (không còn là bạn).</summary>
public sealed record FriendRemoved(Guid PlayerId);

/// <summary>
/// Kết bạn bằng lời mời (BOT-02 mục 4): gửi, đồng ý, từ chối, danh sách bạn kèm online, lời mời đến. Event realtime
/// <c>FriendRequestReceived</c> (người được mời) và <c>FriendAdded</c> (cả hai bên) gửi tới mọi kết nối của người đó.
/// Bot dùng đúng service này (BotManager nghe <see cref="RequestCreated"/> để tự đồng ý).
/// </summary>
public sealed class FriendService(IServiceScopeFactory scopes, LakeRoom room, IHubContext<GameHub> hub, TimeProvider time)
{
    public event Func<FriendRequestCreated, Task>? RequestCreated;

    public async Task<FriendsView> ListAsync(Guid playerId, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        var friendIds = await db.Set<FriendshipRow>().AsNoTracking().Where(row => row.PlayerId == playerId)
            .Select(row => row.FriendId).ToListAsync(ct);
        var incoming = await db.Set<FriendRequestRow>().AsNoTracking()
            .Where(row => row.ToPlayerId == playerId && row.Status == FriendRequestStatus.Pending)
            .OrderByDescending(row => row.CreatedAt).ToListAsync(ct);
        var outgoing = await db.Set<FriendRequestRow>().AsNoTracking()
            .Where(row => row.FromPlayerId == playerId && row.Status == FriendRequestStatus.Pending)
            .Select(row => row.ToPlayerId).ToListAsync(ct);
        var ids = friendIds.Concat(incoming.Select(row => row.FromPlayerId)).Distinct().ToArray();
        var players = await db.Players.AsNoTracking().Where(row => ids.Contains(row.Id)).ToDictionaryAsync(row => row.Id, ct);
        var online = await OnlineAsync(ids);

        var friends = friendIds.Where(players.ContainsKey).Select(id => players[id])
            .Select(player => new FriendView(player.Id, player.DisplayName, player.SelectedSkinId, player.Level, online.Contains(player.Id)))
            .OrderByDescending(view => view.Online).ThenBy(view => view.DisplayName, StringComparer.CurrentCultureIgnoreCase)
            .ToArray();
        var requests = incoming.Where(row => players.ContainsKey(row.FromPlayerId)).Select(row =>
        {
            var from = players[row.FromPlayerId];
            return new FriendRequestView(from.Id, from.DisplayName, from.SelectedSkinId, from.Level, row.CreatedAt);
        }).ToArray();
        return new FriendsView(friends, requests, outgoing);
    }

    public async Task<FriendRequestResult> RequestAsync(Guid fromId, Guid toId, CancellationToken ct)
    {
        if (fromId == toId) throw new GameException(ErrorCatalog.ValidationFailed);
        FriendRequestView? notify = null;
        await using (var scope = scopes.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
            var players = await db.Players.AsNoTracking().Where(row => row.Id == fromId || row.Id == toId).ToDictionaryAsync(row => row.Id, ct);
            if (!players.ContainsKey(toId) || !players.ContainsKey(fromId)) throw new GameException("PLAYER_NOT_FOUND");
            if (await AreFriendsAsync(db, fromId, toId, ct)) return new FriendRequestResult(FriendStatus.Friends);

            // Người kia đã mời mình và đang chờ: mời lại nghĩa là đồng ý luôn.
            if (await db.Set<FriendRequestRow>().AsNoTracking().AnyAsync(row =>
                    row.FromPlayerId == toId && row.ToPlayerId == fromId && row.Status == FriendRequestStatus.Pending, ct))
            {
                await AcceptCoreAsync(toId, fromId, ct);
                return new FriendRequestResult(FriendStatus.Friends);
            }

            var now = time.GetUtcNow();
            var existing = await db.Set<FriendRequestRow>().AsTracking()
                .SingleOrDefaultAsync(row => row.FromPlayerId == fromId && row.ToPlayerId == toId, ct);
            if (existing is { Status: FriendRequestStatus.Pending }) return new FriendRequestResult("sent");
            if (existing is null)
            {
                db.Add(new FriendRequestRow { FromPlayerId = fromId, ToPlayerId = toId, Status = FriendRequestStatus.Pending, CreatedAt = now });
            }
            else
            {
                existing.Status = FriendRequestStatus.Pending;
                existing.CreatedAt = now;
                existing.RespondedAt = null;
            }
            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException exception) when (exception.UniqueConstraint() is not null)
            {
                return new FriendRequestResult("sent");
            }
            var from = players[fromId];
            notify = new FriendRequestView(from.Id, from.DisplayName, from.SelectedSkinId, from.Level, now);
        }

        await hub.Clients.User(toId.ToString()).SendAsync("FriendRequestReceived", notify, ct);
        await RaiseAsync(new FriendRequestCreated(fromId, toId));
        return new FriendRequestResult("sent");
    }

    /// <summary><paramref name="playerId"/> đồng ý lời mời của <paramref name="fromId"/>.</summary>
    public Task AcceptAsync(Guid playerId, Guid fromId, CancellationToken ct) => AcceptCoreAsync(fromId, playerId, ct);

    public async Task DeclineAsync(Guid playerId, Guid fromId, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        var updated = await db.Set<FriendRequestRow>()
            .Where(row => row.FromPlayerId == fromId && row.ToPlayerId == playerId && row.Status == FriendRequestStatus.Pending)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(row => row.Status, FriendRequestStatus.Declined)
                .SetProperty(row => row.RespondedAt, time.GetUtcNow()), ct);
        if (updated == 0) throw new GameException("STATE_CONFLICT");
    }

    /// <summary>
    /// Xoá bạn (hai chiều). Dòng lời mời cũ giữ nguyên để bot không tự mời lại; người chơi vẫn mời lại được
    /// (<see cref="RequestAsync"/> đưa dòng cũ về pending). Tin riêng cũ giữ lại nhưng không nhắn thêm được (NOT_FRIENDS).
    /// Event <c>FriendRemoved</c> tới cả hai bên.
    /// </summary>
    public async Task RemoveAsync(Guid playerId, Guid friendId, CancellationToken ct)
    {
        await using (var scope = scopes.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
            var removed = await db.Set<FriendshipRow>()
                .Where(row => (row.PlayerId == playerId && row.FriendId == friendId) || (row.PlayerId == friendId && row.FriendId == playerId))
                .ExecuteDeleteAsync(ct);
            if (removed == 0) throw new GameException("NOT_FRIENDS");
        }

        await hub.Clients.User(playerId.ToString()).SendAsync("FriendRemoved", new FriendRemoved(friendId), ct);
        await hub.Clients.User(friendId.ToString()).SendAsync("FriendRemoved", new FriendRemoved(playerId), ct);
    }

    public async Task<bool> AreFriendsAsync(Guid a, Guid b, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        return await AreFriendsAsync(scope.ServiceProvider.GetRequiredService<GameDbContext>(), a, b, ct);
    }

    /// <summary>Đã từng có lời mời từ <paramref name="fromId"/> tới <paramref name="toId"/> (bất kể đã trả lời chưa).</summary>
    public async Task<bool> EverRequestedAsync(Guid fromId, Guid toId, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        return await db.Set<FriendRequestRow>().AsNoTracking().AnyAsync(row => row.FromPlayerId == fromId && row.ToPlayerId == toId, ct);
    }

    public async Task<IReadOnlyList<Guid>> FriendIdsAsync(Guid playerId, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        return await db.Set<FriendshipRow>().AsNoTracking().Where(row => row.PlayerId == playerId).Select(row => row.FriendId).ToListAsync(ct);
    }

    /// <summary>Quan hệ của người xem với người khác (profile công khai).</summary>
    public async Task<string> StatusAsync(Guid viewerId, Guid otherId, CancellationToken ct)
    {
        if (viewerId == otherId) return FriendStatus.Self;
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        if (await AreFriendsAsync(db, viewerId, otherId, ct)) return FriendStatus.Friends;
        var pending = await db.Set<FriendRequestRow>().AsNoTracking()
            .Where(row => row.Status == FriendRequestStatus.Pending
                && ((row.FromPlayerId == viewerId && row.ToPlayerId == otherId) || (row.FromPlayerId == otherId && row.ToPlayerId == viewerId)))
            .Select(row => row.FromPlayerId).ToListAsync(ct);
        if (pending.Contains(viewerId)) return FriendStatus.PendingOut;
        return pending.Count > 0 ? FriendStatus.PendingIn : FriendStatus.None;
    }

    /// <summary>Người chơi đang có mặt trong hồ (kể cả đang giữ ghế khi rớt mạng ngắn).</summary>
    public Task<HashSet<Guid>> OnlineAsync(IReadOnlyCollection<Guid> ids) =>
        room.Queue.RunAsync(() => Task.FromResult(ids.Where(id => room.Find(id) is not null).ToHashSet()));

    private async Task AcceptCoreAsync(Guid fromId, Guid toId, CancellationToken ct)
    {
        var now = time.GetUtcNow();
        Dictionary<Guid, PlayerProfile> players;
        await using (var scope = scopes.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
            await using var transaction = await db.Database.BeginTransactionAsync(ct);
            var updated = await db.Set<FriendRequestRow>()
                .Where(row => row.FromPlayerId == fromId && row.ToPlayerId == toId && row.Status == FriendRequestStatus.Pending)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(row => row.Status, FriendRequestStatus.Accepted)
                    .SetProperty(row => row.RespondedAt, now), ct);
            if (updated == 0) throw new GameException("STATE_CONFLICT");
            await db.Database.ExecuteSqlInterpolatedAsync($"""
                insert into game.friendships ("PlayerId", "FriendId", "CreatedAt") values ({fromId}, {toId}, {now}), ({toId}, {fromId}, {now})
                on conflict do nothing
                """, ct);
            // Hai người mời chéo nhau: lời mời ngược chiều cũng coi như đã đồng ý.
            await db.Set<FriendRequestRow>()
                .Where(row => row.FromPlayerId == toId && row.ToPlayerId == fromId && row.Status == FriendRequestStatus.Pending)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(row => row.Status, FriendRequestStatus.Accepted)
                    .SetProperty(row => row.RespondedAt, now), ct);
            await transaction.CommitAsync(ct);
            players = await db.Players.AsNoTracking().Where(row => row.Id == fromId || row.Id == toId).ToDictionaryAsync(row => row.Id, ct);
        }

        var online = await OnlineAsync([fromId, toId]);
        FriendView ViewOf(Guid id) => new(id, players[id].DisplayName, players[id].SelectedSkinId, players[id].Level, online.Contains(id));
        await hub.Clients.User(fromId.ToString()).SendAsync("FriendAdded", ViewOf(toId), ct);
        await hub.Clients.User(toId.ToString()).SendAsync("FriendAdded", ViewOf(fromId), ct);
    }

    private static Task<bool> AreFriendsAsync(GameDbContext db, Guid a, Guid b, CancellationToken ct) =>
        db.Set<FriendshipRow>().AsNoTracking().AnyAsync(row => row.PlayerId == a && row.FriendId == b, ct);

    private async Task RaiseAsync(FriendRequestCreated created)
    {
        if (RequestCreated is null) return;
        foreach (var handler in RequestCreated.GetInvocationList().Cast<Func<FriendRequestCreated, Task>>())
        {
            try
            {
                await handler(created);
            }
            catch (Exception)
            {
                // Bên nghe (bot) lỗi không được làm hỏng lời mời của người chơi.
            }
        }
    }
}

/// <summary>SignalR gửi theo người chơi (<c>Clients.User</c>) bằng claim playerId, để DM/kết bạn tới mọi kết nối của người đó.</summary>
public sealed class PlayerUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection) => connection.User?.FindFirst(PlayerClaims.PlayerId)?.Value;
}

public static class FriendsEndpoints
{
    public static WebApplication MapFriends(this WebApplication app)
    {
        var friends = app.MapGroup("/api/v1/friends").RequireAuthorization();
        friends.MapGet("", async (FriendService service, ICurrentPlayer player, CancellationToken ct) =>
            ApiResult.Ok(await service.ListAsync(player.PlayerId, ct)));
        friends.MapPost("/requests", async (SendFriendRequestBody body, FriendService service, ICurrentPlayer player, CancellationToken ct) =>
            ApiResult.Ok(await service.RequestAsync(player.PlayerId, body.PlayerId, ct)));
        friends.MapPost("/requests/{fromId:guid}/accept", async (Guid fromId, FriendService service, ICurrentPlayer player, CancellationToken ct) =>
        {
            await service.AcceptAsync(player.PlayerId, fromId, ct);
            return ApiResult.Ok(new FriendRequestResult(FriendStatus.Friends));
        });
        friends.MapPost("/requests/{fromId:guid}/decline", async (Guid fromId, FriendService service, ICurrentPlayer player, CancellationToken ct) =>
        {
            await service.DeclineAsync(player.PlayerId, fromId, ct);
            return ApiResult.Ok(new FriendRequestResult(FriendStatus.None));
        });
        friends.MapDelete("/{friendId:guid}", async (Guid friendId, FriendService service, ICurrentPlayer player, CancellationToken ct) =>
        {
            await service.RemoveAsync(player.PlayerId, friendId, ct);
            return ApiResult.Ok(new FriendRequestResult(FriendStatus.None));
        });
        return app;
    }
}
