namespace FishingOnline.Api.Modules.Lake;

public sealed record LakeSeatInfo(string SeatId, int Number);

/// <summary>
/// Hồ chỉ có định danh và danh sách ghế. Vị trí do Client báo, Server không giữ map nên không kiểm tra đi lại hay khoảng cách tới ghế.
/// </summary>
public sealed class LakeLayout
{
    private readonly Dictionary<string, LakeSeatInfo> seats;

    private readonly HashSet<string> restSeats;

    /// <param name="restSeatCount">Số chỗ ngồi chơi (rest-01..), ghế quanh bàn không câu; 0 nếu map không có (yêu cầu 2026-11-18).</param>
    public LakeLayout(string mapId, string mapVersion, int seatCount, int restSeatCount = 0)
    {
        if (string.IsNullOrWhiteSpace(mapId) || seatCount < 1 || restSeatCount < 0) throw new ArgumentException("Lake layout is invalid.");
        MapId = mapId;
        MapVersion = mapVersion;
        Seats = Enumerable.Range(1, seatCount).Select(number => new LakeSeatInfo(SeatIdOf(number), number)).ToArray();
        seats = Seats.ToDictionary(seat => seat.SeatId);
        restSeats = Enumerable.Range(1, restSeatCount).Select(RestSeatIdOf).ToHashSet();
    }

    public string MapId { get; }

    public string MapVersion { get; }

    public IReadOnlyList<LakeSeatInfo> Seats { get; }

    public static string SeatIdOf(int number) => $"seat-{number:00}";

    public LakeSeatInfo? Seat(string seatId) => seats.GetValueOrDefault(seatId);

    public static string RestSeatIdOf(int number) => $"rest-{number:00}";

    public bool IsRestSeat(string restSeatId) => restSeats.Contains(restSeatId);
}
