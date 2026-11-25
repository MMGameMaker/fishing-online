using FishingOnline.Api.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FishingOnline.Api.Persistence.Migrations;

/// <summary>
/// Chọn nhân vật theo loài + màu (2026-11-25): skin cũ đã bake riêng từng màu đổi sang id <c>loài_trắng~màu</c> tương ứng
/// (bảng ánh xạ khớp LEGACY_SKIN_COLOR trong client-v0/src/online/entities/skinColor.ts). Chỉ dữ liệu, không đổi cấu trúc bảng.
/// </summary>
[DbContext(typeof(GameDbContext))]
[Migration("20261125073000_SKIN_ColorIds")]
public partial class SKIN_ColorIds : Migration
{
    private static readonly (string From, string To)[] Map =
    [
        ("skin_01", "skin_02~brown"), ("skin_03", "skin_02~beige"), ("skin_04", "skin_02~peach"), ("skin_05", "skin_02~gray"),
        ("skin_bot_bear_brown", "skin_bot_bear_polar~brown"), ("skin_bot_beaver_brown", "skin_bot_beaver_white~brown"),
        ("skin_bot_cat_black", "skin_bot_cat_white~gray"), ("skin_bot_cat_orange_tabby", "skin_bot_cat_white~orange"),
        ("skin_bot_cat_purple", "skin_bot_cat_white~purple"), ("skin_bot_cat_tuxedo", "skin_bot_cat_white~gray"),
        ("skin_bot_fox_cascade_grey", "skin_bot_fox_arctic~gray"), ("skin_bot_fox_silver", "skin_bot_fox_arctic~silver"),
        ("skin_bot_harlequin", "skin_bot_harlequin_white~orange"), ("skin_bot_rat_grey", "skin_bot_rat_white~silver"),
        ("skin_bot_red_spotted_bunny", "skin_bot_red_bunny_white~orange"), ("skin_bot_shiba_cream", "skin_bot_shiba_white~cream"),
        ("skin_bot_shiba_dark", "skin_bot_shiba_white~gray"), ("skin_bot_turtle_green", "skin_bot_turtle_white~green"),
        ("skin_bot_turtle_hermann", "skin_bot_turtle_white~brown"), ("skin_bot_turtle_leatherback", "skin_bot_turtle_white~blue"),
    ];

    protected override void Up(MigrationBuilder migrationBuilder)
    {
        foreach (var (from, to) in Map)
            migrationBuilder.Sql($"UPDATE game.players SET \"SelectedSkinId\" = '{to}' WHERE \"SelectedSkinId\" = '{from}';");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        foreach (var (from, to) in Map)
            migrationBuilder.Sql($"UPDATE game.players SET \"SelectedSkinId\" = '{from}' WHERE \"SelectedSkinId\" = '{to}';");
    }
}
