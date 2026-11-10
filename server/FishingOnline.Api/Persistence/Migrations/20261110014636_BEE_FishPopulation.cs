using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FishingOnline.Api.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class BEE_FishPopulation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "PopulationReserved",
                schema: "game",
                table: "fishing_attempts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "lake_fish_movements",
                schema: "game",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    LakeId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    SpeciesId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Delta = table.Column<int>(type: "integer", nullable: false),
                    Kind = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    SourceId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lake_fish_movements", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "lake_fish_populations",
                schema: "game",
                columns: table => new
                {
                    LakeId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    SpeciesId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Remaining = table.Column<int>(type: "integer", nullable: false),
                    Reserved = table.Column<int>(type: "integer", nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lake_fish_populations", x => new { x.LakeId, x.SpeciesId });
                    table.CheckConstraint("CK_lake_fish_populations_remaining", "\"Remaining\" >= \"Reserved\"");
                    table.CheckConstraint("CK_lake_fish_populations_reserved", "\"Reserved\" >= 0");
                });

            migrationBuilder.CreateIndex(
                name: "IX_lake_fish_movements_Kind_SourceId_LakeId_SpeciesId",
                schema: "game",
                table: "lake_fish_movements",
                columns: new[] { "Kind", "SourceId", "LakeId", "SpeciesId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lake_fish_movements",
                schema: "game");

            migrationBuilder.DropTable(
                name: "lake_fish_populations",
                schema: "game");

            migrationBuilder.DropColumn(
                name: "PopulationReserved",
                schema: "game",
                table: "fishing_attempts");
        }
    }
}
