using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class BindMemoTypeToCompanyDepartment : Migration
    {
        // เขียนแบบ defensive เพราะพบว่า dev database และ production database (ที่รัน SQL script
        // generate ไว้ก่อนหน้าแยกกันคนละครั้ง) มีสถานะ FK/index ของ memo_routings ไม่ตรงกัน —
        // เช็ค INFORMATION_SCHEMA ก่อน DROP/CREATE ทุกจุด ปลอดภัยไม่ว่าจะรันกับ database ไหน
        private const string DropForeignKeyIfExistsSql = @"
SET @fk_exists = (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = '{0}'
      AND CONSTRAINT_NAME = '{1}'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql = IF(@fk_exists > 0, 'ALTER TABLE `{0}` DROP FOREIGN KEY `{1}`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;";

        private const string DropIndexIfExistsSql = @"
SET @idx_exists = (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = '{0}'
      AND INDEX_NAME = '{1}'
);
SET @sql = IF(@idx_exists > 0, 'ALTER TABLE `{0}` DROP INDEX `{1}`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;";

        private const string DropColumnIfExistsSql = @"
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = '{0}'
      AND COLUMN_NAME = '{1}'
);
SET @sql = IF(@col_exists > 0, 'ALTER TABLE `{0}` DROP COLUMN `{1}`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ล้าง FK/index/column เก่าของ memo_routings ทั้งหมดที่เกี่ยวกับ company_id/department_id
            // แบบ idempotent — ไม่ error ไม่ว่า database จะมี object เหล่านี้ครบหรือขาดบางตัว
            //
            // ลำดับสำคัญ: ix_memo_routings_type_company_department_priority เป็น composite index
            // ตัวเดียวที่ FK fk_memo_routings_memo_types_memo_type_id พึ่งพาอยู่ (ไม่มี index เดี่ยว
            // ของ memo_type_id) MySQL จะไม่ยอม DROP INDEX นี้จนกว่าจะมี index อื่นที่ column แรกตรงกัน
            // มาทดแทนก่อน — จึงต้องสร้าง ix_memo_routings_type_priority (ใหม่) ก่อน แล้วค่อย drop ตัวเก่า
            migrationBuilder.Sql(string.Format(DropForeignKeyIfExistsSql, "memo_routings", "fk_memo_routings_companies_company_id"));
            migrationBuilder.Sql(string.Format(DropForeignKeyIfExistsSql, "memo_routings", "fk_memo_routings_departments_department_id"));
            migrationBuilder.Sql(string.Format(DropIndexIfExistsSql, "memo_routings", "ix_memo_routings_resolve_lookup"));
            migrationBuilder.Sql(string.Format(DropIndexIfExistsSql, "memo_routings", "ix_memo_routings_company_id"));
            migrationBuilder.Sql(string.Format(DropIndexIfExistsSql, "memo_routings", "ix_memo_routings_department_id"));

            migrationBuilder.CreateIndex(
                name: "ix_memo_routings_type_priority",
                table: "memo_routings",
                columns: new[] { "memo_type_id", "priority" });

            migrationBuilder.Sql(string.Format(DropIndexIfExistsSql, "memo_routings", "ix_memo_routings_type_company_department_priority"));
            migrationBuilder.Sql(string.Format(DropColumnIfExistsSql, "memo_routings", "company_id"));
            migrationBuilder.Sql(string.Format(DropColumnIfExistsSql, "memo_routings", "department_id"));

            // ตาราง memo_types ว่างเปล่าตอนรัน migration นี้ (ยืนยันแล้วบน production ยังไม่มีใครสร้าง MemoType)
            // จึงไม่ต้อง defaultValue สำหรับ backfill — ไม่มี row เดิมที่ column ใหม่จะกระทบ
            migrationBuilder.AddColumn<Guid>(
                name: "company_id",
                table: "memo_types",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci");

            migrationBuilder.AddColumn<Guid>(
                name: "department_id",
                table: "memo_types",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci");

            migrationBuilder.CreateIndex(
                name: "ix_memo_types_company_department",
                table: "memo_types",
                columns: new[] { "company_id", "department_id" });

            migrationBuilder.CreateIndex(
                name: "ix_memo_types_department_id",
                table: "memo_types",
                column: "department_id");

            migrationBuilder.AddForeignKey(
                name: "fk_memo_types_companies_company_id",
                table: "memo_types",
                column: "company_id",
                principalTable: "companies",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_memo_types_departments_department_id",
                table: "memo_types",
                column: "department_id",
                principalTable: "departments",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_memo_types_companies_company_id",
                table: "memo_types");

            migrationBuilder.DropForeignKey(
                name: "fk_memo_types_departments_department_id",
                table: "memo_types");

            migrationBuilder.DropIndex(
                name: "ix_memo_types_company_department",
                table: "memo_types");

            migrationBuilder.DropIndex(
                name: "ix_memo_types_department_id",
                table: "memo_types");

            migrationBuilder.DropColumn(
                name: "company_id",
                table: "memo_types");

            migrationBuilder.DropColumn(
                name: "department_id",
                table: "memo_types");

            migrationBuilder.AddColumn<Guid>(
                name: "company_id",
                table: "memo_routings",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AddColumn<Guid>(
                name: "department_id",
                table: "memo_routings",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.CreateIndex(
                name: "ix_memo_routings_company_id",
                table: "memo_routings",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "ix_memo_routings_department_id",
                table: "memo_routings",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "ix_memo_routings_resolve_lookup",
                table: "memo_routings",
                columns: new[] { "memo_type_id", "company_id", "department_id" });

            migrationBuilder.CreateIndex(
                name: "ix_memo_routings_type_company_department_priority",
                table: "memo_routings",
                columns: new[] { "memo_type_id", "company_id", "department_id", "priority" });

            // ต้อง drop ix_memo_routings_type_priority หลังจากสร้าง composite index ตัวเก่ากลับมาแล้วเท่านั้น
            // เหตุผลเดียวกับใน Up() — FK ของ memo_type_id ต้องมี index อื่นรองรับก่อนถึง drop ได้
            migrationBuilder.DropIndex(
                name: "ix_memo_routings_type_priority",
                table: "memo_routings");

            migrationBuilder.AddForeignKey(
                name: "fk_memo_routings_companies_company_id",
                table: "memo_routings",
                column: "company_id",
                principalTable: "companies",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_memo_routings_departments_department_id",
                table: "memo_routings",
                column: "department_id",
                principalTable: "departments",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
