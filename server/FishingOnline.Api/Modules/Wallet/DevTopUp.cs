using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Modules.Identity;

namespace FishingOnline.Api.Modules.Wallet;

/// <summary>
/// Tab "Nạp Gold" của cửa hàng khi chưa có cổng thanh toán (người dùng duyệt 2026-11-13): bấm gói nào thì
/// cộng đúng số Gold của gói đó. Chỉ đăng ký ở môi trường Development, nên bản chạy thật không có endpoint này.
/// Gold đi qua ví và sổ cái như mọi khoản khác (lý do <see cref="Reason"/>).
/// </summary>
public static class DevTopUp
{
    public const string Reason = LedgerReasons.DevTopUp;

    /// <summary>Gói nạp thử, khớp 3 ô trong ảnh mẫu cửa hàng.</summary>
    public static readonly IReadOnlyDictionary<string, long> Packs = new Dictionary<string, long>
    {
        ["gold_1000"] = 1_000,
        ["gold_5000"] = 5_000,
        ["gold_10000"] = 10_000,
    };

    public sealed record TopUpRequest(string PackId);

    public sealed record TopUpResponse(string GoldAdded, string Gold);

    public static WebApplication MapDevTopUp(this WebApplication app)
    {
        app.MapGroup("/api/v1/dev").RequireAuthorization()
            .MapPost("/topup", async (TopUpRequest request, IWallet wallet, ICurrentPlayer player, HttpContext http, CancellationToken ct) =>
            {
                if (request.PackId is null || !Packs.TryGetValue(request.PackId, out var amount))
                    throw new GameException(ErrorCatalog.ValidationFailed);
                var key = http.Request.Headers["Idempotency-Key"].ToString();
                var gold = await wallet.CreditAsync(player.PlayerId, amount, Reason, key, ct);
                return ApiResult.Ok(new TopUpResponse(Text(amount), Text(gold)));
            })
            .Idempotent("dev.topup");
        return app;
    }

    private static string Text(long gold) => gold.ToString(System.Globalization.CultureInfo.InvariantCulture);
}
