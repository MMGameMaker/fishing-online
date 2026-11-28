using FishingOnline.Api.Modules.Identity;
using FishingOnline.Api.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SocialKit;
using SocialKit.Auth;
using SocialKit.Community;

namespace FishingOnline.Api.Modules.SocialKitAdapters;

// Phần keo giữa game và SocialKit (social-kit/README.md): SocialKit không biết ICurrentPlayer, bảng tài khoản hay AuthOptions của game,
// nên game cài đặt ba giao diện nhỏ dưới đây. Dự án khác dùng SocialKit cũng viết đúng ba đoạn tương ứng.

/// <summary>Người dùng hiện tại của SocialKit chính là người chơi hiện tại của game.</summary>
public sealed class GameSocialUser(ICurrentPlayer player) : ISocialCurrentUser
{
    public Guid UserId => player.PlayerId;
}

/// <summary>Đếm người chơi và tài khoản theo nhà cung cấp cho trang thống kê.</summary>
public sealed class GameSocialAccountStats(GameDbContext db) : ISocialAccountStats
{
    public async Task<SocialAccountCounts> CountsAsync(CancellationToken ct) => new(
        await db.Players.CountAsync(ct),
        await db.Set<Account>().CountAsync(row => row.Provider == "google.com", ct),
        await db.Set<Account>().CountAsync(row => row.Provider == "facebook.com", ct));
}

public static class SocialKitAdaptersModule
{
    /// <summary>Đăng ký SocialKit cho game: DbContext, người dùng hiện tại, thống kê và Firebase project id lấy từ <c>Auth:FirebaseProjectId</c>.</summary>
    public static IServiceCollection AddGameSocialKit(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddSocialKit<GameDbContext>(configuration);
        services.AddScoped<ISocialCurrentUser, GameSocialUser>();
        services.AddScoped<ISocialAccountStats, GameSocialAccountStats>();
        // Game đã có Auth:FirebaseProjectId từ trước; mục SocialKit:Firebase:ProjectId (nếu có) được ưu tiên.
        services.PostConfigure<FirebaseVerifierOptions>(options =>
            options.ProjectId ??= configuration.GetSection("Auth")["FirebaseProjectId"]);
        return services;
    }
}
