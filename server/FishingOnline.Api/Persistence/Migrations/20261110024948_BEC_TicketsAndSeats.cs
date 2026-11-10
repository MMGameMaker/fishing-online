using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FishingOnline.Api.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class BEC_TicketsAndSeats : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ticket_purchases",
                schema: "game",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PlayerId = table.Column<Guid>(type: "uuid", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    AddedMinutes = table.Column<int>(type: "integer", nullable: false),
                    UnitPriceGold = table.Column<long>(type: "bigint", nullable: false),
                    TotalGold = table.Column<long>(type: "bigint", nullable: false),
                    PriceVersion = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ExpiresAtAfter = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ticket_purchases", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "tickets",
                schema: "game",
                columns: table => new
                {
                    PlayerId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    PurchasedMinutes = table.Column<int>(type: "integer", nullable: false),
                    TicketVersion = table.Column<int>(type: "integer", nullable: false),
                    PriceVersion = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tickets", x => x.PlayerId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ticket_purchases_PlayerId",
                schema: "game",
                table: "ticket_purchases",
                column: "PlayerId");

            // SPEC 0.9: thời gian còn lại của phiên ghế cũ chuyển thành vé; người đang ngồi vẫn giữ ghế.
            migrationBuilder.Sql("""
                insert into game.tickets ("PlayerId", "ExpiresAt", "PurchasedMinutes", "TicketVersion", "PriceVersion")
                select "PlayerId", "ExpiresAt", "PurchasedMinutes", 1, 'migrated-from-seat'
                from game.seat_sessions where "EndedAt" is null
                on conflict ("PlayerId") do nothing;
                """);

            // Giữ lịch sử thu tiền của luật cũ; hạn sau khi mua lấy gần đúng bằng lúc mua cộng số phút.
            migrationBuilder.Sql("""
                insert into game.ticket_purchases ("Id", "PlayerId", "Quantity", "AddedMinutes", "UnitPriceGold", "TotalGold", "PriceVersion", "ExpiresAtAfter", "CreatedAt")
                select "Id", "PlayerId", "DurationUnits", "AddedMinutes", "UnitPriceGold", "TotalGold", "PriceVersion",
                       "CreatedAt" + make_interval(mins => "AddedMinutes"), "CreatedAt"
                from game.seat_purchases;
                """);

            // Config đã publish phải đọc được bằng model mới (parse nghiêm): bỏ Tier/cooldown/giá ghế, thêm giá vé test GD 2026-11-10.
            migrationBuilder.Sql("""
                update game.config_versions set "Json" =
                    ("Json" - 'seatTiers' - 'seatPricing') || jsonb_build_object(
                        'seatSession', jsonb_build_object('disconnectGraceMs', coalesce(("Json"->'seatSession'->>'disconnectGraceMs')::int, 120000)),
                        'fishing', (("Json"->'fishing') - 'resultPopupMs') || jsonb_build_object('failShownMs', 2000),
                        'lengthTiers', jsonb_set("Json"->'lengthTiers', '{maxLargeLuck}', to_jsonb(least(6, ("Json"->'lengthTiers'->>'maxLargeLuck')::int))),
                        'spawn', jsonb_set("Json"->'spawn', '{maxRareLuck}', to_jsonb(least(6, ("Json"->'spawn'->>'maxRareLuck')::int))),
                        'ticketPricing', jsonb_build_object(
                            'billingUnitMinutes', coalesce(("Json"->'seatPricing'->>'billingUnitMinutes')::int, 10),
                            'unitPriceGold', '50',
                            'maxUnitsPerPurchase', 6,
                            'priceVersion', 'ticket-price-test-01',
                            'status', 'Chuyển từ config thuê ghế khi migrate SPEC 0.9'))
                where "Json" ? 'seatTiers';
                """);

            migrationBuilder.DropTable(
                name: "seat_cooldowns",
                schema: "game");

            migrationBuilder.DropTable(
                name: "seat_purchases",
                schema: "game");

            migrationBuilder.DropColumn(
                name: "Tier",
                schema: "game",
                table: "seats");

            migrationBuilder.DropColumn(
                name: "ExpiresAt",
                schema: "game",
                table: "seat_sessions");

            migrationBuilder.DropColumn(
                name: "PriceVersion",
                schema: "game",
                table: "seat_sessions");

            migrationBuilder.DropColumn(
                name: "PurchasedMinutes",
                schema: "game",
                table: "seat_sessions");

            migrationBuilder.DropColumn(
                name: "SessionVersion",
                schema: "game",
                table: "seat_sessions");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ticket_purchases",
                schema: "game");

            migrationBuilder.DropTable(
                name: "tickets",
                schema: "game");

            migrationBuilder.AddColumn<int>(
                name: "Tier",
                schema: "game",
                table: "seats",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ExpiresAt",
                schema: "game",
                table: "seat_sessions",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<string>(
                name: "PriceVersion",
                schema: "game",
                table: "seat_sessions",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "PurchasedMinutes",
                schema: "game",
                table: "seat_sessions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "SessionVersion",
                schema: "game",
                table: "seat_sessions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "seat_cooldowns",
                schema: "game",
                columns: table => new
                {
                    SeatId = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Until = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_seat_cooldowns", x => x.SeatId);
                });

            migrationBuilder.CreateTable(
                name: "seat_purchases",
                schema: "game",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AddedMinutes = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    DurationUnits = table.Column<int>(type: "integer", nullable: false),
                    Kind = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    PlayerId = table.Column<Guid>(type: "uuid", nullable: false),
                    PriceVersion = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    SeatId = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    TotalGold = table.Column<long>(type: "bigint", nullable: false),
                    UnitPriceGold = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_seat_purchases", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_seat_purchases_SessionId",
                schema: "game",
                table: "seat_purchases",
                column: "SessionId");
        }
    }
}
