using System;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    [DbContext(typeof(HrmsDbContext))]
    [Migration("20260720090000_AddTickets")]
    public partial class AddTickets : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ticket_categories",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    company_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    department_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    description = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    sort_order = table.Column<int>(type: "int", nullable: false),
                    created_by_employee_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ticket_categories", x => x.id);
                    table.ForeignKey(
                        name: "fk_ticket_categories_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_ticket_categories_departments_department_id",
                        column: x => x.department_id,
                        principalTable: "departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_ticket_categories_employees_created_by_employee_id",
                        column: x => x.created_by_employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "ticket_topics",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    company_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    department_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    category_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    description = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    sort_order = table.Column<int>(type: "int", nullable: false),
                    created_by_employee_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ticket_topics", x => x.id);
                    table.ForeignKey(
                        name: "fk_ticket_topics_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_ticket_topics_departments_department_id",
                        column: x => x.department_id,
                        principalTable: "departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_ticket_topics_employees_created_by_employee_id",
                        column: x => x.created_by_employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_ticket_topics_ticket_categories_category_id",
                        column: x => x.category_id,
                        principalTable: "ticket_categories",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "tickets",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    ticket_no = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    request_type = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    requester_employee_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    source_company_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    source_department_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    target_company_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    target_department_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    category_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    topic_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    title = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    detail = table.Column<string>(type: "varchar(2000)", maxLength: 2000, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    priority = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    status = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    vehicle_text = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    location_text = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    contact_phone = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    contact_note = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    receiver_employee_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    supervisor_accepted_by_employee_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    supervisor_accepted_at = table.Column<DateTime>(type: "datetime", nullable: true),
                    problem_type = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    initial_inspection_note = table.Column<string>(type: "varchar(2000)", maxLength: 2000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    resolution_note = table.Column<string>(type: "varchar(2000)", maxLength: 2000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    resolved_by_employee_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    resolved_at = table.Column<DateTime>(type: "datetime", nullable: true),
                    closed_by_employee_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    closed_at = table.Column<DateTime>(type: "datetime", nullable: true),
                    verified_by_employee_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    verified_at = table.Column<DateTime>(type: "datetime", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_tickets", x => x.id);
                    table.ForeignKey("fk_tickets_companies_source_company_id", x => x.source_company_id, "companies", "id", onDelete: ReferentialAction.Restrict);
                    table.ForeignKey("fk_tickets_companies_target_company_id", x => x.target_company_id, "companies", "id", onDelete: ReferentialAction.Restrict);
                    table.ForeignKey("fk_tickets_departments_source_department_id", x => x.source_department_id, "departments", "id", onDelete: ReferentialAction.SetNull);
                    table.ForeignKey("fk_tickets_departments_target_department_id", x => x.target_department_id, "departments", "id", onDelete: ReferentialAction.Restrict);
                    table.ForeignKey("fk_tickets_employees_closed_by_employee_id", x => x.closed_by_employee_id, "employees", "id", onDelete: ReferentialAction.SetNull);
                    table.ForeignKey("fk_tickets_employees_receiver_employee_id", x => x.receiver_employee_id, "employees", "id", onDelete: ReferentialAction.SetNull);
                    table.ForeignKey("fk_tickets_employees_requester_employee_id", x => x.requester_employee_id, "employees", "id", onDelete: ReferentialAction.Restrict);
                    table.ForeignKey("fk_tickets_employees_resolved_by_employee_id", x => x.resolved_by_employee_id, "employees", "id", onDelete: ReferentialAction.SetNull);
                    table.ForeignKey("fk_tickets_employees_supervisor_accepted_by_employee_id", x => x.supervisor_accepted_by_employee_id, "employees", "id", onDelete: ReferentialAction.SetNull);
                    table.ForeignKey("fk_tickets_employees_verified_by_employee_id", x => x.verified_by_employee_id, "employees", "id", onDelete: ReferentialAction.SetNull);
                    table.ForeignKey("fk_tickets_ticket_categories_category_id", x => x.category_id, "ticket_categories", "id", onDelete: ReferentialAction.Restrict);
                    table.ForeignKey("fk_tickets_ticket_topics_topic_id", x => x.topic_id, "ticket_topics", "id", onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "ticket_attachments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    ticket_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    uploaded_by_employee_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    url = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    file_name = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    content_type = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    stage = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ticket_attachments", x => x.id);
                    table.ForeignKey("fk_ticket_attachments_employees_uploaded_by_employee_id", x => x.uploaded_by_employee_id, "employees", "id", onDelete: ReferentialAction.Restrict);
                    table.ForeignKey("fk_ticket_attachments_tickets_ticket_id", x => x.ticket_id, "tickets", "id", onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex("ix_ticket_categories_company_id_department_id_is_active", "ticket_categories", new[] { "company_id", "department_id", "is_active" });
            migrationBuilder.CreateIndex("ix_ticket_categories_created_by_employee_id", "ticket_categories", "created_by_employee_id");
            migrationBuilder.CreateIndex("ix_ticket_categories_department_id_name", "ticket_categories", new[] { "department_id", "name" }, unique: true);

            migrationBuilder.CreateIndex("ix_ticket_topics_category_id_name", "ticket_topics", new[] { "category_id", "name" }, unique: true);
            migrationBuilder.CreateIndex("ix_ticket_topics_company_id", "ticket_topics", "company_id");
            migrationBuilder.CreateIndex("ix_ticket_topics_created_by_employee_id", "ticket_topics", "created_by_employee_id");
            migrationBuilder.CreateIndex("ix_ticket_topics_department_id_category_id_is_active", "ticket_topics", new[] { "department_id", "category_id", "is_active" });

            migrationBuilder.CreateIndex("ix_tickets_category_id_topic_id_status", "tickets", new[] { "category_id", "topic_id", "status" });
            migrationBuilder.CreateIndex("ix_tickets_closed_by_employee_id", "tickets", "closed_by_employee_id");
            migrationBuilder.CreateIndex("ix_tickets_receiver_employee_id", "tickets", "receiver_employee_id");
            migrationBuilder.CreateIndex("ix_tickets_requester_employee_id_status", "tickets", new[] { "requester_employee_id", "status" });
            migrationBuilder.CreateIndex("ix_tickets_resolved_by_employee_id", "tickets", "resolved_by_employee_id");
            migrationBuilder.CreateIndex("ix_tickets_source_company_id", "tickets", "source_company_id");
            migrationBuilder.CreateIndex("ix_tickets_source_department_id", "tickets", "source_department_id");
            migrationBuilder.CreateIndex("ix_tickets_supervisor_accepted_by_employee_id", "tickets", "supervisor_accepted_by_employee_id");
            migrationBuilder.CreateIndex("ix_tickets_target_company_id", "tickets", "target_company_id");
            migrationBuilder.CreateIndex("ix_tickets_target_department_id_status", "tickets", new[] { "target_department_id", "status" });
            migrationBuilder.CreateIndex("ix_tickets_ticket_no", "tickets", "ticket_no", unique: true);
            migrationBuilder.CreateIndex("ix_tickets_topic_id", "tickets", "topic_id");
            migrationBuilder.CreateIndex("ix_tickets_verified_by_employee_id", "tickets", "verified_by_employee_id");

            migrationBuilder.CreateIndex("ix_ticket_attachments_ticket_id_stage", "ticket_attachments", new[] { "ticket_id", "stage" });
            migrationBuilder.CreateIndex("ix_ticket_attachments_uploaded_by_employee_id", "ticket_attachments", "uploaded_by_employee_id");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "ticket_attachments");
            migrationBuilder.DropTable(name: "tickets");
            migrationBuilder.DropTable(name: "ticket_topics");
            migrationBuilder.DropTable(name: "ticket_categories");
        }
    }
}
