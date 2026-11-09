using System.Globalization;
using FishingOnline.Domain.Config;
using FishingOnline.Sim;

const string ConfigRelativePath = "docs/v01/fixtures/gameplay-config.v0.json";
const string OutputRelativePath = "docs/v01/bao-cao/BE-B-09-ket-qua.md";

try
{
    var arguments = ParseArguments(args);
    var root = FindRepositoryRoot();
    var configPath = Resolve(root, Text(arguments, "config", ConfigRelativePath));
    var outputPath = Resolve(root, Text(arguments, "output", OutputRelativePath));
    var options = new SimOptions(
        Sessions: Positive(arguments, "sessions", 500),
        Trials: Positive(arguments, "trials", 2000),
        Seed: Positive(arguments, "seed", 20261109),
        DurationUnits: Text(arguments, "units", "1,2,3").Split(',').Select(ParsePositive).ToArray());

    var config = GameplayConfigJson.Parse(File.ReadAllText(configPath));
    File.WriteAllText(outputPath, new BalanceReport(config, options).Generate());
    Console.WriteLine($"Đã ghi {outputPath}");
    return 0;
}
catch (Exception error) when (error is ArgumentException or FormatException or IOException)
{
    Console.Error.WriteLine(error.Message);
    Console.Error.WriteLine("Tùy chọn: --sessions N --trials N --seed N --units 1,2,3 --config <file> --output <file>");
    return 2;
}

static Dictionary<string, string> ParseArguments(string[] args)
{
    if (args.Length % 2 != 0 || args.Where((_, index) => index % 2 == 0).Any(name => !name.StartsWith("--", StringComparison.Ordinal)))
        throw new ArgumentException("Tham số phải theo dạng --tên giá-trị.");
    return Enumerable.Range(0, args.Length / 2).ToDictionary(index => args[index * 2][2..], index => args[index * 2 + 1]);
}

static string Text(Dictionary<string, string> arguments, string name, string fallback) =>
    arguments.GetValueOrDefault(name, fallback);

static int Positive(Dictionary<string, string> arguments, string name, int fallback) =>
    arguments.TryGetValue(name, out var value) ? ParsePositive(value) : fallback;

static int ParsePositive(string value)
{
    var number = int.Parse(value, CultureInfo.InvariantCulture);
    return number > 0 ? number : throw new ArgumentException($"Giá trị phải dương: {value}.");
}

static string Resolve(string root, string path) => Path.GetFullPath(path, root);

// Tìm từ thư mục hiện tại đi lên, để lệnh chạy được từ gốc repo hoặc từ thư mục server.
static string FindRepositoryRoot()
{
    for (var directory = new DirectoryInfo(Directory.GetCurrentDirectory()); directory is not null; directory = directory.Parent)
        if (File.Exists(Path.Combine(directory.FullName, ConfigRelativePath)))
            return directory.FullName;
    throw new IOException($"Không tìm thấy {ConfigRelativePath} từ thư mục hiện tại.");
}
