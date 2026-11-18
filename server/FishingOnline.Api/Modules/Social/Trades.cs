using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Modules.Economy;
using FishingOnline.Api.Modules.Identity;
using FishingOnline.Api.Persistence;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FishingOnline.Api.Modules.Social;

public static class TradeStatus
{
    public const string Pending = "pending";
    public const string Accepted = "accepted";
    public const string Declined = "declined";
    public const string Cancelled = "cancelled";
}

/// <summary>Đề nghị hoán đổi cá giữa hai bạn bè: <c>FromPlayerId</c> đề nghị, <c>ToPlayerId</c> đồng ý hoặc từ chối.</summary>
public sealed class FishTradeRow
{
    public Guid TradeId { get; set; }
    public Guid FromPlayerId { get; set; }
    public Guid ToPlayerId { get; set; }
    public string Status { get; set; } = TradeStatus.Pending;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? RespondedAt { get; set; }
}

/// <summary><c>Offered</c> = true: cá của người đề nghị đưa ra; false: cá của người nhận mà người đề nghị muốn đổi lấy.</summary>
public sealed class FishTradeItemRow
{
    public Guid TradeId { get; set; }
    public Guid CatchId { get; set; }
    public bool Offered { get; set; }
}

public sealed class FishTradeRowConfig : IEntityTypeConfiguration<FishTradeRow>
{
    public void Configure(EntityTypeBuilder<FishTradeRow> entity)
    {
        entity.ToTable("fish_trades");
        entity.HasKey(row => row.TradeId);
        entity.Property(row => row.Status).HasMaxLength(16);
        entity.HasIndex(row => new { row.ToPlayerId, row.Status });
        entity.HasIndex(row => new { row.FromPlayerId, row.Status });
    }
}

public sealed class FishTradeItemRowConfig : IEntityTypeConfiguration<FishTradeItemRow>
{
    public void Configure(EntityTypeBuilder<FishTradeItemRow> entity)
    {
        entity.ToTable("fish_trade_items");
        entity.HasKey(row => new { row.TradeId, row.CatchId });
    }
}

public sealed record CreateTradeBody(Guid ToPlayerId, IReadOnlyList<Guid>? OfferCatchIds, IReadOnlyList<Guid>? RequestCatchIds);

public sealed record TradeFishView(Guid CatchId, string SpeciesId, int LengthTenthCm);

/// <summary>Một đề nghị đang chờ. <c>Offer</c>: cá của <c>FromPlayerId</c>; <c>Request</c>: cá của <c>ToPlayerId</c>.</summary>
public sealed record TradeView(
    Guid TradeId, Guid FromPlayerId, string FromName, Guid ToPlayerId, string ToName, string Status, DateTimeOffset CreatedAt,
    IReadOnlyList<TradeFishView> Offer, IReadOnlyList<TradeFishView> Request);

public sealed record TradesView(IReadOnlyList<TradeView> Incoming, IReadOnlyList<TradeView> Outgoing);

/// <summary>Event <c>TradeUpdated</c> tới cả hai bên khi đề nghị đổi trạng thái (accepted/declined/cancelled).</summary>
public sealed record TradeUpdated(Guid TradeId, string Status, Guid FromPlayerId, Guid ToPlayerId);

public sealed record TradeResult(Guid TradeId, string Status);

/// <summary>Cá của bạn bè để chọn khi đề nghị đổi (chỉ cá chưa bán).</summary>
public sealed record FriendFishView(Guid PlayerId, IReadOnlyList<TradeFishView> Fish);

/// <summary>
/// Trao đổi cá giữa bạn bè: người A chọn 1–5 con của mình và 1–5 con của B, B đồng ý thì đổi chéo trong một transaction.
/// Cá không bị khoá khi đang chờ; lúc đồng ý server kiểm lại từng con còn chưa bán và còn đúng chủ. Cá nhận về chỉ đổi người giữ
/// (<see cref="CatchRow.HolderPlayerId"/>), không tính vào Sổ tay, kỷ lục, EXP hay nhiệm vụ của người nhận. Không có Gold.
/// </summary>
public sealed class TradeService(IServiceScopeFactory scopes, FriendService friends, IHubContext<GameHub> hub, TimeProvider time)
{
    public const int MaxFishPerSide = 5;
    public const int MaxPendingOutgoing = 10;

    public async Task<FriendFishView> FriendFishAsync(Guid playerId, Guid friendId, CancellationToken ct)
    {
        if (!await friends.AreFriendsAsync(playerId, friendId, ct)) throw new GameException("NOT_FRIENDS");
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        var fish = await db.Set<CatchRow>().AsNoTracking().Where(CatchRow.HeldBy(friendId))
            .OrderByDescending(row => row.CaughtAt).Select(row => new TradeFishView(row.CatchId, row.SpeciesId, row.LengthTenthCm))
            .ToListAsync(ct);
        return new FriendFishView(friendId, fish);
    }

    public async Task<TradesView> ListAsync(Guid playerId, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        var trades = await db.Set<FishTradeRow>().AsNoTracking()
            .Where(row => row.Status == TradeStatus.Pending && (row.ToPlayerId == playerId || row.FromPlayerId == playerId))
            .OrderByDescending(row => row.CreatedAt).ToListAsync(ct);
        var views = await ViewsAsync(db, trades, ct);
        return new TradesView(views.Where(view => view.ToPlayerId == playerId).ToArray(), views.Where(view => view.FromPlayerId == playerId).ToArray());
    }

    public async Task<TradeView> CreateAsync(Guid fromId, CreateTradeBody body, CancellationToken ct)
    {
        var offer = body.OfferCatchIds?.Distinct().ToArray() ?? [];
        var request = body.RequestCatchIds?.Distinct().ToArray() ?? [];
        if (body.ToPlayerId == fromId || offer.Length is < 1 or > MaxFishPerSide || request.Length is < 1 or > MaxFishPerSide
            || offer.Intersect(request).Any())
            throw new GameException(ErrorCatalog.ValidationFailed);
        if (!await friends.AreFriendsAsync(fromId, body.ToPlayerId, ct)) throw new GameException("NOT_FRIENDS");

        TradeView view;
        await using (var scope = scopes.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
            if (await db.Set<FishTradeRow>().CountAsync(row => row.FromPlayerId == fromId && row.Status == TradeStatus.Pending, ct) >= MaxPendingOutgoing)
                throw new GameException("TRADE_LIMIT_REACHED");
            await EnsureHeldAsync(db, offer, fromId, ct);
            await EnsureHeldAsync(db, request, body.ToPlayerId, ct);

            var trade = new FishTradeRow
            {
                TradeId = Guid.NewGuid(), FromPlayerId = fromId, ToPlayerId = body.ToPlayerId, Status = TradeStatus.Pending, CreatedAt = time.GetUtcNow(),
            };
            db.Add(trade);
            db.AddRange(offer.Select(id => new FishTradeItemRow { TradeId = trade.TradeId, CatchId = id, Offered = true }));
            db.AddRange(request.Select(id => new FishTradeItemRow { TradeId = trade.TradeId, CatchId = id, Offered = false }));
            await db.SaveChangesAsync(ct);
            view = (await ViewsAsync(db, [trade], ct)).Single();
        }

        await hub.Clients.User(body.ToPlayerId.ToString()).SendAsync("TradeReceived", view, ct);
        return view;
    }

    /// <summary>Người nhận đồng ý: đổi chéo toàn bộ hoặc không gì cả.</summary>
    public async Task<TradeResult> AcceptAsync(Guid playerId, Guid tradeId, CancellationToken ct)
    {
        TradeUpdated updated;
        await using (var scope = scopes.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
            var trade = await db.Set<FishTradeRow>().AsNoTracking().SingleOrDefaultAsync(row => row.TradeId == tradeId, ct)
                ?? throw new GameException("TRADE_NOT_FOUND");
            if (trade.ToPlayerId != playerId) throw new GameException("TRADE_NOT_FOUND");
            if (trade.Status != TradeStatus.Pending) throw new GameException("STATE_CONFLICT");
            if (!await friends.AreFriendsAsync(playerId, trade.FromPlayerId, ct)) throw new GameException("NOT_FRIENDS");

            var items = await db.Set<FishTradeItemRow>().AsNoTracking().Where(row => row.TradeId == tradeId).ToListAsync(ct);
            var ids = items.Select(row => row.CatchId).ToArray();
            await using var transaction = await db.Database.BeginTransactionAsync(ct);
            var now = time.GetUtcNow();
            var claimed = await db.Set<FishTradeRow>()
                .Where(row => row.TradeId == tradeId && row.Status == TradeStatus.Pending)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(row => row.Status, TradeStatus.Accepted)
                    .SetProperty(row => row.RespondedAt, now), ct);
            if (claimed == 0) throw new GameException("STATE_CONFLICT");

            var locked = await db.Set<CatchRow>()
                .FromSqlInterpolated($"""select * from game.catches where "CatchId" = any({ids}) for update""")
                .AsTracking().ToListAsync(ct);
            var offered = items.Where(row => row.Offered).Select(row => row.CatchId).ToHashSet();
            var valid = locked.Count == ids.Length && locked.All(row =>
                row.SoldAt is null && row.Holder == (offered.Contains(row.CatchId) ? trade.FromPlayerId : trade.ToPlayerId));
            // Cá đã bán hoặc đã đổi tay từ lúc đề nghị: giữ nguyên mọi thứ (transaction không commit).
            if (!valid) throw new GameException("FISH_NOT_FOUND");

            foreach (var row in locked)
                row.HolderPlayerId = offered.Contains(row.CatchId) ? trade.ToPlayerId : trade.FromPlayerId;
            await db.SaveChangesAsync(ct);
            await db.Players.Where(row => row.Id == trade.FromPlayerId || row.Id == trade.ToPlayerId)
                .ExecuteUpdateAsync(setters => setters.SetProperty(row => row.InventoryVersion, row => row.InventoryVersion + 1), ct);
            await transaction.CommitAsync(ct);
            updated = new TradeUpdated(tradeId, TradeStatus.Accepted, trade.FromPlayerId, trade.ToPlayerId);
        }

        await NotifyAsync(updated, ct);
        return new TradeResult(tradeId, TradeStatus.Accepted);
    }

    public Task<TradeResult> DeclineAsync(Guid playerId, Guid tradeId, CancellationToken ct) => CloseAsync(playerId, tradeId, TradeStatus.Declined, ct);

    /// <summary>Người đề nghị rút lại đề nghị đang chờ.</summary>
    public Task<TradeResult> CancelAsync(Guid playerId, Guid tradeId, CancellationToken ct) => CloseAsync(playerId, tradeId, TradeStatus.Cancelled, ct);

    private async Task<TradeResult> CloseAsync(Guid playerId, Guid tradeId, string status, CancellationToken ct)
    {
        TradeUpdated updated;
        await using (var scope = scopes.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
            var trade = await db.Set<FishTradeRow>().AsNoTracking().SingleOrDefaultAsync(row => row.TradeId == tradeId, ct)
                ?? throw new GameException("TRADE_NOT_FOUND");
            var owner = status == TradeStatus.Cancelled ? trade.FromPlayerId : trade.ToPlayerId;
            if (owner != playerId) throw new GameException("TRADE_NOT_FOUND");
            var now = time.GetUtcNow();
            var closed = await db.Set<FishTradeRow>()
                .Where(row => row.TradeId == tradeId && row.Status == TradeStatus.Pending)
                .ExecuteUpdateAsync(setters => setters.SetProperty(row => row.Status, status).SetProperty(row => row.RespondedAt, now), ct);
            if (closed == 0) throw new GameException("STATE_CONFLICT");
            updated = new TradeUpdated(tradeId, status, trade.FromPlayerId, trade.ToPlayerId);
        }

        await NotifyAsync(updated, ct);
        return new TradeResult(tradeId, status);
    }

    private async Task NotifyAsync(TradeUpdated updated, CancellationToken ct)
    {
        await hub.Clients.User(updated.FromPlayerId.ToString()).SendAsync("TradeUpdated", updated, ct);
        await hub.Clients.User(updated.ToPlayerId.ToString()).SendAsync("TradeUpdated", updated, ct);
    }

    private static async Task EnsureHeldAsync(GameDbContext db, Guid[] ids, Guid holderId, CancellationToken ct)
    {
        var held = await db.Set<CatchRow>().AsNoTracking().Where(CatchRow.HeldBy(holderId)).CountAsync(row => ids.Contains(row.CatchId), ct);
        if (held != ids.Length) throw new GameException("FISH_NOT_FOUND");
    }

    private static async Task<IReadOnlyList<TradeView>> ViewsAsync(GameDbContext db, IReadOnlyList<FishTradeRow> trades, CancellationToken ct)
    {
        if (trades.Count == 0) return [];
        var tradeIds = trades.Select(row => row.TradeId).ToArray();
        var items = await db.Set<FishTradeItemRow>().AsNoTracking().Where(row => tradeIds.Contains(row.TradeId)).ToListAsync(ct);
        var catchIds = items.Select(row => row.CatchId).Distinct().ToArray();
        var fish = await db.Set<CatchRow>().AsNoTracking().Where(row => catchIds.Contains(row.CatchId))
            .ToDictionaryAsync(row => row.CatchId, row => new TradeFishView(row.CatchId, row.SpeciesId, row.LengthTenthCm), ct);
        var playerIds = trades.SelectMany(row => new[] { row.FromPlayerId, row.ToPlayerId }).Distinct().ToArray();
        var names = await db.Players.AsNoTracking().Where(row => playerIds.Contains(row.Id)).ToDictionaryAsync(row => row.Id, row => row.DisplayName, ct);
        IReadOnlyList<TradeFishView> Side(Guid tradeId, bool offered) =>
            items.Where(row => row.TradeId == tradeId && row.Offered == offered && fish.ContainsKey(row.CatchId))
                .Select(row => fish[row.CatchId]).ToArray();
        return trades.Select(row => new TradeView(
            row.TradeId, row.FromPlayerId, names.GetValueOrDefault(row.FromPlayerId, ""), row.ToPlayerId, names.GetValueOrDefault(row.ToPlayerId, ""),
            row.Status, row.CreatedAt, Side(row.TradeId, true), Side(row.TradeId, false))).ToArray();
    }
}

public static class TradesEndpoints
{
    public static WebApplication MapTrades(this WebApplication app)
    {
        app.MapGet("/api/v1/friends/{friendId:guid}/fish", async (Guid friendId, TradeService service, ICurrentPlayer player, CancellationToken ct) =>
            ApiResult.Ok(await service.FriendFishAsync(player.PlayerId, friendId, ct))).RequireAuthorization();
        var trades = app.MapGroup("/api/v1/trades").RequireAuthorization();
        trades.MapGet("", async (TradeService service, ICurrentPlayer player, CancellationToken ct) =>
            ApiResult.Ok(await service.ListAsync(player.PlayerId, ct)));
        trades.MapPost("", async (CreateTradeBody body, TradeService service, ICurrentPlayer player, CancellationToken ct) =>
            ApiResult.Ok(await service.CreateAsync(player.PlayerId, body, ct)));
        trades.MapPost("/{tradeId:guid}/accept", async (Guid tradeId, TradeService service, ICurrentPlayer player, CancellationToken ct) =>
            ApiResult.Ok(await service.AcceptAsync(player.PlayerId, tradeId, ct)));
        trades.MapPost("/{tradeId:guid}/decline", async (Guid tradeId, TradeService service, ICurrentPlayer player, CancellationToken ct) =>
            ApiResult.Ok(await service.DeclineAsync(player.PlayerId, tradeId, ct)));
        trades.MapPost("/{tradeId:guid}/cancel", async (Guid tradeId, TradeService service, ICurrentPlayer player, CancellationToken ct) =>
            ApiResult.Ok(await service.CancelAsync(player.PlayerId, tradeId, ct)));
        return app;
    }
}
