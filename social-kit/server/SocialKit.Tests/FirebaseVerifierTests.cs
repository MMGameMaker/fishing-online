using System.Net;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using SocialKit.Auth;

namespace SocialKit.Tests;

// Xác minh Firebase ID token: Google và Facebook được chấp nhận, token sai (issuer, audience, hết hạn, provider lạ, chữ ký) bị từ chối.
public sealed class FirebaseVerifierTests : IDisposable
{
    private const string ProjectId = "unit-project";
    private readonly RSA rsa = RSA.Create(2048);
    private readonly RsaSecurityKey key;

    public FirebaseVerifierTests() => key = new RsaSecurityKey(rsa) { KeyId = "k1" };

    private JwksFirebaseTokenVerifier Verifier()
    {
        var jwk = JsonWebKeyConverter.ConvertFromRSASecurityKey(new RsaSecurityKey(rsa.ExportParameters(false)) { KeyId = "k1" });
        var jwks = JsonSerializer.Serialize(new { keys = new[] { new { kty = "RSA", alg = "RS256", use = "sig", kid = "k1", n = jwk.N, e = jwk.E } } });
        return new JwksFirebaseTokenVerifier(
            new HttpClient(new StaticHandler(jwks)), Options.Create(new FirebaseVerifierOptions { ProjectId = ProjectId }), TimeProvider.System,
            Microsoft.Extensions.Logging.Abstractions.NullLogger<JwksFirebaseTokenVerifier>.Instance);
    }

    private string Token(string issuer = $"https://securetoken.google.com/{ProjectId}", string audience = ProjectId, string provider = "google.com", int expiresInMinutes = 30, SecurityKey? signWith = null, string? picture = null)
    {
        var now = DateTime.UtcNow;
        return new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Issuer = issuer,
            Audience = audience,
            NotBefore = now.AddHours(-2),
            IssuedAt = now.AddHours(-2),
            Expires = now.AddMinutes(expiresInMinutes),
            SigningCredentials = new SigningCredentials(signWith ?? key, SecurityAlgorithms.RsaSha256),
            Claims = new Dictionary<string, object>
            {
                ["sub"] = "firebase-uid",
                ["firebase"] = new Dictionary<string, object> { ["sign_in_provider"] = provider },
                ["picture"] = picture ?? "",
            },
        });
    }

    [Fact]
    public async Task ValidGoogleToken_ReturnsIdentity()
    {
        var identity = await Verifier().VerifyAsync(Token(), default);

        Assert.Equal("firebase-uid", identity.Uid);
        Assert.Equal(ProjectId, identity.ProjectId);
        Assert.Equal("google.com", identity.Provider);
    }

    [Fact]
    public async Task ValidFacebookToken_ReturnsIdentityWithPicture()
    {
        // Đăng nhập Facebook qua Firebase (2026-11-27): provider facebook.com được chấp nhận, claim picture được chuyển lên.
        var identity = await Verifier().VerifyAsync(Token(provider: "facebook.com", picture: "https://graph.facebook.com/1/picture?type=large"), default);

        Assert.Equal("facebook.com", identity.Provider);
        Assert.Equal("https://graph.facebook.com/1/picture?type=large", identity.Picture);
    }

    [Theory]
    [InlineData("issuer")]
    [InlineData("audience")]
    [InlineData("expired")]
    [InlineData("provider")]
    [InlineData("signature")]
    public async Task InvalidToken_IsRejected(string defect)
    {
        var token = defect switch
        {
            "issuer" => Token(issuer: "https://securetoken.google.com/other"),
            "audience" => Token(audience: "other"),
            "expired" => Token(expiresInMinutes: -30),
            "provider" => Token(provider: "anonymous"),
            _ => Token(signWith: new RsaSecurityKey(RSA.Create(2048)) { KeyId = "k1" }),
        };

        var error = await Assert.ThrowsAsync<SocialException>(() => Verifier().VerifyAsync(token, default));
        Assert.Equal("UNAUTHENTICATED", error.Code);
    }

    public void Dispose() => rsa.Dispose();

    private sealed class StaticHandler(string body) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(body) });
    }
}
