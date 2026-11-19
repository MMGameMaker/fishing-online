using FishingOnline.Api.Modules.Lake;

namespace FishingOnline.Api.Modules.Fishing;

/// <summary>Sự kiện hub: hồ vừa hết cá (<c>empty</c> true) hoặc vừa có cá trở lại (thả cá).</summary>
public sealed record LakeStockChangedView(bool Empty);

/// <summary>
/// Theo dõi "hồ hết cá" để Client chặn mua vé và chạy thông báo (yêu cầu 2026-11-19). Hết cá = đã có dòng quần thể
/// mà mọi loài đều remaining ≤ 0. Chưa có dòng nào (chưa gieo) không tính là hết. Poll nhẹ thay vì móc vào từng nơi
/// đổi tồn, nên bắt được cả đợt thả của Admin; đổi trạng thái thì phát <c>LakeStockChanged</c> cho cả hồ.
/// </summary>
public sealed class LakeStock(FishPopulation population, LakeRoom room)
{
    private bool? empty;

    /// <summary>Trạng thái mới nhất; chưa đo lần nào thì đo ngay (không phát event).</summary>
    public async Task<bool> IsEmptyAsync(CancellationToken ct)
    {
        if (empty is { } known) return known;
        empty = await MeasureAsync(ct);
        return empty.Value;
    }

    public async Task RefreshAsync(CancellationToken ct)
    {
        var now = await MeasureAsync(ct);
        var before = empty;
        empty = now;
        // Lần đo đầu chỉ ghi nhận: Client lấy trạng thái đầu từ snapshot khi vào hồ.
        if (before is { } previous && previous != now)
            await room.BroadcastAsync("LakeStockChanged", new LakeStockChangedView(now));
    }

    private async Task<bool> MeasureAsync(CancellationToken ct)
    {
        var rows = await population.SnapshotAsync(ct);
        return rows.Count > 0 && rows.All(row => row.Remaining <= 0);
    }
}
