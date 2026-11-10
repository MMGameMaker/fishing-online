using FishingOnline.Domain.Config;

namespace FishingOnline.Domain.Rules;

public static class FishingRules
{
    /// <summary>Thời gian chờ cá cắn (SPEC 2.6).</summary>
    public static int WaitMs(IRandomSource random, FishingTiming timing) =>
        random.NextInt(timing.WaitMinMs, timing.WaitMaxMs);
}
