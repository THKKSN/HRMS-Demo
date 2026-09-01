using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMemoModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "memo_types",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    name = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_memo_types", x => x.id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "memo_categories",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    memo_type_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    name = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_memo_categories", x => x.id);
                    table.ForeignKey(
                        name: "fk_memo_categories_memo_types_memo_type_id",
                        column: x => x.memo_type_id,
                        principalTable: "memo_types",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "memo_routings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    memo_type_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    company_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    department_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    approver_role_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    priority = table.Column<int>(type: "int", nullable: false),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_memo_routings", x => x.id);
                    table.ForeignKey(
                        name: "fk_memo_routings_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_memo_routings_departments_department_id",
                        column: x => x.department_id,
                        principalTable: "departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_memo_routings_memo_types_memo_type_id",
                        column: x => x.memo_type_id,
                        principalTable: "memo_types",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_memo_routings_system_roles_approver_role_id",
                        column: x => x.approver_role_id,
                        principalTable: "roles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "memo_sub_categories",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    memo_category_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    name = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_memo_sub_categories", x => x.id);
                    table.ForeignKey(
                        name: "fk_memo_sub_categories_memo_categories_memo_category_id",
                        column: x => x.memo_category_id,
                        principalTable: "memo_categories",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "memos",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    memo_type_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    memo_category_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    memo_sub_category_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    detail = table.Column<string>(type: "text", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    requester_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    company_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    department_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    memo_category_name_snapshot = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    memo_sub_category_name_snapshot = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    resolved_routing_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    resolved_approver_employee_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    status = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    approved_at = table.Column<DateTime>(type: "datetime", nullable: true),
                    approved_by_employee_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    rejected_at = table.Column<DateTime>(type: "datetime", nullable: true),
                    reject_reason = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_memos", x => x.id);
                    table.ForeignKey(
                        name: "fk_memos_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_memos_departments_department_id",
                        column: x => x.department_id,
                        principalTable: "departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_memos_employees_approved_by_employee_id",
                        column: x => x.approved_by_employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_memos_employees_requester_id",
                        column: x => x.requester_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_memos_employees_resolved_approver_employee_id",
                        column: x => x.resolved_approver_employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_memos_memo_categories_memo_category_id",
                        column: x => x.memo_category_id,
                        principalTable: "memo_categories",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_memos_memo_routings_resolved_routing_id",
                        column: x => x.resolved_routing_id,
                        principalTable: "memo_routings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_memos_memo_sub_categories_memo_sub_category_id",
                        column: x => x.memo_sub_category_id,
                        principalTable: "memo_sub_categories",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_memos_memo_types_memo_type_id",
                        column: x => x.memo_type_id,
                        principalTable: "memo_types",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "ix_memo_categories_type_name",
                table: "memo_categories",
                columns: new[] { "memo_type_id", "name" });

            migrationBuilder.CreateIndex(
                name: "ix_memo_routings_approver_role_id",
                table: "memo_routings",
                column: "approver_role_id");

            migrationBuilder.CreateIndex(
                name: "ix_memo_routings_company_id",
                table: "memo_routings",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "ix_memo_routings_department_id",
                table: "memo_routings",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "ix_memo_routings_resolve_lookup",
                table: "memo_routings",
                columns: new[] { "memo_type_id", "company_id", "department_id" });

            migrationBuilder.CreateIndex(
                name: "ix_memo_routings_type_company_department_priority",
                table: "memo_routings",
                columns: new[] { "memo_type_id", "company_id", "department_id", "priority" });

            migrationBuilder.CreateIndex(
                name: "ix_memo_sub_categories_category_name",
                table: "memo_sub_categories",
                columns: new[] { "memo_category_id", "name" });

            migrationBuilder.CreateIndex(
                name: "ix_memo_types_name",
                table: "memo_types",
                column: "name");

            migrationBuilder.CreateIndex(
                name: "ix_memos_approved_by_employee_id",
                table: "memos",
                column: "approved_by_employee_id");

            migrationBuilder.CreateIndex(
                name: "ix_memos_company_id",
                table: "memos",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "ix_memos_department_id",
                table: "memos",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "ix_memos_memo_category_id",
                table: "memos",
                column: "memo_category_id");

            migrationBuilder.CreateIndex(
                name: "ix_memos_memo_sub_category_id",
                table: "memos",
                column: "memo_sub_category_id");

            migrationBuilder.CreateIndex(
                name: "ix_memos_memo_type_id",
                table: "memos",
                column: "memo_type_id");

            migrationBuilder.CreateIndex(
                name: "ix_memos_requester_id",
                table: "memos",
                column: "requester_id");

            migrationBuilder.CreateIndex(
                name: "ix_memos_resolved_approver_employee_id",
                table: "memos",
                column: "resolved_approver_employee_id");

            migrationBuilder.CreateIndex(
                name: "ix_memos_resolved_routing_id",
                table: "memos",
                column: "resolved_routing_id");

            migrationBuilder.CreateIndex(
                name: "ix_memos_status",
                table: "memos",
                column: "status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "memos");

            migrationBuilder.DropTable(
                name: "memo_routings");

            migrationBuilder.DropTable(
                name: "memo_sub_categories");

            migrationBuilder.DropTable(
                name: "memo_categories");

            migrationBuilder.DropTable(
                name: "memo_types");
        }
    }
}
