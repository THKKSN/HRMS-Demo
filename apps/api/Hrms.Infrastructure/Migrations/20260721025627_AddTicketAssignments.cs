using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations;

public partial class AddTicketAssignments : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<DateTime>(
            name: "rejected_at",
            table: "tickets",
            type: "datetime",
            nullable: true);

        migrationBuilder.AddColumn<Guid>(
            name: "rejected_by_employee_id",
            table: "tickets",
            type: "char(36)",
            nullable: true,
            collation: "ascii_general_ci");

        migrationBuilder.AddColumn<string>(
            name: "rejection_reason",
            table: "tickets",
            type: "varchar(1000)",
            maxLength: 1000,
            nullable: true)
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.CreateTable(
            name: "ticket_assignments",
            columns: table => new
            {
                id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                ticket_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                assigned_to_employee_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                assigned_by_employee_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                assigned_at = table.Column<DateTime>(type: "datetime", nullable: false),
                is_primary = table.Column<bool>(type: "tinyint(1)", nullable: false),
                is_active = table.Column<bool>(type: "tinyint(1)", nullable: false),
                active_slot = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: true)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                ended_at = table.Column<DateTime>(type: "datetime", nullable: true),
                ended_by_employee_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                note = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_ticket_assignments", x => x.id);
                table.ForeignKey(
                    name: "fk_ticket_assignments_employees_assigned_by_employee_id",
                    column: x => x.assigned_by_employee_id,
                    principalTable: "employees",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_ticket_assignments_employees_assigned_to_employee_id",
                    column: x => x.assigned_to_employee_id,
                    principalTable: "employees",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_ticket_assignments_employees_ended_by_employee_id",
                    column: x => x.ended_by_employee_id,
                    principalTable: "employees",
                    principalColumn: "id",
                    onDelete: ReferentialAction.SetNull);
                table.ForeignKey(
                    name: "fk_ticket_assignments_tickets_ticket_id",
                    column: x => x.ticket_id,
                    principalTable: "tickets",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
            })
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.CreateIndex(
            name: "ix_tickets_rejected_by_employee_id",
            table: "tickets",
            column: "rejected_by_employee_id");

        migrationBuilder.AddForeignKey(
            name: "fk_tickets_employees_rejected_by_employee_id",
            table: "tickets",
            column: "rejected_by_employee_id",
            principalTable: "employees",
            principalColumn: "id",
            onDelete: ReferentialAction.SetNull);

        migrationBuilder.CreateIndex(
            name: "ix_ticket_assignments_assigned_by_employee_id",
            table: "ticket_assignments",
            column: "assigned_by_employee_id");
        migrationBuilder.CreateIndex(
            name: "ix_ticket_assignments_assigned_to_employee_id_is_active",
            table: "ticket_assignments",
            columns: new[] { "assigned_to_employee_id", "is_active" });
        migrationBuilder.CreateIndex(
            name: "ix_ticket_assignments_ended_by_employee_id",
            table: "ticket_assignments",
            column: "ended_by_employee_id");
        migrationBuilder.CreateIndex(
            name: "ix_ticket_assignments_ticket_id_active_slot",
            table: "ticket_assignments",
            columns: new[] { "ticket_id", "active_slot" },
            unique: true);
        migrationBuilder.CreateIndex(
            name: "ix_ticket_assignments_ticket_id_is_active_is_primary",
            table: "ticket_assignments",
            columns: new[] { "ticket_id", "is_active", "is_primary" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "ticket_assignments");
        migrationBuilder.DropForeignKey(
            name: "fk_tickets_employees_rejected_by_employee_id",
            table: "tickets");
        migrationBuilder.DropIndex(
            name: "ix_tickets_rejected_by_employee_id",
            table: "tickets");
        migrationBuilder.DropColumn(name: "rejected_at", table: "tickets");
        migrationBuilder.DropColumn(name: "rejected_by_employee_id", table: "tickets");
        migrationBuilder.DropColumn(name: "rejection_reason", table: "tickets");
    }
}
