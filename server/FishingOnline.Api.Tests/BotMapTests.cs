using FishingOnline.Api.Modules.Bots;

namespace FishingOnline.Api.Tests;

public sealed class BotMapTests
{
    [Fact]
    public void FindRoute_ReachesTheStandingSpotBesideEverySeat_AndEndsExactlyThere()
    {
        var map = BotMap.Load();
        var unreachable = new List<string>();
        foreach (var seat in map.Seats.Values)
        {
            var stand = map.NearestStandable(seat.X, seat.Y);
            if (stand is null || map.FindRoute(map.Spawn, stand) is not { Count: > 0 } route)
            {
                unreachable.Add(seat.SeatId);
                continue;
            }
            Assert.Equal(stand, route[^1]);
        }

        Assert.Empty(unreachable);
    }

    [Fact]
    public void RandomStandable_StaysInTheMainArea_AndRespectsTheAcceptRule()
    {
        var map = BotMap.Load();
        var random = new Random(7);

        // Cù lao tách khỏi bến chính (ở khoảng 872, 624): đứng được nhưng bot vào là kẹt mãi.
        Assert.True(map.CanStand(872, 624));
        Assert.False(map.IsInMainArea(872, 624));
        Assert.True(map.IsInMainArea(map.Spawn.X, map.Spawn.Y));

        for (var i = 0; i < 400; i++)
        {
            var spot = map.RandomStandable(random, 872, 624, 400);
            Assert.True(map.IsInMainArea(spot.X, spot.Y), $"({spot.X:0},{spot.Y:0}) is outside the main area");
        }

        var avoid = new BotMap.MapPoint(map.Spawn.X, map.Spawn.Y);
        for (var i = 0; i < 200; i++)
        {
            var spot = map.RandomStandable(random, avoid.X, avoid.Y, 60, p => !BotMap.TooClose(p.X, p.Y, avoid.X, avoid.Y));
            Assert.False(BotMap.TooClose(spot.X, spot.Y, avoid.X, avoid.Y));
        }
    }

    [Fact]
    public void BotSpots_RefuseNearbyReservations_AndFreeThemOnRelease()
    {
        var spots = new BotSpots();
        var a = Guid.NewGuid();
        var b = Guid.NewGuid();

        Assert.True(spots.TryReserve(a, new BotMap.MapPoint(100, 100)));
        Assert.False(spots.TryReserve(b, new BotMap.MapPoint(110, 105)));
        Assert.True(spots.TryReserve(b, new BotMap.MapPoint(100 + BotMap.MinSpotGap + 1, 100)));
        // Bot đổi chỗ của chính nó: chỗ cũ không tự chặn mình.
        Assert.True(spots.TryReserve(a, new BotMap.MapPoint(98, 100)));
        spots.Release(a);
        Assert.True(spots.IsFree(b, new BotMap.MapPoint(100, 100)));
    }

    [Fact]
    public void FindRoute_ReturnsNull_WhenTheTargetCannotBeStoodOn()
    {
        var map = BotMap.Load();

        // Giữa mái nhà Marlin's: ô bị chặn (feedback 2026-11-16: nhà không đi xuyên qua được).
        Assert.Null(map.FindRoute(map.Spawn, new BotMap.MapPoint(790, 70)));
    }
}
