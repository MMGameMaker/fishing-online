using System.Text.Json;
using System.Text.Json.Serialization;

namespace FishingOnline.Domain.Config;

/// <summary>
/// Đọc/ghi config ở chế độ nghiêm: thiếu field, thừa field, null sai chỗ hoặc rarity lạ đều ném
/// <see cref="JsonException"/>, để fixture và model không lệch nhau trong im lặng.
/// </summary>
public static class GameplayConfigJson
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow,
        RespectRequiredConstructorParameters = true,
        RespectNullableAnnotations = true,
        Converters = { new JsonStringEnumConverter<Rarity>(JsonNamingPolicy.CamelCase, allowIntegerValues: false) },
    };

    public static GameplayConfig Parse(string json) =>
        JsonSerializer.Deserialize<GameplayConfig>(json, Options)
        ?? throw new JsonException("Gameplay config must be a JSON object.");

    public static string Serialize(GameplayConfig config) => JsonSerializer.Serialize(config, Options);
}
