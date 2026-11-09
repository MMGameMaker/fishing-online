using System.Text.Json;
using System.Text.Json.Nodes;
using FishingOnline.Domain.Config;

namespace FishingOnline.Domain.Tests;

public sealed class GameplayConfigJsonTests
{
    private static readonly string FixtureJson = TestData.ConfigJson;

    private static JsonNode Fixture() => JsonNode.Parse(FixtureJson)!;

    [Fact]
    public void Parse_Fixture_ReadsAcceptanceValues()
    {
        var config = GameplayConfigJson.Parse(FixtureJson);

        Assert.Equal(160, config.Fish.Single(fish => fish.SpeciesId == "moonfin").Hp);
        Assert.Equal(120, config.SeatTiers.Single(tier => tier.Tier == 1).UnitPriceGold);
        Assert.Equal(440, config.Levels.Single(level => level.Level == 10).ExpReq);
    }

    [Fact]
    public void Parse_Fixture_ReadsStructure()
    {
        var config = GameplayConfigJson.Parse(FixtureJson);

        Assert.Equal(10, config.Levels.Count);
        Assert.Equal(5, config.Rods.Count);
        Assert.Equal(9, config.Fish.Count);
        Assert.Equal(Rarity.Legendary, config.Fish.Single(fish => fish.SpeciesId == "moonfin").Rarity);
        Assert.Equal(Enum.GetValues<Rarity>(), config.Minigame.Rarity.Select(entry => entry.Rarity));
        Assert.Null(config.Rods.Single(rod => rod.IsDefault).PriceGold);
        Assert.Equal(6050, config.Spawn.RarityBaseBp.Common);
        Assert.Equal(10, config.Spawn.RarityDeltaBpPerLuck.Legendary);
    }

    [Fact]
    public void Serialize_RoundTripsEveryFixtureField()
    {
        // Đọc rồi ghi lại phải ra đúng fixture: bảo đảm model không bỏ sót hay đổi kiểu field nào.
        var written = GameplayConfigJson.Serialize(GameplayConfigJson.Parse(FixtureJson));

        Assert.True(JsonNode.DeepEquals(Fixture(), JsonNode.Parse(written)), written);
    }

    [Fact]
    public void Parse_RejectsMissingField()
    {
        var node = Fixture();
        node["newPlayer"]!.AsObject().Remove("rodId");

        Assert.Throws<JsonException>(() => GameplayConfigJson.Parse(node.ToJsonString()));
    }

    [Fact]
    public void Parse_RejectsUnknownField()
    {
        var node = Fixture();
        node["levels"]![0]!["extra"] = 1;

        Assert.Throws<JsonException>(() => GameplayConfigJson.Parse(node.ToJsonString()));
    }

    [Fact]
    public void Parse_RejectsUnknownRarity()
    {
        var node = Fixture();
        node["fish"]![0]!["rarity"] = "mythic";

        Assert.Throws<JsonException>(() => GameplayConfigJson.Parse(node.ToJsonString()));
    }

    [Fact]
    public void Parse_RejectsMissingRarityInTable()
    {
        var node = Fixture();
        node["spawn"]!["rarityBaseBp"]!.AsObject().Remove("legendary");

        Assert.Throws<JsonException>(() => GameplayConfigJson.Parse(node.ToJsonString()));
    }

    [Fact]
    public void Parse_RejectsNullForRequiredValue()
    {
        var node = Fixture();
        node["configVersion"] = null;

        Assert.Throws<JsonException>(() => GameplayConfigJson.Parse(node.ToJsonString()));
    }

    [Fact]
    public void Parse_RejectsJsonNull() =>
        Assert.Throws<JsonException>(() => GameplayConfigJson.Parse("null"));

    [Fact]
    public void Domain_DoesNotReferenceInfrastructure()
    {
        var references = typeof(GameplayConfig).Assembly.GetReferencedAssemblies().Select(name => name.Name ?? string.Empty);

        Assert.DoesNotContain(references, name =>
            name.StartsWith("Microsoft.AspNetCore", StringComparison.Ordinal)
            || name.StartsWith("Microsoft.EntityFrameworkCore", StringComparison.Ordinal)
            || name.StartsWith("StackExchange.Redis", StringComparison.Ordinal));
    }
}
