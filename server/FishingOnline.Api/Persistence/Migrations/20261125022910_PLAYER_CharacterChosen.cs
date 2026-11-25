using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FishingOnline.Api.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PLAYER_CharacterChosen : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "CharacterChosen",
                schema: "game",
                table: "players",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // Người chơi cũ đã đổi skin khác mặc định, và bot, coi như đã chọn nhân vật (không hiện panel Chọn nhân vật).
            migrationBuilder.Sql("update game.players set \"CharacterChosen\" = true where \"IsBot\" or \"SelectedSkinId\" <> 'skin_01'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CharacterChosen",
                schema: "game",
                table: "players");
        }
    }
}
