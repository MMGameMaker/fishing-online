using System.Globalization;
using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Modules.Config;
using FishingOnline.Api.Modules.Fishing;
using FishingOnline.Api.Modules.Wallet;
using FishingOnline.Api.Persistence;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace FishingOnline.Api.Modules.Lake;

/// <summary>Vé câu theo thời gian và chỗ ngồi (SPEC 2.2). DB là nguồn chân lý; event chỉ phát sau commit.</summary>
public sealed class SeatSessions(
    IServiceScopeFactory scopes,
    LakeLayout layout,
    IConfigProvider configs,
    LakeRoom room,
    TimeProvider time,
    ILogger<SeatSessions> logger) : ISeatSessions
{
    // Chỉ chặn tràn số; GD chưa chốt giới hạn tổng thời gian vé còn lại.
    private const long MaxTotalMinutes = 525600;

    public event Func<SeatSessionEnded, Task>? SessionEnded;

    public event Func<Guid, Task>? PlayerDisconnected;

    public async Task<SeatSessionInfo?> GetActiveAsync(Guid playerId, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        var session = await db.Set<SeatSessionRow>().AsNoTracking()
            .SingleOrDefaultAsync(row => row.PlayerId == playerId && row.EndedAt == null, ct);
        if (session is null) return null;
        var ticket = await db.Set<TicketRow>().AsNoTracking().SingleOrDefaultAsync(row => row.PlayerId == playerId, ct);
        return new SeatSessionInfo(session.Id, session.SeatId, ticket?.ExpiresAt);
    }

    public async Task<MySeatView?> GetMineAsync(Guid playerId, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        var session = await db.Set<SeatSessionRow>().AsNoTracking()
            .SingleOrDefaultAsync(row => row.PlayerId == playerId && row.EndedAt == null, ct);
        return session is null ? null : SeatOf(session);
    }

    public async Task<MyTicketView?> GetTicketAsync(Guid playerId, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        var ticket = await db.Set<TicketRow>().AsNoTracking().SingleOrDefaultAsync(row => row.PlayerId == playerId, ct);
        return ticket is null ? null : TicketOf(ticket);
    }

    public async Task<IReadOnlyList<SeatView>> SeatViewsAsync(CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        var open = await db.Set<SeatSessionRow>().AsNoTracking().Where(row => row.EndedAt == null).ToDictionaryAsync(row => row.SeatId, ct);
        return layout.Seats.OrderBy(seat => seat.Number)
            .Select(seat => SeatViewOf(seat.SeatId, open.GetValueOrDefault(seat.SeatId)?.PlayerId))
            .ToArray();
    }

    public async Task<TicketPurchaseResult> BuyTicketAsync(
        Guid playerId, Guid requestId, int quantity, string expectedPriceVersion, CancellationToken ct)
    {
        var hash = GameJson.Sha256Hex($"{quantity}|{expectedPriceVersion}");
        var fresh = false;
        TicketPurchaseResult result;
        await using (var scope = scopes.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
            var wallet = scope.ServiceProvider.GetRequiredService<IWallet>();
            result = await scope.ServiceProvider.GetRequiredService<IIdempotency>().RunAsync(playerId, "ticket.buy", requestId, hash, async () =>
            {
                fresh = true;
                var pricing = configs.Current.TicketPricing;
                if (quantity < 1 || quantity > pricing.MaxUnitsPerPurchase) throw new GameException("INVALID_QUANTITY");
                if (expectedPriceVersion != pricing.PriceVersion) throw new GameException("PRICE_CHANGED");

                // PostgreSQL lưu tới micro giây; làm tròn trước để ack và snapshot đọc lại từ DB luôn cùng giá trị.
                var now = TruncateToMicroseconds(time.GetUtcNow());
                var minutes = quantity * pricing.BillingUnitMinutes;
                var total = quantity * pricing.UnitPriceGold;

                await db.Database.ExecuteSqlInterpolatedAsync(
                    $"""insert into game.tickets ("PlayerId", "ExpiresAt", "PurchasedMinutes", "TicketVersion", "PriceVersion") values ({playerId}, {now}, 0, 0, '') on conflict do nothing""",
                    ct);
                var ticket = await db.Set<TicketRow>()
                    .FromSqlInterpolated($"""select * from game.tickets where "PlayerId" = {playerId} for update""")
                    .AsTracking()
                    .SingleAsync(ct);
                if (ticket.PurchasedMinutes + (long)minutes > MaxTotalMinutes) throw new GameException("INVALID_QUANTITY");

                var purchaseId = Guid.CreateVersion7();
                var gold = await wallet.DebitAsync(playerId, total, LedgerReasons.TicketPurchase, purchaseId.ToString(), ct);
                // Còn vé thì cộng nối vào hạn cũ, hết vé thì tính từ lúc mua.
                var start = ticket.ExpiresAt > now ? ticket.ExpiresAt : now;
                ticket.ExpiresAt = start.AddMinutes(minutes);
                ticket.PurchasedMinutes += minutes;
                ticket.TicketVersion++;
                ticket.PriceVersion = pricing.PriceVersion;
                db.Add(new TicketPurchaseRow
                {
                    Id = purchaseId,
                    PlayerId = playerId,
                    Quantity = quantity,
                    AddedMinutes = minutes,
                    UnitPriceGold = pricing.UnitPriceGold,
                    TotalGold = total,
                    PriceVersion = pricing.PriceVersion,
                    ExpiresAtAfter = ticket.ExpiresAt,
                    CreatedAt = now,
                });
                await db.SaveChangesAsync(ct);
                return new TicketPurchaseResult(TicketOf(ticket), Text(gold), Text(total));
            });
        }

        if (fresh) await room.SendToPlayerAsync(playerId, "MyTicket", result.Ticket);
        return result;
    }

    public async Task<SitDownResult> SitDownAsync(Guid playerId, string seatId, CancellationToken ct)
    {
        var seat = layout.Seat(seatId) ?? throw new GameException(ErrorCatalog.ValidationFailed);
        if (await room.Queue.RunAsync(() => Task.FromResult(room.Find(playerId) is null))) throw new GameException("STATE_CONFLICT");

        MySeatView view;
        await using (var scope = scopes.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
            var mine = await db.Set<SeatSessionRow>().AsNoTracking()
                .SingleOrDefaultAsync(row => row.PlayerId == playerId && row.EndedAt == null, ct);
            // Gửi lại lệnh ngồi đúng ghế đang ngồi thì trả ghế đó, không báo lỗi.
            if (mine is not null)
                return mine.SeatId == seatId ? new SitDownResult(SeatOf(mine)) : throw new GameException("ALREADY_HAS_SEAT");

            var now = TruncateToMicroseconds(time.GetUtcNow());
            var ticket = await db.Set<TicketRow>().AsNoTracking().SingleOrDefaultAsync(row => row.PlayerId == playerId, ct);
            if (ticket is null || ticket.ExpiresAt <= now) throw new GameException("NO_TICKET");
            if (await db.Set<SeatSessionRow>().AsNoTracking().AnyAsync(row => row.SeatId == seatId && row.EndedAt == null, ct))
                throw new GameException("SEAT_TAKEN");

            var session = new SeatSessionRow
            {
                Id = Guid.CreateVersion7(),
                SeatId = seatId,
                PlayerId = playerId,
                StartedAt = now,
                ConfigVersion = configs.Current.ConfigVersion,
            };
            db.Add(session);
            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException exception) when (exception.UniqueConstraint() is { } constraint)
            {
                throw new GameException(constraint == SeatSessionRowConfig.OpenPlayerIndex ? "ALREADY_HAS_SEAT" : "SEAT_TAKEN");
            }
            view = SeatOf(session);
        }

        await PublishTakenAsync(playerId, seat, view);
        return new SitDownResult(view);
    }

    /// <summary>Rời ghế theo lệnh của user; từ chối khi đang minigame (SPEC 2.2).</summary>
    public async Task LeaveAsync(Guid playerId, CancellationToken ct)
    {
        await using (var scope = scopes.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
            if (await InMinigame(db).AnyAsync(id => id == playerId, ct)) throw new GameException("STATE_CONFLICT");
        }
        if (!await EndAsync(playerId, SeatEndReasons.LeftSeat, ct)) throw new GameException("NOT_IN_SEAT");
    }

    public async Task<bool> EndAsync(Guid playerId, string reason, CancellationToken ct)
    {
        Guid? sessionId;
        await using (var scope = scopes.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
            sessionId = await db.Set<SeatSessionRow>().AsNoTracking()
                .Where(row => row.PlayerId == playerId && row.EndedAt == null)
                .Select(row => (Guid?)row.Id).SingleOrDefaultAsync(ct);
        }
        return sessionId is not null && await EndSessionAsync(sessionId.Value, reason, stillDue: null, ct);
    }

    /// <summary>Đánh dấu mất kết nối; trả về true nếu player đang ngồi ghế.</summary>
    public async Task<bool> MarkDisconnectedAsync(Guid playerId, CancellationToken ct)
    {
        var now = time.GetUtcNow();
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        var updated = await db.Set<SeatSessionRow>().Where(row => row.PlayerId == playerId && row.EndedAt == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(row => row.DisconnectedAt, now), ct);
        if (updated == 0) return false;
        await RaiseAsync(PlayerDisconnected, playerId);
        return true;
    }

    public async Task ClearDisconnectedAsync(Guid playerId, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        await db.Set<SeatSessionRow>().Where(row => row.PlayerId == playerId && row.EndedAt == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(row => row.DisconnectedAt, (DateTimeOffset?)null), ct);
    }

    /// <summary>
    /// Một lượt quét: mất kết nối quá hạn, và vé đã hết với người không đang minigame.
    /// Người đang minigame được câu nốt; có kết quả rồi lượt quét sau mới cho đứng dậy.
    /// </summary>
    public async Task SweepOnceAsync(CancellationToken ct)
    {
        var now = time.GetUtcNow();
        List<SeatSessionRow> open;
        Dictionary<Guid, DateTimeOffset> tickets;
        HashSet<Guid> playing;
        await using (var scope = scopes.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
            open = await db.Set<SeatSessionRow>().AsNoTracking().Where(row => row.EndedAt == null).ToListAsync(ct);
            if (open.Count == 0) return;
            var players = open.Select(row => row.PlayerId).ToArray();
            tickets = await db.Set<TicketRow>().AsNoTracking().Where(row => players.Contains(row.PlayerId))
                .ToDictionaryAsync(row => row.PlayerId, row => row.ExpiresAt, ct);
            playing = (await InMinigame(db).Where(id => players.Contains(id)).ToListAsync(ct)).ToHashSet();
        }

        foreach (var session in open)
        {
            string? Due(SeatSessionRow row) => DueReason(row, tickets.GetValueOrDefault(row.PlayerId), playing.Contains(row.PlayerId), now);
            if (Due(session) is not { } reason) continue;
            await EndSessionAsync(session.Id, reason, row => Due(row) is not null, ct);
        }
    }

    public async Task WriteHeartbeatAsync(CancellationToken ct)
    {
        var now = time.GetUtcNow();
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        await db.Database.ExecuteSqlInterpolatedAsync($"""
            insert into game.lake_runtime ("Id", "LastAliveAt") values (1, {now})
            on conflict ("Id") do update set "LastAliveAt" = excluded."LastAliveAt"
            """, ct);
    }

    /// <summary>
    /// Sau restart mọi kết nối đã mất. Thời điểm mất kết nối lấy theo lần cuối Server còn sống,
    /// để thời gian tắt máy cũng tính vào grace.
    /// </summary>
    public async Task RecoverAsync(CancellationToken ct)
    {
        await using (var scope = scopes.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
            var existing = await db.Set<SeatRow>().Select(row => row.SeatId).ToListAsync(ct);
            db.AddRange(layout.Seats.Where(seat => !existing.Contains(seat.SeatId))
                .Select(seat => new SeatRow { SeatId = seat.SeatId, Number = seat.Number }));
            await db.SaveChangesAsync(ct);

            var lastAlive = await db.Set<LakeRuntimeRow>().AsNoTracking().Select(row => (DateTimeOffset?)row.LastAliveAt).SingleOrDefaultAsync(ct);
            var disconnectedAt = lastAlive ?? time.GetUtcNow();
            await db.Set<SeatSessionRow>().Where(row => row.EndedAt == null && row.DisconnectedAt == null)
                .ExecuteUpdateAsync(setters => setters.SetProperty(row => row.DisconnectedAt, disconnectedAt), ct);
        }
        await SweepOnceAsync(ct);
        await WriteHeartbeatAsync(ct);
    }

    private async Task<bool> EndSessionAsync(Guid sessionId, string reason, Func<SeatSessionRow, bool>? stillDue, CancellationToken ct)
    {
        SeatSessionRow session;
        await using (var scope = scopes.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
            await using var transaction = await db.Database.BeginTransactionAsync(ct);
            var locked = await db.Set<SeatSessionRow>()
                .FromSqlInterpolated($"""select * from game.seat_sessions where "Id" = {sessionId} for update""")
                .AsTracking()
                .SingleOrDefaultAsync(ct);
            if (locked is null || locked.EndedAt is not null || (stillDue is not null && !stillDue(locked))) return false;

            locked.EndedAt = time.GetUtcNow();
            locked.EndReason = reason;
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            session = locked;
        }

        logger.LogInformation("Seat session {SessionId} ended: {Reason}", session.Id, reason);
        await RaiseAsync(SessionEnded, new SeatSessionEnded(session.PlayerId, session.Id, session.SeatId, reason));
        await room.BroadcastAsync("SeatChanged", SeatViewOf(session.SeatId, occupant: null));
        await room.SendToPlayerAsync(session.PlayerId, "MySeat", new SeatEndedView(session.SeatId, true, reason));
        await room.Queue.RunAsync(async () =>
        {
            if (room.Find(session.PlayerId) is not { } player) return true;
            player.SeatId = null;
            if (!player.Online)
            {
                room.Remove(session.PlayerId);
                await room.BroadcastAsync("PlayerLeft", new PlayerLeftView(session.PlayerId));
            }
            return true;
        });
        return true;
    }

    private string? DueReason(SeatSessionRow session, DateTimeOffset? ticketExpiresAt, bool inMinigame, DateTimeOffset now)
    {
        var grace = configs.Get(session.ConfigVersion).SeatSession.DisconnectGraceMs;
        if (session.DisconnectedAt?.AddMilliseconds(grace) <= now) return SeatEndReasons.DisconnectTimeout;
        if (!inMinigame && (ticketExpiresAt is null || ticketExpiresAt <= now)) return SeatEndReasons.TicketExpired;
        return null;
    }

    private async Task PublishTakenAsync(Guid playerId, LakeSeatInfo seat, MySeatView view)
    {
        await room.BroadcastAsync("SeatChanged", SeatViewOf(seat.SeatId, playerId));
        await room.SendToPlayerAsync(playerId, "MySeat", view);
        await room.Queue.RunAsync(async () =>
        {
            if (room.Find(playerId) is not { } player) return true;
            player.SeatId = seat.SeatId;
            player.LastMoveAt = time.GetUtcNow();
            return true;
        });
    }

    /// <summary>Player đang ở bước minigame của lần câu chưa kết thúc.</summary>
    private static IQueryable<Guid> InMinigame(GameDbContext db) =>
        db.Set<FishingAttemptRow>().AsNoTracking()
            .Where(row => row.EndedAt == null && row.Phase == "minigame")
            .Select(row => row.PlayerId);

    private static MySeatView SeatOf(SeatSessionRow session) => new(session.SeatId, session.Id, session.StartedAt);

    private static MyTicketView TicketOf(TicketRow ticket) =>
        new(ticket.ExpiresAt, ticket.PurchasedMinutes, ticket.TicketVersion, ticket.PriceVersion);

    private static SeatView SeatViewOf(string seatId, Guid? occupant) =>
        new(seatId, occupant is null ? "available" : "occupied", occupant);

    private static string Text(long gold) => gold.ToString(CultureInfo.InvariantCulture);

    private static DateTimeOffset TruncateToMicroseconds(DateTimeOffset value) =>
        value.AddTicks(-(value.Ticks % TimeSpan.TicksPerMicrosecond));

    private async Task RaiseAsync<T>(Func<T, Task>? handlers, T argument)
    {
        if (handlers is null) return;
        foreach (var handler in handlers.GetInvocationList().Cast<Func<T, Task>>())
        {
            try
            {
                await handler(argument);
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Seat session event handler failed");
            }
        }
    }
}
