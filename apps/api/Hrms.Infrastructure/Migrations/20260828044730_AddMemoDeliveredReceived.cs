using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMemoDeliveredReceived : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "delivered_at",
                table: "memos",
                type: "datetime",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "delivered_by_employee_id",
                table: "memos",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AddColumn<DateTime>(
                name: "received_at",
                table: "memos",
                type: "datetime",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "received_by_employee_id",
                table: "memos",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.CreateIndex(
                name: "ix_memos_delivered_by_employee_id",
                table: "memos",
                column: "delivered_by_employee_id");

            migrationBuilder.CreateIndex(
                name: "ix_memos_received_by_employee_id",
                table: "memos",
                column: "received_by_employee_id");

            migrationBuilder.AddForeignKey(
                name: "fk_memos_employees_delivered_by_employee_id",
                table: "memos",
                column: "delivered_by_employee_id",
                principalTable: "employees",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_memos_employees_received_by_employee_id",
                table: "memos",
                column: "received_by_employee_id",
                principalTable: "employees",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_memos_employees_delivered_by_employee_id",
                table: "memos");

            migrationBuilder.DropForeignKey(
                name: "fk_memos_employees_received_by_employee_id",
                table: "memos");

            migrationBuilder.DropIndex(
                name: "ix_memos_delivered_by_employee_id",
                table: "memos");

            migrationBuilder.DropIndex(
                name: "ix_memos_received_by_employee_id",
                table: "memos");

            migrationBuilder.DropColumn(
                name: "delivered_at",
                table: "memos");

            migrationBuilder.DropColumn(
                name: "delivered_by_employee_id",
                table: "memos");

            migrationBuilder.DropColumn(
                name: "received_at",
                table: "memos");

            migrationBuilder.DropColumn(
                name: "received_by_employee_id",
                table: "memos");
        }
    }
}
