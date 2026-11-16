using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FishingOnline.Api.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class BOT_BotsAndMarks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsBot",
                schema: "game",
                table: "players",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsBot",
                schema: "game",
                table: "catches",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "bot_settings",
                schema: "game",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false),
                    Enabled = table.Column<bool>(type: "boolean", nullable: false),
                    MinTotalPlayers = table.Column<int>(type: "integer", nullable: false),
                    CheckIntervalSeconds = table.Column<int>(type: "integer", nullable: false),
                    MaxBots = table.Column<int>(type: "integer", nullable: false),
                    SuccessRatePct = table.Column<int>(type: "integer", nullable: false),
                    UpdatedBy = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_bot_settings", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "bot_settings",
                schema: "game");

            migrationBuilder.DropColumn(
                name: "IsBot",
                schema: "game",
                table: "players");

            migrationBuilder.DropColumn(
                name: "IsBot",
                schema: "game",
                table: "catches");
        }
    }
}
