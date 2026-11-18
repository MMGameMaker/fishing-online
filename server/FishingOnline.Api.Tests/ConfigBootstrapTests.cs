using FishingOnline.Api.Modules.Config;
using FishingOnline.Domain.Config;
using Microsoft.EntityFrameworkCore;

namespace FishingOnline.Api.Tests;

/// <summary>DB đã chạy với version cũ: fixture đổi configVersion thì lần khởi động sau tự nạp và bật version mới.</summary>
public sealed class ConfigBootstrapTests(PostgresServer postgres) : GameTestBase(postgres)
{
    private const string OldVersion = "old-config-01";

    [Fact]
    public async Task NewFixtureVersion_BecomesActiveOnNextStart()
    {
        var fixture = App.Service<IConfigProvider>().Current;
        await App.WithDbAsync(async db =>
        {
            // Giả lập DB nạp từ fixture cũ: chỉ có một version khác, đang bật, thiếu offer skin.
            db.Remove(await db.Set<ConfigVersionRow>().SingleAsync(row => row.Version == fixture.ConfigVersion));
            await db.SaveChangesAsync();
            var old = fixture with { ConfigVersion = OldVersion, ShopOffers = [.. fixture.ShopOffers.Where(offer => !offer.OfferId.StartsWith("offer_skin_", StringComparison.Ordinal))] };
            db.Add(new ConfigVersionRow
            {
                Version = OldVersion, Json = GameplayConfigJson.Serialize(old), PublishedAt = App.Clock.GetUtcNow(), PublishedBy = "test", IsActive = true,
            });
            return await db.SaveChangesAsync();
        });

        var restarted = StartApp();

        var rows = await restarted.WithDbAsync(db => db.Set<ConfigVersionRow>().AsNoTracking().ToListAsync());
        Assert.Equal(fixture.ConfigVersion, rows.Single(row => row.IsActive).Version);
        Assert.False(rows.Single(row => row.Version == OldVersion).IsActive);
        var current = restarted.Service<IConfigProvider>().Current;
        Assert.Equal(fixture.ConfigVersion, current.ConfigVersion);
        Assert.Contains(current.ShopOffers, offer => offer.OfferId == "offer_skin_06");
    }

    [Fact]
    public async Task SameFixtureVersion_KeepsAdminPublishedVersion()
    {
        var fixture = App.Service<IConfigProvider>().Current;
        await App.WithDbAsync(async db =>
        {
            var active = await db.Set<ConfigVersionRow>().SingleAsync(row => row.IsActive);
            active.IsActive = false;
            await db.SaveChangesAsync();
            db.Add(new ConfigVersionRow
            {
                Version = "cfg-admin-01", Json = GameplayConfigJson.Serialize(fixture with { ConfigVersion = "cfg-admin-01" }),
                PublishedAt = App.Clock.GetUtcNow(), PublishedBy = "admin", IsActive = true,
            });
            return await db.SaveChangesAsync();
        });

        var restarted = StartApp();

        Assert.Equal("cfg-admin-01", restarted.Service<IConfigProvider>().Current.ConfigVersion);
    }
}
