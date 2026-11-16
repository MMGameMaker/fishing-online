using System.Reflection;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FishingOnline.Api.Modules.Bots;

/// <summary>
/// Cài đặt bot, một dòng duy nhất (Id = 1). Admin sửa qua /api/v1/admin/bots/settings; đổi có hiệu lực ở lần kiểm tra kế tiếp,
/// không cần publish phiên bản config gameplay.
/// </summary>
public sealed class BotSettingsRow
{
    public const int SingletonId = 1;

    public int Id { get; set; } = SingletonId;

    /// <summary>Tắt thì Server không thêm bot nữa và cho bot đang có rời hồ ở lần kiểm tra kế tiếp.</summary>
    public bool Enabled { get; set; } = true;

    /// <summary>Tổng số người trong hồ (cả bot) dưới mức này thì thêm 1 bot, trên mức này thì cho 1 bot rời đi.</summary>
    public int MinTotalPlayers { get; set; } = 10;

    public int CheckIntervalSeconds { get; set; } = 180;

    /// <summary>Số bot tối đa cùng lúc trong hồ.</summary>
    public int MaxBots { get; set; } = 10;

    /// <summary>Tỉ lệ bot báo thắng minigame (0–100), để bot không câu trúng mọi lần.</summary>
    public int SuccessRatePct { get; set; } = 60;

    public string? UpdatedBy { get; set; }

    public DateTimeOffset? UpdatedAt { get; set; }
}

public sealed class BotSettingsRowConfig : IEntityTypeConfiguration<BotSettingsRow>
{
    public void Configure(EntityTypeBuilder<BotSettingsRow> entity)
    {
        entity.ToTable("bot_settings");
        entity.HasKey(row => row.Id);
        entity.Property(row => row.Id).ValueGeneratedNever();
        entity.Property(row => row.UpdatedBy).HasMaxLength(254);
    }
}

public sealed record BotSettingsView(
    bool Enabled, int MinTotalPlayers, int CheckIntervalSeconds, int MaxBots, int SuccessRatePct, string? UpdatedBy, DateTimeOffset? UpdatedAt);

public sealed record BotSettingsRequest(bool Enabled, int MinTotalPlayers, int CheckIntervalSeconds, int MaxBots, int SuccessRatePct);

/// <summary>Chỉ Admin thấy: bot có trong hồ lúc này không và đã câu bao nhiêu con.</summary>
public sealed record AdminBotView(Guid PlayerId, string DisplayName, int Level, bool InLake, int TotalCatches, DateTimeOffset CreatedAt);

/// <summary>Kết quả một lần kiểm tra của BotManager, để test và log.</summary>
public sealed record BotCheckResult(string Action, int TotalPlayers, int Bots, int NextCheckSeconds);

public static class BotChecks
{
    public const string Spawned = "spawned";
    public const string Removed = "removed";
    public const string None = "none";
    public const string Disabled = "disabled";
}

/// <summary>
/// Bản sao tối thiểu của map pier phía Client (client-v0/src/online/scenes/pier/fishingPierMap.json, mục "lake") để bot đi đúng chỗ
/// đứng được và tới đúng ghế. Server thật không kiểm tra đi lại của người chơi; map này chỉ dùng cho bot. Phải cập nhật khi map đổi.
/// </summary>
public sealed class BotMap
{
    private const string ResourceName = "pier-map.json";

    private readonly string[] rows;

    private BotMap(MapDocument document)
    {
        TileSize = document.TileSize;
        rows = document.WalkableRows;
        Spawn = document.Spawn;
        FeetHalfWidth = document.MoveRules.FeetHalfWidth;
        FeetHeight = document.MoveRules.FeetHeight;
        MaxSpeedPxPerSec = document.MoveRules.MaxSpeedPxPerSec;
        Width = document.WidthTiles * TileSize;
        Height = document.HeightTiles * TileSize;
        Seats = document.Seats.ToDictionary(seat => seat.SeatId);
    }

    public int TileSize { get; }

    public double Width { get; }

    public double Height { get; }

    public MapPoint Spawn { get; }

    public double FeetHalfWidth { get; }

    public double FeetHeight { get; }

    public double MaxSpeedPxPerSec { get; }

    public IReadOnlyDictionary<string, MapSeat> Seats { get; }

    public static BotMap Load()
    {
        using var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(ResourceName)
            ?? throw new InvalidOperationException($"Embedded resource {ResourceName} is missing.");
        var document = JsonSerializer.Deserialize<MapDocument>(stream, new JsonSerializerOptions(JsonSerializerDefaults.Web))
            ?? throw new InvalidOperationException("Bot map is empty.");
        return new BotMap(document);
    }

    /// <summary>Hình chữ nhật chân quanh (x, y) phải nằm trọn trong ô đi được; cùng luật với walkable.ts của Client.</summary>
    public bool CanStand(double x, double y)
    {
        var left = (int)Math.Floor((x - FeetHalfWidth) / TileSize);
        var right = (int)Math.Ceiling((x + FeetHalfWidth) / TileSize) - 1;
        var top = (int)Math.Floor((y - FeetHeight) / TileSize);
        var bottom = (int)Math.Ceiling(y / TileSize) - 1;
        for (var row = top; row <= bottom; row++)
            for (var col = left; col <= right; col++)
                if (!IsWalkable(col, row)) return false;
        return true;
    }

    /// <summary>Đi từng trục để trượt dọc vật cản thay vì đứng khựng.</summary>
    public (double X, double Y) StepMove(double x, double y, double dx, double dy)
    {
        var nextX = dx != 0 && CanStand(x + dx, y) ? x + dx : x;
        var nextY = dy != 0 && CanStand(nextX, y + dy) ? y + dy : y;
        return (nextX, nextY);
    }

    /// <summary>Điểm đứng được gần (x, y) nhất trong bán kính cho trước; null nếu không có.</summary>
    public MapPoint? NearestStandable(double x, double y, int maxRadius = 64, int step = 2)
    {
        if (CanStand(x, y)) return new MapPoint(x, y);
        for (var radius = step; radius <= maxRadius; radius += step)
        {
            MapPoint? best = null;
            var bestDistance = double.MaxValue;
            for (var dy = -radius; dy <= radius; dy += step)
            {
                for (var dx = -radius; dx <= radius; dx += step)
                {
                    if (Math.Max(Math.Abs(dx), Math.Abs(dy)) != radius) continue;
                    var distance = Math.Sqrt(dx * dx + dy * dy);
                    if (distance >= bestDistance || !CanStand(x + dx, y + dy)) continue;
                    bestDistance = distance;
                    best = new MapPoint(x + dx, y + dy);
                }
            }
            if (best is not null) return best;
        }
        return null;
    }

    /// <summary>Điểm đứng được ngẫu nhiên trong bán kính quanh (cx, cy); thử vài lần rồi lấy điểm bất kỳ trên map.</summary>
    public MapPoint RandomStandable(Random random, double cx, double cy, double radius)
    {
        for (var attempt = 0; attempt < 30; attempt++)
        {
            var x = cx + (random.NextDouble() * 2 - 1) * radius;
            var y = cy + (random.NextDouble() * 2 - 1) * radius;
            if (x > 0 && y > 0 && x < Width && y < Height && CanStand(x, y)) return new MapPoint(x, y);
        }
        for (var attempt = 0; attempt < 200; attempt++)
        {
            var x = random.NextDouble() * Width;
            var y = random.NextDouble() * Height;
            if (CanStand(x, y)) return new MapPoint(x, y);
        }
        return Spawn;
    }

    private bool IsWalkable(int col, int row) =>
        row >= 0 && row < rows.Length && col >= 0 && col < rows[row].Length && rows[row][col] == '1';

    public sealed record MapPoint(double X, double Y);

    public sealed record MapSeat(string SeatId, double X, double Y, string Facing, double RoamRadius);

    private sealed record MoveRulesDocument(double MaxSpeedPxPerSec, double FeetHalfWidth, double FeetHeight);

    private sealed record MapDocument(
        string MapId, string MapVersion, int TileSize, int WidthTiles, int HeightTiles, string[] WalkableRows,
        MapPoint Spawn, MoveRulesDocument MoveRules, MapSeat[] Seats);
}
