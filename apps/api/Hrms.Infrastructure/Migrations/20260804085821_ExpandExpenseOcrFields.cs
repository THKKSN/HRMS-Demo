using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ExpandExpenseOcrFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "attempt_count",
                table: "expense_ocr_results",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "duration_ms",
                table: "expense_ocr_results",
                type: "decimal(12,2)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "max_side",
                table: "expense_ocr_results",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "model_version",
                table: "expense_ocr_results",
                type: "varchar(120)",
                maxLength: 120,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "preprocess_variant",
                table: "expense_ocr_results",
                type: "varchar(60)",
                maxLength: 60,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "profile",
                table: "expense_ocr_results",
                type: "varchar(30)",
                maxLength: 30,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "raw_lines_json",
                table: "expense_ocr_results",
                type: "json",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "worker_version",
                table: "expense_ocr_results",
                type: "varchar(60)",
                maxLength: 60,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "receipt_batch",
                table: "expense_claims",
                type: "varchar(80)",
                maxLength: 80,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "receipt_mid",
                table: "expense_claims",
                type: "varchar(80)",
                maxLength: 80,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "receipt_tid",
                table: "expense_claims",
                type: "varchar(80)",
                maxLength: 80,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "receipt_trace",
                table: "expense_claims",
                type: "varchar(80)",
                maxLength: 80,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "ix_expense_claims_receipt_trace",
                table: "expense_claims",
                column: "receipt_trace");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_expense_claims_receipt_trace",
                table: "expense_claims");

            migrationBuilder.DropColumn(
                name: "attempt_count",
                table: "expense_ocr_results");

            migrationBuilder.DropColumn(
                name: "duration_ms",
                table: "expense_ocr_results");

            migrationBuilder.DropColumn(
                name: "max_side",
                table: "expense_ocr_results");

            migrationBuilder.DropColumn(
                name: "model_version",
                table: "expense_ocr_results");

            migrationBuilder.DropColumn(
                name: "preprocess_variant",
                table: "expense_ocr_results");

            migrationBuilder.DropColumn(
                name: "profile",
                table: "expense_ocr_results");

            migrationBuilder.DropColumn(
                name: "raw_lines_json",
                table: "expense_ocr_results");

            migrationBuilder.DropColumn(
                name: "worker_version",
                table: "expense_ocr_results");

            migrationBuilder.DropColumn(
                name: "receipt_batch",
                table: "expense_claims");

            migrationBuilder.DropColumn(
                name: "receipt_mid",
                table: "expense_claims");

            migrationBuilder.DropColumn(
                name: "receipt_tid",
                table: "expense_claims");

            migrationBuilder.DropColumn(
                name: "receipt_trace",
                table: "expense_claims");
        }
    }
}
