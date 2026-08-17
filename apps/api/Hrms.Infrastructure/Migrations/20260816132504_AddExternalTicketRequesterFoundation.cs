using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddExternalTicketRequesterFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "source_company_id",
                table: "tickets",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)")
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.AlterColumn<Guid>(
                name: "requester_employee_id",
                table: "tickets",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)")
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.AddColumn<Guid>(
                name: "closed_by_external_reporter_id",
                table: "tickets",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AddColumn<Guid>(
                name: "external_reporter_id",
                table: "tickets",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AddColumn<string>(
                name: "requester_email_snapshot",
                table: "tickets",
                type: "varchar(320)",
                maxLength: 320,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "requester_line_display_name_snapshot",
                table: "tickets",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "requester_name_snapshot",
                table: "tickets",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "requester_organization_snapshot",
                table: "tickets",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "requester_phone_snapshot",
                table: "tickets",
                type: "varchar(20)",
                maxLength: 20,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<Guid>(
                name: "changed_by_external_reporter_id",
                table: "ticket_status_history",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AlterColumn<Guid>(
                name: "created_by_employee_id",
                table: "ticket_progress_entries",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)")
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.AddColumn<Guid>(
                name: "created_by_external_reporter_id",
                table: "ticket_progress_entries",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AlterColumn<Guid>(
                name: "uploaded_by_employee_id",
                table: "ticket_pending_uploads",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)")
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.AddColumn<Guid>(
                name: "uploaded_by_external_reporter_id",
                table: "ticket_pending_uploads",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AlterColumn<Guid>(
                name: "employee_id",
                table: "ticket_comments",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)")
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.AddColumn<Guid>(
                name: "external_reporter_id",
                table: "ticket_comments",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AlterColumn<Guid>(
                name: "requested_by_employee_id",
                table: "ticket_cancellation_requests",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)")
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.AddColumn<Guid>(
                name: "requested_by_external_reporter_id",
                table: "ticket_cancellation_requests",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AlterColumn<Guid>(
                name: "uploaded_by_employee_id",
                table: "ticket_attachments",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)")
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.AddColumn<Guid>(
                name: "uploaded_by_external_reporter_id",
                table: "ticket_attachments",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AddColumn<string>(
                name: "performed_by_actor_type",
                table: "audit_logs",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<Guid>(
                name: "performed_by_external_reporter_id",
                table: "audit_logs",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.CreateTable(
                name: "external_reporters",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    line_user_id = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    line_display_name = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    picture_url = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    full_name = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    phone = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    email = table.Column<string>(type: "varchar(320)", maxLength: 320, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    organization = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    privacy_notice_version = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    consented_at = table.Column<DateTime>(type: "datetime", nullable: true),
                    last_login_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_external_reporters", x => x.id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            // Preserve the requester identity shown on every existing internal Ticket.
            // Snapshot data is deliberately copied before requester check constraints are added.
            migrationBuilder.Sql(
                "UPDATE `tickets` AS `t` " +
                "INNER JOIN `employees` AS `e` ON `e`.`id` = `t`.`requester_employee_id` " +
                "LEFT JOIN `companies` AS `c` ON `c`.`id` = `e`.`company_id` " +
                "SET `t`.`request_type` = 'Internal', " +
                "`t`.`requester_name_snapshot` = LEFT(TRIM(CONCAT(`e`.`first_name`, ' ', `e`.`last_name`)), 200), " +
                "`t`.`requester_phone_snapshot` = `e`.`phone`, " +
                "`t`.`requester_email_snapshot` = `e`.`email`, " +
                "`t`.`requester_organization_snapshot` = `c`.`name` " +
                "WHERE `t`.`requester_employee_id` IS NOT NULL;");

            migrationBuilder.Sql(
                "UPDATE `audit_logs` " +
                "SET `performed_by_actor_type` = CASE " +
                "WHEN `performed_by_employee_id` IS NULL THEN 'System' ELSE 'Employee' END;");

            migrationBuilder.CreateIndex(
                name: "ix_tickets_closed_by_external_reporter_id",
                table: "tickets",
                column: "closed_by_external_reporter_id");

            migrationBuilder.CreateIndex(
                name: "ix_tickets_external_reporter_id_status",
                table: "tickets",
                columns: new[] { "external_reporter_id", "status" });

            migrationBuilder.AddCheckConstraint(
                name: "ck_tickets_requester_actor",
                table: "tickets",
                sql: "((requester_employee_id IS NOT NULL AND external_reporter_id IS NULL AND request_type = 'Internal') OR (requester_employee_id IS NULL AND external_reporter_id IS NOT NULL AND request_type = 'External'))");

            migrationBuilder.CreateIndex(
                name: "ix_ticket_status_history_changed_by_external_reporter_id",
                table: "ticket_status_history",
                column: "changed_by_external_reporter_id");

            migrationBuilder.CreateIndex(
                name: "ix_ticket_progress_entries_created_by_external_reporter_id",
                table: "ticket_progress_entries",
                column: "created_by_external_reporter_id");

            migrationBuilder.AddCheckConstraint(
                name: "ck_ticket_progress_entries_actor",
                table: "ticket_progress_entries",
                sql: "((created_by_employee_id IS NOT NULL AND created_by_external_reporter_id IS NULL) OR (created_by_employee_id IS NULL AND created_by_external_reporter_id IS NOT NULL))");

            migrationBuilder.CreateIndex(
                name: "ix_ticket_pending_uploads_uploaded_by_external_reporter_id",
                table: "ticket_pending_uploads",
                column: "uploaded_by_external_reporter_id");

            migrationBuilder.AddCheckConstraint(
                name: "ck_ticket_pending_uploads_actor",
                table: "ticket_pending_uploads",
                sql: "((uploaded_by_employee_id IS NOT NULL AND uploaded_by_external_reporter_id IS NULL) OR (uploaded_by_employee_id IS NULL AND uploaded_by_external_reporter_id IS NOT NULL))");

            migrationBuilder.CreateIndex(
                name: "ix_ticket_comments_external_reporter_id",
                table: "ticket_comments",
                column: "external_reporter_id");

            migrationBuilder.AddCheckConstraint(
                name: "ck_ticket_comments_actor",
                table: "ticket_comments",
                sql: "((employee_id IS NOT NULL AND external_reporter_id IS NULL) OR (employee_id IS NULL AND external_reporter_id IS NOT NULL))");

            migrationBuilder.CreateIndex(
                name: "ix_ticket_cancellation_requests_requested_by_external_reporter_",
                table: "ticket_cancellation_requests",
                column: "requested_by_external_reporter_id");

            migrationBuilder.AddCheckConstraint(
                name: "ck_ticket_cancellation_requests_actor",
                table: "ticket_cancellation_requests",
                sql: "((requested_by_employee_id IS NOT NULL AND requested_by_external_reporter_id IS NULL) OR (requested_by_employee_id IS NULL AND requested_by_external_reporter_id IS NOT NULL))");

            migrationBuilder.CreateIndex(
                name: "ix_ticket_attachments_uploaded_by_external_reporter_id",
                table: "ticket_attachments",
                column: "uploaded_by_external_reporter_id");

            migrationBuilder.AddCheckConstraint(
                name: "ck_ticket_attachments_actor",
                table: "ticket_attachments",
                sql: "((uploaded_by_employee_id IS NOT NULL AND uploaded_by_external_reporter_id IS NULL) OR (uploaded_by_employee_id IS NULL AND uploaded_by_external_reporter_id IS NOT NULL))");

            migrationBuilder.CreateIndex(
                name: "ix_audit_logs_performed_by_external_reporter_id",
                table: "audit_logs",
                column: "performed_by_external_reporter_id");

            migrationBuilder.CreateIndex(
                name: "ix_external_reporters_is_active_last_login_at",
                table: "external_reporters",
                columns: new[] { "is_active", "last_login_at" });

            migrationBuilder.CreateIndex(
                name: "ix_external_reporters_line_user_id",
                table: "external_reporters",
                column: "line_user_id",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "fk_audit_logs_external_reporters_performed_by_external_reporter",
                table: "audit_logs",
                column: "performed_by_external_reporter_id",
                principalTable: "external_reporters",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_ticket_attachments_external_reporters_uploaded_by_external_r",
                table: "ticket_attachments",
                column: "uploaded_by_external_reporter_id",
                principalTable: "external_reporters",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_ticket_cancellation_requests_external_reporters_requested_by",
                table: "ticket_cancellation_requests",
                column: "requested_by_external_reporter_id",
                principalTable: "external_reporters",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_ticket_comments_external_reporters_external_reporter_id",
                table: "ticket_comments",
                column: "external_reporter_id",
                principalTable: "external_reporters",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_ticket_pending_uploads_external_reporters_uploaded_by_extern",
                table: "ticket_pending_uploads",
                column: "uploaded_by_external_reporter_id",
                principalTable: "external_reporters",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_ticket_progress_entries_external_reporters_created_by_extern",
                table: "ticket_progress_entries",
                column: "created_by_external_reporter_id",
                principalTable: "external_reporters",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_ticket_status_history_external_reporters_changed_by_external",
                table: "ticket_status_history",
                column: "changed_by_external_reporter_id",
                principalTable: "external_reporters",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_tickets_external_reporters_closed_by_external_reporter_id",
                table: "tickets",
                column: "closed_by_external_reporter_id",
                principalTable: "external_reporters",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_tickets_external_reporters_external_reporter_id",
                table: "tickets",
                column: "external_reporter_id",
                principalTable: "external_reporters",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_audit_logs_external_reporters_performed_by_external_reporter",
                table: "audit_logs");

            migrationBuilder.DropForeignKey(
                name: "fk_ticket_attachments_external_reporters_uploaded_by_external_r",
                table: "ticket_attachments");

            migrationBuilder.DropForeignKey(
                name: "fk_ticket_cancellation_requests_external_reporters_requested_by",
                table: "ticket_cancellation_requests");

            migrationBuilder.DropForeignKey(
                name: "fk_ticket_comments_external_reporters_external_reporter_id",
                table: "ticket_comments");

            migrationBuilder.DropForeignKey(
                name: "fk_ticket_pending_uploads_external_reporters_uploaded_by_extern",
                table: "ticket_pending_uploads");

            migrationBuilder.DropForeignKey(
                name: "fk_ticket_progress_entries_external_reporters_created_by_extern",
                table: "ticket_progress_entries");

            migrationBuilder.DropForeignKey(
                name: "fk_ticket_status_history_external_reporters_changed_by_external",
                table: "ticket_status_history");

            migrationBuilder.DropForeignKey(
                name: "fk_tickets_external_reporters_closed_by_external_reporter_id",
                table: "tickets");

            migrationBuilder.DropForeignKey(
                name: "fk_tickets_external_reporters_external_reporter_id",
                table: "tickets");

            migrationBuilder.DropTable(
                name: "external_reporters");

            migrationBuilder.DropIndex(
                name: "ix_tickets_closed_by_external_reporter_id",
                table: "tickets");

            migrationBuilder.DropIndex(
                name: "ix_tickets_external_reporter_id_status",
                table: "tickets");

            migrationBuilder.DropCheckConstraint(
                name: "ck_tickets_requester_actor",
                table: "tickets");

            migrationBuilder.DropIndex(
                name: "ix_ticket_status_history_changed_by_external_reporter_id",
                table: "ticket_status_history");

            migrationBuilder.DropIndex(
                name: "ix_ticket_progress_entries_created_by_external_reporter_id",
                table: "ticket_progress_entries");

            migrationBuilder.DropCheckConstraint(
                name: "ck_ticket_progress_entries_actor",
                table: "ticket_progress_entries");

            migrationBuilder.DropIndex(
                name: "ix_ticket_pending_uploads_uploaded_by_external_reporter_id",
                table: "ticket_pending_uploads");

            migrationBuilder.DropCheckConstraint(
                name: "ck_ticket_pending_uploads_actor",
                table: "ticket_pending_uploads");

            migrationBuilder.DropIndex(
                name: "ix_ticket_comments_external_reporter_id",
                table: "ticket_comments");

            migrationBuilder.DropCheckConstraint(
                name: "ck_ticket_comments_actor",
                table: "ticket_comments");

            migrationBuilder.DropIndex(
                name: "ix_ticket_cancellation_requests_requested_by_external_reporter_",
                table: "ticket_cancellation_requests");

            migrationBuilder.DropCheckConstraint(
                name: "ck_ticket_cancellation_requests_actor",
                table: "ticket_cancellation_requests");

            migrationBuilder.DropIndex(
                name: "ix_ticket_attachments_uploaded_by_external_reporter_id",
                table: "ticket_attachments");

            migrationBuilder.DropCheckConstraint(
                name: "ck_ticket_attachments_actor",
                table: "ticket_attachments");

            migrationBuilder.DropIndex(
                name: "ix_audit_logs_performed_by_external_reporter_id",
                table: "audit_logs");

            migrationBuilder.DropColumn(
                name: "closed_by_external_reporter_id",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "external_reporter_id",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "requester_email_snapshot",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "requester_line_display_name_snapshot",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "requester_name_snapshot",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "requester_organization_snapshot",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "requester_phone_snapshot",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "changed_by_external_reporter_id",
                table: "ticket_status_history");

            migrationBuilder.DropColumn(
                name: "created_by_external_reporter_id",
                table: "ticket_progress_entries");

            migrationBuilder.DropColumn(
                name: "uploaded_by_external_reporter_id",
                table: "ticket_pending_uploads");

            migrationBuilder.DropColumn(
                name: "external_reporter_id",
                table: "ticket_comments");

            migrationBuilder.DropColumn(
                name: "requested_by_external_reporter_id",
                table: "ticket_cancellation_requests");

            migrationBuilder.DropColumn(
                name: "uploaded_by_external_reporter_id",
                table: "ticket_attachments");

            migrationBuilder.DropColumn(
                name: "performed_by_actor_type",
                table: "audit_logs");

            migrationBuilder.DropColumn(
                name: "performed_by_external_reporter_id",
                table: "audit_logs");

            migrationBuilder.AlterColumn<Guid>(
                name: "source_company_id",
                table: "tickets",
                type: "char(36)",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldNullable: true)
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.AlterColumn<Guid>(
                name: "requester_employee_id",
                table: "tickets",
                type: "char(36)",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldNullable: true)
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.AlterColumn<Guid>(
                name: "created_by_employee_id",
                table: "ticket_progress_entries",
                type: "char(36)",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldNullable: true)
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.AlterColumn<Guid>(
                name: "uploaded_by_employee_id",
                table: "ticket_pending_uploads",
                type: "char(36)",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldNullable: true)
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.AlterColumn<Guid>(
                name: "employee_id",
                table: "ticket_comments",
                type: "char(36)",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldNullable: true)
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.AlterColumn<Guid>(
                name: "requested_by_employee_id",
                table: "ticket_cancellation_requests",
                type: "char(36)",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldNullable: true)
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.AlterColumn<Guid>(
                name: "uploaded_by_employee_id",
                table: "ticket_attachments",
                type: "char(36)",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldNullable: true)
                .OldAnnotation("Relational:Collation", "ascii_general_ci");
        }
    }
}
