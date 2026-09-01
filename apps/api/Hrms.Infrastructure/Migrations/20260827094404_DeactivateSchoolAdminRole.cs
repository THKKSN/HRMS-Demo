using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class DeactivateSchoolAdminRole : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "UPDATE `roles` SET `is_active` = 0 WHERE `id` = '10000000-0000-0000-0000-000000000004';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "UPDATE `roles` SET `is_active` = 1 WHERE `id` = '10000000-0000-0000-0000-000000000004';");
        }
    }
}
