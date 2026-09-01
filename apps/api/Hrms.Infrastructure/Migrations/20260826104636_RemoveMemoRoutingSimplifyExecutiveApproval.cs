using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveMemoRoutingSimplifyExecutiveApproval : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_memos_employees_resolved_approver_employee_id",
                table: "memos");

            migrationBuilder.DropForeignKey(
                name: "fk_memos_memo_routings_resolved_routing_id",
                table: "memos");

            migrationBuilder.DropTable(
                name: "memo_routings");

            migrationBuilder.DropIndex(
                name: "ix_memos_resolved_approver_employee_id",
                table: "memos");

            migrationBuilder.DropIndex(
                name: "ix_memos_resolved_routing_id",
                table: "memos");

            migrationBuilder.DropColumn(
                name: "resolved_approver_employee_id",
                table: "memos");

            migrationBuilder.DropColumn(
                name: "resolved_routing_id",
                table: "memos");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "resolved_approver_employee_id",
                table: "memos",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AddColumn<Guid>(
                name: "resolved_routing_id",
                table: "memos",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.CreateTable(
                name: "memo_routings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    approver_role_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    memo_type_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    priority = table.Column<int>(type: "int", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_memo_routings", x => x.id);
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

            migrationBuilder.CreateIndex(
                name: "ix_memos_resolved_approver_employee_id",
                table: "memos",
                column: "resolved_approver_employee_id");

            migrationBuilder.CreateIndex(
                name: "ix_memos_resolved_routing_id",
                table: "memos",
                column: "resolved_routing_id");

            migrationBuilder.CreateIndex(
                name: "ix_memo_routings_approver_role_id",
                table: "memo_routings",
                column: "approver_role_id");

            migrationBuilder.CreateIndex(
                name: "ix_memo_routings_type_priority",
                table: "memo_routings",
                columns: new[] { "memo_type_id", "priority" });

            migrationBuilder.AddForeignKey(
                name: "fk_memos_employees_resolved_approver_employee_id",
                table: "memos",
                column: "resolved_approver_employee_id",
                principalTable: "employees",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_memos_memo_routings_resolved_routing_id",
                table: "memos",
                column: "resolved_routing_id",
                principalTable: "memo_routings",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
