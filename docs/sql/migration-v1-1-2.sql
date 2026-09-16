-- ============================================================================
-- migration-v1-1-2.sql — memo ตีกลับผู้ขอ + ชื่อหลายภาษาของ master data + เบอร์โทรสากล (E.164) + ภาษาที่ผู้ใช้เลือก
-- ============================================================================
-- baseline บน production: 20260908020736_AddTicketTeamTemplates (v1.1.1 — deploy ครบ 2026-09-08)
-- production ยังเป็น v1.1.1 — ยังไม่มี migration ใดหลัง baseline ถูกรันจริง
--
-- ครอบคลุม 4 migration ที่ค้างจาก baseline:
--   1. 20260914014713_AddMemoReturnToRequester    — คอลัมน์ returned_from_step_instance_id / returned_to_requester_at บน memos
--   2. 20260914084146_AddMasterDataLocalizedNames — name_en / name_id (nullable) ให้ master data 17 ตาราง
--        ticket_categories, ticket_topics, ticket_subjects, ticket_closeout_reasons,
--        external_ticket_categories, external_ticket_topics, external_ticket_subjects,
--        memo_types, memo_categories, memo_sub_categories,
--        departments, role_labels, shifts, locations,
--        companies (+name_id), leave_types (+name_id), system_roles (+name_en, +name_id)
--      ไม่แตะคอลัมน์ name เดิม — ค่าว่างจะ fallback เป็นภาษาไทยที่หน้าจอ
--   3. 20260915071938_AddExternalReporterPhoneCountry — คอลัมน์ phone_country (char(2)) บน external_reporters
--      + backfill เบอร์เดิมให้เป็น E.164 3 ก้อน (ดู docs/external-reporter-phone-e164-plan.md):
--        · เบอร์ไทย 0xxxxxxxx(x) → +66… พร้อม phone_country = 'TH'
--        · เบอร์ที่เป็น +66 อยู่แล้ว → ล้างเว้นวรรค/ขีด พร้อม phone_country = 'TH'
--        · เบอร์สากลอื่น → ล้างอักขระคั่นอย่างเดียว phone_country คง NULL (เดาประเทศไม่ได้)
--        · เบอร์ที่ไม่เข้าเกณฑ์ใดไม่ถูกแตะ — ตรวจก่อนรันด้วย query ด้านล่าง
--   4. 20260916072549_AddPreferredLanguage — คอลัมน์ preferred_language varchar(5) NOT NULL DEFAULT 'th'
--        บน employees และ external_reporters (ดู docs/notification-i18n-plan.md งาน N2.1)
--      เก็บภาษาที่ผู้ใช้เลือกไว้ใช้ตอน job ส่ง LINE ซึ่งอยู่นอก request จึงอ่าน cookie ไม่ได้
--      แถวเดิมได้ 'th' จาก DEFAULT — ไม่ต้อง backfill · API เขียนทับเองเมื่อผู้ใช้เปิดหน้าจอครั้งถัดไป
--        (middleware อ่าน header X-Locale ที่ทั้ง LIFF และ admin-web แนบมาให้ทุก request)
--
-- generate:
--   cd apps/api
--   dotnet ef migrations script 20260908020736_AddTicketTeamTemplates --idempotent \
--     --project Hrms.Infrastructure --startup-project Hrms.Api --output ../../docs/sql/migration-v1-1-2.sql
--   (header ก้อนนี้เขียนมือ — generate ใหม่แล้วต้องแปะกลับ)
--
-- ตรวจข้อมูลก่อนรัน (อ่านอย่างเดียว) — ดูว่ามีเบอร์ที่ backfill ไม่ครอบกี่ราย:
--   SELECT phone, COUNT(*) FROM external_reporters
--   WHERE phone IS NOT NULL AND phone NOT LIKE '+%'
--     AND REGEXP_REPLACE(phone, '[^0-9]', '') NOT REGEXP '^0[0-9]{8,9}$'
--   GROUP BY phone;
--
-- idempotent: รันซ้ำได้ (เช็ค __EFMigrationsHistory ก่อนทุกก้อน) · ทดสอบกับ MySQL 8.x ได้ (ไม่มี MD5()/VALUES()/AS alias แบบใหม่)
-- permission: ไม่มี permission ใหม่ ไม่ต้อง seed
-- หลังรัน: copy publish ใหม่ทับ (ยกเว้น appsettings/web.config) แล้ว restart API · bump NEXT_PUBLIC_APP_VERSION → 1.1.2
--          API กับ LIFF ต้องขึ้นพร้อมกัน — validator ใหม่รับเฉพาะเบอร์ E.164 client เก่าจะลงทะเบียนไม่ผ่าน
--          ตรวจว่า publish output มี packages/i18n/messages/{th,en}/notifications.json ติดไปด้วย
--            ไม่มี = การ์ด LINE จะโชว์ชื่อคีย์แทนข้อความ (ดู notification-i18n-plan.md งาน N4.5)
--
-- ⚠️ โควตา LINE push เต็ม 300/300 (2026-09-16) — deploy ได้ แต่ push จะยังไม่ออกจนกว่าโควตาจะรีเซ็ต
--    ส่วนที่ตอบด้วย replyToken (เมนู/ลงเวลา/ตรวจสอบสิทธิ์) ไม่กินโควตา ใช้งานได้ตามปกติ
--    ดู docs/line-push-quota-plan.md
-- ============================================================================

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914014713_AddMemoReturnToRequester') THEN

    ALTER TABLE `memos` ADD `returned_from_step_instance_id` char(36) COLLATE ascii_general_ci NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914014713_AddMemoReturnToRequester') THEN

    ALTER TABLE `memos` ADD `returned_to_requester_at` datetime NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914014713_AddMemoReturnToRequester') THEN

    ALTER TABLE `memos` ADD `returned_to_requester_reason` varchar(1000) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914014713_AddMemoReturnToRequester') THEN

    INSERT INTO `__EFMigrationsHistory` (`migration_id`, `product_version`)
    VALUES ('20260914014713_AddMemoReturnToRequester', '8.0.31');

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
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    ALTER TABLE `ticket_topics` ADD `name_en` varchar(100) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    ALTER TABLE `ticket_topics` ADD `name_id` varchar(100) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    ALTER TABLE `ticket_subjects` ADD `name_en` varchar(200) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    ALTER TABLE `ticket_subjects` ADD `name_id` varchar(200) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    ALTER TABLE `ticket_closeout_reasons` ADD `name_en` varchar(100) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    ALTER TABLE `ticket_closeout_reasons` ADD `name_id` varchar(100) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    ALTER TABLE `ticket_categories` ADD `name_en` varchar(100) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    ALTER TABLE `ticket_categories` ADD `name_id` varchar(100) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    ALTER TABLE `shifts` ADD `name_en` varchar(100) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    ALTER TABLE `shifts` ADD `name_id` varchar(100) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    ALTER TABLE `roles` ADD `name_en` varchar(100) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    ALTER TABLE `roles` ADD `name_id` varchar(100) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    ALTER TABLE `role_labels` ADD `name_en` varchar(100) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    ALTER TABLE `role_labels` ADD `name_id` varchar(100) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    ALTER TABLE `memo_types` ADD `name_en` varchar(200) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    ALTER TABLE `memo_types` ADD `name_id` varchar(200) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    ALTER TABLE `memo_sub_categories` ADD `name_en` varchar(200) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    ALTER TABLE `memo_sub_categories` ADD `name_id` varchar(200) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    ALTER TABLE `memo_categories` ADD `name_en` varchar(200) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    ALTER TABLE `memo_categories` ADD `name_id` varchar(200) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    ALTER TABLE `locations` ADD `name_en` varchar(200) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    ALTER TABLE `locations` ADD `name_id` varchar(200) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    ALTER TABLE `leave_types` ADD `name_id` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    ALTER TABLE `external_ticket_topics` ADD `name_en` varchar(100) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    ALTER TABLE `external_ticket_topics` ADD `name_id` varchar(100) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    ALTER TABLE `external_ticket_subjects` ADD `name_en` varchar(200) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    ALTER TABLE `external_ticket_subjects` ADD `name_id` varchar(200) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    ALTER TABLE `external_ticket_categories` ADD `name_en` varchar(100) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    ALTER TABLE `external_ticket_categories` ADD `name_id` varchar(100) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    ALTER TABLE `departments` ADD `name_en` varchar(200) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    ALTER TABLE `departments` ADD `name_id` varchar(200) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    ALTER TABLE `companies` ADD `name_id` varchar(200) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260914084146_AddMasterDataLocalizedNames') THEN

    INSERT INTO `__EFMigrationsHistory` (`migration_id`, `product_version`)
    VALUES ('20260914084146_AddMasterDataLocalizedNames', '8.0.31');

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
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260915071938_AddExternalReporterPhoneCountry') THEN

    ALTER TABLE `external_reporters` ADD `phone_country` char(2) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260915071938_AddExternalReporterPhoneCountry') THEN

    UPDATE external_reporters
    SET phone = CONCAT('+66', SUBSTRING(REGEXP_REPLACE(phone, '[^0-9]', ''), 2)),
        phone_country = 'TH'
    WHERE phone IS NOT NULL
      AND phone NOT LIKE '+%'
      AND REGEXP_REPLACE(phone, '[^0-9]', '') REGEXP '^0[0-9]{8,9}$';

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260915071938_AddExternalReporterPhoneCountry') THEN

    UPDATE external_reporters
    SET phone = CONCAT('+', REGEXP_REPLACE(phone, '[^0-9]', '')),
        phone_country = 'TH'
    WHERE phone LIKE '+66%';

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260915071938_AddExternalReporterPhoneCountry') THEN

    UPDATE external_reporters
    SET phone = CONCAT('+', REGEXP_REPLACE(phone, '[^0-9]', ''))
    WHERE phone LIKE '+%'
      AND phone_country IS NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260915071938_AddExternalReporterPhoneCountry') THEN

    INSERT INTO `__EFMigrationsHistory` (`migration_id`, `product_version`)
    VALUES ('20260915071938_AddExternalReporterPhoneCountry', '8.0.31');

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
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260916072549_AddPreferredLanguage') THEN

    ALTER TABLE `external_reporters` ADD `preferred_language` varchar(5) CHARACTER SET utf8mb4 NOT NULL DEFAULT 'th';

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260916072549_AddPreferredLanguage') THEN

    ALTER TABLE `employees` ADD `preferred_language` varchar(5) CHARACTER SET utf8mb4 NOT NULL DEFAULT 'th';

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260916072549_AddPreferredLanguage') THEN

    INSERT INTO `__EFMigrationsHistory` (`migration_id`, `product_version`)
    VALUES ('20260916072549_AddPreferredLanguage', '8.0.31');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

