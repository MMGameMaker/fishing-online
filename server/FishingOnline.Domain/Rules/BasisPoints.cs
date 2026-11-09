namespace FishingOnline.Domain.Rules;

/// <summary>Chọn một mục theo trọng số basis point (tổng 10.000), so tích lũy bằng số nguyên.</summary>
internal static class BasisPoints
{
    private const int Total = 10_000;

    public static int PickIndex(IRandomSource random, IReadOnlyList<int> weights)
    {
        if (weights.Sum() != Total)
            throw new InvalidOperationException($"Basis point weights must sum to {Total}.");

        var roll = random.NextInt(0, Total - 1);
        var cumulative = 0;
        for (var index = 0; index < weights.Count; index++)
        {
            cumulative += weights[index];
            if (roll < cumulative) return index;
        }
        throw new InvalidOperationException("Basis point weights must not be negative.");
    }
}
