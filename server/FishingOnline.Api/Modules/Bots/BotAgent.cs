using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Modules.Config;
using FishingOnline.Api.Modules.Fishing;
using FishingOnline.Api.Modules.Lake;
using FishingOnline.Api.Modules.Wallet;

namespace FishingOnline.Api.Modules.Bots;

/// <summary>Mọi thứ một bot cần để hành xử như người chơi thật (dùng đúng các service mà Hub gọi).</summary>
public sealed record BotDeps(
    IServiceScopeFactory Scopes,
    LakeRoom Room,
    LakeLayout Layout,
    SeatSessions Seats,
    FishingService Fishing,
    IConfigProvider Configs,
    BotMap Map,
    BotSpots Spots,
    TimeProvider Time,
    double TimeScale,
    Func<CancellationToken, Task<int>> SuccessPct,
    ILogger Logger);

/// <summary>
/// Một bot trong hồ: có hàng Players thật (IsBot), có mặt trong phòng, đi dạo, mua vé, ngồi ghế và câu qua đúng
/// <see cref="FishingService"/> như người chơi thật, nên cá của bot đi qua cùng luật và vào bảng xếp hạng.
/// Không có gì ở đây (hay trong gói gửi Client) cho biết đó là bot; chỉ Admin thấy cờ IsBot trong DB.
/// Hai luật thêm ngày 2026-11-17: (1) điểm dừng của bot không được trùng người/bot khác; (2) bot không đứng yên quá lâu
/// (<see cref="StalledFor"/> để BotManager khởi động lại vòng đời bị kẹt).
/// </summary>
public sealed class BotAgent(Guid playerId, string displayName, string skinId, string rodId, BotDeps deps)
{
    // Cùng nhịp người chơi thật gửi Move (10 lần/giây): Client nội suy 100 ms mỗi bước nên bot đi mượt, không giật.
    private const int StepMs = 100;
    private const int MinSecondsLeftOnTicket = 180;
    private const int PauseSliceMs = 400;
    private const int PickAttempts = 12;
    // Bị chặn: trong 0,5 giây vị trí đổi chưa tới 2 px khi chưa tới đích (yêu cầu 2026-11-17); chọn lại điểm tối đa 4 lần mỗi chặng.
    private const int BlockedWindowMs = 500;
    private const double BlockedMinMovePx = 2;
    private const int MaxRepicks = 4;

    private readonly Random random = new();
    private readonly SemaphoreSlim lifecycle = new(1, 1);
    private CancellationTokenSource cts = new();
    private Task loop = Task.CompletedTask;
    private long sequence;
    private long lastProgressTicks = Environment.TickCount64;
    private double x;
    private double y;
    private string direction = "down";
    /// <summary>Ghế mà bot đang đứng ở vị trí của nó (từ lúc ngồi tới lúc đã ra khỏi vị trí đó); null khi đang ở chỗ thường.</summary>
    private BotMap.MapSeat? seatedAt;

    public Guid PlayerId => playerId;

    public string DisplayName => displayName;

    /// <summary>Đã bao lâu bot không có tiến triển nào (không bước, không bước nào của lượt câu).</summary>
    public TimeSpan StalledFor => TimeSpan.FromMilliseconds(Environment.TickCount64 - Interlocked.Read(ref lastProgressTicks));

    private void Touch() => Interlocked.Exchange(ref lastProgressTicks, Environment.TickCount64);

    /// <summary>Vào phòng ở một chỗ đứng được, rồi bắt đầu vòng đời của bot.</summary>
    public async Task StartAsync()
    {
        // Dọn ghế/lần câu còn sót từ lần chạy trước (bot không có kết nối nên Server tự kết thúc sau grace).
        await deps.Seats.EndAsync(playerId, SeatEndReasons.LeftLake, CancellationToken.None);
        var others = await OthersAsync();
        var spawn = deps.Map.RandomStandable(random, deps.Map.Spawn.X, deps.Map.Spawn.Y, 120, spot => IsFree(spot, others));
        x = spawn.X;
        y = spawn.Y;
        deps.Spots.TryReserve(playerId, spawn);
        await deps.Room.Queue.RunAsync(async () =>
        {
            var player = new RoomPlayer
            {
                PlayerId = playerId,
                DisplayName = displayName,
                SkinId = skinId,
                RodId = rodId,
                // Không phải kết nối SignalR thật: tin gửi riêng cho bot rơi vào khoảng trống, tin phát cả phòng vẫn tới người thật.
                ConnectionId = $"bot:{playerId}",
                Abort = () => { },
                X = x,
                Y = y,
                Dir = direction,
                LastMoveAt = deps.Time.GetUtcNow(),
            };
            deps.Room.Add(player);
            await deps.Room.BroadcastAsync("PlayerJoined", deps.Room.View(player));
            return true;
        });
        BeginLoop();
    }

    private void BeginLoop()
    {
        cts = new CancellationTokenSource();
        var token = cts.Token;
        Touch();
        loop = Task.Run(() => RunAsync(token));
    }

    /// <summary>Dừng vòng đời, đứng dậy (hủy lần câu đang mở) và rời phòng như người chơi thoát.</summary>
    public async Task StopAsync()
    {
        await lifecycle.WaitAsync();
        try
        {
            await cts.CancelAsync();
            await WaitLoopAsync(TimeSpan.FromSeconds(10));
            await deps.Seats.EndAsync(playerId, SeatEndReasons.LeftSeat, CancellationToken.None);
            deps.Spots.Release(playerId);
            await deps.Room.Queue.RunAsync(async () =>
            {
                if (deps.Room.Find(playerId) is null) return true;
                deps.Room.Remove(playerId);
                await deps.Room.BroadcastAsync("PlayerLeft", new PlayerLeftView(playerId));
                return true;
            });
        }
        finally
        {
            lifecycle.Release();
        }
    }

    /// <summary>
    /// Bot đứng yên quá lâu: hủy vòng đời cũ, đứng dậy, đưa về vùng đi lại chính nếu đang lọt cù lao, rồi chạy vòng mới.
    /// Là lưới an toàn; các nhánh kẹt đã biết được xử lý ngay trong vòng đời.
    /// </summary>
    public async Task RestartAsync()
    {
        await lifecycle.WaitAsync();
        try
        {
            await cts.CancelAsync();
            await WaitLoopAsync(TimeSpan.FromSeconds(5));
            await EnsureStandingAsync();
            if (!deps.Map.IsInMainArea(x, y))
            {
                var others = await OthersAsync();
                var spot = deps.Map.RandomStandable(random, deps.Map.Spawn.X, deps.Map.Spawn.Y, 120, candidate => IsFree(candidate, others));
                x = spot.X;
                y = spot.Y;
                deps.Spots.TryReserve(playerId, spot);
                await PublishPositionAsync();
            }
            BeginLoop();
        }
        finally
        {
            lifecycle.Release();
        }
    }

    private async Task WaitLoopAsync(TimeSpan timeout)
    {
        // Vòng cũ có thể treo trong một lệnh không nhận hủy: chờ có hạn rồi bỏ qua (nó mang token đã hủy nên sẽ tự thoát nếu còn chạy).
        var finished = await Task.WhenAny(loop, Task.Delay(timeout));
        if (finished != loop) return;
        try
        {
            await loop;
        }
        catch (OperationCanceledException)
        {
            // Dừng theo yêu cầu.
        }
    }

    private async Task RunAsync(CancellationToken ct)
    {
        try
        {
            while (!ct.IsCancellationRequested)
            {
                try
                {
                    await LeaveSeatSpotAsync(ct);
                    await WanderAsync(random.Next(6000, 20000), ct);
                    if (random.NextDouble() < 0.7) await FishSessionAsync(ct);
                    Touch();
                }
                catch (GameException exception)
                {
                    // Ghế bị giành, vé hết, hồ hết cá... như người thật: bỏ lượt rồi đi dạo tiếp.
                    deps.Logger.LogDebug("Bot {Bot} gave up a round: {Code}", displayName, exception.Code);
                    await EnsureStandingAsync();
                    await DelayAsync(2000, ct);
                }
                catch (Exception exception) when (exception is not OperationCanceledException)
                {
                    deps.Logger.LogWarning(exception, "Bot {Bot} failed a round", displayName);
                    await DelayAsync(5000, ct);
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Dừng theo yêu cầu.
        }
    }

    // ---- Chỗ đứng: không trùng người chơi thật, không trùng bot khác ----

    private async Task<IReadOnlyList<PlayerView>> OthersAsync()
    {
        var views = await deps.Room.Queue.RunAsync(() => Task.FromResult(deps.Room.Views()));
        return views.Where(view => view.PlayerId != playerId).ToArray();
    }

    /// <summary>Điểm đủ xa mọi người trong phòng (chụp lúc gọi) và mọi chỗ bot khác đã đặt.</summary>
    private bool IsFree(BotMap.MapPoint spot, IReadOnlyList<PlayerView> others) =>
        deps.Spots.IsFree(playerId, spot) && others.All(view => !BotMap.TooClose(view.X, view.Y, spot.X, spot.Y));

    /// <summary>Chọn điểm dừng ngẫu nhiên đang trống, đi tới được từ chỗ đứng hiện tại, và đặt chỗ nó; null nếu không có.</summary>
    private async Task<IReadOnlyList<BotMap.MapPoint>?> PickRouteAsync(double radius)
    {
        var others = await OthersAsync();
        var here = new BotMap.MapPoint(x, y);
        for (var attempt = 0; attempt < PickAttempts; attempt++)
        {
            var target = deps.Map.RandomStandable(random, x, y, radius, spot => IsFree(spot, others));
            if (!IsFree(target, others) || !deps.Map.IsInMainArea(target.X, target.Y)) continue;
            if (deps.Map.FindRoute(here, target) is not { Count: > 0 } route) continue;
            if (!deps.Spots.TryReserve(playerId, target)) continue;
            return route;
        }
        return null;
    }

    /// <summary>Kết quả một chặng đi: đã đi bao lâu (ms), và có bị chặn giữa đường (đứng yên quá 0,5 giây) không.</summary>
    private readonly record struct Leg(int Ms, bool Blocked);

    /// <summary>Đi hết các điểm của đường; bị chặn ở điểm nào thì dừng ngay và báo Blocked.</summary>
    private async Task<Leg> WalkRouteAsync(IReadOnlyList<BotMap.MapPoint> route, CancellationToken ct)
    {
        var spent = 0;
        foreach (var point in route)
        {
            var leg = await MoveToAsync(point.X, point.Y, ct);
            spent += leg.Ms;
            if (leg.Blocked) return new Leg(spent, true);
        }
        return new Leg(spent, false);
    }

    /// <summary>
    /// Chọn một điểm dừng ngẫu nhiên và đi tới đó. Bị chặn giữa đường (không tới đích mà vị trí không đổi quá 0,5 giây)
    /// thì bỏ điểm đó, random điểm khác và đi tiếp (yêu cầu 2026-11-17), tối đa <see cref="MaxRepicks"/> lần mỗi chặng.
    /// </summary>
    private async Task<int> RoamAsync(double radius, CancellationToken ct)
    {
        var spent = 0;
        for (var attempt = 0; attempt <= MaxRepicks; attempt++)
        {
            if (await PickRouteAsync(radius) is not { } route) break;
            var leg = await WalkRouteAsync(route, ct);
            spent += leg.Ms;
            if (!leg.Blocked) break;
            deps.Logger.LogDebug("Bot {Bot} is blocked at ({X:0},{Y:0}), picking another spot", displayName, x, y);
        }
        return spent;
    }

    private async Task WanderAsync(int totalMs, CancellationToken ct)
    {
        var spentMs = 0;
        while (spentMs < totalMs)
        {
            var walked = await RoamAsync(260, ct);
            spentMs += walked;
            if (walked == 0)
            {
                // Hồ quá đông hoặc kẹt góc: đứng chờ rồi thử lại.
                spentMs += 1000;
                await DelayAsync(1000, ct);
            }
            spentMs += await PauseAsync(random.Next(800, 3500), ct);
        }
    }

    /// <summary>Đứng nghỉ; nếu có người đi tới đứng chồng lên (hoặc chỗ bot bị trùng) thì đi sang chỗ khác ngay.</summary>
    private async Task<int> PauseAsync(int ms, CancellationToken ct)
    {
        var spent = 0;
        while (spent < ms)
        {
            var slice = Math.Min(PauseSliceMs, ms - spent);
            await DelayAsync(slice, ct);
            spent += slice;
            Touch();
            var others = await OthersAsync();
            if (others.All(view => !BotMap.TooClose(view.X, view.Y, x, y))) continue;
            deps.Logger.LogDebug("Bot {Bot} is overlapped at ({X:0},{Y:0}), moving away", displayName, x, y);
            spent += await RoamAsync(120, ct);
        }
        return spent;
    }

    /// <summary>
    /// Đi thẳng tới (tx, ty), trượt dọc vật cản. Chưa tới đích mà vị trí gần như không đổi suốt <see cref="BlockedWindowMs"/>
    /// (kể cả khi vẫn đang "bước" lắc qua lại sát vật cản) thì dừng và báo Blocked để người gọi chọn điểm khác.
    /// </summary>
    private async Task<Leg> MoveToAsync(double tx, double ty, CancellationToken ct)
    {
        var speed = deps.Map.MaxSpeedPxPerSec * (0.5 + 0.2 * random.NextDouble());
        var elapsed = 0;
        var windowStartX = x;
        var windowStartY = y;
        var windowMs = 0;
        while (elapsed < 40000)
        {
            ct.ThrowIfCancellationRequested();
            var dx = tx - x;
            var dy = ty - y;
            var distance = Math.Sqrt(dx * dx + dy * dy);
            if (distance < 3) return new Leg(elapsed, false);
            var step = Math.Min(distance, speed * StepMs / 1000.0);
            var (nextX, nextY) = deps.Map.StepMove(x, y, dx / distance * step, dy / distance * step);
            if (nextX != x || nextY != y)
            {
                x = nextX;
                y = nextY;
                direction = Math.Abs(dx) > Math.Abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
                Touch();
                await PublishPositionAsync();
            }
            await DelayAsync(StepMs, ct);
            elapsed += StepMs;
            windowMs += StepMs;
            if (windowMs < BlockedWindowMs) continue;
            var moved = Math.Sqrt((x - windowStartX) * (x - windowStartX) + (y - windowStartY) * (y - windowStartY));
            if (moved < BlockedMinMovePx) return new Leg(elapsed, true);
            windowStartX = x;
            windowStartY = y;
            windowMs = 0;
        }
        return new Leg(elapsed, true);
    }

    private Task PublishPositionAsync()
    {
        var seq = Interlocked.Increment(ref sequence);
        return deps.Room.Queue.RunAsync(async () =>
        {
            if (deps.Room.Find(playerId) is not { } player) return false;
            player.X = x;
            player.Y = y;
            player.Dir = direction;
            player.LastSeq = seq;
            player.LastMoveAt = deps.Time.GetUtcNow();
            await deps.Room.BroadcastAsync("PlayerMoved", new PlayerMovedView(playerId, x, y, direction, seq));
            return true;
        });
    }

    /// <summary>Mua vé nếu cần, đi tới ghế trống, ngồi, câu vài lượt rồi đứng dậy.</summary>
    private async Task FishSessionAsync(CancellationToken ct)
    {
        await EnsureTicketAsync(ct);
        Touch();
        var views = await deps.Seats.SeatViewsAsync(ct);
        // Ghế phải trống trong DB và không có ai (người thật hay bot) đang đứng ngay trên vị trí ghế.
        var onSeats = await OthersAsync();
        var free = views.Where(view => view.State == "available" && SeatSpotFree(view.SeatId, onSeats)).ToArray();
        if (free.Length == 0) return;
        var seatId = free[random.Next(free.Length)].SeatId;

        var seatSpot = deps.Map.Seats.GetValueOrDefault(seatId);
        if (seatSpot is not null)
        {
            // Chỗ đứng cạnh ghế phải trống (không trùng người/bot khác). Đi vòng qua vật cản tới đó; không có chỗ, không có đường
            // hoặc không tới được thì bỏ lượt này, không dịch chuyển lên ghế (feedback 2026-11-16).
            var others = await OthersAsync();
            var stand = deps.Map.NearestStandable(seatSpot.X, seatSpot.Y, accept: spot => IsFree(spot, others));
            if (stand is null || !deps.Spots.TryReserve(playerId, stand)) return;
            if (deps.Map.FindRoute(new BotMap.MapPoint(x, y), stand) is not { } route) return;
            // Bị chặn giữa đường: bỏ ghế này, quay về dạo và chọn một điểm khác (RoamAsync) thay vì đứng "đi tại chỗ".
            if ((await WalkRouteAsync(route, ct)).Blocked) return;
            if (Math.Abs(stand.X - x) > 6 || Math.Abs(stand.Y - y) > 6) return;
            // Trong lúc đi có người bước lên vị trí ghế: không ngồi đè lên họ.
            if (!SeatSpotFree(seatId, await OthersAsync())) return;
        }
        await deps.Seats.SitDownAsync(playerId, seatId, ct);
        Touch();
        if (seatSpot is not null)
        {
            // Từ đây vị trí bot là vị trí ghế; mọi đường thoát (hết vé, bị Server kết thúc phiên, lỗi) phải gọi LeaveSeatSpotAsync.
            seatedAt = seatSpot;
            x = seatSpot.X;
            y = seatSpot.Y;
            direction = seatSpot.Facing;
            await PublishPositionAsync();
        }

        var casts = random.Next(2, 6);
        for (var i = 0; i < casts && !ct.IsCancellationRequested; i++)
        {
            // Server đã kết thúc phiên ngồi (hết vé, mất kết nối...): thôi câu, đứng dậy khỏi vị trí ghế.
            if (await deps.Seats.GetActiveAsync(playerId, ct) is null) break;
            if (!await CastOnceAsync(ct)) break;
            await DelayAsync(random.Next(1000, 3000), ct);
            Touch();
        }

        // Còn lần câu dở (vd. bị hủy giữa chừng) thì EndAsync hủy hộ; phiên đã bị Server kết thúc trước thì EndAsync trả false.
        await deps.Seats.EndAsync(playerId, SeatEndReasons.LeftSeat, CancellationToken.None);
        await LeaveSeatSpotAsync(ct);
    }

    /// <summary>Không ai (người/bot) đang đứng sát vị trí ghế này.</summary>
    private bool SeatSpotFree(string seatId, IReadOnlyList<PlayerView> others) =>
        deps.Map.Seats.GetValueOrDefault(seatId) is not { } seat
        || others.All(view => view.SeatId != seatId && !BotMap.TooClose(view.X, view.Y, seat.X, seat.Y));

    /// <summary>
    /// Nếu bot còn đứng ở vị trí ghế mà không còn phiên ngồi thật trong DB thì đi ra chỗ trống gần đó. Không để bot "ngồi ma"
    /// ở ghế đã trả, vì người khác (hay bot khác) sẽ ngồi vào đúng chỗ đó và hai người chồng lên nhau (lỗi 2026-11-17).
    /// </summary>
    private async Task LeaveSeatSpotAsync(CancellationToken ct)
    {
        if (seatedAt is not { } seat) return;
        if (await deps.Seats.GetActiveAsync(playerId, CancellationToken.None) is not null) return;
        seatedAt = null;
        deps.Logger.LogDebug("Bot {Bot} leaves seat spot {Seat}", displayName, seat.SeatId);
        var around = await OthersAsync();
        var spot = deps.Map.NearestStandable(seat.X, seat.Y, 48, accept: candidate => IsFree(candidate, around))
            ?? deps.Map.NearestStandable(seat.X, seat.Y, 160, 4, candidate => IsFree(candidate, around))
            ?? deps.Map.RandomStandable(random, seat.X, seat.Y, 200, candidate => IsFree(candidate, around));
        deps.Spots.TryReserve(playerId, spot);
        // Đi bộ ra; bị chặn hay không tới nơi thì đặt thẳng, để bot không kẹt lại trên ghế.
        var leg = ct.IsCancellationRequested ? new Leg(0, true) : await MoveToAsync(spot.X, spot.Y, ct);
        if (leg.Blocked || Math.Abs(spot.X - x) > 6 || Math.Abs(spot.Y - y) > 6)
        {
            x = spot.X;
            y = spot.Y;
            await PublishPositionAsync();
        }
    }

    /// <summary>Một lượt: quăng, chờ cá cắn, phản ứng rồi kéo, báo kết quả. False nếu lượt không thể tiếp tục.</summary>
    private async Task<bool> CastOnceAsync(CancellationToken ct)
    {
        Touch();
        await deps.Fishing.CastAsync(playerId, Guid.NewGuid(), ct);
        var attempt = await WaitForPhaseAsync("bite", 60000, ct);
        if (attempt is null) return false;
        Touch();

        var windowMs = deps.Configs.Current.Fishing.BiteWindowMs;
        await DelayAsync(random.Next(500, Math.Max(600, Math.Min(1800, windowMs - 800))), ct);
        try
        {
            await deps.Fishing.HookAsync(playerId, attempt.AttemptId, ct);
        }
        catch (GameException exception) when (exception.Code == "BITE_EXPIRED")
        {
            return true;
        }
        Touch();

        var minigame = (await deps.Fishing.GetActiveViewAsync(playerId, ct))?.Minigame;
        if (minigame is null) return true;
        // Chơi minigame mất một khoảng như người thật, luôn kịp trước hạn.
        var playMs = (int)(minigame.DurationMs * (0.35 + 0.45 * random.NextDouble()));
        await DelayAsync(playMs, ct);
        var wins = random.Next(100) < await deps.SuccessPct(ct);
        try
        {
            await deps.Fishing.SubmitResultAsync(playerId, attempt.AttemptId, wins ? "success" : "failed", ct);
        }
        catch (GameException exception) when (exception.Code is "RESULT_EXPIRED" or "STATE_CONFLICT")
        {
            return true;
        }
        Touch();
        return true;
    }

    private async Task<AttemptView?> WaitForPhaseAsync(string phase, int timeoutMs, CancellationToken ct)
    {
        var started = Environment.TickCount64;
        // Chờ theo giờ thật của Server (cá cắn do Server định), không co theo TimeScale.
        while (Environment.TickCount64 - started < timeoutMs)
        {
            var view = await deps.Fishing.GetActiveViewAsync(playerId, ct);
            if (view is null) return null;
            if (view.Phase == phase) return view;
            await Task.Delay(100, ct);
        }
        return null;
    }

    private async Task EnsureTicketAsync(CancellationToken ct)
    {
        var ticket = await deps.Seats.GetTicketAsync(playerId, ct);
        var now = deps.Time.GetUtcNow();
        if (ticket is not null && ticket.ExpiresAt > now.AddSeconds(MinSecondsLeftOnTicket)) return;

        var pricing = deps.Configs.Current.TicketPricing;
        await using (var scope = deps.Scopes.CreateAsyncScope())
        {
            var wallet = scope.ServiceProvider.GetRequiredService<IWallet>();
            // Bot tự có Gold để mua vé qua đúng luồng ví; khoản cấp ghi lý do riêng trong sổ cái để Admin phân biệt.
            if (await wallet.GetBalanceAsync(playerId, ct) < pricing.UnitPriceGold)
                await wallet.CreditAsync(playerId, pricing.UnitPriceGold * 5, LedgerReasons.BotGrant, "bot", ct);
        }
        await deps.Seats.BuyTicketAsync(playerId, Guid.NewGuid(), 1, pricing.PriceVersion, ct);
    }

    /// <summary>Sau lỗi giữa chừng: nếu còn ngồi ghế thì đứng dậy để vòng sau bắt đầu sạch.</summary>
    private async Task EnsureStandingAsync()
    {
        try
        {
            await deps.Seats.EndAsync(playerId, SeatEndReasons.LeftSeat, CancellationToken.None);
            await LeaveSeatSpotAsync(CancellationToken.None);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            deps.Logger.LogDebug(exception, "Bot {Bot} could not clean up its seat", displayName);
        }
    }

    private Task DelayAsync(int ms, CancellationToken ct) =>
        Task.Delay(TimeSpan.FromMilliseconds(Math.Max(1, ms / Math.Max(1.0, deps.TimeScale))), ct);
}
