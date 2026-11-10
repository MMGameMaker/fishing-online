using System.Globalization;
using System.Text;
using FishingOnline.Domain.Config;
using FishingOnline.Domain.Rules;

namespace FishingOnline.Sim;

public sealed record SimOptions(int Sessions, int Trials, int Seed, IReadOnlyList<int> DurationUnits);

/// <summary>Sinh báo cáo Markdown. Cùng config và options luôn cho đúng cùng một nội dung.</summary>
public sealed class BalanceReport(GameplayConfig config, SimOptions options)
{
    private static readonly SkillProfile[] Profiles =
        [PlayerModel.Beginner, PlayerModel.Average, PlayerModel.Expert];

    private readonly StringBuilder output = new();

    private sealed record Archetype(string Label, LevelConfig Level, Rod Rod);

    public string Generate()
    {
        WriteHeader();
        WriteWinRates(new SimRandom(options.Seed + 1));
        WriteSkillSensitivity(new SimRandom(options.Seed + 2));
        WriteSessions(new SimRandom(options.Seed + 3));
        WriteProgression(new SimRandom(options.Seed + 4));
        return output.ToString();
    }

    /// <summary>Tỷ lệ thắng của một tổ hợp level và cần.</summary>
    public double WinRate(Rarity rarity, LevelConfig level, Rod rod, SkillProfile skill, SimRandom random)
    {
        var player = PlayerModel.Default(skill);
        var species = config.Fish.Where(fish => fish.Rarity == rarity).ToArray();
        var stats = new StatCalculator(config).Compute(level, rod);
        var wins = 0;
        for (var trial = 0; trial < options.Trials; trial++)
        {
            var parameters = MinigameParams.Create(
                config.Minigame, species[trial % species.Length], stats, random.NextSeed(), DateTimeOffset.UnixEpoch);
            if (player.Play(parameters, random).Won) wins++;
        }
        return (double)wins / options.Trials;
    }

    private void WriteHeader()
    {
        var player = PlayerModel.Default(PlayerModel.Average);
        Line("# BE-B-09 — Kết quả mô phỏng balance");
        Line();
        Line($"- **Config:** `{config.ConfigVersion}`");
        Line($"- **Tham số chạy:** {options.Sessions} phiên mỗi dòng, {options.Trials} ván mỗi ô tỷ lệ thắng, seed {options.Seed}.");
        Line("- **Lệnh tạo lại:** `dotnet run --project server/FishingOnline.Sim`");
        Line();
        Line("> Mọi con số là **mô phỏng với người chơi giả định**, không phải số đo từ người chơi thật, và không bảo đảm Client thật không gian lận. Config hiện vẫn là giá trị test, chưa khóa balance.");
        Line();
        Line("## Mô hình người chơi (giả định)");
        Line();
        Line($"- Hook sau khi cá cắn: ngẫu nhiên đều {player.ReactionMinMs}-{player.ReactionMaxMs} ms.");
        Line("- Minigame: luôn nhắm giữa vùng vàng; thời điểm bấm lệch theo phân phối chuẩn với độ lệch chuẩn của từng mức kỹ năng: "
            + string.Join(", ", Profiles.Select(profile => $"{profile.Name} {Number(profile.TimingErrorMs)} ms")) + ".");
        Line($"- Sau mỗi lần bấm cần ít nhất {player.ReaimMs} ms để nhắm lại vùng mới.");
        Line($"- Client tự quăng cần lại sau kết quả (SPEC 0.8): thắng sau {player.ResultDismissMs} ms (người chơi chạm đóng popup), thua sau {player.FailHoldMs} ms.");
        Line($"- Các bảng dưới dùng mức **{PlayerModel.Average.Name}**, trừ bảng so sánh kỹ năng.");
        Line();
        Line("**Chưa mô phỏng:** tồn cá trong hồ (SPEC chưa chốt tồn đầu/khi cạn), độ trễ mạng, cooldown ghế và thời gian chờ giữa hai phiên.");
        Line();
    }

    private void WriteWinRates(SimRandom random)
    {
        Line("## Tỷ lệ thắng theo rarity × level × cần");
        Line();
        Line($"Mức kỹ năng {PlayerModel.Average.Name}.");
        Line();
        foreach (var rarity in Enum.GetValues<Rarity>())
        {
            Line($"### {rarity}");
            Line();
            Row(["Level", .. config.Rods.Select(rod => rod.Name)]);
            Divider(config.Rods.Count + 1);
            foreach (var level in config.Levels)
                Row([
                    $"Lv{level.Level}",
                    .. config.Rods.Select(rod => Percent(WinRate(rarity, level, rod, PlayerModel.Average, random))),
                ]);
            Line();
        }
    }

    private void WriteSkillSensitivity(SimRandom random)
    {
        Line("## So sánh theo kỹ năng");
        Line();
        Line("Cho thấy tỷ lệ thắng phụ thuộc mạnh vào sai số giả định, nên cần hiệu chỉnh bằng dữ liệu playtest.");
        Line();
        Row(["Người chơi", "Rarity", .. Profiles.Select(profile => profile.Name)]);
        Divider(Profiles.Length + 2);
        foreach (var archetype in Archetypes())
        foreach (var rarity in Enum.GetValues<Rarity>())
            Row([
                archetype.Label,
                rarity.ToString(),
                .. Profiles.Select(profile => Percent(WinRate(rarity, archetype.Level, archetype.Rod, profile, random))),
            ]);
        Line();
    }

    private void WriteSessions(SimRandom random)
    {
        var simulator = new SessionSimulator(config, PlayerModel.Default(PlayerModel.Average), random);
        var price = config.TicketPricing.UnitPriceGold;
        Line("## Số lần câu và Gold mỗi lượt vé");
        Line();
        Line($"Vé {price} Gold / {config.TicketPricing.BillingUnitMinutes} phút, không buff ghế. Chỉ số giữ nguyên trong lượt, bán hết cá theo giá loài. Lãi = Gold bán cá − tiền vé.");
        Line();
        Row(["Số vé", "Phút", "Người chơi", "Lần câu TB", "Bắt được TB", "Gold bán cá TB", "Tiền vé", "Lãi TB", "Lãi P10"]);
        Divider(9);
        foreach (var units in options.DurationUnits)
        foreach (var archetype in Archetypes())
        {
            var runs = Enumerable.Range(0, options.Sessions)
                .Select(_ => simulator.RunSession(archetype.Level, archetype.Rod, units))
                .ToArray();
            var ticket = units * price;
            Row([
                units.ToString(CultureInfo.InvariantCulture),
                (units * config.TicketPricing.BillingUnitMinutes).ToString(CultureInfo.InvariantCulture),
                archetype.Label,
                Number(runs.Average(run => run.Attempts)),
                Number(runs.Average(run => run.Catches)),
                Number(runs.Average(run => run.GoldEarned)),
                ticket.ToString(CultureInfo.InvariantCulture),
                Number(runs.Average(run => run.GoldEarned - ticket)),
                Number(Percentile(runs.Select(run => (double)(run.GoldEarned - ticket)), 0.1)),
            ]);
        }
        Line();
    }

    private void WriteProgression(SimRandom random)
    {
        var simulator = new SessionSimulator(config, PlayerModel.Default(PlayerModel.Average), random);
        Line("## Thời gian lên level cao nhất");
        Line();
        var price = config.TicketPricing.UnitPriceGold;
        Line($"Người chơi mới ({config.NewPlayer.Gold} Gold), mua từng vé {price} Gold / {config.TicketPricing.BillingUnitMinutes} phút, bán cá ngay khi bắt được. Hết Gold mua vé thì dừng. Thời gian chỉ tính lúc còn vé.");
        if (price > config.NewPlayer.Gold)
            Line("Tỷ lệ đạt 0% vì Gold khởi đầu không đủ mua vé đầu tiên.");
        Line();
        Row(["Chiến lược cần", "Tỷ lệ đạt", "Phút TB", "Phút P90", "Lần câu TB", "Số vé TB"]);
        Divider(6);
        foreach (var buyRods in new[] { false, true })
        {
            var runs = Enumerable.Range(0, options.Sessions)
                .Select(_ => simulator.RunToMaxLevel(price, buyRods))
                .ToArray();
            var reached = runs.Where(run => run.ReachedMax).ToArray();
            Row([
                buyRods ? "Mua cần tốt hơn khi đủ Gold" : "Giữ cần mặc định",
                Percent((double)reached.Length / runs.Length),
                reached.Length == 0 ? "-" : Number(reached.Average(run => run.PlayedMinutes)),
                reached.Length == 0 ? "-" : Number(Percentile(reached.Select(run => run.PlayedMinutes), 0.9)),
                reached.Length == 0 ? "-" : Number(reached.Average(run => run.Attempts)),
                reached.Length == 0 ? "-" : Number(reached.Average(run => run.TicketsBought)),
            ]);
        }
        Line();
    }

    /// <summary>Ba mốc lấy từ config: đầu game, giữa game với cần rẻ nhất phải mua, cuối game với cần đắt nhất.</summary>
    private IReadOnlyList<Archetype> Archetypes()
    {
        var levels = config.Levels.OrderBy(level => level.Level).ToArray();
        var starter = config.Rods.Single(rod => rod.RodId == config.NewPlayer.RodId);
        var bought = config.Rods.Where(rod => rod.PriceGold is not null).OrderBy(rod => rod.PriceGold).ToArray();
        var middle = levels[levels.Length / 2 - 1];
        return
        [
            new($"Lv{levels[0].Level} + {starter.Name}", levels[0], starter),
            new($"Lv{middle.Level} + {bought[0].Name}", middle, bought[0]),
            new($"Lv{levels[^1].Level} + {bought[^1].Name}", levels[^1], bought[^1]),
        ];
    }

    private static double Percentile(IEnumerable<double> values, double fraction)
    {
        var sorted = values.Order().ToArray();
        return sorted[(int)Math.Ceiling(fraction * sorted.Length) - 1];
    }

    private static string Number(double value) => value.ToString("0.#", CultureInfo.InvariantCulture);

    private static string Percent(double value) => value.ToString("0.0%", CultureInfo.InvariantCulture);

    private void Row(IEnumerable<string> cells) => Line("| " + string.Join(" | ", cells) + " |");

    private void Divider(int columns) => Row(Enumerable.Repeat("---", columns));

    private void Line(string text = "") => output.Append(text).Append('\n');
}
