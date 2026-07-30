using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UseRoleUniqueIds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "ix_employee_roles_employee_id_role_migration",
                table: "employee_roles",
                column: "employee_id");

            migrationBuilder.DropIndex(
                name: "ix_role_permissions_role_permission",
                table: "role_permissions");

            migrationBuilder.DropIndex(
                name: "ix_employee_roles_employee_id_role_company_id_is_active",
                table: "employee_roles");

            migrationBuilder.CreateTable(
                name: "roles",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    code = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    name_th = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    is_system = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_roles", x => x.id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.InsertData(
                table: "roles",
                columns: new[] { "id", "code", "name_th", "is_system", "is_active", "created_at", "updated_at" },
                values: new object[,]
                {
                    { new Guid("10000000-0000-0000-0000-000000000001"), "Employee", "พนักงาน", true, true, new DateTime(2026, 7, 27, 0, 0, 0), new DateTime(2026, 7, 27, 0, 0, 0) },
                    { new Guid("10000000-0000-0000-0000-000000000002"), "Supervisor", "หัวหน้างาน", true, true, new DateTime(2026, 7, 27, 0, 0, 0), new DateTime(2026, 7, 27, 0, 0, 0) },
                    { new Guid("10000000-0000-0000-0000-000000000003"), "Hr", "ฝ่ายทรัพยากรบุคคล", true, true, new DateTime(2026, 7, 27, 0, 0, 0), new DateTime(2026, 7, 27, 0, 0, 0) },
                    { new Guid("10000000-0000-0000-0000-000000000004"), "SchoolAdmin", "ผู้ดูแลโรงเรียน", true, true, new DateTime(2026, 7, 27, 0, 0, 0), new DateTime(2026, 7, 27, 0, 0, 0) },
                    { new Guid("10000000-0000-0000-0000-000000000005"), "Executive", "ผู้บริหาร", true, true, new DateTime(2026, 7, 27, 0, 0, 0), new DateTime(2026, 7, 27, 0, 0, 0) },
                    { new Guid("10000000-0000-0000-0000-000000000006"), "Admin", "ผู้ดูแลระบบ", true, true, new DateTime(2026, 7, 27, 0, 0, 0), new DateTime(2026, 7, 27, 0, 0, 0) }
                });

            migrationBuilder.AddColumn<Guid>(
                name: "role_id",
                table: "role_permissions",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AddColumn<Guid>(
                name: "role_id",
                table: "employee_roles",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.Sql(
                """
                UPDATE role_permissions rp
                INNER JOIN roles r ON r.code = rp.role
                SET rp.role_id = r.id;
                """);

            migrationBuilder.Sql(
                """
                UPDATE employee_roles er
                INNER JOIN roles r ON r.code = er.role
                SET er.role_id = r.id;
                """);

            migrationBuilder.AlterColumn<Guid>(
                name: "role_id",
                table: "role_permissions",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldNullable: true,
                oldCollation: "ascii_general_ci");

            migrationBuilder.AlterColumn<Guid>(
                name: "role_id",
                table: "employee_roles",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldNullable: true,
                oldCollation: "ascii_general_ci");

            migrationBuilder.CreateIndex(
                name: "ix_role_permissions_role_id_permission",
                table: "role_permissions",
                columns: new[] { "role_id", "permission_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_employee_roles_employee_id_role_id_company_id_is_active",
                table: "employee_roles",
                columns: new[] { "employee_id", "role_id", "company_id", "is_active" });

            migrationBuilder.DropIndex(
                name: "ix_employee_roles_employee_id_role_migration",
                table: "employee_roles");

            migrationBuilder.CreateIndex(
                name: "ix_employee_roles_role_id",
                table: "employee_roles",
                column: "role_id");

            migrationBuilder.CreateIndex(
                name: "ix_roles_code",
                table: "roles",
                column: "code",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "fk_employee_roles_system_roles_role_id",
                table: "employee_roles",
                column: "role_id",
                principalTable: "roles",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_role_permissions_system_roles_role_id",
                table: "role_permissions",
                column: "role_id",
                principalTable: "roles",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.DropColumn(
                name: "role",
                table: "role_permissions");

            migrationBuilder.DropColumn(
                name: "role",
                table: "employee_roles");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_employee_roles_system_roles_role_id",
                table: "employee_roles");

            migrationBuilder.DropForeignKey(
                name: "fk_role_permissions_system_roles_role_id",
                table: "role_permissions");

            migrationBuilder.CreateIndex(
                name: "ix_employee_roles_employee_id_role_migration",
                table: "employee_roles",
                column: "employee_id");

            migrationBuilder.DropIndex(
                name: "ix_role_permissions_role_id_permission",
                table: "role_permissions");

            migrationBuilder.DropIndex(
                name: "ix_employee_roles_employee_id_role_id_company_id_is_active",
                table: "employee_roles");

            migrationBuilder.DropIndex(
                name: "ix_employee_roles_role_id",
                table: "employee_roles");

            migrationBuilder.AddColumn<string>(
                name: "role",
                table: "role_permissions",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "role",
                table: "employee_roles",
                type: "varchar(20)",
                maxLength: 20,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.Sql(
                """
                UPDATE role_permissions rp
                INNER JOIN roles r ON r.id = rp.role_id
                SET rp.role = r.code;
                """);

            migrationBuilder.Sql(
                """
                UPDATE employee_roles er
                INNER JOIN roles r ON r.id = er.role_id
                SET er.role = r.code;
                """);

            migrationBuilder.AlterColumn<string>(
                name: "role",
                table: "role_permissions",
                type: "varchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(50)",
                oldMaxLength: 50,
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<string>(
                name: "role",
                table: "employee_roles",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(20)",
                oldMaxLength: 20,
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.DropColumn(
                name: "role_id",
                table: "role_permissions");

            migrationBuilder.DropColumn(
                name: "role_id",
                table: "employee_roles");

            migrationBuilder.DropTable(
                name: "roles");

            migrationBuilder.CreateIndex(
                name: "ix_role_permissions_role_permission",
                table: "role_permissions",
                columns: new[] { "role", "permission_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_employee_roles_employee_id_role_company_id_is_active",
                table: "employee_roles",
                columns: new[] { "employee_id", "role", "company_id", "is_active" });

            migrationBuilder.DropIndex(
                name: "ix_employee_roles_employee_id_role_migration",
                table: "employee_roles");
        }
    }
}
