using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBoardWorkflowSchemaPhaseB : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "current_blocker_reason",
                table: "tickets",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "current_next_action",
                table: "tickets",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "current_work_state",
                table: "tickets",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "workflow_actions_json",
                table: "tickets",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "workflow_board_steps_json",
                table: "tickets",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "workflow_current_step_key",
                table: "tickets",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "workflow_in_progress_presets_json",
                table: "tickets",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "actions_json",
                table: "ticket_workflow_definitions",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "board_steps_json",
                table: "ticket_workflow_definitions",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "in_progress_presets_json",
                table: "ticket_workflow_definitions",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "ticket_progress_entries",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    ticket_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    workflow_step_key = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    work_state = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    blocker_reason = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    next_action = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    note = table.Column<string>(type: "varchar(2000)", maxLength: 2000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    owner_employee_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    due_at = table.Column<DateTime>(type: "datetime", nullable: true),
                    created_by_employee_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ticket_progress_entries", x => x.id);
                    table.ForeignKey(
                        name: "fk_ticket_progress_entries_employees_created_by_employee_id",
                        column: x => x.created_by_employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_ticket_progress_entries_employees_owner_employee_id",
                        column: x => x.owner_employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_ticket_progress_entries_tickets_ticket_id",
                        column: x => x.ticket_id,
                        principalTable: "tickets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "ix_ticket_progress_entries_created_by_employee_id",
                table: "ticket_progress_entries",
                column: "created_by_employee_id");

            migrationBuilder.CreateIndex(
                name: "ix_ticket_progress_entries_owner_employee_id",
                table: "ticket_progress_entries",
                column: "owner_employee_id");

            migrationBuilder.CreateIndex(
                name: "ix_ticket_progress_entries_ticket_id_created_at",
                table: "ticket_progress_entries",
                columns: new[] { "ticket_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_ticket_progress_entries_ticket_id_workflow_step_key_created_",
                table: "ticket_progress_entries",
                columns: new[] { "ticket_id", "workflow_step_key", "created_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ticket_progress_entries");

            migrationBuilder.DropColumn(
                name: "current_blocker_reason",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "current_next_action",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "current_work_state",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "workflow_actions_json",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "workflow_board_steps_json",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "workflow_current_step_key",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "workflow_in_progress_presets_json",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "actions_json",
                table: "ticket_workflow_definitions");

            migrationBuilder.DropColumn(
                name: "board_steps_json",
                table: "ticket_workflow_definitions");

            migrationBuilder.DropColumn(
                name: "in_progress_presets_json",
                table: "ticket_workflow_definitions");
        }
    }
}
