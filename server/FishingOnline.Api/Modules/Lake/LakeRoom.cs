using System.Threading.Channels;
using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Modules.Fishing;
using Microsoft.AspNetCore.SignalR;

namespace FishingOnline.Api.Modules.Lake;

/// <summary>Hàng đợi tuần tự cho các lệnh đổi trạng thái phòng trong RAM.</summary>
public sealed class SerialQueue : IDisposable
{
    private readonly Channel<Func<Task>> channel = Channel.CreateUnbounded<Func<Task>>(new UnboundedChannelOptions { SingleReader = true });

    public SerialQueue() => _ = Task.Run(async () =>
    {
        await foreach (var job in channel.Reader.ReadAllAsync())
            await job();
    });

    public Task<T> RunAsync<T>(Func<Task<T>> action)
    {
        var completion = new TaskCompletionSource<T>(TaskCreationOptions.RunContinuationsAsynchronously);
        channel.Writer.TryWrite(async () =>
        {
            try
            {
                completion.SetResult(await action());
            }
            catch (Exception exception)
            {
                completion.SetException(exception);
            }
        });
        return completion.Task;
    }

    public void Dispose() => channel.Writer.TryComplete();
}

public sealed class RoomPlayer
{
    public required Guid PlayerId { get; init; }
    public required string DisplayName { get; set; }
    public required string SkinId { get; set; }
    public required string RodId { get; set; }
    public required string ConnectionId { get; set; }
    public required Action Abort { get; set; }
    public double X { get; set; }
    public double Y { get; set; }
    public string Dir { get; set; } = "down";
    public long LastSeq { get; set; }
    public DateTimeOffset LastMoveAt { get; set; }
    public string? SeatId { get; set; }
    public bool Online { get; set; } = true;
    public Queue<DateTimeOffset> RecentMoves { get; } = new();

    /// <summary>Bot do Server điều khiển (BOT-02): chỉ dùng nội bộ để đếm user thật và nhường chỗ, không có trong PlayerView.</summary>
    public bool IsBot { get; init; }
}

/// <summary>Presence trong RAM và các event gửi cho phòng; ghế/phiên có nguồn chân lý ở DB.</summary>
public sealed class LakeRoom(LakeLayout layout, IHubContext<GameHub> hub, IFishingState fishing) : IDisposable
{
    private readonly Dictionary<Guid, RoomPlayer> players = [];

    public SerialQueue Queue { get; } = new();

    public string Group => layout.MapId;

    public IClientProxy Everyone => hub.Clients.Group(Group);

    public IGroupManager Groups => hub.Groups;

    /// <summary>Chỉ gọi trong <see cref="Queue"/>.</summary>
    public RoomPlayer? Find(Guid playerId) => players.GetValueOrDefault(playerId);

    public int Count => players.Count;

    /// <summary>Số user thật (không tính bot). Chỉ gọi trong <see cref="Queue"/>.</summary>
    public int HumanCount => players.Values.Count(player => !player.IsBot);

    /// <summary>Chỉ gọi trong <see cref="Queue"/>.</summary>
    public IReadOnlyList<RoomPlayer> Players => players.Values.ToArray();

    /// <summary>
    /// Hồ đầy khi user thật vào (BOT-02: user thật luôn vào được, tổng không vượt Lake:MaxPlayers): phòng đã bỏ một bot ra
    /// (ưu tiên bot không ngồi ghế) và báo id để BotManager dừng bot đó. Gọi ngoài <see cref="Queue"/>.
    /// </summary>
    public event Func<Guid, Task>? BotEvicted;

    /// <summary>Bỏ một bot khỏi phòng để nhường chỗ; null nếu không còn bot. Chỉ gọi trong <see cref="Queue"/>.</summary>
    public Guid? EvictOneBot()
    {
        var bot = players.Values.Where(player => player.IsBot).OrderBy(player => player.SeatId is null ? 0 : 1).FirstOrDefault();
        if (bot is null) return null;
        players.Remove(bot.PlayerId);
        return bot.PlayerId;
    }

    public async Task RaiseBotEvictedAsync(Guid botId)
    {
        if (BotEvicted is not { } handlers) return;
        foreach (var handler in handlers.GetInvocationList().Cast<Func<Guid, Task>>())
        {
            try
            {
                await handler(botId);
            }
            catch (Exception)
            {
                // Bot không dừng sạch không được chặn người chơi vào hồ.
            }
        }
    }

    public void Add(RoomPlayer player) => players[player.PlayerId] = player;

    public void Remove(Guid playerId) => players.Remove(playerId);

    public IReadOnlyList<PlayerView> Views() => players.Values.Select(View).ToArray();

    public PlayerView View(RoomPlayer player) => new(
        player.PlayerId, player.DisplayName, player.SkinId, player.RodId, player.X, player.Y, player.Dir, player.SeatId,
        fishing.IsBusy(player.PlayerId));

    public Task<string?> ConnectionOfAsync(Guid playerId) =>
        Queue.RunAsync(() => Task.FromResult(Find(playerId) is { Online: true } player ? player.ConnectionId : null));

    public async Task SendToPlayerAsync(Guid playerId, string method, object payload)
    {
        if (await ConnectionOfAsync(playerId) is { } connectionId)
            await hub.Clients.Client(connectionId).SendAsync(method, payload);
    }

    /// <summary>SPEC không có event riêng cho cờ fishing nên phát lại PlayerView qua PlayerJoined; Client ghi đè theo playerId.</summary>
    public Task PublishPlayerAsync(Guid playerId) => Queue.RunAsync(async () =>
    {
        if (Find(playerId) is { } player)
            await hub.Clients.GroupExcept(Group, player.ConnectionId).SendAsync("PlayerJoined", View(player));
        return true;
    });

    public Task BroadcastAsync(string method, object payload) => Everyone.SendAsync(method, payload);

    public IClientProxy Others(string connectionId) => hub.Clients.GroupExcept(Group, connectionId);

    public IClientProxy Client(string connectionId) => hub.Clients.Client(connectionId);

    public void Dispose() => Queue.Dispose();
}
