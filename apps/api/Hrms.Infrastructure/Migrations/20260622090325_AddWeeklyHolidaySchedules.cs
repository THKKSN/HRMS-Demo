using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWeeklyHolidaySchedules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "weekly_holiday_schedules",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    company_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    name = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    day_of_week = table.Column<sbyte>(type: "tinyint", nullable: false),
                    work_day_occurrences = table.Column<string>(type: "json", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_weekly_holiday_schedules", x => x.id);
                    table.ForeignKey(
                        name: "fk_weekly_holiday_schedules_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "ix_weekly_holiday_schedules_company_id",
                table: "weekly_holiday_schedules",
                column: "company_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "weekly_holiday_schedules");
        }
    }
}
