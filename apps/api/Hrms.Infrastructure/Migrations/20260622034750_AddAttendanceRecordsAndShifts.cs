using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAttendanceRecordsAndShifts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "attendance_logs");

            migrationBuilder.CreateTable(
                name: "attendance_records",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    employee_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    location_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    check_in_time = table.Column<DateTime>(type: "datetime", nullable: true),
                    check_out_time = table.Column<DateTime>(type: "datetime", nullable: true),
                    check_in_latitude = table.Column<double>(type: "double", nullable: true),
                    check_in_longitude = table.Column<double>(type: "double", nullable: true),
                    check_out_latitude = table.Column<double>(type: "double", nullable: true),
                    check_out_longitude = table.Column<double>(type: "double", nullable: true),
                    check_in_selfie_url = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    check_out_selfie_url = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    is_late = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    late_minutes = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    status = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    remark = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_attendance_records", x => x.id);
                    table.ForeignKey(
                        name: "fk_attendance_records_employees_employee_id",
                        column: x => x.employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_attendance_records_locations_location_id",
                        column: x => x.location_id,
                        principalTable: "locations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "shifts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    company_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    start_time = table.Column<TimeOnly>(type: "time", nullable: false),
                    end_time = table.Column<TimeOnly>(type: "time", nullable: false),
                    grace_period_minutes = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_shifts", x => x.id);
                    table.ForeignKey(
                        name: "fk_shifts_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "ix_attendance_records_employee_date",
                table: "attendance_records",
                columns: new[] { "employee_id", "date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_attendance_records_location_id",
                table: "attendance_records",
                column: "location_id");

            migrationBuilder.CreateIndex(
                name: "ix_shifts_company_id",
                table: "shifts",
                column: "company_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "attendance_records");

            migrationBuilder.DropTable(
                name: "shifts");

            migrationBuilder.CreateTable(
                name: "attendance_logs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    employee_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    check_in_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    check_in_lat = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    check_in_lng = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    check_out_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    check_out_lat = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    check_out_lng = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    is_late = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    selfie_url = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    work_minutes = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_attendance_logs", x => x.id);
                    table.ForeignKey(
                        name: "fk_attendance_logs_employees_employee_id",
                        column: x => x.employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "ix_attendance_logs_employee_id",
                table: "attendance_logs",
                column: "employee_id");
        }
    }
}
