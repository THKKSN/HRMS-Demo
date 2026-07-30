using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTicketResponsibleWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "waiting_info_at",
                table: "tickets",
                type: "datetime",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "waiting_info_by_employee_id",
                table: "tickets",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AddColumn<DateTime>(
                name: "work_started_at",
                table: "tickets",
                type: "datetime",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "work_started_by_employee_id",
                table: "tickets",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.CreateTable(
                name: "ticket_comments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    ticket_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    employee_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    comment_type = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    message = table.Column<string>(type: "varchar(2000)", maxLength: 2000, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    is_internal = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ticket_comments", x => x.id);
                    table.ForeignKey(
                        name: "fk_ticket_comments_employees_employee_id",
                        column: x => x.employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_ticket_comments_tickets_ticket_id",
                        column: x => x.ticket_id,
                        principalTable: "tickets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "ix_tickets_status_updated_at",
                table: "tickets",
                columns: new[] { "status", "updated_at" });

            migrationBuilder.CreateIndex(
                name: "ix_tickets_waiting_info_by_employee_id",
                table: "tickets",
                column: "waiting_info_by_employee_id");

            migrationBuilder.CreateIndex(
                name: "ix_tickets_work_started_by_employee_id",
                table: "tickets",
                column: "work_started_by_employee_id");

            migrationBuilder.CreateIndex(
                name: "ix_ticket_comments_employee_id",
                table: "ticket_comments",
                column: "employee_id");

            migrationBuilder.CreateIndex(
                name: "ix_ticket_comments_ticket_id_created_at",
                table: "ticket_comments",
                columns: new[] { "ticket_id", "created_at" });

            migrationBuilder.AddForeignKey(
                name: "fk_tickets_employees_waiting_info_by_employee_id",
                table: "tickets",
                column: "waiting_info_by_employee_id",
                principalTable: "employees",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_tickets_employees_work_started_by_employee_id",
                table: "tickets",
                column: "work_started_by_employee_id",
                principalTable: "employees",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_tickets_employees_waiting_info_by_employee_id",
                table: "tickets");

            migrationBuilder.DropForeignKey(
                name: "fk_tickets_employees_work_started_by_employee_id",
                table: "tickets");

            migrationBuilder.DropTable(
                name: "ticket_comments");

            migrationBuilder.DropIndex(
                name: "ix_tickets_status_updated_at",
                table: "tickets");

            migrationBuilder.DropIndex(
                name: "ix_tickets_waiting_info_by_employee_id",
                table: "tickets");

            migrationBuilder.DropIndex(
                name: "ix_tickets_work_started_by_employee_id",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "waiting_info_at",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "waiting_info_by_employee_id",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "work_started_at",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "work_started_by_employee_id",
                table: "tickets");
        }
    }
}
