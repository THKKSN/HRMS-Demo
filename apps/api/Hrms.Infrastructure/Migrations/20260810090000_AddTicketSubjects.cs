using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations;

[DbContext(typeof(HrmsDbContext))]
[Migration("20260810090000_AddTicketSubjects")]
public partial class AddTicketSubjects : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "ticket_subjects",
            columns: table => new
            {
                id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                company_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                department_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                category_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                topic_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                name = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                description = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                is_active = table.Column<bool>(type: "tinyint(1)", nullable: false),
                sort_order = table.Column<int>(type: "int", nullable: false),
                created_by_employee_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_ticket_subjects", x => x.id);
                table.ForeignKey(
                    name: "fk_ticket_subjects_companies_company_id",
                    column: x => x.company_id,
                    principalTable: "companies",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_ticket_subjects_departments_department_id",
                    column: x => x.department_id,
                    principalTable: "departments",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_ticket_subjects_ticket_categories_category_id",
                    column: x => x.category_id,
                    principalTable: "ticket_categories",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_ticket_subjects_ticket_topics_topic_id",
                    column: x => x.topic_id,
                    principalTable: "ticket_topics",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "fk_ticket_subjects_employees_created_by_employee_id",
                    column: x => x.created_by_employee_id,
                    principalTable: "employees",
                    principalColumn: "id",
                    onDelete: ReferentialAction.SetNull);
            })
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.AddColumn<Guid>(
            name: "subject_id",
            table: "tickets",
            type: "char(36)",
            nullable: true,
            collation: "ascii_general_ci");

        migrationBuilder.CreateIndex(
            name: "ix_ticket_subjects_company_id",
            table: "ticket_subjects",
            column: "company_id");

        migrationBuilder.CreateIndex(
            name: "ix_ticket_subjects_created_by_employee_id",
            table: "ticket_subjects",
            column: "created_by_employee_id");

        migrationBuilder.CreateIndex(
            name: "ix_ticket_subjects_department_id_category_id_topic_id_is_active",
            table: "ticket_subjects",
            columns: new[] { "department_id", "category_id", "topic_id", "is_active" });

        migrationBuilder.CreateIndex(
            name: "ix_ticket_subjects_category_id",
            table: "ticket_subjects",
            column: "category_id");

        migrationBuilder.CreateIndex(
            name: "ix_ticket_subjects_topic_id_name",
            table: "ticket_subjects",
            columns: new[] { "topic_id", "name" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "ix_tickets_subject_id",
            table: "tickets",
            column: "subject_id");

        migrationBuilder.CreateIndex(
            name: "ix_tickets_subject_id_status",
            table: "tickets",
            columns: new[] { "subject_id", "status" });

        migrationBuilder.AddForeignKey(
            name: "fk_tickets_ticket_subjects_subject_id",
            table: "tickets",
            column: "subject_id",
            principalTable: "ticket_subjects",
            principalColumn: "id",
            onDelete: ReferentialAction.Restrict);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "fk_tickets_ticket_subjects_subject_id",
            table: "tickets");

        migrationBuilder.DropTable(name: "ticket_subjects");

        migrationBuilder.DropIndex(
            name: "ix_tickets_subject_id",
            table: "tickets");

        migrationBuilder.DropIndex(
            name: "ix_tickets_subject_id_status",
            table: "tickets");

        migrationBuilder.DropColumn(
            name: "subject_id",
            table: "tickets");
    }
}
