using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTicketCloseoutReasons : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "closeout_reason_id",
                table: "tickets",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AddColumn<string>(
                name: "closeout_reason_name_snapshot",
                table: "tickets",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "closeout_reason_snapshot",
                table: "ticket_reviews",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "ticket_closeout_reasons",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    company_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    department_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    description = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    kind = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false, defaultValue: "problem_type")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    legacy_problem_type = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true),
                    sort_order = table.Column<int>(type: "int", nullable: false),
                    created_by_employee_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ticket_closeout_reasons", x => x.id);
                    table.ForeignKey(
                        name: "fk_ticket_closeout_reasons_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_ticket_closeout_reasons_departments_department_id",
                        column: x => x.department_id,
                        principalTable: "departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_ticket_closeout_reasons_employees_created_by_employee_id",
                        column: x => x.created_by_employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "ticket_closeout_reason_categories",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    closeout_reason_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    category_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ticket_closeout_reason_categories", x => x.id);
                    table.ForeignKey(
                        name: "fk_ticket_closeout_reason_categories_ticket_categories_category",
                        column: x => x.category_id,
                        principalTable: "ticket_categories",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_ticket_closeout_reason_categories_ticket_closeout_reasons_cl",
                        column: x => x.closeout_reason_id,
                        principalTable: "ticket_closeout_reasons",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "ix_tickets_closeout_reason_id",
                table: "tickets",
                column: "closeout_reason_id");

            migrationBuilder.CreateIndex(
                name: "ix_ticket_closeout_reason_categories_category_id",
                table: "ticket_closeout_reason_categories",
                column: "category_id");

            migrationBuilder.CreateIndex(
                name: "ix_ticket_closeout_reason_categories_closeout_reason_id_categor",
                table: "ticket_closeout_reason_categories",
                columns: new[] { "closeout_reason_id", "category_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_ticket_closeout_reasons_company_id_department_id_kind_is_act",
                table: "ticket_closeout_reasons",
                columns: new[] { "company_id", "department_id", "kind", "is_active" });

            migrationBuilder.CreateIndex(
                name: "ix_ticket_closeout_reasons_company_id_legacy_problem_type",
                table: "ticket_closeout_reasons",
                columns: new[] { "company_id", "legacy_problem_type" });

            migrationBuilder.CreateIndex(
                name: "ix_ticket_closeout_reasons_created_by_employee_id",
                table: "ticket_closeout_reasons",
                column: "created_by_employee_id");

            migrationBuilder.CreateIndex(
                name: "ix_ticket_closeout_reasons_department_id",
                table: "ticket_closeout_reasons",
                column: "department_id");

            migrationBuilder.AddForeignKey(
                name: "fk_tickets_ticket_closeout_reasons_closeout_reason_id",
                table: "tickets",
                column: "closeout_reason_id",
                principalTable: "ticket_closeout_reasons",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            // ── data migration: seed default 3 แถวต่อบริษัทให้ตรง enum TicketProblemType เดิม แล้ว backfill ticket/review เก่า ──
            // idempotent: seed เฉพาะบริษัทที่ยังไม่มีแถว legacy นั้น และ backfill เฉพาะแถวที่ยังว่าง
            migrationBuilder.Sql("""
                INSERT INTO `ticket_closeout_reasons`
                    (`id`, `company_id`, `department_id`, `name`, `description`, `kind`, `legacy_problem_type`,
                     `is_active`, `sort_order`, `created_at`, `updated_at`)
                SELECT UUID(), c.`id`, NULL, s.`name`, NULL, 'problem_type', s.`legacy`,
                       1, s.`sort_order`, UTC_TIMESTAMP() + INTERVAL 7 HOUR, UTC_TIMESTAMP() + INTERVAL 7 HOUR
                FROM `companies` c
                CROSS JOIN (
                    SELECT 'ระบบบกพร่อง' AS `name`, 'SystemDefect' AS `legacy`, 10 AS `sort_order`
                    UNION ALL SELECT 'ปรับปรุงเพิ่มเติม', 'Enhancement', 20
                    UNION ALL SELECT 'อื่น ๆ', 'Other', 30
                ) s
                WHERE NOT EXISTS (
                    SELECT 1 FROM `ticket_closeout_reasons` r
                    WHERE r.`company_id` = c.`id` AND r.`department_id` IS NULL AND r.`legacy_problem_type` = s.`legacy`);
                """);

            migrationBuilder.Sql("""
                UPDATE `tickets` t
                JOIN `ticket_closeout_reasons` r
                  ON r.`company_id` = t.`target_company_id`
                 AND r.`department_id` IS NULL
                 AND r.`legacy_problem_type` = t.`problem_type`
                SET t.`closeout_reason_id` = r.`id`,
                    t.`closeout_reason_name_snapshot` = r.`name`
                WHERE t.`problem_type` IS NOT NULL AND t.`closeout_reason_id` IS NULL;
                """);

            migrationBuilder.Sql("""
                UPDATE `ticket_reviews` rv
                JOIN `tickets` t ON t.`id` = rv.`ticket_id`
                JOIN `ticket_closeout_reasons` r
                  ON r.`company_id` = t.`target_company_id`
                 AND r.`department_id` IS NULL
                 AND r.`legacy_problem_type` = rv.`problem_type_snapshot`
                SET rv.`closeout_reason_snapshot` = r.`name`
                WHERE rv.`problem_type_snapshot` IS NOT NULL AND rv.`closeout_reason_snapshot` IS NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_tickets_ticket_closeout_reasons_closeout_reason_id",
                table: "tickets");

            migrationBuilder.DropTable(
                name: "ticket_closeout_reason_categories");

            migrationBuilder.DropTable(
                name: "ticket_closeout_reasons");

            migrationBuilder.DropIndex(
                name: "ix_tickets_closeout_reason_id",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "closeout_reason_id",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "closeout_reason_name_snapshot",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "closeout_reason_snapshot",
                table: "ticket_reviews");
        }
    }
}
