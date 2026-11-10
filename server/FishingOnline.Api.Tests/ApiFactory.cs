using System.Security.Cryptography;
using FishingOnline.Api.Modules.Identity;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

namespace FishingOnline.Api.Tests;

/// <summary>Chạy Program thật trong bộ nhớ ở môi trường cho trước; không cần PostgreSQL/Redis.</summary>
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    public string EnvironmentName { get; init; } = "Development";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(EnvironmentName);
        builder.UseSetting("ConnectionStrings:Postgres", string.Empty);
        builder.UseSetting("Auth:DevBypass", "true");
        builder.UseSetting("Auth:JwtSigningKey", Convert.ToBase64String(RandomNumberGenerator.GetBytes(48)));
    }

    public async Task<HubConnection> ConnectHubAsync()
    {
        var token = EnvironmentName == "Development" ? null : Services.GetRequiredService<JwtIssuer>()
            .Issue(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 0).Token;
        var connection = new HubConnectionBuilder()
            .WithUrl(new Uri(Server.BaseAddress, "/hubs/game"), options =>
            {
                options.HttpMessageHandlerFactory = _ => Server.CreateHandler();
                options.Transports = Microsoft.AspNetCore.Http.Connections.HttpTransportType.LongPolling;
                if (token is null) options.Headers["X-Dev-Player"] = Guid.NewGuid().ToString();
                else options.AccessTokenProvider = () => Task.FromResult<string?>(token);
            })
            .Build();
        await connection.StartAsync();
        return connection;
    }
}
