using System.Text.Json;
using FishingOnline.Api.Modules.Common;

namespace FishingOnline.Api.Modules.Lake;

public sealed record MapPoint(double X, double Y);

public sealed record MoveRules(double MaxSpeedPxPerSec, double FeetHalfWidth, double FeetHeight);

/// <summary><c>RoamRadius</c> còn trong schema map nhưng từ SPEC 0.9 người đang ngồi không được đi lại.</summary>
public sealed record MapSeat(string SeatId, int Number, double X, double Y, string Facing, double RoamRadius);

public sealed record LakeMapData(
    string MapId,
    string MapVersion,
    string? Note,
    int TileSize,
    int WidthTiles,
    int HeightTiles,
    IReadOnlyList<string> WalkableRows,
    MapPoint Spawn,
    IReadOnlyList<MapPoint> LakeArea,
    MoveRules MoveRules,
    IReadOnlyList<MapSeat> Seats);

/// <summary>Bản đồ hồ để Server tự kiểm tra vị trí, không tin Client.</summary>
public sealed class LakeMap
{
    private readonly Dictionary<string, MapSeat> seats;

    public LakeMap(LakeMapData data)
    {
        if (data.WalkableRows.Count != data.HeightTiles || data.WalkableRows.Any(row => row.Length != data.WidthTiles))
            throw new ArgumentException("walkableRows does not match the map size.", nameof(data));
        Data = data;
        seats = data.Seats.ToDictionary(seat => seat.SeatId);
    }

    public LakeMapData Data { get; }

    public static LakeMap Parse(string json) =>
        new(JsonSerializer.Deserialize<LakeMapData>(json, GameJson.Options) ?? throw new JsonException("Map must be a JSON object."));

    public MapSeat? Seat(string seatId) => seats.GetValueOrDefault(seatId);

    /// <summary>Hình chữ nhật chân, đáy tại (x, y), không được chạm ô <c>0</c> hay ra ngoài map.</summary>
    public bool CanStand(double x, double y)
    {
        var rules = Data.MoveRules;
        var firstColumn = TileOf(x - rules.FeetHalfWidth);
        var lastColumn = LastTileOf(x + rules.FeetHalfWidth);
        var firstRow = TileOf(y - rules.FeetHeight);
        var lastRow = LastTileOf(y);
        if (firstColumn < 0 || firstRow < 0 || lastColumn >= Data.WidthTiles || lastRow >= Data.HeightTiles) return false;

        for (var row = firstRow; row <= lastRow; row++)
            for (var column = firstColumn; column <= lastColumn; column++)
                if (Data.WalkableRows[row][column] == '0')
                    return false;
        return true;
    }

    /// <summary>Thuật toán tia cắt trên đa giác <c>lakeArea</c>.</summary>
    public bool InLakeArea(double x, double y)
    {
        var points = Data.LakeArea;
        var inside = false;
        for (int current = 0, previous = points.Count - 1; current < points.Count; previous = current++)
        {
            var a = points[current];
            var b = points[previous];
            if (a.Y > y != b.Y > y && x < (b.X - a.X) * (y - a.Y) / (b.Y - a.Y) + a.X)
                inside = !inside;
        }
        return inside;
    }

    private int TileOf(double pixel) => (int)Math.Floor(pixel / Data.TileSize);

    /// <summary>Cạnh phải/dưới nằm đúng ranh giới ô thì chưa chạm ô kế tiếp; giống walkable.ts của Client.</summary>
    private int LastTileOf(double pixel) => (int)Math.Ceiling(pixel / Data.TileSize) - 1;
}
