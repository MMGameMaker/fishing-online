using FishingOnline.Domain.Config;

namespace FishingOnline.Domain.Rules;

public static class FishingRules
{
    /// <summary>Thời gian chờ cá cắn (SPEC 2.6), đã trừ buff lureTimeMs của ghế.</summary>
    public static int WaitMs(IRandomSource random, FishingTiming timing, int seatLureMs) =>
        random.NextInt(timing.WaitMinMs, timing.WaitMaxMs) - seatLureMs;
}
