using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace FishingOnline.Api.Tests;

public sealed class HttpEnvelopeTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private const string TraceIdPattern = "^[0-9a-f]{32}$";

    [Fact]
    public async Task GameException_SeatTaken_Returns409WithErrorEnvelope()
    {
        var response = await factory.CreateClient().GetAsync("/api/v1/dev/probe?code=SEAT_TAKEN");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
        var root = await ReadAsync(response);
        Assert.Equal(["error", "traceId"], root.EnumerateObject().Select(p => p.Name).Order());
        Assert.Matches(TraceIdPattern, root.GetProperty("traceId").GetString());
        var error = root.GetProperty("error");
        Assert.Equal(["code", "message", "retryable"], error.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal("SEAT_TAKEN", error.GetProperty("code").GetString());
        Assert.Equal("Seat is in use", error.GetProperty("message").GetString());
        Assert.False(error.GetProperty("retryable").GetBoolean());
    }

    [Theory]
    [InlineData("VALIDATION_FAILED", 400, false)]
    [InlineData("INVALID_DURATION", 400, false)]
    [InlineData("UNAUTHENTICATED", 401, false)]
    [InlineData("SESSION_EXPIRED", 401, false)]
    [InlineData("FISH_NOT_FOUND", 404, false)]
    [InlineData("SEAT_TAKEN", 409, false)]
    [InlineData("SEAT_COOLDOWN", 409, false)]
    [InlineData("ALREADY_HAS_SEAT", 409, false)]
    [InlineData("ATTEMPT_ACTIVE", 409, false)]
    [InlineData("IDEMPOTENCY_CONFLICT", 409, false)]
    [InlineData("ROD_ALREADY_OWNED", 409, false)]
    [InlineData("PRICE_CHANGED", 409, false)]
    [InlineData("SEAT_SESSION_EXPIRED", 409, false)]
    [InlineData("STATE_CONFLICT", 409, false)]
    [InlineData("INSUFFICIENT_GOLD", 422, false)]
    [InlineData("ROD_NOT_OWNED", 422, false)]
    [InlineData("NOT_IN_SEAT", 422, false)]
    [InlineData("RATE_LIMITED", 429, true)]
    public async Task ErrorCode_MapsToHttpStatus(string code, int status, bool retryable)
    {
        var response = await factory.CreateClient().GetAsync($"/api/v1/dev/probe?code={code}");

        Assert.Equal(status, (int)response.StatusCode);
        var error = (await ReadAsync(response)).GetProperty("error");
        Assert.Equal(code, error.GetProperty("code").GetString());
        Assert.Equal(retryable, error.GetProperty("retryable").GetBoolean());
    }

    [Fact]
    public async Task Success_ReturnsDataAndTraceId()
    {
        var response = await factory.CreateClient().PostAsJsonAsync("/api/v1/dev/echo", new { text = "xin chao" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var root = await ReadAsync(response);
        Assert.Equal(["data", "traceId"], root.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal("xin chao", root.GetProperty("data").GetProperty("text").GetString());
        Assert.Matches(TraceIdPattern, root.GetProperty("traceId").GetString());
    }

    [Fact]
    public async Task MalformedJson_ReturnsValidationFailed()
    {
        var response = await factory.CreateClient().PostAsync("/api/v1/dev/echo",
            new StringContent("{not json", Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("VALIDATION_FAILED", (await ReadAsync(response)).GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task UnexpectedException_Returns500WithoutLeakingDetails()
    {
        // Mã không có trong ErrorCatalog khiến GameException ném ArgumentException.
        var response = await factory.CreateClient().GetAsync("/api/v1/dev/probe?code=NOT_A_CODE");

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("INTERNAL_ERROR", body);
        Assert.DoesNotContain("NOT_A_CODE", body);
    }

    [Fact]
    public async Task ErrorResponse_KeepsCorsHeaderForAllowedOrigin()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/dev/probe?code=SEAT_TAKEN");
        request.Headers.Add("Origin", "http://localhost:5173");

        var response = await factory.CreateClient().SendAsync(request);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("http://localhost:5173", Assert.Single(response.Headers.GetValues("Access-Control-Allow-Origin")));
    }

    private static async Task<JsonElement> ReadAsync(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
}
