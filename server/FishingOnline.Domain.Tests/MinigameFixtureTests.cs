using System.Text.Json;
using System.Text.Json.Serialization;
using FishingOnline.Domain.Attempts;
using FishingOnline.Domain.Rules;

namespace FishingOnline.Domain.Tests;

/// <summary>Harness cấp Domain: đi hết Start → bite → Hook rồi gửi outcome trong fixture. Gửi qua hub thật thuộc BE-E-03.</summary>
public class MinigameFixtureTests
{
    private const int WaitMs = 3000;
    private const double WidthTolerance = 1e-9;

    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow,
        RespectRequiredConstructorParameters = true,
        RespectNullableAnnotations = true,
    };

    private static readonly FixtureFile Fixture = JsonSerializer.Deserialize<FixtureFile>(
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "fixtures", "minigame-vectors.v0.json")),
        Options)!;

    public static TheoryData<string> SampleNames => new(Fixture.Samples.Select(sample => sample.Name));

    private static Sample Find(string name) => Fixture.Samples.Single(sample => sample.Name == name);

    /// <summary>Random trả đúng hai nửa của seed trong mẫu, sau đó là bậc và vị trí chiều dài.</summary>
    private static (FishingAttempt Attempt, AttemptStep Hook) HookSample(Sample sample)
    {
        var random = new ScriptedRandomSource(
            [(int)(sample.Params.Seed >> 16), (int)(sample.Params.Seed & 0xFFFF), 0],
            [0.5]);
        var context = new AttemptContext(TestData.Config, random, _ => sample.SpeciesId);
        var stats = new StatCalculator(TestData.Config).Compute(
            TestData.Level(sample.Player.Level),
            TestData.Rod(sample.Player.RodId));

        // startedAt trong mẫu là lúc minigame chạy, tức introMs sau lúc thu cần.
        var hookedAt = sample.Params.StartedAt.AddMilliseconds(-TestData.Config.Minigame.IntroMs);
        var attempt = FishingAttempt.Start(context, stats, hookedAt.AddMilliseconds(-WaitMs), WaitMs);
        attempt.Tick(hookedAt);
        return (attempt, attempt.Hook(hookedAt));
    }

    [Fact]
    public void Fixture_MatchesCurrentConfig_AndCoversEveryRarityAndOutcome()
    {
        Assert.Equal(TestData.Config.ConfigVersion, Fixture.ConfigVersion);
        Assert.Equal(
            Enum.GetValues<Domain.Config.Rarity>().Order(),
            Fixture.Samples.Select(sample => TestData.Species(sample.SpeciesId).Rarity).Distinct().Order());
        Assert.Contains(Fixture.Samples, sample => sample.Outcome == "success");
        Assert.Contains(Fixture.Samples, sample => sample.Outcome == "failed");
    }

    [Theory]
    [MemberData(nameof(SampleNames))]
    public void Hook_ProducesTheParamsInTheSample(string name)
    {
        var sample = Find(name);
        var (attempt, hook) = HookSample(sample);

        Assert.Null(hook.Error);
        var actual = attempt.Snapshot().Minigame!;
        var expected = sample.Params;
        Assert.Equal(expected.GreenWidth, actual.GreenWidth, WidthTolerance);
        Assert.Equal(expected.YellowWidth, actual.YellowWidth, WidthTolerance);
        // Fixture chưa có rarity (thêm 2026-11-12 để Client tô màu cá); tên mẫu bắt đầu bằng độ hiếm.
        Assert.StartsWith(actual.Rarity + "-", name);
        Assert.Equal(
            expected with { GreenWidth = actual.GreenWidth, YellowWidth = actual.YellowWidth, Rarity = actual.Rarity },
            actual);
    }

    [Theory]
    [MemberData(nameof(SampleNames))]
    public void Outcome_SentAfterHook_EndsAsTheSampleExpects(string name)
    {
        var sample = Find(name);
        var (attempt, _) = HookSample(sample);
        var outcome = sample.Outcome == "success" ? AttemptOutcome.Success : AttemptOutcome.Failed;

        var step = attempt.ReportOutcome(outcome, sample.Params.StartedAt.AddMilliseconds(sample.SubmitAfterMs));

        var state = attempt.Snapshot();
        Assert.Equal(sample.Expected.Phase, state.Phase.ToString().ToLowerInvariant());
        Assert.Equal(sample.Expected.Reason, state.Reason);
        Assert.Equal(
            sample.Expected.Error,
            step.Error is { } error ? JsonNamingPolicy.CamelCase.ConvertName(error.ToString()) : null);
        Assert.Equal(sample.Expected.Phase == "success" ? 1 : 0, step.Events.OfType<Succeeded>().Count());
    }

    private sealed record FixtureFile(string Purpose, string ConfigVersion, IReadOnlyList<Sample> Samples);

    private sealed record Sample(
        string Name,
        string SpeciesId,
        SamplePlayer Player,
        MinigameParams Params,
        string Outcome,
        int SubmitAfterMs,
        SampleExpected Expected);

    private sealed record SamplePlayer(int Level, string RodId);

    private sealed record SampleExpected(string Phase, string? Reason, string? Error);
}
