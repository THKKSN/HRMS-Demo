using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMasterDataLocalizedNames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "name_en",
                table: "ticket_topics",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "name_id",
                table: "ticket_topics",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "name_en",
                table: "ticket_subjects",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "name_id",
                table: "ticket_subjects",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "name_en",
                table: "ticket_closeout_reasons",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "name_id",
                table: "ticket_closeout_reasons",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "name_en",
                table: "ticket_categories",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "name_id",
                table: "ticket_categories",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "name_en",
                table: "shifts",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "name_id",
                table: "shifts",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "name_en",
                table: "roles",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "name_id",
                table: "roles",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "name_en",
                table: "role_labels",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "name_id",
                table: "role_labels",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "name_en",
                table: "memo_types",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "name_id",
                table: "memo_types",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "name_en",
                table: "memo_sub_categories",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "name_id",
                table: "memo_sub_categories",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "name_en",
                table: "memo_categories",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "name_id",
                table: "memo_categories",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "name_en",
                table: "locations",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "name_id",
                table: "locations",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "name_id",
                table: "leave_types",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "name_en",
                table: "external_ticket_topics",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "name_id",
                table: "external_ticket_topics",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "name_en",
                table: "external_ticket_subjects",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "name_id",
                table: "external_ticket_subjects",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "name_en",
                table: "external_ticket_categories",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "name_id",
                table: "external_ticket_categories",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "name_en",
                table: "departments",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "name_id",
                table: "departments",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "name_id",
                table: "companies",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "name_en",
                table: "ticket_topics");

            migrationBuilder.DropColumn(
                name: "name_id",
                table: "ticket_topics");

            migrationBuilder.DropColumn(
                name: "name_en",
                table: "ticket_subjects");

            migrationBuilder.DropColumn(
                name: "name_id",
                table: "ticket_subjects");

            migrationBuilder.DropColumn(
                name: "name_en",
                table: "ticket_closeout_reasons");

            migrationBuilder.DropColumn(
                name: "name_id",
                table: "ticket_closeout_reasons");

            migrationBuilder.DropColumn(
                name: "name_en",
                table: "ticket_categories");

            migrationBuilder.DropColumn(
                name: "name_id",
                table: "ticket_categories");

            migrationBuilder.DropColumn(
                name: "name_en",
                table: "shifts");

            migrationBuilder.DropColumn(
                name: "name_id",
                table: "shifts");

            migrationBuilder.DropColumn(
                name: "name_en",
                table: "roles");

            migrationBuilder.DropColumn(
                name: "name_id",
                table: "roles");

            migrationBuilder.DropColumn(
                name: "name_en",
                table: "role_labels");

            migrationBuilder.DropColumn(
                name: "name_id",
                table: "role_labels");

            migrationBuilder.DropColumn(
                name: "name_en",
                table: "memo_types");

            migrationBuilder.DropColumn(
                name: "name_id",
                table: "memo_types");

            migrationBuilder.DropColumn(
                name: "name_en",
                table: "memo_sub_categories");

            migrationBuilder.DropColumn(
                name: "name_id",
                table: "memo_sub_categories");

            migrationBuilder.DropColumn(
                name: "name_en",
                table: "memo_categories");

            migrationBuilder.DropColumn(
                name: "name_id",
                table: "memo_categories");

            migrationBuilder.DropColumn(
                name: "name_en",
                table: "locations");

            migrationBuilder.DropColumn(
                name: "name_id",
                table: "locations");

            migrationBuilder.DropColumn(
                name: "name_id",
                table: "leave_types");

            migrationBuilder.DropColumn(
                name: "name_en",
                table: "external_ticket_topics");

            migrationBuilder.DropColumn(
                name: "name_id",
                table: "external_ticket_topics");

            migrationBuilder.DropColumn(
                name: "name_en",
                table: "external_ticket_subjects");

            migrationBuilder.DropColumn(
                name: "name_id",
                table: "external_ticket_subjects");

            migrationBuilder.DropColumn(
                name: "name_en",
                table: "external_ticket_categories");

            migrationBuilder.DropColumn(
                name: "name_id",
                table: "external_ticket_categories");

            migrationBuilder.DropColumn(
                name: "name_en",
                table: "departments");

            migrationBuilder.DropColumn(
                name: "name_id",
                table: "departments");

            migrationBuilder.DropColumn(
                name: "name_id",
                table: "companies");
        }
    }
}
