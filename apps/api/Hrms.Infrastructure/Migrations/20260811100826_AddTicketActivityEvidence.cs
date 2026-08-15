using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTicketActivityEvidence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_completed",
                table: "ticket_progress_entries",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "ticket_progress_entry_id",
                table: "ticket_attachments",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.CreateIndex(
                name: "ix_tickets_status_verified_at",
                table: "tickets",
                columns: new[] { "status", "verified_at" });

            migrationBuilder.CreateIndex(
                name: "ix_ticket_attachments_ticket_progress_entry_id",
                table: "ticket_attachments",
                column: "ticket_progress_entry_id");

            migrationBuilder.AddForeignKey(
                name: "fk_ticket_attachments_ticket_progress_entries_ticket_progress_e",
                table: "ticket_attachments",
                column: "ticket_progress_entry_id",
                principalTable: "ticket_progress_entries",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_ticket_attachments_ticket_progress_entries_ticket_progress_e",
                table: "ticket_attachments");

            migrationBuilder.DropIndex(
                name: "ix_tickets_status_verified_at",
                table: "tickets");

            migrationBuilder.DropIndex(
                name: "ix_ticket_attachments_ticket_progress_entry_id",
                table: "ticket_attachments");

            migrationBuilder.DropColumn(
                name: "is_completed",
                table: "ticket_progress_entries");

            migrationBuilder.DropColumn(
                name: "ticket_progress_entry_id",
                table: "ticket_attachments");
        }
    }
}
