using FishingOnline.Api.Modules.Social;

namespace FishingOnline.Api.Tests;

/// <summary>Skin có màu `loài trắng~màu` (yêu cầu 2026-11-25), không cần DB.</summary>
public sealed class SkinColorTests
{
    [Theory]
    [InlineData("skin_02~brown", true)]
    [InlineData("skin_bot_cat_white~purple", true)]
    [InlineData("skin_bot_red_bunny_white~blue", true)]
    [InlineData("skin_02~white", false)] // trắng là id gốc, không có hậu tố
    [InlineData("skin_02~khong-co", false)]
    [InlineData("skin_01~brown", false)] // không phải loài trắng
    [InlineData("skin_bot_cat_black~orange", false)]
    [InlineData("~brown", false)]
    [InlineData("skin_02", false)]
    public void IsValidColored_ChecksSpeciesAndColor(string skinId, bool expected) =>
        Assert.Equal(expected, SkinColors.IsValidColored(skinId));

    [Fact]
    public void ServerLists_MatchClientSkinColorTs()
    {
        // Danh sách loài và màu phải khớp client-v0/src/online/entities/skinColor.ts.
        var dir = AppContext.BaseDirectory;
        while (dir is not null && !File.Exists(Path.Combine(dir, "client-v0", "src", "online", "entities", "skinColor.ts")))
            dir = Path.GetDirectoryName(dir);
        if (dir is null) return; // chạy ngoài repo thì bỏ qua
        var ts = File.ReadAllText(Path.Combine(dir, "client-v0", "src", "online", "entities", "skinColor.ts"));
        foreach (var white in SkinColors.WhiteBases) Assert.Contains($"base: '{white}'", ts);
        foreach (var color in SkinColors.ColorIds) Assert.Contains($"id: '{color}'", ts);
        Assert.Equal(SkinColors.WhiteBases.Count, System.Text.RegularExpressions.Regex.Matches(ts, "base: 'skin_").Count);
    }
}
