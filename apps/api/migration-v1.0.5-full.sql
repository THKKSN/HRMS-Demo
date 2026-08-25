START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260820080035_AddTicketSourceChannel') THEN

    ALTER TABLE `tickets` ADD `source_channel` varchar(20) CHARACTER SET utf8mb4 NOT NULL DEFAULT 'Unknown';

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260820080035_AddTicketSourceChannel') THEN

    ALTER TABLE `tickets` ADD `source_client_app` varchar(50) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260820080035_AddTicketSourceChannel') THEN

    CREATE INDEX `ix_tickets_source_channel_created_at` ON `tickets` (`source_channel`, `created_at`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260820080035_AddTicketSourceChannel') THEN

    INSERT INTO `__EFMigrationsHistory` (`migration_id`, `product_version`)
    VALUES ('20260820080035_AddTicketSourceChannel', '8.0.30');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260820081338_AddEmployeeNickname') THEN

    ALTER TABLE `tickets` ADD `requester_nickname_snapshot` varchar(50) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260820081338_AddEmployeeNickname') THEN

    ALTER TABLE `employees` ADD `nickname` varchar(50) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260820081338_AddEmployeeNickname') THEN

    INSERT INTO `__EFMigrationsHistory` (`migration_id`, `product_version`)
    VALUES ('20260820081338_AddEmployeeNickname', '8.0.30');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260821080101_AddExternalRepairSyncOutboxAndTopicSyncFlag') THEN

    ALTER TABLE `ticket_topics` ADD `sync_to_external_repair_system` tinyint(1) NOT NULL DEFAULT FALSE;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260821080101_AddExternalRepairSyncOutboxAndTopicSyncFlag') THEN

    CREATE TABLE `external_repair_sync_outboxes` (
        `id` char(36) COLLATE ascii_general_ci NOT NULL,
        `ticket_id` char(36) COLLATE ascii_general_ci NOT NULL,
        `payload_json` longtext CHARACTER SET utf8mb4 NOT NULL,
        `deduplication_key` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
        `status` int NOT NULL,
        `attempt_count` int NOT NULL,
        `next_attempt_at` datetime NULL,
        `processing_started_at` datetime NULL,
        `last_error` varchar(2000) CHARACTER SET utf8mb4 NULL,
        `sent_at` datetime NULL,
        `created_at` datetime NOT NULL,
        `updated_at` datetime NOT NULL,
        `created_by` char(36) COLLATE ascii_general_ci NULL,
        `updated_by` char(36) COLLATE ascii_general_ci NULL,
        CONSTRAINT `pk_external_repair_sync_outboxes` PRIMARY KEY (`id`),
        CONSTRAINT `fk_external_repair_sync_outboxes_tickets_ticket_id` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE RESTRICT
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260821080101_AddExternalRepairSyncOutboxAndTopicSyncFlag') THEN

    CREATE UNIQUE INDEX `ix_external_repair_sync_outboxes_deduplication_key` ON `external_repair_sync_outboxes` (`deduplication_key`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260821080101_AddExternalRepairSyncOutboxAndTopicSyncFlag') THEN

    CREATE INDEX `ix_external_repair_sync_outboxes_status_next_attempt_at_created` ON `external_repair_sync_outboxes` (`status`, `next_attempt_at`, `created_at`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260821080101_AddExternalRepairSyncOutboxAndTopicSyncFlag') THEN

    CREATE INDEX `ix_external_repair_sync_outboxes_ticket_id` ON `external_repair_sync_outboxes` (`ticket_id`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260821080101_AddExternalRepairSyncOutboxAndTopicSyncFlag') THEN

    INSERT INTO `__EFMigrationsHistory` (`migration_id`, `product_version`)
    VALUES ('20260821080101_AddExternalRepairSyncOutboxAndTopicSyncFlag', '8.0.30');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260821101508_AddExternalTicketTaxonomy') THEN

    CREATE TABLE `external_ticket_categories` (
        `id` char(36) COLLATE ascii_general_ci NOT NULL,
        `name` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
        `description` varchar(500) CHARACTER SET utf8mb4 NULL,
        `sort_order` int NOT NULL,
        `is_active` tinyint(1) NOT NULL,
        `created_at` datetime NOT NULL,
        `updated_at` datetime NOT NULL,
        `created_by` char(36) COLLATE ascii_general_ci NULL,
        `updated_by` char(36) COLLATE ascii_general_ci NULL,
        CONSTRAINT `pk_external_ticket_categories` PRIMARY KEY (`id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260821101508_AddExternalTicketTaxonomy') THEN

    CREATE TABLE `external_ticket_configurations` (
        `id` char(36) COLLATE ascii_general_ci NOT NULL,
        `target_company_id` char(36) COLLATE ascii_general_ci NOT NULL,
        `target_department_id` char(36) COLLATE ascii_general_ci NULL,
        `is_enabled` tinyint(1) NOT NULL,
        `require_oa_friendship` tinyint(1) NOT NULL,
        `privacy_notice_version` varchar(50) CHARACTER SET utf8mb4 NULL,
        `privacy_notice_url` varchar(500) CHARACTER SET utf8mb4 NULL,
        `created_at` datetime NOT NULL,
        `updated_at` datetime(6) NOT NULL,
        `created_by` char(36) COLLATE ascii_general_ci NULL,
        `updated_by` char(36) COLLATE ascii_general_ci NULL,
        CONSTRAINT `pk_external_ticket_configurations` PRIMARY KEY (`id`),
        CONSTRAINT `fk_external_ticket_configurations_companies_target_company_id` FOREIGN KEY (`target_company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT,
        CONSTRAINT `fk_external_ticket_configurations_departments_target_department` FOREIGN KEY (`target_department_id`) REFERENCES `departments` (`id`) ON DELETE RESTRICT
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260821101508_AddExternalTicketTaxonomy') THEN

    CREATE TABLE `external_ticket_topics` (
        `id` char(36) COLLATE ascii_general_ci NOT NULL,
        `external_ticket_category_id` char(36) COLLATE ascii_general_ci NOT NULL,
        `name` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
        `description` varchar(500) CHARACTER SET utf8mb4 NULL,
        `sort_order` int NOT NULL,
        `is_active` tinyint(1) NOT NULL,
        `created_at` datetime NOT NULL,
        `updated_at` datetime NOT NULL,
        `created_by` char(36) COLLATE ascii_general_ci NULL,
        `updated_by` char(36) COLLATE ascii_general_ci NULL,
        CONSTRAINT `pk_external_ticket_topics` PRIMARY KEY (`id`),
        CONSTRAINT `fk_external_ticket_topics_external_ticket_categories_external_t` FOREIGN KEY (`external_ticket_category_id`) REFERENCES `external_ticket_categories` (`id`) ON DELETE CASCADE
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260821101508_AddExternalTicketTaxonomy') THEN

    CREATE TABLE `external_ticket_subjects` (
        `id` char(36) COLLATE ascii_general_ci NOT NULL,
        `external_ticket_topic_id` char(36) COLLATE ascii_general_ci NOT NULL,
        `internal_ticket_subject_id` char(36) COLLATE ascii_general_ci NOT NULL,
        `name` varchar(200) CHARACTER SET utf8mb4 NOT NULL,
        `description` varchar(500) CHARACTER SET utf8mb4 NULL,
        `sort_order` int NOT NULL,
        `is_active` tinyint(1) NOT NULL,
        `created_at` datetime NOT NULL,
        `updated_at` datetime NOT NULL,
        `created_by` char(36) COLLATE ascii_general_ci NULL,
        `updated_by` char(36) COLLATE ascii_general_ci NULL,
        CONSTRAINT `pk_external_ticket_subjects` PRIMARY KEY (`id`),
        CONSTRAINT `fk_external_ticket_subjects_external_ticket_topics_external_tic` FOREIGN KEY (`external_ticket_topic_id`) REFERENCES `external_ticket_topics` (`id`) ON DELETE CASCADE,
        CONSTRAINT `fk_external_ticket_subjects_ticket_subjects_internal_ticket_sub` FOREIGN KEY (`internal_ticket_subject_id`) REFERENCES `ticket_subjects` (`id`) ON DELETE RESTRICT
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260821101508_AddExternalTicketTaxonomy') THEN

    CREATE INDEX `ix_external_ticket_categories_is_active_sort_order` ON `external_ticket_categories` (`is_active`, `sort_order`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260821101508_AddExternalTicketTaxonomy') THEN

    CREATE UNIQUE INDEX `ix_external_ticket_categories_name` ON `external_ticket_categories` (`name`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260821101508_AddExternalTicketTaxonomy') THEN

    CREATE UNIQUE INDEX `ix_external_ticket_configurations_target_company_id` ON `external_ticket_configurations` (`target_company_id`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260821101508_AddExternalTicketTaxonomy') THEN

    CREATE INDEX `ix_external_ticket_configurations_target_department_id` ON `external_ticket_configurations` (`target_department_id`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260821101508_AddExternalTicketTaxonomy') THEN

    CREATE INDEX `ix_external_ticket_subjects_external_ticket_topic_id_is_active_` ON `external_ticket_subjects` (`external_ticket_topic_id`, `is_active`, `sort_order`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260821101508_AddExternalTicketTaxonomy') THEN

    CREATE UNIQUE INDEX `ix_external_ticket_subjects_external_ticket_topic_id_name` ON `external_ticket_subjects` (`external_ticket_topic_id`, `name`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260821101508_AddExternalTicketTaxonomy') THEN

    CREATE INDEX `ix_external_ticket_subjects_internal_ticket_subject_id` ON `external_ticket_subjects` (`internal_ticket_subject_id`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260821101508_AddExternalTicketTaxonomy') THEN

    CREATE INDEX `ix_external_ticket_topics_external_ticket_category_id_is_active` ON `external_ticket_topics` (`external_ticket_category_id`, `is_active`, `sort_order`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260821101508_AddExternalTicketTaxonomy') THEN

    CREATE UNIQUE INDEX `ix_external_ticket_topics_external_ticket_category_id_name` ON `external_ticket_topics` (`external_ticket_category_id`, `name`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260821101508_AddExternalTicketTaxonomy') THEN

    INSERT INTO `external_ticket_configurations` (`id`, `target_company_id`, `target_department_id`, `is_enabled`, `require_oa_friendship`, `privacy_notice_version`, `privacy_notice_url`, `created_at`, `updated_at`, `created_by`, `updated_by`)
    VALUES ('20000000-0000-0000-0000-000000000001', 'c89cb0d1-7548-4c1b-a36a-929f094f0b30', NULL, FALSE, FALSE, NULL, NULL, TIMESTAMP '2026-08-21 00:00:00', TIMESTAMP '2026-08-21 00:00:00', NULL, NULL);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260821101508_AddExternalTicketTaxonomy') THEN

    INSERT INTO `__EFMigrationsHistory` (`migration_id`, `product_version`)
    VALUES ('20260821101508_AddExternalTicketTaxonomy', '8.0.30');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260824030129_MakeExternalSubjectInternalMappingNullable') THEN

    ALTER TABLE `external_ticket_subjects` MODIFY COLUMN `internal_ticket_subject_id` char(36) COLLATE ascii_general_ci NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260824030129_MakeExternalSubjectInternalMappingNullable') THEN

    INSERT INTO `__EFMigrationsHistory` (`migration_id`, `product_version`)
    VALUES ('20260824030129_MakeExternalSubjectInternalMappingNullable', '8.0.30');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260824035257_SeparateInternalExternalTicketTaxonomy') THEN

    ALTER TABLE `external_ticket_configurations` DROP FOREIGN KEY `fk_external_ticket_configurations_departments_target_department`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260824035257_SeparateInternalExternalTicketTaxonomy') THEN

    ALTER TABLE `external_ticket_subjects` DROP FOREIGN KEY `fk_external_ticket_subjects_ticket_subjects_internal_ticket_sub`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260824035257_SeparateInternalExternalTicketTaxonomy') THEN

    ALTER TABLE `external_ticket_subjects` DROP INDEX `ix_external_ticket_subjects_internal_ticket_subject_id`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260824035257_SeparateInternalExternalTicketTaxonomy') THEN

    ALTER TABLE `external_ticket_configurations` DROP INDEX `ix_external_ticket_configurations_target_department_id`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260824035257_SeparateInternalExternalTicketTaxonomy') THEN

    ALTER TABLE `external_ticket_subjects` DROP COLUMN `internal_ticket_subject_id`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260824035257_SeparateInternalExternalTicketTaxonomy') THEN

    ALTER TABLE `external_ticket_configurations` DROP COLUMN `target_department_id`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260824035257_SeparateInternalExternalTicketTaxonomy') THEN

    ALTER TABLE `tickets` MODIFY COLUMN `topic_id` char(36) COLLATE ascii_general_ci NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260824035257_SeparateInternalExternalTicketTaxonomy') THEN

    ALTER TABLE `tickets` MODIFY COLUMN `category_id` char(36) COLLATE ascii_general_ci NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260824035257_SeparateInternalExternalTicketTaxonomy') THEN

    ALTER TABLE `tickets` ADD `external_ticket_category_id` char(36) COLLATE ascii_general_ci NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260824035257_SeparateInternalExternalTicketTaxonomy') THEN

    ALTER TABLE `tickets` ADD `external_ticket_subject_id` char(36) COLLATE ascii_general_ci NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260824035257_SeparateInternalExternalTicketTaxonomy') THEN

    ALTER TABLE `tickets` ADD `external_ticket_topic_id` char(36) COLLATE ascii_general_ci NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260824035257_SeparateInternalExternalTicketTaxonomy') THEN

    CREATE INDEX `ix_tickets_external_ticket_category_id_external_ticket_topic_id` ON `tickets` (`external_ticket_category_id`, `external_ticket_topic_id`, `status`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260824035257_SeparateInternalExternalTicketTaxonomy') THEN

    CREATE INDEX `ix_tickets_external_ticket_subject_id_status` ON `tickets` (`external_ticket_subject_id`, `status`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260824035257_SeparateInternalExternalTicketTaxonomy') THEN

    CREATE INDEX `ix_tickets_external_ticket_topic_id` ON `tickets` (`external_ticket_topic_id`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260824035257_SeparateInternalExternalTicketTaxonomy') THEN

    ALTER TABLE `tickets` ADD CONSTRAINT `ck_tickets_taxonomy_by_request_type` CHECK (((request_type = 'Internal' AND category_id IS NOT NULL AND topic_id IS NOT NULL AND external_ticket_category_id IS NULL AND external_ticket_topic_id IS NULL AND external_ticket_subject_id IS NULL) OR (request_type = 'External' AND category_id IS NULL AND topic_id IS NULL AND subject_id IS NULL AND external_ticket_category_id IS NOT NULL AND external_ticket_topic_id IS NOT NULL)));

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260824035257_SeparateInternalExternalTicketTaxonomy') THEN

    ALTER TABLE `tickets` ADD CONSTRAINT `fk_tickets_external_ticket_categories_external_ticket_category_` FOREIGN KEY (`external_ticket_category_id`) REFERENCES `external_ticket_categories` (`id`) ON DELETE RESTRICT;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260824035257_SeparateInternalExternalTicketTaxonomy') THEN

    ALTER TABLE `tickets` ADD CONSTRAINT `fk_tickets_external_ticket_subjects_external_ticket_subject_id` FOREIGN KEY (`external_ticket_subject_id`) REFERENCES `external_ticket_subjects` (`id`) ON DELETE RESTRICT;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260824035257_SeparateInternalExternalTicketTaxonomy') THEN

    ALTER TABLE `tickets` ADD CONSTRAINT `fk_tickets_external_ticket_topics_external_ticket_topic_id` FOREIGN KEY (`external_ticket_topic_id`) REFERENCES `external_ticket_topics` (`id`) ON DELETE RESTRICT;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260824035257_SeparateInternalExternalTicketTaxonomy') THEN

    INSERT INTO `__EFMigrationsHistory` (`migration_id`, `product_version`)
    VALUES ('20260824035257_SeparateInternalExternalTicketTaxonomy', '8.0.30');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260824052201_MakeTicketTargetDepartmentNullable') THEN

    ALTER TABLE `tickets` DROP CONSTRAINT `ck_tickets_taxonomy_by_request_type`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260824052201_MakeTicketTargetDepartmentNullable') THEN

    ALTER TABLE `tickets` MODIFY COLUMN `target_department_id` char(36) COLLATE ascii_general_ci NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260824052201_MakeTicketTargetDepartmentNullable') THEN

    ALTER TABLE `tickets` ADD CONSTRAINT `ck_tickets_taxonomy_by_request_type` CHECK (((request_type = 'Internal' AND category_id IS NOT NULL AND topic_id IS NOT NULL AND target_department_id IS NOT NULL AND external_ticket_category_id IS NULL AND external_ticket_topic_id IS NULL AND external_ticket_subject_id IS NULL) OR (request_type = 'External' AND category_id IS NULL AND topic_id IS NULL AND subject_id IS NULL AND target_department_id IS NULL AND external_ticket_category_id IS NOT NULL AND external_ticket_topic_id IS NOT NULL)));

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260824052201_MakeTicketTargetDepartmentNullable') THEN

    INSERT INTO `__EFMigrationsHistory` (`migration_id`, `product_version`)
    VALUES ('20260824052201_MakeTicketTargetDepartmentNullable', '8.0.30');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260824100722_AddExternalSubjectTemplateAndSuggestions') THEN

    ALTER TABLE `external_ticket_subjects` ADD `suggestions_json` varchar(2000) CHARACTER SET utf8mb4 NOT NULL DEFAULT '[]';

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260824100722_AddExternalSubjectTemplateAndSuggestions') THEN

    ALTER TABLE `external_ticket_subjects` ADD `template` varchar(2000) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260824100722_AddExternalSubjectTemplateAndSuggestions') THEN

    INSERT INTO `__EFMigrationsHistory` (`migration_id`, `product_version`)
    VALUES ('20260824100722_AddExternalSubjectTemplateAndSuggestions', '8.0.30');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

