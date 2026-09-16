using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPreferredLanguage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "preferred_language",
                table: "external_reporters",
                type: "varchar(5)",
                maxLength: 5,
                nullable: false,
                defaultValue: "th")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "preferred_language",
                table: "employees",
                type: "varchar(5)",
                maxLength: 5,
                nullable: false,
                defaultValue: "th")
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "preferred_language",
                table: "external_reporters");

            migrationBuilder.DropColumn(
                name: "preferred_language",
                table: "employees");
        }
    }
}
