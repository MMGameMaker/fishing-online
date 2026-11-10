using System.Text.Json;
using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Modules.Config;
using FishingOnline.Api.Modules.Fishing;
using FishingOnline.Api.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FishingOnline.Api.Modules.Admin;

public sealed record StockingLineInput(string SpeciesId, int Quantity);

public sealed record StockingInput(string LakeId, IReadOnlyList<StockingLineInput> Lines, DateTimeOffset? ScheduledAt, string? TimeZone, string? Note);

public sealed record StockingEditRequest(int ExpectedRevision, IReadOnlyList<StockingLineInput> Lines, DateTimeOffset? ScheduledAt, string? TimeZone, string? Note);

public sealed record RevisionRequest(int ExpectedRevision);

public sealed record StockingBatchView(
    Guid BatchId, string LakeId, string Status, DateTimeOffset? ScheduledAt, string? TimeZone, string? Note,
    IReadOnlyList<StockingLineInput> Lines, int SpeciesCount, int TotalFish, int Revision,
    string CreatedBy, DateTimeOffset CreatedAt, string UpdatedBy, DateTimeOffset UpdatedAt,
    DateTimeOffset? ExecutedAt, string? ExecutedBy, string? Error);

/// <summary>
/// AD-06. Đợt thả có trạng thái draft → scheduled → completed, hoặc cancelled/failed. Thực thi khóa hàng batch và
/// cộng tồn cùng một transaction, nên nhiều worker, retry hay restart cũng chỉ cộng một lần.
/// </summary>
public sealed class StockingService(
    IServiceScopeFactory scopes, FishPopulation population, IConfigProvider configs, TimeProvider time, ILogger<StockingService> logger)
{
    private const int MaxNoteLength = 500;

    public async Task<StockingBatchView> CreateAsync(string actor, Guid batchId, StockingInput input, CancellationToken ct)
    {
        var lines = Normalize(input.LakeId, input.Lines, input.Note);
        var hash = GameJson.Sha256Hex(JsonSerializer.Serialize(new { input.LakeId, lines, input.ScheduledAt, input.TimeZone, input.Note }, GameJson.Options));
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        var existing = await db.Set<StockingBatchRow>().AsNoTracking().SingleOrDefaultAsync(row => row.BatchId == batchId, ct);
        if (existing is not null)
            return existing.PayloadHash == hash ? View(existing) : throw new GameException("IDEMPOTENCY_CONFLICT");

        var now = time.GetUtcNow();
        var batch = new StockingBatchRow
        {
            BatchId = batchId,
            LakeId = input.LakeId,
            ScheduledAt = input.ScheduledAt,
            TimeZone = input.TimeZone,
            Note = input.Note,
            LinesJson = JsonSerializer.Serialize(lines, GameJson.Options),
            PayloadHash = hash,
            Revision = 1,
            CreatedBy = actor,
            CreatedAt = now,
            UpdatedBy = actor,
            UpdatedAt = now,
        };
        db.Add(batch);
        AdminAudit.Add(db, time, actor, "stocking.create", batchId.ToString(), before: null, after: lines);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException exception) when (exception.UniqueConstraint() is not null)
        {
            db.ChangeTracker.Clear();
            return await CreateAsync(actor, batchId, input, ct);
        }
        return View(batch);
    }

    public async Task<StockingBatchView> EditAsync(string actor, Guid batchId, StockingEditRequest request, CancellationToken ct) =>
        await MutateAsync(actor, batchId, request.ExpectedRevision, "stocking.edit", [StockingStatus.Draft], (batch, _) =>
        {
            var lines = Normalize(batch.LakeId, request.Lines, request.Note);
            batch.LinesJson = JsonSerializer.Serialize(lines, GameJson.Options);
            batch.ScheduledAt = request.ScheduledAt;
            batch.TimeZone = request.TimeZone;
            batch.Note = request.Note;
            return Task.CompletedTask;
        }, ct);

    public Task<StockingBatchView> ScheduleAsync(string actor, Guid batchId, int expectedRevision, CancellationToken ct) =>
        MutateAsync(actor, batchId, expectedRevision, "stocking.schedule", [StockingStatus.Draft], (batch, _) =>
        {
            if (batch.ScheduledAt is null) throw new GameException(ErrorCatalog.ValidationFailed, message: "scheduledAt is required.");
            batch.Status = StockingStatus.Scheduled;
            return Task.CompletedTask;
        }, ct);

    public Task<StockingBatchView> CancelAsync(string actor, Guid batchId, int expectedRevision, CancellationToken ct) =>
        MutateAsync(actor, batchId, expectedRevision, "stocking.cancel", [StockingStatus.Draft, StockingStatus.Scheduled], (batch, _) =>
        {
            batch.Status = StockingStatus.Cancelled;
            return Task.CompletedTask;
        }, ct);

    /// <summary>Thực thi ngay. Bấm lại khi đã xong trả kết quả cũ, không cộng thêm.</summary>
    public async Task<StockingBatchView> ExecuteNowAsync(string actor, Guid batchId, int expectedRevision, CancellationToken ct)
    {
        try
        {
            return await MutateAsync(actor, batchId, expectedRevision, "stocking.execute", [StockingStatus.Draft, StockingStatus.Scheduled],
                (batch, db) => ApplyAsync(batch, db, actor, ct), ct, completedIsSuccess: true);
        }
        catch (GameException exception) when (exception.Code != "STATE_CONFLICT")
        {
            await MarkFailedAsync(batchId, exception.Message, ct);
            throw;
        }
    }

    /// <summary>Chạy các đợt đã tới giờ, kể cả đợt quá hạn lúc Server tắt (chạy bù một lần, audit actor scheduler).</summary>
    public async Task<int> RunDueAsync(CancellationToken ct)
    {
        List<Guid> due;
        await using (var scope = scopes.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
            var now = time.GetUtcNow();
            due = await db.Set<StockingBatchRow>().AsNoTracking()
                .Where(row => row.Status == StockingStatus.Scheduled && row.ScheduledAt <= now)
                .OrderBy(row => row.ScheduledAt).Select(row => row.BatchId).ToListAsync(ct);
        }

        var executed = 0;
        foreach (var batchId in due)
        {
            try
            {
                await MutateAsync("system:scheduler", batchId, expectedRevision: null, "stocking.execute", [StockingStatus.Scheduled],
                    (batch, db) => ApplyAsync(batch, db, "system:scheduler", ct), ct, completedIsSuccess: true);
                executed++;
            }
            catch (GameException exception) when (exception.Code == "STATE_CONFLICT")
            {
                // Worker khác hoặc admin vừa xử lý đợt này.
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                logger.LogError(exception, "Stocking batch {BatchId} failed", batchId);
                await MarkFailedAsync(batchId, exception is GameException game ? game.Message : "Execution failed.", ct);
            }
        }
        return executed;
    }

    public async Task<StockingBatchView> GetAsync(Guid batchId, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        return View(await db.Set<StockingBatchRow>().AsNoTracking().SingleOrDefaultAsync(row => row.BatchId == batchId, ct)
            ?? throw new GameException(ErrorCatalog.ValidationFailed, message: "Unknown batch."));
    }

    public async Task<Page<StockingBatchView>> ListAsync(string? lakeId, string? status, DateTimeOffset? from, DateTimeOffset? to, string? cursor, int? limit, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        var query = db.Set<StockingBatchRow>().AsQueryable();
        if (lakeId is not null) query = query.Where(row => row.LakeId == lakeId);
        if (status is not null) query = query.Where(row => row.Status == status);
        if (from is not null) query = query.Where(row => row.CreatedAt >= from);
        if (to is not null) query = query.Where(row => row.CreatedAt <= to);
        var page = await AdminLookupService.PageAsync(query, row => row.BatchId, cursor, limit, ct);
        return new Page<StockingBatchView>(page.Items.Select(View).ToArray(), page.NextCursor);
    }

    private async Task ApplyAsync(StockingBatchRow batch, GameDbContext db, string actor, CancellationToken ct)
    {
        var lines = Lines(batch).Select(line => new StockLine(line.SpeciesId, line.Quantity)).ToArray();
        await population.StockInTransactionAsync(db, batch.BatchId, lines, ct);
        batch.Status = StockingStatus.Completed;
        batch.ExecutedAt = time.GetUtcNow();
        batch.ExecutedBy = actor;
        batch.Error = null;
    }

    private async Task<StockingBatchView> MutateAsync(
        string actor, Guid batchId, int? expectedRevision, string action, string[] allowed,
        Func<StockingBatchRow, GameDbContext, Task> change, CancellationToken ct, bool completedIsSuccess = false)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var batch = await db.Set<StockingBatchRow>()
            .FromSqlInterpolated($"""select * from game.fish_stocking_batches where "BatchId" = {batchId} for update""")
            .AsTracking().SingleOrDefaultAsync(ct) ?? throw new GameException(ErrorCatalog.ValidationFailed, message: "Unknown batch.");
        if (completedIsSuccess && batch.Status == StockingStatus.Completed) return View(batch);
        if (!allowed.Contains(batch.Status) || (expectedRevision is not null && batch.Revision != expectedRevision))
            throw new GameException("STATE_CONFLICT", message: "Batch was changed by someone else or cannot change from its status.");

        var before = new { batch.Status, batch.Revision, batch.ScheduledAt, Lines = Lines(batch) };
        await change(batch, db);
        batch.Revision++;
        batch.UpdatedBy = actor;
        batch.UpdatedAt = time.GetUtcNow();
        AdminAudit.Add(db, time, actor, action, batchId.ToString(), before, new { batch.Status, batch.Revision, batch.ScheduledAt, Lines = Lines(batch) });
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return View(batch);
    }

    private async Task MarkFailedAsync(Guid batchId, string error, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        await db.Set<StockingBatchRow>()
            .Where(row => row.BatchId == batchId && (row.Status == StockingStatus.Draft || row.Status == StockingStatus.Scheduled))
            .ExecuteUpdateAsync(setters => setters.SetProperty(row => row.Status, StockingStatus.Failed).SetProperty(row => row.Error, error), ct);
    }

    private StockingLineInput[] Normalize(string lakeId, IReadOnlyList<StockingLineInput>? lines, string? note)
    {
        var species = configs.Current.Fish.Select(fish => fish.SpeciesId).ToHashSet();
        if (lakeId != population.LakeId || lines is null || lines.Count == 0 || note?.Length > MaxNoteLength
            || lines.Any(line => line.Quantity <= 0 || !species.Contains(line.SpeciesId))
            || lines.Select(line => line.SpeciesId).Distinct().Count() != lines.Count)
            throw new GameException(ErrorCatalog.ValidationFailed, message: "Invalid lake, species or quantity.");
        return [.. lines.OrderBy(line => line.SpeciesId)];
    }

    private static StockingLineInput[] Lines(StockingBatchRow batch) =>
        JsonSerializer.Deserialize<StockingLineInput[]>(batch.LinesJson, GameJson.Options) ?? [];

    private static StockingBatchView View(StockingBatchRow batch)
    {
        var lines = Lines(batch);
        return new StockingBatchView(batch.BatchId, batch.LakeId, batch.Status, batch.ScheduledAt, batch.TimeZone, batch.Note,
            lines, lines.Length, lines.Sum(line => line.Quantity), batch.Revision, batch.CreatedBy, batch.CreatedAt,
            batch.UpdatedBy, batch.UpdatedAt, batch.ExecutedAt, batch.ExecutedBy, batch.Error);
    }
}

public sealed class StockingScheduler(StockingService stocking, IOptions<AdminOptions> options, ILogger<StockingScheduler> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (options.Value.StockingPollMs <= 0) return;
        using var timer = new PeriodicTimer(TimeSpan.FromMilliseconds(options.Value.StockingPollMs));
        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    await stocking.RunDueAsync(stoppingToken);
                }
                catch (Exception exception) when (exception is not OperationCanceledException)
                {
                    logger.LogError(exception, "Stocking scheduler failed");
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Host đang dừng.
        }
    }
}
