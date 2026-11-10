using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Modules.Config;
using FishingOnline.Api.Modules.Fishing;
using FishingOnline.Api.Persistence;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace FishingOnline.Api.Modules.Lake;

public sealed record LakeSnapshot(
    string MapId, string MapVersion, string ConfigVersion, DateTimeOffset ServerTime,
    IReadOnlyList<PlayerView> Players, IReadOnlyList<SeatView> Seats, MyTicketView? MyTicket, MySeatView? MySeat, AttemptView? MyAttempt);

/// <summary>Vào phòng, di chuyển, mất kết nối. Mọi thay đổi presence đi qua hàng đợi của phòng.</summary>
public sealed class LakeCommands(
    IServiceScopeFactory scopes,
    LakeMap map,
    LakeRoom room,
    SeatSessions seats,
    IConfigProvider configs,
    IFishingState fishing,
    FishingService attempts,
    IConfiguration configuration,
    TimeProvider time)
{
    private const int MaxMovesPerSecond = 20;
    private const double SpeedTolerance = 1.25;
    private const double DistanceAllowancePx = 8;
    private const double MaxMoveWindowSeconds = 1;
    private static readonly HashSet<string> Directions = ["up", "down", "left", "right"];

    private int MaxPlayers => configuration.GetValue("Lake:MaxPlayers", 50);

    public async Task<LakeSnapshot> JoinAsync(Guid playerId, string connectionId, Action abort, CancellationToken ct)
    {
        PlayerProfile profile;
        await using (var scope = scopes.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
            profile = await db.Players.AsNoTracking().SingleAsync(player => player.Id == playerId, ct);
        }
        var session = await seats.GetMineAsync(playerId, ct);
        if (session is not null) await seats.ClearDisconnectedAsync(playerId, ct);
        var ticket = await seats.GetTicketAsync(playerId, ct);

        await room.Queue.RunAsync(async () =>
        {
            var now = time.GetUtcNow();
            if (room.Find(playerId) is { } existing)
            {
                if (existing.ConnectionId != connectionId) existing.Abort();
                existing.ConnectionId = connectionId;
                existing.Abort = abort;
                existing.Online = true;
                existing.DisplayName = profile.DisplayName;
                existing.SkinId = profile.SelectedSkinId;
                existing.RodId = profile.EquippedRodId;
                existing.SeatId = session?.SeatId;
                existing.LastMoveAt = now;
                existing.LastSeq = 0;
            }
            else
            {
                if (room.Count >= MaxPlayers) throw new GameException("STATE_CONFLICT");
                var position = session is not null ? map.Seat(session.SeatId)! : null;
                var player = new RoomPlayer
                {
                    PlayerId = playerId,
                    DisplayName = profile.DisplayName,
                    SkinId = profile.SelectedSkinId,
                    RodId = profile.EquippedRodId,
                    ConnectionId = connectionId,
                    Abort = abort,
                    X = position?.X ?? map.Data.Spawn.X,
                    Y = position?.Y ?? map.Data.Spawn.Y,
                    Dir = position?.Facing ?? "down",
                    SeatId = session?.SeatId,
                    LastMoveAt = now,
                };
                room.Add(player);
                await room.BroadcastAsync("PlayerJoined", room.View(player));
            }
            await room.Groups.AddToGroupAsync(connectionId, room.Group, CancellationToken.None);
            return true;
        });

        var seatViews = await seats.SeatViewsAsync(ct);
        var myAttempt = await attempts.GetActiveViewAsync(playerId, ct);
        var players = await room.Queue.RunAsync(() => Task.FromResult(room.Views()));
        return new LakeSnapshot(
            map.Data.MapId, map.Data.MapVersion, configs.Current.ConfigVersion, time.GetUtcNow(), players, seatViews, ticket, session, myAttempt);
    }

    public Task MoveAsync(Guid playerId, MoveCommand command)
    {
        if (!double.IsFinite(command.X) || !double.IsFinite(command.Y) || !Directions.Contains(command.Dir))
            throw new GameException(ErrorCatalog.ValidationFailed);

        return room.Queue.RunAsync(async () =>
        {
            var player = room.Find(playerId) ?? throw new GameException("STATE_CONFLICT");
            var now = time.GetUtcNow();
            if (!TryCountMove(player, now)) throw new GameException("RATE_LIMITED");
            if (command.Seq <= player.LastSeq) return true;
            player.LastSeq = command.Seq;

            if (!IsAllowed(player, command, now))
            {
                await room.Client(player.ConnectionId).SendAsync("PositionCorrected", new PositionCorrectedView(player.X, player.Y, command.Seq));
                return true;
            }

            player.X = command.X;
            player.Y = command.Y;
            player.Dir = command.Dir;
            player.LastMoveAt = now;
            await room.Others(player.ConnectionId).SendAsync("PlayerMoved", new PlayerMovedView(playerId, command.X, command.Y, command.Dir, command.Seq));
            return true;
        });
    }

    public async Task OnDisconnectedAsync(Guid playerId, string connectionId)
    {
        var isCurrent = await room.Queue.RunAsync(() => Task.FromResult(room.Find(playerId)?.ConnectionId == connectionId));
        if (!isCurrent) return;

        var seated = await seats.MarkDisconnectedAsync(playerId, CancellationToken.None);
        await room.Queue.RunAsync(async () =>
        {
            if (room.Find(playerId) is not { } player || player.ConnectionId != connectionId) return true;
            if (seated)
            {
                player.Online = false;
            }
            else
            {
                room.Remove(playerId);
                await room.BroadcastAsync("PlayerLeft", new PlayerLeftView(playerId));
            }
            return true;
        });
    }

    private bool IsAllowed(RoomPlayer player, MoveCommand command, DateTimeOffset now)
    {
        // Đang ngồi thì không đi lại; muốn đi phải LeaveSeat trước (SPEC 2.2).
        if (player.SeatId is not null || fishing.IsBusy(player.PlayerId)) return false;

        var seconds = Math.Min(MaxMoveWindowSeconds, Math.Max(0, (now - player.LastMoveAt).TotalSeconds));
        var limit = map.Data.MoveRules.MaxSpeedPxPerSec * seconds * SpeedTolerance + DistanceAllowancePx;
        if (Distance(player.X, player.Y, command.X, command.Y) > limit) return false;
        return map.CanStand(command.X, command.Y);
    }

    private static bool TryCountMove(RoomPlayer player, DateTimeOffset now)
    {
        while (player.RecentMoves.TryPeek(out var oldest) && now - oldest >= TimeSpan.FromSeconds(1))
            player.RecentMoves.Dequeue();
        if (player.RecentMoves.Count >= MaxMovesPerSecond) return false;
        player.RecentMoves.Enqueue(now);
        return true;
    }

    private static double Distance(double x1, double y1, double x2, double y2) =>
        Math.Sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
}

/// <summary>Dùng filter vì không được thêm constructor vào GameHub.</summary>
public sealed class LakeConnectionFilter : IHubFilter
{
    public async Task OnDisconnectedAsync(HubLifetimeContext context, Exception? exception, Func<HubLifetimeContext, Exception?, Task> next)
    {
        if (Guid.TryParse(context.Context.User?.FindFirst(PlayerClaims.PlayerId)?.Value, out var playerId)
            && context.ServiceProvider.GetService<LakeCommands>() is { } commands)
            await commands.OnDisconnectedAsync(playerId, context.Context.ConnectionId);
        await next(context, exception);
    }
}

public sealed partial class LakeBackground(SeatSessions seats, IConfiguration configuration, TimeProvider time, ILogger<LakeBackground> logger)
    : BackgroundService
{
    private static readonly TimeSpan HeartbeatEvery = TimeSpan.FromSeconds(5);

    public override async Task StartAsync(CancellationToken cancellationToken)
    {
        await seats.RecoverAsync(cancellationToken);
        await base.StartAsync(cancellationToken);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = configuration.GetValue("Lake:SweepIntervalMs", 250);
        if (interval <= 0) return;

        using var timer = new PeriodicTimer(TimeSpan.FromMilliseconds(interval));
        var lastHeartbeat = time.GetUtcNow();
        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    await seats.SweepOnceAsync(stoppingToken);
                    if (time.GetUtcNow() - lastHeartbeat >= HeartbeatEvery)
                    {
                        await seats.WriteHeartbeatAsync(stoppingToken);
                        lastHeartbeat = time.GetUtcNow();
                    }
                }
                catch (Exception exception) when (exception is not OperationCanceledException)
                {
                    logger.LogError(exception, "Seat sweep failed");
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Host đang dừng.
        }
    }
}

public static class LakeModule
{
    public static IServiceCollection AddLake(this IServiceCollection services)
    {
        services.AddSingleton(provider =>
        {
            var configuration = provider.GetRequiredService<IConfiguration>();
            var environment = provider.GetRequiredService<IHostEnvironment>();
            var path = Path.GetFullPath(configuration["Lake:MapPath"]
                ?? throw new InvalidOperationException("Lake:MapPath is not configured."), environment.ContentRootPath);
            return LakeMap.Parse(File.ReadAllText(path));
        });
        services.AddSingleton<LakeRoom>();
        services.AddSingleton<SeatSessions>();
        services.AddSingleton<ISeatSessions>(provider => provider.GetRequiredService<SeatSessions>());
        services.AddSingleton<LakeCommands>();
        services.Configure<HubOptions>(options => options.AddFilter<LakeConnectionFilter>());
        services.AddHostedService<LakeBackground>();
        return services;
    }
}
