using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTicketResponsibilityRouting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "routing_level",
                table: "tickets",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "None")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "routing_mode",
                table: "tickets",
                type: "varchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "SupervisorAssign")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "routing_outcome",
                table: "tickets",
                type: "varchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "NotEvaluated")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "routing_mode",
                table: "ticket_topics",
                type: "varchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "SupervisorAssign")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<bool>(
                name: "enable_responsibility_fallback",
                table: "ticket_categories",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "routing_mode",
                table: "ticket_categories",
                type: "varchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "SupervisorAssign")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<Guid>(
                name: "assigned_by_employee_id",
                table: "ticket_assignments",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)")
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.AddColumn<string>(
                name: "assignment_source",
                table: "ticket_assignments",
                type: "varchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Manual")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<Guid>(
                name: "responsibility_id",
                table: "ticket_assignments",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AddColumn<string>(
                name: "routing_level_snapshot",
                table: "ticket_assignments",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "None")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "employee_responsibilities",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    company_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    department_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    category_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    topic_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    employee_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    effective_from = table.Column<DateOnly>(type: "date", nullable: true),
                    effective_to = table.Column<DateOnly>(type: "date", nullable: true),
                    note = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_by_employee_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_employee_responsibilities", x => x.id);
                    table.ForeignKey(
                        name: "fk_employee_responsibilities_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_employee_responsibilities_departments_department_id",
                        column: x => x.department_id,
                        principalTable: "departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_employee_responsibilities_employees_created_by_employee_id",
                        column: x => x.created_by_employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_employee_responsibilities_employees_employee_id",
                        column: x => x.employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_employee_responsibilities_ticket_categories_category_id",
                        column: x => x.category_id,
                        principalTable: "ticket_categories",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_employee_responsibilities_ticket_topics_topic_id",
                        column: x => x.topic_id,
                        principalTable: "ticket_topics",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "ix_tickets_routing_outcome_created_at",
                table: "tickets",
                columns: new[] { "routing_outcome", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_ticket_assignments_responsibility_id",
                table: "ticket_assignments",
                column: "responsibility_id");

            migrationBuilder.CreateIndex(
                name: "ix_employee_responsibilities_category_id",
                table: "employee_responsibilities",
                column: "category_id");

            migrationBuilder.CreateIndex(
                name: "ix_employee_responsibilities_company_id",
                table: "employee_responsibilities",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "ix_employee_responsibilities_created_by_employee_id",
                table: "employee_responsibilities",
                column: "created_by_employee_id");

            migrationBuilder.CreateIndex(
                name: "ix_employee_responsibilities_department_id_category_id_topic_id",
                table: "employee_responsibilities",
                columns: new[] { "department_id", "category_id", "topic_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "ix_employee_responsibilities_department_id_topic_id_is_active",
                table: "employee_responsibilities",
                columns: new[] { "department_id", "topic_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "ix_employee_responsibilities_employee_id_is_active",
                table: "employee_responsibilities",
                columns: new[] { "employee_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "ix_employee_responsibilities_topic_id",
                table: "employee_responsibilities",
                column: "topic_id");

            migrationBuilder.AddForeignKey(
                name: "fk_ticket_assignments_employee_responsibilities_responsibility_",
                table: "ticket_assignments",
                column: "responsibility_id",
                principalTable: "employee_responsibilities",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_ticket_assignments_employee_responsibilities_responsibility_",
                table: "ticket_assignments");

            migrationBuilder.DropTable(
                name: "employee_responsibilities");

            migrationBuilder.DropIndex(
                name: "ix_tickets_routing_outcome_created_at",
                table: "tickets");

            migrationBuilder.DropIndex(
                name: "ix_ticket_assignments_responsibility_id",
                table: "ticket_assignments");

            migrationBuilder.DropColumn(
                name: "routing_level",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "routing_mode",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "routing_outcome",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "routing_mode",
                table: "ticket_topics");

            migrationBuilder.DropColumn(
                name: "enable_responsibility_fallback",
                table: "ticket_categories");

            migrationBuilder.DropColumn(
                name: "routing_mode",
                table: "ticket_categories");

            migrationBuilder.DropColumn(
                name: "assignment_source",
                table: "ticket_assignments");

            migrationBuilder.DropColumn(
                name: "responsibility_id",
                table: "ticket_assignments");

            migrationBuilder.DropColumn(
                name: "routing_level_snapshot",
                table: "ticket_assignments");

            migrationBuilder.Sql("DELETE FROM ticket_assignments WHERE assigned_by_employee_id IS NULL;");

            migrationBuilder.AlterColumn<Guid>(
                name: "assigned_by_employee_id",
                table: "ticket_assignments",
                type: "char(36)",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldNullable: true)
                .OldAnnotation("Relational:Collation", "ascii_general_ci");
        }
    }
}
