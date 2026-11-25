using System.Globalization;
using System.Reflection;
using System.Text.Json;
using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Modules.Identity;
using FishingOnline.Api.Modules.Lake;
using FishingOnline.Api.Modules.Wallet;
using FishingOnline.Api.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FishingOnline.Api.Modules.Wardrobe;

/// <summary>
/// Trang phục bán ở tab "Trang phục" của Cửa hàng (yêu cầu 2026-11-25): mũ, áo, quần và nguyên bộ, mỗi món 300 Gold, mặc lên nhân vật.
/// Danh mục nằm trong wardrobe-items.json (nhúng, sao chép nguyên từ client-v0/tools/wardrobe-items.json do
/// tools/make_wardrobe_items.py sinh). Id dạng <c>hat_beanie</c>, <c>top_cute-sweater</c>, <c>legs_cargo-pants</c>, <c>set_santa-outfit</c>.
/// </summary>
public sealed record WardrobeItem(string Id, string Slot, string Name);

public static class WardrobeSlot
{
    public const string Hat = "hat";
    public const string Top = "top";
    public const string Legs = "legs";

    /// <summary>Nguyên bộ (bộ liền): thay cả áo và quần, nên không mặc cùng áo/quần lẻ.</summary>
    public const string Set = "set";
}

public sealed class WardrobeCatalog
{
    private const string ResourceName = "wardrobe-items.json";

    private WardrobeCatalog(int priceGold, IReadOnlyList<WardrobeItem> items)
    {
        PriceGold = priceGold;
        Items = items;
        ById = items.ToDictionary(item => item.Id);
    }

    public int PriceGold { get; }
    public IReadOnlyList<WardrobeItem> Items { get; }
    public IReadOnlyDictionary<string, WardrobeItem> ById { get; }

    public static WardrobeCatalog Load()
    {
        using var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(ResourceName)
            ?? throw new InvalidOperationException($"Thiếu tài nguyên nhúng {ResourceName}");
        using var document = JsonDocument.Parse(stream);
        var root = document.RootElement;
        var items = root.GetProperty("items").EnumerateArray()
            .Select(item => new WardrobeItem(
                item.GetProperty("id").GetString()!, item.GetProperty("slot").GetString()!, item.GetProperty("name").GetString()!))
            .ToList();
        return new WardrobeCatalog(root.GetProperty("priceGold").GetInt32(), items);
    }
}

/// <summary>Món trang phục người chơi đã mua.</summary>
public sealed class WardrobeOwnedRow
{
    public Guid PlayerId { get; set; }
    public string ItemId { get; set; } = string.Empty;
    public DateTimeOffset AcquiredAt { get; set; }
}

public sealed class WardrobeOwnedRowConfig : IEntityTypeConfiguration<WardrobeOwnedRow>
{
    public void Configure(EntityTypeBuilder<WardrobeOwnedRow> entity)
    {
        entity.ToTable("wardrobe_owned");
        entity.HasKey(row => new { row.PlayerId, row.ItemId });
        entity.Property(row => row.ItemId).HasMaxLength(64);
    }
}

/// <summary>Đồ đang mặc; null là chưa mặc món ở loại đó.</summary>
public sealed record OutfitView(string? HatId, string? TopId, string? LegsId, string? SetId = null)
{
    public static OutfitView Empty { get; } = new(null, null, null, null);
}

public sealed record WardrobeItemView(string ItemId, string Slot, string Name, int PriceGold, bool Owned);

public sealed record WardrobeView(IReadOnlyList<WardrobeItemView> Items, OutfitView Equipped);

public sealed record BuyWardrobeRequest(string ItemId);

public sealed record BuyWardrobeResponse(string Gold, WardrobeItemView Item);

public sealed record SetOutfitRequest(string? HatId, string? TopId, string? LegsId, string? SetId = null);

public sealed record OutfitChangedView(Guid PlayerId, string? HatId, string? TopId, string? LegsId, string? SetId);

public sealed class WardrobeService(GameDbContext db, IWallet wallet, WardrobeCatalog catalog, TimeProvider time, LakeRoom room)
{
    public async Task<WardrobeView> ListAsync(Guid playerId, CancellationToken ct)
    {
        var owned = (await db.Set<WardrobeOwnedRow>().AsNoTracking().Where(row => row.PlayerId == playerId)
            .Select(row => row.ItemId).ToListAsync(ct)).ToHashSet();
        var player = await db.Players.AsNoTracking().SingleAsync(row => row.Id == playerId, ct);
        var items = catalog.Items.Select(item => ToView(item, owned.Contains(item.Id))).ToList();
        return new WardrobeView(items, new OutfitView(player.HatId, player.TopId, player.LegsId, player.SetId));
    }

    /// <summary>Mua một món (300 Gold): trừ Gold rồi thêm hàng sở hữu; mua lại → WARDROBE_ALREADY_OWNED.</summary>
    public async Task<BuyWardrobeResponse> BuyAsync(Guid playerId, string itemId, CancellationToken ct)
    {
        if (!catalog.ById.TryGetValue(itemId, out var item)) throw new GameException(ErrorCatalog.ValidationFailed);
        if (await db.Set<WardrobeOwnedRow>().AsNoTracking().AnyAsync(row => row.PlayerId == playerId && row.ItemId == itemId, ct))
            throw new GameException("WARDROBE_ALREADY_OWNED");

        var gold = await wallet.DebitAsync(playerId, catalog.PriceGold, LedgerReasons.BuyWardrobe, itemId, ct);
        db.Add(new WardrobeOwnedRow { PlayerId = playerId, ItemId = itemId, AcquiredAt = time.GetUtcNow() });
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException exception) when (exception.UniqueConstraint() is not null)
        {
            throw new GameException("WARDROBE_ALREADY_OWNED");
        }
        return new BuyWardrobeResponse(gold.ToString(CultureInfo.InvariantCulture), ToView(item, true));
    }

    /// <summary>Đặt đồ đang mặc (thay cả bộ; null = cởi). Món phải đúng loại và đã mua. Cả hồ thấy ngay (OutfitChanged).</summary>
    public async Task<OutfitView> SetOutfitAsync(Guid playerId, SetOutfitRequest request, CancellationToken ct)
    {
        var wanted = new[]
        {
            (request.HatId, WardrobeSlot.Hat), (request.TopId, WardrobeSlot.Top), (request.LegsId, WardrobeSlot.Legs),
            (request.SetId, WardrobeSlot.Set),
        };
        // Nguyên bộ thay cả áo và quần: mặc cùng áo/quần lẻ là sai (Client tự cởi áo, quần khi mặc bộ và ngược lại).
        if (request.SetId is not null && (request.TopId is not null || request.LegsId is not null))
            throw new GameException(ErrorCatalog.ValidationFailed);
        var ids = new List<string>();
        foreach (var (id, slot) in wanted)
        {
            if (id is null) continue;
            if (!catalog.ById.TryGetValue(id, out var item) || item.Slot != slot) throw new GameException(ErrorCatalog.ValidationFailed);
            ids.Add(id);
        }
        if (ids.Count > 0)
        {
            var owned = await db.Set<WardrobeOwnedRow>().AsNoTracking()
                .Where(row => row.PlayerId == playerId && ids.Contains(row.ItemId)).CountAsync(ct);
            if (owned != ids.Count) throw new GameException("WARDROBE_NOT_OWNED");
        }

        await db.Players.Where(row => row.Id == playerId).ExecuteUpdateAsync(setters => setters
            .SetProperty(row => row.HatId, request.HatId)
            .SetProperty(row => row.TopId, request.TopId)
            .SetProperty(row => row.LegsId, request.LegsId)
            .SetProperty(row => row.SetId, request.SetId), ct);
        var outfit = new OutfitView(request.HatId, request.TopId, request.LegsId, request.SetId);
        await room.Queue.RunAsync(async () =>
        {
            if (room.Find(playerId) is { } member)
            {
                member.Outfit = outfit;
                await room.BroadcastAsync("OutfitChanged", new OutfitChangedView(playerId, outfit.HatId, outfit.TopId, outfit.LegsId, outfit.SetId));
            }
            return true;
        });
        return outfit;
    }

    private WardrobeItemView ToView(WardrobeItem item, bool owned) => new(item.Id, item.Slot, item.Name, catalog.PriceGold, owned);
}

public static class WardrobeModule
{
    public static IServiceCollection AddWardrobe(this IServiceCollection services) => services
        .AddSingleton(_ => WardrobeCatalog.Load())
        .AddScoped<WardrobeService>();

    public static WebApplication MapWardrobe(this WebApplication app)
    {
        app.MapGet("/api/v1/wardrobe", async (WardrobeService wardrobe, ICurrentPlayer player, CancellationToken ct) =>
            ApiResult.Ok(await wardrobe.ListAsync(player.PlayerId, ct))).RequireAuthorization();
        app.MapPost("/api/v1/wardrobe/buy", async (BuyWardrobeRequest request, WardrobeService wardrobe, ICurrentPlayer player, CancellationToken ct) =>
            ApiResult.Ok(await wardrobe.BuyAsync(player.PlayerId, request.ItemId, ct))).RequireAuthorization();
        app.MapPut("/api/v1/me/outfit", async (SetOutfitRequest request, WardrobeService wardrobe, ICurrentPlayer player, CancellationToken ct) =>
            ApiResult.Ok(await wardrobe.SetOutfitAsync(player.PlayerId, request, ct))).RequireAuthorization();
        return app;
    }
}
