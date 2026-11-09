using FishingOnline.Domain;
using FishingOnline.Domain.Rules;

namespace FishingOnline.Sim;

/// <summary>Sai số thời điểm bấm của người chơi, độ lệch chuẩn tính bằng ms. Đây là giả định, chưa đo từ người chơi thật.</summary>
public sealed record SkillProfile(string Name, double TimingErrorMs);

public sealed record MinigamePlay(bool Won, long ElapsedMs);

/// <summary>Hành vi giả định của người chơi; các số không thuộc config game.</summary>
public sealed record PlayerModel(
    int ReactionMinMs,
    int ReactionMaxMs,
    int ReaimMs,
    int RecastMs,
    int FailHoldMs,
    SkillProfile Skill)
{
    public static readonly SkillProfile Beginner = new("Mới chơi", 100);
    public static readonly SkillProfile Average = new("Trung bình", 60);
    public static readonly SkillProfile Expert = new("Giỏi", 30);

    /// <summary><c>FailHoldMs</c> lấy theo <c>FAIL_HOLD_MS</c> trong FishingFlow.ts của Client.</summary>
    public static PlayerModel Default(SkillProfile skill) => new(
        ReactionMinMs: 400,
        ReactionMaxMs: 1200,
        ReaimMs: 250,
        RecastMs: 500,
        FailHoldMs: 1500,
        skill);

    /// <summary>
    /// Luôn nhắm giữa vùng vàng: chờ kim đi qua điểm đó rồi bấm lệch theo phân phối chuẩn.
    /// Vùng càng hẹp hoặc kim càng nhanh thì xác suất trúng càng thấp.
    /// </summary>
    public MinigamePlay Play(MinigameParams parameters, IRandomSource random)
    {
        var model = new ClientMinigameModel(parameters);
        var lastStrike = 0d;
        var earliest = (double)ReaimMs;
        while (true)
        {
            var target = model.YellowStart + parameters.YellowWidth / 2;
            var crossing = NextCrossing(target, parameters.NeedlePassMs, earliest);
            var strikeAt = Math.Max(earliest, crossing + NextGaussian(random) * Skill.TimingErrorMs);

            if (model.RemainingMs(strikeAt) <= 0)
                return new MinigamePlay(false, (long)Math.Ceiling(Math.Max(lastStrike, parameters.DurationMs - model.PenaltyMs)));

            model.Strike(strikeAt);
            if (model.Won) return new MinigamePlay(true, (long)Math.Ceiling(strikeAt));
            lastStrike = strikeAt;
            earliest = strikeAt + ReaimMs;
        }
    }

    /// <summary>Thời điểm sớm nhất từ <paramref name="afterMs"/> mà kim đi qua vị trí <paramref name="position"/>.</summary>
    public static double NextCrossing(double position, int needlePassMs, double afterMs)
    {
        var period = 2d * needlePassMs;
        double Next(double offset) => offset + Math.Ceiling((afterMs - offset) / period) * period;
        return Math.Min(Next(position * needlePassMs), Next((2 - position) * needlePassMs));
    }

    private static double NextGaussian(IRandomSource random)
    {
        var radius = Math.Sqrt(-2 * Math.Log(1 - random.NextDouble()));
        return radius * Math.Cos(2 * Math.PI * random.NextDouble());
    }
}
