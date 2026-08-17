START TRANSACTION;

ALTER TABLE `tickets` MODIFY COLUMN `source_company_id` char(36) COLLATE ascii_general_ci NULL;

ALTER TABLE `tickets` MODIFY COLUMN `requester_employee_id` char(36) COLLATE ascii_general_ci NULL;

ALTER TABLE `tickets` ADD `closed_by_external_reporter_id` char(36) COLLATE ascii_general_ci NULL;

ALTER TABLE `tickets` ADD `external_reporter_id` char(36) COLLATE ascii_general_ci NULL;

ALTER TABLE `tickets` ADD `requester_email_snapshot` varchar(320) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `tickets` ADD `requester_line_display_name_snapshot` varchar(200) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `tickets` ADD `requester_name_snapshot` varchar(200) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `tickets` ADD `requester_organization_snapshot` varchar(200) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `tickets` ADD `requester_phone_snapshot` varchar(20) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `ticket_status_history` ADD `changed_by_external_reporter_id` char(36) COLLATE ascii_general_ci NULL;

ALTER TABLE `ticket_progress_entries` MODIFY COLUMN `created_by_employee_id` char(36) COLLATE ascii_general_ci NULL;

ALTER TABLE `ticket_progress_entries` ADD `created_by_external_reporter_id` char(36) COLLATE ascii_general_ci NULL;

ALTER TABLE `ticket_pending_uploads` MODIFY COLUMN `uploaded_by_employee_id` char(36) COLLATE ascii_general_ci NULL;

ALTER TABLE `ticket_pending_uploads` ADD `uploaded_by_external_reporter_id` char(36) COLLATE ascii_general_ci NULL;

ALTER TABLE `ticket_comments` MODIFY COLUMN `employee_id` char(36) COLLATE ascii_general_ci NULL;

ALTER TABLE `ticket_comments` ADD `external_reporter_id` char(36) COLLATE ascii_general_ci NULL;

ALTER TABLE `ticket_cancellation_requests` MODIFY COLUMN `requested_by_employee_id` char(36) COLLATE ascii_general_ci NULL;

ALTER TABLE `ticket_cancellation_requests` ADD `requested_by_external_reporter_id` char(36) COLLATE ascii_general_ci NULL;

ALTER TABLE `ticket_attachments` MODIFY COLUMN `uploaded_by_employee_id` char(36) COLLATE ascii_general_ci NULL;

ALTER TABLE `ticket_attachments` ADD `uploaded_by_external_reporter_id` char(36) COLLATE ascii_general_ci NULL;

ALTER TABLE `audit_logs` ADD `performed_by_actor_type` varchar(20) CHARACTER SET utf8mb4 NOT NULL DEFAULT '';

ALTER TABLE `audit_logs` ADD `performed_by_external_reporter_id` char(36) COLLATE ascii_general_ci NULL;

CREATE TABLE `external_reporters` (
    `id` char(36) COLLATE ascii_general_ci NOT NULL,
    `line_user_id` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `line_display_name` varchar(200) CHARACTER SET utf8mb4 NOT NULL,
    `picture_url` varchar(1000) CHARACTER SET utf8mb4 NULL,
    `full_name` varchar(200) CHARACTER SET utf8mb4 NULL,
    `phone` varchar(20) CHARACTER SET utf8mb4 NULL,
    `email` varchar(320) CHARACTER SET utf8mb4 NULL,
    `organization` varchar(200) CHARACTER SET utf8mb4 NULL,
    `privacy_notice_version` varchar(100) CHARACTER SET utf8mb4 NULL,
    `consented_at` datetime NULL,
    `last_login_at` datetime NOT NULL,
    `is_active` tinyint(1) NOT NULL DEFAULT TRUE,
    `created_at` datetime NOT NULL,
    `updated_at` datetime NOT NULL,
    `created_by` char(36) COLLATE ascii_general_ci NULL,
    `updated_by` char(36) COLLATE ascii_general_ci NULL,
    CONSTRAINT `pk_external_reporters` PRIMARY KEY (`id`)
) CHARACTER SET=utf8mb4;

UPDATE `tickets` AS `t` INNER JOIN `employees` AS `e` ON `e`.`id` = `t`.`requester_employee_id` LEFT JOIN `companies` AS `c` ON `c`.`id` = `e`.`company_id` SET `t`.`request_type` = 'Internal', `t`.`requester_name_snapshot` = LEFT(TRIM(CONCAT(`e`.`first_name`, ' ', `e`.`last_name`)), 200), `t`.`requester_phone_snapshot` = `e`.`phone`, `t`.`requester_email_snapshot` = `e`.`email`, `t`.`requester_organization_snapshot` = `c`.`name` WHERE `t`.`requester_employee_id` IS NOT NULL;

UPDATE `audit_logs` SET `performed_by_actor_type` = CASE WHEN `performed_by_employee_id` IS NULL THEN 'System' ELSE 'Employee' END;

CREATE INDEX `ix_tickets_closed_by_external_reporter_id` ON `tickets` (`closed_by_external_reporter_id`);

CREATE INDEX `ix_tickets_external_reporter_id_status` ON `tickets` (`external_reporter_id`, `status`);

ALTER TABLE `tickets` ADD CONSTRAINT `ck_tickets_requester_actor` CHECK (((requester_employee_id IS NOT NULL AND external_reporter_id IS NULL AND request_type = 'Internal') OR (requester_employee_id IS NULL AND external_reporter_id IS NOT NULL AND request_type = 'External')));

CREATE INDEX `ix_ticket_status_history_changed_by_external_reporter_id` ON `ticket_status_history` (`changed_by_external_reporter_id`);

CREATE INDEX `ix_ticket_progress_entries_created_by_external_reporter_id` ON `ticket_progress_entries` (`created_by_external_reporter_id`);

ALTER TABLE `ticket_progress_entries` ADD CONSTRAINT `ck_ticket_progress_entries_actor` CHECK (((created_by_employee_id IS NOT NULL AND created_by_external_reporter_id IS NULL) OR (created_by_employee_id IS NULL AND created_by_external_reporter_id IS NOT NULL)));

CREATE INDEX `ix_ticket_pending_uploads_uploaded_by_external_reporter_id` ON `ticket_pending_uploads` (`uploaded_by_external_reporter_id`);

ALTER TABLE `ticket_pending_uploads` ADD CONSTRAINT `ck_ticket_pending_uploads_actor` CHECK (((uploaded_by_employee_id IS NOT NULL AND uploaded_by_external_reporter_id IS NULL) OR (uploaded_by_employee_id IS NULL AND uploaded_by_external_reporter_id IS NOT NULL)));

CREATE INDEX `ix_ticket_comments_external_reporter_id` ON `ticket_comments` (`external_reporter_id`);

ALTER TABLE `ticket_comments` ADD CONSTRAINT `ck_ticket_comments_actor` CHECK (((employee_id IS NOT NULL AND external_reporter_id IS NULL) OR (employee_id IS NULL AND external_reporter_id IS NOT NULL)));

CREATE INDEX `ix_ticket_cancellation_requests_requested_by_external_reporter_` ON `ticket_cancellation_requests` (`requested_by_external_reporter_id`);

ALTER TABLE `ticket_cancellation_requests` ADD CONSTRAINT `ck_ticket_cancellation_requests_actor` CHECK (((requested_by_employee_id IS NOT NULL AND requested_by_external_reporter_id IS NULL) OR (requested_by_employee_id IS NULL AND requested_by_external_reporter_id IS NOT NULL)));

CREATE INDEX `ix_ticket_attachments_uploaded_by_external_reporter_id` ON `ticket_attachments` (`uploaded_by_external_reporter_id`);

ALTER TABLE `ticket_attachments` ADD CONSTRAINT `ck_ticket_attachments_actor` CHECK (((uploaded_by_employee_id IS NOT NULL AND uploaded_by_external_reporter_id IS NULL) OR (uploaded_by_employee_id IS NULL AND uploaded_by_external_reporter_id IS NOT NULL)));

CREATE INDEX `ix_audit_logs_performed_by_external_reporter_id` ON `audit_logs` (`performed_by_external_reporter_id`);

CREATE INDEX `ix_external_reporters_is_active_last_login_at` ON `external_reporters` (`is_active`, `last_login_at`);

CREATE UNIQUE INDEX `ix_external_reporters_line_user_id` ON `external_reporters` (`line_user_id`);

ALTER TABLE `audit_logs` ADD CONSTRAINT `fk_audit_logs_external_reporters_performed_by_external_reporter` FOREIGN KEY (`performed_by_external_reporter_id`) REFERENCES `external_reporters` (`id`) ON DELETE SET NULL;

ALTER TABLE `ticket_attachments` ADD CONSTRAINT `fk_ticket_attachments_external_reporters_uploaded_by_external_r` FOREIGN KEY (`uploaded_by_external_reporter_id`) REFERENCES `external_reporters` (`id`) ON DELETE RESTRICT;

ALTER TABLE `ticket_cancellation_requests` ADD CONSTRAINT `fk_ticket_cancellation_requests_external_reporters_requested_by` FOREIGN KEY (`requested_by_external_reporter_id`) REFERENCES `external_reporters` (`id`) ON DELETE RESTRICT;

ALTER TABLE `ticket_comments` ADD CONSTRAINT `fk_ticket_comments_external_reporters_external_reporter_id` FOREIGN KEY (`external_reporter_id`) REFERENCES `external_reporters` (`id`) ON DELETE RESTRICT;

ALTER TABLE `ticket_pending_uploads` ADD CONSTRAINT `fk_ticket_pending_uploads_external_reporters_uploaded_by_extern` FOREIGN KEY (`uploaded_by_external_reporter_id`) REFERENCES `external_reporters` (`id`) ON DELETE RESTRICT;

ALTER TABLE `ticket_progress_entries` ADD CONSTRAINT `fk_ticket_progress_entries_external_reporters_created_by_extern` FOREIGN KEY (`created_by_external_reporter_id`) REFERENCES `external_reporters` (`id`) ON DELETE RESTRICT;

ALTER TABLE `ticket_status_history` ADD CONSTRAINT `fk_ticket_status_history_external_reporters_changed_by_external` FOREIGN KEY (`changed_by_external_reporter_id`) REFERENCES `external_reporters` (`id`) ON DELETE SET NULL;

ALTER TABLE `tickets` ADD CONSTRAINT `fk_tickets_external_reporters_closed_by_external_reporter_id` FOREIGN KEY (`closed_by_external_reporter_id`) REFERENCES `external_reporters` (`id`) ON DELETE SET NULL;

ALTER TABLE `tickets` ADD CONSTRAINT `fk_tickets_external_reporters_external_reporter_id` FOREIGN KEY (`external_reporter_id`) REFERENCES `external_reporters` (`id`) ON DELETE RESTRICT;

INSERT INTO `__EFMigrationsHistory` (`migration_id`, `product_version`)
VALUES ('20260816132504_AddExternalTicketRequesterFoundation', '8.0.30');

COMMIT;

