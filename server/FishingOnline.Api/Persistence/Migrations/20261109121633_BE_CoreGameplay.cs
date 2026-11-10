using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FishingOnline.Api.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class BE_CoreGameplay : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DisplayNameKey",
                schema: "game",
                table: "players",
                type: "character varying(80)",
                maxLength: 80,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "EquippedRodId",
                schema: "game",
                table: "players",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "Exp",
                schema: "game",
                table: "players",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "InventoryVersion",
                schema: "game",
                table: "players",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Level",
                schema: "game",
                table: "players",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<string>(
                name: "SelectedSkinId",
                schema: "game",
                table: "players",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "accounts",
                schema: "game",
                columns: table => new
                {
                    AccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    FirebaseProjectId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    FirebaseUid = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    PlayerId = table.Column<Guid>(type: "uuid", nullable: false),
                    Provider = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    AuthVersion = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_accounts", x => x.AccountId);
                });

            migrationBuilder.CreateTable(
                name: "catches",
                schema: "game",
                columns: table => new
                {
                    CatchId = table.Column<Guid>(type: "uuid", nullable: false),
                    PlayerId = table.Column<Guid>(type: "uuid", nullable: false),
                    AttemptId = table.Column<Guid>(type: "uuid", nullable: false),
                    SpeciesId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Rarity = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    LengthTenthCm = table.Column<int>(type: "integer", nullable: false),
                    CaughtAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    SoldAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ConfigVersion = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    IsNew = table.Column<bool>(type: "boolean", nullable: false),
                    IsRecord = table.Column<bool>(type: "boolean", nullable: false),
                    ExpGained = table.Column<int>(type: "integer", nullable: false),
                    LevelAfter = table.Column<int>(type: "integer", nullable: false),
                    LevelUp = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_catches", x => x.CatchId);
                });

            migrationBuilder.CreateTable(
                name: "config_versions",
                schema: "game",
                columns: table => new
                {
                    Version = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Json = table.Column<string>(type: "jsonb", nullable: false),
                    PublishedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    PublishedBy = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_config_versions", x => x.Version);
                });

            migrationBuilder.CreateTable(
                name: "fishing_attempts",
                schema: "game",
                columns: table => new
                {
                    AttemptId = table.Column<Guid>(type: "uuid", nullable: false),
                    PlayerId = table.Column<Guid>(type: "uuid", nullable: false),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Phase = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Reason = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    SpeciesId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    Rarity = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    Seed = table.Column<long>(type: "bigint", nullable: true),
                    ConfigVersion = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    SnapshotJson = table.Column<string>(type: "jsonb", nullable: false),
                    StartedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    EndedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LengthTenthCm = table.Column<int>(type: "integer", nullable: true),
                    ResultJson = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_fishing_attempts", x => x.AttemptId);
                });

            migrationBuilder.CreateTable(
                name: "fishing_outcome_events",
                schema: "game",
                columns: table => new
                {
                    AttemptId = table.Column<Guid>(type: "uuid", nullable: false),
                    PlayerId = table.Column<Guid>(type: "uuid", nullable: false),
                    Success = table.Column<bool>(type: "boolean", nullable: false),
                    MinigameStartedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ResultReceivedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ConfigVersion = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    ProcessedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_fishing_outcome_events", x => x.AttemptId);
                });

            migrationBuilder.CreateTable(
                name: "idempotency_receipts",
                schema: "game",
                columns: table => new
                {
                    PlayerId = table.Column<Guid>(type: "uuid", nullable: false),
                    Operation = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Key = table.Column<Guid>(type: "uuid", nullable: false),
                    PayloadHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    StatusCode = table.Column<int>(type: "integer", nullable: false),
                    ResponseJson = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_idempotency_receipts", x => new { x.PlayerId, x.Operation, x.Key });
                });

            migrationBuilder.CreateTable(
                name: "invalid_result_events",
                schema: "game",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PlayerId = table.Column<Guid>(type: "uuid", nullable: false),
                    AttemptId = table.Column<Guid>(type: "uuid", nullable: true),
                    Kind = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    ReceivedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ProcessedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_invalid_result_events", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "lake_runtime",
                schema: "game",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false),
                    LastAliveAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lake_runtime", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ledger_entries",
                schema: "game",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PlayerId = table.Column<Guid>(type: "uuid", nullable: false),
                    Delta = table.Column<long>(type: "bigint", nullable: false),
                    BalanceAfter = table.Column<long>(type: "bigint", nullable: false),
                    Reason = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    RefId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ledger_entries", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "player_security_signals",
                schema: "game",
                columns: table => new
                {
                    SignalId = table.Column<Guid>(type: "uuid", nullable: false),
                    PlayerId = table.Column<Guid>(type: "uuid", nullable: false),
                    RuleCode = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    RuleVersion = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Severity = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    WindowBucket = table.Column<long>(type: "bigint", nullable: false),
                    WindowStart = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    WindowEnd = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    SampleCount = table.Column<int>(type: "integer", nullable: false),
                    ObservedValue = table.Column<double>(type: "double precision", nullable: false),
                    Threshold = table.Column<double>(type: "double precision", nullable: false),
                    RepresentativeAttemptIds = table.Column<Guid[]>(type: "uuid[]", nullable: false),
                    FirstSeenAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastSeenAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Occurrences = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    ReviewedBy = table.Column<string>(type: "text", nullable: true),
                    ReviewedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ReviewNote = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_player_security_signals", x => x.SignalId);
                });

            migrationBuilder.CreateTable(
                name: "rods_owned",
                schema: "game",
                columns: table => new
                {
                    PlayerId = table.Column<Guid>(type: "uuid", nullable: false),
                    RodId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    AcquiredAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rods_owned", x => new { x.PlayerId, x.RodId });
                });

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
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    PlayerId = table.Column<Guid>(type: "uuid", nullable: false),
                    SeatId = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Kind = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    DurationUnits = table.Column<int>(type: "integer", nullable: false),
                    AddedMinutes = table.Column<int>(type: "integer", nullable: false),
                    UnitPriceGold = table.Column<long>(type: "bigint", nullable: false),
                    TotalGold = table.Column<long>(type: "bigint", nullable: false),
                    PriceVersion = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_seat_purchases", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "seat_sessions",
                schema: "game",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SeatId = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    PlayerId = table.Column<Guid>(type: "uuid", nullable: false),
                    StartedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    EndedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    EndReason = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    DisconnectedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ConfigVersion = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    PurchasedMinutes = table.Column<int>(type: "integer", nullable: false),
                    SessionVersion = table.Column<int>(type: "integer", nullable: false),
                    PriceVersion = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_seat_sessions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "seats",
                schema: "game",
                columns: table => new
                {
                    SeatId = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Number = table.Column<int>(type: "integer", nullable: false),
                    Tier = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_seats", x => x.SeatId);
                });

            migrationBuilder.CreateTable(
                name: "sessions",
                schema: "game",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    RefreshTokenHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    PreviousRefreshTokenHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    RememberMe = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    RevokedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sessions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "species_records",
                schema: "game",
                columns: table => new
                {
                    PlayerId = table.Column<Guid>(type: "uuid", nullable: false),
                    SpeciesId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    FirstCaughtAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    TotalCaught = table.Column<int>(type: "integer", nullable: false),
                    BestLengthTenthCm = table.Column<int>(type: "integer", nullable: false),
                    BestCatchId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_species_records", x => new { x.PlayerId, x.SpeciesId });
                });

            migrationBuilder.CreateTable(
                name: "wallets",
                schema: "game",
                columns: table => new
                {
                    PlayerId = table.Column<Guid>(type: "uuid", nullable: false),
                    Gold = table.Column<long>(type: "bigint", nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_wallets", x => x.PlayerId);
                    table.CheckConstraint("CK_wallets_gold_non_negative", "\"Gold\" >= 0");
                });

            // Player có sẵn cần khóa tên khác nhau trước khi tạo unique index; tên trùng thì thêm id để không mất dữ liệu.
            migrationBuilder.Sql("""
                UPDATE game.players AS player
                SET "DisplayNameKey" = CASE WHEN ranked.position = 1 THEN lower(player."DisplayName")
                                            ELSE lower(left(player."DisplayName", 40)) || '#' || player."Id"::text END
                FROM (SELECT "Id", row_number() OVER (PARTITION BY lower("DisplayName") ORDER BY "CreatedAt", "Id") AS position
                      FROM game.players) AS ranked
                WHERE ranked."Id" = player."Id";
                """);

            migrationBuilder.CreateIndex(
                name: "IX_players_DisplayNameKey",
                schema: "game",
                table: "players",
                column: "DisplayNameKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_accounts_FirebaseProjectId_FirebaseUid",
                schema: "game",
                table: "accounts",
                columns: new[] { "FirebaseProjectId", "FirebaseUid" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_accounts_PlayerId",
                schema: "game",
                table: "accounts",
                column: "PlayerId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_catches_AttemptId",
                schema: "game",
                table: "catches",
                column: "AttemptId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_catches_PlayerId_CaughtAt",
                schema: "game",
                table: "catches",
                columns: new[] { "PlayerId", "CaughtAt" });

            migrationBuilder.CreateIndex(
                name: "IX_config_versions_single_active",
                schema: "game",
                table: "config_versions",
                column: "IsActive",
                unique: true,
                filter: "\"IsActive\"");

            migrationBuilder.CreateIndex(
                name: "IX_fishing_attempts_open_player",
                schema: "game",
                table: "fishing_attempts",
                column: "PlayerId",
                unique: true,
                filter: "\"EndedAt\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_fishing_attempts_PlayerId_EndedAt_AttemptId",
                schema: "game",
                table: "fishing_attempts",
                columns: new[] { "PlayerId", "EndedAt", "AttemptId" });

            migrationBuilder.CreateIndex(
                name: "IX_fishing_outcome_events_PlayerId_ResultReceivedAt",
                schema: "game",
                table: "fishing_outcome_events",
                columns: new[] { "PlayerId", "ResultReceivedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_fishing_outcome_events_ProcessedAt",
                schema: "game",
                table: "fishing_outcome_events",
                column: "ProcessedAt");

            migrationBuilder.CreateIndex(
                name: "IX_idempotency_receipts_CreatedAt",
                schema: "game",
                table: "idempotency_receipts",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_invalid_result_events_PlayerId_ReceivedAt",
                schema: "game",
                table: "invalid_result_events",
                columns: new[] { "PlayerId", "ReceivedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_invalid_result_events_ProcessedAt",
                schema: "game",
                table: "invalid_result_events",
                column: "ProcessedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ledger_entries_PlayerId_CreatedAt",
                schema: "game",
                table: "ledger_entries",
                columns: new[] { "PlayerId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_player_security_signals_PlayerId_RuleCode_WindowBucket",
                schema: "game",
                table: "player_security_signals",
                columns: new[] { "PlayerId", "RuleCode", "WindowBucket" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_seat_purchases_SessionId",
                schema: "game",
                table: "seat_purchases",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_seat_sessions_open_player",
                schema: "game",
                table: "seat_sessions",
                column: "PlayerId",
                unique: true,
                filter: "\"EndedAt\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_seat_sessions_open_seat",
                schema: "game",
                table: "seat_sessions",
                column: "SeatId",
                unique: true,
                filter: "\"EndedAt\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_sessions_PreviousRefreshTokenHash",
                schema: "game",
                table: "sessions",
                column: "PreviousRefreshTokenHash");

            migrationBuilder.CreateIndex(
                name: "IX_sessions_RefreshTokenHash",
                schema: "game",
                table: "sessions",
                column: "RefreshTokenHash",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "accounts",
                schema: "game");

            migrationBuilder.DropTable(
                name: "catches",
                schema: "game");

            migrationBuilder.DropTable(
                name: "config_versions",
                schema: "game");

            migrationBuilder.DropTable(
                name: "fishing_attempts",
                schema: "game");

            migrationBuilder.DropTable(
                name: "fishing_outcome_events",
                schema: "game");

            migrationBuilder.DropTable(
                name: "idempotency_receipts",
                schema: "game");

            migrationBuilder.DropTable(
                name: "invalid_result_events",
                schema: "game");

            migrationBuilder.DropTable(
                name: "lake_runtime",
                schema: "game");

            migrationBuilder.DropTable(
                name: "ledger_entries",
                schema: "game");

            migrationBuilder.DropTable(
                name: "player_security_signals",
                schema: "game");

            migrationBuilder.DropTable(
                name: "rods_owned",
                schema: "game");

            migrationBuilder.DropTable(
                name: "seat_cooldowns",
                schema: "game");

            migrationBuilder.DropTable(
                name: "seat_purchases",
                schema: "game");

            migrationBuilder.DropTable(
                name: "seat_sessions",
                schema: "game");

            migrationBuilder.DropTable(
                name: "seats",
                schema: "game");

            migrationBuilder.DropTable(
                name: "sessions",
                schema: "game");

            migrationBuilder.DropTable(
                name: "species_records",
                schema: "game");

            migrationBuilder.DropTable(
                name: "wallets",
                schema: "game");

            migrationBuilder.DropIndex(
                name: "IX_players_DisplayNameKey",
                schema: "game",
                table: "players");

            migrationBuilder.DropColumn(
                name: "DisplayNameKey",
                schema: "game",
                table: "players");

            migrationBuilder.DropColumn(
                name: "EquippedRodId",
                schema: "game",
                table: "players");

            migrationBuilder.DropColumn(
                name: "Exp",
                schema: "game",
                table: "players");

            migrationBuilder.DropColumn(
                name: "InventoryVersion",
                schema: "game",
                table: "players");

            migrationBuilder.DropColumn(
                name: "Level",
                schema: "game",
                table: "players");

            migrationBuilder.DropColumn(
                name: "SelectedSkinId",
                schema: "game",
                table: "players");
        }
    }
}
