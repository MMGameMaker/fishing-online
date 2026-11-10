using FishingOnline.Domain.Config;

namespace FishingOnline.Domain.Tests;

internal static class TestData
{
    public static readonly string ConfigJson =
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "fixtures", "gameplay-config.v0.json"));

    public static readonly GameplayConfig Config = GameplayConfigJson.Parse(ConfigJson);

    public static Fish Species(string speciesId) => Config.Fish.Single(fish => fish.SpeciesId == speciesId);
    public static LevelConfig Level(int level) => Config.Levels.Single(entry => entry.Level == level);
    public static Rod Rod(string rodId) => Config.Rods.Single(rod => rod.RodId == rodId);
}

/// <summary>Random có seed cố định, để test phân phối luôn cho cùng kết quả.</summary>
internal sealed class SeededRandomSource(int seed) : IRandomSource
{
    private readonly Random random = new(seed);

    public double NextDouble() => random.NextDouble();
    public int NextInt(int minInclusive, int maxInclusive) => random.Next(minInclusive, maxInclusive + 1);
}

/// <summary>Trả lần lượt các giá trị định sẵn và ghi lại khoảng được yêu cầu.</summary>
internal sealed class ScriptedRandomSource(int[] ints, double[]? doubles = null) : IRandomSource
{
    private readonly Queue<int> intValues = new(ints);
    private readonly Queue<double> doubleValues = new(doubles ?? []);

    public List<(int Min, int Max)> IntRequests { get; } = [];

    public double NextDouble() => doubleValues.Dequeue();

    public int NextInt(int minInclusive, int maxInclusive)
    {
        IntRequests.Add((minInclusive, maxInclusive));
        return intValues.Dequeue();
    }
}
