using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SocialKit.Auth;
using SocialKit.Community;

namespace SocialKit;

/// <summary>Cách ứng dụng chủ nối SocialKit vào endpoint của mình.</summary>
public sealed class SocialKitEndpointOptions
{
    /// <summary>Bọc dữ liệu thành công theo envelope của ứng dụng (ví dụ <c>ApiResult.Ok</c>). Mặc định trả JSON nguyên dữ liệu.</summary>
    public Func<object, IResult> Ok { get; set; } = data => Results.Ok(data);

    /// <summary>Gọi trên mọi route của SocialKit, thường là <c>RequireAuthorization()</c>.</summary>
    public Action<RouteHandlerBuilder>? Configure { get; set; }

    /// <summary>Tiền tố route. Client mặc định gọi /api/v1/me/community và /api/v1/me/avatar.</summary>
    public string Prefix { get; set; } = "/api/v1";
}

public static class SocialKitModule
{
    /// <summary>
    /// Đăng ký dịch vụ. Ứng dụng chủ phải tự đăng ký <see cref="ISocialCurrentUser"/> và <see cref="ISocialAccountStats"/> (scoped), và dùng
    /// <typeparamref name="TContext"/> làm DbContext chứa bảng của SocialKit (xem CommunityEntities.cs).
    /// Cấu hình: mục <c>Community</c> (GroupUrl, GroupCode, ShareUrl, ...) và mục <c>SocialKit:Firebase</c> (ProjectId, AllowedProviders).
    /// </summary>
    public static IServiceCollection AddSocialKit<TContext>(
        this IServiceCollection services, IConfiguration configuration, string communitySection = "Community")
        where TContext : DbContext
    {
        services.Configure<CommunityOptions>(configuration.GetSection(communitySection));
        services.Configure<FirebaseVerifierOptions>(configuration.GetSection("SocialKit:Firebase"));
        services.AddScoped<DbContext>(provider => provider.GetRequiredService<TContext>());
        services.AddSingleton<CodeAttemptLimiter>();
        services.AddScoped<CommunityService>();
        services.AddHttpClient<IAvatarService, AvatarService>();
        services.AddHttpClient<IFirebaseTokenVerifier, JwksFirebaseTokenVerifier>();
        return services;
    }

    /// <summary>Map GET /me/community, POST /me/community/join-click|verify-group|share, GET /me/avatar.</summary>
    public static IEndpointRouteBuilder MapSocialKit(this IEndpointRouteBuilder app, SocialKitEndpointOptions? options = null)
    {
        options ??= new SocialKitEndpointOptions();
        void Add(RouteHandlerBuilder route) => options.Configure?.Invoke(route);
        var prefix = options.Prefix.TrimEnd('/');

        Add(app.MapGet($"{prefix}/me/community", async (CommunityService community, ISocialCurrentUser user, CancellationToken ct) =>
            options.Ok(await community.GetAsync(user.UserId, ct))));
        Add(app.MapPost($"{prefix}/me/community/join-click", async (CommunityService community, ISocialCurrentUser user, CancellationToken ct) =>
            options.Ok(await community.JoinClickAsync(user.UserId, ct))));
        Add(app.MapPost($"{prefix}/me/community/verify-group", async (VerifyGroupRequest request, CommunityService community, ISocialCurrentUser user, CancellationToken ct) =>
            options.Ok(await community.VerifyGroupAsync(user.UserId, request.Code, ct))));
        Add(app.MapPost($"{prefix}/me/community/share", async (ShareRequest request, CommunityService community, ISocialCurrentUser user, CancellationToken ct) =>
            options.Ok(await community.ShareAsync(user.UserId, request.Kind, ct))));
        Add(app.MapGet($"{prefix}/me/avatar", async (CommunityService community, ISocialCurrentUser user, CancellationToken ct) =>
        {
            var avatar = await community.AvatarAsync(user.UserId, ct);
            return avatar is null
                ? Results.NotFound()
                : Results.File(avatar.Value.Data, avatar.Value.ContentType, lastModified: avatar.Value.UpdatedAt);
        }));
        return app;
    }
}
