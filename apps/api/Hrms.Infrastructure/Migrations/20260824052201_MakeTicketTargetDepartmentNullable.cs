using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class MakeTicketTargetDepartmentNullable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_tickets_taxonomy_by_request_type",
                table: "tickets");

            migrationBuilder.AlterColumn<Guid>(
                name: "target_department_id",
                table: "tickets",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)")
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.AddCheckConstraint(
                name: "ck_tickets_taxonomy_by_request_type",
                table: "tickets",
                sql: "((request_type = 'Internal' AND category_id IS NOT NULL AND topic_id IS NOT NULL AND target_department_id IS NOT NULL AND external_ticket_category_id IS NULL AND external_ticket_topic_id IS NULL AND external_ticket_subject_id IS NULL) OR (request_type = 'External' AND category_id IS NULL AND topic_id IS NULL AND subject_id IS NULL AND target_department_id IS NULL AND external_ticket_category_id IS NOT NULL AND external_ticket_topic_id IS NOT NULL))");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_tickets_taxonomy_by_request_type",
                table: "tickets");

            migrationBuilder.AlterColumn<Guid>(
                name: "target_department_id",
                table: "tickets",
                type: "char(36)",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldNullable: true)
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.AddCheckConstraint(
                name: "ck_tickets_taxonomy_by_request_type",
                table: "tickets",
                sql: "((request_type = 'Internal' AND category_id IS NOT NULL AND topic_id IS NOT NULL AND external_ticket_category_id IS NULL AND external_ticket_topic_id IS NULL AND external_ticket_subject_id IS NULL) OR (request_type = 'External' AND category_id IS NULL AND topic_id IS NULL AND subject_id IS NULL AND external_ticket_category_id IS NOT NULL AND external_ticket_topic_id IS NOT NULL))");
        }
    }
}
