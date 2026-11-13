using System.Collections.Concurrent;
using System.Security.Claims;
using System.Text.Encodings.Web;
using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Persistence;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace FishingOnline.Api.Modules.Identity;

public static class IdentityModule
{
    public const string SelectorScheme = "PlayerAuth";
    private const string DevScheme = "DevBypass";
    private const string DevHeader = "X-Dev-Player";
    /// <summary>WebSocket trên trình duyệt không gửi được header tuỳ ý nên hub nhận thêm query này (chỉ khi DevBypass).</summary>
    private const string DevQuery = "dev_player";
    private const string RefreshCookie = "fo_refresh";
    private const string RefreshCookiePath = "/api/v1/auth";
    private const string HubPath = "/hubs/game";

    public static IServiceCollection AddIdentityModule(this IServiceCollection services, IConfiguration configuration, bool hasDatabase)
    {
        services.Configure<AuthOptions>(configuration.GetSection("Auth"));
        services.AddHttpContextAccessor();
        services.AddSingleton<SigningKeyHolder>();
        services.AddSingleton<JwtIssuer>();
        services.AddSingleton<DevPlayerCache>();
        services.AddSingleton<IAuthorizationMiddlewareResultHandler, EnvelopeAuthorizationResultHandler>();
        services.AddScoped<ICurrentPlayer, HttpCurrentPlayer>();
        services.AddHttpClient<IFirebaseTokenVerifier, JwksFirebaseTokenVerifier>();
        if (hasDatabase) services.AddScoped<AuthService>();

        services.AddAuthentication(SelectorScheme)
            .AddPolicyScheme(SelectorScheme, SelectorScheme, scheme => scheme.ForwardDefaultSelector = context =>
            {
                var bypass = context.RequestServices.GetRequiredService<IOptions<AuthOptions>>().Value.DevBypass;
                return bypass
                    && context.RequestServices.GetRequiredService<IHostEnvironment>().IsDevelopment()
                    && DevPlayerValue(context.Request) is not null
                    ? DevScheme
                    : JwtBearerDefaults.AuthenticationScheme;
            })
            .AddScheme<AuthenticationSchemeOptions, DevBypassHandler>(DevScheme, _ => { })
            .AddJwtBearer();
        services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<SigningKeyHolder>((options, keys) =>
            {
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidIssuer = JwtIssuer.Issuer,
                    ValidAudience = JwtIssuer.Audience,
                    IssuerSigningKey = keys.Key,
                    ClockSkew = TimeSpan.FromSeconds(5),
                };
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        if (context.HttpContext.Request.Path.StartsWithSegments(HubPath)
                            && context.Request.Query["access_token"] is { Count: > 0 } token)
                            context.Token = token;
                        return Task.CompletedTask;
                    },
                    OnTokenValidated = async context =>
                    {
                        var db = context.HttpContext.RequestServices.GetService<GameDbContext>();
                        if (db is null) return;
                        var now = context.HttpContext.RequestServices.GetRequiredService<TimeProvider>().GetUtcNow();
                        if (!await AccessTokenChecks.IsStillValidAsync(db, context.Principal!, now, context.HttpContext.RequestAborted))
                            context.Fail("Session is no longer valid.");
                    },
                };
            });
        services.AddAuthorization();
        return services;
    }

    public static WebApplication MapIdentityModule(this WebApplication app)
    {
        var auth = app.MapGroup("/api/v1/auth");
        auth.MapPost("/login", async (LoginRequest request, AuthService service, HttpContext http) =>
        {
            if (string.IsNullOrWhiteSpace(request.FirebaseIdToken)) throw new GameException(ErrorCatalog.ValidationFailed);
            var outcome = await service.LoginAsync(request.FirebaseIdToken, request.RememberMe, http.RequestAborted);
            WriteRefreshCookie(http, outcome.Tokens);
            return ApiResult.Ok(new LoginResponse(outcome.Tokens.AccessToken, outcome.Tokens.ExpiresAt, outcome.IsNew, outcome.Player));
        });
        auth.MapPost("/refresh", async (AuthService service, HttpContext http) =>
        {
            var tokens = await service.RefreshAsync(http.Request.Cookies[RefreshCookie], http.RequestAborted);
            WriteRefreshCookie(http, tokens);
            return ApiResult.Ok(new RefreshResponse(tokens.AccessToken, tokens.ExpiresAt));
        });
        auth.MapPost("/logout", async (AuthService service, HttpContext http) =>
        {
            await service.LogoutAsync(http.Request.Cookies[RefreshCookie], http.RequestAborted);
            http.Response.Cookies.Delete(RefreshCookie, CookieOptions(expires: null));
            return Results.NoContent();
        });

        var me = app.MapGroup("/api/v1/me").RequireAuthorization();
        me.MapGet("", async (AuthService service, ICurrentPlayer player, CancellationToken ct) =>
            ApiResult.Ok(await service.GetProfileAsync(player.PlayerId, ct)));
        me.MapPut("/display-name", async (DisplayNameRequest request, AuthService service, ICurrentPlayer player, CancellationToken ct) =>
            ApiResult.Ok(await service.RenameAsync(player.PlayerId, request.DisplayName, ct)));
        return app;
    }

    private static void WriteRefreshCookie(HttpContext http, IssuedTokens tokens) =>
        http.Response.Cookies.Append(RefreshCookie, tokens.RefreshToken, CookieOptions(tokens.RefreshExpiresAt));

    private static CookieOptions CookieOptions(DateTimeOffset? expires) => new()
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.Lax,
        Path = RefreshCookiePath,
        Expires = expires,
    };

    /// <summary>Player id test từ header X-Dev-Player, hoặc query dev_player cho hub (Development + DevBypass).</summary>
    private static string? DevPlayerValue(HttpRequest request)
    {
        if (request.Headers.TryGetValue(DevHeader, out var header) && !string.IsNullOrEmpty(header)) return header.ToString();
        if (request.Path.StartsWithSegments(HubPath)
            && request.Query.TryGetValue(DevQuery, out var query)
            && !string.IsNullOrEmpty(query)) return query.ToString();
        return null;
    }

    /// <summary>Chỉ dùng cho test tự động trong Development khi bật <c>Auth:DevBypass</c>.</summary>
    private sealed class DevBypassHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        DevPlayerCache cache)
        : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
    {
        protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            if (!Guid.TryParse(DevPlayerValue(Request), out var playerId)) return AuthenticateResult.Fail("Invalid dev player.");

            var service = Context.RequestServices.GetService<AuthService>();
            var accountId = service is null ? playerId : await cache.GetOrCreateAsync(playerId, service, Context.RequestAborted);
            var identity = new ClaimsIdentity(
                [new Claim(JwtRegisteredClaimNames.Sub, accountId.ToString()), new Claim(PlayerClaims.PlayerId, playerId.ToString())],
                Scheme.Name);
            return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name));
        }
    }
}

public sealed class DevPlayerCache
{
    private readonly ConcurrentDictionary<Guid, Guid> accounts = new();

    public async Task<Guid> GetOrCreateAsync(Guid playerId, AuthService service, CancellationToken ct)
    {
        if (accounts.TryGetValue(playerId, out var accountId)) return accountId;
        accountId = await service.EnsureDevPlayerAsync(playerId, ct);
        accounts[playerId] = accountId;
        return accountId;
    }
}

/// <summary>Trả envelope lỗi thay cho 401/403 rỗng.</summary>
public sealed class EnvelopeAuthorizationResultHandler : IAuthorizationMiddlewareResultHandler
{
    private readonly AuthorizationMiddlewareResultHandler fallback = new();

    public async Task HandleAsync(RequestDelegate next, HttpContext context, AuthorizationPolicy policy, PolicyAuthorizationResult authorizeResult)
    {
        if (authorizeResult.Succeeded)
        {
            await fallback.HandleAsync(next, context, policy, authorizeResult);
            return;
        }
        var code = authorizeResult.Forbidden ? "FORBIDDEN" : "UNAUTHENTICATED";
        var definition = ErrorCatalog.Get(code);
        context.Response.StatusCode = definition.HttpStatus;
        await context.Response.WriteAsJsonAsync(new ApiErrorEnvelope(
            new ApiErrorBody(code, definition.Message, definition.Retryable), ApiResult.CurrentTraceId));
    }
}
