# CLAUDE.md — HRMS LINE LIFF Project

## ภาษาที่ใช้สื่อสาร

**ตอบเป็นภาษาไทยเสมอ** สำหรับโปรเจกต์นี้ ยกเว้นชื่อ code, technical term, หรือ error message ที่เป็นภาษาอังกฤษตามต้นฉบับ

## Soft Delete — ห้ามลบข้อมูลออกจาก Database จริง

การ "ลบ" ข้อมูลในโปรเจกต์นี้ให้ใช้ **Soft Delete** เสมอ คือเปลี่ยน `IsActive = false` แทนการ `DELETE` row ออกจาก database

- ไม่มี `DELETE` endpoint หรือ `db.Remove()` สำหรับ entity หลัก (Employee, Company, Department, LeaveType ฯลฯ)
- ใช้ `ToggleStatus` / `Toggle...StatusCommand` pattern แทน
- Query ทั่วไปให้ filter `WHERE is_active = true` เป็น default เสมอ
- ถ้า UI ต้องการ "ลบ" ให้เรียก PATCH `/{id}/status` พร้อม `{ "isActive": false }`

**ข้อยกเว้น:** ตาราง `audit_logs` ถูกลบจริง (hard delete) โดย `AuditLogRetentionJob` ตามนโยบายเก็บรักษาแบบเดือนปฏิทิน — เก็บเดือนปัจจุบัน + เดือนเต็มย้อนหลัง `AuditLogRetention:RetentionMonths` เดือน (ค่าเริ่มต้น 3) ตัดที่วันที่ 1 ของเดือนเสมอ ไม่ใช่ rolling window รายวัน ก่อนลบแต่ละเดือนจะ archive เป็น `audit-logs-yyyy-MM.jsonl.gz` ไว้ที่ `AuditLogRetention:ArchivePath` (default `%ProgramData%\TBG Assistant\AuditLogArchive`) ถ้า archive ไม่สำเร็จจะไม่ลบ

## i18n — หลายภาษา (th / en / id)

แผนและสถานะอยู่ที่ `docs/i18n-multilanguage-plan.md` · ใช้ `next-intl` โหมดไม่มี URL routing · ภาษามาจาก cookie `hrms-locale` (LIFF เดาครั้งแรกจาก `liff.getAppLanguage()`) · **timezone ตรึง `Asia/Bangkok` ทุกภาษา**

- **ข้อความที่ผู้ใช้เห็นทุกตัวเป็น key ใน `packages/i18n/messages/<locale>/*.json`** เรียกผ่าน `useTranslations()` — ห้ามฝังภาษาไทยใน JSX/TSX ใหม่ (`pnpm i18n:scan` เป็นตัวตรวจ) ยกเว้นไฟล์ที่ยังไม่ถึงรอบแปลตามแผน
- **ป้าย enum (สถานะ/ความเร่งด่วน/ประเภท) อยู่ที่ `@hrms/i18n/labels`** ที่เดียว — ห้ามประกาศ `Record<XxxStatus, string>` ซ้ำในหน้า
- **format วันที่/เวลา/ตัวเลข ใช้ `@hrms/i18n/format`** (`formatDate`, `formatDateTime`, `formatTime`, `formatNumber`, `formatMoney`) — ห้ามเรียก `toLocaleDateString('th-TH', …)` / `Intl.*Format('th-TH', …)` ตรง ๆ
- **key** เป็นอังกฤษ รูปแบบ `<namespace>.<หน้าจอ/กลุ่ม>.<ความหมาย>` · ส่วนท้ายที่ผูก enum สะกดตรงกับค่าใน `@hrms/shared-types` (`status.ticket.InProgress`) · error จาก API ใช้ code ตรง ๆ (`errors.TICKET_CONCURRENCY_CONFLICT`) · ตัวแปรใช้ชื่อสื่อความ `{count}` `{name}` ห้าม `{0}` · ห้ามต่อ string ข้ามภาษา (`t('a') + name`) ใช้ตัวแปรใน message เดียว
- ข้อความที่ใช้เกิน 1 แอปอยู่ใน `packages/i18n` ไม่ใช่ในแอปใดแอปหนึ่ง · ตัวเลือกภาษาแสดงชื่อภาษาในภาษาตัวเอง (`LOCALE_NATIVE_NAME`) ห้ามแปล
- คำแปลได้จาก AI แปลร่าง → คนตรวจบน Excel (`pnpm i18n:export` / `pnpm i18n:import`) → commit JSON · ศัพท์บังคับอยู่ใน `packages/i18n/GLOSSARY.md` แนบทุกครั้งที่สั่งแปล · ไฟล์ Excel ไม่ commit (อยู่ใน `docs/i18n-review/`)
- master data ที่ HR กรอกเอง (ประเภทใบแจ้ง, แผนก, ตำแหน่ง) ใช้คอลัมน์ `Name` (ไทย) + `NameEn` + `NameId` แล้วเลือกด้วย `localizedName(item, locale)` — fallback ภาษาที่เลือก → en → th · snapshot/ประวัติที่บันทึกไปแล้วไม่แปลย้อนหลัง
