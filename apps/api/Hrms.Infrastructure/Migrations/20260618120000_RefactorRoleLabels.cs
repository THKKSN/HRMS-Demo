using Microsoft.EntityFrameworkCore.Migrations;

namespace Hrms.Infrastructure.Migrations;

/// <summary>
/// Redesigns RoleLabel from a RoleType-display-name mapper into a free-form job-position entity.
/// Uses stored procedures for conditional DDL so the migration is safe to re-run after partial failures.
/// </summary>
public partial class RefactorRoleLabels : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // ── helpers ──────────────────────────────────────────────────────────

        // Procedure: conditionally drop a column
        migrationBuilder.Sql("DROP PROCEDURE IF EXISTS _hrms_drop_col");
        migrationBuilder.Sql(@"
CREATE PROCEDURE _hrms_drop_col(IN p_tbl VARCHAR(64), IN p_col VARCHAR(64))
BEGIN
  IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_tbl AND COLUMN_NAME = p_col
  ) THEN
    SET @_s = CONCAT('ALTER TABLE `', p_tbl, '` DROP COLUMN `', p_col, '`');
    PREPARE _stmt FROM @_s;
    EXECUTE _stmt;
    DEALLOCATE PREPARE _stmt;
  END IF;
END");

        // Procedure: conditionally add a column
        migrationBuilder.Sql("DROP PROCEDURE IF EXISTS _hrms_add_col");
        migrationBuilder.Sql(@"
CREATE PROCEDURE _hrms_add_col(IN p_tbl VARCHAR(64), IN p_col VARCHAR(64), IN p_def TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_tbl AND COLUMN_NAME = p_col
  ) THEN
    SET @_s = CONCAT('ALTER TABLE `', p_tbl, '` ADD COLUMN `', p_col, '` ', p_def);
    PREPARE _stmt FROM @_s;
    EXECUTE _stmt;
    DEALLOCATE PREPARE _stmt;
  END IF;
END");

        // Procedure: conditionally drop a FK
        migrationBuilder.Sql("DROP PROCEDURE IF EXISTS _hrms_drop_fk");
        migrationBuilder.Sql(@"
CREATE PROCEDURE _hrms_drop_fk(IN p_tbl VARCHAR(64), IN p_fk VARCHAR(128))
BEGIN
  IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_tbl
      AND CONSTRAINT_NAME = p_fk AND CONSTRAINT_TYPE = 'FOREIGN KEY'
  ) THEN
    SET @_s = CONCAT('ALTER TABLE `', p_tbl, '` DROP FOREIGN KEY `', p_fk, '`');
    PREPARE _stmt FROM @_s;
    EXECUTE _stmt;
    DEALLOCATE PREPARE _stmt;
  END IF;
END");

        // Procedure: conditionally drop an index
        migrationBuilder.Sql("DROP PROCEDURE IF EXISTS _hrms_drop_idx");
        migrationBuilder.Sql(@"
CREATE PROCEDURE _hrms_drop_idx(IN p_tbl VARCHAR(64), IN p_idx VARCHAR(128))
BEGIN
  IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_tbl AND INDEX_NAME = p_idx
  ) THEN
    SET @_s = CONCAT('ALTER TABLE `', p_tbl, '` DROP INDEX `', p_idx, '`');
    PREPARE _stmt FROM @_s;
    EXECUTE _stmt;
    DEALLOCATE PREPARE _stmt;
  END IF;
END");

        // Procedure: conditionally add a FK
        migrationBuilder.Sql("DROP PROCEDURE IF EXISTS _hrms_add_fk");
        migrationBuilder.Sql(@"
CREATE PROCEDURE _hrms_add_fk(IN p_tbl VARCHAR(64), IN p_fk VARCHAR(128), IN p_ddl TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_tbl
      AND CONSTRAINT_NAME = p_fk AND CONSTRAINT_TYPE = 'FOREIGN KEY'
  ) THEN
    SET @_s = CONCAT('ALTER TABLE `', p_tbl, '` ADD CONSTRAINT `', p_fk, '` ', p_ddl);
    PREPARE _stmt FROM @_s;
    EXECUTE _stmt;
    DEALLOCATE PREPARE _stmt;
  END IF;
END");

        // Procedure: conditionally create unique index
        migrationBuilder.Sql("DROP PROCEDURE IF EXISTS _hrms_create_uidx");
        migrationBuilder.Sql(@"
CREATE PROCEDURE _hrms_create_uidx(IN p_tbl VARCHAR(64), IN p_idx VARCHAR(128), IN p_cols TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_tbl AND INDEX_NAME = p_idx
  ) THEN
    SET @_s = CONCAT('CREATE UNIQUE INDEX `', p_idx, '` ON `', p_tbl, '` (', p_cols, ')');
    PREPARE _stmt FROM @_s;
    EXECUTE _stmt;
    DEALLOCATE PREPARE _stmt;
  END IF;
END");

        // ── role_labels table ─────────────────────────────────────────────────

        // Clear old data (safe: no FK points TO role_labels yet)
        migrationBuilder.Sql("DELETE FROM `role_labels`");

        // Drop old columns
        migrationBuilder.Sql("CALL _hrms_drop_fk('role_labels', 'fk_role_labels_companies_company_id')");
        migrationBuilder.Sql("CALL _hrms_drop_idx('role_labels', 'ux_role_labels_company_role')");
        migrationBuilder.Sql("CALL _hrms_drop_col('role_labels', 'role')");
        migrationBuilder.Sql("CALL _hrms_drop_col('role_labels', 'display_name')");

        // Add new columns
        migrationBuilder.Sql("CALL _hrms_add_col('role_labels', 'name', \"varchar(100) NOT NULL DEFAULT ''\")");
        migrationBuilder.Sql("CALL _hrms_add_col('role_labels', 'is_active', 'tinyint(1) NOT NULL DEFAULT 1')");

        // Add unique index (table is empty so no duplicates possible)
        migrationBuilder.Sql("CALL _hrms_create_uidx('role_labels', 'ux_role_labels_company_name', 'company_id, name')");

        // Restore FK to companies
        migrationBuilder.Sql("CALL _hrms_add_fk('role_labels', 'fk_role_labels_companies_company_id', 'FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE')");

        // ── employees table ───────────────────────────────────────────────────

        migrationBuilder.Sql("CALL _hrms_drop_col('employees', 'role_label_role')");
        // Drop first (previous failed attempts may have added with wrong collation)
        migrationBuilder.Sql("CALL _hrms_drop_fk('employees', 'fk_employees_role_labels_role_label_id')");
        migrationBuilder.Sql("CALL _hrms_drop_col('employees', 'role_label_id')");
        migrationBuilder.Sql("CALL _hrms_add_col('employees', 'role_label_id', 'char(36) NULL COLLATE ascii_general_ci')");
        migrationBuilder.Sql("CALL _hrms_add_fk('employees', 'fk_employees_role_labels_role_label_id', 'FOREIGN KEY (`role_label_id`) REFERENCES `role_labels`(`id`) ON DELETE SET NULL')");

        // ── cleanup helpers ───────────────────────────────────────────────────

        migrationBuilder.Sql("DROP PROCEDURE IF EXISTS _hrms_drop_col");
        migrationBuilder.Sql("DROP PROCEDURE IF EXISTS _hrms_add_col");
        migrationBuilder.Sql("DROP PROCEDURE IF EXISTS _hrms_drop_fk");
        migrationBuilder.Sql("DROP PROCEDURE IF EXISTS _hrms_drop_idx");
        migrationBuilder.Sql("DROP PROCEDURE IF EXISTS _hrms_add_fk");
        migrationBuilder.Sql("DROP PROCEDURE IF EXISTS _hrms_create_uidx");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("DROP PROCEDURE IF EXISTS _hrms_drop_col");
        migrationBuilder.Sql(@"
CREATE PROCEDURE _hrms_drop_col(IN p_tbl VARCHAR(64), IN p_col VARCHAR(64))
BEGIN
  IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_tbl AND COLUMN_NAME = p_col) THEN
    SET @_s = CONCAT('ALTER TABLE `', p_tbl, '` DROP COLUMN `', p_col, '`');
    PREPARE _stmt FROM @_s; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;
  END IF;
END");

        migrationBuilder.Sql("DROP PROCEDURE IF EXISTS _hrms_drop_fk");
        migrationBuilder.Sql(@"
CREATE PROCEDURE _hrms_drop_fk(IN p_tbl VARCHAR(64), IN p_fk VARCHAR(128))
BEGIN
  IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_tbl
               AND CONSTRAINT_NAME = p_fk AND CONSTRAINT_TYPE = 'FOREIGN KEY') THEN
    SET @_s = CONCAT('ALTER TABLE `', p_tbl, '` DROP FOREIGN KEY `', p_fk, '`');
    PREPARE _stmt FROM @_s; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;
  END IF;
END");

        migrationBuilder.Sql("DELETE FROM `role_labels`");
        migrationBuilder.Sql("CALL _hrms_drop_fk('employees', 'fk_employees_role_labels_role_label_id')");
        migrationBuilder.Sql("CALL _hrms_drop_col('employees', 'role_label_id')");
        migrationBuilder.Sql("CALL _hrms_drop_fk('role_labels', 'fk_role_labels_companies_company_id')");
        migrationBuilder.Sql("CALL _hrms_drop_col('role_labels', 'name')");
        migrationBuilder.Sql("CALL _hrms_drop_col('role_labels', 'is_active')");

        migrationBuilder.AddColumn<string>(
            name: "role", table: "role_labels", type: "varchar(50)", maxLength: 50, nullable: false, defaultValue: "");
        migrationBuilder.AddColumn<string>(
            name: "display_name", table: "role_labels", type: "varchar(100)", maxLength: 100, nullable: false, defaultValue: "");
        migrationBuilder.CreateIndex(
            name: "ux_role_labels_company_role", table: "role_labels", columns: new[] { "company_id", "role" }, unique: true);
        migrationBuilder.AddForeignKey(
            name: "fk_role_labels_companies_company_id", table: "role_labels",
            column: "company_id", principalTable: "companies", principalColumn: "id",
            onDelete: ReferentialAction.Cascade);
        migrationBuilder.AddColumn<int>(
            name: "role_label_role", table: "employees", type: "int", nullable: true);

        migrationBuilder.Sql("DROP PROCEDURE IF EXISTS _hrms_drop_col");
        migrationBuilder.Sql("DROP PROCEDURE IF EXISTS _hrms_drop_fk");
    }
}
