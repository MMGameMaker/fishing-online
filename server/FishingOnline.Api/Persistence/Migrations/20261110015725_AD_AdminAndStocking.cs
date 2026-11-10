using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FishingOnline.Api.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AD_AdminAndStocking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "admin_audit",
                schema: "game",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Actor = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: false),
                    Action = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Target = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    BeforeJson = table.Column<string>(type: "text", nullable: true),
                    AfterJson = table.Column<string>(type: "text", nullable: true),
                    At = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_admin_audit", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "admin_sessions",
                schema: "game",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: false),
                    RefreshTokenHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    PreviousRefreshTokenHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    AbsoluteExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    RevokedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_admin_sessions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "admin_users",
                schema: "game",
                columns: table => new
                {
                    Email = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: false),
                    Roles = table.Column<string[]>(type: "text[]", nullable: false),
                    Disabled = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_admin_users", x => x.Email);
                });

            migrationBuilder.CreateTable(
                name: "config_drafts",
                schema: "game",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BaseVersion = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    DocumentJson = table.Column<string>(type: "text", nullable: false),
                    Revision = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    PublishedVersion = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    CreatedBy = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: false),
                    UpdatedBy = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_config_drafts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "fish_stocking_batches",
                schema: "game",
                columns: table => new
                {
                    BatchId = table.Column<Guid>(type: "uuid", nullable: false),
                    LakeId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    ScheduledAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    TimeZone = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    Note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    LinesJson = table.Column<string>(type: "jsonb", nullable: false),
                    PayloadHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Revision = table.Column<int>(type: "integer", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedBy = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ExecutedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ExecutedBy = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: true),
                    Error = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_fish_stocking_batches", x => x.BatchId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_admin_audit_At",
                schema: "game",
                table: "admin_audit",
                column: "At");

            migrationBuilder.CreateIndex(
                name: "IX_admin_sessions_PreviousRefreshTokenHash",
                schema: "game",
                table: "admin_sessions",
                column: "PreviousRefreshTokenHash");

            migrationBuilder.CreateIndex(
                name: "IX_admin_sessions_RefreshTokenHash",
                schema: "game",
                table: "admin_sessions",
                column: "RefreshTokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_fish_stocking_batches_Status_ScheduledAt",
                schema: "game",
                table: "fish_stocking_batches",
                columns: new[] { "Status", "ScheduledAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "admin_audit",
                schema: "game");

            migrationBuilder.DropTable(
                name: "admin_sessions",
                schema: "game");

            migrationBuilder.DropTable(
                name: "admin_users",
                schema: "game");

            migrationBuilder.DropTable(
                name: "config_drafts",
                schema: "game");

            migrationBuilder.DropTable(
                name: "fish_stocking_batches",
                schema: "game");
        }
    }
}
