using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;

namespace FishingOnline.Api.Tests;

public sealed class GameHubTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task GameException_ReturnsFailedAck()
    {
        await using var hub = await factory.ConnectHubAsync();
        var requestId = Guid.NewGuid().ToString();

        var ack = await hub.InvokeAsync<JsonElement>("DevProbe", new { requestId, code = "SEAT_TAKEN" });

        Assert.Equal(["data", "error", "ok", "requestId"], ack.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal(requestId, ack.GetProperty("requestId").GetString());
        Assert.False(ack.GetProperty("ok").GetBoolean());
        Assert.Equal(JsonValueKind.Null, ack.GetProperty("data").ValueKind);
        var error = ack.GetProperty("error");
        Assert.Equal("SEAT_TAKEN", error.GetProperty("code").GetString());
        Assert.Equal("Seat is in use", error.GetProperty("message").GetString());
    }

    [Fact]
    public async Task Success_ReturnsOkAckWithData()
    {
        await using var hub = await factory.ConnectHubAsync();
        var requestId = Guid.NewGuid().ToString();

        var ack = await hub.InvokeAsync<JsonElement>("DevProbe", new { requestId, code = (string?)null });

        Assert.True(ack.GetProperty("ok").GetBoolean());
        Assert.Equal(JsonValueKind.Null, ack.GetProperty("error").ValueKind);
        Assert.True(ack.GetProperty("data").GetProperty("pong").GetBoolean());
    }

    [Theory]
    [InlineData("r1")]
    [InlineData("")]
    public async Task InvalidRequestId_ReturnsValidationFailed(string requestId)
    {
        await using var hub = await factory.ConnectHubAsync();

        var ack = await hub.InvokeAsync<JsonElement>("DevProbe", new { requestId, code = "SEAT_TAKEN" });

        Assert.False(ack.GetProperty("ok").GetBoolean());
        Assert.Equal("VALIDATION_FAILED", ack.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task UnexpectedException_ReturnsInternalErrorAckWithoutDetails()
    {
        await using var hub = await factory.ConnectHubAsync();

        var ack = await hub.InvokeAsync<JsonElement>("DevProbe", new { requestId = Guid.NewGuid().ToString(), code = "NOT_A_CODE" });

        Assert.False(ack.GetProperty("ok").GetBoolean());
        Assert.Equal("INTERNAL_ERROR", ack.GetProperty("error").GetProperty("code").GetString());
        Assert.DoesNotContain("NOT_A_CODE", ack.GetRawText());
    }

    [Fact]
    public async Task Ping_WorksInDevelopment()
    {
        await using var hub = await factory.ConnectHubAsync();

        var result = await hub.InvokeAsync<JsonElement>("Ping");

        Assert.Equal("0.1-draft", result.GetProperty("contractVersion").GetString());
    }
}

public sealed class ProductionSurfaceTests : IDisposable
{
    private readonly ApiFactory factory = new() { EnvironmentName = "Production" };

    [Fact]
    public async Task DevEndpoints_AreNotMapped()
    {
        var client = factory.CreateClient();

        Assert.Equal(System.Net.HttpStatusCode.NotFound, (await client.GetAsync("/api/v1/dev/probe")).StatusCode);
        Assert.Equal(System.Net.HttpStatusCode.NotFound,
            (await client.PostAsync("/api/v1/dev/echo", new StringContent("{}"))).StatusCode);
    }

    [Fact]
    public async Task DevHubMethods_AreRejected()
    {
        await using var hub = await factory.ConnectHubAsync();

        await Assert.ThrowsAsync<HubException>(() => hub.InvokeAsync<JsonElement>("Ping"));
        var ack = await hub.InvokeAsync<JsonElement>("DevProbe", new { requestId = Guid.NewGuid().ToString(), code = (string?)null });
        Assert.False(ack.GetProperty("ok").GetBoolean());
        Assert.Equal("VALIDATION_FAILED", ack.GetProperty("error").GetProperty("code").GetString());
    }

    public void Dispose() => factory.Dispose();
}
