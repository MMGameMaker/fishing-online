using System.Reflection;
using System.Text.Json;

namespace FishingOnline.Api.Modules.Bots;

/// <summary>Trạng thái bot lúc chọn câu chat world (BOT-02 mục 3).</summary>
public enum BotChatState
{
    /// <summary>Đi dạo, đứng, vừa đứng dậy...</summary>
    Idle,

    /// <summary>Ngồi ghế chờ cá cắn.</summary>
    Waiting,

    /// <summary>Cá đang cắn hoặc đang kéo (minigame).</summary>
    Fighting,
}

/// <summary>
/// Tên bot và câu chat (BOT-02 mục 5, Zen duyệt 2026-11-18), nạp từ <c>bot-content.json</c> (embedded resource) để GD đổi
/// không cần sửa code. Client mock giữ bản sao ở client-v0/src/online/mock/bot-content.json (có test so khớp).
/// </summary>
public sealed class BotContent
{
    private const string ResourceName = "bot-content.json";

    /// <summary>Câu 36–55 (đánh số từ 1): khi bot ngồi chờ cá.</summary>
    public const int WaitingFirst = 36;
    public const int WaitingLast = 55;

    /// <summary>Câu 56–75: khi cá cắn/đang kéo.</summary>
    public const int FightingFirst = 56;
    public const int FightingLast = 75;

    /// <summary>Có trạng thái riêng thì phần lớn lấy câu của trạng thái đó, còn lại lấy câu chung.</summary>
    public const double StateLineChance = 0.7;

    private BotContent(Document document)
    {
        Names = document.Names;
        NormalChat = document.NormalChat;
        SuccessChat = document.SuccessChat;
        if (NormalChat.Count < FightingLast) throw new InvalidOperationException("bot-content.json needs at least 75 normal chat lines.");
        GeneralLines = Enumerable.Range(0, NormalChat.Count)
            .Where(index => index + 1 < WaitingFirst || index + 1 > FightingLast)
            .Select(index => NormalChat[index]).ToArray();
        WaitingLines = NormalChat.Skip(WaitingFirst - 1).Take(WaitingLast - WaitingFirst + 1).ToArray();
        FightingLines = NormalChat.Skip(FightingFirst - 1).Take(FightingLast - FightingFirst + 1).ToArray();
    }

    public IReadOnlyList<string> Names { get; }

    /// <summary>"Chat bình thường" 100 câu: chat world, lời nhắn (bio) của bot, câu trả lời DM.</summary>
    public IReadOnlyList<string> NormalChat { get; }

    /// <summary>"Chat khi câu thành công" 50 câu.</summary>
    public IReadOnlyList<string> SuccessChat { get; }

    /// <summary>Câu 1–35 và 76–100: dùng lúc bất kỳ.</summary>
    public IReadOnlyList<string> GeneralLines { get; }

    public IReadOnlyList<string> WaitingLines { get; }

    public IReadOnlyList<string> FightingLines { get; }

    public static BotContent Load()
    {
        using var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(ResourceName)
            ?? throw new InvalidOperationException($"Embedded resource {ResourceName} is missing.");
        var document = JsonSerializer.Deserialize<Document>(stream, new JsonSerializerOptions(JsonSerializerDefaults.Web))
            ?? throw new InvalidOperationException("Bot content is empty.");
        return new BotContent(document);
    }

    /// <summary>Câu chat world theo trạng thái: chờ cá → câu 36–55, cá cắn/kéo → 56–75, kèm câu chung lúc bất kỳ.</summary>
    public string PickChat(BotChatState state, Random random)
    {
        var pool = state switch
        {
            BotChatState.Waiting when random.NextDouble() < StateLineChance => WaitingLines,
            BotChatState.Fighting when random.NextDouble() < StateLineChance => FightingLines,
            _ => GeneralLines,
        };
        return pool[random.Next(pool.Count)];
    }

    public string PickSuccess(Random random) => SuccessChat[random.Next(SuccessChat.Count)];

    public string PickNormal(Random random) => NormalChat[random.Next(NormalChat.Count)];

    /// <summary>Lời nhắn cố định của bot: một câu "Chat bình thường" chọn theo id (không đổi giữa các lần chạy).</summary>
    public string BioFor(Guid botId) => NormalChat[StableIndex(botId, 17, NormalChat.Count)];

    /// <summary>Danh hiệu cố định của bot theo id.</summary>
    public static string TitleFor(Guid botId, IReadOnlyList<string> titles) => titles[StableIndex(botId, 31, titles.Count)];

    private static int StableIndex(Guid id, int salt, int count)
    {
        var hash = salt;
        foreach (var b in id.ToByteArray()) hash = unchecked(hash * 31 + b);
        return (int)((uint)hash % (uint)count);
    }

    private sealed record Document(string[] Names, string[] NormalChat, string[] SuccessChat);
}

/// <summary>Một mốc bot (BOT-02 mục 1): từ <c>MinRealPlayers</c> user thật trở lên thì có <c>TotalBots</c> bot, trong đó <c>FishingBots</c> được câu.</summary>
public sealed record BotTier(int MinRealPlayers, int TotalBots, int FishingBots);

public static class BotTiers
{
    public const int MaxTiers = 10;

    /// <summary>Bảng mốc Zen duyệt 2026-11-18: 0–9 và 10–19 → 30/20, 20–30 → 20/8, 31–40 → 10/0, trên 40 → 3/0.</summary>
    public static readonly IReadOnlyList<BotTier> Default =
    [
        new(0, 30, 20),
        new(10, 30, 20),
        new(20, 20, 8),
        new(31, 10, 0),
        new(41, 3, 0),
    ];

    /// <summary>Mốc có ngưỡng lớn nhất không vượt số user thật. Bảng hợp lệ luôn có mốc 0 nên không bao giờ rỗng.</summary>
    public static BotTier Pick(IReadOnlyList<BotTier> tiers, int realPlayers) =>
        tiers.Where(tier => tier.MinRealPlayers <= Math.Max(0, realPlayers)).MaxBy(tier => tier.MinRealPlayers)
        ?? new BotTier(0, 0, 0);

    /// <summary>Mốc đầu là 0, ngưỡng tăng dần, số bot 0..<paramref name="maxPlayers"/>, bot câu không vượt tổng bot.</summary>
    public static bool IsValid(IReadOnlyList<BotTier>? tiers, int maxPlayers) =>
        tiers is { Count: > 0 and <= MaxTiers }
        && tiers[0].MinRealPlayers == 0
        && tiers.Zip(tiers.Skip(1)).All(pair => pair.Second.MinRealPlayers > pair.First.MinRealPlayers)
        && tiers.All(tier => tier.MinRealPlayers is >= 0 and <= 1000
            && tier.TotalBots >= 0 && tier.TotalBots <= maxPlayers
            && tier.FishingBots >= 0 && tier.FishingBots <= tier.TotalBots);
}
