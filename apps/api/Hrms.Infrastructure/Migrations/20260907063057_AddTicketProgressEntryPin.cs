using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTicketProgressEntryPin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "pinned_at",
                table: "ticket_progress_entries",
                type: "datetime",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "pinned_by_employee_id",
                table: "ticket_progress_entries",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.CreateIndex(
                name: "ix_ticket_progress_entries_pinned_by_employee_id",
                table: "ticket_progress_entries",
                column: "pinned_by_employee_id");

            migrationBuilder.CreateIndex(
                name: "ix_ticket_progress_entries_ticket_id_pinned_at",
                table: "ticket_progress_entries",
                columns: new[] { "ticket_id", "pinned_at" });

            migrationBuilder.AddForeignKey(
                name: "fk_ticket_progress_entries_employees_pinned_by_employee_id",
                table: "ticket_progress_entries",
                column: "pinned_by_employee_id",
                principalTable: "employees",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_ticket_progress_entries_employees_pinned_by_employee_id",
                table: "ticket_progress_entries");

            migrationBuilder.DropIndex(
                name: "ix_ticket_progress_entries_pinned_by_employee_id",
                table: "ticket_progress_entries");

            migrationBuilder.DropIndex(
                name: "ix_ticket_progress_entries_ticket_id_pinned_at",
                table: "ticket_progress_entries");

            migrationBuilder.DropColumn(
                name: "pinned_at",
                table: "ticket_progress_entries");

            migrationBuilder.DropColumn(
                name: "pinned_by_employee_id",
                table: "ticket_progress_entries");
        }
    }
}
