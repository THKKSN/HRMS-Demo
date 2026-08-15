using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddExpenseBillingBatches : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "batched_at",
                table: "expense_claims",
                type: "datetime",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "billing_batch_id",
                table: "expense_claims",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AddColumn<DateTime>(
                name: "paid_at",
                table: "expense_claims",
                type: "datetime",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "expense_billing_batches",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    batch_no = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    period_from = table.Column<DateOnly>(type: "date", nullable: false),
                    period_to = table.Column<DateOnly>(type: "date", nullable: false),
                    status = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    total_claims = table.Column<int>(type: "int", nullable: false),
                    total_amount = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    note = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_by_employee_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    exported_at = table.Column<DateTime>(type: "datetime", nullable: true),
                    paid_at = table.Column<DateTime>(type: "datetime", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_expense_billing_batches", x => x.id);
                    table.ForeignKey(
                        name: "fk_expense_billing_batches_employees_created_by_employee_id",
                        column: x => x.created_by_employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "expense_billing_batch_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    batch_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    expense_claim_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    amount_snapshot = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_expense_billing_batch_items", x => x.id);
                    table.ForeignKey(
                        name: "fk_expense_billing_batch_items_expense_billing_batches_batch_id",
                        column: x => x.batch_id,
                        principalTable: "expense_billing_batches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_expense_billing_batch_items_expense_claims_expense_claim_id",
                        column: x => x.expense_claim_id,
                        principalTable: "expense_claims",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "ix_expense_claims_billing_batch_id",
                table: "expense_claims",
                column: "billing_batch_id");

            migrationBuilder.CreateIndex(
                name: "ix_expense_billing_batch_items_batch_id",
                table: "expense_billing_batch_items",
                column: "batch_id");

            migrationBuilder.CreateIndex(
                name: "ix_expense_billing_batch_items_expense_claim_id",
                table: "expense_billing_batch_items",
                column: "expense_claim_id");

            migrationBuilder.CreateIndex(
                name: "ix_expense_billing_batches_batch_no",
                table: "expense_billing_batches",
                column: "batch_no",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_expense_billing_batches_created_by_employee_id",
                table: "expense_billing_batches",
                column: "created_by_employee_id");

            migrationBuilder.CreateIndex(
                name: "ix_expense_billing_batches_period_from_period_to",
                table: "expense_billing_batches",
                columns: new[] { "period_from", "period_to" });

            migrationBuilder.CreateIndex(
                name: "ix_expense_billing_batches_status",
                table: "expense_billing_batches",
                column: "status");

            migrationBuilder.AddForeignKey(
                name: "fk_expense_claims_expense_billing_batches_billing_batch_id",
                table: "expense_claims",
                column: "billing_batch_id",
                principalTable: "expense_billing_batches",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_expense_claims_expense_billing_batches_billing_batch_id",
                table: "expense_claims");

            migrationBuilder.DropTable(
                name: "expense_billing_batch_items");

            migrationBuilder.DropTable(
                name: "expense_billing_batches");

            migrationBuilder.DropIndex(
                name: "ix_expense_claims_billing_batch_id",
                table: "expense_claims");

            migrationBuilder.DropColumn(
                name: "batched_at",
                table: "expense_claims");

            migrationBuilder.DropColumn(
                name: "billing_batch_id",
                table: "expense_claims");

            migrationBuilder.DropColumn(
                name: "paid_at",
                table: "expense_claims");
        }
    }
}
