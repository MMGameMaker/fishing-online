using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using FishingOnline.Api.Modules.Admin;
using FishingOnline.Api.Modules.Config;
using FishingOnline.Api.Modules.Fishing;
using FishingOnline.Api.Modules.Wallet;
using Microsoft.EntityFrameworkCore;

namespace FishingOnline.Api.Tests;

public abstract class AdminTestBase(PostgresServer postgres) : GameTestBase(postgres)
{
    protected Task AddAdminAsync(string email, string[] roles, bool disabled = false) => App.WithDbAsync(db =>
    {
        db.Add(new AdminUser { Email = email, Roles = roles, Disabled = disabled, CreatedAt = App.Clock.GetUtcNow() });
        return db.SaveChangesAsync();
    });

    protected Task<HttpResponseMessage> LoginAsync(string token) =>
        App.CreateClient().PostAsJsonAsync("/api/v1/admin/auth/login", new { firebaseIdToken = token });

    /// <summary>Admin đã đăng nhập, chỉ có các quyền được nêu.</summary>
    protected async Task<HttpClient> AdminAsync(params string[] permissions)
    {
        var email = $"ops-{Guid.NewGuid():N}@example.com";
        await AddAdminAsync(email, permissions);
        var login = await ReadDataAsync(await LoginAsync("admin:" + email));
        var client = App.CreateClient();
        client.DefaultRequestHeaders.Authorization = new("Bearer", login.GetProperty("accessToken").GetString());
        return client;
    }

    protected static async Task<JsonElement> DataAsync(Task<HttpResponseMessage> response) => await ReadDataAsync(await response);
}

public sealed class AdminAuthTests(PostgresServer postgres) : AdminTestBase(postgres)
{
    [Fact]
    public async Task PlayerToken_OnAdminRoute_Returns403()
    {
        var player = App.Http(await App.NewPlayerAsync());

        await AssertErrorAsync(await player.GetAsync("/api/v1/admin/config/versions"), 403, "FORBIDDEN");
    }

    [Fact]
    public async Task NoToken_Returns401()
    {
        await AssertErrorAsync(await App.CreateClient().GetAsync("/api/v1/admin/config/versions"), 401, "UNAUTHENTICATED");
    }

    [Fact]
    public async Task EmailNotInTable_Returns401()
    {
        await AssertErrorAsync(await LoginAsync("admin:stranger@example.com"), 401, "UNAUTHENTICATED");
    }

    [Fact]
    public async Task DisabledAdmin_Or_MissingMfa_Returns401()
    {
        await AddAdminAsync("off@example.com", [AdminPermissions.ConfigRead], disabled: true);
        await AddAdminAsync("nomfa@example.com", [AdminPermissions.ConfigRead]);

        await AssertErrorAsync(await LoginAsync("admin:off@example.com"), 401, "UNAUTHENTICATED");
        await AssertErrorAsync(await LoginAsync("admin-nomfa:nomfa@example.com"), 401, "UNAUTHENTICATED");
    }

    [Fact]
    public async Task MissingPermission_Returns403_GrantedPermissionWorks()
    {
        var reader = await AdminAsync(AdminPermissions.ConfigRead);

        Assert.True((await reader.GetAsync("/api/v1/admin/config/versions")).IsSuccessStatusCode);
        await AssertErrorAsync(await reader.GetAsync("/api/v1/admin/audit"), 403, "FORBIDDEN");
    }

    [Fact]
    public async Task Login_IsAudited_AndDisablingCutsExistingToken()
    {
        var email = "boss@example.com";
        await AddAdminAsync(email, [AdminPermissions.AuditRead]);
        var login = await ReadDataAsync(await LoginAsync("admin:" + email));
        var client = App.CreateClient();
        client.DefaultRequestHeaders.Authorization = new("Bearer", login.GetProperty("accessToken").GetString());

        var audit = await DataAsync(client.GetAsync("/api/v1/admin/audit"));
        Assert.Contains(audit.GetProperty("items").EnumerateArray(), row => row.GetProperty("action").GetString() == "admin.login");
        Assert.True(login.GetProperty("expiresAt").GetDateTimeOffset() <= App.Clock.GetUtcNow().AddMinutes(5));

        await App.WithDbAsync(db => db.Set<AdminUser>().Where(row => row.Email == email)
            .ExecuteUpdateAsync(setters => setters.SetProperty(row => row.Disabled, true)));
        await AssertErrorAsync(await client.GetAsync("/api/v1/admin/audit"), 401, "UNAUTHENTICATED");
    }

    [Fact]
    public async Task Refresh_RotatesWithinAbsoluteLimit()
    {
        await AddAdminAsync("night@example.com", [AdminPermissions.ConfigRead]);
        var login = await LoginAsync("admin:night@example.com");
        var cookie = login.Headers.GetValues("Set-Cookie").Single().Split(';')[0];

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/auth/refresh");
        request.Headers.Add("Cookie", cookie);
        await ReadDataAsync(await App.CreateClient().SendAsync(request));

        App.Clock.Advance(TimeSpan.FromHours(9));
        var late = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/auth/refresh");
        late.Headers.Add("Cookie", cookie);
        await AssertErrorAsync(await App.CreateClient().SendAsync(late), 401, "UNAUTHENTICATED");
    }
}

public sealed class AdminConfigTests(PostgresServer postgres) : AdminTestBase(postgres)
{
    private const string Base = "v0-test-2026-11-09-monitoring-05";

    private async Task<(HttpClient Client, JsonElement Draft)> DraftAsync()
    {
        var client = await AdminAsync(AdminPermissions.ConfigRead, AdminPermissions.ConfigWrite, AdminPermissions.ConfigPublish);
        var draft = await DataAsync(client.PostAsJsonAsync("/api/v1/admin/config/drafts", new { baseVersion = Base }));
        return (client, draft);
    }

    private static Task<HttpResponseMessage> SaveAsync(HttpClient client, JsonElement draft, int revision, JsonNode document) =>
        client.PutAsJsonAsync($"/api/v1/admin/config/drafts/{draft.GetProperty("draftId").GetGuid()}", new { expectedRevision = revision, document });

    private static Task<HttpResponseMessage> PublishAsync(HttpClient client, JsonElement draft, int revision, string active) =>
        client.PostAsJsonAsync($"/api/v1/admin/config/drafts/{draft.GetProperty("draftId").GetGuid()}/publish", new { expectedRevision = revision, expectedActiveVersion = active });

    [Fact]
    public async Task TwoAdminsEditSameDraft_SecondGets409()
    {
        var (client, draft) = await DraftAsync();
        var document = JsonNode.Parse(draft.GetProperty("document").GetRawText())!;

        (await SaveAsync(client, draft, 1, document)).EnsureSuccessStatusCode();

        await AssertErrorAsync(await SaveAsync(client, draft, 1, document), 409, "STATE_CONFLICT");
    }

    [Fact]
    public async Task InvalidConfig_CannotPublish_ValidateListsErrors()
    {
        var (client, draft) = await DraftAsync();
        var document = JsonNode.Parse(draft.GetProperty("document").GetRawText())!;
        document["fish"]!.AsArray().RemoveAt(0);
        (await SaveAsync(client, draft, 1, document)).EnsureSuccessStatusCode();

        var report = await DataAsync(client.PostAsync($"/api/v1/admin/config/drafts/{draft.GetProperty("draftId").GetGuid()}/validate", null));
        Assert.False(report.GetProperty("valid").GetBoolean());
        Assert.Contains(report.GetProperty("errors").EnumerateArray(), error => error.GetProperty("path").GetString() == "fish");

        await AssertErrorAsync(await PublishAsync(client, draft, 2, Base), 400, "VALIDATION_FAILED");
        Assert.Equal(Base, App.Service<IConfigProvider>().Current.ConfigVersion);
    }

    [Fact]
    public async Task StaleActiveVersion_Returns409()
    {
        var (client, draft) = await DraftAsync();

        await AssertErrorAsync(await PublishAsync(client, draft, 1, "something-else"), 409, "STATE_CONFLICT");
    }

    [Fact]
    public async Task Publish_RunningAttemptKeepsOldNumbers_NewSessionsUseNew()
    {
        await using var before = await App.ConnectAsync(await App.NewPlayerAsync(1000));
        await before.OkAsync("JoinLake");
        await before.OkAsync("BuySeatTicket", new { seatId = "seat-11", durationUnits = 1, expectedPriceVersion = PriceVersion });

        var (client, draft) = await DraftAsync();
        var document = JsonNode.Parse(draft.GetProperty("document").GetRawText())!;
        foreach (var row in document["minigame"]!["rarity"]!.AsArray()) row!["durationMs"] = row["durationMs"]!.GetValue<int>() + 1000;
        document["seatTiers"]![2]!["unitPriceGold"] = "50";
        (await SaveAsync(client, draft, 1, document)).EnsureSuccessStatusCode();
        var published = await DataAsync(PublishAsync(client, draft, 2, Base));
        var version = published.GetProperty("version").GetString()!;

        Assert.Equal(version, App.Service<IConfigProvider>().Current.ConfigVersion);
        await using var after = await App.ConnectAsync(await App.NewPlayerAsync(1000));
        await after.OkAsync("JoinLake");
        var bought = await after.OkAsync("BuySeatTicket", new { seatId = "seat-12", durationUnits = 2, expectedPriceVersion = PriceVersion });
        Assert.Equal("100", bought.GetProperty("chargedGold").GetString());

        var oldAttempt = await MinigameAsync(before);
        var newAttempt = await MinigameAsync(after);
        var configs = App.Service<IConfigProvider>();
        Assert.Equal(Base, oldAttempt.ConfigVersion);
        Assert.Equal(version, newAttempt.ConfigVersion);
        Assert.Equal(Duration(configs.Get(Base), oldAttempt.Rarity!), oldAttempt.DurationMs);
        Assert.Equal(Duration(configs.Get(version), newAttempt.Rarity!), newAttempt.DurationMs);
    }

    [Fact]
    public async Task Rollback_PublishesOldContentAsNewVersion()
    {
        var (client, draft) = await DraftAsync();
        var document = JsonNode.Parse(draft.GetProperty("document").GetRawText())!;
        document["fishing"]!["biteWindowMs"] = 2500;
        (await SaveAsync(client, draft, 1, document)).EnsureSuccessStatusCode();
        var changed = (await DataAsync(PublishAsync(client, draft, 2, Base))).GetProperty("version").GetString()!;

        var back = await DataAsync(client.PostAsJsonAsync("/api/v1/admin/config/drafts", new { baseVersion = Base }));
        var restored = (await DataAsync(PublishAsync(client, back, 1, changed))).GetProperty("version").GetString()!;

        var current = App.Service<IConfigProvider>().Current;
        Assert.Equal(restored, current.ConfigVersion);
        Assert.Equal(3000, current.Fishing.BiteWindowMs);
        Assert.Equal(3, (await DataAsync(client.GetAsync("/api/v1/admin/config/versions"))).GetArrayLength());
    }

    private async Task<(string ConfigVersion, string? Rarity, int DurationMs)> MinigameAsync(TestPlayer player)
    {
        var attemptId = (await player.OkAsync("CastLine")).GetProperty("attemptId").GetGuid();
        App.Clock.AdvanceMs(6000);
        await App.Service<FishingService>().TickOnceAsync(default);
        await player.OkAsync("HookFish", new { attemptId });
        var update = await player.WaitForAsync("AttemptUpdate", item => item.GetProperty("phase").GetString() == "minigame");
        var row = await App.WithDbAsync(db => db.Set<FishingAttemptRow>().AsNoTracking().SingleAsync(item => item.AttemptId == attemptId));
        return (row.ConfigVersion, row.Rarity, update.GetProperty("minigame").GetProperty("durationMs").GetInt32());
    }

    private static int Duration(FishingOnline.Domain.Config.GameplayConfig config, string rarity) =>
        config.Minigame.Rarity.Single(row => row.Rarity.ToString().Equals(rarity, StringComparison.OrdinalIgnoreCase)).DurationMs;
}

public sealed class AdminLookupTests(PostgresServer postgres) : AdminTestBase(postgres)
{
    [Fact]
    public async Task PlayerDetail_LedgerTotalMatchesBalance_AndPagesWalkAll()
    {
        var playerId = await App.NewPlayerAsync(500);
        await using (var player = await App.ConnectAsync(playerId))
            await player.OkAsync("BuySeatTicket", new { seatId = "seat-11", durationUnits = 3, expectedPriceVersion = PriceVersion });
        var client = await AdminAsync(AdminPermissions.PlayerRead);

        var detail = await DataAsync(client.GetAsync($"/api/v1/admin/players/{playerId}"));
        Assert.Equal(detail.GetProperty("gold").GetString(), detail.GetProperty("ledgerTotal").GetString());
        Assert.Equal("480", detail.GetProperty("gold").GetString());

        var first = await DataAsync(client.GetAsync($"/api/v1/admin/players/{playerId}/ledger?limit=2"));
        var cursor = first.GetProperty("nextCursor").GetString();
        var second = await DataAsync(client.GetAsync($"/api/v1/admin/players/{playerId}/ledger?limit=2&cursor={cursor}"));
        var all = first.GetProperty("items").EnumerateArray().Concat(second.GetProperty("items").EnumerateArray()).ToArray();
        Assert.Equal(3, all.Length);
        Assert.Equal(480, all.Sum(row => row.GetProperty("delta").GetInt64()));
        Assert.Equal(JsonValueKind.Null, second.GetProperty("nextCursor").ValueKind);
        Assert.Single((await DataAsync(client.GetAsync($"/api/v1/admin/players/{playerId}/seat-sessions"))).GetProperty("items").EnumerateArray());
    }

    [Fact]
    public async Task Search_ByNameOrId()
    {
        var playerId = await App.NewPlayerAsync();
        (await App.Http(playerId).PutAsJsonAsync("/api/v1/me/display-name", new { displayName = "Ca Map" })).EnsureSuccessStatusCode();
        var client = await AdminAsync(AdminPermissions.PlayerRead);

        Assert.Single((await DataAsync(client.GetAsync("/api/v1/admin/players?query=map"))).EnumerateArray());
        Assert.Single((await DataAsync(client.GetAsync($"/api/v1/admin/players?query={playerId}"))).EnumerateArray());
    }

    [Fact]
    public async Task Lake_ShowsSeatsOnlinePlayersAndPopulation()
    {
        await using var player = await App.ConnectAsync();
        await player.OkAsync("JoinLake");
        var client = await AdminAsync(AdminPermissions.PlayerRead);

        var lake = await DataAsync(client.GetAsync("/api/v1/admin/lake"));

        Assert.Equal(20, lake.GetProperty("seats").GetArrayLength());
        Assert.Single(lake.GetProperty("onlinePlayers").EnumerateArray());
        var perch = lake.GetProperty("population").EnumerateArray().Single(row => row.GetProperty("speciesId").GetString() == "perch");
        Assert.Equal(200, perch.GetProperty("stocked").GetInt32());
        Assert.Equal(200, perch.GetProperty("available").GetInt32());
    }

    [Fact]
    public async Task SignalReview_IsAuditedAndNeedsPermission()
    {
        var playerId = await App.NewPlayerAsync();
        var signalId = Guid.NewGuid();
        await App.WithDbAsync(db =>
        {
            db.Add(new PlayerSecuritySignal
            {
                SignalId = signalId, PlayerId = playerId, RuleCode = "win_rate_high", RuleVersion = "v", Severity = "informational",
                FirstSeenAt = App.Clock.GetUtcNow(), LastSeenAt = App.Clock.GetUtcNow(), Occurrences = 1,
            });
            return db.SaveChangesAsync();
        });
        var reader = await AdminAsync(AdminPermissions.PlayerRead);
        var reviewer = await AdminAsync(AdminPermissions.SignalReview, AdminPermissions.AuditRead);

        await AssertErrorAsync(await reader.PostAsJsonAsync($"/api/v1/admin/signals/{signalId}/review", new { status = "dismissed" }), 403, "FORBIDDEN");
        var reviewed = await DataAsync(reviewer.PostAsJsonAsync($"/api/v1/admin/signals/{signalId}/review", new { status = "dismissed", note = "bot test" }));

        Assert.Equal("dismissed", reviewed.GetProperty("status").GetString());
        var audit = await DataAsync(reviewer.GetAsync("/api/v1/admin/audit"));
        Assert.Contains(audit.GetProperty("items").EnumerateArray(), row => row.GetProperty("action").GetString() == "signal.review");
    }
}

public sealed class AdminStockingTests(PostgresServer postgres) : AdminTestBase(postgres)
{
    private static object Batch(DateTimeOffset? scheduledAt = null, params (string Species, int Quantity)[] lines) => new
    {
        lakeId = "lake-01",
        lines = lines.Select(line => new { speciesId = line.Species, quantity = line.Quantity }).ToArray(),
        scheduledAt,
        timeZone = "Asia/Ho_Chi_Minh",
        note = "test",
    };

    private static async Task<JsonElement> CreateAsync(HttpClient client, object body, Guid? key = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/stocking") { Content = JsonContent.Create(body) };
        request.Headers.Add("Idempotency-Key", (key ?? Guid.NewGuid()).ToString());
        return await ReadDataAsync(await client.SendAsync(request));
    }

    private Task<int> RemainingAsync(string speciesId) =>
        App.WithDbAsync(db => db.Set<LakeFishPopulation>().Where(row => row.SpeciesId == speciesId).Select(row => row.Remaining).SingleAsync());

    private Task<HttpClient> OperatorAsync() =>
        AdminAsync(AdminPermissions.StockingRead, AdminPermissions.StockingWrite, AdminPermissions.StockingExecute);

    private static Task<HttpResponseMessage> PostAsync(HttpClient client, JsonElement batch, string action, int revision) =>
        client.PostAsJsonAsync($"/api/v1/admin/stocking/{batch.GetProperty("batchId").GetGuid()}/{action}", new { expectedRevision = revision });

    [Fact]
    public async Task ExecuteNow_AddsExactQuantities()
    {
        var client = await OperatorAsync();
        var batch = await CreateAsync(client, Batch(null, ("minnow", 100), ("koi", 20)));
        Assert.Equal(2, batch.GetProperty("speciesCount").GetInt32());
        Assert.Equal(120, batch.GetProperty("totalFish").GetInt32());

        var done = await ReadDataAsync(await PostAsync(client, batch, "execute-now", 1));

        Assert.Equal("completed", done.GetProperty("status").GetString());
        Assert.Equal(300, await RemainingAsync("minnow"));
        Assert.Equal(35, await RemainingAsync("koi"));
    }

    [Fact]
    public async Task ParallelExecuteAndRetries_ApplyOnce()
    {
        var client = await OperatorAsync();
        var key = Guid.NewGuid();
        var batch = await CreateAsync(client, Batch(null, ("koi", 20)), key);
        var again = await CreateAsync(client, Batch(null, ("koi", 20)), key);
        Assert.Equal(batch.GetProperty("batchId").GetGuid(), again.GetProperty("batchId").GetGuid());

        var responses = await Task.WhenAll(Enumerable.Range(0, 8).Select(_ => PostAsync(client, batch, "execute-now", 1)));

        Assert.All(responses, response => Assert.True(response.IsSuccessStatusCode));
        Assert.Equal(35, await RemainingAsync("koi"));
        Assert.Equal(0, await App.Service<StockingService>().RunDueAsync(default));
        Assert.Equal(35, await RemainingAsync("koi"));
    }

    [Fact]
    public async Task SameKeyDifferentBody_Returns409()
    {
        var client = await OperatorAsync();
        var key = Guid.NewGuid();
        await CreateAsync(client, Batch(null, ("koi", 20)), key);

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/stocking") { Content = JsonContent.Create(Batch(null, ("koi", 21))) };
        request.Headers.Add("Idempotency-Key", key.ToString());
        await AssertErrorAsync(await client.SendAsync(request), 409, "IDEMPOTENCY_CONFLICT");
    }

    [Fact]
    public async Task Schedule_RunsOnlyWhenDue_OnceEvenAfterRestart()
    {
        var client = await OperatorAsync();
        var batch = await CreateAsync(client, Batch(App.Clock.GetUtcNow().AddMinutes(10), ("koi", 5)));
        await ReadDataAsync(await PostAsync(client, batch, "schedule", 1));
        var stocking = App.Service<StockingService>();

        await stocking.RunDueAsync(default);
        Assert.Equal(15, await RemainingAsync("koi"));

        App.Clock.Advance(TimeSpan.FromMinutes(30));
        Assert.Equal(1, await stocking.RunDueAsync(default));
        Assert.Equal(1, await stocking.RunDueAsync(default) + 1);
        Assert.Equal(20, await RemainingAsync("koi"));
        var detail = await DataAsync(client.GetAsync($"/api/v1/admin/stocking/{batch.GetProperty("batchId").GetGuid()}"));
        Assert.Equal("system:scheduler", detail.GetProperty("executedBy").GetString());
    }

    [Fact]
    public async Task Cancelled_DoesNotAdd()
    {
        var client = await OperatorAsync();
        var batch = await CreateAsync(client, Batch(App.Clock.GetUtcNow().AddMinutes(1), ("koi", 5)));
        await ReadDataAsync(await PostAsync(client, batch, "schedule", 1));
        await ReadDataAsync(await PostAsync(client, batch, "cancel", 2));

        App.Clock.Advance(TimeSpan.FromMinutes(5));
        await App.Service<StockingService>().RunDueAsync(default);

        Assert.Equal(15, await RemainingAsync("koi"));
        await AssertErrorAsync(await PostAsync(client, batch, "execute-now", 3), 409, "STATE_CONFLICT");
        Assert.Equal(15, await RemainingAsync("koi"));
    }

    [Fact]
    public async Task StaleRevisionEdit_Returns409()
    {
        var client = await OperatorAsync();
        var batch = await CreateAsync(client, Batch(null, ("koi", 5)));
        var id = batch.GetProperty("batchId").GetGuid();
        var edit = new { expectedRevision = 1, lines = new[] { new { speciesId = "koi", quantity = 6 } }, scheduledAt = (DateTimeOffset?)null, timeZone = (string?)null, note = "x" };

        (await client.PutAsJsonAsync($"/api/v1/admin/stocking/{id}", edit)).EnsureSuccessStatusCode();

        await AssertErrorAsync(await client.PutAsJsonAsync($"/api/v1/admin/stocking/{id}", edit), 409, "STATE_CONFLICT");
    }

    [Theory]
    [InlineData("nope", 5)]
    [InlineData("koi", -1)]
    [InlineData("koi", 0)]
    public async Task BadSpeciesOrQuantity_Returns400(string species, int quantity)
    {
        var client = await OperatorAsync();
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/stocking") { Content = JsonContent.Create(Batch(null, (species, quantity))) };
        request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString());

        await AssertErrorAsync(await client.SendAsync(request), 400, "VALIDATION_FAILED");
    }

    [Fact]
    public async Task WithoutExecutePermission_IsBlocked()
    {
        var writer = await AdminAsync(AdminPermissions.StockingRead, AdminPermissions.StockingWrite);
        var batch = await CreateAsync(writer, Batch(null, ("koi", 5)));

        await AssertErrorAsync(await PostAsync(writer, batch, "execute-now", 1), 403, "FORBIDDEN");
        Assert.Equal(15, await RemainingAsync("koi"));
    }

    [Fact]
    public async Task List_FiltersByStatus()
    {
        var client = await OperatorAsync();
        var done = await CreateAsync(client, Batch(null, ("koi", 5)));
        await ReadDataAsync(await PostAsync(client, done, "execute-now", 1));
        await CreateAsync(client, Batch(null, ("koi", 5)));

        var list = await DataAsync(client.GetAsync("/api/v1/admin/stocking?status=completed"));

        Assert.Single(list.GetProperty("items").EnumerateArray());
    }
}
