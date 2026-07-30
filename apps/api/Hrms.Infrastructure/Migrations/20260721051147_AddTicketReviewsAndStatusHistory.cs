using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTicketReviewsAndStatusHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ticket_reviews",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    ticket_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    review_round = table.Column<int>(type: "int", nullable: false),
                    decision = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    review_note = table.Column<string>(type: "varchar(2000)", maxLength: 2000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    reviewed_by_employee_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    reviewed_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    resolved_by_employee_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    resolved_at = table.Column<DateTime>(type: "datetime", nullable: true),
                    problem_type_snapshot = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    initial_inspection_snapshot = table.Column<string>(type: "varchar(2000)", maxLength: 2000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    resolution_snapshot = table.Column<string>(type: "varchar(2000)", maxLength: 2000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    resolved_attachment_ids_json = table.Column<string>(type: "varchar(4000)", maxLength: 4000, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ticket_reviews", x => x.id);
                    table.ForeignKey(
                        name: "fk_ticket_reviews_employees_resolved_by_employee_id",
                        column: x => x.resolved_by_employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_ticket_reviews_employees_reviewed_by_employee_id",
                        column: x => x.reviewed_by_employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_ticket_reviews_tickets_ticket_id",
                        column: x => x.ticket_id,
                        principalTable: "tickets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "ticket_status_history",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    ticket_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    from_status = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    to_status = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    changed_by_employee_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    changed_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    reason = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    assignment_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ticket_status_history", x => x.id);
                    table.ForeignKey(
                        name: "fk_ticket_status_history_employees_changed_by_employee_id",
                        column: x => x.changed_by_employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_ticket_status_history_ticket_assignments_assignment_id",
                        column: x => x.assignment_id,
                        principalTable: "ticket_assignments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_ticket_status_history_tickets_ticket_id",
                        column: x => x.ticket_id,
                        principalTable: "tickets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "ix_ticket_reviews_decision_reviewed_at",
                table: "ticket_reviews",
                columns: new[] { "decision", "reviewed_at" });

            migrationBuilder.CreateIndex(
                name: "ix_ticket_reviews_resolved_by_employee_id",
                table: "ticket_reviews",
                column: "resolved_by_employee_id");

            migrationBuilder.CreateIndex(
                name: "ix_ticket_reviews_reviewed_by_employee_id",
                table: "ticket_reviews",
                column: "reviewed_by_employee_id");

            migrationBuilder.CreateIndex(
                name: "ix_ticket_reviews_ticket_id_review_round",
                table: "ticket_reviews",
                columns: new[] { "ticket_id", "review_round" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_ticket_status_history_assignment_id",
                table: "ticket_status_history",
                column: "assignment_id");

            migrationBuilder.CreateIndex(
                name: "ix_ticket_status_history_changed_by_employee_id",
                table: "ticket_status_history",
                column: "changed_by_employee_id");

            migrationBuilder.CreateIndex(
                name: "ix_ticket_status_history_ticket_id_changed_at",
                table: "ticket_status_history",
                columns: new[] { "ticket_id", "changed_at" });

            migrationBuilder.CreateIndex(
                name: "ix_ticket_status_history_to_status_changed_at",
                table: "ticket_status_history",
                columns: new[] { "to_status", "changed_at" });

            migrationBuilder.Sql("""
                INSERT INTO ticket_status_history
                    (id, ticket_id, from_status, to_status, changed_by_employee_id,
                     changed_at, reason, assignment_id, created_at, updated_at, created_by, updated_by)
                SELECT UUID(), t.id, NULL, t.status, NULL,
                       t.updated_at, 'MigrationSnapshot', NULL, t.updated_at, t.updated_at, NULL, NULL
                FROM tickets t
                WHERE NOT EXISTS (
                    SELECT 1 FROM ticket_status_history h WHERE h.ticket_id = t.id
                );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ticket_reviews");

            migrationBuilder.DropTable(
                name: "ticket_status_history");
        }
    }
}
