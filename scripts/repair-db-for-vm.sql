-- HRMS DB repair script for VM bootstrap.
--
-- Purpose:
--   Keep only:
--     1) existing companies
--     2) one System Admin employee
--     3) system role/permission tables required for login and authorization
--
--   Remove departments, master setup data, and operational/demo records
--   such as leave, attendance, OT, expense, tickets, notifications, and sessions.
--
-- Usage:
--   1. Restore the raw dump into a temporary or target DB.
--   2. Back it up again before running this script.
--   3. Run:
--        mysql -u <user> -p <database> < scripts/repair-db-for-vm.sql
--
-- Safety:
--   This script intentionally does not disable FOREIGN_KEY_CHECKS.
--   If a FK blocks the script, stop and inspect the table instead of forcing it.
--   To dry-run inside a disposable DB, change COMMIT to ROLLBACK near the end.

SET @admin_id = '3fa85f64-5717-4562-b3fc-2c963f66a004';
SET @admin_role_row_id = '3fa85f64-5717-4562-b3fc-2c963f66a005';
SET @admin_role_id = '10000000-0000-0000-0000-000000000006';
SET @fallback_company_id = '3fa85f64-5717-4562-b3fc-2c963f66a001';
SET @admin_email = 'tbg.line.dev@gmail.com';
SET @admin_code = 'SYSADMIN';
SET @admin_password_hash = '$2b$12$6QhLix1/gimcmlhERtO2ielrbhGX9IWuhlZdHDC632GtNT3u3Fuu2';

SET @company_id = (
  SELECT id
  FROM companies
  ORDER BY is_headquarters DESC, is_active DESC, created_at ASC, id ASC
  LIMIT 1
);
SET @company_id = COALESCE(@company_id, @fallback_company_id);

SELECT 'BEFORE' AS phase, COUNT(*) AS company_count FROM companies;
SELECT 'BEFORE' AS phase, COUNT(*) AS employee_count FROM employees;
SELECT 'BEFORE' AS phase, employee_code, email, id FROM employees ORDER BY employee_code;

START TRANSACTION;

INSERT INTO companies (
  id, name, name_en, org_type, parent_id, tax_id, work_days,
  is_headquarters, is_hr_managed_by_parent, is_active,
  created_at, updated_at, created_by, updated_by
)
SELECT
  @company_id, 'TBG', 'TBG', 'Holding', NULL, NULL, 31,
  1, 0, 1,
  UTC_TIMESTAMP(), UTC_TIMESTAMP(), NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE id = @company_id);

UPDATE companies
SET is_active = 1,
    updated_at = UTC_TIMESTAMP()
WHERE id = @company_id;

INSERT INTO roles (
  id, code, name_th, is_system, is_active,
  created_at, updated_at, created_by, updated_by
)
VALUES (
  @admin_role_id, 'Admin', 'ผู้ดูแลระบบ', 1, 1,
  UTC_TIMESTAMP(), UTC_TIMESTAMP(), NULL, NULL
)
ON DUPLICATE KEY UPDATE
  code = VALUES(code),
  name_th = VALUES(name_th),
  is_system = 1,
  is_active = 1,
  updated_at = UTC_TIMESTAMP();

-- Clear operational data first. These tables carry employee FKs directly or
-- through operational records. Keeping them would block employee cleanup.
DELETE FROM expense_billing_batch_items;
DELETE FROM expense_ocr_results;

DELETE FROM ticket_attachments;
DELETE FROM ticket_pending_uploads;
DELETE FROM ticket_cancellation_requests;
DELETE FROM ticket_reviews;
DELETE FROM ticket_status_history;
DELETE FROM ticket_comments;
DELETE FROM ticket_assignments;
DELETE FROM ticket_progress_entries;
DELETE FROM tickets;

DELETE FROM notification_outboxes;
DELETE FROM expense_claims;
DELETE FROM expense_billing_batches;
DELETE FROM leave_requests;
DELETE FROM ot_requests;
DELETE FROM employee_shift_overrides;
DELETE FROM employee_responsibilities;
DELETE FROM attendance_records;
DELETE FROM leave_balances;
DELETE FROM refresh_tokens;
DELETE FROM login_histories;
DELETE FROM audit_logs;

-- Clear setup/master data except companies and system authorization tables.
DELETE FROM ticket_daily_sequences;
DELETE FROM ticket_subject_guidance_configs;
DELETE FROM ticket_workflow_definitions;
DELETE FROM ticket_subjects;
DELETE FROM ticket_topics;
DELETE FROM ticket_categories;

DELETE FROM weekly_holiday_schedules;
DELETE FROM attendance_policies;
DELETE FROM holidays;
DELETE FROM locations;
DELETE FROM role_labels;

UPDATE employees
SET department_id = NULL,
    role_label_id = NULL
WHERE id = @admin_id
   OR employee_code = @admin_code
   OR email = @admin_email;

UPDATE employee_roles
SET department_id = NULL
WHERE employee_id = @admin_id;

UPDATE departments
SET manager_employee_id = NULL,
    parent_dept_id = NULL,
    shift_id = NULL,
    updated_at = UTC_TIMESTAMP();

DELETE FROM departments;
DELETE FROM shifts;
DELETE FROM leave_types;

-- Avoid unique-key collisions before normalizing the fixed admin row.
UPDATE employees
SET employee_code = CONCAT('DROPPED_', LEFT(REPLACE(id, '-', ''), 8)),
    email = NULL,
    line_user_id = NULL,
    national_id = NULL,
    updated_at = UTC_TIMESTAMP()
WHERE id <> @admin_id
  AND (employee_code = @admin_code OR email = @admin_email);

INSERT INTO employees (
  id, company_id, department_id, role_label_id,
  employee_code, first_name, last_name, email, phone, national_id, line_user_id,
  password_hash, avatar_url, hire_date, is_active,
  created_at, updated_at, created_by, updated_by
)
VALUES (
  @admin_id, @company_id, NULL, NULL,
  @admin_code, 'System', 'Admin', @admin_email, NULL, NULL, NULL,
  @admin_password_hash, NULL, '2023-01-01', 1,
  UTC_TIMESTAMP(), UTC_TIMESTAMP(), NULL, NULL
)
ON DUPLICATE KEY UPDATE
  company_id = @company_id,
  department_id = NULL,
  role_label_id = NULL,
  employee_code = @admin_code,
  first_name = 'System',
  last_name = 'Admin',
  email = @admin_email,
  phone = NULL,
  national_id = NULL,
  line_user_id = NULL,
  password_hash = @admin_password_hash,
  avatar_url = NULL,
  hire_date = '2023-01-01',
  is_active = 1,
  updated_at = UTC_TIMESTAMP(),
  updated_by = NULL;

DELETE FROM employee_roles
WHERE employee_id <> @admin_id
   OR role_id <> @admin_role_id;

DELETE FROM employees
WHERE id <> @admin_id;

INSERT INTO employee_roles (
  id, employee_id, role_id, company_id, department_id,
  is_active, valid_from, valid_to, granted_by,
  created_at, updated_at, created_by, updated_by
)
VALUES (
  @admin_role_row_id, @admin_id, @admin_role_id, @company_id, NULL,
  1, NULL, NULL, NULL,
  UTC_TIMESTAMP(), UTC_TIMESTAMP(), NULL, NULL
)
ON DUPLICATE KEY UPDATE
  employee_id = @admin_id,
  role_id = @admin_role_id,
  company_id = @company_id,
  department_id = NULL,
  is_active = 1,
  valid_to = NULL,
  updated_at = UTC_TIMESTAMP(),
  updated_by = NULL;

COMMIT;

SELECT 'AFTER' AS phase, COUNT(*) AS company_count FROM companies;
SELECT 'AFTER' AS phase, COUNT(*) AS employee_count FROM employees;
SELECT 'AFTER' AS phase, employee_code, email, id, company_id FROM employees ORDER BY employee_code;
SELECT 'AFTER' AS phase, COUNT(*) AS department_count FROM departments;
SELECT 'AFTER' AS phase, COUNT(*) AS ticket_count FROM tickets;
SELECT 'AFTER' AS phase, COUNT(*) AS leave_request_count FROM leave_requests;
SELECT 'AFTER' AS phase, COUNT(*) AS attendance_record_count FROM attendance_records;
SELECT 'AFTER' AS phase, COUNT(*) AS expense_claim_count FROM expense_claims;
SELECT 'AFTER' AS phase, COUNT(*) AS employee_role_count FROM employee_roles;
