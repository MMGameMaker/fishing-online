using System.Text.Json;
using FishingOnline.Api.Modules.Common;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace FishingOnline.Api.Modules.Identity;

/// <summary><c>SecondFactor</c> có giá trị khi người dùng đã qua MFA của Firebase (claim <c>firebase.sign_in_second_factor</c>).</summary>
public sealed record FirebaseIdentity(
    string ProjectId, string Uid, string Provider, string? Email = null, bool EmailVerified = false, string? SecondFactor = null);

public interface IFirebaseTokenVerifier
{
    /// <summary>Trả danh tính đã xác minh; token sai ném <see cref="GameException"/> UNAUTHENTICATED.</summary>
    Task<FirebaseIdentity> VerifyAsync(string idToken, CancellationToken ct);
}

/// <summary>Xác minh Firebase ID token bằng khóa công khai của Google; không cần service account.</summary>
public sealed class JwksFirebaseTokenVerifier(
    HttpClient http, IOptions<AuthOptions> options, TimeProvider time, ILogger<JwksFirebaseTokenVerifier> logger) : IFirebaseTokenVerifier
{
    private const string JwksUrl = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
    private const string AllowedProvider = "google.com";
    private static readonly TimeSpan KeyCacheLifetime = TimeSpan.FromHours(1);

    private readonly SemaphoreSlim refresh = new(1, 1);
    private readonly JsonWebTokenHandler handler = new();
    private JsonWebKeySet? keys;
    private DateTimeOffset keysFetchedAt;

    public async Task<FirebaseIdentity> VerifyAsync(string idToken, CancellationToken ct)
    {
        var projectId = options.Value.FirebaseProjectId;
        if (string.IsNullOrWhiteSpace(projectId)) throw new InvalidOperationException("Auth:FirebaseProjectId is not configured.");

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
            throw new GameException("UNAUTHENTICATED");

        var provider = RequireGoogleProvider(token);
        token.TryGetPayloadValue<string>("email", out var email);
        token.TryGetPayloadValue<bool>("email_verified", out var emailVerified);
        string? secondFactor = null;
        if (token.TryGetPayloadValue<JsonElement>("firebase", out var firebase)
            && firebase.TryGetProperty("sign_in_second_factor", out var factor))
            secondFactor = factor.GetString();
        return new FirebaseIdentity(projectId, token.Subject, provider, email, emailVerified, secondFactor);
    }

    private static string RequireGoogleProvider(JsonWebToken token)
    {
        if (!token.TryGetPayloadValue<JsonElement>("firebase", out var firebase)
            || !firebase.TryGetProperty("sign_in_provider", out var provider)
            || provider.GetString() != AllowedProvider)
            throw new GameException("UNAUTHENTICATED");
        return AllowedProvider;
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
