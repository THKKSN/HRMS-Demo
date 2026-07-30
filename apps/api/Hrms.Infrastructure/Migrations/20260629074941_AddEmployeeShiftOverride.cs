using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddEmployeeShiftOverride : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "shift_id",
                table: "departments",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.CreateTable(
                name: "employee_shift_overrides",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    employee_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    shift_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    effective_from = table.Column<DateOnly>(type: "date", nullable: false),
                    effective_to = table.Column<DateOnly>(type: "date", nullable: true),
                    reason = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_by_hr_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_employee_shift_overrides", x => x.id);
                    table.ForeignKey(
                        name: "fk_employee_shift_overrides_employees_created_by_hr_id",
                        column: x => x.created_by_hr_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_employee_shift_overrides_employees_employee_id",
                        column: x => x.employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_employee_shift_overrides_shifts_shift_id",
                        column: x => x.shift_id,
                        principalTable: "shifts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "ix_departments_shift_id",
                table: "departments",
                column: "shift_id");

            migrationBuilder.CreateIndex(
                name: "ix_employee_shift_overrides_created_by_hr_id",
                table: "employee_shift_overrides",
                column: "created_by_hr_id");

            migrationBuilder.CreateIndex(
                name: "ix_employee_shift_overrides_employee_id_effective_from",
                table: "employee_shift_overrides",
                columns: new[] { "employee_id", "effective_from" });

            migrationBuilder.CreateIndex(
                name: "ix_employee_shift_overrides_employee_id_is_active",
                table: "employee_shift_overrides",
                columns: new[] { "employee_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "ix_employee_shift_overrides_shift_id",
                table: "employee_shift_overrides",
                column: "shift_id");

            migrationBuilder.AddForeignKey(
                name: "fk_departments_shifts_shift_id",
                table: "departments",
                column: "shift_id",
                principalTable: "shifts",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_departments_shifts_shift_id",
                table: "departments");

            migrationBuilder.DropTable(
                name: "employee_shift_overrides");

            migrationBuilder.DropIndex(
                name: "ix_departments_shift_id",
                table: "departments");

            migrationBuilder.DropColumn(
                name: "shift_id",
                table: "departments");
        }
    }
}
