using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTicketWorkflowMastersAndSnapshots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_tickets_subject_id",
                table: "tickets");

            migrationBuilder.AddColumn<Guid>(
                name: "subject_guidance_config_id",
                table: "tickets",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AddColumn<string>(
                name: "subject_guidance_config_name",
                table: "tickets",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "workflow_auto_acknowledge_after_days",
                table: "tickets",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "workflow_definition_id",
                table: "tickets",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AddColumn<string>(
                name: "workflow_name",
                table: "tickets",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "workflow_status_step_map_json",
                table: "tickets",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "workflow_steps_json",
                table: "tickets",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "ticket_workflow_definitions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    company_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    department_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    code = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    name = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    description = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    sort_order = table.Column<int>(type: "int", nullable: false),
                    auto_acknowledge_after_days = table.Column<int>(type: "int", nullable: true),
                    steps_json = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    status_step_map_json = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ticket_workflow_definitions", x => x.id);
                    table.ForeignKey(
                        name: "fk_ticket_workflow_definitions_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_ticket_workflow_definitions_departments_department_id",
                        column: x => x.department_id,
                        principalTable: "departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "ticket_subject_guidance_configs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    company_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    department_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    category_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    topic_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    subject_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    name = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    suggestion_target_label = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    suggestions_json = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    template = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    workflow_definition_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    priority = table.Column<int>(type: "int", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ticket_subject_guidance_configs", x => x.id);
                    table.ForeignKey(
                        name: "fk_ticket_subject_guidance_configs_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_ticket_subject_guidance_configs_departments_department_id",
                        column: x => x.department_id,
                        principalTable: "departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_ticket_subject_guidance_configs_ticket_categories_category_id",
                        column: x => x.category_id,
                        principalTable: "ticket_categories",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_ticket_subject_guidance_configs_ticket_subjects_subject_id",
                        column: x => x.subject_id,
                        principalTable: "ticket_subjects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_ticket_subject_guidance_configs_ticket_topics_topic_id",
                        column: x => x.topic_id,
                        principalTable: "ticket_topics",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_ticket_subject_guidance_configs_ticket_workflow_definitions_",
                        column: x => x.workflow_definition_id,
                        principalTable: "ticket_workflow_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "ix_tickets_subject_guidance_config_id",
                table: "tickets",
                column: "subject_guidance_config_id");

            migrationBuilder.CreateIndex(
                name: "ix_tickets_workflow_definition_id",
                table: "tickets",
                column: "workflow_definition_id");

            migrationBuilder.CreateIndex(
                name: "ix_ticket_subject_guidance_configs_category_id",
                table: "ticket_subject_guidance_configs",
                column: "category_id");

            migrationBuilder.CreateIndex(
                name: "ix_ticket_subject_guidance_configs_company_id_department_id_is_",
                table: "ticket_subject_guidance_configs",
                columns: new[] { "company_id", "department_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "ix_ticket_subject_guidance_configs_company_id_department_id_pri",
                table: "ticket_subject_guidance_configs",
                columns: new[] { "company_id", "department_id", "priority" });

            migrationBuilder.CreateIndex(
                name: "ix_ticket_subject_guidance_configs_department_id",
                table: "ticket_subject_guidance_configs",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "ix_ticket_subject_guidance_configs_subject_id",
                table: "ticket_subject_guidance_configs",
                column: "subject_id");

            migrationBuilder.CreateIndex(
                name: "ix_ticket_subject_guidance_configs_topic_id",
                table: "ticket_subject_guidance_configs",
                column: "topic_id");

            migrationBuilder.CreateIndex(
                name: "ix_ticket_subject_guidance_configs_workflow_definition_id",
                table: "ticket_subject_guidance_configs",
                column: "workflow_definition_id");

            migrationBuilder.CreateIndex(
                name: "ix_ticket_workflow_definitions_company_id_department_id_code",
                table: "ticket_workflow_definitions",
                columns: new[] { "company_id", "department_id", "code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_ticket_workflow_definitions_company_id_department_id_is_acti",
                table: "ticket_workflow_definitions",
                columns: new[] { "company_id", "department_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "ix_ticket_workflow_definitions_department_id",
                table: "ticket_workflow_definitions",
                column: "department_id");

            migrationBuilder.AddForeignKey(
                name: "fk_tickets_ticket_subject_guidance_configs_subject_guidance_con",
                table: "tickets",
                column: "subject_guidance_config_id",
                principalTable: "ticket_subject_guidance_configs",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_tickets_ticket_workflow_definitions_workflow_definition_id",
                table: "tickets",
                column: "workflow_definition_id",
                principalTable: "ticket_workflow_definitions",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_tickets_ticket_subject_guidance_configs_subject_guidance_con",
                table: "tickets");

            migrationBuilder.DropForeignKey(
                name: "fk_tickets_ticket_workflow_definitions_workflow_definition_id",
                table: "tickets");

            migrationBuilder.DropTable(
                name: "ticket_subject_guidance_configs");

            migrationBuilder.DropTable(
                name: "ticket_workflow_definitions");

            migrationBuilder.DropIndex(
                name: "ix_tickets_subject_guidance_config_id",
                table: "tickets");

            migrationBuilder.DropIndex(
                name: "ix_tickets_workflow_definition_id",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "subject_guidance_config_id",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "subject_guidance_config_name",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "workflow_auto_acknowledge_after_days",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "workflow_definition_id",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "workflow_name",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "workflow_status_step_map_json",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "workflow_steps_json",
                table: "tickets");

            migrationBuilder.CreateIndex(
                name: "ix_tickets_subject_id",
                table: "tickets",
                column: "subject_id");
        }
    }
}
