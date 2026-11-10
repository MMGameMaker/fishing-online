using System.Collections.Concurrent;
using System.Security.Cryptography;
using FishingOnline.Api.Modules.Common;
using FishingOnline.Domain;
using FishingOnline.Domain.Rules;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FishingOnline.Api.Modules.Fishing;

public sealed class FishingAttemptRow
{
    public Guid AttemptId { get; set; }
    public Guid PlayerId { get; set; }
    public Guid SessionId { get; set; }
    public string Phase { get; set; } = string.Empty;
    public string? Reason { get; set; }
    public string? SpeciesId { get; set; }
    public string? Rarity { get; set; }
    public long? Seed { get; set; }
    public string ConfigVersion { get; set; } = string.Empty;
    public string SnapshotJson { get; set; } = string.Empty;
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset? EndedAt { get; set; }
    public int? LengthTenthCm { get; set; }
    public string? ResultJson { get; set; }

    /// <summary>Đang giữ một con cá trong hồ từ lúc cắn; trả lại hoặc trừ hẳn khi lần câu kết thúc.</summary>
    public bool PopulationReserved { get; set; }
}

public sealed class FishingAttemptRowConfig : IEntityTypeConfiguration<FishingAttemptRow>
{
    public const string OpenPlayerIndex = "IX_fishing_attempts_open_player";

    public void Configure(EntityTypeBuilder<FishingAttemptRow> entity)
    {
        entity.ToTable("fishing_attempts");
        entity.HasKey(row => row.AttemptId);
        entity.Property(row => row.Phase).HasMaxLength(16);
        entity.Property(row => row.Reason).HasMaxLength(32);
        entity.Property(row => row.SpeciesId).HasMaxLength(64);
        entity.Property(row => row.Rarity).HasMaxLength(16);
        entity.Property(row => row.ConfigVersion).HasMaxLength(128);
        entity.Property(row => row.SnapshotJson).HasColumnType("jsonb");
        entity.Property(row => row.ResultJson).HasColumnType("jsonb");
        entity.HasIndex(row => row.PlayerId).IsUnique().HasFilter("\"EndedAt\" IS NULL").HasDatabaseName(OpenPlayerIndex);
        entity.HasIndex(row => new { row.PlayerId, row.EndedAt, row.AttemptId });
    }
}

public sealed record AttemptResultView(
    string SpeciesId, string Rarity, int LengthTenthCm, bool IsNew, bool IsRecord, int ExpGained, int Level, bool LevelUp);

public sealed record AttemptView(
    Guid AttemptId, string Phase, string? Reason, DateTimeOffset? BiteDeadlineAt, MinigameParams? Minigame, object? State, AttemptResultView? Result);

public sealed record CatchShownView(Guid PlayerId, string SpeciesId, string Rarity, DateTimeOffset ShownUntil);

/// <summary>Icon buồn khi thua minigame, cả phòng cùng thấy (SPEC 2.6).</summary>
public sealed record FailShownView(Guid PlayerId, DateTimeOffset ShownUntil);

public sealed record CastLineCommand(string RequestId) : IHubCommand;

public sealed record HookFishCommand(string RequestId, Guid AttemptId) : IHubCommand;

public sealed record SubmitFishingResultCommand(string RequestId, Guid AttemptId, string Outcome) : IHubCommand;

public sealed record CastLineAck(Guid AttemptId);

public sealed record SubmitResultAck(AttemptView Attempt);

public interface IFishingState
{
    /// <summary>Đang có lần câu chưa kết thúc.</summary>
    bool IsBusy(Guid playerId);
}

/// <summary>Lịch trong RAM của các lần câu đang mở; dữ liệu thật nằm ở DB.</summary>
public sealed class FishingState : IFishingState
{
    private readonly ConcurrentDictionary<Guid, ActiveEntry> byPlayer = new();

    public sealed record ActiveEntry(Guid AttemptId, Guid PlayerId, DateTimeOffset NextDueAt);

    public bool IsBusy(Guid playerId) => byPlayer.ContainsKey(playerId);

    public ActiveEntry? Find(Guid playerId) => byPlayer.GetValueOrDefault(playerId);

    public void Set(ActiveEntry entry) => byPlayer[entry.PlayerId] = entry;

    public void Remove(Guid playerId, Guid attemptId)
    {
        if (byPlayer.TryGetValue(playerId, out var entry) && entry.AttemptId == attemptId)
            byPlayer.TryRemove(new KeyValuePair<Guid, ActiveEntry>(playerId, entry));
    }

    public IReadOnlyList<ActiveEntry> Due(DateTimeOffset now) => byPlayer.Values.Where(entry => entry.NextDueAt <= now).ToArray();
}

/// <summary>Random dùng thật trên Server, an toàn khi gọi song song.</summary>
public sealed class CryptoRandomSource : IRandomSource
{
    public double NextDouble() => (RandomNumberGenerator.GetInt32(int.MaxValue) * (double)int.MaxValue + RandomNumberGenerator.GetInt32(int.MaxValue))
        / ((double)int.MaxValue * int.MaxValue);

    public int NextInt(int minInclusive, int maxInclusive) => RandomNumberGenerator.GetInt32(minInclusive, maxInclusive + 1);
}
