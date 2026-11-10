using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FishingOnline.Api.Modules.Wallet;

public interface IWallet
{
    /// <summary>Chạy trong transaction của caller (DbContext dùng chung). Ném <see cref="InsufficientGoldException"/>.</summary>
    Task<long> DebitAsync(Guid playerId, long amount, string reason, string refId, CancellationToken ct);

    Task<long> CreditAsync(Guid playerId, long amount, string reason, string refId, CancellationToken ct);

    Task<long> GetBalanceAsync(Guid playerId, CancellationToken ct);
}

public sealed class InsufficientGoldException() : GameException("INSUFFICIENT_GOLD");

public static class LedgerReasons
{
    public const string GrantNewPlayer = "grant_new_player";
    public const string TicketPurchase = "ticket_purchase";

    /// <summary>Lý do của luật thuê ghế trước SPEC 0.9; chỉ còn trong ledger cũ.</summary>
    public const string SeatPurchase = "seat_purchase";

    /// <summary>Lý do của luật thuê ghế trước SPEC 0.9; chỉ còn trong ledger cũ.</summary>
    public const string SeatExtension = "seat_extension";
    public const string BuyRod = "buy_rod";
    public const string SellFish = "sell_fish";
    public const string AdminAdjust = "admin_adjust";

    public static readonly IReadOnlySet<string> All = new HashSet<string>
    {
        GrantNewPlayer, TicketPurchase, SeatPurchase, SeatExtension, BuyRod, SellFish, AdminAdjust,
    };
}

public sealed class WalletRow
{
    public Guid PlayerId { get; set; }
    public long Gold { get; set; }
    public int Version { get; set; }
}

public sealed class LedgerEntry
{
    public Guid Id { get; set; }
    public Guid PlayerId { get; set; }
    public long Delta { get; set; }
    public long BalanceAfter { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string RefId { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class WalletRowConfig : IEntityTypeConfiguration<WalletRow>
{
    public void Configure(EntityTypeBuilder<WalletRow> entity)
    {
        entity.ToTable("wallets", table => table.HasCheckConstraint("CK_wallets_gold_non_negative", "\"Gold\" >= 0"));
        entity.HasKey(wallet => wallet.PlayerId);
    }
}

public sealed class LedgerEntryConfig : IEntityTypeConfiguration<LedgerEntry>
{
    public void Configure(EntityTypeBuilder<LedgerEntry> entity)
    {
        entity.ToTable("ledger_entries");
        entity.HasKey(ledger => ledger.Id);
        entity.Property(ledger => ledger.Reason).HasMaxLength(32);
        entity.Property(ledger => ledger.RefId).HasMaxLength(128);
        entity.HasIndex(ledger => new { ledger.PlayerId, ledger.CreatedAt });
    }
}

public sealed class WalletService(GameDbContext db, TimeProvider time) : IWallet
{
    public Task<long> DebitAsync(Guid playerId, long amount, string reason, string refId, CancellationToken ct) =>
        ApplyAsync(playerId, -amount, amount, reason, refId, ct);

    public Task<long> CreditAsync(Guid playerId, long amount, string reason, string refId, CancellationToken ct) =>
        ApplyAsync(playerId, amount, amount, reason, refId, ct);

    public async Task<long> GetBalanceAsync(Guid playerId, CancellationToken ct) =>
        await db.Set<WalletRow>().AsNoTracking().Where(wallet => wallet.PlayerId == playerId)
            .Select(wallet => (long?)wallet.Gold).SingleOrDefaultAsync(ct) ?? 0;

    private async Task<long> ApplyAsync(Guid playerId, long delta, long amount, string reason, string refId, CancellationToken ct)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(amount);
        if (!LedgerReasons.All.Contains(reason)) throw new ArgumentException($"Unknown ledger reason '{reason}'.", nameof(reason));

        await using var owned = db.Database.CurrentTransaction is null ? await db.Database.BeginTransactionAsync(ct) : null;

        await db.Database.ExecuteSqlInterpolatedAsync(
            $"""insert into game.wallets ("PlayerId", "Gold", "Version") values ({playerId}, 0, 0) on conflict do nothing""", ct);
        var wallet = await db.Set<WalletRow>()
            .FromSqlInterpolated($"""select * from game.wallets where "PlayerId" = {playerId} for update""")
            .AsNoTracking()
            .SingleAsync(ct);

        var balance = wallet.Gold + delta;
        if (balance < 0) throw new InsufficientGoldException();

        await db.Set<WalletRow>().Where(row => row.PlayerId == playerId).ExecuteUpdateAsync(
            setters => setters.SetProperty(row => row.Gold, balance).SetProperty(row => row.Version, row => row.Version + 1), ct);
        db.Add(new LedgerEntry
        {
            Id = Guid.CreateVersion7(),
            PlayerId = playerId,
            Delta = delta,
            BalanceAfter = balance,
            Reason = reason,
            RefId = refId,
            CreatedAt = time.GetUtcNow(),
        });
        await db.SaveChangesAsync(ct);
        if (owned is not null) await owned.CommitAsync(ct);
        return balance;
    }
}

public static class WalletModule
{
    public static IServiceCollection AddWallet(this IServiceCollection services) =>
        services.AddScoped<IWallet, WalletService>();
}
