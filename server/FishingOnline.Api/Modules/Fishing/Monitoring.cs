using FishingOnline.Api.Modules.Config;
using FishingOnline.Api.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FishingOnline.Api.Modules.Fishing;

/// <summary>Outbox ghi cùng transaction với kết quả lần câu; worker đọc sau commit.</summary>
public sealed class FishingOutcomeEvent
{
    public Guid AttemptId { get; set; }
    public Guid PlayerId { get; set; }
    public bool Success { get; set; }
    public DateTimeOffset MinigameStartedAt { get; set; }
    public DateTimeOffset ResultReceivedAt { get; set; }
    public string ConfigVersion { get; set; } = string.Empty;
    public DateTimeOffset? ProcessedAt { get; set; }
}

/// <summary>Kênh riêng cho request không hợp lệ; chỉ giữ loại lỗi, không giữ payload.</summary>
public sealed class InvalidResultEvent
{
    public Guid Id { get; set; }
    public Guid PlayerId { get; set; }
    public Guid? AttemptId { get; set; }
    public string Kind { get; set; } = string.Empty;
    public DateTimeOffset ReceivedAt { get; set; }
    public DateTimeOffset? ProcessedAt { get; set; }
}

public sealed class PlayerSecuritySignal
{
    public Guid SignalId { get; set; }
    public Guid PlayerId { get; set; }
    public string RuleCode { get; set; } = string.Empty;
    public string RuleVersion { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public long WindowBucket { get; set; }
    public DateTimeOffset WindowStart { get; set; }
    public DateTimeOffset WindowEnd { get; set; }
    public int SampleCount { get; set; }
    public double ObservedValue { get; set; }
    public double Threshold { get; set; }
    public Guid[] RepresentativeAttemptIds { get; set; } = [];
    public DateTimeOffset FirstSeenAt { get; set; }
    public DateTimeOffset LastSeenAt { get; set; }
    public int Occurrences { get; set; }
    public string Status { get; set; } = "open";
    public string? ReviewedBy { get; set; }
    public DateTimeOffset? ReviewedAt { get; set; }
    public string? ReviewNote { get; set; }
}

public sealed class FishingOutcomeEventConfig : IEntityTypeConfiguration<FishingOutcomeEvent>
{
    public void Configure(EntityTypeBuilder<FishingOutcomeEvent> entity)
    {
        entity.ToTable("fishing_outcome_events");
        entity.HasKey(row => row.AttemptId);
        entity.Property(row => row.ConfigVersion).HasMaxLength(128);
        entity.HasIndex(row => row.ProcessedAt);
        entity.HasIndex(row => new { row.PlayerId, row.ResultReceivedAt });
    }
}

public sealed class InvalidResultEventConfig : IEntityTypeConfiguration<InvalidResultEvent>
{
    public void Configure(EntityTypeBuilder<InvalidResultEvent> entity)
    {
        entity.ToTable("invalid_result_events");
        entity.HasKey(row => row.Id);
        entity.Property(row => row.Kind).HasMaxLength(32);
        entity.HasIndex(row => row.ProcessedAt);
        entity.HasIndex(row => new { row.PlayerId, row.ReceivedAt });
    }
}

public sealed class PlayerSecuritySignalConfig : IEntityTypeConfiguration<PlayerSecuritySignal>
{
    public void Configure(EntityTypeBuilder<PlayerSecuritySignal> entity)
    {
        entity.ToTable("player_security_signals");
        entity.HasKey(row => row.SignalId);
        entity.Property(row => row.RuleCode).HasMaxLength(32);
        entity.Property(row => row.RuleVersion).HasMaxLength(128);
        entity.Property(row => row.Severity).HasMaxLength(16);
        entity.Property(row => row.Status).HasMaxLength(16);
        entity.HasIndex(row => new { row.PlayerId, row.RuleCode, row.WindowBucket }).IsUnique();
    }
}

public static class SecurityRules
{
    public const string WinRateHigh = "win_rate_high";
    public const string FastSuccess = "fast_success";
    public const string InvalidResultBurst = "invalid_result_burst";
    public const string Informational = "informational";
    public const string Warning = "warning";
}

/// <summary>
/// Chỉ quan sát (SPEC 2.7.1): không bao giờ từ chối kết quả, khóa tài khoản hay trừ thưởng.
/// Mỗi event chỉ tính một lần vì được đánh dấu xử lý cùng transaction với cảnh báo.
/// </summary>
public sealed class SecurityMonitor(IServiceScopeFactory scopes, IConfigProvider configs, TimeProvider time, ILogger<SecurityMonitor> logger)
{
    private const int MaxEventsPerBatch = 200;
    private const int InvalidKeepFactor = 10;

    /// <summary>Ghi riêng transaction, có giới hạn theo player để request rác không làm phình bảng.</summary>
    public async Task RecordInvalidAsync(Guid playerId, Guid? attemptId, string kind)
    {
        try
        {
            var rule = configs.Current.SuspicionMonitoring.Rules.InvalidResultBurst;
            var now = time.GetUtcNow();
            var windowStart = now.AddMinutes(-rule.WindowMinutes);
            await using var scope = scopes.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
            var recent = await db.Set<InvalidResultEvent>().CountAsync(row => row.PlayerId == playerId && row.ReceivedAt > windowStart);
            if (recent >= rule.MinInvalidRequests * InvalidKeepFactor) return;
            db.Add(new InvalidResultEvent { Id = Guid.CreateVersion7(), PlayerId = playerId, AttemptId = attemptId, Kind = kind, ReceivedAt = now });
            await db.SaveChangesAsync();
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Could not record invalid fishing result");
        }
    }

    public async Task<int> ProcessBatchAsync(CancellationToken ct)
    {
        var processed = 0;
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();

        var outcomes = await db.Set<FishingOutcomeEvent>()
            .FromSqlInterpolated($"""select * from game.fishing_outcome_events where "ProcessedAt" is null order by "ResultReceivedAt" limit {MaxEventsPerBatch} for update skip locked""")
            .AsTracking().ToListAsync(ct);
        foreach (var outcome in outcomes)
        {
            await using var transaction = await db.Database.BeginTransactionAsync(ct);
            await EvaluateOutcomeRulesAsync(db, outcome, ct);
            outcome.ProcessedAt = time.GetUtcNow();
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            processed++;
        }

        var invalids = await db.Set<InvalidResultEvent>().AsTracking()
            .Where(row => row.ProcessedAt == null).OrderBy(row => row.ReceivedAt).Take(MaxEventsPerBatch).ToListAsync(ct);
        foreach (var invalid in invalids)
        {
            await using var transaction = await db.Database.BeginTransactionAsync(ct);
            await EvaluateInvalidRuleAsync(db, invalid, ct);
            invalid.ProcessedAt = time.GetUtcNow();
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            processed++;
        }
        return processed;
    }

    public async Task<IReadOnlyList<PlayerSecuritySignal>> QueryAsync(Guid? playerId, string? ruleCode, DateTimeOffset? from, DateTimeOffset? to, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        var query = db.Set<PlayerSecuritySignal>().AsNoTracking();
        if (playerId is not null) query = query.Where(row => row.PlayerId == playerId);
        if (ruleCode is not null) query = query.Where(row => row.RuleCode == ruleCode);
        if (from is not null) query = query.Where(row => row.LastSeenAt >= from);
        if (to is not null) query = query.Where(row => row.LastSeenAt <= to);
        return await query.OrderByDescending(row => row.LastSeenAt).ToListAsync(ct);
    }

    public async Task<int> PurgeAsync(CancellationToken ct)
    {
        var cutoff = time.GetUtcNow().AddDays(-configs.Current.SuspicionMonitoring.RetentionDays);
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        return await db.Set<FishingOutcomeEvent>().Where(row => row.ProcessedAt != null && row.ResultReceivedAt < cutoff).ExecuteDeleteAsync(ct)
            + await db.Set<InvalidResultEvent>().Where(row => row.ProcessedAt != null && row.ReceivedAt < cutoff).ExecuteDeleteAsync(ct)
            + await db.Set<PlayerSecuritySignal>().Where(row => row.LastSeenAt < cutoff).ExecuteDeleteAsync(ct);
    }

    private async Task EvaluateOutcomeRulesAsync(GameDbContext db, FishingOutcomeEvent outcome, CancellationToken ct)
    {
        var monitoring = configs.Get(outcome.ConfigVersion).SuspicionMonitoring;
        var winRate = monitoring.Rules.WinRateHigh;
        var winStart = outcome.ResultReceivedAt.AddMinutes(-winRate.WindowMinutes);
        var recent = await db.Set<FishingOutcomeEvent>().AsNoTracking()
            .Where(row => row.PlayerId == outcome.PlayerId && row.ResultReceivedAt > winStart && row.ResultReceivedAt <= outcome.ResultReceivedAt)
            .OrderByDescending(row => row.ResultReceivedAt)
            .ToListAsync(ct);

        var wins = recent.Count(row => row.Success);
        var observedRate = recent.Count == 0 ? 0 : 100d * wins / recent.Count;
        if (recent.Count >= winRate.MinAttempts && observedRate >= winRate.ThresholdPct)
            await UpsertSignalAsync(db, outcome.PlayerId, SecurityRules.WinRateHigh, outcome.ConfigVersion, SecurityRules.Informational,
                winRate.WindowMinutes, outcome.ResultReceivedAt, recent.Count, observedRate, winRate.ThresholdPct,
                recent.Select(row => row.AttemptId).Take(monitoring.MaxEvidenceAttempts).ToArray(), ct);

        var fast = monitoring.Rules.FastSuccess;
        var fastStart = outcome.ResultReceivedAt.AddMinutes(-fast.WindowMinutes);
        var fastSuccesses = recent
            .Where(row => row.ResultReceivedAt > fastStart && row.Success
                && (row.ResultReceivedAt - row.MinigameStartedAt).TotalMilliseconds <= fast.MaxElapsedMs)
            .ToArray();
        if (outcome.Success && (outcome.ResultReceivedAt - outcome.MinigameStartedAt).TotalMilliseconds <= fast.MaxElapsedMs
            && fastSuccesses.Length >= fast.MinAttempts)
            await UpsertSignalAsync(db, outcome.PlayerId, SecurityRules.FastSuccess, outcome.ConfigVersion, SecurityRules.Informational,
                fast.WindowMinutes, outcome.ResultReceivedAt, fastSuccesses.Length, fastSuccesses.Length, fast.MinAttempts,
                fastSuccesses.Select(row => row.AttemptId).Take(monitoring.MaxEvidenceAttempts).ToArray(), ct);
    }

    private async Task EvaluateInvalidRuleAsync(GameDbContext db, InvalidResultEvent invalid, CancellationToken ct)
    {
        var monitoring = configs.Current.SuspicionMonitoring;
        var rule = monitoring.Rules.InvalidResultBurst;
        var start = invalid.ReceivedAt.AddMinutes(-rule.WindowMinutes);
        var count = await db.Set<InvalidResultEvent>().AsNoTracking()
            .CountAsync(row => row.PlayerId == invalid.PlayerId && row.ReceivedAt > start && row.ReceivedAt <= invalid.ReceivedAt, ct);
        if (count < rule.MinInvalidRequests) return;

        var samples = await db.Set<InvalidResultEvent>().AsNoTracking()
            .Where(row => row.PlayerId == invalid.PlayerId && row.ReceivedAt > start && row.AttemptId != null)
            .OrderByDescending(row => row.ReceivedAt).Take(monitoring.MaxEvidenceAttempts).Select(row => row.AttemptId!.Value).ToArrayAsync(ct);
        await UpsertSignalAsync(db, invalid.PlayerId, SecurityRules.InvalidResultBurst, configs.Current.ConfigVersion, SecurityRules.Warning,
            rule.WindowMinutes, invalid.ReceivedAt, count, count, rule.MinInvalidRequests, samples, ct);
    }

    private async Task UpsertSignalAsync(
        GameDbContext db, Guid playerId, string ruleCode, string ruleVersion, string severity, int windowMinutes, DateTimeOffset at,
        int samples, double observed, double threshold, Guid[] attemptIds, CancellationToken ct)
    {
        var windowLength = TimeSpan.FromMinutes(windowMinutes);
        var bucket = at.UtcTicks / windowLength.Ticks;
        var signal = await db.Set<PlayerSecuritySignal>().AsTracking()
            .SingleOrDefaultAsync(row => row.PlayerId == playerId && row.RuleCode == ruleCode && row.WindowBucket == bucket, ct);
        var now = time.GetUtcNow();
        if (signal is null)
        {
            signal = new PlayerSecuritySignal
            {
                SignalId = Guid.CreateVersion7(),
                PlayerId = playerId,
                RuleCode = ruleCode,
                WindowBucket = bucket,
                FirstSeenAt = now,
            };
            db.Add(signal);
            logger.LogInformation("Security signal {RuleCode} opened for player {PlayerId}", ruleCode, playerId);
        }
        signal.RuleVersion = ruleVersion;
        signal.Severity = severity;
        signal.WindowStart = at - windowLength;
        signal.WindowEnd = at;
        signal.SampleCount = samples;
        signal.ObservedValue = observed;
        signal.Threshold = threshold;
        signal.RepresentativeAttemptIds = attemptIds;
        signal.LastSeenAt = now;
        signal.Occurrences++;
        await db.SaveChangesAsync(ct);
    }
}
