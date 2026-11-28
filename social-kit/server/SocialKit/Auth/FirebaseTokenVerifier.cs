using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace SocialKit.Auth;

/// <summary><c>SecondFactor</c> có giá trị khi người dùng đã qua MFA của Firebase (claim <c>firebase.sign_in_second_factor</c>). <c>Picture</c> là claim ảnh đại diện.</summary>
public sealed record FirebaseIdentity(
    string ProjectId, string Uid, string Provider, string? Email = null, bool EmailVerified = false, string? SecondFactor = null,
    string? Picture = null);

public interface IFirebaseTokenVerifier
{
    /// <summary>Trả danh tính đã xác minh; token sai ném <see cref="SocialException"/> UNAUTHENTICATED.</summary>
    Task<FirebaseIdentity> VerifyAsync(string idToken, CancellationToken ct);
}

public sealed class FirebaseVerifierOptions
{
    /// <summary>Firebase project id (issuer và audience của ID token).</summary>
    public string? ProjectId { get; set; }

    /// <summary>Provider được chấp nhận. Mặc định Google và Facebook; muốn bỏ Facebook thì chỉ để google.com.</summary>
    public string[] AllowedProviders { get; set; } = ["google.com", "facebook.com"];
}

/// <summary>Xác minh Firebase ID token bằng khóa công khai của Google; không cần service account.</summary>
public sealed class JwksFirebaseTokenVerifier(
    HttpClient http, IOptions<FirebaseVerifierOptions> options, TimeProvider time, ILogger<JwksFirebaseTokenVerifier> logger) : IFirebaseTokenVerifier
{
    private const string JwksUrl = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
    private static readonly TimeSpan KeyCacheLifetime = TimeSpan.FromHours(1);

    private readonly SemaphoreSlim refresh = new(1, 1);
    private readonly JsonWebTokenHandler handler = new();
    private JsonWebKeySet? keys;
    private DateTimeOffset keysFetchedAt;

    public async Task<FirebaseIdentity> VerifyAsync(string idToken, CancellationToken ct)
    {
        var projectId = options.Value.ProjectId;
        if (string.IsNullOrWhiteSpace(projectId)) throw new InvalidOperationException("Firebase project id is not configured.");

        var signingKeys = await GetKeysAsync(ct);
        var result = await handler.ValidateTokenAsync(idToken, new TokenValidationParameters
        {
            ValidIssuer = $"https://securetoken.google.com/{projectId}",
            ValidAudience = projectId,
            IssuerSigningKeys = signingKeys.GetSigningKeys(),
            ValidAlgorithms = [SecurityAlgorithms.RsaSha256],
            RequireSignedTokens = true,
            RequireExpirationTime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
        });
        if (!result.IsValid || result.SecurityToken is not JsonWebToken token || string.IsNullOrWhiteSpace(token.Subject))
            throw SocialException.Unauthenticated();

        var provider = RequireAllowedProvider(token);
        token.TryGetPayloadValue<string>("email", out var email);
        token.TryGetPayloadValue<bool>("email_verified", out var emailVerified);
        string? secondFactor = null;
        if (token.TryGetPayloadValue<JsonElement>("firebase", out var firebase)
            && firebase.TryGetProperty("sign_in_second_factor", out var factor))
            secondFactor = factor.GetString();
        token.TryGetPayloadValue<string>("picture", out var picture);
        return new FirebaseIdentity(projectId, token.Subject, provider, email, emailVerified, secondFactor, picture);
    }

    private string RequireAllowedProvider(JsonWebToken token)
    {
        if (!token.TryGetPayloadValue<JsonElement>("firebase", out var firebase)
            || !firebase.TryGetProperty("sign_in_provider", out var provider)
            || provider.GetString() is not { } name
            || !options.Value.AllowedProviders.Contains(name))
            throw SocialException.Unauthenticated();
        return name;
    }

    private async Task<JsonWebKeySet> GetKeysAsync(CancellationToken ct)
    {
        if (keys is not null && time.GetUtcNow() - keysFetchedAt < KeyCacheLifetime) return keys;
        await refresh.WaitAsync(ct);
        try
        {
            if (keys is not null && time.GetUtcNow() - keysFetchedAt < KeyCacheLifetime) return keys;
            try
            {
                keys = new JsonWebKeySet(await http.GetStringAsync(JwksUrl, ct));
                keysFetchedAt = time.GetUtcNow();
            }
            catch (HttpRequestException exception) when (keys is not null)
            {
                // Khóa cũ vẫn dùng được khi Google tạm không truy cập được; sẽ thử lại ở token sau.
                logger.LogWarning(exception, "Could not refresh Firebase signing keys");
            }
            return keys!;
        }
        finally
        {
            refresh.Release();
        }
    }
}
