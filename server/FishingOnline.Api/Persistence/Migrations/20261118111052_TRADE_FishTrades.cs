using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FishingOnline.Api.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class TRADE_FishTrades : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "HolderPlayerId",
                schema: "game",
                table: "catches",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "fish_trade_items",
                schema: "game",
                columns: table => new
                {
                    TradeId = table.Column<Guid>(type: "uuid", nullable: false),
                    CatchId = table.Column<Guid>(type: "uuid", nullable: false),
                    Offered = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_fish_trade_items", x => new { x.TradeId, x.CatchId });
                });

            migrationBuilder.CreateTable(
                name: "fish_trades",
                schema: "game",
                columns: table => new
                {
                    TradeId = table.Column<Guid>(type: "uuid", nullable: false),
                    FromPlayerId = table.Column<Guid>(type: "uuid", nullable: false),
                    ToPlayerId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    RespondedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_fish_trades", x => x.TradeId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_catches_HolderPlayerId",
                schema: "game",
                table: "catches",
                column: "HolderPlayerId");

            migrationBuilder.CreateIndex(
                name: "IX_fish_trades_FromPlayerId_Status",
                schema: "game",
                table: "fish_trades",
                columns: new[] { "FromPlayerId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_fish_trades_ToPlayerId_Status",
                schema: "game",
                table: "fish_trades",
                columns: new[] { "ToPlayerId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "fish_trade_items",
                schema: "game");

            migrationBuilder.DropTable(
                name: "fish_trades",
                schema: "game");

            migrationBuilder.DropIndex(
                name: "IX_catches_HolderPlayerId",
                schema: "game",
                table: "catches");

            migrationBuilder.DropColumn(
                name: "HolderPlayerId",
                schema: "game",
                table: "catches");
        }
    }
}
