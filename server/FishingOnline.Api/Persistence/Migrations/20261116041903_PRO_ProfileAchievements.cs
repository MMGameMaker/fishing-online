using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FishingOnline.Api.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PRO_ProfileAchievements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Bio",
                schema: "game",
                table: "players",
                type: "character varying(400)",
                maxLength: 400,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TitleId",
                schema: "game",
                table: "players",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "achievement_claims",
                schema: "game",
                columns: table => new
                {
                    PlayerId = table.Column<Guid>(type: "uuid", nullable: false),
                    AchievementId = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Level = table.Column<int>(type: "integer", nullable: false),
                    ClaimedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_achievement_claims", x => new { x.PlayerId, x.AchievementId, x.Level });
                });

            migrationBuilder.CreateTable(
                name: "showcase_slots",
                schema: "game",
                columns: table => new
                {
                    PlayerId = table.Column<Guid>(type: "uuid", nullable: false),
                    Slot = table.Column<int>(type: "integer", nullable: false),
                    SpeciesId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_showcase_slots", x => new { x.PlayerId, x.Slot });
                });

            migrationBuilder.CreateIndex(
                name: "IX_showcase_slots_PlayerId_SpeciesId",
                schema: "game",
                table: "showcase_slots",
                columns: new[] { "PlayerId", "SpeciesId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "achievement_claims",
                schema: "game");

            migrationBuilder.DropTable(
                name: "showcase_slots",
                schema: "game");

            migrationBuilder.DropColumn(
                name: "Bio",
                schema: "game",
                table: "players");

            migrationBuilder.DropColumn(
                name: "TitleId",
                schema: "game",
                table: "players");
        }
    }
}
