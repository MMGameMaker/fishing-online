using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Modules.Identity;
using FishingOnline.Api.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace FishingOnline.Api.Modules.Admin;

public static class AdminModule
{
    public const string Scheme = "AdminJwt";
    private const string RefreshCookie = "fo_admin_refresh";
    private const string RefreshCookiePath = "/api/v1/admin/auth";
    private const string IdempotencyHeader = "Idempotency-Key";

    public static IServiceCollection AddAdmin(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<AdminOptions>(configuration.GetSection("Admin"));
        services.AddScoped<AdminAuthService>();
        services.AddScoped<AdminConfigService>();
        services.AddScoped<AdminLookupService>();
        services.AddSingleton<StockingService>();
        services.AddHostedService<AdminBootstrapper>();
        services.AddHostedService<StockingScheduler>();

        services.AddAuthentication().AddJwtBearer(Scheme, _ => { });
        services.AddOptions<JwtBearerOptions>(Scheme).Configure<SigningKeyHolder>((options, keys) =>
        {
            options.MapInboundClaims = false;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidIssuer = JwtIssuer.Issuer,
                ValidAudience = AdminAuthService.Audience,
                IssuerSigningKey = keys.Key,
                ClockSkew = TimeSpan.FromSeconds(5),
            };
            options.Events = new JwtBearerEvents
            {
                OnTokenValidated = async context =>
                {
                    var db = context.HttpContext.RequestServices.GetRequiredService<GameDbContext>();
                    var now = context.HttpContext.RequestServices.GetRequiredService<TimeProvider>().GetUtcNow();
                    if (!await AdminAuthService.IsSessionValidAsync(db, context.Principal!, now, context.HttpContext.RequestAborted))
                        context.Fail("Admin session is no longer valid.");
                },
            };
        });
        services.AddAuthorization(options =>
        {
            // Chạy cả scheme của Player: token Player được nhận diện nhưng thiếu quyền, nên trả 403 thay vì 401.
            foreach (var permission in AdminPermissions.All)
                options.AddPolicy(AdminPermissions.Policy(permission), policy => policy
                    .AddAuthenticationSchemes(Scheme, IdentityModule.SelectorScheme)
                    .RequireAuthenticatedUser()
                    .RequireClaim(AdminAuthService.PermissionClaim, permission));
        });
        return services;
    }

    public static WebApplication MapAdmin(this WebApplication app)
    {
        var auth = app.MapGroup("/api/v1/admin/auth");
        auth.MapPost("/login", async (AdminLoginRequest request, AdminAuthService service, HttpContext http) =>
        {
            if (string.IsNullOrWhiteSpace(request.FirebaseIdToken)) throw new GameException(ErrorCatalog.ValidationFailed);
            return Respond(http, await service.LoginAsync(request.FirebaseIdToken, http.RequestAborted));
        });
        auth.MapPost("/refresh", async (AdminAuthService service, HttpContext http) =>
            Respond(http, await service.RefreshAsync(http.Request.Cookies[RefreshCookie], http.RequestAborted)));
        auth.MapPost("/logout", async (AdminAuthService service, HttpContext http) =>
        {
            await service.LogoutAsync(http.Request.Cookies[RefreshCookie], http.RequestAborted);
            http.Response.Cookies.Delete(RefreshCookie, CookieOptions(expires: null));
            return Results.NoContent();
        });

        var admin = app.MapGroup("/api/v1/admin");

        admin.MapGet("/config/versions", async (AdminConfigService config, CancellationToken ct) => ApiResult.Ok(await config.VersionsAsync(ct)))
            .Require(AdminPermissions.ConfigRead);
        admin.MapGet("/config/drafts/{id:guid}", async (Guid id, AdminConfigService config, CancellationToken ct) => ApiResult.Ok(await config.GetDraftAsync(id, ct)))
            .Require(AdminPermissions.ConfigRead);
        admin.MapPost("/config/drafts", async (CreateDraftRequest request, AdminConfigService config, HttpContext http) =>
            ApiResult.Ok(await config.CreateDraftAsync(Actor(http), request.BaseVersion, http.RequestAborted))).Require(AdminPermissions.ConfigWrite);
        admin.MapPut("/config/drafts/{id:guid}", async (Guid id, UpdateDraftRequest request, AdminConfigService config, HttpContext http) =>
            ApiResult.Ok(await config.UpdateDraftAsync(Actor(http), id, request, http.RequestAborted))).Require(AdminPermissions.ConfigWrite);
        admin.MapPost("/config/drafts/{id:guid}/validate", async (Guid id, AdminConfigService config, CancellationToken ct) =>
            ApiResult.Ok(await config.ValidateDraftAsync(id, ct))).Require(AdminPermissions.ConfigRead);
        admin.MapPost("/config/drafts/{id:guid}/publish", async (Guid id, PublishDraftRequest request, AdminConfigService config, HttpContext http) =>
            ApiResult.Ok(await config.PublishAsync(Actor(http), id, request, http.RequestAborted))).Require(AdminPermissions.ConfigPublish);

        admin.MapGet("/players", async (string? query, AdminLookupService lookup, CancellationToken ct) => ApiResult.Ok(await lookup.SearchAsync(query, ct)))
            .Require(AdminPermissions.PlayerRead);
        admin.MapGet("/players/{id:guid}", async (Guid id, AdminLookupService lookup, CancellationToken ct) => ApiResult.Ok(await lookup.DetailAsync(id, ct)))
            .Require(AdminPermissions.PlayerRead);
        admin.MapGet("/players/{id:guid}/ledger", async (Guid id, string? cursor, int? limit, AdminLookupService lookup, CancellationToken ct) =>
            ApiResult.Ok(await lookup.LedgerAsync(id, cursor, limit, ct))).Require(AdminPermissions.PlayerRead);
        admin.MapGet("/players/{id:guid}/catches", async (Guid id, string? cursor, int? limit, AdminLookupService lookup, CancellationToken ct) =>
            ApiResult.Ok(await lookup.CatchesAsync(id, cursor, limit, ct))).Require(AdminPermissions.PlayerRead);
        admin.MapGet("/players/{id:guid}/attempts", async (Guid id, string? cursor, int? limit, AdminLookupService lookup, CancellationToken ct) =>
            ApiResult.Ok(await lookup.AttemptsAsync(id, cursor, limit, ct))).Require(AdminPermissions.PlayerRead);
        admin.MapGet("/players/{id:guid}/seat-sessions", async (Guid id, string? cursor, int? limit, AdminLookupService lookup, CancellationToken ct) =>
            ApiResult.Ok(await lookup.SeatSessionsAsync(id, cursor, limit, ct))).Require(AdminPermissions.PlayerRead);
        admin.MapGet("/players/{id:guid}/signals", async (Guid id, string? cursor, int? limit, AdminLookupService lookup, CancellationToken ct) =>
            ApiResult.Ok(await lookup.SignalsAsync(id, cursor, limit, ct))).Require(AdminPermissions.PlayerRead);
        admin.MapPost("/signals/{id:guid}/review", async (Guid id, SignalReviewRequest request, AdminLookupService lookup, HttpContext http) =>
            ApiResult.Ok(await lookup.ReviewSignalAsync(Actor(http), id, request, http.RequestAborted))).Require(AdminPermissions.SignalReview);
        admin.MapGet("/lake", async (AdminLookupService lookup, CancellationToken ct) => ApiResult.Ok(await lookup.LakeAsync(ct)))
            .Require(AdminPermissions.PlayerRead);
        admin.MapGet("/audit", async (string? target, string? cursor, int? limit, AdminLookupService lookup, CancellationToken ct) =>
            ApiResult.Ok(await lookup.AuditAsync(target, cursor, limit, ct))).Require(AdminPermissions.AuditRead);

        admin.MapGet("/stocking", async (string? lakeId, string? status, DateTimeOffset? from, DateTimeOffset? to, string? cursor, int? limit, StockingService stocking, CancellationToken ct) =>
            ApiResult.Ok(await stocking.ListAsync(lakeId, status, from, to, cursor, limit, ct))).Require(AdminPermissions.StockingRead);
        admin.MapGet("/stocking/{id:guid}", async (Guid id, StockingService stocking, CancellationToken ct) => ApiResult.Ok(await stocking.GetAsync(id, ct)))
            .Require(AdminPermissions.StockingRead);
        admin.MapPost("/stocking", async (StockingInput input, StockingService stocking, HttpContext http) =>
        {
            // Idempotency-Key là batchId: gửi lại cùng key không tạo đợt mới.
            if (!Guid.TryParse(http.Request.Headers[IdempotencyHeader], out var batchId))
                throw new GameException(ErrorCatalog.ValidationFailed, message: "Idempotency-Key header is required.");
            return ApiResult.Ok(await stocking.CreateAsync(Actor(http), batchId, input, http.RequestAborted));
        }).Require(AdminPermissions.StockingWrite);
        admin.MapPut("/stocking/{id:guid}", async (Guid id, StockingEditRequest request, StockingService stocking, HttpContext http) =>
            ApiResult.Ok(await stocking.EditAsync(Actor(http), id, request, http.RequestAborted))).Require(AdminPermissions.StockingWrite);
        admin.MapPost("/stocking/{id:guid}/schedule", async (Guid id, RevisionRequest request, StockingService stocking, HttpContext http) =>
            ApiResult.Ok(await stocking.ScheduleAsync(Actor(http), id, request.ExpectedRevision, http.RequestAborted))).Require(AdminPermissions.StockingWrite);
        admin.MapPost("/stocking/{id:guid}/cancel", async (Guid id, RevisionRequest request, StockingService stocking, HttpContext http) =>
            ApiResult.Ok(await stocking.CancelAsync(Actor(http), id, request.ExpectedRevision, http.RequestAborted))).Require(AdminPermissions.StockingWrite);
        admin.MapPost("/stocking/{id:guid}/execute-now", async (Guid id, RevisionRequest request, StockingService stocking, HttpContext http) =>
            ApiResult.Ok(await stocking.ExecuteNowAsync(Actor(http), id, request.ExpectedRevision, http.RequestAborted))).Require(AdminPermissions.StockingExecute);
        return app;
    }

    private static RouteHandlerBuilder Require(this RouteHandlerBuilder builder, string permission) =>
        builder.RequireAuthorization(AdminPermissions.Policy(permission));

    private static string Actor(HttpContext http) =>
        http.User.FindFirst("sub")?.Value ?? throw new GameException("UNAUTHENTICATED");

    private static IResult Respond(HttpContext http, AdminTokens tokens)
    {
        http.Response.Cookies.Append(RefreshCookie, tokens.RefreshToken, CookieOptions(tokens.RefreshExpiresAt));
        return ApiResult.Ok(new AdminLoginResponse(tokens.AccessToken, tokens.ExpiresAt, tokens.Email, tokens.Permissions));
    }

    private static CookieOptions CookieOptions(DateTimeOffset? expires) => new()
    {
        HttpOnly = true, Secure = true, SameSite = SameSiteMode.Strict, Path = RefreshCookiePath, Expires = expires,
    };
}
