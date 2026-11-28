namespace SocialKit.Community;

public sealed class CommunityOptions
{
    /// <summary>Liên kết nhóm Facebook; trống thì Client ẩn nút vào nhóm.</summary>
    public string? GroupUrl { get; set; }

    /// <summary>Mã ghim trong nhóm để xác nhận đã vào nhóm; trống thì tắt bước xác nhận.</summary>
    public string? GroupCode { get; set; }

    /// <summary>Địa chỉ trang web được chia sẻ (cần thẻ Open Graph); trống thì Client ẩn nút chia sẻ.</summary>
    public string? ShareUrl { get; set; }

    /// <summary>Số lần bấm "Chia sẻ" tối đa mỗi người mỗi ngày được tính; vượt quá thì vẫn trả thành công nhưng không đếm thêm.</summary>
    public int MaxSharesPerDay { get; set; } = 10;

    /// <summary>Số lần nhập mã sai tối đa mỗi giờ.</summary>
    public int MaxCodeAttemptsPerHour { get; set; } = 10;
}

public static class ShareKinds
{
    public const string Feed = "feed";
    public const string Group = "group";

    public static bool IsValid(string? kind) => kind is Feed or Group;
}

public sealed record ShareCounts(int Feed, int Group);

public sealed record CommunityView(
    string? AvatarUrl,
    string? AvatarProvider,
    string? GroupUrl,
    string? ShareUrl,
    bool GroupCodeEnabled,
    bool JoinLinkClicked,
    bool GroupVerified,
    ShareCounts Shares);

public sealed record ShareRequest(string Kind);

public sealed record VerifyGroupRequest(string Code);

public sealed record DailyShares(string Date, int Feed, int Group);

public sealed record CommunityStats(
    int Players,
    int GoogleAccounts,
    int FacebookAccounts,
    int WithAvatar,
    int JoinLinkClickers,
    int GroupVerified,
    ShareCounts Shares,
    int Sharers,
    IReadOnlyList<DailyShares> Last7Days);

/// <summary>Người dùng hiện tại của request (ứng dụng chủ cài đặt, thường bọc <c>ICurrentPlayer</c> của mình).</summary>
public interface ISocialCurrentUser
{
    Guid UserId { get; }
}

/// <summary>Số liệu tài khoản mà SocialKit không tự biết (bảng tài khoản thuộc ứng dụng chủ), dùng cho thống kê.</summary>
public interface ISocialAccountStats
{
    Task<SocialAccountCounts> CountsAsync(CancellationToken ct);
}

public sealed record SocialAccountCounts(int Players, int GoogleAccounts, int FacebookAccounts);
