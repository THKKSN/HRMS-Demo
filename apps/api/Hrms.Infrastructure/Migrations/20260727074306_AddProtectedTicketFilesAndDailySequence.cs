using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProtectedTicketFilesAndDailySequence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "storage_key",
                table: "ticket_attachments",
                type: "varchar(500)",
                maxLength: 500,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "visibility",
                table: "ticket_attachments",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Public")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "ticket_daily_sequences",
                columns: table => new
                {
                    sequence_date = table.Column<DateOnly>(type: "date", nullable: false),
                    last_number = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ticket_daily_sequences", x => x.sequence_date);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "ticket_pending_uploads",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    uploaded_by_employee_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    storage_key = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    file_name = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    content_type = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    linked_at = table.Column<DateTime>(type: "datetime", nullable: true),
                    ticket_attachment_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ticket_pending_uploads", x => x.id);
                    table.ForeignKey(
                        name: "fk_ticket_pending_uploads_employees_uploaded_by_employee_id",
                        column: x => x.uploaded_by_employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "ix_ticket_pending_uploads_linked_at_created_at",
                table: "ticket_pending_uploads",
                columns: new[] { "linked_at", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_ticket_pending_uploads_storage_key",
                table: "ticket_pending_uploads",
                column: "storage_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_ticket_pending_uploads_uploaded_by_employee_id",
                table: "ticket_pending_uploads",
                column: "uploaded_by_employee_id");

            migrationBuilder.Sql(
                """
                INSERT INTO ticket_daily_sequences (sequence_date, last_number)
                SELECT DATE(created_at), MAX(CAST(SUBSTRING_INDEX(ticket_no, '-', -1) AS UNSIGNED))
                FROM tickets
                WHERE ticket_no REGEXP '^TK-[0-9]{8}-[0-9]+$'
                GROUP BY DATE(created_at)
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ticket_daily_sequences");

            migrationBuilder.DropTable(
                name: "ticket_pending_uploads");

            migrationBuilder.DropColumn(
                name: "storage_key",
                table: "ticket_attachments");

            migrationBuilder.DropColumn(
                name: "visibility",
                table: "ticket_attachments");
        }
    }
}
