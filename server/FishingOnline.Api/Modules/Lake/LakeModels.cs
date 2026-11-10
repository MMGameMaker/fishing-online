using FishingOnline.Api.Modules.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FishingOnline.Api.Modules.Lake;

public sealed class SeatRow
{
    public string SeatId { get; set; } = string.Empty;
    public int Number { get; set; }
}

/// <summary>Một lần ngồi ghế. Không có hạn riêng: ghế kết thúc khi rời ghế, hết vé, trượt cá hoặc mất kết nối quá lâu.</summary>
public sealed class SeatSessionRow
{
    public Guid Id { get; set; }
    public string SeatId { get; set; } = string.Empty;
    public Guid PlayerId { get; set; }
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset? EndedAt { get; set; }
    public string? EndReason { get; set; }
    public DateTimeOffset? DisconnectedAt { get; set; }
    public string ConfigVersion { get; set; } = string.Empty;
}

/// <summary>Hạn vé của player (SPEC 2.2). Vé không gắn với ghế.</summary>
public sealed class TicketRow
{
    public Guid PlayerId { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }

    /// <summary>Tổng số phút đã mua từ trước tới nay.</summary>
    public int PurchasedMinutes { get; set; }

    public int TicketVersion { get; set; }
    public string PriceVersion { get; set; } = string.Empty;
}

/// <summary>Biên nhận mua vé, giữ đơn giá tại thời điểm thu tiền.</summary>
public sealed class TicketPurchaseRow
{
    public Guid Id { get; set; }
    public Guid PlayerId { get; set; }
    public int Quantity { get; set; }
    public int AddedMinutes { get; set; }
    public long UnitPriceGold { get; set; }
    public long TotalGold { get; set; }
    public string PriceVersion { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAtAfter { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

/// <summary>Mốc Server còn sống gần nhất, để tính thời gian tắt máy khi khởi động lại.</summary>
public sealed class LakeRuntimeRow
{
    public int Id { get; set; }
    public DateTimeOffset LastAliveAt { get; set; }
}

public sealed class SeatRowConfig : IEntityTypeConfiguration<SeatRow>
{
    public void Configure(EntityTypeBuilder<SeatRow> entity)
    {
        entity.ToTable("seats");
        entity.HasKey(seat => seat.SeatId);
        entity.Property(seat => seat.SeatId).HasMaxLength(32);
    }
}

public sealed class SeatSessionRowConfig : IEntityTypeConfiguration<SeatSessionRow>
{
    public const string OpenSeatIndex = "IX_seat_sessions_open_seat";
    public const string OpenPlayerIndex = "IX_seat_sessions_open_player";

    public void Configure(EntityTypeBuilder<SeatSessionRow> entity)
    {
        entity.ToTable("seat_sessions");
        entity.HasKey(session => session.Id);
        entity.Property(session => session.SeatId).HasMaxLength(32);
        entity.Property(session => session.EndReason).HasMaxLength(32);
        entity.Property(session => session.ConfigVersion).HasMaxLength(128);
        entity.HasIndex(session => session.SeatId).IsUnique().HasFilter("\"EndedAt\" IS NULL").HasDatabaseName(OpenSeatIndex);
        entity.HasIndex(session => session.PlayerId).IsUnique().HasFilter("\"EndedAt\" IS NULL").HasDatabaseName(OpenPlayerIndex);
    }
}

public sealed class TicketRowConfig : IEntityTypeConfiguration<TicketRow>
{
    public void Configure(EntityTypeBuilder<TicketRow> entity)
    {
        entity.ToTable("tickets");
        entity.HasKey(ticket => ticket.PlayerId);
        entity.Property(ticket => ticket.PriceVersion).HasMaxLength(64);
    }
}

public sealed class TicketPurchaseRowConfig : IEntityTypeConfiguration<TicketPurchaseRow>
{
    public void Configure(EntityTypeBuilder<TicketPurchaseRow> entity)
    {
        entity.ToTable("ticket_purchases");
        entity.HasKey(purchase => purchase.Id);
        entity.Property(purchase => purchase.PriceVersion).HasMaxLength(64);
        entity.HasIndex(purchase => purchase.PlayerId);
    }
}

public sealed class LakeRuntimeRowConfig : IEntityTypeConfiguration<LakeRuntimeRow>
{
    public void Configure(EntityTypeBuilder<LakeRuntimeRow> entity)
    {
        entity.ToTable("lake_runtime");
        entity.HasKey(runtime => runtime.Id);
        entity.Property(runtime => runtime.Id).ValueGeneratedNever();
    }
}

public static class SeatEndReasons
{
    public const string LeftSeat = "left_seat";
    public const string LeftLake = "left_lake";
    public const string MissedBite = "missed_bite";
    public const string TicketExpired = "ticket_expired";
    public const string DisconnectTimeout = "disconnect_timeout";
}

/// <summary>Ghế đang ngồi và hạn vé lúc đọc; vé có thể đã hết dù ghế còn (đang câu nốt minigame).</summary>
public sealed record SeatSessionInfo(Guid SessionId, string SeatId, DateTimeOffset? TicketExpiresAt);

public sealed record SeatSessionEnded(Guid PlayerId, Guid SessionId, string SeatId, string Reason);

public interface ISeatSessions
{
    /// <summary>Chỉ trả khi player đang ngồi ghế.</summary>
    Task<SeatSessionInfo?> GetActiveAsync(Guid playerId, CancellationToken ct);

    Task<bool> EndAsync(Guid playerId, string reason, CancellationToken ct);

    /// <summary>BE-E hủy lần câu khi nhận.</summary>
    event Func<SeatSessionEnded, Task>? SessionEnded;

    event Func<Guid, Task>? PlayerDisconnected;
}

public sealed record MyTicketView(DateTimeOffset ExpiresAt, int PurchasedMinutes, int TicketVersion, string PriceVersion);

public sealed record MySeatView(string SeatId, Guid SessionId, DateTimeOffset SitAt);

public sealed record SeatEndedView(string SeatId, bool Ended, string Reason);

public sealed record SeatView(string SeatId, string State, Guid? OccupantPlayerId);

public sealed record TicketPurchaseResult(MyTicketView Ticket, string Gold, string ChargedGold);

public sealed record SitDownResult(MySeatView Seat);

public sealed record PlayerView(
    Guid PlayerId, string DisplayName, string SkinId, string RodId, double X, double Y, string Dir, string? SeatId, bool Fishing);

public sealed record PlayerLeftView(Guid PlayerId);

public sealed record PlayerMovedView(Guid PlayerId, double X, double Y, string Dir, long Seq);

public sealed record PositionCorrectedView(double X, double Y, long Seq);

public sealed record JoinLakeCommand(string RequestId) : IHubCommand;

public sealed record MoveCommand(string RequestId, long Seq, double X, double Y, string Dir) : IHubCommand;

public sealed record BuyTicketCommand(string RequestId, int Quantity, string ExpectedPriceVersion) : IHubCommand;

public sealed record SitDownCommand(string RequestId, string SeatId) : IHubCommand;

public sealed record LeaveSeatCommand(string RequestId) : IHubCommand;
