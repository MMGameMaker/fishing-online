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
    public void FindRoute_ReturnsNull_WhenTheTargetCannotBeStoodOn()
    {
        var map = BotMap.Load();

        // Giữa mái nhà Marlin's: ô bị chặn (feedback 2026-11-16: nhà không đi xuyên qua được).
        Assert.Null(map.FindRoute(map.Spawn, new BotMap.MapPoint(790, 70)));
    }
}
