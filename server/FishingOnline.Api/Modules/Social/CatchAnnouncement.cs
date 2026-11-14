using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Modules.Config;
using FishingOnline.Api.Modules.Identity;
using FishingOnline.Api.Modules.Lake;
using FishingOnline.Api.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FishingOnline.Api.Modules.Social;

/// <summary>
/// Khoe cá kiểu 1 (doc/GAMEPLAY_SCOPE, GD 2026-11-13): Server phát cho mọi người trong hồ để Client hiện
/// thanh chạy chữ "Chúc mừng [tên] là người đầu tiên câu được [cá]" và ghi tin hệ thống vào khung chat.
/// <c>First</c> = true khi đó là lần đầu loài này được câu trên toàn hệ thống.
/// </summary>
public sealed record CatchAnnouncedView(
    Guid PlayerId, string DisplayName, string SpeciesId, string SpeciesName, string Rarity, bool First, DateTimeOffset AnnouncedAt);

/// <summary>
/// Lệnh test (người dùng yêu cầu 2026-11-13): phát thông báo khoe cá giả lập bằng tên người gọi, để thử
/// thanh thông báo trên nhiều tab. Chỉ đăng ký ở Development; trigger thật nằm ở FishingService.
/// </summary>
public static class DevCatchAnnouncement
{
    public sealed record AnnounceRequest(string? SpeciesId, bool? First);

    public static WebApplication MapDevCatchAnnouncement(this WebApplication app)
    {
        app.MapGroup("/api/v1/dev").RequireAuthorization()
            .MapPost("/announce-catch", async (
                AnnounceRequest? request, IConfigProvider configs, LakeRoom room, GameDbContext db,
                ICurrentPlayer player, TimeProvider time, CancellationToken ct) =>
            {
                var config = configs.Current;
                var fish = request?.SpeciesId is { } speciesId
                    ? config.Fish.SingleOrDefault(row => row.SpeciesId == speciesId)
                        ?? throw new GameException(ErrorCatalog.ValidationFailed)
                    : config.Fish[Random.Shared.Next(config.Fish.Count)];
                var displayName = await db.Players.AsNoTracking()
                    .Where(row => row.Id == player.PlayerId).Select(row => row.DisplayName).SingleAsync(ct);
                var view = new CatchAnnouncedView(
                    player.PlayerId, displayName, fish.SpeciesId, fish.Name,
                    fish.Rarity.ToString().ToLowerInvariant(), request?.First ?? true, time.GetUtcNow());
                await room.BroadcastAsync("CatchAnnounced", view);
                return ApiResult.Ok(view);
            });
        return app;
    }
}
