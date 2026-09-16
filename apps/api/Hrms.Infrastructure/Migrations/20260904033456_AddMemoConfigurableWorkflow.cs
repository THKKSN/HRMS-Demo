using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMemoConfigurableWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "current_step_instance_id",
                table: "memos",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AddColumn<Guid>(
                name: "first_approver_employee_id_snapshot",
                table: "memos",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            // default 'Executive' — backfill เรื่องเก่าให้ใช้ pool Executive เดิมโดยอัตโนมัติ
            migrationBuilder.AddColumn<string>(
                name: "first_approver_role_code_snapshot",
                table: "memos",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Executive")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<Guid>(
                name: "first_approver_employee_id",
                table: "memo_types",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            // default 'Executive' — MemoType เดิมที่ยังไม่ตั้ง config ใช้ pool Executive เหมือนเดิม
            migrationBuilder.AddColumn<string>(
                name: "first_approver_role_code",
                table: "memo_types",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Executive")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "memo_workflow_steps",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    memo_type_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    sort_order = table.Column<int>(type: "int", nullable: false),
                    label = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    step_kind = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    assignee_role_code = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    assignee_employee_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_memo_workflow_steps", x => x.id);
                    table.ForeignKey(
                        name: "fk_memo_workflow_steps_employees_assignee_employee_id",
                        column: x => x.assignee_employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_memo_workflow_steps_memo_types_memo_type_id",
                        column: x => x.memo_type_id,
                        principalTable: "memo_types",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "memo_step_instances",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    memo_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    source_step_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    sort_order = table.Column<int>(type: "int", nullable: false),
                    label = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    step_kind = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    assignee_role_code = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    assignee_employee_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    status = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    acted_at = table.Column<DateTime>(type: "datetime", nullable: true),
                    acted_by_employee_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    action_note = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_memo_step_instances", x => x.id);
                    table.ForeignKey(
                        name: "fk_memo_step_instances_employees_acted_by_employee_id",
                        column: x => x.acted_by_employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_memo_step_instances_employees_assignee_employee_id",
                        column: x => x.assignee_employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_memo_step_instances_memo_workflow_steps_source_step_id",
                        column: x => x.source_step_id,
                        principalTable: "memo_workflow_steps",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_memo_step_instances_memos_memo_id",
                        column: x => x.memo_id,
                        principalTable: "memos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "memo_activities",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    memo_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    memo_step_instance_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    author_employee_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    message = table.Column<string>(type: "text", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    is_system = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_memo_activities", x => x.id);
                    table.ForeignKey(
                        name: "fk_memo_activities_employees_author_employee_id",
                        column: x => x.author_employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_memo_activities_memo_step_instances_memo_step_instance_id",
                        column: x => x.memo_step_instance_id,
                        principalTable: "memo_step_instances",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_memo_activities_memos_memo_id",
                        column: x => x.memo_id,
                        principalTable: "memos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "memo_attachments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    memo_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    memo_step_instance_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    memo_activity_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    uploaded_by_employee_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    url = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    file_name = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    content_type = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    storage_key = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_memo_attachments", x => x.id);
                    table.ForeignKey(
                        name: "fk_memo_attachments_employees_uploaded_by_employee_id",
                        column: x => x.uploaded_by_employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_memo_attachments_memo_activities_memo_activity_id",
                        column: x => x.memo_activity_id,
                        principalTable: "memo_activities",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_memo_attachments_memo_step_instances_memo_step_instance_id",
                        column: x => x.memo_step_instance_id,
                        principalTable: "memo_step_instances",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_memo_attachments_memos_memo_id",
                        column: x => x.memo_id,
                        principalTable: "memos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "ix_memos_current_step_instance_id",
                table: "memos",
                column: "current_step_instance_id");

            migrationBuilder.CreateIndex(
                name: "ix_memos_first_approver_employee_id_snapshot",
                table: "memos",
                column: "first_approver_employee_id_snapshot");

            migrationBuilder.CreateIndex(
                name: "ix_memo_types_first_approver_employee_id",
                table: "memo_types",
                column: "first_approver_employee_id");

            migrationBuilder.CreateIndex(
                name: "ix_memo_activities_author_employee_id",
                table: "memo_activities",
                column: "author_employee_id");

            migrationBuilder.CreateIndex(
                name: "ix_memo_activities_memo_id",
                table: "memo_activities",
                column: "memo_id");

            migrationBuilder.CreateIndex(
                name: "ix_memo_activities_memo_step_instance_id",
                table: "memo_activities",
                column: "memo_step_instance_id");

            migrationBuilder.CreateIndex(
                name: "ix_memo_attachments_memo_activity_id",
                table: "memo_attachments",
                column: "memo_activity_id");

            migrationBuilder.CreateIndex(
                name: "ix_memo_attachments_memo_id",
                table: "memo_attachments",
                column: "memo_id");

            migrationBuilder.CreateIndex(
                name: "ix_memo_attachments_memo_step_instance_id",
                table: "memo_attachments",
                column: "memo_step_instance_id");

            migrationBuilder.CreateIndex(
                name: "ix_memo_attachments_uploaded_by_employee_id",
                table: "memo_attachments",
                column: "uploaded_by_employee_id");

            migrationBuilder.CreateIndex(
                name: "ix_memo_step_instances_acted_by_employee_id",
                table: "memo_step_instances",
                column: "acted_by_employee_id");

            migrationBuilder.CreateIndex(
                name: "ix_memo_step_instances_assignee_employee_id",
                table: "memo_step_instances",
                column: "assignee_employee_id");

            migrationBuilder.CreateIndex(
                name: "ix_memo_step_instances_memo",
                table: "memo_step_instances",
                columns: new[] { "memo_id", "sort_order" });

            migrationBuilder.CreateIndex(
                name: "ix_memo_step_instances_source_step_id",
                table: "memo_step_instances",
                column: "source_step_id");

            migrationBuilder.CreateIndex(
                name: "ix_memo_workflow_steps_assignee_employee_id",
                table: "memo_workflow_steps",
                column: "assignee_employee_id");

            migrationBuilder.CreateIndex(
                name: "ix_memo_workflow_steps_memo_type",
                table: "memo_workflow_steps",
                columns: new[] { "memo_type_id", "is_active" });

            migrationBuilder.AddForeignKey(
                name: "fk_memo_types_employees_first_approver_employee_id",
                table: "memo_types",
                column: "first_approver_employee_id",
                principalTable: "employees",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_memos_employees_first_approver_employee_id_snapshot",
                table: "memos",
                column: "first_approver_employee_id_snapshot",
                principalTable: "employees",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_memos_memo_step_instances_current_step_instance_id",
                table: "memos",
                column: "current_step_instance_id",
                principalTable: "memo_step_instances",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_memo_types_employees_first_approver_employee_id",
                table: "memo_types");

            migrationBuilder.DropForeignKey(
                name: "fk_memos_employees_first_approver_employee_id_snapshot",
                table: "memos");

            migrationBuilder.DropForeignKey(
                name: "fk_memos_memo_step_instances_current_step_instance_id",
                table: "memos");

            migrationBuilder.DropTable(
                name: "memo_attachments");

            migrationBuilder.DropTable(
                name: "memo_activities");

            migrationBuilder.DropTable(
                name: "memo_step_instances");

            migrationBuilder.DropTable(
                name: "memo_workflow_steps");

            migrationBuilder.DropIndex(
                name: "ix_memos_current_step_instance_id",
                table: "memos");

            migrationBuilder.DropIndex(
                name: "ix_memos_first_approver_employee_id_snapshot",
                table: "memos");

            migrationBuilder.DropIndex(
                name: "ix_memo_types_first_approver_employee_id",
                table: "memo_types");

            migrationBuilder.DropColumn(
                name: "current_step_instance_id",
                table: "memos");

            migrationBuilder.DropColumn(
                name: "first_approver_employee_id_snapshot",
                table: "memos");

            migrationBuilder.DropColumn(
                name: "first_approver_role_code_snapshot",
                table: "memos");

            migrationBuilder.DropColumn(
                name: "first_approver_employee_id",
                table: "memo_types");

            migrationBuilder.DropColumn(
                name: "first_approver_role_code",
                table: "memo_types");
        }
    }
}
