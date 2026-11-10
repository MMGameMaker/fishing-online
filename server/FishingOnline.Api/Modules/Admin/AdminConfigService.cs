using System.Text.Json;
using System.Text.Json.Nodes;
using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Modules.Config;
using FishingOnline.Api.Modules.Fishing;
using FishingOnline.Api.Persistence;
using FishingOnline.Domain.Config;
using Microsoft.EntityFrameworkCore;

namespace FishingOnline.Api.Modules.Admin;

public sealed record CreateDraftRequest(string BaseVersion);

public sealed record UpdateDraftRequest(int ExpectedRevision, JsonElement Document);

public sealed record PublishDraftRequest(int ExpectedRevision, string ExpectedActiveVersion);

public sealed record ValidationIssue(string Path, string Message);

public sealed record ValidationReport(bool Valid, IReadOnlyList<ValidationIssue> Errors);

public sealed record DraftView(Guid DraftId, string BaseVersion, int Revision, string Status, string? PublishedVersion, string UpdatedBy, DateTimeOffset UpdatedAt, JsonElement Document);

public sealed record ConfigVersionView(string Version, bool IsActive, DateTimeOffset PublishedAt, string PublishedBy);

public sealed record PublishResult(string Version, string PreviousVersion);

/// <summary>
/// AD-02. Publish tạo version mới và đổi version active; phiên ghế, lần câu đã pin vẫn đọc version cũ qua
/// <see cref="IConfigProvider.Get"/>. Rollback là tạo draft từ version cũ rồi publish thành version mới.
/// </summary>
public sealed class AdminConfigService(GameDbContext db, ConfigProvider provider, FishPopulation population, TimeProvider time)
{
    public async Task<IReadOnlyList<ConfigVersionView>> VersionsAsync(CancellationToken ct) =>
        await db.Set<ConfigVersionRow>().AsNoTracking().OrderByDescending(row => row.PublishedAt)
            .Select(row => new ConfigVersionView(row.Version, row.IsActive, row.PublishedAt, row.PublishedBy)).ToListAsync(ct);

    public async Task<DraftView> CreateDraftAsync(string actor, string baseVersion, CancellationToken ct)
    {
        var source = await db.Set<ConfigVersionRow>().AsNoTracking().SingleOrDefaultAsync(row => row.Version == baseVersion, ct)
            ?? throw new GameException(ErrorCatalog.ValidationFailed, message: "Unknown base version.");
        var draft = new ConfigDraftRow
        {
            Id = Guid.CreateVersion7(),
            BaseVersion = baseVersion,
            DocumentJson = source.Json,
            Revision = 1,
            CreatedBy = actor,
            UpdatedBy = actor,
            UpdatedAt = time.GetUtcNow(),
        };
        db.Add(draft);
        AdminAudit.Add(db, time, actor, "config.draft.create", draft.Id.ToString(), before: null, after: new { baseVersion });
        await db.SaveChangesAsync(ct);
        return View(draft);
    }

    public async Task<DraftView> GetDraftAsync(Guid draftId, CancellationToken ct) =>
        View(await db.Set<ConfigDraftRow>().AsNoTracking().SingleOrDefaultAsync(row => row.Id == draftId, ct)
            ?? throw new GameException(ErrorCatalog.ValidationFailed, message: "Unknown draft."));

    public async Task<DraftView> UpdateDraftAsync(string actor, Guid draftId, UpdateDraftRequest request, CancellationToken ct)
    {
        if (request.Document.ValueKind != JsonValueKind.Object) throw new GameException(ErrorCatalog.ValidationFailed);
        var json = request.Document.GetRawText();
        // Chỉ ghi khi revision vẫn khớp: hai admin sửa cùng lúc thì người sau nhận 409.
        var updated = await db.Set<ConfigDraftRow>()
            .Where(row => row.Id == draftId && row.Status == "open" && row.Revision == request.ExpectedRevision)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(row => row.DocumentJson, json)
                .SetProperty(row => row.Revision, row => row.Revision + 1)
                .SetProperty(row => row.UpdatedBy, actor)
                .SetProperty(row => row.UpdatedAt, time.GetUtcNow()), ct);
        if (updated == 0) throw new GameException("STATE_CONFLICT", message: "Draft was changed by someone else or is closed.");
        AdminAudit.Add(db, time, actor, "config.draft.update", draftId.ToString(), before: new { request.ExpectedRevision }, after: null);
        await db.SaveChangesAsync(ct);
        return await GetDraftAsync(draftId, ct);
    }

    public async Task<ValidationReport> ValidateDraftAsync(Guid draftId, CancellationToken ct)
    {
        var draft = await GetDraftAsync(draftId, ct);
        return Validate(draft.Document.GetRawText(), out _);
    }

    public async Task<PublishResult> PublishAsync(string actor, Guid draftId, PublishDraftRequest request, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var draft = await db.Set<ConfigDraftRow>()
            .FromSqlInterpolated($"""select * from game.config_drafts where "Id" = {draftId} for update""")
            .AsTracking().SingleOrDefaultAsync(ct) ?? throw new GameException(ErrorCatalog.ValidationFailed, message: "Unknown draft.");
        var active = await db.Set<ConfigVersionRow>()
            .FromSqlInterpolated($"""select * from game.config_versions where "IsActive" for update""")
            .AsTracking().SingleAsync(ct);
        if (draft.Status != "open" || draft.Revision != request.ExpectedRevision || active.Version != request.ExpectedActiveVersion)
            throw new GameException("STATE_CONFLICT", message: "Draft or active version has changed.");

        var report = Validate(draft.DocumentJson, out var parsed);
        if (!report.Valid)
            throw new GameException(ErrorCatalog.ValidationFailed, message: string.Join(" ", report.Errors.Select(error => $"{error.Path}: {error.Message}")));

        var now = time.GetUtcNow();
        // Phần đầu Guid v7 là thời gian, nên lấy phần ngẫu nhiên ở cuối để hai draft tạo cùng lúc không trùng tên.
        var version = $"cfg-{now:yyyyMMdd-HHmmss}-{draftId.ToString("N")[^8..]}";
        var config = parsed! with { ConfigVersion = version };
        active.IsActive = false;
        await db.SaveChangesAsync(ct);
        db.Add(new ConfigVersionRow
        {
            Version = version, Json = GameplayConfigJson.Serialize(config), PublishedAt = now, PublishedBy = actor, IsActive = true,
        });
        draft.Status = "published";
        draft.PublishedVersion = version;
        AdminAudit.Add(db, time, actor, "config.publish", version, before: new { version = active.Version }, after: new { version, draftId });
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        provider.Store(config, isActive: true);
        await population.EnsureSeededAsync(ct);
        return new PublishResult(version, active.Version);
    }

    private static ValidationReport Validate(string json, out GameplayConfig? config)
    {
        config = null;
        try
        {
            config = GameplayConfigJson.Parse(json);
        }
        catch (JsonException exception)
        {
            return new ValidationReport(false, [new ValidationIssue(exception.Path ?? "$", exception.Message)]);
        }

        var errors = GameplayConfigValidator.Validate(config).Select(error =>
        {
            var split = error.IndexOf(':');
            return split > 0 ? new ValidationIssue(error[..split], error[(split + 1)..].Trim()) : new ValidationIssue("$", error);
        }).ToArray();
        return new ValidationReport(errors.Length == 0, errors);
    }

    private static DraftView View(ConfigDraftRow row) => new(
        row.Id, row.BaseVersion, row.Revision, row.Status, row.PublishedVersion, row.UpdatedBy, row.UpdatedAt,
        JsonDocument.Parse(row.DocumentJson).RootElement.Clone());
}
