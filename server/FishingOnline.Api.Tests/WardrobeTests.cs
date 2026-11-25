using FishingOnline.Api.Modules.Wardrobe;

namespace FishingOnline.Api.Tests;

/// <summary>Danh mục trang phục bán ở Cửa hàng (yêu cầu 2026-11-25), không cần DB.</summary>
public sealed class WardrobeCatalogTests
{
    [Fact]
    public void Catalog_Has355Items_300Gold_UniqueIds_FourSlots()
    {
        var catalog = WardrobeCatalog.Load();
        Assert.Equal(300, catalog.PriceGold);
        Assert.Equal(355, catalog.Items.Count);
        Assert.Equal(catalog.Items.Count, catalog.ById.Count);
        Assert.Equal(40, catalog.Items.Count(item => item.Slot == WardrobeSlot.Hat));
        Assert.Equal(165, catalog.Items.Count(item => item.Slot == WardrobeSlot.Top));
        Assert.Equal(86, catalog.Items.Count(item => item.Slot == WardrobeSlot.Legs));
        Assert.Equal(64, catalog.Items.Count(item => item.Slot == WardrobeSlot.Set));
        Assert.All(catalog.Items, item => Assert.StartsWith(item.Slot + "_", item.Id));
        Assert.All(catalog.Items, item => Assert.False(string.IsNullOrWhiteSpace(item.Name)));
    }

    [Fact]
    public void ServerCatalog_MatchesClientToolsCatalog()
    {
        // Bản sao của client-v0/tools/wardrobe-items.json phải giống nguyên bản (sinh bởi tools/make_wardrobe_items.py).
        var dir = AppContext.BaseDirectory;
        while (dir is not null && !File.Exists(Path.Combine(dir, "client-v0", "tools", "wardrobe-items.json")))
            dir = Path.GetDirectoryName(dir);
        if (dir is null) return; // chạy ngoài repo (CI chỉ có Server) thì bỏ qua
        var client = File.ReadAllText(Path.Combine(dir, "client-v0", "tools", "wardrobe-items.json"));
        var server = File.ReadAllText(Path.Combine(dir, "server", "FishingOnline.Api", "Modules", "Wardrobe", "wardrobe-items.json"));
        Assert.Equal(client.ReplaceLineEndings(), server.ReplaceLineEndings());
    }
}
