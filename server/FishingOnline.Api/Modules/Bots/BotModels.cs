using System.Reflection;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FishingOnline.Api.Modules.Bots;

/// <summary>
/// Cài đặt bot, một dòng duy nhất (Id = 1). Admin sửa qua /api/v1/admin/bots/settings; đổi có hiệu lực ở lần kiểm tra kế tiếp,
/// không cần publish phiên bản config gameplay. BOT-02 (2026-11-18): bảng mốc theo số user thật thay MinTotalPlayers/MaxBots.
/// </summary>
public sealed class BotSettingsRow
{
    public const int SingletonId = 1;

    public int Id { get; set; } = SingletonId;

    /// <summary>Tắt thì Server không thêm bot nữa và cho bot đang có rời hồ ở lần kiểm tra kế tiếp.</summary>
    public bool Enabled { get; set; } = true;

    public int CheckIntervalSeconds { get; set; } = 180;

    /// <summary>Tỉ lệ bot báo thắng minigame (0–100), để bot không câu trúng mọi lần.</summary>
    public int SuccessRatePct { get; set; } = 60;

    /// <summary>Bảng mốc theo số user thật trong hồ (lưu jsonb).</summary>
    public List<BotTier> Tiers { get; set; } = [.. BotTiers.Default];

    public string? UpdatedBy { get; set; }

    public DateTimeOffset? UpdatedAt { get; set; }
}

public sealed class BotSettingsRowConfig : IEntityTypeConfiguration<BotSettingsRow>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public void Configure(EntityTypeBuilder<BotSettingsRow> entity)
    {
        entity.ToTable("bot_settings");
        entity.HasKey(row => row.Id);
        entity.Property(row => row.Id).ValueGeneratedNever();
        entity.Property(row => row.UpdatedBy).HasMaxLength(254);
        entity.Property(row => row.Tiers)
            .HasColumnType("jsonb")
            .HasConversion(
                tiers => JsonSerializer.Serialize(tiers, Json),
                text => JsonSerializer.Deserialize<List<BotTier>>(text, Json) ?? new List<BotTier>(),
                new ValueComparer<List<BotTier>>(
                    (a, b) => a!.SequenceEqual(b!),
                    tiers => tiers.Aggregate(0, (hash, tier) => HashCode.Combine(hash, tier)),
                    tiers => tiers.ToList()));
    }
}

public sealed record BotSettingsView(
    bool Enabled, int CheckIntervalSeconds, int SuccessRatePct, IReadOnlyList<BotTier> Tiers, string? UpdatedBy, DateTimeOffset? UpdatedAt);

public sealed record BotSettingsRequest(bool Enabled, int CheckIntervalSeconds, int SuccessRatePct, IReadOnlyList<BotTier>? Tiers);

/// <summary>Chỉ Admin thấy: bot có trong hồ lúc này không và đã câu bao nhiêu con.</summary>
public sealed record AdminBotView(Guid PlayerId, string DisplayName, int Level, bool InLake, int TotalCatches, DateTimeOffset CreatedAt);

/// <summary>Kết quả một lần kiểm tra của BotManager, để test và log. <c>RealPlayers</c> là user thật trong hồ; <c>TargetBots</c>/<c>TargetFishing</c> theo mốc (đã trừ chỗ cho giới hạn hồ).</summary>
public sealed record BotCheckResult(string Action, int RealPlayers, int Bots, int TargetBots, int TargetFishing, int NextCheckSeconds);

public static class BotChecks
{
    public const string Spawned = "spawned";
    public const string Removed = "removed";
    public const string None = "none";
    public const string Disabled = "disabled";
}

/// <summary>
/// Nơi các bot đặt chỗ điểm dừng của mình, để hai bot không cùng chọn một chỗ (hoặc hai chỗ sát nhau). Chỗ của người chơi thật
/// không nằm ở đây mà lấy từ vị trí trong phòng.
/// </summary>
public sealed class BotSpots
{
    private readonly object gate = new();
    private readonly Dictionary<Guid, BotMap.MapPoint> reserved = [];

    /// <summary>True và ghi nhận nếu điểm đủ xa mọi chỗ bot khác đã đặt; chỗ cũ của chính bot bị thay.</summary>
    public bool TryReserve(Guid botId, BotMap.MapPoint point)
    {
        lock (gate)
        {
            if (!IsFreeCore(botId, point)) return false;
            reserved[botId] = point;
            return true;
        }
    }

    public bool IsFree(Guid botId, BotMap.MapPoint point)
    {
        lock (gate) return IsFreeCore(botId, point);
    }

    public void Release(Guid botId)
    {
        lock (gate) reserved.Remove(botId);
    }

    private bool IsFreeCore(Guid botId, BotMap.MapPoint point) =>
        reserved.All(pair => pair.Key == botId || !BotMap.TooClose(pair.Value.X, pair.Value.Y, point.X, point.Y));
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

    /// <summary>Khoảng cách tối thiểu (px) giữa điểm dừng của một bot và bất kỳ người/bot nào khác (yêu cầu 2026-11-17).</summary>
    public const double MinSpotGap = 24;

    private bool CellOk(int c, int r) =>
        c >= 0 && r >= 0 && c < Math.Ceiling(Width / RouteCell) + 1 && r < Math.Ceiling(Height / RouteCell) + 1 && CanStand(c * RouteCell, r * RouteCell);

    private HashSet<int>? mainArea;

    /// <summary>
    /// Vùng đi lại liên thông với điểm spawn (lưới 8 px, cùng luật nối ô với <see cref="FindRoute"/>). Các ô đứng được nhưng
    /// tách khỏi vùng này (cù lao nhỏ trên bến) là nơi bot sẽ kẹt mãi nếu lọt vào, nên bot không chọn chúng làm điểm dừng.
    /// </summary>
    private HashSet<int> MainArea()
    {
        if (mainArea is not null) return mainArea;
        var cols = (int)Math.Ceiling(Width / RouteCell) + 1;
        var set = new HashSet<int>();
        var start = NearestCell(Spawn);
        if (start is not { } first) return mainArea = set;
        var queue = new Queue<(int C, int R)>();
        queue.Enqueue(first);
        set.Add(first.R * cols + first.C);
        (int Dc, int Dr)[] directions = [(1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)];
        while (queue.Count > 0)
        {
            var (c, r) = queue.Dequeue();
            foreach (var (dc, dr) in directions)
            {
                var nc = c + dc;
                var nr = r + dr;
                if (!CellOk(nc, nr) || set.Contains(nr * cols + nc)) continue;
                if (dc != 0 && dr != 0 && (!CellOk(c + dc, r) || !CellOk(c, r + dr))) continue;
                set.Add(nr * cols + nc);
                queue.Enqueue((nc, nr));
            }
        }
        return mainArea = set;
    }

    private (int C, int R)? NearestCell(MapPoint p)
    {
        var c0 = (int)Math.Round(p.X / RouteCell, MidpointRounding.AwayFromZero);
        var r0 = (int)Math.Round(p.Y / RouteCell, MidpointRounding.AwayFromZero);
        for (var d = 0; d <= 4; d++)
            for (var dr = -d; dr <= d; dr++)
                for (var dc = -d; dc <= d; dc++)
                    if (Math.Max(Math.Abs(dc), Math.Abs(dr)) == d && CellOk(c0 + dc, r0 + dr)) return (c0 + dc, r0 + dr);
        return null;
    }

    /// <summary>Điểm đứng được và nằm trong vùng đi lại chính (đi tới được từ spawn, và từ đó đi ra được).</summary>
    public bool IsInMainArea(double x, double y)
    {
        if (!CanStand(x, y) || NearestCell(new MapPoint(x, y)) is not { } cell) return false;
        return MainArea().Contains(cell.R * ((int)Math.Ceiling(Width / RouteCell) + 1) + cell.C);
    }

    /// <summary>Hai điểm có quá gần nhau để bot đứng chồng lên người khác không.</summary>
    public static bool TooClose(double ax, double ay, double bx, double by) =>
        (ax - bx) * (ax - bx) + (ay - by) * (ay - by) < MinSpotGap * MinSpotGap;

    /// <summary>Điểm đứng được gần (x, y) nhất trong bán kính cho trước (và qua được <paramref name="accept"/>); null nếu không có.</summary>
    public MapPoint? NearestStandable(double x, double y, int maxRadius = 64, int step = 2, Func<MapPoint, bool>? accept = null)
    {
        if (CanStand(x, y) && (accept is null || accept(new MapPoint(x, y)))) return new MapPoint(x, y);
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
                    if (accept is not null && !accept(new MapPoint(x + dx, y + dy))) continue;
                    bestDistance = distance;
                    best = new MapPoint(x + dx, y + dy);
                }
            }
            if (best is not null) return best;
        }
        return null;
    }

    private const int RouteCell = 8;

    /// <summary>Đường thẳng giữa hai điểm không đụng vật cản (lấy mẫu mỗi 2 px bằng đúng hình chữ nhật chân).</summary>
    private bool ClearLine(MapPoint a, MapPoint b)
    {
        var steps = (int)Math.Ceiling(Math.Sqrt((b.X - a.X) * (b.X - a.X) + (b.Y - a.Y) * (b.Y - a.Y)) / 2);
        for (var i = 1; i <= steps; i++)
        {
            var t = (double)i / steps;
            if (!CanStand(a.X + (b.X - a.X) * t, a.Y + (b.Y - a.Y) * t)) return false;
        }
        return true;
    }

    /// <summary>
    /// Đường đi bộ từ <paramref name="from"/> tới <paramref name="to"/> quanh vật cản (BFS trên lưới 8 px rồi nắn thẳng các đoạn
    /// nhìn thấy nhau); điểm cuối đúng là <paramref name="to"/>. Null nếu không có đường. Cùng thuật toán với findRoute (botWalk.ts).
    /// </summary>
    public IReadOnlyList<MapPoint>? FindRoute(MapPoint from, MapPoint to)
    {
        if (!CanStand(to.X, to.Y)) return null;
        if (ClearLine(from, to)) return [to];
        var cols = (int)Math.Ceiling(Width / RouteCell) + 1;
        var rowsCount = (int)Math.Ceiling(Height / RouteCell) + 1;
        bool Ok(int c, int r) => c >= 0 && r >= 0 && c < cols && r < rowsCount && CanStand(c * RouteCell, r * RouteCell);
        (int C, int R)? Nearest(MapPoint p)
        {
            var c0 = (int)Math.Round(p.X / RouteCell, MidpointRounding.AwayFromZero);
            var r0 = (int)Math.Round(p.Y / RouteCell, MidpointRounding.AwayFromZero);
            for (var d = 0; d <= 4; d++)
                for (var dr = -d; dr <= d; dr++)
                    for (var dc = -d; dc <= d; dc++)
                        if (Math.Max(Math.Abs(dc), Math.Abs(dr)) == d && Ok(c0 + dc, r0 + dr)) return (c0 + dc, r0 + dr);
            return null;
        }
        if (Nearest(from) is not { } start || Nearest(to) is not { } goal) return null;

        int Key(int c, int r) => r * cols + c;
        var prev = new Dictionary<int, int> { [Key(start.C, start.R)] = -1 };
        var queue = new Queue<(int C, int R)>();
        queue.Enqueue(start);
        var found = Key(start.C, start.R) == Key(goal.C, goal.R);
        (int Dc, int Dr)[] directions = [(1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)];
        while (queue.Count > 0 && !found)
        {
            var (c, r) = queue.Dequeue();
            foreach (var (dc, dr) in directions)
            {
                var nc = c + dc;
                var nr = r + dr;
                if (prev.ContainsKey(Key(nc, nr)) || !Ok(nc, nr)) continue;
                // Đi chéo chỉ khi hai ô kề cạnh cũng đứng được, để khỏi cắt góc vật cản.
                if (dc != 0 && dr != 0 && (!Ok(c + dc, r) || !Ok(c, r + dr))) continue;
                prev[Key(nc, nr)] = Key(c, r);
                if (nc == goal.C && nr == goal.R) found = true;
                queue.Enqueue((nc, nr));
            }
        }
        if (!found) return null;

        var cells = new List<MapPoint>();
        for (var k = Key(goal.C, goal.R); k != -1; k = prev[k])
            cells.Add(new MapPoint(k % cols * RouteCell, k / cols * RouteCell));
        cells.Reverse();
        cells.Add(to);
        var route = new List<MapPoint>();
        var at = from;
        var i = 0;
        while (i < cells.Count)
        {
            var j = cells.Count - 1;
            while (j > i && !ClearLine(at, cells[j])) j--;
            route.Add(cells[j]);
            at = cells[j];
            i = j + 1;
        }
        return route;
    }

    /// <summary>
    /// Điểm đứng được ngẫu nhiên trong bán kính quanh (cx, cy), luôn nằm trong vùng đi lại chính và qua được <paramref name="accept"/>;
    /// thử vài lần rồi lấy điểm bất kỳ trên map. Trả Spawn nếu không có điểm nào hợp lệ.
    /// </summary>
    public MapPoint RandomStandable(Random random, double cx, double cy, double radius, Func<MapPoint, bool>? accept = null)
    {
        bool Good(double x, double y) =>
            x > 0 && y > 0 && x < Width && y < Height && IsInMainArea(x, y) && (accept is null || accept(new MapPoint(x, y)));
        for (var attempt = 0; attempt < 30; attempt++)
        {
            var x = cx + (random.NextDouble() * 2 - 1) * radius;
            var y = cy + (random.NextDouble() * 2 - 1) * radius;
            if (Good(x, y)) return new MapPoint(x, y);
        }
        for (var attempt = 0; attempt < 200; attempt++)
        {
            var x = random.NextDouble() * Width;
            var y = random.NextDouble() * Height;
            if (Good(x, y)) return new MapPoint(x, y);
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
