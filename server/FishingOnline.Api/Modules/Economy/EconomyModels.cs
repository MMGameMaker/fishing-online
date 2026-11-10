using FishingOnline.Api.Modules.Common;
using FishingOnline.Domain.Rules;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FishingOnline.Api.Modules.Economy;

public sealed class RodOwnedRow
{
    public Guid PlayerId { get; set; }
    public string RodId { get; set; } = string.Empty;
    public DateTimeOffset AcquiredAt { get; set; }
}

public sealed class CatchRow
{
    public Guid CatchId { get; set; }
    public Guid PlayerId { get; set; }
    public Guid AttemptId { get; set; }
    public string SpeciesId { get; set; } = string.Empty;
    public string Rarity { get; set; } = string.Empty;
    public int LengthTenthCm { get; set; }
    public DateTimeOffset CaughtAt { get; set; }
    public DateTimeOffset? SoldAt { get; set; }
    public string ConfigVersion { get; set; } = string.Empty;
    public bool IsNew { get; set; }
    public bool IsRecord { get; set; }
    public int ExpGained { get; set; }
    public int LevelAfter { get; set; }
    public bool LevelUp { get; set; }
}

public sealed class SpeciesRecordRow
{
    public Guid PlayerId { get; set; }
    public string SpeciesId { get; set; } = string.Empty;
    public DateTimeOffset FirstCaughtAt { get; set; }
    public int TotalCaught { get; set; }
    public int BestLengthTenthCm { get; set; }
    public Guid BestCatchId { get; set; }
}

public sealed class RodOwnedRowConfig : IEntityTypeConfiguration<RodOwnedRow>
{
    public void Configure(EntityTypeBuilder<RodOwnedRow> entity)
    {
        entity.ToTable("rods_owned");
        entity.HasKey(rod => new { rod.PlayerId, rod.RodId });
        entity.Property(rod => rod.RodId).HasMaxLength(64);
    }
}

public sealed class CatchRowConfig : IEntityTypeConfiguration<CatchRow>
{
    public void Configure(EntityTypeBuilder<CatchRow> entity)
    {
        entity.ToTable("catches");
        entity.HasKey(row => row.CatchId);
        entity.Property(row => row.SpeciesId).HasMaxLength(64);
        entity.Property(row => row.Rarity).HasMaxLength(16);
        entity.Property(row => row.ConfigVersion).HasMaxLength(128);
        entity.HasIndex(row => row.AttemptId).IsUnique();
        entity.HasIndex(row => new { row.PlayerId, row.CaughtAt });
    }
}

public sealed class SpeciesRecordRowConfig : IEntityTypeConfiguration<SpeciesRecordRow>
{
    public void Configure(EntityTypeBuilder<SpeciesRecordRow> entity)
    {
        entity.ToTable("species_records");
        entity.HasKey(row => new { row.PlayerId, row.SpeciesId });
        entity.Property(row => row.SpeciesId).HasMaxLength(64);
    }
}

public sealed record CatchRecordResult(Guid CatchId, bool IsNew, bool IsRecord, int ExpGained, int Level, bool LevelUp);

public interface ICatchRecorder
{
    /// <summary>Chạy trong transaction của BE-E. Gọi lặp cùng attemptId trả kết quả cũ.</summary>
    Task<CatchRecordResult> RecordAsync(Guid playerId, Guid attemptId, string speciesId, int lengthTenthCm, int exp, string configVersion, CancellationToken ct);
}

public sealed record PlayerStats(int Level, int Exp, int ExpToNext, string RodId, Stats Total, Stats LevelPart, Stats RodPart);

public interface IProgress
{
    Task<PlayerStats> GetStatsAsync(Guid playerId, CancellationToken ct);
}

public sealed record InventoryFishView(Guid CatchId, string SpeciesId, int LengthTenthCm, DateTimeOffset CaughtAt);

public sealed record InventoryItemView(string ItemId, int Quantity);

public sealed record InventoryView(
    int InventoryVersion, string Gold, string EquippedRodId, IReadOnlyList<string> Rods,
    IReadOnlyList<InventoryItemView> Items, IReadOnlyList<InventoryFishView> Fish);

public sealed record EquipRodRequest(string RodId);

public sealed record EquipRodResponse(string EquippedRodId);

public sealed record BuyRequest(string OfferId, int Quantity) : IIdempotentBody;

public sealed record BuyResponse(string Gold, InventoryView Inventory);

public sealed record SellFishRequest(IReadOnlyList<Guid>? CatchIds, bool? All) : IIdempotentBody;

public sealed record SellFishResponse(int SoldCount, string GoldEarned, string Gold);

public sealed record ProgressView(int Level, int Exp, int ExpToNext, Stats Stats, ProgressBreakdown Breakdown);

public sealed record ProgressBreakdown(Stats Level, Stats Rod);

public sealed record CodexSpeciesView(string SpeciesId, bool Discovered, int? TotalCaught, int? BestLengthTenthCm, DateTimeOffset? FirstCaughtAt);

public sealed record CodexView(IReadOnlyList<CodexSpeciesView> Species);

public sealed record HistoryItemView(Guid AttemptId, string Outcome, string? Reason, string? SpeciesId, int? LengthTenthCm, DateTimeOffset EndedAt);

public sealed record HistoryView(IReadOnlyList<HistoryItemView> Items, string? NextCursor);
