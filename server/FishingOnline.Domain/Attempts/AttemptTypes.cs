using FishingOnline.Domain.Config;
using FishingOnline.Domain.Rules;

namespace FishingOnline.Domain.Attempts;

public enum FishingPhase
{
    Waiting,
    Bite,
    Minigame,
    Success,
    Failed,
    Cancelled,
}

public enum AttemptOutcome
{
    Success,
    Failed,
}

/// <summary>Lý do trong <c>AttemptView.reason</c>.</summary>
public static class AttemptReasons
{
    public const string MissedBite = "missed_bite";
    public const string Timeout = "timeout";
    public const string SessionExpired = "session_expired";
    public const string Disconnected = "disconnected";
    public const string LeftSeat = "left_seat";
}

/// <summary>Lệnh bị từ chối; tương ứng mã <c>STATE_CONFLICT</c>, <c>BITE_EXPIRED</c>, <c>RESULT_EXPIRED</c> ở SPEC mục 5.</summary>
public enum AttemptError
{
    StateConflict,
    BiteExpired,
    ResultExpired,
}

public abstract record AttemptEvent;

public sealed record PhaseChanged(FishingPhase Phase, string? Reason) : AttemptEvent;

public sealed record Succeeded(string SpeciesId, int LengthTenthCm, int Exp) : AttemptEvent;

/// <summary>Kết quả một lệnh. Có thể vừa có sự kiện vừa có lỗi, ví dụ Hook quá hạn làm attempt chuyển failed.</summary>
public sealed record AttemptStep(IReadOnlyList<AttemptEvent> Events, AttemptError? Error);

/// <summary>Toàn bộ trạng thái của attempt, để BE-E lưu và khôi phục.</summary>
public sealed record AttemptSnapshot(
    string ConfigVersion,
    Stats Stats,
    FishingPhase Phase,
    string? Reason,
    DateTimeOffset BiteAt,
    DateTimeOffset? BiteDeadlineAt,
    string? SpeciesId,
    MinigameParams? Minigame,
    int? LengthTenthCm,
    int? Exp);

/// <summary>
/// Phần phụ thuộc của attempt. <c>PickSpecies</c> nhận rareLuck và trả speciesId;
/// BE-E-08 thay bản mặc định bằng bản có xét tồn cá.
/// </summary>
public sealed record AttemptContext(GameplayConfig Config, IRandomSource Random, Func<int, string> PickSpecies)
{
    public static AttemptContext Create(GameplayConfig config, IRandomSource random) =>
        new(config, random, rareLuck => SpawnPicker.Pick(random, config, rareLuck));
}
