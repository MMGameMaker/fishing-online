using FishingOnline.Domain.Config;

namespace FishingOnline.Domain.Rules;

/// <summary>Level theo EXP tích lũy (SPEC 2.5): level lớn nhất có tổng expReq tới level đó ≤ exp.</summary>
public sealed class LevelTable
{
    private readonly int[] levels;
    private readonly int[] thresholds;

    public LevelTable(IReadOnlyList<LevelConfig> levelConfigs)
    {
        var ordered = levelConfigs.OrderBy(level => level.Level).ToArray();
        levels = ordered.Select(level => level.Level).ToArray();
        thresholds = new int[ordered.Length];
        var total = 0;
        for (var index = 0; index < ordered.Length; index++)
        {
            total += ordered[index].ExpReq;
            thresholds[index] = total;
        }
    }

    public int LevelForExp(int totalExp) => levels[IndexForExp(totalExp)];

    /// <summary>EXP còn thiếu để lên level kế tiếp; 0 khi đã ở level cao nhất.</summary>
    public int ExpToNext(int totalExp)
    {
        var index = IndexForExp(totalExp);
        return index == thresholds.Length - 1 ? 0 : thresholds[index + 1] - totalExp;
    }

    private int IndexForExp(int totalExp)
    {
        ArgumentOutOfRangeException.ThrowIfNegative(totalExp);
        var index = 0;
        while (index + 1 < thresholds.Length && thresholds[index + 1] <= totalExp) index++;
        return index;
    }
}
