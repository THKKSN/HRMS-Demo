using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveLeaveTypeCompany : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_leave_types_companies_company_id",
                table: "leave_types");

            migrationBuilder.DropIndex(
                name: "ix_leave_types_company_id",
                table: "leave_types");

            migrationBuilder.DropColumn(
                name: "company_id",
                table: "leave_types");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "company_id",
                table: "leave_types",
                type: "char(36)",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                collation: "ascii_general_ci");

            migrationBuilder.CreateIndex(
                name: "ix_leave_types_company_id",
                table: "leave_types",
                column: "company_id");

            migrationBuilder.AddForeignKey(
                name: "fk_leave_types_companies_company_id",
                table: "leave_types",
                column: "company_id",
                principalTable: "companies",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
