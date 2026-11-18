using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FishingOnline.Api.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class BOT02_TiersFriendsDirectMessages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MaxBots",
                schema: "game",
                table: "bot_settings");

            migrationBuilder.DropColumn(
                name: "MinTotalPlayers",
                schema: "game",
                table: "bot_settings");

            migrationBuilder.AddColumn<string>(
                name: "Tiers",
                schema: "game",
                table: "bot_settings",
                type: "jsonb",
                nullable: false,
                // Dòng cài đặt đã có (nếu Admin từng lưu) nhận bảng mốc mặc định BOT-02 (BotTiers.Default).
                defaultValue: "[{\"minRealPlayers\":0,\"totalBots\":30,\"fishingBots\":20},{\"minRealPlayers\":10,\"totalBots\":30,\"fishingBots\":20},{\"minRealPlayers\":20,\"totalBots\":20,\"fishingBots\":8},{\"minRealPlayers\":31,\"totalBots\":10,\"fishingBots\":0},{\"minRealPlayers\":41,\"totalBots\":3,\"fishingBots\":0}]");

            migrationBuilder.CreateTable(
                name: "direct_messages",
                schema: "game",
                columns: table => new
                {
                    MessageId = table.Column<Guid>(type: "uuid", nullable: false),
                    FromPlayerId = table.Column<Guid>(type: "uuid", nullable: false),
                    ToPlayerId = table.Column<Guid>(type: "uuid", nullable: false),
                    FromName = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Text = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: false),
                    SentAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_direct_messages", x => x.MessageId);
                });

            migrationBuilder.CreateTable(
                name: "friend_requests",
                schema: "game",
                columns: table => new
                {
                    FromPlayerId = table.Column<Guid>(type: "uuid", nullable: false),
                    ToPlayerId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    RespondedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_friend_requests", x => new { x.FromPlayerId, x.ToPlayerId });
                });

            migrationBuilder.CreateTable(
                name: "friendships",
                schema: "game",
                columns: table => new
                {
                    PlayerId = table.Column<Guid>(type: "uuid", nullable: false),
                    FriendId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_friendships", x => new { x.PlayerId, x.FriendId });
                });

            migrationBuilder.CreateIndex(
                name: "IX_direct_messages_FromPlayerId_ToPlayerId_SentAt",
                schema: "game",
                table: "direct_messages",
                columns: new[] { "FromPlayerId", "ToPlayerId", "SentAt" });

            migrationBuilder.CreateIndex(
                name: "IX_direct_messages_SentAt",
                schema: "game",
                table: "direct_messages",
                column: "SentAt");

            migrationBuilder.CreateIndex(
                name: "IX_direct_messages_ToPlayerId_SentAt",
                schema: "game",
                table: "direct_messages",
                columns: new[] { "ToPlayerId", "SentAt" });

            migrationBuilder.CreateIndex(
                name: "IX_friend_requests_ToPlayerId_Status",
                schema: "game",
                table: "friend_requests",
                columns: new[] { "ToPlayerId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "direct_messages",
                schema: "game");

            migrationBuilder.DropTable(
                name: "friend_requests",
                schema: "game");

            migrationBuilder.DropTable(
                name: "friendships",
                schema: "game");

            migrationBuilder.DropColumn(
                name: "Tiers",
                schema: "game",
                table: "bot_settings");

            migrationBuilder.AddColumn<int>(
                name: "MaxBots",
                schema: "game",
                table: "bot_settings",
                type: "integer",
                nullable: false,
                defaultValue: 10);

            migrationBuilder.AddColumn<int>(
                name: "MinTotalPlayers",
                schema: "game",
                table: "bot_settings",
                type: "integer",
                nullable: false,
                defaultValue: 10);
        }
    }
}
