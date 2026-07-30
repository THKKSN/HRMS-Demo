using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTicketCancellationRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "cancellation_reason",
                table: "tickets",
                type: "varchar(1000)",
                maxLength: 1000,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "cancelled_at",
                table: "tickets",
                type: "datetime",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "cancelled_by_employee_id",
                table: "tickets",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.CreateTable(
                name: "ticket_cancellation_requests",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    ticket_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    requested_by_employee_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    reason = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    status = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    pending_slot = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    requested_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    reviewed_by_employee_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    reviewed_at = table.Column<DateTime>(type: "datetime", nullable: true),
                    review_note = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ticket_cancellation_requests", x => x.id);
                    table.ForeignKey(
                        name: "fk_ticket_cancellation_requests_employees_requested_by_employee",
                        column: x => x.requested_by_employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_ticket_cancellation_requests_employees_reviewed_by_employee_",
                        column: x => x.reviewed_by_employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_ticket_cancellation_requests_tickets_ticket_id",
                        column: x => x.ticket_id,
                        principalTable: "tickets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "ix_tickets_cancelled_by_employee_id",
                table: "tickets",
                column: "cancelled_by_employee_id");

            migrationBuilder.CreateIndex(
                name: "ix_ticket_cancellation_requests_requested_by_employee_id",
                table: "ticket_cancellation_requests",
                column: "requested_by_employee_id");

            migrationBuilder.CreateIndex(
                name: "ix_ticket_cancellation_requests_reviewed_by_employee_id",
                table: "ticket_cancellation_requests",
                column: "reviewed_by_employee_id");

            migrationBuilder.CreateIndex(
                name: "ix_ticket_cancellation_requests_status_requested_at",
                table: "ticket_cancellation_requests",
                columns: new[] { "status", "requested_at" });

            migrationBuilder.CreateIndex(
                name: "ix_ticket_cancellation_requests_ticket_id_pending_slot",
                table: "ticket_cancellation_requests",
                columns: new[] { "ticket_id", "pending_slot" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "fk_tickets_employees_cancelled_by_employee_id",
                table: "tickets",
                column: "cancelled_by_employee_id",
                principalTable: "employees",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_tickets_employees_cancelled_by_employee_id",
                table: "tickets");

            migrationBuilder.DropTable(
                name: "ticket_cancellation_requests");

            migrationBuilder.DropIndex(
                name: "ix_tickets_cancelled_by_employee_id",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "cancellation_reason",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "cancelled_at",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "cancelled_by_employee_id",
                table: "tickets");
        }
    }
}
