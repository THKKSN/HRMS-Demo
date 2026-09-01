using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMemoAcknowledge : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "acknowledged_at",
                table: "memos",
                type: "datetime",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "acknowledged_by_employee_id",
                table: "memos",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.CreateIndex(
                name: "ix_memos_acknowledged_by_employee_id",
                table: "memos",
                column: "acknowledged_by_employee_id");

            migrationBuilder.AddForeignKey(
                name: "fk_memos_employees_acknowledged_by_employee_id",
                table: "memos",
                column: "acknowledged_by_employee_id",
                principalTable: "employees",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_memos_employees_acknowledged_by_employee_id",
                table: "memos");

            migrationBuilder.DropIndex(
                name: "ix_memos_acknowledged_by_employee_id",
                table: "memos");

            migrationBuilder.DropColumn(
                name: "acknowledged_at",
                table: "memos");

            migrationBuilder.DropColumn(
                name: "acknowledged_by_employee_id",
                table: "memos");
        }
    }
}
