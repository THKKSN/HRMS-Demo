-- ============================================================================
-- pad-employee-code-to-5.sql
--
-- เติม 0 นำหน้า employees.employee_code ให้เป็น 5 หลัก (canonical form)
-- เช่น '123' -> '00123', '7644' -> '07644', '0123' -> '00123'
--
-- ขอบเขต: เฉพาะรหัสที่เป็น "ตัวเลขล้วน" และเมื่อตัด 0 นำหน้าออกแล้วเหลือ 3-4 หลัก
-- ไม่แตะ: รหัสที่มีตัวอักษร (เช่น 'SYSADMIN'), รหัสตัวเลข 1-2 หลัก, และ 5 หลักขึ้นไป
--
-- ⚠️ รันทีละบล็อกตามลำดับ อย่ารันทั้งไฟล์รวดเดียว
-- ⚠️ ต้อง backup database ก่อน (mysqldump) แยกจาก backup table ในสคริปต์นี้
-- ============================================================================


-- ----------------------------------------------------------------------------
-- STEP 1 — PRE-CHECK: หาค่าที่จะชนกัน (ต้องได้ 0 rows ก่อนไปต่อ)
--
-- ถ้าได้ผลลัพธ์ออกมา แปลว่ามีพนักงาน 2 คนที่รหัสจะกลายเป็นค่าเดียวกัน
-- ห้ามรัน STEP 4 ต้องแก้ข้อมูลให้ถูกก่อน (unique index จะ error 1062 อยู่แล้ว
-- แต่เช็กก่อนดีกว่าเพื่อรู้ล่วงหน้าว่าต้องแก้ใครบ้าง)
-- ----------------------------------------------------------------------------
SELECT
    LPAD(TRIM(LEADING '0' FROM employee_code), 5, '0') AS canonical_code,
    COUNT(*)                                           AS employee_count,
    GROUP_CONCAT(employee_code ORDER BY employee_code) AS current_codes,
    GROUP_CONCAT(id ORDER BY employee_code)            AS employee_ids
FROM employees
WHERE employee_code REGEXP '^[0-9]+$'
  AND CHAR_LENGTH(TRIM(LEADING '0' FROM employee_code)) BETWEEN 3 AND 5
GROUP BY canonical_code
HAVING employee_count > 1;


-- ----------------------------------------------------------------------------
-- STEP 2 — PREVIEW: ดูว่าจะเปลี่ยนรหัสใครเป็นอะไร (ยังไม่แก้อะไร)
--
-- ตรวจสายตาว่ารายการนี้ถูกต้อง และจำนวนแถวตรงกับที่คาดไว้
-- ----------------------------------------------------------------------------
SELECT
    id,
    employee_code                                             AS before_code,
    LPAD(TRIM(LEADING '0' FROM employee_code), 5, '0')        AS after_code,
    CONCAT(first_name, ' ', last_name)                        AS full_name,
    is_active
FROM employees
WHERE employee_code REGEXP '^[0-9]+$'
  AND CHAR_LENGTH(TRIM(LEADING '0' FROM employee_code)) BETWEEN 3 AND 4
  AND employee_code <> LPAD(TRIM(LEADING '0' FROM employee_code), 5, '0')
ORDER BY employee_code;


-- ----------------------------------------------------------------------------
-- STEP 3 — BACKUP: เก็บค่าเดิมไว้ในตารางสำรอง (ใช้ rollback ได้)
--
-- ถ้ารันซ้ำ ต้องเปลี่ยนชื่อตารางหรือ DROP ตัวเก่าก่อน
-- ----------------------------------------------------------------------------
CREATE TABLE employee_code_backup_20260819 (
    id            CHAR(36)    CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL PRIMARY KEY,
    employee_code VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
    backed_up_at  DATETIME    NOT NULL
);

INSERT INTO employee_code_backup_20260819 (id, employee_code, backed_up_at)
SELECT id, employee_code, CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00')
FROM employees;

-- ยืนยันว่า backup ครบทุกแถว: ทั้งสองค่าต้องเท่ากัน
SELECT
    (SELECT COUNT(*) FROM employees)                      AS employees_rows,
    (SELECT COUNT(*) FROM employee_code_backup_20260819)  AS backup_rows;


-- ----------------------------------------------------------------------------
-- STEP 4 — UPDATE: เติม 0 (อยู่ใน transaction ยังไม่ COMMIT)
--
-- รัน 3 คำสั่งนี้ต่อกัน แล้วดูผล verify ก่อนตัดสินใจ COMMIT หรือ ROLLBACK
-- ----------------------------------------------------------------------------
START TRANSACTION;

UPDATE employees
SET employee_code = LPAD(TRIM(LEADING '0' FROM employee_code), 5, '0'),
    updated_at    = CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00')
WHERE employee_code REGEXP '^[0-9]+$'
  AND CHAR_LENGTH(TRIM(LEADING '0' FROM employee_code)) BETWEEN 3 AND 4
  AND employee_code <> LPAD(TRIM(LEADING '0' FROM employee_code), 5, '0');

-- VERIFY ก่อน COMMIT — ต้องผ่านทั้ง 3 ข้อ:
--   1. numeric_not_padded = 0  (ไม่มีรหัสตัวเลข 3-4 หลักที่ยังไม่ pad เหลืออยู่)
--   2. total_employees ตรงกับก่อนแก้
--   3. non_numeric_untouched ตรงกับจำนวนรหัสที่มีตัวอักษร (เช่น SYSADMIN)
SELECT
    (SELECT COUNT(*) FROM employees)                            AS total_employees,
    (SELECT COUNT(*) FROM employees
      WHERE employee_code REGEXP '^[0-9]+$'
        AND CHAR_LENGTH(TRIM(LEADING '0' FROM employee_code)) BETWEEN 3 AND 4
        AND employee_code <> LPAD(TRIM(LEADING '0' FROM employee_code), 5, '0')
    )                                                           AS numeric_not_padded,
    (SELECT COUNT(*) FROM employees
      WHERE employee_code NOT REGEXP '^[0-9]+$'
    )                                                           AS non_numeric_untouched;

-- ผ่านทั้ง 3 ข้อ → รัน:
--   COMMIT;
-- ไม่ผ่าน หรือเจอ error 1062 (Duplicate entry) → รัน:
--   ROLLBACK;


-- ----------------------------------------------------------------------------
-- STEP 5 — ตรวจผลหลัง COMMIT
-- ----------------------------------------------------------------------------
SELECT
    b.employee_code AS before_code,
    e.employee_code AS after_code,
    CONCAT(e.first_name, ' ', e.last_name) AS full_name
FROM employee_code_backup_20260819 b
JOIN employees e ON e.id = b.id
WHERE b.employee_code <> e.employee_code
ORDER BY b.employee_code;


-- ----------------------------------------------------------------------------
-- ROLLBACK (หลัง COMMIT ไปแล้ว) — คืนค่าจากตารางสำรอง
--
-- ใช้เมื่อพบปัญหาหลัง deploy จริง
-- ----------------------------------------------------------------------------
-- START TRANSACTION;
-- UPDATE employees e
-- JOIN employee_code_backup_20260819 b ON b.id = e.id
-- SET e.employee_code = b.employee_code,
--     e.updated_at    = CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00')
-- WHERE e.employee_code <> b.employee_code;
-- SELECT COUNT(*) AS still_different
-- FROM employee_code_backup_20260819 b
-- JOIN employees e ON e.id = b.id
-- WHERE b.employee_code <> e.employee_code;   -- ต้องได้ 0
-- COMMIT;


-- ----------------------------------------------------------------------------
-- CLEANUP — ลบตารางสำรองเมื่อมั่นใจแล้ว (แนะนำให้เก็บไว้อย่างน้อย 1 เดือน)
-- ----------------------------------------------------------------------------
-- DROP TABLE employee_code_backup_20260819;
