using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FishingOnline.Api.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class BEE_MinigameIntro : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Feedback 2026-11-11: minigame hiện sau 0,75 giây kể từ lúc thu cần; config đã publish phải có introMs để parse nghiêm.
            migrationBuilder.Sql("""
                update game.config_versions
                set "Json" = jsonb_set("Json", '{minigame,introMs}', '750'::jsonb)
                where not ("Json"->'minigame' ? 'introMs');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                update game.config_versions
                set "Json" = "Json" #- '{minigame,introMs}';
                """);
        }
    }
}
