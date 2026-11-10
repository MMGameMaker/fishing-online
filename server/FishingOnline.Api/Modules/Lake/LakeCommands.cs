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
    LakeLayout layout,
    LakeRoom room,
    SeatSessions seats,
    IConfigProvider configs,
    FishingService attempts,
    IConfiguration configuration,
    TimeProvider time)
{
    private const int MaxMovesPerSecond = 20;
    private static readonly HashSet<string> Directions = ["up", "down", "left", "right"];

    private int MaxPlayers => configuration.GetValue("Lake:MaxPlayers", 50);

    public async Task<LakeSnapshot> JoinAsync(
        Guid playerId, string connectionId, JoinLakeCommand command, Action abort, CancellationToken ct)
    {
        if (!IsValidPosition(command.X, command.Y, command.Dir)) throw new GameException(ErrorCatalog.ValidationFailed);

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
                if (command.X is { } x && command.Y is { } y)
                {
                    existing.X = x;
                    existing.Y = y;
                    existing.Dir = command.Dir ?? existing.Dir;
                }
            }
            else
            {
                if (room.Count >= MaxPlayers) throw new GameException("STATE_CONFLICT");
                var player = new RoomPlayer
                {
                    PlayerId = playerId,
                    DisplayName = profile.DisplayName,
                    SkinId = profile.SelectedSkinId,
                    RodId = profile.EquippedRodId,
                    ConnectionId = connectionId,
                    Abort = abort,
                    X = command.X ?? 0,
                    Y = command.Y ?? 0,
                    Dir = command.Dir ?? "down",
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
            layout.MapId, layout.MapVersion, configs.Current.ConfigVersion, time.GetUtcNow(), players, seatViews, ticket, session, myAttempt);
    }

    public Task MoveAsync(Guid playerId, MoveCommand command)
    {
        if (command.Dir is null || !IsValidPosition(command.X, command.Y, command.Dir))
            throw new GameException(ErrorCatalog.ValidationFailed);

        return room.Queue.RunAsync(async () =>
        {
            var player = room.Find(playerId) ?? throw new GameException("STATE_CONFLICT");
            var now = time.GetUtcNow();
            if (!TryCountMove(player, now)) throw new GameException("RATE_LIMITED");
            if (command.Seq <= player.LastSeq) return true;
            player.LastSeq = command.Seq;

            // Vị trí do Client báo; Server chỉ ghi lại và chuyển cho người khác.
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

    /// <summary>Toạ độ phải là số hữu hạn và đi cặp với nhau; hướng nếu có phải hợp lệ.</summary>
    private static bool IsValidPosition(double? x, double? y, string? dir) =>
        (x is null) == (y is null)
        && (x is null || (double.IsFinite(x.Value) && double.IsFinite(y!.Value)))
        && (dir is null || Directions.Contains(dir));

    private static bool TryCountMove(RoomPlayer player, DateTimeOffset now)
    {
        while (player.RecentMoves.TryPeek(out var oldest) && now - oldest >= TimeSpan.FromSeconds(1))
            player.RecentMoves.Dequeue();
        if (player.RecentMoves.Count >= MaxMovesPerSecond) return false;
        player.RecentMoves.Enqueue(now);
        return true;
    }
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
            var lake = provider.GetRequiredService<IConfiguration>().GetSection("Lake");
            return new LakeLayout(lake["MapId"] ?? "lake-01", lake["MapVersion"] ?? "1", lake.GetValue("SeatCount", 20));
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
