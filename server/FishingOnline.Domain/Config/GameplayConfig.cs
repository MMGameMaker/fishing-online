using System.Text.Json.Serialization;

namespace FishingOnline.Domain.Config;

/// <summary>Khớp từng field của docs/v01/fixtures/gameplay-config.v0.json; đọc qua <see cref="GameplayConfigJson"/>.</summary>
public sealed record GameplayConfig(
    string ConfigVersion,
    string Status,
    NewPlayerConfig NewPlayer,
    IReadOnlyList<LevelConfig> Levels,
    IReadOnlyList<Rod> Rods,
    IReadOnlyList<Fish> Fish,
    SeatSessionConfig SeatSession,
    FishingTiming Fishing,
    MinigameConfig Minigame,
    LengthTierConfig LengthTiers,
    SpawnConfig Spawn,
    IReadOnlyList<ShopOffer> ShopOffers,
    TicketPricing TicketPricing,
    FishPopulationConfig FishPopulation,
    SuspicionMonitoringConfig SuspicionMonitoring);

public enum Rarity
{
    Common,
    Uncommon,
    Rare,
    Epic,
    Legendary,
}

/// <summary>Một giá trị cho mỗi rarity; dùng record thay dictionary để thiếu rarity là lỗi parse.</summary>
public sealed record RarityTable<T>(T Common, T Uncommon, T Rare, T Epic, T Legendary)
{
    public T For(Rarity rarity) => rarity switch
    {
        Rarity.Common => Common,
        Rarity.Uncommon => Uncommon,
        Rarity.Rare => Rare,
        Rarity.Epic => Epic,
        Rarity.Legendary => Legendary,
        _ => throw new ArgumentOutOfRangeException(nameof(rarity)),
    };
}

public sealed record NewPlayerConfig(long Gold, string RodId);

public sealed record LevelConfig(
    int Level,
    int ExpReq,
    int Strength,
    int NormalHitZonePct,
    int WeaknessHitZonePct,
    int RareLuck,
    int LargeLuck);

public sealed record Rod(
    string RodId,
    string Name,
    long? PriceGold,
    bool IsDefault,
    int Strength,
    int NormalHitZonePct,
    int WeaknessHitZonePct,
    int RareLuck,
    int LargeLuck);

public sealed record Fish(
    string SpeciesId,
    string Name,
    Rarity Rarity,
    int MinTenthCm,
    int MaxTenthCm,
    int Hp,
    int Exp,
    long SellGold);

/// <summary>Ghế chỉ còn thời gian giữ chỗ khi mất kết nối; vé tính theo <see cref="TicketPricing"/>.</summary>
public sealed record SeatSessionConfig(int DisconnectGraceMs);

public sealed record FishingTiming(
    int WaitMinMs,
    int WaitMaxMs,
    int BiteWindowMs,
    int BiteGraceMs,
    int CatchShownMs,
    int FailShownMs);

public sealed record MinigameConfig(
    IReadOnlyList<MinigameRarityConfig> Rarity,
    string Authority,
    int ResultGraceMs);

public sealed record MinigameRarityConfig(
    Rarity Rarity,
    int DurationMs,
    int NeedlePassMs,
    double GreenBasePct,
    double YellowBasePct,
    int MissPenaltyMs,
    double ShiftMin,
    double ShiftMax);

public sealed record LengthTierConfig(int MaxLargeLuck, IReadOnlyList<LengthTier> Tiers);

public sealed record LengthTier(string Id, int BaseBp, int PerLuckBp, double PosMin, double PosMax);

public sealed record SpawnConfig(
    bool Proposal,
    string Status,
    string RareLuckMode,
    int MaxRareLuck,
    RarityTable<double> RarityWeights,
    RarityTable<int> RarityBaseBp,
    RarityTable<int> RarityDeltaBpPerLuck);

public sealed record ShopOffer(string OfferId, string ItemId, long PriceGold);

/// <summary>Giá vé chung (SPEC 2.2). Mỗi vé là một block <c>BillingUnitMinutes</c> phút; Gold giữ dạng chuỗi trong JSON như contract.</summary>
public sealed record TicketPricing(
    int BillingUnitMinutes,
    [property: JsonNumberHandling(JsonNumberHandling.AllowReadingFromString | JsonNumberHandling.WriteAsString)]
    long UnitPriceGold,
    int MaxUnitsPerPurchase,
    string PriceVersion,
    string Status);

/// <summary><c>InitialStock</c>, <c>DepletionPolicy</c> hiện là chữ "not specified"; khi lead chốt giá trị thì đổi kiểu tại đây.</summary>
public sealed record FishPopulationConfig(
    string ReplenishmentMode,
    string ReservationAt,
    int SettlementPerAttempt,
    string InitialStock,
    string DepletionPolicy);

public sealed record SuspicionMonitoringConfig(
    string Mode,
    string ThresholdStatus,
    int RetentionDays,
    int MaxEvidenceAttempts,
    SuspicionRules Rules,
    string DedupeBy,
    bool AutoBan,
    bool RejectOtherwiseValidResults);

public sealed record SuspicionRules(
    WinRateHighRule WinRateHigh,
    FastSuccessRule FastSuccess,
    InvalidResultBurstRule InvalidResultBurst);

public sealed record WinRateHighRule(int WindowMinutes, int MinAttempts, double ThresholdPct);

public sealed record FastSuccessRule(int WindowMinutes, int MaxElapsedMs, int MinAttempts);

public sealed record InvalidResultBurstRule(int WindowMinutes, int MinInvalidRequests);
