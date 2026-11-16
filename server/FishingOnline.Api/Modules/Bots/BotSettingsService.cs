using FishingOnline.Api.Modules.Admin;
using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Modules.Economy;
using FishingOnline.Api.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FishingOnline.Api.Modules.Bots;

/// <summary>Đọc/sửa cài đặt bot cho Admin. Chưa có dòng trong DB thì dùng mặc định của <see cref="BotSettingsRow"/>.</summary>
public sealed class BotSettingsService(GameDbContext db, TimeProvider time)
{
    public const int MinIntervalSeconds = 10;
    public const int MaxIntervalSeconds = 3600;
    public const int MaxPlayersLimit = 50;

    public async Task<BotSettingsRow> GetRowAsync(CancellationToken ct) =>
        await db.Set<BotSettingsRow>().AsNoTracking().SingleOrDefaultAsync(row => row.Id == BotSettingsRow.SingletonId, ct)
        ?? new BotSettingsRow();

    public async Task<BotSettingsView> GetAsync(CancellationToken ct) => ViewOf(await GetRowAsync(ct));

    public async Task<BotSettingsView> UpdateAsync(string actor, BotSettingsRequest request, CancellationToken ct)
    {
        if (request.MinTotalPlayers is < 0 or > MaxPlayersLimit
            || request.MaxBots is < 0 or > MaxPlayersLimit
            || request.CheckIntervalSeconds is < MinIntervalSeconds or > MaxIntervalSeconds
            || request.SuccessRatePct is < 0 or > 100)
            throw new GameException(ErrorCatalog.ValidationFailed);

        var row = await db.Set<BotSettingsRow>().AsTracking().SingleOrDefaultAsync(item => item.Id == BotSettingsRow.SingletonId, ct);
        var before = ViewOf(row ?? new BotSettingsRow());
        if (row is null)
        {
            row = new BotSettingsRow();
            db.Add(row);
        }
        row.Enabled = request.Enabled;
        row.MinTotalPlayers = request.MinTotalPlayers;
        row.CheckIntervalSeconds = request.CheckIntervalSeconds;
        row.MaxBots = request.MaxBots;
        row.SuccessRatePct = request.SuccessRatePct;
        row.UpdatedBy = actor;
        row.UpdatedAt = time.GetUtcNow();
        AdminAudit.Add(db, time, actor, "bots.settings", "bot_settings", before, ViewOf(row));
        await db.SaveChangesAsync(ct);
        return ViewOf(row);
    }

    /// <summary>Danh sách bot cho Admin (kèm trạng thái đang ở hồ và số cá đã câu); không có ở API của Client.</summary>
    public async Task<IReadOnlyList<AdminBotView>> ListBotsAsync(BotManager manager, CancellationToken ct)
    {
        var bots = await db.Players.AsNoTracking().Where(player => player.IsBot).OrderBy(player => player.DisplayNameKey).ToListAsync(ct);
        var ids = bots.Select(bot => bot.Id).ToArray();
        var catches = await db.Set<CatchRow>().AsNoTracking().Where(row => ids.Contains(row.PlayerId))
            .GroupBy(row => row.PlayerId).Select(group => new { PlayerId = group.Key, Count = group.Count() }).ToDictionaryAsync(row => row.PlayerId, row => row.Count, ct);
        return bots.Select(bot => new AdminBotView(
            bot.Id, bot.DisplayName, bot.Level, manager.IsActive(bot.Id), catches.GetValueOrDefault(bot.Id), bot.CreatedAt)).ToArray();
    }

    private static BotSettingsView ViewOf(BotSettingsRow row) => new(
        row.Enabled, row.MinTotalPlayers, row.CheckIntervalSeconds, row.MaxBots, row.SuccessRatePct, row.UpdatedBy, row.UpdatedAt);
}
