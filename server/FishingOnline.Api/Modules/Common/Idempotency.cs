using System.Text.Json;
using FishingOnline.Api.Persistence;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FishingOnline.Api.Modules.Common;

public interface IIdempotency
{
    Task<T> RunAsync<T>(Guid playerId, string op, Guid key, string payloadHash, Func<Task<T>> action);
}

public sealed class IdempotencyReceipt
{
    public Guid PlayerId { get; set; }
    public string Operation { get; set; } = string.Empty;
    public Guid Key { get; set; }
    public string PayloadHash { get; set; } = string.Empty;
    public int StatusCode { get; set; }
    public string ResponseJson { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class IdempotencyReceiptConfig : IEntityTypeConfiguration<IdempotencyReceipt>
{
    public void Configure(EntityTypeBuilder<IdempotencyReceipt> entity)
    {
        entity.ToTable("idempotency_receipts");
        entity.HasKey(receipt => new { receipt.PlayerId, receipt.Operation, receipt.Key });
        entity.Property(receipt => receipt.Operation).HasMaxLength(64);
        entity.Property(receipt => receipt.PayloadHash).HasMaxLength(64);
        // text thay vì jsonb: jsonb đổi thứ tự key và khoảng trắng, còn lần gửi lại phải trả response giống hệt.
        entity.Property(receipt => receipt.ResponseJson).HasColumnType("text");
        entity.HasIndex(receipt => receipt.CreatedAt);
    }
}

/// <summary>
/// Receipt ghi cùng transaction với nghiệp vụ. Khóa advisory theo key làm hai request song song cùng key
/// chạy lần lượt, request sau thấy receipt của request trước. Lệnh ném lỗi thì không có receipt.
/// </summary>
public sealed class IdempotencyService(GameDbContext db, TimeProvider time) : IIdempotency
{
    public async Task<T> RunAsync<T>(Guid playerId, string op, Guid key, string payloadHash, Func<Task<T>> action)
    {
        var (receipt, outcome) = await RunCoreAsync(playerId, op, key, payloadHash, async () =>
        {
            var value = await action();
            return (StatusCodes.Status200OK, JsonSerializer.Serialize(value, GameJson.Options), value);
        });
        return receipt is null ? outcome! : JsonSerializer.Deserialize<T>(receipt.ResponseJson, GameJson.Options)!;
    }

    /// <summary>Bản cho HTTP: giữ nguyên status và JSON để lần gửi lại trả response giống hệt.</summary>
    public async Task<(int Status, string Json)> RunHttpAsync(
        Guid playerId, string op, Guid key, string payloadHash, Func<Task<(int Status, string Json)>> action)
    {
        var (receipt, outcome) = await RunCoreAsync<(int Status, string Json)>(playerId, op, key, payloadHash, async () =>
        {
            var result = await action();
            return (result.Status, result.Json, result);
        });
        return receipt is null ? outcome : (receipt.StatusCode, receipt.ResponseJson);
    }

    private async Task<(IdempotencyReceipt? Existing, T? Outcome)> RunCoreAsync<T>(
        Guid playerId, string op, Guid key, string payloadHash, Func<Task<(int Status, string Json, T Value)>> action)
    {
        await using var owned = db.Database.CurrentTransaction is null ? await db.Database.BeginTransactionAsync() : null;

        var lockKey = $"{playerId:N}|{op}|{key:N}";
        await db.Database.ExecuteSqlInterpolatedAsync($"select pg_advisory_xact_lock(hashtextextended({lockKey}, 0))");

        var existing = await db.Set<IdempotencyReceipt>().AsNoTracking()
            .SingleOrDefaultAsync(row => row.PlayerId == playerId && row.Operation == op && row.Key == key);
        if (existing is not null)
            return existing.PayloadHash == payloadHash ? (existing, default) : throw new GameException("IDEMPOTENCY_CONFLICT");

        var (status, json, value) = await action();
        db.Add(new IdempotencyReceipt
        {
            PlayerId = playerId,
            Operation = op,
            Key = key,
            PayloadHash = payloadHash,
            StatusCode = status,
            ResponseJson = json,
            CreatedAt = time.GetUtcNow(),
        });
        await db.SaveChangesAsync();
        if (owned is not null) await owned.CommitAsync();
        return (null, value);
    }
}

/// <summary>Body của route idempotent; nội dung dùng để phát hiện cùng key khác payload.</summary>
public interface IIdempotentBody;

public static class IdempotentEndpoint
{
    private const string KeyHeader = "Idempotency-Key";

    /// <summary>Bản minimal API của <c>[Idempotent("op")]</c>: bắt buộc header và phát lại response đã ghi.</summary>
    public static RouteHandlerBuilder Idempotent(this RouteHandlerBuilder builder, string operation) =>
        builder.AddEndpointFilter(async (context, next) =>
        {
            var http = context.HttpContext;
            if (!Guid.TryParse(http.Request.Headers[KeyHeader], out var key))
                throw new GameException(ErrorCatalog.ValidationFailed, message: "Idempotency-Key header is required.");

            var body = context.Arguments.OfType<IIdempotentBody>().FirstOrDefault();
            var hash = GameJson.Sha256Hex(body is null ? string.Empty : JsonSerializer.Serialize(body, body.GetType(), GameJson.Options));
            var service = http.RequestServices.GetRequiredService<IdempotencyService>();

            var (status, json) = await service.RunHttpAsync(http.User.GetPlayerId(), operation, key, hash, async () =>
            {
                var result = await next(context);
                if (result is not IValueHttpResult { Value: { } value } || result is not IStatusCodeHttpResult code)
                    throw new InvalidOperationException($"Idempotent route '{operation}' must return a value result.");
                return (code.StatusCode ?? StatusCodes.Status200OK, JsonSerializer.Serialize(value, value.GetType(), GameJson.Options));
            });
            return TypedResults.Content(json, "application/json", statusCode: status);
        });
}

/// <summary>Dọn receipt quá hạn giữ.</summary>
public sealed class IdempotencyCleanup(
    IServiceScopeFactory scopes, TimeProvider time, IConfiguration configuration, ILogger<IdempotencyCleanup> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    await PurgeAsync(stoppingToken);
                }
                catch (Exception exception) when (exception is not OperationCanceledException)
                {
                    logger.LogWarning(exception, "Idempotency cleanup failed");
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Host đang dừng.
        }
    }

    public async Task<int> PurgeAsync(CancellationToken ct)
    {
        var retentionDays = configuration.GetValue("Idempotency:RetentionDays", 7);
        var cutoff = time.GetUtcNow().AddDays(-retentionDays);
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        return await db.Set<IdempotencyReceipt>().Where(row => row.CreatedAt < cutoff).ExecuteDeleteAsync(ct);
    }
}
