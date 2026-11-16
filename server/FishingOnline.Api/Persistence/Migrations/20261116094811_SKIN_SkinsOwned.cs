using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FishingOnline.Api.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SKIN_SkinsOwned : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "skins_owned",
                schema: "game",
                columns: table => new
                {
                    PlayerId = table.Column<Guid>(type: "uuid", nullable: false),
                    SkinId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    AcquiredAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_skins_owned", x => new { x.PlayerId, x.SkinId });
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "skins_owned",
                schema: "game");
        }
    }
}
