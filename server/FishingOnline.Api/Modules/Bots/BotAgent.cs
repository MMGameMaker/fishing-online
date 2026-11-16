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
    TimeProvider Time,
    double TimeScale,
    Func<CancellationToken, Task<int>> SuccessPct,
    ILogger Logger);

/// <summary>
/// Một bot trong hồ: có hàng Players thật (IsBot), có mặt trong phòng, đi dạo, mua vé, ngồi ghế và câu qua đúng
/// <see cref="FishingService"/> như người chơi thật, nên cá của bot đi qua cùng luật và vào bảng xếp hạng.
/// Không có gì ở đây (hay trong gói gửi Client) cho biết đó là bot; chỉ Admin thấy cờ IsBot trong DB.
/// </summary>
public sealed class BotAgent(Guid playerId, string displayName, string skinId, string rodId, BotDeps deps)
{
    // Cùng nhịp người chơi thật gửi Move (10 lần/giây): Client nội suy 100 ms mỗi bước nên bot đi mượt, không giật.
    private const int StepMs = 100;
    private const int MinSecondsLeftOnTicket = 180;

    private readonly CancellationTokenSource cts = new();
    private readonly Random random = new();
    private Task loop = Task.CompletedTask;
    private long sequence;
    private double x;
    private double y;
    private string direction = "down";

    public Guid PlayerId => playerId;

    public string DisplayName => displayName;

    /// <summary>Vào phòng ở một chỗ đứng được, rồi bắt đầu vòng đời của bot.</summary>
    public async Task StartAsync()
    {
        // Dọn ghế/lần câu còn sót từ lần chạy trước (bot không có kết nối nên Server tự kết thúc sau grace).
        await deps.Seats.EndAsync(playerId, SeatEndReasons.LeftLake, CancellationToken.None);
        var spawn = deps.Map.RandomStandable(random, deps.Map.Spawn.X, deps.Map.Spawn.Y, 120);
        x = spawn.X;
        y = spawn.Y;
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
        loop = Task.Run(() => RunAsync(cts.Token));
    }

    /// <summary>Dừng vòng đời, đứng dậy (hủy lần câu đang mở) và rời phòng như người chơi thoát.</summary>
    public async Task StopAsync()
    {
        await cts.CancelAsync();
        try
        {
            await loop;
        }
        catch (OperationCanceledException)
        {
            // Dừng theo yêu cầu.
        }
        await deps.Seats.EndAsync(playerId, SeatEndReasons.LeftSeat, CancellationToken.None);
        await deps.Room.Queue.RunAsync(async () =>
        {
            if (deps.Room.Find(playerId) is null) return true;
            deps.Room.Remove(playerId);
            await deps.Room.BroadcastAsync("PlayerLeft", new PlayerLeftView(playerId));
            return true;
        });
        cts.Dispose();
    }

    private async Task RunAsync(CancellationToken ct)
    {
        try
        {
            while (!ct.IsCancellationRequested)
            {
                try
                {
                    await WanderAsync(random.Next(6000, 20000), ct);
                    if (random.NextDouble() < 0.7) await FishSessionAsync(ct);
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

    private async Task WanderAsync(int totalMs, CancellationToken ct)
    {
        var spentMs = 0;
        while (spentMs < totalMs)
        {
            var target = deps.Map.RandomStandable(random, x, y, 260);
            spentMs += await MoveToAsync(target.X, target.Y, ct);
            var pause = random.Next(800, 3500);
            await DelayAsync(pause, ct);
            spentMs += pause;
        }
    }

    /// <summary>Đi thẳng tới (tx, ty), trượt dọc vật cản, bỏ cuộc nếu kẹt; trả về số ms đã đi.</summary>
    private async Task<int> MoveToAsync(double tx, double ty, CancellationToken ct)
    {
        var speed = deps.Map.MaxSpeedPxPerSec * (0.5 + 0.2 * random.NextDouble());
        var elapsed = 0;
        var stuck = 0;
        while (elapsed < 40000)
        {
            ct.ThrowIfCancellationRequested();
            var dx = tx - x;
            var dy = ty - y;
            var distance = Math.Sqrt(dx * dx + dy * dy);
            if (distance < 3) break;
            var step = Math.Min(distance, speed * StepMs / 1000.0);
            var (nextX, nextY) = deps.Map.StepMove(x, y, dx / distance * step, dy / distance * step);
            if (nextX == x && nextY == y)
            {
                if (++stuck > 6) break;
            }
            else
            {
                stuck = 0;
                x = nextX;
                y = nextY;
                direction = Math.Abs(dx) > Math.Abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
                await PublishPositionAsync();
            }
            await DelayAsync(StepMs, ct);
            elapsed += StepMs;
        }
        return elapsed;
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
        var views = await deps.Seats.SeatViewsAsync(ct);
        var free = views.Where(view => view.State == "available").ToArray();
        if (free.Length == 0) return;
        var seatId = free[random.Next(free.Length)].SeatId;

        var seatSpot = deps.Map.Seats.GetValueOrDefault(seatId);
        if (seatSpot is not null)
        {
            var stand = deps.Map.NearestStandable(seatSpot.X, seatSpot.Y) ?? deps.Map.Spawn;
            await MoveToAsync(stand.X, stand.Y, ct);
        }
        await deps.Seats.SitDownAsync(playerId, seatId, ct);
        if (seatSpot is not null)
        {
            x = seatSpot.X;
            y = seatSpot.Y;
            direction = seatSpot.Facing;
            await PublishPositionAsync();
        }

        var casts = random.Next(2, 6);
        for (var i = 0; i < casts && !ct.IsCancellationRequested; i++)
        {
            if (!await CastOnceAsync(ct)) break;
            await DelayAsync(random.Next(1000, 3000), ct);
        }

        // Còn lần câu dở (vd. bị hủy giữa chừng) thì EndAsync hủy hộ; không thì rời ghế bình thường.
        if (!await deps.Seats.EndAsync(playerId, SeatEndReasons.LeftSeat, CancellationToken.None)) return;
        // Đứng dậy: đi bộ ra chỗ đứng gần ghế (không dịch chuyển).
        if (seatSpot is not null && deps.Map.NearestStandable(seatSpot.X, seatSpot.Y, 48) is { } outside)
            await MoveToAsync(outside.X, outside.Y, ct);
    }

    /// <summary>Một lượt: quăng, chờ cá cắn, phản ứng rồi kéo, báo kết quả. False nếu lượt không thể tiếp tục.</summary>
    private async Task<bool> CastOnceAsync(CancellationToken ct)
    {
        await deps.Fishing.CastAsync(playerId, Guid.NewGuid(), ct);
        var attempt = await WaitForPhaseAsync("bite", 60000, ct);
        if (attempt is null) return false;

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
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            deps.Logger.LogDebug(exception, "Bot {Bot} could not clean up its seat", displayName);
        }
    }

    private Task DelayAsync(int ms, CancellationToken ct) =>
        Task.Delay(TimeSpan.FromMilliseconds(Math.Max(1, ms / Math.Max(1.0, deps.TimeScale))), ct);
}
