using FishingOnline.Domain.Rules;

namespace FishingOnline.Sim;

public enum HitKind
{
    Miss,
    Normal,
    Weak,
}

/// <summary>
/// Bản sao luật minigame của Client (client-v0/src/online/fishing/minigameCore.ts), chỉ dùng để mô phỏng balance.
/// Server không dùng lớp này: thắng/thua thật do Client báo (SPEC 2.7).
/// </summary>
public sealed class ClientMinigameModel
{
    private const double Uint32Range = 4294967296d;

    private readonly MinigameParams parameters;
    private uint rngState;

    public ClientMinigameModel(MinigameParams parameters)
    {
        this.parameters = parameters;
        rngState = parameters.Seed;
        var first = NextRandom();
        var second = NextRandom();
        GreenStart = first * (1 - parameters.GreenWidth);
        YellowStart = GreenStart + second * (parameters.GreenWidth - parameters.YellowWidth);
        Hp = parameters.FishHp;
    }

    public double GreenStart { get; private set; }

    public double YellowStart { get; private set; }

    public int Hp { get; private set; }

    public int PenaltyMs { get; private set; }

    public bool Won => Hp <= 0;

    public static double NeedlePosition(double timeMs, int needlePassMs)
    {
        var phase = timeMs % (2d * needlePassMs) / needlePassMs;
        return phase <= 1 ? phase : 2 - phase;
    }

    public double RemainingMs(double timeMs) => parameters.DurationMs - timeMs - PenaltyMs;

    /// <summary>Áp một lần đánh tại thời điểm hợp lệ, rồi dịch vùng theo đúng thứ tự tiêu RNG của Client.</summary>
    public HitKind Strike(double timeMs)
    {
        var kind = Classify(NeedlePosition(timeMs, parameters.NeedlePassMs));
        Hp -= kind switch
        {
            HitKind.Weak => 2 * parameters.Atk,
            HitKind.Normal => parameters.Atk,
            _ => 0,
        };
        if (kind == HitKind.Miss) PenaltyMs += parameters.MissPenaltyMs;

        // Theo Client từ 2026-11-12: vùng xanh nhảy sang vị trí ngẫu nhiên mới sau mỗi tap
        // (không còn dịch theo ShiftMin..ShiftMax); RNG: vị trí xanh rồi vị trí vàng.
        var greenRoll = NextRandom();
        var yellowRoll = NextRandom();
        GreenStart = greenRoll * (1 - parameters.GreenWidth);
        YellowStart = GreenStart + yellowRoll * (parameters.GreenWidth - parameters.YellowWidth);
        return kind;
    }

    private HitKind Classify(double position)
    {
        if (position >= YellowStart && position <= YellowStart + parameters.YellowWidth) return HitKind.Weak;
        if (position >= GreenStart && position <= GreenStart + parameters.GreenWidth) return HitKind.Normal;
        return HitKind.Miss;
    }

    /// <summary>Một bước mulberry32, cho cùng dãy số với Client từ cùng seed.</summary>
    private double NextRandom()
    {
        unchecked
        {
            rngState += 0x6D2B79F5;
            var value = rngState;
            value = (value ^ value >> 15) * (value | 1);
            value ^= value + (value ^ value >> 7) * (value | 61);
            return (value ^ value >> 14) / Uint32Range;
        }
    }
}
