namespace FishingOnline.Api.Modules.Lake;

public sealed record LakeSeatInfo(string SeatId, int Number);

/// <summary>
/// Hồ chỉ có định danh và danh sách ghế. Vị trí do Client báo, Server không giữ map nên không kiểm tra đi lại hay khoảng cách tới ghế.
/// </summary>
public sealed class LakeLayout
{
    private readonly Dictionary<string, LakeSeatInfo> seats;

    public LakeLayout(string mapId, string mapVersion, int seatCount)
    {
        if (string.IsNullOrWhiteSpace(mapId) || seatCount < 1) throw new ArgumentException("Lake layout is invalid.");
        MapId = mapId;
        MapVersion = mapVersion;
        Seats = Enumerable.Range(1, seatCount).Select(number => new LakeSeatInfo(SeatIdOf(number), number)).ToArray();
        seats = Seats.ToDictionary(seat => seat.SeatId);
    }

    public string MapId { get; }

    public string MapVersion { get; }

    public IReadOnlyList<LakeSeatInfo> Seats { get; }

    public static string SeatIdOf(int number) => $"seat-{number:00}";

    public LakeSeatInfo? Seat(string seatId) => seats.GetValueOrDefault(seatId);
}
