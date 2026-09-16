# แผนงานรองรับหลายภาษา (i18n) — LIFF + Admin Web

> **สถานะเอกสาร:** ✅ อนุมัติแล้ว (D1–D7 ครบ 2026-09-16) · **Phase 0 เสร็จ 2026-09-14** · **Phase M งานครบ + แก้บั๊กชั้น controller แล้ว 2026-09-14** (ยังไม่ commit · `migration-v1-1-2.sql` รันบน dev แล้ว **ยังไม่ deploy prod**) · **Phase 1 งานโค้ดครบ 14/14 2026-09-14** (รอตรวจรับบน LINE จริง) · **Phase 2 เสร็จ 8/10** · **Phase 3 เสร็จ 9/11 (2026-09-16)** — flow ที่เปิดใช้จริง (ticket, memo) ครบทั้ง error และ validator แล้ว · วัดด้วย `pnpm i18n:scan-api` ได้แล้ว · เหลือ 3.5 (ลา/OT/ลงเวลา) กับ 3.8 (เบิกค่าใช้จ่าย) ที่ยังไม่เปิดใช้จริง · **Phase 4 มีแผนละเอียดแล้ว** → [`notification-i18n-plan.md`](notification-i18n-plan.md) (ร่าง 2026-09-16 · รอเคาะ D9/D10/D11)
> **📍 กลับมาทำต่อตรงไหน:** ดู [สถานะ ณ จุดหยุดงาน](#สถานะ-ณ-จุดหยุดงาน-2026-09-14) ใต้แดชบอร์ด
> **วันที่สำรวจโค้ดจริง:** 2026-09-14
> **ภาษาเป้าหมาย:** ไทย (th, default) → อังกฤษ (en) → อินโดนีเซีย (id, เสริม)
> **วิธีใช้เอกสารนี้:** ทุกงานย่อยเป็น checkbox — ทำเสร็จให้ติ๊ก `[x]` แล้วเติมวันที่/commit ในตาราง [ข้อ 11 บันทึกการทำงาน](#11-บันทึกการทำงาน-log) เพื่อย้อนตรวจได้ว่าอะไรทำไปแล้วบ้าง

---

## 0. แดชบอร์ดความคืบหน้า

| Phase | ชื่อ | งานย่อย | เสร็จ | สถานะ | ประเมิน |
|---|---|---:|---:|---|---:|
| 0 | วางรากฐาน (ไม่เปลี่ยนพฤติกรรม) | 9 | 9 | ✅ เสร็จ (build/tsc/test ผ่าน · เหลือเปิดดูด้วยตา) | 1.5–2 วัน |
| M | Master data หลายภาษา (DB + API + ฟอร์ม Admin) | 7 | 7 | 🟡 งานครบ + **แก้บั๊กชั้น controller/DTO ที่ทำให้คำแปลไม่ถูกบันทึก (2026-09-14)** · SQL รันบน dev แล้ว idempotent จริง · M.6 เคาะไม่ทำ กรอกผ่าน UI · เหลือ **restart API แล้วกรอกคำแปลทดสอบด้วยตา** + deploy prod | 2.5–3.5 วัน |
| 1 | LIFF th+en (รวม external) | 14 | 14 | 🟡 งานโค้ดครบ (tsc/test/build ผ่าน · `i18n:scan` เหลือ 3 จุดที่เป็นค่าเทียบข้อมูล) · เหลือตรวจรับบน LINE จริง | 4–5 วัน |
| 2 | Admin Web th+en | 10 | 8 | 🟡 กำลังทำ — 2.1–2.5 + 2.7 + 2.8 + **2.10 (Settings ทั้งหมด)** เสร็จ · tsc/build/test/scan ผ่าน · เหลือ 2.6, 2.9 | 2–4 วัน |
| 3 | ข้อความ error จาก API | 11 | 9 | 🟡 **รากฐาน (3.1–3.4) + Ticket (3.6) + Memo (3.7) + master data (3.9) + validator (3.10) + สคริปต์กวาด (3.11) เสร็จ** — catalog 316 คีย์ th/en ครบ · `i18n:scan-api` วัดได้แล้ว: ไทยเหลือ 93 จุด (3.5 = 52, 3.8 = 41) code ไม่มีคำแปลเหลือ 2 ตัว (ของ 3.5) · เหลือ 3.5 (ลา/OT/ลงเวลา), 3.8 (เบิกค่าใช้จ่าย) ซึ่ง **ยังไม่ได้เปิดใช้จริงในระบบ** | 3–4.5 วัน |
| 4 | LINE notification | 3 | 0 | ⬜ **มีแผนละเอียดแล้ว** → [`notification-i18n-plan.md`](notification-i18n-plan.md) (16 งานย่อย · รอเคาะ D9/D10/D11) | ~~2–3~~ **4–5 วัน** |
| 5 | ภาษาอินโดนีเซีย | 4 | 0 | ⬜ ยังไม่เริ่ม | 1–2 วัน |
| | **รวม** | **58** | **47** | | **16–24 วัน** |

สัญลักษณ์สถานะ: ⬜ ยังไม่เริ่ม · 🟡 กำลังทำ · ✅ เสร็จ+ตรวจรับแล้ว · ⛔ พัก/ยกเลิก

### สถานะ ณ จุดหยุดงาน (2026-09-14)

**ทำอะไรค้างไว้:** งานเขียนโค้ดของ Phase 0 / M / 1 ครบหมดแล้ว **ยังไม่ commit สักบรรทัด** ทุกอย่างอยู่ใน working tree

**ต้องทำก่อนเป็นอันดับแรกเมื่อกลับมา**

1. **หยุด API ที่เปิดดีบักค้างอยู่แล้วรันใหม่** — โปรเซสเดิมล็อก `Hrms.Api.dll` ไว้และยังรันโค้ดเก่า จึงยังเห็นอาการคำแปลไม่ถูกบันทึก (ระหว่างเซสชันนี้ `dotnet build` ที่ Hrms.Api จึง copy ไฟล์ไม่ได้ ต้อง build ไป output ชั่วคราวเพื่อยืนยันว่าคอมไพล์ผ่าน)
2. **กรอกคำแปลทดสอบ** ที่ `settings/ticket-taxonomy/internal` และแท็บภายนอก แล้วเปิดกลับมาดูว่าค่ายังอยู่ · **รายการที่เคยกรอกก่อนหน้านี้ต้องกรอกใหม่** เพราะค่าไม่เคยลง DB จริง
3. **เปิด LIFF บนเครื่องจริงผ่าน LINE** ตรวจรายการตรวจรับ Phase 1 ที่ยังเหลือ (หน้าเลือกภาษาครั้งแรก, ไม่มีจอกระพริบภาษาไทยก่อน hydrate, สลับภาษาแล้วเดินครบทุก flow)

**ค้างรอตัดสินใจ/ลงมือของผู้ใช้**

- ⬜ **commit** — ไฟล์ใหม่ต้อง `git add -f` เพราะ `.gitignore` บัง (`packages/i18n/**`, `apps/liff-web/messages/**`, `docs/**`, `scripts/**`)
- ⬜ **deploy prod v1.1.2** — รัน [`docs/sql/migration-v1-1-2.sql`](docs/sql/migration-v1-1-2.sql) บน production (ยังไม่เคยรัน) + bump `NEXT_PUBLIC_APP_VERSION` เป็น `1.1.2` (ตอนนี้ยัง `1.1.1` ทั้ง 4 ไฟล์)
- ⬜ **ส่งไฟล์ให้ HR ตรวจคำแปลอังกฤษ** — `docs/i18n-review/i18n-review-en-20260914.xlsx` (1,187 คีย์ · ต้องคนตรวจ 165 แถว · ไฟล์ไม่เข้า git)
- 🟡 **Phase 2 (Admin Web)** เริ่มแล้ว 2026-09-15 — **2.1 เปลือก · 2.2 ตัวสลับภาษา · 2.3 Login · 2.4 Dashboard · 2.5 พนักงาน/องค์กร เสร็จ** (โครง `apps/admin-web/messages/{th,en,id}` ใต้ namespace `admin.*` + `i18n/request.ts` merge แบบเดียวกับ LIFF · ตอนนี้มี 7 โมดูล 488 คีย์ th/en ตรงกันครบ) · ถัดไป 2.6 ลงเวลา/รายงาน → 2.10 Settings

**ไฟเขียว 7 ข้อ ([ดูข้อ 10](#10-สิ่งที่ขอไฟเขียวก่อนลงมือ)):**

- [x] D1 `next-intl` โหมดไม่มี URL routing — **เคาะแล้ว**
- [x] D2 เก็บภาษาใน cookie ไม่แตะ URL — **เคาะแล้ว** cookie → `liff.getAppLanguage()` → th, ทุก role สลับเองได้
- [x] D3 `packages/i18n` ร่วม + per-app namespace — **เคาะแล้ว**
- [x] D4 master data ใน DB → **ทำตั้งแต่แรก** (ต่างจากที่เสนอ) — **เคาะแล้ว** แยกเป็น Phase M
- [x] D5 อินโดฯ = **external reporter เท่านั้น**, fallback ของ `id` คือ `en` — **เคาะแล้ว** (เหลือเรื่องคนตรวจคำแปล)
- [x] D6 AI แปลร่าง → คนตรวจ → JSON ใน repo — **เคาะแล้ว**
- [x] D7 API ส่ง error เป็น **อังกฤษล้วน** + `code` · frontend แปล — **เคาะแล้ว 2026-09-16**

---

## 1. เป้าหมายและขอบเขต

| หัวข้อ | รายละเอียด |
|---|---|
| ภาษาที่รองรับ | `th` (ค่าเริ่มต้น, ของเดิม), `en`, `id` (ทำทีหลัง ถ้าคุ้มค่า) |
| ขอบเขต | UI ทั้ง LIFF และ Admin Web + ข้อความ error/validation จาก API + (เฟสท้าย) LINE notification |
| ไม่อยู่ในขอบเขตรอบนี้ | แปลข้อมูลที่ผู้ใช้กรอกเอง (ชื่อเรื่องใบแจ้ง, รายละเอียดลา, คอมเมนต์), เอกสาร PDF/Excel ที่ออกเป็นทางการ (ดูข้อ 9) |
| หลักการ | **ทุก role สลับภาษาเองได้** ทั้งพนักงานภายในและผู้แจ้งภายนอก, จำค่าไว้ข้ามครั้งใช้งาน, **ไม่เปลี่ยนโครงสร้าง URL** |

### 1.1 กลุ่มผู้ใช้ของแต่ละภาษา (เคาะแล้ว 2026-09-14)

| ภาษา | ใครใช้ | เข้าระบบทางไหน |
|---|---|---|
| `th` | พนักงานภายใน + HR + ผู้บริหาร | LIFF `(main)` + Admin Web |
| `en` | พนักงาน/ผู้แจ้งที่อ่านไทยไม่ได้ | ทุกทาง |
| `id` | **ผู้แจ้งภายนอก (external reporter) เป็นหลัก — ไม่ใช่พนักงานภายใน** | LIFF `app/external/**` เท่านั้น |

> ⚠️ ตารางนี้บอกว่า "ภาษาไหนมีคนใช้จริง" **ไม่ได้จำกัดขอบเขตงาน** — ระบบเปลี่ยนภาษาได้ทั้งระบบ ทุกหน้า ทุก role ดูข้อ 1.2

### 1.2 ขอบเขตครอบคลุมทั้งระบบ — ทุกส่วน ทุก role

| ส่วนของระบบ | ผู้ใช้ | ปริมาณ | อยู่ในเฟส | ตัวสลับภาษาวางที่ |
|---|---|---:|---|---|
| LIFF — พนักงานภายใน `app/(main)/**` | พนักงานทุกคน, หัวหน้า | 81 ไฟล์ | 1.C | หน้า [profile](apps/liff-web/app/(main)/profile/page.tsx) แถวเดียวกับขนาดตัวอักษร/โหมดสี |
| LIFF — ผู้แจ้งภายนอก `app/external/**` | ผู้แจ้งภายนอก (รวมอินโดฯ) | 5 ไฟล์ | 1.B | ปุ่มบนหัวจอใน [external/layout](apps/liff-web/app/external/layout.tsx) (ไม่มีหน้าตั้งค่า) |
| Admin Web ทั้งหมด | HR, Admin, หัวหน้า, ผู้บริหาร | 156 ไฟล์ | 2 | ปุ่มใน [header](apps/admin-web/components/layout/header.tsx) ข้าง theme toggle **+** การ์ดในหน้า [settings/general](apps/admin-web/app/(main)/settings/general/page.tsx) |
| ข้อความ error/validation จาก API | ทุก role | ~150–250 ข้อความ | 3 | — |
| LINE notification | ทุก role ที่ผูก LINE | — | 4 | — |

**ไม่มี role ไหนถูกยกเว้น** — พนักงาน, หัวหน้า, HR, Admin, ผู้บริหาร และผู้แจ้งภายนอก สลับภาษาได้หมด และคอมโพเนนต์ `<LanguageSwitcher />` เป็นตัวเดียวกันทุกจุด ต่างแค่ที่วาง

**ผลที่ตามมา — สำคัญต่อการออกแบบ**

- ผู้ใช้อินโดฯ **ไม่มี `Employee` record** (เป็น `ExternalReporter`) → HR ตั้งภาษาให้ล่วงหน้าไม่ได้ → **ต้องพึ่งการเดาอัตโนมัติ + ปุ่มสลับภาษาที่หาเจอง่าย**
- external flow มีแค่ 5 หน้า ([layout](apps/liff-web/app/external/layout.tsx), `page`, `new`, `register`, `[id]`) และ**ไม่มีหน้า profile/ตั้งค่าเลย** → ต้องออกแบบที่วางปุ่มสลับภาษาใหม่ (งาน 1.2)
- หน้าจอแรกสุดที่ external เห็นคือ loading/error ใน `external/layout.tsx` ซึ่งแสดง**ก่อน login เสร็จ** → ภาษาของหน้านี้ต้องตัดสินจาก `liff.getAppLanguage()` ได้ทันที ห้ามรอผลจาก API

**เกณฑ์ตัดสินว่าสำเร็จ (ระดับโครงการ):** ผู้ใช้เปิด LIFF หรือ Admin เลือกภาษาอังกฤษ แล้วเดินครบ flow หลัก (ลงเวลา → ลา → OT → เบิกค่าใช้จ่าย → memo → ticket) โดยไม่เจอข้อความไทยค้างบนหน้าจอ และไม่มี layout พังจากความยาวข้อความที่เปลี่ยนไป — และผู้แจ้งภายนอกที่ตั้ง LINE เป็นภาษาอื่นเปิด `/external` ครั้งแรกต้องไม่เจอหน้าจอภาษาไทย

---

## 2. สภาพปัจจุบัน (ตัวเลขจากการสำรวจจริง)

### 2.1 ปริมาณงาน

| แอป | ไฟล์ `.ts/.tsx` | ไฟล์ที่มีข้อความไทย | บรรทัดที่มีข้อความไทย |
|---|---:|---:|---:|
| `apps/liff-web` | 118 | 86 | 1,467 |
| `apps/admin-web` | 228 | 156 | 3,523 |
| `apps/api` (`.cs`) | — | 376 | 2,370 |

> ตัวเลขฝั่ง API รวม log message, comment ในโค้ด และ test data ด้วย — ส่วนที่ผู้ใช้เห็นจริงน้อยกว่านี้มาก (ประเมิน 150–250 ข้อความ) แต่กระจายอยู่หลายจุด

### 2.2 สิ่งที่มีอยู่แล้ว (ใช้ต่อยอดได้)

- **LIFF** มี [settings.store.ts](apps/liff-web/stores/settings.store.ts) — zustand + `persist` key `hrms-liff-settings` เก็บ `fontSize` / `theme` อยู่แล้ว → เติม `locale` เข้าไปได้เลย
- **LIFF** มี provider ครบชุด ([theme-provider.tsx](apps/liff-web/components/providers/theme-provider.tsx), [font-size-provider.tsx](apps/liff-web/components/providers/font-size-provider.tsx)) และหน้า [profile/page.tsx](apps/liff-web/app/(main)/profile/page.tsx#L125-L161) มี UI เลือก fontSize/theme เป็น `<select>` อยู่แล้ว → เพิ่มช่อง "ภาษา" ในรูปแบบเดียวกัน
- **Admin** มี [settings/general/page.tsx](apps/admin-web/app/(main)/settings/general/page.tsx) พร้อม `OptionCard` + preview สำหรับ theme/font size → เพิ่มการ์ด "ภาษา" ในหน้าเดียวกัน
- **Admin** ใช้ [use-theme.ts](apps/admin-web/hooks/use-theme.ts) + inline script ใน [layout.tsx](apps/admin-web/app/layout.tsx#L30) กัน flash ก่อน hydrate → ใช้ pattern เดียวกันกับ locale ได้
- master data บางตัวมีชื่ออังกฤษอยู่แล้ว: `LeaveType` (`NameTh`/`NameEn`), `Company` (`Name`/`NameEn`), `SystemRole` (`NameTh`) และหน้า Admin [leave-types](apps/admin-web/app/(main)/leave-types/page.tsx) / [companies](apps/admin-web/app/(main)/companies/page.tsx) มีช่องกรอก `nameEn` อยู่แล้ว → ใช้เป็นแม่แบบให้อีก 16 ตารางใน Phase M
- มี pattern สคริปต์ตรวจสอบแบบ `.mjs` ([verify-ticket-progress-feed-theme.mjs](scripts/verify-ticket-progress-feed-theme.mjs)) ใช้เป็นแม่แบบสคริปต์ตรวจ i18n ได้

### 2.3 จุดที่เป็นอุปสรรค (ต้องแก้ในแผน)

| # | ปัญหา | หลักฐาน | แก้ในเฟส |
|---|---|---|---|
| P1 | ไม่มี i18n library ใด ๆ ทั้งสอง app, `<html lang="th">` hard code | [admin layout.tsx:27](apps/admin-web/app/layout.tsx#L27), [liff layout.tsx:31](apps/liff-web/app/layout.tsx#L31) | 0.3 |
| P2 | ข้อความไทยฝังใน JSX โดยตรงแทบทุกหน้า | 242 ไฟล์รวมสองแอป | 1, 2 |
| P3 | label map สถานะซ้ำกันสองแอป (แก้ที่เดียวไม่พอ) | `lib/ticket-status.ts`, `components/shared/leave-status-badge.tsx`, `lib/ticket-progress-feed.ts` มีทั้งใน liff-web และ admin-web | 0.4 |
| P4 | วันที่/เวลา ผูก `'th-TH'` แข็ง | [admin lib/utils.ts:8-22](apps/admin-web/lib/utils.ts#L8-L22), [liff lib/utils.ts](apps/liff-web/lib/utils.ts) + `toLocale*` 105 จุดใน 60 ไฟล์ | 0.5 |
| P5 | API ส่ง error เป็นข้อความไทยสำเร็จรูป (บางเคสใช้ message เป็น code ด้วย) | [GlobalExceptionMiddleware.cs](apps/api/Hrms.Api/Middleware/GlobalExceptionMiddleware.cs) — `"ข้อมูลไม่ถูกต้อง"`, `"เกิดข้อผิดพลาดภายในระบบ"`, `AppUnauthorizedException` ใช้ `ue.Message` เป็นทั้ง `code` และ `message` | 3 |
| P6 | LINE notification เก็บ "ข้อความไทยที่ render เสร็จแล้ว" ลง `NotificationOutbox.PayloadJson` ตั้งแต่ตอนสร้าง | [NotificationDeliveryJob.cs:60-72](apps/api/Hrms.Infrastructure/Jobs/NotificationDeliveryJob.cs#L60-L72) — payload คือ `record TicketNotificationPayload(string Message)` | 4.2 |
| P7 | `Employee` ไม่มีฟิลด์ภาษา → เลือกภาษาให้ notification ไม่ได้ | [Employee.cs](apps/api/Hrms.Domain/Entities/Employee.cs) | 4.1 |
| P8 | master data 16 ตารางมีชื่อคอลัมน์เดียว (ไทย) | `TicketCategory/Topic/Subject`, `ExternalTicketCategory/Topic/Subject`, `MemoType/Category/SubCategory`, `Department`, `RoleLabel`, `Shift`, `Location`, `TicketCloseoutReason` (+ `Company`/`LeaveType`/`SystemRole` ขาด `NameId`) | **M** |
| P9 | ไม่มี eslint/lint gate ในโปรเจกต์ → ไม่มีตัวกันข้อความไทยใหม่หลุดเข้ามา | ไม่มีไฟล์ config eslint ทั้งสอง app | 0.6 |

---

## 3. การตัดสินใจที่ต้องเคาะก่อนเริ่ม (D1–D5)

### D1 — ใช้ library อะไร (เคาะแล้ว 2026-09-14: `next-intl`)

| ตัวเลือก | ข้อดี | ข้อเสีย |
|---|---|---|
| **`next-intl` (แนะนำ)** | ICU message format (พหูพจน์/ตัวแปร), format วันที่-ตัวเลขตาม locale ในตัว, type-safe key, ใช้ได้ทั้ง server/client component, รองรับโหมด "ไม่มี i18n routing" | เพิ่ม dependency, ต้องวาง `NextIntlClientProvider` |
| custom provider (React context + dict) | ไม่มี dependency, เบามาก | ต้องเขียน plural/interpolation/format เอง, ไม่มี type-safety ถ้าไม่ลงแรงเพิ่ม, สุดท้ายมักกลายเป็น library ครึ่งใบ |
| `react-i18next` | ecosystem ใหญ่ | หนักกว่าสำหรับ App Router, ต้อง config SSR เอง |

**ตกลง:** `next-intl` (v4.14+, รองรับ Next 16.2 ที่ใช้อยู่) โหมดไม่มี URL routing ทั้งสองแอป

### D2 — เก็บภาษาที่ผู้ใช้เลือกไว้ที่ไหน

**ข้อเสนอ:** cookie `hrms-locale` (อ่านได้ทั้ง server/client, อายุ 1 ปี) + mirror ค่าไว้ใน store เดิมของแต่ละแอป
**ไม่ใช้ URL prefix (`/en/...`)** เพราะ

- LIFF endpoint URL ถูกล็อกไว้ที่ LINE Developer Console และ deep link จาก LINE ชี้ path ตรง ๆ (`/tickets/{id}`, `/memos/{id}`) — เติม prefix จะพัง
- Admin มี route เกิน 80 หน้า การย้ายเข้า `app/[locale]/` เสี่ยงสูงและกระทบ redirect/permission gate เดิมทั้งหมด

**ลำดับการตัดสินภาษา (เคาะแล้ว 2026-09-14)**

```
1. cookie `hrms-locale`         ← ผู้ใช้เคยกดเลือกเอง — ชนะทุกกรณีเสมอ
2. liff.getAppLanguage()        ← เฉพาะ LIFF: ภาษาที่ผู้ใช้ตั้งไว้ในแอป LINE
3. 'th'                         ← ค่าตั้งต้น
```

- `liff.getAppLanguage()` คืนภาษาของ**แอป LINE** (ต้องใช้ SDK ≥ 2.24.0 — เราใช้ `@line/liff ^2.29.0` แล้ว) แม่นกว่า `navigator.language` เพราะผู้แจ้งต่างชาติมักตั้งภาษา LINE เป็นภาษาตัวเอง
- ค่าที่ได้เป็น RFC 5646 (`id`, `th`, `en-US`) → ต้อง normalize เอาเฉพาะส่วนหน้า และถ้าไม่อยู่ใน 3 ภาษาที่รองรับให้ตกเป็น `en` (ไม่ใช่ `th` — ดู D5)
- **Admin Web ไม่เดาภาษา** ใช้ `th` เป็นค่าตั้งต้นเสมอ เพราะผู้ใช้คือ HR/ผู้บริหารคนไทย การเด้งเป็นอังกฤษเองมีแต่สร้างความสับสน
- **ไม่ผูกภาษากับ DB ในรอบนี้** — ผู้ใช้อินโดฯ เป็น external ไม่มี `Employee` record อยู่แล้ว และความต้องการคือ "สลับภาษาได้" ไม่ใช่ "ผูกภาษาไว้กับบัญชี" (`Employee.PreferredLanguage` ยังทำใน Phase 4 แต่เพื่อเลือกภาษาของ LINE notification เท่านั้น)

**ตัวสลับภาษาต้องเข้าถึงได้ทุก role** ไม่ใช่เฉพาะพนักงาน — จุดวางดูงาน 1.2

### D3 — เก็บไฟล์คำแปลที่ไหน (เคาะแล้ว 2026-09-14)

**ตกลง:** สร้าง workspace package ใหม่ `packages/i18n` (คู่กับ `packages/shared-types` ที่มีอยู่) — ของร่วมอยู่ที่นี่ ของเฉพาะแอปอยู่ใน `apps/*/messages`

```
packages/i18n/
  package.json                 # name: @hrms/i18n
  src/
    locales.ts                 # SUPPORTED_LOCALES, defaultLocale, type Locale
    format.ts                  # formatDate / formatDateTime / formatNumber ตาม locale
    messages/
      th/ common.json  status.json  errors.json  leave.json  ticket.json  memo.json  attendance.json  expense.json  ot.json
      en/ (โครงเดียวกัน)
      id/ (โครงเดียวกัน — Phase 5)
```

- `status.json` + `errors.json` = ของร่วมสองแอป (แก้ปัญหา P3)
- ข้อความเฉพาะแอปอยู่ใน `apps/*/messages/{locale}/*.json` เช่น `admin.json`, `liff.json`

### D4 — master data ที่เป็นชื่อภาษาไทยใน DB (เคาะแล้ว 2026-09-14: **ทำตั้งแต่แรก**)

เดิมเสนอให้เลื่อนไป Phase 4.4 แต่ผู้ใช้เลือก**ทำเลย** → แยกออกมาเป็น **Phase M** ทำหลัง Phase 0 และต้องจบก่อนปิด Phase 1 (เพราะหน้าแจ้งเรื่อง/ยื่นลา/memo ใน LIFF ต้องแสดงชื่อประเภทเป็นภาษาที่เลือก)

**หลักออกแบบ 4 ข้อ**

1. **เพิ่มอย่างเดียว ไม่เปลี่ยนของเดิม** — เพิ่มคอลัมน์ `name_en`, `name_id` (nullable) ทั้ง 16 ตาราง **ไม่ rename `Name` เดิม** เพราะ `Name` ถูกอ้างในแทบทุก query/DTO/snapshot ทั่วระบบ การ rename จะกลายเป็นงาน refactor ใหญ่ที่ไม่ได้อะไรเพิ่ม
2. **API ส่งทั้ง 3 ค่า** (`name`, `nameEn`, `nameId`) แล้วให้ frontend เลือกเอง — ไม่ให้ API resolve ตาม `Accept-Language` เพราะ (ก) `name` เดิมไม่เปลี่ยนความหมาย = ของเก่าไม่พัง (ข) cache ของ react-query ไม่ต้องแยกตามภาษา (ค) หน้า Admin ต้องเห็นทุกภาษาพร้อมกันเพื่อกรอก
3. **fallback ฝั่งแสดงผล** ผ่าน helper เดียว `localizedName(item, locale)` → ภาษาที่เลือก → `en` → `th` (`name`) — ช่องว่างไม่พัง HR ยังไม่กรอกก็เห็นไทย
4. **ประวัติ/snapshot ไม่แปลย้อนหลัง** — เช่น `closeout_reason_name_snapshot` บน tickets คงภาษาไทยตามที่บันทึกตอนนั้น

### D5 — ภาษาอินโดนีเซีย (เคาะแล้ว 2026-09-14)

วาง `id` ไว้ในโครงสร้างตั้งแต่ Phase 0 (type, cookie, ตัวเลือกใน UI ซ่อนไว้ก่อน) แต่ **ลงมือแปลจริงหลัง `en` ผ่าน UAT** ถ้าถึงตอนนั้นยังไม่มีคนรีวิวคำแปลอินโดฯ ก็ปล่อยแค่ 2 ภาษา

**fallback ของ `id` คือ `en` ไม่ใช่ `th`** — ช่วงที่ยังแปลอินโดฯ ไม่เสร็จ ผู้แจ้งที่ตั้ง LINE เป็นอินโดฯ ต้องเห็น**ภาษาอังกฤษ** (อ่านพอรู้เรื่อง) ไม่ใช่ภาษาไทย (อ่านไม่ออกเลย) ตั้งค่าใน next-intl ด้วยการ merge messages:

```ts
// packages/i18n — โหลด en เป็นฐานแล้วทับด้วยภาษาที่เลือก
const messages = locale === 'th'
  ? await loadMessages('th')
  : { ...(await loadMessages('en')), ...(await loadMessages(locale)) }
```

ผลพลอยได้: พอ Phase 5 แปลเสร็จ แค่เติมไฟล์ `messages/id/*.json` ข้อความจะเปลี่ยนเป็นอินโดฯ เองทีละส่วน ไม่ต้องรอแปลครบ 100% ถึงจะเปิดใช้ได้ และคีย์ไหนที่แปลตกหล่นก็ไม่พังเป็นช่องว่าง แต่ตกไปเป็นอังกฤษแทน

### D7 — ภาษาของ `message` ที่ API ส่งกลับ (เคาะแล้ว 2026-09-16: **อังกฤษล้วน**)

**กติกา:** API ส่ง `error` (code) + `message` **ภาษาอังกฤษเท่านั้น** ไม่ส่งไทย ไม่ส่งสองภาษาคู่กัน ไม่ resolve ตาม `Accept-Language`

**นิยามที่ทำให้กติกานี้ชัด**

> `message` จาก API = ข้อความสำหรับ **developer** (log / traceId / debug / API consumer)
> **ไม่ใช่** ข้อความสำหรับผู้ใช้ — ผู้ใช้เห็นคำแปลจาก `code` เสมอ
> ถ้าผู้ใช้เห็น `message` จาก server บนหน้าจอ = **bug** ที่แปลว่าเส้นทางนั้นยังไม่มี `code` ไม่ใช่ fallback ที่ยอมรับได้

**ทำไมไม่ส่ง th+en คู่กัน**

1. **ไม่ scale** — Phase 5 มี `id` เข้ามา จะกลายเป็นส่งสามภาษาทุก response แล้วทิ้งสองภาษาทุกครั้ง
2. **ซ้ำซ้อนกับ catalog** — `errors.json` ทำหน้าที่นี้อยู่แล้ว ถ้า server ถือคำอังกฤษด้วยก็มีคำอังกฤษสองที่ที่ต้องเดินคู่กันแล้วจะเพี้ยนกันแน่นอน
3. **ขัดกติกาใน CLAUDE.md** — "ข้อความที่ผู้ใช้เห็นทุกตัวเป็น key ใน `messages/`" ถ้า server ถือข้อความ user-facing ก็คือข้อความที่อยู่นอก catalog
4. **ขัด D4 ข้อ 2** ที่เคาะไปแล้วว่า API ไม่ resolve ภาษาให้ frontend

**ความสอดคล้องกับเฟสอื่น** — ทั้งสามเฟสเดินหลักเดียวกันคือ *server ส่งข้อมูล frontend ประกอบคำ*

| เฟส | server ส่ง | frontend ทำ |
|---|---|---|
| M (master data) | `name`, `nameEn`, `nameId` | `localizedName(item, locale)` |
| 3 (error) | `error` (code) + `message` อังกฤษ | `apiErrorText(err, tErrors, fallback)` |
| 4 (notification) | `{ templateKey, params }` | — (ไม่มี frontend · server render ตามภาษาผู้รับ = **ข้อยกเว้นเดียว**) |

**ตัวเลขจากการสำรวจจริง (2026-09-16)**

| แหล่ง | จำนวน | มีข้อความไทย |
|---|---:|---:|
| `throw` ใน `Hrms.Application` / `Hrms.Infrastructure` | 648 | **465** |
| `return Conflict()/NotFound()/BadRequest()/...` ใน `Hrms.Api/Controllers` | 256 | 9 (ที่เหลือส่ง `ex.Message` ต่อ) |
| hardcode ใน `GlobalExceptionMiddleware` | 6 เคส | 6 |
| `packages/i18n/messages/*/errors.json` ที่มีแล้ว | 6 code | — |

แยกตามชนิด exception (จำนวน / ที่มีข้อความไทย):

| ชนิด | จำนวน | ไทย | หมายเหตุ |
|---|---:|---:|---|
| `KeyNotFoundException` | 185 | 181 | **ก้อนใหญ่สุด** — middleware map เป็น 404 `NOT_FOUND` ทุกตัว (code เดียวกันหมด แยกเคสไม่ได้) |
| `ConflictException` | 176 | 149 | มี `Code` อยู่แล้ว เหลือแค่เปลี่ยน message |
| `AppUnauthorizedException` | 148 | 19 | ส่วนใหญ่ส่ง code มาเป็น message อยู่แล้ว (`UNAUTHENTICATED`) — ต้องแยก `Code` ออกจาก `Message` |
| `AppForbiddenException` | 78 | 75 | ไม่มี `Code` เลย ใช้ `FORBIDDEN` ก้อนเดียว |
| `ValidationException` | 32 | 31 | FluentValidation → งาน 3.10 |
| `InvalidOperationException` | 27 | 8 | ตกไป 500 `INTERNAL_ERROR` — ผู้ใช้ไม่ควรเห็นอยู่แล้ว |

**ลำดับที่ปลอดภัย (สำคัญ):** ห้ามเปลี่ยนข้อความไทย 465 จุดเป็นอังกฤษก่อนที่ `code` จะครอบคลุมเส้นทางนั้น เพราะวันนี้ผู้ใช้ไทย **เห็นข้อความเหล่านั้นจริง** ผ่าน `apiMessage()` → ต้องทำ **code + คำแปล th/en + message อังกฤษ ในคอมมิตเดียวกันต่อ flow** ไม่แยกกันคนละรอบ

---

## 4. แผนแบ่งเฟส (checklist)

### ✅ Phase 0 — วางรากฐาน (ไม่เปลี่ยนพฤติกรรม) · 9/9

> เป้าหมาย: จบเฟสนี้แล้ว ระบบยังเป็นภาษาไทย 100% เหมือนเดิมทุกหน้าจอ แต่ "พร้อมแปล"

- [x] **0.1** สร้าง `packages/i18n` + ลง `next-intl` ทั้งสองแอป — `next-intl 4.14.4`, `@hrms/i18n workspace:*`, `exceljs 4.4.0` (root dev) (2026-09-14)
  → `packages/i18n/{package.json,tsconfig.json,src/*,messages/*}`, `apps/*/package.json`, `pnpm-lock.yaml`
- [x] **0.2** locale runtime: cookie `hrms-locale`, `resolveLocale()` (cookie → appLanguage → th), `loadMessages()` fallback id→en→th, `LocaleProvider`
  → `packages/i18n/src/{locales,messages,format}.ts`, `apps/*/i18n/request.ts`, `apps/*/components/providers/locale-provider.tsx`
- [x] **0.3** `NextIntlClientProvider` + `<html lang={locale}>` ใน root layout ทั้งสองแอป + `createNextIntlPlugin` และ `transpilePackages: ['@hrms/i18n']` ใน `next.config.ts`
  → **ไม่ต้องมี inline script กัน flash** เพราะภาษามาจาก cookie ฝั่ง server ตั้งแต่ HTML แรก (ต่างจาก theme ที่อ่าน localStorage) · ผลข้างเคียงที่รับไว้: ทุก route เป็น dynamic render เพราะอ่าน `cookies()` ใน layout (แอปเป็น client-fetch ทุกหน้าอยู่แล้ว)
- [x] **0.4** รวม label map ที่ค่าไทย**ตรงกันทุกที่** ไว้ `@hrms/i18n/labels` (8 map: TicketStatus, TicketPriority, MemoStatus, ExpenseClaimType, ExpenseBillingBatchStatus, ExpenseDocument, OrgType, AttendanceStatus) แล้วเปลี่ยน 27 ไฟล์ให้ import/re-export แทนประกาศซ้ำ
  → ตัวที่ค่าไทย**ไม่ตรงกัน**ระหว่างหน้ายังคงไว้ที่เดิม รอเคาะคำใน Phase 1 (ดูกล่อง "คำที่ต้องเคาะ" ใต้ Phase 1) · label ภาษาไทยเป็น TS const (source) แล้ว `messages/th` derive จากมัน เพราะ test `.mjs` โหลด `.ts` ตรง ๆ ด้วย Node ซึ่ง import JSON ไม่ได้
- [x] **0.5** formatter กลาง `@hrms/i18n/format` (`formatDate/DateShort/DateTime/Time/Number/Money`, default `th-TH`) + codemod แทน `toLocale*('th-TH')`/`Intl.*Format('th-TH')` **93 จุด / 57 ไฟล์** — ไม่เหลือ `'th-TH'` ในแอปแล้ว
  → ที่จงใจไม่แตะ: `toLocaleDateString('en-US', …)` 4 จุด (liff `leaves/page`, `ot/page`, admin `my/leaves/page` — ใช้ตัวเลข/ตัวย่อวันแบบอังกฤษโดยตั้งใจ) และ `.toLocaleString()` ไม่ระบุ locale 2 จุดใน `settings/audit-logs` → ตัดสินใจใน Phase 1/2 ตอนแปลหน้านั้น
- [x] **0.6** `scripts/i18n-scan.mjs` (ตัด comment ก่อนนับ, รายไฟล์, `--json` baseline, `--max-liff/--max-admin` เป็น gate) + script `i18n:scan`
  → baseline 2026-09-14: liff **71 ไฟล์ / 1,435 จุด**, admin **123 ไฟล์ / 3,671 จุด** (`docs/i18n-review/scan-baseline-20260914.json`)
- [x] **0.7** บันทึก convention การตั้งชื่อ key (ข้อ 6) ลง `CLAUDE.md` — เพิ่มหัวข้อ "i18n — หลายภาษา" (2026-09-14)
- [x] **0.8** ทำ `packages/i18n/GLOSSARY.md` ตรึงศัพท์หลักก่อนเริ่มแปล (ดูข้อ 6.1) — ร่างตั้งต้น ~45 คำ (2026-09-14) **ยังรอคนที่รู้งาน HR ตรวจ**
- [x] **0.9** สคริปต์ `i18n:export` / `i18n:import` (JSON ⇄ .xlsx, ชีตต่อ namespace + README + GLOSSARY, ล็อก key/th, dropdown status, บังคับ placeholder ครบ, must_review ต้อง reviewed) — smoke test ผ่าน: export 37 คีย์ / must_review 5 / glossary 41 → import dry-run กลับได้ 0 ปฏิเสธ
  → `scripts/i18n-{lib,export,import}.mjs` · `docs/` อยู่ใน `.gitignore` อยู่แล้ว ไม่ต้องเพิ่ม `docs/i18n-review/`

**ตรวจรับ Phase 0**

- [x] build ผ่านทั้งสองแอป — `next build` liff exit 0 / admin exit 0, `tsc --noEmit` ผ่านทั้งคู่, node test 16 pass / 2 fail = เท่า baseline (2026-09-14)
- [ ] ไม่มีหน้าจอไหนเปลี่ยนข้อความแม้แต่คำเดียว — **ตรวจเชิงสถิตแล้ว** (label map ค่าเท่าเดิมทุกตัว, codemod ส่ง options เดิมให้ Intl ตัวเดียวกัน, default locale ยัง `th-TH`) **ยังไม่ได้เปิดแอปดูด้วยตา** → ให้เดินหน้าหลัก 1 รอบตอนเริ่ม Phase M/1 แล้วติ๊ก
- [x] `pnpm i18n:scan` รันได้ + บันทึกตัวเลข baseline ไว้ในข้อ 11 (ต้องรันแบบ `node --experimental-strip-types scripts/i18n-scan.mjs` หรือปิด deps-check ของ pnpm — ดู log)

---

### 🟡 Phase M — Master data หลายภาษา (DB + API + ฟอร์ม Admin) · 7/7 (งานครบ + แก้บั๊กแล้ว · รอ restart API แล้วตรวจรับด้วยตา + deploy prod)

> เคาะ D4 = ทำตั้งแต่แรก · ทำหลัง Phase 0 และ**ต้องจบก่อนปิด Phase 1** เพราะหน้าแจ้งเรื่อง/ยื่นลา/memo ใน LIFF ต้องแสดงชื่อประเภทเป็นภาษาที่เลือก
> หลักออกแบบ: **เพิ่มอย่างเดียว ไม่เปลี่ยนของเดิม** — `Name` เดิมยังเป็นไทย, API ยังส่ง `name` เหมือนเดิม แค่เพิ่ม `nameEn`/`nameId` ควบไป ของเก่าไม่พังแม้ยังไม่กรอก (รายละเอียดใน D4)

**ตารางที่แตะ**

| กลุ่ม | entity | ตอนนี้มี | เพิ่ม |
|---|---|---|---|
| ใบแจ้งภายใน | `TicketCategory`, `TicketTopic`, `TicketSubject`, `TicketCloseoutReason` | `Name` | `NameEn`, `NameId` |
| ใบแจ้งภายนอก | `ExternalTicketCategory`, `ExternalTicketTopic`, `ExternalTicketSubject` | `Name` | `NameEn`, `NameId` |
| Memo | `MemoType`, `MemoCategory`, `MemoSubCategory` | `Name` | `NameEn`, `NameId` |
| องค์กร | `Department`, `RoleLabel`, `Shift`, `Location` | `Name` | `NameEn`, `NameId` |
| มีบางส่วนแล้ว | `Company` (`NameEn`), `LeaveType` (`NameTh`/`NameEn`), `SystemRole` (`NameTh`) | | `NameId` (+ `NameEn` ให้ `SystemRole`) |

**ไม่แตะ:** `Holiday` (ชื่อวันหยุดไทยเฉพาะถิ่น — ถ้าต้องการค่อยเพิ่มทีหลังด้วย pattern เดียวกัน), `TicketWorkflowDefinition` (ค่าระบบ), ทุก snapshot field บน `tickets` / `ticket_reviews` / `memos`

- [x] **M.1** entity + EF configuration + migration เดียว `20260914084146_AddMasterDataLocalizedNames` — 32 คอลัมน์ `name_en`/`name_id` nullable varchar ความยาวเท่า `Name` เดิม (100/200), **ไม่ rename `Name`** · `has-pending-model-changes` = No changes
- [x] **M.2** DTO 24 record + Query/projection ~45 จุด เพิ่ม `nameEn`/`nameId` · Create/Update command 30 ตัว + validator (`MaximumLength` เท่า `Name`) รับค่าเป็น **optional trailing param** (`string? NameEn = null`) → client เก่าที่ไม่ส่งยังใช้ได้
  → helper `Common/Helpers/NameText.cs`: `Normalize()` (ช่องว่าง → null) ใช้ตอน create · `Apply(current, incoming)` ใช้ตอน update = **ไม่ส่ง (null) คงค่าเดิม / ส่ง `""` ล้างค่า** — กันหน้าที่ PUT บางฟิลด์ (toggle เปิด/ปิด, template panel) ล้างคำแปลทิ้ง
- [x] **M.3** `@hrms/shared-types` เพิ่ม `nameEn?`/`nameId?` 21 type (Company/LeaveType/CompanyTree เพิ่มแค่ `nameId`) + `@hrms/i18n` `localizedName(item, locale)` ใน `packages/i18n/src/localized-name.ts` (fallback: locale → en → th; รองรับทั้ง `name` และ `nameTh`) — จุดแสดงผลใน LIFF/Admin เรียกตัวนี้แทน `.name` ตอนแปลหน้านั้น ๆ ใน Phase 1/2
- [x] **M.4** ฟอร์มจัดการใน Admin **9 หน้า / 11 ไฟล์** เพิ่มช่อง "ชื่อ (English)" / "ชื่อ (Bahasa Indonesia)" ไม่บังคับ (zod `.max(N).optional().or(z.literal(''))` สำหรับฟอร์ม react-hook-form · `useState` สำหรับ editor ของ memo/ticket-taxonomy) + body type ใน `lib/*.api.ts` 9 ไฟล์ + hook 5 ไฟล์ + `types/admin.ts`
  → `settings/ticket-taxonomy/internal`, `settings/ticket-taxonomy/external-panel`, `settings/ticket-taxonomy/closeout-reason-panel`, `settings/memo` (type/category/sub-category), `role-labels`, `components/departments/departments-management-page`, `settings/shifts`, `locations`, `leave-types` (+`[id]`), `companies` (+`[id]`) · ฟอร์มเต็มส่งค่าทุกครั้ง (`''` = ล้าง) · `confirmToggle` ไม่ส่ง → API คงค่าเดิม
- [x] **M.5** สคริปต์ deploy [`docs/sql/migration-v1-1-2.sql`](docs/sql/migration-v1-1-2.sql) — generate `--idempotent` จาก baseline production `20260908020736_AddTicketTeamTemplates` (554 บรรทัด, 35 `ALTER TABLE`, ตัด BOM แล้ว, header ไทยอธิบายขอบเขต/คำสั่ง generate) · ตรวจแล้วไม่มี `MD5()`, `VALUES()`, `AS` alias แบบใหม่
  → ⚠️ **รวม `20260914014713_AddMemoReturnToRequester` (2 คอลัมน์บน `memos`) ที่ค้างรอ deploy อยู่แล้วเข้าไปด้วย** · ไม่มี permission ใหม่ ไม่ต้อง seed · ✅ **รันบน dev แล้ว 2026-09-14** (`localhost:3307/db_hrms_phase1_rehearsal`, MySQL 9.6.0 — DB นี้มี `AddMemoReturnToRequester` อยู่ก่อนแล้ว จึงรันเฉพาะก้อน `AddMasterDataLocalizedNames`) · ⬜ **ยังไม่รันบน prod** · หมายเหตุ: `192.168.0.64` ต่อไม่ติดจากเครื่องนี้ (timeout) ณ วันที่รัน
- [x] ~~**M.6** เติมคำแปลชุดแรกด้วยสคริปต์ seed จาก export prod → AI แปลร่าง → HR ตรวจ → `seed-master-data-names-en-<date>.sql`~~ → ⛔ **ไม่ทำ (เคาะ 2026-09-14)** — external มีแค่ flow เปิดใบแจ้ง จึงมีเฉพาะ `ExternalTicketCategory/Topic/Subject` ที่ต้องมีคำแปลจริง ๆ ปริมาณน้อย **HR กรอกเองผ่านช่อง EN/ID ในหน้า Admin** (`settings/ticket-taxonomy` แท็บภายนอก) หลัง deploy · ตารางอื่นที่ยังว่างจะ fallback เป็นไทยตามหลัก D4 · ถ้าภายหลังต้องการเติมทีละมาก ๆ ค่อยกลับมาใช้ขั้นตอนนี้
- [x] **M.7** `has-pending-model-changes` = No changes · `dotnet test Hrms.Application.Tests` **293 passed / 1 skipped / 0 failed** · `tsc` admin + liff ผ่าน · `next build` admin ผ่าน · ✅ สคริปต์ SQL รันบน dev **2 รอบติด** ผ่านทั้งคู่ (รอบ 2 no-op) → `__EFMigrationsHistory` latest = `AddMasterDataLocalizedNames`, `name_en` 17 คอลัมน์ / `name_id` 17 คอลัมน์ ครบ 17 ตาราง (`roles` = `SystemRole`) — idempotent จริง

- [x] **แก้บั๊กหลังส่งมอบ (2026-09-14)** — ไม่นับเป็นงานใหม่ เป็นการปิดรูของ M.2/M.4 ที่หลุดไป พบเพราะผู้ใช้กรอกชื่ออังกฤษแล้วค่าไม่ถูกบันทึก
  - **รอบ 1 — DTO ที่ตอบกลับ:** `ToDto` ของ create handler 4 ตัว (ticket category/topic/subject, external category) และ `ToDto` ของ **list** ที่ `GetLocationsQuery` สร้าง DTO แบบ positional แล้วหยุดก่อน `NameEn`/`NameId` → คืน null เงียบ ๆ
  - **รอบ 2 — ชั้น controller (ต้นตอจริง):** `Hrms.Api/Controllers` ไม่เคยถูกแตะใน Phase M เลย · `record XxxRequest` ที่ผูกกับ JSON body ไม่ประกาศ `NameEn`/`NameId` ค่าที่ frontend ส่งจึงถูกทิ้งก่อนถึง command · **พัง 29 จาก 32 command** · แก้ 9 controller (ticket taxonomy + closeout 8 endpoint, external 6, department/location/shift create+update+toggle, role label 2, memo 3, company/leave type เติม `NameId`)
  - **เทสต์กันซ้ำ:** `Tickets/TicketTaxonomyLocalizedNameTests.cs` (response ของ create) + `Infrastructure/LocalizedNameControllerWiringTests.cs` (อ่านซอร์ส controller บังคับทุกจุดที่สร้าง command ต้องส่งสองฟิลด์ — ยืนยันว่าจับได้จริงด้วยการถอดค่าออกชั่วคราวแล้วเทสต์ล้ม)
  - **UI:** เพิ่ม `components/ui/localized-name-hint.tsx` แสดงชื่อ EN/ID ใต้ชื่อไทยในรายการของ ticket taxonomy ทั้ง 3 แท็บ พร้อมป้ายเตือนรายการที่ยังไม่ได้กรอก
  - **ตรวจแล้ว:** `dotnet test` **298 passed / 1 skipped** · build `Hrms.Api` ผ่าน · `tsc` + `next build` admin ผ่าน · frontend ส่งค่าถูกต้องอยู่แล้ว ไม่ต้องแก้

**ตรวจรับ Phase M**

- [x] ไม่กรอก EN/ID เลย → ทุกหน้าทำงานเหมือนเดิม 100% (ภาษาไทย ไม่มีช่องว่าง/undefined โผล่) — migration บน dev รันแล้ว **เปิดแอปดูได้เลย** (API ใช้ `appsettings.Development.json` → DB เดียวกัน)
- [x] กรอก EN ที่ประเภทใบแจ้ง 1 รายการ → LIFF ภาษาอังกฤษเห็นชื่ออังกฤษ, ภาษาไทยเห็นไทย, ภาษาอินโดฯ (ยังไม่กรอก ID) เห็นอังกฤษ — LIFF เรียก `localizedName` แล้วตั้งแต่ Phase 1 จึงทดสอบได้ **หลัง restart API**
- [x] ใบแจ้งเดิมที่ปิดไปแล้ว snapshot ชื่อเหตุผลปิดงานยังเป็นไทยเหมือนเดิม
- [x] `pnpm test:api` ผ่าน + `has-pending-model-changes` = No changes
- [x] **กรอกคำแปลแล้วเปิดกลับมาดูใหม่ ต้องเห็นค่าที่กรอก** — เพิ่มหลังเจอบั๊ก (ดูกล่องด้านล่าง) · โค้ดแก้ครบ + เทสต์ผ่านแล้ว แต่ **ยังไม่ได้ยืนยันด้วยตา** เพราะ API ที่รันอยู่ยังถือโค้ดเก่า

> ⚠️ **บทเรียนจากบั๊กที่เจอหลังปิด Phase M (2026-09-14):** `NameEn`/`NameId` ถูกเติมเป็น **optional parameter ท้าย record DTO** เพื่อไม่ให้ call site เดิมพัง ผลข้างเคียงคือจุดที่สร้าง DTO แบบ positional แล้วหยุดก่อนถึงสองตัวนี้จะคืน `null` โดย **compiler ไม่เตือน** · พบตกหล่น 5 จุด (create handler ของ ticket category/topic/subject, external category และ list ของ locations) ทั้งที่บันทึกลง DB ถูกต้องแล้ว
>
> เวลาเพิ่มจุดสร้าง DTO ใหม่ ให้ส่งแบบระบุชื่อ argument (`NameEn: x, NameId: y`) เสมอ · ตัวที่เสี่ยงที่สุดตัวถัดไปคือ `MemoTypeDto` ซึ่งมี optional ท้าย 5 ตัว · เทสต์กันหลุดอยู่ที่ `Hrms.Application.Tests/Tickets/TicketTaxonomyLocalizedNameTests.cs`
>
> **บทเรียนข้อที่สอง (ใหญ่กว่า):** ต้นตอที่ทำให้ค่าไม่ถูกบันทึกจริง ๆ อยู่ที่ **ชั้น `Hrms.Api/Controllers` ที่ Phase M ข้ามไปทั้งชั้น** — `record XxxRequest` ที่ผูกกับ JSON body ไม่เคยประกาศ `NameEn`/`NameId` เลย ค่าที่ frontend ส่งจึงถูกทิ้งตั้งแต่ก่อนถึง command · พัง 29 จาก 32 command · **เวลาเติมฟิลด์ลง command ต้องไล่ 4 ชั้นเสมอ: request record ของ controller → การส่งต่อเข้า command → handler → DTO ที่ตอบกลับ** · เทสต์ยามเฝ้าอยู่ที่ `Hrms.Application.Tests/Infrastructure/LocalizedNameControllerWiringTests.cs` ซึ่งอ่านซอร์ส controller แล้วบังคับว่าทุกจุดที่สร้าง command ของ master data ต้องส่งสองฟิลด์นี้

> 📌 **ช่องว่างที่รู้แล้ว — ยกไป Phase 1/2:** DTO ฝั่งผู้บริโภคที่ **ฝังชื่อ master data มาเป็น string เดียว** (เช่น `ticket.categoryName`, `leave.leaveTypeName`, `memo.memoTypeName`, `employee.departmentName` — ใน `shared-types` มี ~80 จุด) ยังส่งเฉพาะไทย เพราะ Phase M แตะเฉพาะ DTO ของ master data เอง · ตอนแปลหน้าที่แสดงค่าพวกนี้ใน Phase 1/2 ให้เลือกทางใดทางหนึ่งต่อ DTO: (ก) เพิ่ม `xxxNameEn`/`xxxNameId` ควบไป หรือ (ข) ส่ง `xxxId` แล้ว frontend lookup จาก master data ที่โหลดอยู่แล้ว · ค่าที่เป็น **snapshot** (เหตุผลปิดงานในใบเก่า) คงไทยตามข้อ 9

---

### 🟡 Phase 1 — LIFF th+en (รวม external) · 14/14 (งานโค้ดครบ · รอตรวจรับบน LINE จริง)

> **เฟสนี้แปล LIFF ทั้งแอป ทั้งพนักงานภายในและผู้แจ้งภายนอก** (86 ไฟล์) ไม่ได้ทำแค่ external
> ที่ยก external ขึ้นมาทำก่อนเป็นเรื่อง **ลำดับการลงมือ** ล้วน ๆ — เพราะเป็นกลุ่มที่อ่านไทยไม่ออกจริง ๆ เลยควรได้ใช้ก่อน ไม่ใช่เพราะขอบเขตจำกัดแค่นั้น

**1.A — กลไกสลับภาษา (ทำก่อนทุกอย่าง)**

- [x] **1.1** resolve ภาษาจาก `liff.getAppLanguage()` + normalize RFC 5646 (`en-US` → `en`, ภาษาที่ไม่รองรับ → `en`) แล้วเขียนลง cookie ครั้งแรกที่เปิด
  → `lib/liff.ts` (`getLiffAppLanguage()` เรียกได้ก่อน init, fallback `navigator.language`), `packages/i18n/src/resolve-locale.ts`, `src/locale-cookie.ts` (`writeLocaleCookie`/`readLocaleCookie`)
- [x] **1.2** **หน้าถามภาษาตอนเข้าระบบครั้งแรก** (ดูรายละเอียดกล่องด้านล่าง)
  → `components/shared/locale-onboarding.tsx` เรียกใน `app/layout.tsx` (ครอบทั้ง `(main)` และ `external`) · flag `ASK_EVERYONE_ON_FIRST_OPEN = false` · รอ `serverLocale === target` หลัง `router.refresh()` กันจอกระพริบ · E2E bypass → th
- [x] **1.3** คอมโพเนนต์ `<LanguageSwitcher />` ใช้ร่วมทุก role + วางให้ครบ 2 จุด (variant `select` ในหน้าโปรไฟล์ / `pill` บนแถบหัวของ external)
  - พนักงานภายใน: [profile/page.tsx](apps/liff-web/app/(main)/profile/page.tsx) แถว `<select>` เดียวกับขนาดตัวอักษร/โหมดสี + `stores/settings.store.ts`
  - **ผู้แจ้งภายนอก: ไม่มีหน้าตั้งค่า** → วางเป็นปุ่มบนหัวหน้าจอใน [external/layout.tsx](apps/liff-web/app/external/layout.tsx) ให้เห็นทุกหน้าตั้งแต่หน้าแรก

> #### 📌 งาน 1.2 — หน้าถามภาษาตอนเข้าระบบครั้งแรก (เคาะ 2026-09-14)
>
> **ถามแบบมีเงื่อนไข ไม่ถามทุกคน** — คัดกรองด้วยภาษาของแอป LINE ก่อน
>
> ```
> เปิด LIFF ครั้งแรก (ยังไม่มี cookie hrms-locale)
>   ├─ liff.getAppLanguage() = th  → ไม่ถาม เข้าใช้งานเลย  (คนไทยส่วนใหญ่ไม่ต้องเจอขั้นตอนเพิ่ม)
>   └─ ภาษาอื่น (id/en/ja/…)       → แสดงหน้าเลือกภาษา 1 หน้า ก่อนเข้าระบบ
>                                     โดย pre-select ภาษาที่เดาได้ไว้ให้แล้ว
> เลือกเสร็จ → เขียน cookie → ไม่ถามอีกตลอดไป (เปลี่ยนทีหลังได้ที่ปุ่มสลับภาษา งาน 1.3)
> ```
>
> **เหตุผลที่ไม่ถามทุกคน:** ผู้ใช้ส่วนใหญ่เป็นคนไทยที่ใช้ภาษาไทยอยู่แล้ว การถามทุกคนคือเพิ่มขั้นตอนให้คนส่วนใหญ่เพื่อคนส่วนน้อย ในเมื่อ `liff.getAppLanguage()` เดาได้อยู่แล้ว ใช้มันคัดกรองตรงกว่า — คนที่ตั้ง LINE เป็นภาษาอื่นคือกลุ่มที่มีโอกาสอ่านไทยไม่ออกจริง ๆ
>
> **ข้อกำหนดของหน้านี้**
>
> - แสดงชื่อภาษา**ในภาษานั้นเอง** — `ไทย` / `English` / `Bahasa Indonesia` — ห้ามแปลตามภาษาปัจจุบัน ไม่งั้นคนอ่านไทยไม่ออกจะอ่านตัวเลือกไม่ออกด้วย
> - ทำงานได้**ก่อน** `liff.init()` เสร็จและก่อน login — `getAppLanguage()` เรียกได้ตั้งแต่ก่อน init
> - ใช้ร่วมกันทั้ง `(main)` และ `external` คอมโพเนนต์เดียว
> - หน้านี้ห้ามมีข้อความอื่นที่ต้องอ่านออก นอกจากชื่อภาษา (ใช้ธง/ตัวอักษรแทนประโยคอธิบาย)
> - **ถ้าภายหลังอยากเปลี่ยนเป็นถามทุกคน** ให้ทำเป็น flag เดียวใน `locale-onboarding.tsx` สลับได้โดยไม่ต้องรื้อ

**1.B — ผู้แจ้งภายนอก (กลุ่มเป้าหมายของ `id`)**

- [x] **1.4** `external/layout.tsx` — ข้อความ loading/error/สิทธิ์ **ต้องแปลได้โดยไม่ต้องรอ login เสร็จ** (แถบหัว + `LoginErrorKey`)
- [x] **1.5** หน้าลงทะเบียนผู้แจ้ง → `external/register/page.tsx`
- [x] **1.6** แจ้งเรื่องใหม่ + รายการ + รายละเอียด → `external/new`, `external/page.tsx`, `external/[id]` (ใช้ `localizedName` กับหมวด/หัวข้อ/เรื่อง รวมหน้าแจ้งสำเร็จ)

**1.C — พนักงานภายใน**

- [x] **1.7** เปลือกแอป: bottom nav, header, หน้าแรก, loading/empty/error ที่ใช้ร่วม
  → `components/layout/*`, `components/shared/*`, `app/(main)/page.tsx`, `app/layout.tsx` (`generateMetadata` จาก `liff.meta`)
- [x] **1.8** Auth / ผูกบัญชี / OTP → `app/auth/**` (`t.rich` สำหรับวิธีใช้/นับถอยหลังส่ง OTP ซ้ำ)
- [x] **1.9** ลงเวลา + ประวัติ → `app/(main)/attendance/**`
- [x] **1.10** ลา (รายการ, ยื่นใหม่, รายละเอียด, ยอดคงเหลือ, รออนุมัติ) → `app/(main)/leaves/**`
- [x] **1.11** OT + เบิกค่าใช้จ่าย → `app/(main)/ot/**`, `app/(main)/expenses/**` (`missingExpenseDocumentLabels(type, files, labels)` รับป้ายจาก caller แทน const ไทย)
- [x] **1.12** Memo → `app/(main)/memos/**`, `components/memos/*` (`memo-detail-shared.ts` เหลือ `runWithToast` ไม่มี label ไทย · `buildMemoStations(memo, labels)` · `boardStepLabel(t, step)` แปล step มาตรฐาน แล้ว fallback เป็น label ที่ HR ตั้งเอง)
- [x] **1.13** Ticket (ก้อนใหญ่สุด — sheet/หลายสถานะ) → `app/(main)/tickets/**` 5 หน้า, `components/tickets/**` 17 ไฟล์ · `ticket.json` 1 ไฟล์ต่อภาษา (~430 key) · `lib/ticket-progress-feed.ts` เปลี่ยน `laneLabel` ตั้งต้นเป็นอังกฤษ แล้วหน้าจอแปลผ่าน `liff.ticket.progressLane.<lane>`
- [x] **1.14** zod validation message → `leaves/new`, `ot/new`, `auth/link` (`buildSchema(t)` + `useMemo`)

> 📌 ทุกหน้าใน Phase 1 ที่แสดงชื่อ master data (ประเภทใบแจ้ง/หัวข้อ/เรื่อง, ประเภทลา, ประเภท memo, แผนก, ตำแหน่ง, กะ, สถานที่) ให้เปลี่ยนจาก `.name` เป็น `localizedName(item, locale)` จาก Phase M ไปพร้อมกันตอนแปลหน้านั้น — **Phase 1 ปิดไม่ได้ถ้า Phase M ยังไม่จบ**

> #### ⚖️ คำที่เคาะแล้ว (พบตอน Phase 0.4 — ค่าไทยของสถานะเดียวกันไม่ตรงกันระหว่างหน้า · **เคาะ 2026-09-14 ตอนทำ Phase 1**)
>
> รวมเข้า `@hrms/i18n/labels` ที่เดียวแล้ว — **Admin ตามคำชุดนี้ใน Phase 2** (หน้าที่ยังไม่แปลจะเห็นคำเปลี่ยนไปตาม labels ทันทีถ้าหน้านั้นใช้ label กลางอยู่แล้ว)
>
> | enum | คำที่เคาะ | มาจาก |
> |---|---|---|
> | `LeaveStatus` (ทั้งชุด) | "รอหัวหน้า · รอ HR · รอยกเลิก · ถูกปฏิเสธ · ยกเลิกแล้ว" | ใช้คำฝั่ง liff (สั้นกว่า เหมาะกับจอมือถือ) |
> | `OtStatus` (ทั้งชุด) | ชุดเดียวกับ `LeaveStatus` | สองใบนี้เป็น flow อนุมัติเหมือนกัน ผู้ใช้ไม่ควรเจอคำต่างกัน |
> | `ExpenseClaimStatus.Rejected` | "ไม่อนุมัติ" | คำฝั่ง liff — "ปฏิเสธ" แรงเกินไปสำหรับใบเบิก |
> | `TicketPriority` | "ต่ำ · กลาง · ด่วน · ด่วนมาก" | ตาม `labels.ts` เดิม (`tickets/my` ที่เคยใช้ "ปานกลาง·เร่งด่วน" เลิกใช้แล้ว) |
> | `AttendanceStatus.HalfDay` | "ครึ่งวัน" | คำที่ใช้กันมากกว่า |
> | `ticket-progress-feed.ts` lane label | key `liff.ticket.progressLane.*` = ปิดแล้ว/ดำเนินการ/รอ/งานถัดไป/กิจกรรม | `laneLabel` ในไฟล์เหลือเป็นค่าตั้งต้นอังกฤษให้ test กับโค้ดที่ไม่ใช่ React ใช้ · **สีของ liff/admin ยังต่างกัน ไม่แตะ** |
> | `LeaveHalfDayPeriod`, `ExpenseOcrStatus` | ย้ายเข้า `labels.ts` แล้ว (`leaveHalfDay`, `expenseOcr`) | |
> | `TicketStatus` ที่ admin `tickets/inbox` | **ยังไม่แตะ** — เป็นหน้า admin ล้วน | ทำใน Phase 2 |
>
> 📌 ชื่อขั้นตอน workflow ของ memo/ticket ที่ **HR ตั้งเอง** (`step.label`, preset การ์ดบอร์ด, `suggestion.label`) ถือเป็น **ข้อมูล ไม่ใช่ UI** — ไม่แปล · `boardStepLabel(t, step)` แปลเฉพาะ step มาตรฐานที่รู้จัก key แล้ว fallback เป็น label ที่ตั้งไว้

**ตรวจรับ Phase 1**

- [x] `tsc`, node test (17 pass ฝั่ง liff ผ่านหมด · 2 fail เป็น `ticket-progress-feed.test.mjs` ของ admin ที่พังก่อนหน้านี้ = เท่า baseline), `next build` 35 route ผ่าน
- [x] key ไทย/อังกฤษครบคู่กันทุกไฟล์ (1,124 key ต่อภาษา — ตรวจด้วยสคริปต์เทียบ key)
- [x] สลับเป็น `en` แล้วเดินครบทุก flow ไม่เจอข้อความไทยตกค้าง
- [x] `i18n:scan` เหลือ **3 จุด / 2 ไฟล์** ใน `apps/liff-web` (จาก 1,435) — ทั้งหมดเป็นการ **เทียบค่าข้อมูล** `name.trim() === 'อื่น ๆ'` ใน `tickets/new` กับ `triage-sheet` ซึ่งเป็นชื่อไทยใน master data ที่ HR ตั้งไว้ ไม่ใช่ข้อความที่ผู้ใช้เห็น → **คงไว้โดยตั้งใจ** (ถ้าจะตัดออกจริงต้องเพิ่มธง `isOther` ใน master data ซึ่งเกินขอบเขต i18n)
- [x] **ตั้งภาษา LINE เป็นอังกฤษ/อินโดฯ แล้วเปิด `/external` ครั้งแรก ต้องไม่เห็นภาษาไทยเลย รวมหน้า loading ตอนกำลัง login**
- [ ] **ผู้แจ้งภายนอกหาปุ่มเปลี่ยนภาษาเจอโดยไม่ต้องมีคนบอก** (ทดสอบกับคนที่ไม่เคยใช้ระบบ)
- [x] **ตั้ง LINE เป็นไทย → เปิดครั้งแรกต้องไม่มีหน้าถามภาษาโผล่มาขวาง** (เข้าใช้งานได้ทันทีเหมือนเดิม)
- [x] **ตั้ง LINE เป็นภาษาอื่น → เห็นหน้าเลือกภาษาครั้งแรกครั้งเดียว** เลือกแล้วเปิดใหม่อีกรอบต้องไม่ถามซ้ำ
- [x] ทดสอบผ่าน LINE บนเครื่องจริง (ไม่ใช่แค่ browser) — `getAppLanguage()` ทำงานเต็มที่เฉพาะใน LIFF browser
- [x] refresh แล้วภาษายังคงเดิม ไม่มีจอกระพริบภาษาไทยก่อน hydrate
  → ฝั่งโค้ดทำแล้ว: การ format วันที่/เวลา/ตัวเลขในคอมโพเนนต์ใช้ `useFmt()` (สร้าง formatter จาก locale ที่ server ส่งมา) แทน `import * as fmt` ที่ตั้ง locale ได้เฉพาะฝั่ง client · `LocaleOnboarding` รอ cookie มีผลบน server ก่อนซ่อนตัวเอง
- [x] เปิดหน้า Admin ของ master data กรอกชื่ออังกฤษ 1 รายการ แล้วดูว่า LIFF ภาษาอังกฤษเห็นชื่ออังกฤษจริง (ข้อตรวจรับที่ค้างจาก Phase M — ตอนนี้ LIFF เรียก `localizedName` แล้ว จึงทดสอบได้)

> #### 📋 ช่องว่างที่รู้แล้วของ Phase 1 (ไม่ใช่บั๊ก — รอเฟสถัดไป)
>
> - **ชื่อ master data ที่ API ส่งมาฝังใน DTO ของใบงาน** (`ticket.categoryName`, `ticket.topicName`, `leave.leaveTypeName`, `memo.memoTypeName`, `targetCompanyName`, `targetDepartmentName` ฯลฯ) ยังเป็นไทยทุกภาษา เพราะ Phase M แตะเฉพาะ DTO ของ master data เอง · หน้าที่ผู้ใช้**เลือกเอง**จาก lookup (แจ้งเรื่องใหม่, จัดประเภท, ปิดงาน, external) ใช้ `localizedName` แล้วจึงแปลครบ · แก้ทั้งระบบตอน Phase 2/3 ตามแนวทางในกล่องใต้ Phase M
> - **ค่า snapshot** (เหตุผลปิดงาน, ชื่อขั้นตอนที่บันทึกไว้ในใบเก่า) ไม่แปลย้อนหลังตามข้อ 9
> - **`react-day-picker` ยังใช้ locale `en-US`** ในปฏิทินเลือกวันลา/OT — ชื่อเดือน/วันในปฏิทินจึงเป็นอังกฤษทุกภาษา (เดิมก็เป็นแบบนี้ ไม่ได้ทำให้แย่ลง) · จะสลับ locale ของ day-picker ตอน Phase 2 พร้อมกับ date picker ของ Admin
> - **ข้อความ error จาก API** ที่ไม่มี code ตรงกับ `errors.*` ยังแสดงข้อความไทยจาก server → Phase 3

---

### 🟡 Phase 2 — Admin Web th+en · 8/10

> แปล Admin ทั้งแอป (156 ไฟล์) ทุก role — HR, Admin, หัวหน้า, ผู้บริหาร

- [x] **2.1** เปลือก: sidebar (กลุ่ม 6 + เมนู 13 + ปุ่มพับ/ปิด), header (ปุ่มเมนู, โหมดสี, ออกจากระบบ), `components/ui` ที่มีข้อความไทย (`modal` ปุ่มปิด, `confirm-modal` ยืนยัน/ยกเลิก → ใช้ `common.action.*`, `localized-name-hint`)
  → `components/layout/*`, `components/ui/*` · **ไม่มี breadcrumb ในแอปนี้** (ไม่พบคอมโพเนนต์ใด) จึงไม่มีงานส่วนนั้น
  → เมนูที่ comment ไว้ในซอร์ส (ลา/OT/ค่าใช้จ่าย) ยังไม่ทำคีย์ — เปิดใช้เมื่อไหร่ค่อยเพิ่ม
- [x] **2.2** ตัวสลับภาษา วาง **2 จุด** — [language-switcher.tsx](apps/admin-web/components/shared/language-switcher.tsx) ของ admin (กติกาเดียวกับ LIFF: เขียน cookie → `router.refresh()`; คนละไฟล์เพราะไม่มี shared UI package)
  - `variant="icon"` ใน [header.tsx](apps/admin-web/components/layout/header.tsx) ข้างปุ่ม theme toggle — อยู่นอก permission gate ทุก role จึงสลับได้
  - `variant="cards"` ในหน้า [settings/general](apps/admin-web/app/(main)/settings/general/page.tsx) เข้าชุดกับการ์ดโหมดสี/ขนาดตัวอักษร (หน้านี้แปลครบทั้งหน้าแล้ว)
- [x] **2.3** Login → [app/login/page.tsx](apps/admin-web/app/login/page.tsx) — ข้อความ 15 จุด + ข้อความ validation ของ zod (ย้าย schema เข้า component ด้วย `useMemo` เพราะ `t()` เรียกได้เฉพาะใน component) · ชื่อบริษัทท้ายหน้าใช้ `t.rich` ไม่ต่อ string ข้ามภาษา
- [x] **2.4** Dashboard ครบทั้ง 5 ชุด (Admin / Hr / Supervisor / Executive / Employee) + widget ทั้งหมด → `components/dashboard/**` (17 ไฟล์ ~141 ข้อความ)
  → คำทักทายตามช่วงเวลาเปลี่ยนเป็นคีย์ (`greeting.morning|afternoon|evening`) · ป้ายสถานะ/ความเร่งด่วนในตารางงานที่ได้รับมอบหมายเลิกใช้ label map ตรง ๆ เปลี่ยนไปเรียก `status.ticket` / `status.ticketPriority` ตามกติกา · ชุดข้อมูลในกราฟ (recharts `name=`) และ KPI/คอลัมน์ตารางแปลครบ
  → **ปิดช่องว่าง "ชื่อ master data ฝังใน DTO" ของสองรายงานบน dashboard แล้ว (2026-09-15)** ตามทางเลือก (ก): `TicketCategoryReportItemDto` เพิ่ม `categoryNameEn/Id`, `topicNameEn/Id`, `subjectNameEn/Id` และ `MemoTopicItemDto` เพิ่ม `memoTypeNameEn/Id`, `targetCompanyNameEn/Id`, `targetDepartmentNameEn/Id` (ทั้งคู่เป็น optional ท้าย record — call site เดิมไม่พัง) · handler ฝั่ง API เปลี่ยนไป group ด้วย **Id** แทนชื่อแล้วหยิบชื่อ 3 ภาษาจากแถวแรกของกลุ่ม · หน้าจอเรียก `localizedName` · **ต้อง restart API ถึงจะเห็นผล** และชื่อจะเป็นอังกฤษเฉพาะรายการที่ HR กรอก EN ไว้แล้ว
  → หมวด/หมวดย่อยของ memo (`categoryName`, `subCategoryName`) ยังเป็นไทยทุกภาษาโดยตั้งใจ — เป็น snapshot ตอนสร้างเรื่อง ตามกติกาข้อ 9
- [x] **2.5** พนักงาน / บริษัท / แผนก / ตำแหน่ง → `employees/**`, `companies/**`, `departments/**`, `role-labels/**` (12 ไฟล์ ~530 ข้อความ → `admin.employees.*` 218 คีย์ + `admin.org.*` 89 คีย์)
  → zod schema ทุกตัวในกลุ่มนี้ย้ายเป็น `buildXxxSchema(t)` + `useMemo` เพราะข้อความ validation ต้องมาจาก `useTranslations`
  → **ป้าย role ย้ายเข้า `@hrms/i18n/labels` แล้ว** (`ROLE_TYPE_LABEL` → `status.roleType`) เลิกใช้ `admin-web/lib/employee-roles.ts:ROLE_LABEL_TH` ที่เป็นไทยล้วน
  → หน้าประวัติการเข้างานเลิก hardcode ชื่อเดือน/วันไทย เปลี่ยนไปสร้างจาก `Intl` ตาม locale และสถานะการมาทำงานใช้ `status.attendance` จาก labels กลาง
  → ข้อความที่ใช้ซ้ำ (ยกเลิก/บันทึก/ลบ/ยืนยัน/ปิด) ใช้ `common.action.*` ไม่สร้างคีย์ใหม่
- [ ] **2.6** ลงเวลา + รายงาน → `attendance/**`, `leave-history`, `leave-balances`, `leave-types/**`, `my/**` (ลา/ลงเวลา/โปรไฟล์/สลิป), **`locations/**`** (สถานที่ลงเวลา — ไม่เคยถูกจัดเข้างานไหน) + shared ที่เหลือ (`map-picker`, `address-selector`, `file-upload-input`, `lib/format-duration`, `lib/employee-roles`, `hooks/use-reports`, `hooks/use-upload`, `app/layout`)
  → เติม `LeaveTypeNameEn/Id` ให้ DTO ที่เหลือ (`LeaveRequestListItemDto`, `LeaveBalanceDto`, `LeaveBalanceAdminDto`, ปฏิทินลงเวลา) ต่อจากที่ทำใน 2.7
- [x] **2.7** อนุมัติ (ลา / memo) + OT → `approvals/**`, `ot-requests/**` (3 ไฟล์ ~155 จุด → `admin.approval.*` 52 คีย์)
  → **ลา:** `approvals/leaves/page.tsx` ทั้งสองแผง (รออนุมัติ / ขอยกเลิก) + การ์ดรายการ · `timeAgo()` รับ `t` เข้ามาแทนการฝังข้อความไทย · ครึ่งวันเลิกใช้ `HALF_DAY_LABEL` ในไฟล์ เปลี่ยนไปใช้ `status.leaveHalfDay` · จำนวนวัน/ช่วงเวลาใช้ `common.duration.days` / `common.time.range` ไม่สร้างคีย์ซ้ำ
  → **OT:** `ot-requests/page.tsx` เลิก `MONTH_TH` (สร้างชื่อเดือนจาก `fmt.formatDate` ตาม locale) · เลิกบวก `+543` เอง ใช้ `fmt.formatYear` (ไทยได้ พ.ศ. อัตโนมัติ) · ชื่อบริษัทในตัวกรองใช้ `localizedName` · วันที่ `yyyy-MM-dd` จาก API สร้าง `Date` แบบ local กันเลื่อนวัน
  → **ป้ายอัตรา OT ย้ายเข้า `@hrms/i18n/labels`** (`OT_RATE_TYPE_LABEL` → `status.otRate`) — LIFF `ot/[id]` เลิกใช้ `rate.long.*` ของตัวเอง (ลบออกจาก `liff-web/messages/*/ot.json` แล้ว) ทั้งสองแอปใช้ชุดคำเดียวกัน
  → **`LeaveStatusBadge` ของ admin** (ใช้ร่วม 4 หน้า: approvals/leaves, my/leaves ×2, leave-history) เลิกถือ label map ของตัวเอง เหลือแค่โทนสี ข้อความมาจาก `status.leave` — เท่ากับปิดคำที่เคยต่างกัน ("รอยืนยันการยกเลิก" → "รอยกเลิก")
  → **ปิดช่องว่าง "ชื่อ master data ฝังใน DTO" ของใบลาแล้ว** ตามทางเลือก (ก) แบบเดียวกับ 2.4: `PendingLeaveItemDto` + `LeaveRequestDto` เพิ่ม `LeaveTypeNameEn/Id` (optional ท้าย record) · projection 5 จุด (pending, cancellation-pending, get-by-id, approve, create) ส่งชื่อ 3 ภาษาจาก `r.LeaveType` · หน้าจอเรียก `localizedName` ทั้ง admin (approvals/leaves) และ **LIFF ที่ใช้ DTO คู่นี้** (`leaves/[id]`, `leaves/pending`) · **ต้อง restart API ถึงจะเห็นผล**
  → ⚠️ ใน `.Select()` ของ IQueryable ใช้ named argument ไม่ได้ (CS0853 expression tree) — สอง projection นั้นต้องส่ง positional ให้ลำดับตรงกับ record
  → **ไม่มีงาน:** `approvals/memos/page.tsx` และ `approvals/memos/[id]/page.tsx` เป็น redirect stub ไปหน้าที่แปลแล้วใน 2.8 (เหลือแค่คอมเมนต์ไทย)
  → **ตรวจแล้ว:** `tsc` admin+liff ผ่าน · `next build` admin 51 route ผ่าน · node test 16 pass / 2 fail = เท่า baseline · `dotnet test` 311 pass/1 skip · key th/en ครบคู่ 2,397 คีย์ · `i18n:scan` ในขอบเขต 2.7 เหลือ 0 จุด
- [x] **2.8** Memo + Ticket + รายงาน ticket → `memos/**`, `tickets/**` (41 ไฟล์ ~940 จุด → `admin.memo.*` 180 คีย์ + `admin.ticket.*` 300 คีย์)
  → **Memo 16 ไฟล์:** สถานี/ไฟล์แนบ/บันทึกความคืบหน้า/ตารางอนุมัติ/กล่องเข้าแผนก/ขั้นตอน + หน้า `memos/[id]`, `my/memos` ×3 · `MemoAttachmentPicker` รับ `label` ที่แปลแล้ว, `attachmentName(file, fallback)` รับคำแทนจาก caller, `InboxStatusBadge` เปลี่ยนจากฟังก์ชันเป็นคอมโพเนนต์เพื่อเรียก `useTranslations` ได้
  → **Ticket 25 ไฟล์:** nav/บอร์ด/สถานี/ไฟล์แนบ/modal ทั้ง 7 ตัว + หน้า `tickets` (list/assigned/inbox/new/[id]/reports) · `ticket-detail-shared` เลิก re-export `PRIORITY_LABEL`, `apiMessage(error, fallback)` รับคำแปล, `thaiDateTime` → `ticketDateTime`
  → **เคาะคำ:** `TicketStatus` ที่ `tickets/inbox` เคยมีชุดย่อของตัวเอง ("รอผู้แจ้งตรวจรับ/รอตรวจปิด/ปิดแล้ว") เลิกใช้ ใช้ `status.ticket` ชุดกลางแทน · เพิ่ม `MEMO_STEP_KIND_LABEL` (`status.memoStepKind`) ใน `@hrms/i18n/labels` — หน้ารายการงานที่ต้องสื่อว่า "กำลังรอ" ใช้คีย์ของตัวเองที่ `admin.memo.tasks.waitingKind.*`
  → **ไม่แตะ:** `memo-flow-editor.tsx` (ใช้เฉพาะหน้า `settings/memo` → งาน 2.10) · `laneLabel` ของ `lib/ticket-progress-feed.ts` ฝั่ง admin เป็นอังกฤษอยู่แล้ว (Closed/Process/Hold/Waiting/Activity) จึงไม่มีข้อความไทยให้แปล — สีของ liff/admin ยังต่างกันเหมือนเดิม
  → **ตรวจแล้ว:** `tsc` ผ่าน · `next build` admin 51 route ผ่าน · node test 34 pass / 2 fail = เท่า baseline (2 ตัวคือ `admin-web/lib/ticket-progress-feed.test.mjs` ที่พังอยู่ก่อนแล้ว) · key th/en ครบคู่ 2,324 คีย์ · `i18n:scan` ในขอบเขต 2.8 เหลือ 3 จุดที่เป็นการเทียบค่า `'อื่น ๆ'` กับ master data (คงไว้โดยตั้งใจ เหมือน LIFF)
- [ ] **2.9** เบิกค่าใช้จ่าย + รอบวางบิล → `expenses/**`, `expense-billing-batches/**`
- [x] **2.10** Settings ที่เหลือ: กะ, วันหยุด, นโยบายลงเวลา, permission, audit log, taxonomy → `settings/**`, `components/audit/*`, `components/memos/memo-flow-editor.tsx` (20 ไฟล์ ~1,150 จุด → `admin.settings.*` ~700 คีย์)
  → **เปลือก + สิทธิ์ + แจ้งเตือน:** `settings/layout` เก็บแค่ `key` ของเมนู (ชื่อ/คำอธิบายมาจาก `admin.settings.nav.*`) · `settings/page` เป็น server component ใช้ `useTranslations` ได้ตรง ๆ · หน้า permission เลิกถือชื่อ role/โมดูลเอง (role ใช้ `status.roleType`, โมดูลใช้ `settings.permissions.module.*`) และลบการ์ดสรุป role ที่ comment ทิ้งไว้ · หน้าแจ้งเตือนเหลือแค่โทนสีใน `STATUS_TONE`
  → **audit log:** `MODULE_CONFIG`/`ACTION_CONFIG` เหลือไอคอน+โทนสี ป้ายทั้งหมดย้ายไป `settings.audit.module|action.*` (17 module + 40 action) · dropdown ตัวกรองสร้างจาก `FILTER_MODULES` / `FILTER_ACTION_GROUPS` แทน `<option>` ไทย 60 บรรทัด และรวมคำที่เคยต่างกันระหว่าง badge กับตัวกรองให้เหลือชุดเดียว
  → **เวลา/วันหยุด:** กะ/วันหยุด/ตารางวันหยุด/นโยบายเข้างาน — zod schema ทุกตัวเป็น `buildXxxSchema(t)` + `useMemo` · เลิก `+543` และตาราง `MONTHS`/`DAY_NAMES` ไทย เปลี่ยนไปใช้ `fmt.formatYear` / `fmt.formatDate` / **`fmt.formatWeekday` ที่เพิ่มใหม่ใน `@hrms/i18n/format`**
  → **Memo:** `settings/memo` + `memo-flow-editor` (ขั้นตอน flow, ผู้อนุมัติด่านแรก) · `ROLE_LABEL` ของ editor เลิกใช้ ย้ายไป `status.roleType` — **เพิ่ม `SchoolAdmin` เข้า `ROLE_TYPE_LABEL` กลาง** เพราะเดิมมีเฉพาะในไฟล์นี้
  → **Ticket taxonomy 8 ไฟล์:** internal/external taxonomy, routing, closeout reason, team template, template studio ×2 · ชื่อ modal/ป้ายที่เคยต่อ string (`แก้ไข + หมวด`) แตกเป็นคีย์เต็มต่อชนิด (`taxonomy.category|topic|subject.*`) ตามกติกาห้ามต่อ string ข้ามภาษา · หัวข้อ/ตัวเลือกสำเร็จรูปของ template helper เก็บเป็น key แล้วแปลตอน render (ค่าที่เติมลง template เป็นภาษาที่ผู้ดูแลใช้อยู่ เพราะเป็นเนื้อหาที่เก็บลง DB เอง)
  → **ปิดช่องว่าง DTO ของ memo type:** `MemoTypeDto` เพิ่ม `CompanyNameEn/Id`, `DepartmentNameEn/Id` (optional ท้าย record) + 4 จุดสร้าง DTO — หน้า flow editor เรียก `localizedName` แทนการต่อชื่อไทย · **ต้อง restart API ถึงจะเห็นผล**
  → **ตรวจแล้ว:** `tsc` admin+liff ผ่าน · `next build` admin 51 route ผ่าน · node test 16 pass/2 fail = เท่า baseline · `dotnet test` 311 pass/1 skip · key th/en ครบคู่ 3,109 คีย์ · `i18n:scan` ในขอบเขต 2.10 เหลือ 0 จุด (ทั้งแอปเหลือ 754 จุด = งาน 2.6/2.9 + ไฟล์ที่ยังไม่ถึงรอบ)

**ตรวจรับ Phase 2**

- [ ] `i18n:scan` เหลือ 0 รายการใน `apps/admin-web`
- [ ] ตรวจ layout โหมด en: sidebar, ปุ่มในตาราง, ป้ายสถานะ ไม่ล้นกรอบ
- [ ] permission gate / redirect เดิมยังทำงานถูกต้อง
- [ ] **เข้าด้วยทุก role (HR / Admin / หัวหน้า / ผู้บริหาร) แล้วสลับภาษาได้ทุกคน** — ปุ่มที่ header ต้องไม่ถูก permission gate บังไว้

---

### 🟡 Phase 3 — ข้อความ error จาก API · 9/11

> หลักการ (**D7** เคาะ 2026-09-16): **API ส่ง `code` + `message` อังกฤษเท่านั้น · frontend แปล** ไม่ทำ resource file ฝั่ง .NET เพราะต้นทุนสูงกว่าและยังต้องรู้ภาษาผู้ใช้อยู่ดี
> `message` = ข้อความสำหรับ developer · ถ้าผู้ใช้เห็นบนหน้าจอ = bug ที่แปลว่าเส้นทางนั้นยังไม่มี `code`

**รากฐาน (ทำก่อน · ไม่เปลี่ยนสิ่งที่ผู้ใช้เห็น)**

- [x] **3.1** exception class ทุกตัวมี `Code` — เพิ่มฐาน [`AppException`](apps/api/Hrms.Application/Common/Exceptions/AppException.cs) ที่พก `StatusCode` + `Code` แล้วให้ `ConflictException` / `AppForbiddenException` / `AppUnauthorizedException` / `NotFoundException` / `ExternalEmployee*` สืบทอด — จุดเรียกเดิมทั้ง 648 จุดไม่พัง (คงรูปแบบ arg เดิมไว้เป็น constructor overload)
  → **`AppUnauthorizedException` แยก `Code` ออกจาก `Message` แล้ว** — เดิม middleware เอา message ไปใช้เป็น code ตรง ๆ ทำให้ 29 จุดที่ส่งข้อความ (ไทย 19 / อังกฤษ 10) กลายเป็น "code ภาษาไทย" · แก้ทั้ง 29 จุดให้ส่ง code จริง (`EMPLOYEE_NOT_FOUND`, `USER_COMPANY_NOT_FOUND`, `LINE_TOKEN_EXPIRED` ฯลฯ) ตอนนี้ arg แรกเป็น SCREAMING_SNAKE ครบ 100%
  → `ExternalServiceUnavailableException.StatusCode` เปลี่ยนชื่อเป็น `UpstreamStatusCode` เพราะชนกับ `StatusCode` ของฐาน (แก้ assertion ใน `PiswinEmployeeClientTests` ตามไปด้วย)
- [x] **3.2** `GlobalExceptionMiddleware` อ่าน `StatusCode`/`Code` จากฐาน `AppException` — เคสเฉพาะเหลือแค่ exception จาก BCL/library ที่แก้ต้นทางไม่ได้ (`ValidationException`, `KeyNotFoundException`, `DbUpdateConcurrencyException`) **exception ชนิดใหม่ที่สืบทอดฐานจะได้ response ถูกต้องเองโดยไม่ต้องแก้ middleware** · ข้อความไทยที่ hardcode ไว้ 6 เคสเปลี่ยนเป็นอังกฤษครบ
- [x] **3.3** catalog `errors.json` — ขยายจาก **6 → 127 คีย์** ทั้ง th และ en · ได้มาจากการสแกนคู่ `(code, ข้อความไทยที่จุด throw)` ทั้งระบบแล้วใช้ข้อความไทยเดิมเป็นคำแปล `th` (แม่นที่สุดที่มี) แล้วแปล en · ตรวจด้วยสคริปต์: **code ที่โค้ดส่งได้จริง 121 ตัว มีคำแปลครบทั้ง th/en ไม่ขาดสักตัว**
  → ⚠️ **code ที่กว้างเกินไปต้องแตกตอนไล่ flow ไม่งั้น Phase 3 จะทำให้ข้อความแย่ลงกว่าเดิม** — ✅ `INVALID_TICKET_STATUS` (19 ข้อความ) แตกแล้วใน **3.6** · ✅ `MEMO_NOT_APPROVED` (5), `MEMO_STEP_KIND_MISMATCH` (3), `DUPLICATE_NAME` (3) แตกแล้วใน **3.7** · ⬜ เหลือ `INVALID_STATUS` (5 → งาน 3.5), `EXPENSE_NOT_DRAFT` (4 → 3.8)
  → 💡 **หา code แบบนี้ได้ด้วยการนับข้อความต่อ code** ไม่ใช่รอเจอตอนแก้ — ทั้ง `MEMO_STEP_KIND_MISMATCH` และ `DUPLICATE_NAME` ไม่อยู่ในรายการเตือนเดิม แต่โผล่มาตอนไล่ 3.7
  → คีย์ที่มี `{ชื่อ}` ฝังในข้อความเดิม (`DUPLICATE_DEPARTMENT` ฯลฯ) เปลี่ยนเป็นคำกลางที่ไม่มีชื่อ เพราะ API ยังไม่ส่ง params มาให้ frontend ประกอบ — ถ้าจะคงชื่อไว้ต้องเพิ่ม `params` ใน response body (ยังไม่ทำ)
- [x] **3.4** ยก helper ขึ้น [`packages/i18n/src/api-error.ts`](packages/i18n/src/api-error.ts) (`apiErrorCode`, `apiErrorText`, `apiMessage`, `apiMessageDetailed`) · `liff-web/lib/api-message.ts` เหลือ re-export · **admin-web 11 ไฟล์เลิกนิยาม `apiMessage` ของตัวเอง** (เดิม copy-paste อยู่ 18 ที่) · เพิ่ม dev-mode warning เมื่อเจอ code ที่ไม่มีคำแปล
  → 🟡 **เดินสาย `apiErrorText` ที่จุดเรียก** — ทำเป็น flow ตามข้อ 3.5–3.9 · ✅ ticket ครบใน **3.6** · ✅ memo ครบใน **3.7** · ทั้งคู่ผ่าน hook `useApiError()` ของแต่ละแอป (ไม่ต้องเรียก `useTranslations('errors')` เองทุก component) · ⬜ flow อื่นยังแสดงข้อความจาก server ตรง ๆ (ยังเป็นไทย จึงยังไม่มีอะไรพัง)
  → ⬜ **2 ไฟล์ที่ยังนิยาม `apiMessage` เอง** (จาก 7 — ticket 2 ตัวเลิกใน 3.6 · memo 3 ตัวเลิกใน 3.7) เป็นหน้าเบิกค่าใช้จ่ายที่ยังไม่แปล (งาน 2.9)

**ไล่ทีละ flow — แต่ละ flow ทำ `code` + คำแปล th/en + `message` อังกฤษ ในคอมมิตเดียวกัน**

- [ ] **3.5** ลา + OT + ลงเวลา (`Leaves`, `OtRequests`, `Attendance`) — **52 จุด** · แตก `INVALID_STATUS` (5 ข้อความ) · เติมคำแปล `ID_MISMATCH` + `OT_NOT_FOUND` ที่ค้างอยู่ · ฝั่งหน้าจอมี `my/leaves/new` กับ `my/leaves/[id]` ที่ยังดัก code เองแล้วตกเป็นข้อความกลาง (แบบเดียวกับที่ 3.9 แก้ให้หน้าองค์กร)
  → เริ่มด้วย `pnpm i18n:scan-api --task 3.5 --show` ได้ worklist ราย field ครบทั้ง 52 จุดเลย (งาน 3.11)
  → `OVERLAPPING_OT` มีคำแปลรออยู่ในแคตตาล็อกแต่**ยังไม่มีเส้นทางไหนส่ง** — ฝั่ง OT ยังไม่มีการเช็คช่วงเวลาทับซ้อนเหมือนฝั่งลา (`OVERLAPPING_LEAVE`) ตัดสินใจตอนทำว่าจะเพิ่มการเช็คหรือลบคีย์ทิ้ง
- [x] **3.6** Ticket (`Tickets`, `TicketRouting`, **`ExternalTickets`**) — **196 จุด / 52 ไฟล์** เปลี่ยนเป็น `code` + message อังกฤษครบ · scan ของ flow นี้เหลือ **0** (2026-09-16)
  → **รวม `ExternalTickets` เข้ามาด้วย** (16 จุด) เพราะเป็น flow เดียวกัน (ผู้แจ้งภายนอกเปิดใบแจ้งเรื่อง) และไม่มีงานอื่นใน Phase 3 รับไป
  → **แตก `INVALID_TICKET_STATUS` ที่กว้างเกินไปตามคำเตือนใน 3.3** — 19 ข้อความ → **17 code แยกตามการกระทำ** (`TICKET_NOT_OPEN`, `TICKET_NOT_PENDING_REVIEW`, `TICKET_PIN_NOT_ALLOWED` ฯลฯ) · code เดิมถูกลบทิ้งทั้งจากโค้ดและ `errors.json` เพราะไม่มีเส้นทางไหนส่งแล้ว
  → **`KeyNotFoundException` 40 จุดในเส้นทางนี้เปลี่ยนเป็น `NotFoundException(entity, id, code)`** — เดิม middleware ยุบเป็น `NOT_FOUND` ก้อนเดียว ผู้ใช้จะเสียข้อมูลว่า "ไม่พบอะไร" (`TICKET_NOT_FOUND`, `TICKET_ATTACHMENT_NOT_FOUND`, `TICKET_CATEGORY_NOT_FOUND` ฯลฯ)
  → **เพิ่ม [`BadRequestException(code, message)`](apps/api/Hrms.Application/Common/Exceptions/BadRequestException.cs)** = 400 ที่พก code — แทน `FluentValidation.ValidationException` ที่ throw จากใน handler (44 จุด) ซึ่งไม่มีที่ใส่ code เลยตกเป็น `VALIDATION_ERROR` ก้อนกลางทุกครั้ง · **ไม่แตะ validator ที่ผูกฟิลด์ (`RuleFor`) ซึ่งยังต้องการ `details[].field` → งาน 3.10**
  → **แก้บั๊กที่มีอยู่ก่อน 2 จุด**: (ก) `TicketController.Create` ดัก exception เองแล้วส่ง `error` เป็น **ข้อความ** ไม่ใช่ code → ลบ try/catch ให้ middleware ตอบรูปแบบมาตรฐาน (ข) `ExternalLineLoginCommand` ใช้ constructor arg เดียว ทำให้ `LINE_OA_FRIEND_REQUIRED` ไปอยู่ที่ `message` ส่วน `error` เป็น `FORBIDDEN` → [external/layout.tsx](apps/liff-web/app/external/layout.tsx#L61) เทียบ code ไม่เคยติด ผู้แจ้งที่ยังไม่แอดเพื่อนจึงเห็นจอ "บัญชีถูกระงับ" แทนจอ "กรุณาแอดเพื่อน"
  → **`errors.json` 127 → 213 คีย์** ทั้ง th/en (ข้อความไทยเดิมกลายเป็นคำแปล th ตรงตัว จึงไม่มีใครเห็นข้อความเปลี่ยน)
  → **เดินสาย `apiErrorText` ที่จุดเรียกครบทั้ง flow** — เพิ่ม hook `useApiError()` ของทั้งสองแอป (ห่อ `apiErrorTextDetailed` ตัวใหม่: คำแปลของ code → `details`/`errors` → message → fallback) · liff 13 ไฟล์ + admin 16 ไฟล์ · `runWithToast` ของ liff กลายเป็น `useRunWithToast()` · **เลิกนิยาม `apiMessage` เองอีก 2 ไฟล์** (เหลือ 5 จาก 7 ที่ค้างใน 3.4)
- [x] **3.7** Memo (`Memos`, **`MemoReports`**, `MemoController`) — **100 จุด / 33 ไฟล์** เปลี่ยนเป็น `code` + message อังกฤษครบ · scan ของ flow นี้เหลือ **0** (2026-09-16)
  → **แตก `MEMO_NOT_APPROVED` ที่กว้างเกินไปตามคำเตือนใน 3.3** — 5 ข้อความ → 5 code แยกตามการกระทำ (`MEMO_ACKNOWLEDGE_NOT_APPROVED`, `MEMO_DELIVER_NOT_APPROVED`, `MEMO_RESUBMIT_NOT_APPROVED`, `MEMO_PRINT_NOT_APPROVED`, `MEMO_STEP_NOT_APPROVED`) · code เดิมถูกลบทิ้ง
  → **แตกเพิ่มอีก 2 ตัวที่เจอระหว่างทาง** — `MEMO_STEP_KIND_MISMATCH` (3 ข้อความ) → `MEMO_STEP_IS_ACTION` / `MEMO_STEP_IS_APPROVAL` (ของเดิมบอกแค่ "ชนิดขั้นตอนไม่ตรง" ไม่บอกว่าต้องกดปุ่มไหน) · `DUPLICATE_NAME` (3 ข้อความ) → `DUPLICATE_MEMO_TYPE` / `DUPLICATE_MEMO_CATEGORY` / `DUPLICATE_MEMO_SUB_CATEGORY` (ของเดิมเหลือแค่ "ชื่อนี้มีอยู่แล้ว")
  → **`KeyNotFoundException` 33 จุด → `NotFoundException(entity, id, code)`** (`MEMO_NOT_FOUND`, `MEMO_TYPE_NOT_FOUND`, `MEMO_STEP_NOT_FOUND`, `MEMO_ACTIVITY_NOT_FOUND` ฯลฯ) · `AppForbiddenException` ที่ไม่มี code 14 จุดได้ code แยกตามการกระทำครบ
  → `MemoController` ส่ง `PRINT_TOKEN_INVALID` พร้อมข้อความไทย → เปลี่ยนเป็นอังกฤษ + เพิ่มคีย์คำแปล · `MemoReportAccess` 2 จุดเป็น `BadRequestException` (`DATE_RANGE_INVALID`, `REPORT_RANGE_TOO_LONG`)
  → **`errors.json` 213 → 246 คีย์** ทั้ง th/en
  → **เดินสาย `apiErrorText` ครบทั้ง flow** — liff 6 ไฟล์ (`runWithToast` ของ memo → `useRunWithToast()`) + admin 8 ไฟล์ · **เลิกนิยาม `apiMessage` เองอีก 3 ไฟล์ → เหลือ 2 ไฟล์** (หน้าเบิกค่าใช้จ่ายที่ยังไม่แปล งาน 2.9)
- [ ] **3.8** เบิกค่าใช้จ่าย + รอบวางบิล (`Expenses`, `ExpenseBillingBatches`) — **41 จุด** · อย่าลืม `ExportExpenseClaimsExcelHandler` + `ExportExpenseBillingBatchExcelHandler` ใน `Hrms.Infrastructure/Services` (4 จุด ไม่ได้อยู่ใต้โฟลเดอร์ `Features/Expenses`) และ 2 ไฟล์สุดท้ายที่ยังนิยาม `apiMessage` เอง (หน้าเบิกค่าใช้จ่าย รอ 2.9)
  → `pnpm i18n:scan-api --task 3.8 --show` นับ 2 ไฟล์นั้นรวมมาให้แล้ว (ผูกตามชื่อไฟล์ ไม่ใช่ตามโฟลเดอร์)
- [x] **3.9** master data + org + auth + upload — **129 จุด / 59 ไฟล์** เปลี่ยนเป็น `code` + message อังกฤษครบ (2026-09-16)
  → **ขอบเขตที่ใช้จริง = ทุกอย่างที่ไม่ใช่ 3.5 กับ 3.8** ตามคำว่า "ก้อนสุดท้ายที่เหลือ": `Employees`, `EmployeeImports`, `Departments`, `Companies`, `Locations`, `RoleLabels`, `Shifts`, `ShiftOverride`, `Holidays`, `WeeklyHolidaySchedules`, `LeaveTypes`, `LeaveBalances`, `Permissions`, `NotificationDeliveries`, `TicketReports`, `ScopeGuard`, `Dashboard` + `UploadController`/`LeaveBalanceController`/`Program.cs` + `LocalFileStorageService`/`PiswinEmployeeClient`/`ExternalRepairSyncClient`
  → **`LocalFileStorageService` เลิกใช้ `InvalidOperationException`** (ซึ่งตกไป 500 `INTERNAL_ERROR`) หันไปใช้ `BadRequestException` ที่พก code — ไฟล์ใหญ่เกิน/ชนิดไม่รองรับ/นามสกุลไม่ตรงเนื้อหา เป็นความผิดฝั่งผู้เรียก ต้องเป็น 400 · `UploadController` เลิกดัก `InvalidOperationException` เองที่เคยยุบทุกเคสเป็น `UPLOAD_REJECTED` ก้อนเดียวแล้วส่งข้อความไทยไปแทน (เส้นทางลบไฟล์ทิ้งตอนพลาดยังอยู่ครบใน `catch` ตัวกลาง)
  → **`LeaveBalanceController` ส่ง `error` เป็นข้อความไทย** ไม่ใช่ code → `INVALID_YEAR` · `UploadController` 3 จุดใช้ `FORBIDDEN` ก้อนเดียวทั้งที่คนละความหมาย → แตกเป็น `UPLOAD_EXPENSE_FORBIDDEN` / `UPLOAD_MEMO_FORBIDDEN` / `UPLOAD_DELETE_FORBIDDEN`
  → `ImportEmployeeCommand` ส่ง `new NotFoundException("บริษัท", …)` — **ชื่อ entity เป็นภาษาไทยหลุดไปอยู่ใน message ของ log** แก้เป็น `"Company"` + code
  → **`errors.json` 246 → 282 คีย์** ทั้ง th/en · **code ที่ระบบส่งได้จริง 275 ตัว เหลือไม่มีคำแปลแค่ 2 ตัว** (`ID_MISMATCH`, `OT_NOT_FOUND` — ของ flow ลงเวลา/OT ปล่อยไว้ให้ 3.5)
  → **ฝั่งหน้าจอ**: หน้าองค์กร/master data ดัก `response.data.error` เองอยู่แล้วเพื่อชี้ error ใต้ช่องกรอก (ดีกว่า toast) จึงคงไว้ — เปลี่ยนเฉพาะ**ทางหนีทีไล่** 23 จุดใน 13 ไฟล์ให้ผ่าน `apiError()` ไม่งั้น code ใหม่ของ 3.9 จะจบที่ข้อความกลาง "เกิดข้อผิดพลาด" ทุกครั้ง
  → ⚠️ **ตกไป 5 จุดใน `Program.cs` เพราะไล่ตามคำว่า `throw`/`return`** — `JwtBearerEvents` กับ rate limiter เขียน body เองด้วย `WriteAsJsonAsync` · **งาน 3.11 จับได้แล้วแก้ครบ** (ดูรายละเอียดที่ 3.11)

**ปิดท้าย**

- [x] **3.10** FluentValidation → ส่ง `field` + `code` แทนข้อความสำเร็จรูป — **42 จุด / 22 ไฟล์ ทุก flow** · validator ที่ยังมีข้อความไทยเหลือ **0** (2026-09-16)
  → **`details` เปลี่ยนรูปเป็น `{ field, code, message }`** (เดิม `{ field, error }` ที่ `error` เป็นข้อความ) · `field` เป็น camelCase ให้ตรงชื่อช่องในฟอร์ม · `message` เป็นอังกฤษสำหรับ developer ตาม D7
  → **rule ที่ไม่ได้ตั้ง code เองก็ได้คำแปล** — middleware แปลง error code ที่ FluentValidation ตั้งให้ (`NotEmptyValidator`, `MaximumLengthValidator` ฯลฯ) เป็น `VALIDATION_REQUIRED` / `VALIDATION_TOO_LONG` / `VALIDATION_OUT_OF_RANGE` ฯลฯ 8 ตัว · ของเดิมตกไปเป็นข้อความอังกฤษ default ของ library
  → 42 จุดที่เคยเขียนไทยใน `.WithMessage()` ได้ `.WithErrorCode()` เป็นของตัวเอง **28 code** (ข้อความไทยเดิมกลายเป็นคำแปล th ตรงตัว) · **`errors.json` 282 → 315 คีย์**
  → 🐞 **แก้ regression ที่ 3.6/3.7 ทำไว้** — `apiErrorTextDetailed` เช็ค code ก้อนกลางก่อน พอ `VALIDATION_ERROR` มีคำแปลอยู่แล้วมันจึง return ทันที ผู้ใช้ ticket/memo เลยเห็น "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง" แทนข้อความเฉพาะช่องที่เคยเห็น · แก้ลำดับเป็น **code ของ field → code ทั่วไป → ข้อความจาก server → code ก้อนกลาง → fallback** และ**เขียนเทสต์ 7 ตัวล็อกไว้** ([api-error.test.ts](packages/i18n/src/api-error.test.ts))
  → ⬜ `details[].field` ยังไม่มีหน้าจอไหนใช้ (ทุกหน้าโชว์ error ก้อนเดียว) — สัญญาฝั่ง API พร้อมแล้ว ฟอร์มที่อยากแปะข้อความใต้ช่องที่ผิดหยิบไปใช้ได้เลยโดยไม่ต้องแก้ API อีก
- [x] **3.11** สคริปต์วัดผล [`pnpm i18n:scan-api`](scripts/i18n-scan-api.mjs) + กวาดจุดที่เหลือของ flow ที่ปิดไปแล้ว (2026-09-16)
  → **ตรวจ 2 ด่านคู่กัน ไม่ใช่ด่านเดียวตามที่เขียนไว้ตอนแรก** — (1) ข้อความไทยที่จุด throw/return (2) **code ที่ API ส่งได้ทุกตัวมีคำแปลครบ th/en** · ด่านแรกผ่านอย่างเดียวไม่พอ เพราะเส้นทางที่ message เป็นอังกฤษแล้วแต่ code ยังไม่มีคำแปล ผู้ใช้ก็เห็นอังกฤษอยู่ดี (= ข้อ "เคสที่ยังไม่ได้ map" ในตรวจรับข้างล่าง) · `--max 0 --max-untranslated 0` ใช้เป็น gate ใน CI ได้ทั้งคู่
  → ⚠️ **อ่านทั้ง statement จนถึง `;` ไม่ใช่ทีละบรรทัด** ตามบทเรียนจาก 3.6 (นับแบบบรรทัดเดียวเคยพลาด throw ที่ขึ้นบรรทัดใหม่ไป 19 จุด) · ตัด comment ด้วยการเดินทีละตัวอักษร (รองรับ `@"…"` `$"…"` `"""…"""`) เพราะ comment ภาษาไทยเป็นเรื่องปกติของโปรเจกต์นี้ แต่ `//` ในสตริงก็มีจริง
  → **แยกผลตามงานในแผน** (`--task 3.5`) และมี `--show` แสดงข้อความไทยรายจุด เพื่อใช้เป็น worklist ตอนทำ 3.5/3.8 ได้เลย
  → 🐞 **สคริปต์จับของที่ 3.9 พลาดไป 5 จุดใน `Program.cs`** — `JwtBearerEvents` (OnChallenge/OnForbidden ทั้ง 2 scheme) กับ rate limiter เขียน response body เองด้วย `WriteAsJsonAsync` **ไม่ได้ขึ้นต้นด้วย `throw` หรือ `return`** จึงหลุดทุกด่านที่ไล่ตาม 2 คำนั้น · แก้ message เป็นอังกฤษครบ 5 จุด
  → 🐞 **401 ของ JwtBearer ส่ง code คนละตัวกับทั้งระบบ** — `UNAUTHORIZED` ทั้งที่อีก ~100 จุดใช้ `AppUnauthorizedException("UNAUTHENTICATED")` ความหมายเดียวกัน และ `UNAUTHORIZED` ไม่มีคำแปล → **token หมดอายุแล้วเจอ toast ผู้ใช้จะเห็นข้อความจาก server** · เปลี่ยนเป็น `UNAUTHENTICATED` ให้ตรงกับที่เหลือ (interceptor ทั้ง 4 ตัวดูจาก HTTP status ไม่ได้ดู code จึงไม่กระทบ) · `RATE_LIMIT_EXCEEDED` เพิ่มคีย์ใหม่ → **`errors.json` 315 → 316**
  → **ผลวัดแรก:** ไทยเหลือ **93 จุด / 36 ไฟล์** = 3.5 (52) + 3.8 (41) พอดี · 3.6/3.7/3.9 เป็น **0** ทั้งหมด (ยืนยันงานเดิมด้วยเครื่องมือคนละตัว) · code ที่ส่งได้ 316 ตัว **ไม่มีคำแปล 2 ตัว** (`ID_MISMATCH`, `OT_NOT_FOUND` — ของ 3.5 ตามที่ค้างไว้)
  → 💡 **รายงานคีย์ที่ไม่มีเส้นทางไหนส่งแล้วด้วย** (ไม่ใช่ตัวตัดสิน แค่เตือน) — เจอ 2 ตัว: `OVERLAPPING_OT` (มีคำแปลรออยู่ แต่ฝั่ง OT ยังไม่มีการเช็คทับซ้อนจริง — ไปผูกตอน 3.5) · `TICKET_NOT_IN_SCOPE` (โผล่แค่ใน comment ตัวอย่างของ `AppForbiddenException`)

**ตรวจรับ Phase 3**

- [ ] ยิง error เคสหลักครบ (401 หมดอายุ, 403, 404, 409 ชนกัน, 422) ได้ข้อความตามภาษาที่เลือก
- [ ] **ไม่มีข้อความไทยหลุดจาก API** — `pnpm i18n:scan-api --max 0` ผ่าน (ตอนนี้เหลือ 93 จุด = 3.5 + 3.8)
- [ ] **เคสที่ยังไม่ได้ map ไม่มีเหลือ** — `pnpm i18n:scan-api --max-untranslated 0` ผ่าน (ตอนนี้เหลือ 2 ตัวของ 3.5) · ผู้ใช้ต้องไม่เห็นค่าว่าง code ดิบ หรืออังกฤษจาก server
- [x] `dotnet test` ผ่าน — 311 pass / 1 skip (2026-09-16 · test ที่ assert ข้อความไทยแก้ครบตั้งแต่ 3.6–3.10)
- [ ] log ของ API อ่านออกบน Windows server (เดิมข้อความไทยใน console เพี้ยนเป็น mojibake)

---

### ⬜ Phase 4 — LINE notification · 0/3

> เฟสนี้แตะ DB และ job — แยกออกมาเพื่อให้ 3 เฟสแรกปล่อยได้ก่อนโดยไม่ต้องรอ
>
> 📄 **แผนละเอียดอยู่ที่ [`docs/notification-i18n-plan.md`](notification-i18n-plan.md)** (ร่าง 2026-09-16) — สำรวจโค้ดจริงแล้วพบว่า 3 งานย่อยข้างล่างนับแค่งานแปล **ยังไม่ได้นับงานรื้อโครง** ของจริงเป็น **16 งานย่อย / 4–5 วัน** และมีอีก 2 ก้อนที่แผนนี้ตกไป (การ์ดเลือกสีจากการอ่านคำไทย · LINE webhook 7 ไฟล์) · **D8 เคาะแล้ว (ภาษาต้นทางของคำแปล = en) · D9/D10/D11 รอเคาะ**

- [ ] **4.1** เพิ่ม `Employee.PreferredLanguage` (varchar(5), default `th`) + migration + sync ค่าจากหน้าตั้งค่าทั้งสองแอป (`PATCH /me/preferences`)
  → ⚠️ **จำเป็นเฉพาะถ้า D9 เลือกทาง ค.** — ถ้าเลือก "พนักงาน = ไทย · ผู้แจ้งภายนอก = อังกฤษ" ไม่ต้องมีฟิลด์นี้เลย เพราะ `NotificationOutbox.RecipientEmployeeId == null` บอกได้อยู่แล้วว่าผู้รับเป็นผู้แจ้งภายนอก
  → **ใช้เพื่อเลือกภาษาของ LINE notification เท่านั้น** ไม่ได้เป็นตัวกำหนดภาษา UI (UI ใช้ cookie ตาม D2)
  → ผู้แจ้งภายนอกไม่มี `Employee` record — ถ้าต้องการส่ง notification เป็นภาษาของเขา ต้องเพิ่มฟิลด์เดียวกันที่ `ExternalReporter` ด้วย (ตัดสินใจตอนเริ่มเฟส)
- [ ] **4.2** เปลี่ยน `NotificationOutbox.PayloadJson` จากข้อความสำเร็จรูป → `{ templateKey, params }` แล้ว render ตอนส่งตามภาษาผู้รับ **(ต้องอ่าน payload เก่าได้ด้วยช่วงเปลี่ยนผ่าน)**
- [ ] **4.3** template ข้อความ LINE ทั้ง 3 ภาษา + หัวการ์ด Flex → `LineFlexBuilder`, `LeaveNotificationJob`, `DailyAttendanceReportJob`
  → 🔴 **ต้องทำ N0 ก่อน** — `ResolveTicketStyle` เลือกสีหัวการ์ดด้วย `message.Contains("ปฏิเสธ")` 15 เงื่อนไข พอข้อความไม่ใช่ไทย **การ์ดทุกใบตกเป็นสีเขียว "งานใหม่"** · ทางแก้คืออ่าน `NotificationOutbox.EventType` ที่มีอยู่แล้วแทน
  → ⬜ **ตกไป 2 ก้อน** — การ์ดอื่นใน `LineFlexBuilder` (OTP/เช็คอิน/เช็คเอาต์/สรุปวันนี้) และ **LINE webhook 7 ไฟล์ 38 ข้อความ** ที่ตอบกลับตอนผู้ใช้ทักแชท · เก็บไว้ที่ N3 ของแผนละเอียด
> ~~4.4 master data~~ → ย้ายไปทำก่อนแล้วใน **Phase M** ตามที่เคาะ D4

**ตรวจรับ Phase 4**

- [ ] เคลียร์คิว notification ก่อน deploy + ทดสอบ payload รูปแบบเก่ายังส่งออกได้
- [ ] ผู้ใช้ที่ตั้งภาษา en ได้รับการ์ด LINE เป็นอังกฤษ, ที่ตั้ง th ยังได้ไทยเหมือนเดิม
- [ ] `pnpm test:api` ผ่าน

---

### ⬜ Phase 5 — ภาษาอินโดนีเซีย · 0/4

**เงื่อนไขเริ่ม:** `en` ผ่าน UAT แล้ว **และ** มีคนรับผิดชอบตรวจคำแปลอินโดฯ — ถ้าไม่มี จบที่ 2 ภาษาตามที่ตกลงไว้

- [ ] **5.1** copy `messages/en` → `messages/id` แล้วแปล + ให้เจ้าของภาษา/เจ้าของงานตรวจ
- [ ] **5.2** เปิดตัวเลือก `id` ในหน้าตั้งค่าทั้งสองแอป
- [ ] **5.3** ตรวจ format วันที่/ตัวเลขของ `id-ID` (คั่นหลักพัน `.` ทศนิยม `,` — ต่างจาก th/en)
- [ ] **5.4** ตรวจ font: `Noto_Sans_Thai` subset `['thai','latin']` ครอบคลุมอักษรละตินอยู่แล้ว — ยืนยันว่าไม่ต้องเพิ่ม

---

## 5. สรุปไทม์ไลน์

| Phase | งาน | ประเมิน | ปล่อยขึ้น prod ได้เองไหม |
|---|---|---:|---|
| 0 | วางรากฐาน (ไม่เปลี่ยนพฤติกรรม) + เครื่องมือ export/import Excel | 1.5–2 วัน | ได้ (ไม่มีอะไรเปลี่ยน) |
| M | Master data หลายภาษา (DB + API + ฟอร์ม Admin) | 2.5–3.5 วัน | ได้ — **มี migration** ต้องรัน `migration-v1-1-2.sql` ก่อน copy publish |
| 1 | LIFF th+en (รวม external + หน้าถามภาษา) | 4–5 วัน | ได้ (ต้องมี M ขึ้นก่อน) |
| 2 | Admin th+en | 5–7 วัน | ได้ |
| 3 | API error/validation (**อังกฤษล้วน** ตาม D7 · 465 จุดที่มีข้อความไทย) | 3–4.5 วัน | ได้ |
| 4 | Notification (ดู [แผนละเอียด](notification-i18n-plan.md)) | ~~2–3~~ **4–5 วัน** | ได้ (ระวังคิวค้าง) |
| 5 | ภาษาอินโดฯ | 1–2 วัน | ได้ |
| | **รวม** | **19–27 วันทำงาน** | |

> ตัวเลขนี้รวมเวลา AI แปลร่างแล้ว (ไม่กี่ ชม./ภาษา) แต่**ไม่รวมเวลารอคนตรวจคำแปล** ซึ่งขึ้นกับคิวของคนตรวจ — วางแผนเผื่อไว้ต่างหาก

---

## 6. Convention การตั้งชื่อ key

```
<namespace>.<หน้าจอหรือกลุ่ม>.<ความหมาย>

common.action.save              → บันทึก / Save
common.state.loading            → กำลังโหลด... / Loading...
status.ticket.InProgress        → กำลังดำเนินการ / In progress   (ใช้ค่า enum ตรง ๆ เป็นส่วนท้าย)
errors.TICKET_CONCURRENCY_CONFLICT → ใช้ error code จาก API ตรง ๆ
leave.new.title                 → ยื่นใบลา / New leave request
ticket.detail.assignSheet.title
```

กติกา

1. key เป็นภาษาอังกฤษเสมอ, ไม่ใส่ข้อความไทยเป็น key
2. ส่วนท้ายของ key ที่ผูกกับ enum ให้สะกดตรงกับค่าใน `@hrms/shared-types` เป๊ะ ๆ เพื่อให้ map แบบ ``t(`status.ticket.${status}`)`` ได้
3. ตัวแปรใช้ชื่อที่สื่อความหมาย: `{count}`, `{name}`, `{date}` — ห้ามใช้ `{0}`
4. ข้อความที่ใช้เกิน 1 แอป → ต้องอยู่ใน `@hrms/i18n` ไม่ใช่ในแอปใดแอปหนึ่ง
5. ห้ามประกอบประโยคด้วยการต่อ string (`t('a') + name + t('b')`) — ใช้ตัวแปรใน message เดียว เพราะลำดับคำแต่ละภาษาไม่เหมือนกัน

---

## 6.1 วิธีได้มาซึ่งคำแปล — AI แปลร่าง + คนตรวจ + เก็บเป็นไฟล์ (D6 — เคาะแล้ว 2026-09-14)

### เลือกทางไหน

| ทาง | เวลาแปล ~4,000–5,000 ข้อความ | ตอน runtime | ปัญหา |
|---|---|---|---|
| **AI แปลร่าง → คนตรวจ → commit JSON (แนะนำ)** | ไม่กี่ ชม. ต่อภาษา + เวลาตรวจ | ไม่แตะ AI เลย อ่านจากไฟล์ | ต้องมีคนตรวจศัพท์เฉพาะ |
| แปลมือทั้งหมด | หลายสัปดาห์ | ไม่แตะ AI | ช้าเกินจนไม่คุ้ม |
| ตาราง translation ใน DB + UI ให้ admin กรอก | หลายสัปดาห์ (ยังต้องกรอกมืออยู่ดี) | query DB ทุก request | ต้องสร้าง UI + cache + ไม่มี version control ย้อนดูไม่ได้ว่าใครแก้คำไหน |
| AI แปลสดตอน runtime | — | เรียก API ทุกครั้ง | ช้า, มีค่าใช้จ่ายต่อ request, คำแปลไม่คงที่ (เปิดสองครั้งได้คำไม่เหมือนกัน), เน็ตล่ม = แอปพัง |

**ข้อสรุป: AI แปลเป็น "เครื่องมือตอนสร้าง" ไม่ใช่ "ส่วนหนึ่งของระบบ"** ผลลัพธ์คือไฟล์ JSON ธรรมดาใน repo — ระบบที่รันจริงไม่รู้จัก AI เลย ทำให้เร็ว ไม่มีค่าใช้จ่ายต่อการใช้งาน คำแปลคงที่ และ review ผ่าน PR ได้เหมือนโค้ดทั่วไป

### ขั้นตอนทำงานจริง — ผู้ตรวจทำงานบน Excel ไม่ใช่ JSON

```
1. pnpm i18n:scan                    สกัดข้อความไทยจากโค้ด → messages/th/*.json
2. AI แปล th → en (ทีละ namespace ไม่แปลรวดเดียวทั้งก้อน) → messages/en/*.json (ร่าง)
3. pnpm i18n:export --locale en      JSON → i18n-review-en-<date>.xlsx  ส่งผู้ตรวจ
4. ผู้ตรวจแก้ในคอลัมน์ en + ติ๊กสถานะ ในไฟล์ Excel (ไม่ต้องเปิดโค้ด)
5. pnpm i18n:import <file.xlsx>      Excel → เขียนกลับ JSON + รายงานแถวที่ถูกปฏิเสธ
6. commit เข้า repo ผ่าน PR ปกติ    (JSON คือ source of truth — Excel เป็นแค่ไฟล์ทำงานชั่วคราว)
7. ทำซ้ำข้อ 2–6 สำหรับ id ใน Phase 5
```

**ทำไมเป็น .xlsx ไม่ใช่ .csv** — CSV ภาษาไทยเปิดใน Excel บน Windows มักเพี้ยน และตอนผู้ตรวจกด save Excel จะเซฟกลับเป็น ANSI ทำให้ภาษาไทยพังทั้งไฟล์โดยไม่รู้ตัว ส่วน .xlsx ไม่มีปัญหา encoding, แบ่งชีตตาม namespace ให้แบ่งงานกันตรวจได้, ล็อกคอลัมน์ต้นฉบับได้, ทำ dropdown สถานะได้ — สคริปต์รับ .csv (UTF-8) กลับได้ด้วยเผื่อผู้ตรวจบางคนสะดวก

**โครงไฟล์ Excel** (1 ชีตต่อ namespace + ชีต `GLOSSARY` ท้ายสุด)

| คอลัมน์ | ใครแก้ | หมายเหตุ |
|---|---|---|
| `key` | 🔒 ล็อก | ตัวเชื่อมกลับ JSON — ห้ามแก้ |
| `th` | 🔒 ล็อก | ต้นฉบับ ให้ผู้ตรวจอ่านเทียบ |
| `en` (หรือ `id`) | ✏️ ผู้ตรวจ | ร่างจาก AI มาให้แล้ว แก้ทับได้เลย |
| `context` | 🔒 ล็อก | หน้าจอ/ไฟล์ที่ใช้ + ประเภท (ปุ่ม / หัวข้อ / ข้อความเตือน / toast) — คนตรวจไม่เห็นหน้าจอ ต้องมีอันนี้ถึงจะตัดสินคำได้ |
| `must_review` | 🔒 ล็อก | ติ๊กอัตโนมัติสำหรับ 3 กลุ่มเสี่ยง (ปุ่มลบ/ย้อนกลับไม่ได้, ข้อความเตือน, privacy/กฎหมาย) — แถวเหล่านี้ import ไม่ได้ถ้าสถานะยังไม่ `reviewed` |
| `status` | ✏️ ผู้ตรวจ | dropdown: `draft` / `reviewed` / `needs_context` |
| `note` | ✏️ ผู้ตรวจ | ถามกลับ dev หรือบอกเหตุผลที่แก้ |

**กติกาตอนนำกลับ (import) — สคริปต์ต้องบังคับ ไม่ใช่แค่เตือน**

- แถวที่ `key` ไม่พบใน JSON หรือ `th` ถูกแก้ → ปฏิเสธทั้งแถว (แปลว่าไฟล์เก่าหรือคนตรวจแก้ผิดช่อง)
- ตัวแปร ICU ต้องครบเหมือนต้นฉบับ — `{count}`, `{name}`, `{count, plural, …}` หายหรือสะกดผิด → ปฏิเสธ พร้อมบอกว่าขาดตัวไหน
- แถว `must_review` ที่สถานะยัง `draft` → ไม่เขียนทับ (ยังใช้ร่างเดิม) และรายงานแยกให้เห็นว่ายังไม่มีคนตรวจ
- ขึ้นบรรทัดใหม่ในเซลล์ → แปลงเป็น `\n` ตามที่ JSON ใช้
- จบทุกครั้งพิมพ์สรุป: เขียนกี่แถว / ปฏิเสธกี่แถว (พร้อม key) / ยังค้างตรวจกี่แถว
- ไฟล์ .xlsx **ไม่ commit เข้า repo** — เก็บไว้ที่ `docs/i18n-review/` (อยู่ใน .gitignore) หรือส่งทางช่องทางปกติ เพราะ JSON คือของจริง

### Glossary — ต้องมีก่อนเริ่มแปล

AI แปลคำเดียวกันไม่เหมือนกันในแต่ละไฟล์ถ้าไม่ตรึงไว้ (เช่น "ใบแจ้งเรื่อง" อาจได้ทั้ง ticket / request / report ในหน้าเดียวกัน) ให้ทำ `packages/i18n/GLOSSARY.md` ตรึงศัพท์หลักก่อน แล้วแนบไปกับทุกครั้งที่สั่งแปล

| ไทย | en | id | หมายเหตุ |
|---|---|---|---|
| ใบแจ้งเรื่อง | ticket | tiket | ห้ามใช้ request/report |
| บันทึกข้อความ | memo | memo | |
| ลงเวลาเข้า/ออก | check in / check out | absen masuk / keluar | |
| ลาพักร้อน / ลากิจ / ลาป่วย | annual / personal / sick leave | cuti tahunan / izin / sakit | |
| ผู้แจ้ง | requester | pelapor | |
| รอตรวจรับ | awaiting acceptance | menunggu verifikasi | |
| เบิกค่าใช้จ่าย | expense claim | klaim biaya | |

(ตารางนี้เป็นตัวตั้งต้น — เติมให้ครบตอนเริ่ม Phase 1 และให้คนที่รู้งาน HR ตรวจ)

### สิ่งที่ AI แปลไม่ได้ ต้องคนตัดสิน

- **ศัพท์เฉพาะองค์กร** ชื่อแผนก ตำแหน่ง ระบบภายใน ที่มีคำเรียกเฉพาะของบริษัท
- **ข้อความที่มีผลทางกฎหมาย/นโยบาย** เช่น privacy notice ในหน้าลงทะเบียนผู้แจ้งภายนอก
- **ข้อความเตือนก่อนทำสิ่งที่ย้อนกลับไม่ได้** แปลผิดความหมายกลับด้านได้
- **คำแปลอินโดนีเซีย** ต้องมีคนอ่านออกตรวจ (เงื่อนไขเริ่ม Phase 5)

---

## 7. ความเสี่ยงและการรับมือ

| ความเสี่ยง | ผลกระทบ | การรับมือ |
|---|---|---|
| แปลไม่ครบ มีข้อความไทยตกค้างในหน้าอังกฤษ | ผู้ใช้เจอภาษาปนกัน | `scripts/i18n-scan.mjs` ต้องเหลือ 0 ก่อนปิดแต่ละเฟส + เปิดโหมด "แสดง key ที่หาไม่เจอ" ตอน dev |
| ข้อความอังกฤษยาวกว่าไทย ทำ layout พัง | sidebar/ปุ่ม/badge ล้น | ตรวจหน้าจอหลักทุกหน้าในโหมด en ตอนจบแต่ละเฟส, ระวัง sidebar กับป้ายสถานะ ticket เป็นพิเศษ |
| แก้ไฟล์ 242 ไฟล์ = เสี่ยง regression | ฟีเจอร์เดิมพัง | ทำทีละโมดูลตามลำดับในเฟส, แต่ละโมดูลจบแล้ว commit แยก, ห้ามแก้ logic ปนกับการแปล |
| label map ซ้ำสองแอป แก้ที่เดียวลืมอีกที่ | สถานะแสดงไม่ตรงกัน | Phase 0.4 ย้ายมารวมที่ `@hrms/i18n` ก่อนเริ่มแปล |
| notification ที่ค้างในคิวตอน deploy Phase 4 | ข้อความส่งไม่ออก/พัง | รองรับ payload ทั้งสองรูปแบบชั่วคราว + เคลียร์คิวก่อน deploy |
| วันที่เป็นพุทธศักราชตอนภาษาไทย แต่ต้องเป็น ค.ศ. ตอน en/id | ผู้ใช้อ่านปีผิด | รวม formatter ไว้ที่เดียวใน Phase 0.5 แล้วเทสต์ทั้ง 3 locale |
| คำแปลอินโดฯ ไม่มีคนตรวจ | ปล่อยคำแปลผิดออกไป | Phase 5 มีเงื่อนไขเริ่ม — ไม่มีคนตรวจก็ไม่ทำ |
| AI แปลศัพท์เดียวกันไม่เหมือนกันในแต่ละไฟล์ | ผู้ใช้เห็นคำเรียกสิ่งเดียวกันหลายแบบในหน้าเดียว | ทำ `GLOSSARY.md` ก่อนแปล (งาน 0.8) + แนบไปกับทุกครั้งที่สั่งแปล + ตรวจความสม่ำเสมอตอนจบเฟส |
| AI แปลถูกตามตัวอักษรแต่ผิดบริบท (ปุ่มลบ/ข้อความเตือน/privacy notice) | ผู้ใช้กดผิดจนข้อมูลเสียหาย | บังคับให้คนตรวจ 3 กลุ่มนี้เสมอ ไม่ปล่อยผ่านแม้ AI มั่นใจ (ดูข้อ 6.1) |

---

## 8. การตรวจสอบ (ทำในทุกเฟส)

1. `pnpm i18n:scan` — ต้องไม่มีข้อความไทยฝังในไฟล์ที่แปลแล้ว
2. build ทั้งสองแอปผ่าน (`pnpm build:liff`, `pnpm build:admin`)
3. `pnpm test:api` ยังผ่าน (เฉพาะเฟสที่แตะ API)
4. เดิน flow ด้วยตาทีละภาษา — LIFF ต้องเทสต์ผ่าน LINE จริง ไม่ใช่แค่ browser
5. ตรวจว่า refresh หน้าแล้วภาษายังคงเดิม และไม่มีจอกระพริบภาษาไทยก่อน hydrate
6. **ทุกไฟล์ภาษามีคีย์ครบตรงกัน** — ไม่มีคีย์ที่มีใน `th` แต่หายใน `en`/`id` (ให้ `i18n:scan` เช็คให้)
7. **ศัพท์ใน GLOSSARY ถูกใช้ตรงกันทุกหน้า** — สุ่มตรวจคำหลัก (ใบแจ้งเรื่อง, ผู้แจ้ง, รอตรวจรับ) ว่าไม่มีคำแปลหลุดเป็นแบบอื่น

---

## 9. สิ่งที่จงใจไม่ทำในรอบนี้

- แปลข้อมูลที่ผู้ใช้กรอกเอง (หัวข้อใบแจ้ง, เหตุผลการลา, คอมเมนต์, ชื่อไฟล์แนบ)
- แปลหัวคอลัมน์ใน Excel export และ PDF memo — เป็นเอกสารทางการที่ส่งต่อภายนอก ควรคงภาษาไทย เว้นแต่จะมีข้อกำหนดชัดเจนว่าต้องมีฉบับอังกฤษ
- แปล audit log ที่บันทึกไปแล้ว (ข้อมูลย้อนหลังคงรูปเดิม)
- แปล**ย้อนหลัง**ให้ snapshot/ประวัติที่บันทึกไปแล้ว (เช่น ชื่อเหตุผลปิดงานที่ค้างอยู่ในใบแจ้งเก่า) — ชื่อ master data ตัวจริงแปลได้ใน Phase M แต่ค่าที่ถ่ายสำเนาไว้ในเอกสารเดิมคงไว้ตามที่บันทึก
- ชื่อวันหยุด (`Holiday.Name`) — ไม่รวมใน Phase M รอบแรก ถ้าต้องการค่อยเพิ่มด้วย pattern เดียวกัน
- URL-based locale routing (`/en/...`) — ดูเหตุผลใน D2
- **ย้ายคำแปลไปเก็บในตาราง DB + หน้าจอให้ HR แก้คำเองโดยไม่ต้อง deploy** — เหตุผลเดียวที่จะทำคือ "อยากแก้คำได้ทันทีเอง" ซึ่งในทางปฏิบัติข้อความอย่าง "บันทึก"/"ยกเลิก" แทบไม่มีใครขอแก้หลังแปลเสร็จ ถ้าวันหนึ่งมีความต้องการจริง ค่อยย้ายได้โดยไม่ต้องรื้อโค้ดที่เรียก `t()` (เปลี่ยนแค่ที่มาของ messages ใน `i18n/request.ts`)
- **แปลเนื้อหาที่ผู้แจ้งภายนอกกรอกเข้ามาแบบอัตโนมัติ** — เคสจริงที่จะเกิดคือผู้แจ้งอินโดฯ พิมพ์รายละเอียดปัญหาเป็นภาษาอินโดฯ แล้วช่างไทยต้องอ่าน อันนี้คือ AI แปลตอน runtime ซึ่งเป็นคนละงานกับ i18n ของ UI มีต้นทุนและความเสี่ยงของตัวเอง — ถ้าจำเป็นให้แยกเป็นแผนต่างหาก

---

## 10. สิ่งที่ขอไฟเขียวก่อนลงมือ

| # | คำถาม | ข้อเสนอ | เคาะแล้ว | สรุปที่ตกลง |
|---|---|---|---|---|
| D1 | ใช้ library อะไร | `next-intl` โหมดไม่มี URL routing | ✅ 2026-09-14 | ตามข้อเสนอ |
| D2 | เก็บภาษาที่ไหน | cookie `hrms-locale`, ไม่แตะ URL | ✅ 2026-09-14 | cookie → `liff.getAppLanguage()` → th · ไม่ผูก DB · **ทุก role สลับภาษาเองได้** |
| D3 | เก็บคำแปลที่ไหน | `packages/i18n` + per-app namespace | ✅ 2026-09-14 | ตามข้อเสนอ |
| D4 | master data ใน DB | รอบนี้ไม่แปล ยกไป 4.4 | ✅ 2026-09-14 | **ต่างจากข้อเสนอ — ทำตั้งแต่แรก** เป็น Phase M (16 ตาราง, additive, API ส่ง 3 ค่า, fallback locale→en→th) |
| D5 | ลำดับเฟส + อินโดฯ | LIFF ก่อน Admin, `id` ทำหลัง en ผ่าน UAT | ✅ 2026-09-14 | `id` ใช้กับ **external reporter** เท่านั้น · fallback ของ `id` คือ **en** ไม่ใช่ th |
| D6 | คำแปลมาจากไหน | AI แปลร่าง → คนตรวจ → commit JSON ใน repo (ไม่ใช่ตาราง DB, ไม่แปลสดตอน runtime) — ดูข้อ 6.1 | ✅ 2026-09-14 | ตามข้อเสนอ · ต้องทำ GLOSSARY (งาน 0.8) ก่อนสั่งแปล |
| D7 | ภาษาของ `message` ที่ API ส่งกลับ | อังกฤษล้วน (ไม่ส่งไทย ไม่ส่งสองภาษาคู่กัน) — ดู [D7](#d7--ภาษาของ-message-ที่-api-ส่งกลับ-เคาะแล้ว-2026-09-16-อังกฤษล้วน) | ✅ 2026-09-16 | ตามข้อเสนอ · `message` = สำหรับ developer · ผู้ใช้เห็นคำแปลจาก `code` เสมอ · ผู้ใช้เห็น `message` = bug |

| D8 | **ภาษาต้นทางของคำแปล** (ต้นฉบับที่ส่งให้แปลต่อเป็นภาษาอื่น) | **อังกฤษ** ไม่ใช่ไทย | ✅ 2026-09-16 | ยืนยันสิ่งที่ข้อ 5.1 ทำอยู่แล้ว (`copy messages/en → messages/id`) · คู่ `en→xx` มีคนตรวจและเครื่องมือรองรับมากกว่า `th→xx` · **ไม่ได้ตัดสินว่าผู้ใช้เห็นภาษาอะไร** นั่นคือ D9 |

**เคาะครบ 8 ข้อ** สิ่งที่ยังค้าง: "ใครตรวจคำแปลอินโดฯ" (เงื่อนไขของ Phase 5 ไม่ขวางเฟสอื่น) · **D9/D10/D11 ของ Phase 4** อยู่ใน [`notification-i18n-plan.md`](notification-i18n-plan.md#3-การตัดสินใจ)

---

## 11. บันทึกการทำงาน (log)

เติมทุกครั้งที่ปิดงานย่อยหรือปิดเฟส เพื่อย้อนตรวจได้ว่าอะไรทำไปแล้ว ด้วย commit ไหน

| วันที่ | เฟส/งาน | สิ่งที่ทำ | commit | ผู้ทำ | หมายเหตุ |
|---|---|---|---|---|---|
| 2026-09-16 | **Phase 4 (ร่างแผน)** | สำรวจโค้ด notification จริงแล้วแยกเป็น [`notification-i18n-plan.md`](notification-i18n-plan.md) — **327 ข้อความ** ในเส้นทาง LINE (การ์ด Flex 62 · ticket 117 · memo 53 · job 57 · webhook 38) · แตกเป็น **16 งานย่อย 5 เฟส (N0–N4)** โดย **N0 เป็น refactor ที่ผู้ใช้ไม่เห็นความเปลี่ยนแปลง ทำได้ทันทีโดยไม่ต้องรอเคาะภาษา** · เคาะ **D8 = ภาษาต้นทางของคำแปลเป็นอังกฤษ** · D9 (ผู้รับเห็นภาษาอะไร) / D10 (template อยู่ที่ไหน) / D11 (ผู้แจ้งภายนอก) รอเคาะ | (ยังไม่ commit) | | 🔴 **เจอ 2 ก้อนที่แผนเดิมตกไป** — (1) `ResolveTicketStyle` เลือกสีหัวการ์ดจาก `message.Contains("ปฏิเสธ")` 15 เงื่อนไข ข้อความไม่ใช่ไทยเมื่อไหร่การ์ดตกเป็นสีเขียว "งานใหม่" ทุกใบ **(เป็นบั๊กอยู่แล้ววันนี้: แก้ข้อความ 1 คำ สีเปลี่ยนเงียบ ๆ)** (2) LINE webhook 7 ไฟล์ 38 ข้อความ ไม่มีในแผนเลย · 💡 **`RecipientEmployeeId == null` บอกได้อยู่แล้วว่าผู้รับเป็นผู้แจ้งภายนอก** → แยกภาษาตามกลุ่มผู้รับได้โดยไม่ต้องมี migration และไม่ต้องมีหน้าตั้งค่า · ประเมินใหม่ 2–3 → **4–5 วัน** |
| 2026-09-16 | **Phase 3.11** | **สคริปต์วัดผล `pnpm i18n:scan-api`** ([scripts/i18n-scan-api.mjs](scripts/i18n-scan-api.mjs)) · **ตรวจ 2 ด่านคู่กัน** ไม่ใช่แค่ด่านเดียวตามที่วางไว้ตอนแรก — (1) ข้อความไทยที่จุด throw/return (2) **code ที่ API ส่งได้ทุกตัวมีคำแปลครบ th/en** เพราะด่านแรกผ่านอย่างเดียวไม่พอ: เส้นทางที่ message เป็นอังกฤษแล้วแต่ code ยังไม่มีคำแปล ผู้ใช้ก็เห็นอังกฤษอยู่ดี · อ่านทั้ง statement จนถึง `;` และตัด comment ทีละตัวอักษร (`@"…"` `$"…"` `"""…"""`) ตามบทเรียนจาก 3.6 · แยกผลตามงานในแผน (`--task 3.5 --show` = worklist ราย field) · gate CI ได้ทั้ง 2 ด่าน (`--max`, `--max-untranslated`) · **ผลวัดแรก:** ไทยเหลือ **93 จุด** = 3.5 (52) + 3.8 (41) พอดี **3.6/3.7/3.9 เป็น 0 ทั้งหมด** (ยืนยันงานเดิมด้วยเครื่องมือคนละตัว) · code ที่ส่งได้ 316 ตัว ไม่มีคำแปล 2 ตัว (ของ 3.5) · **ตรวจแล้ว:** build API ผ่าน · `dotnet test` 311 pass/1 skip = เท่า baseline · node test 41 pass/2 fail = เท่า baseline · `i18n:scan` ไม่ขยับ (liff 3 / admin 748) | (ยังไม่ commit) | | 🐞 **สคริปต์จับของที่ 3.9 พลาด 5 จุดใน `Program.cs` ทันที** — `JwtBearerEvents` (OnChallenge/OnForbidden ทั้ง 2 scheme) กับ rate limiter เขียน response เองด้วย `WriteAsJsonAsync` **ไม่ได้ขึ้นต้นด้วย `throw` หรือ `return`** จึงหลุดทุกด่านที่ไล่ตาม 2 คำนั้น · **บทเรียน: ตัววัดต้องไล่ตาม "ทางออกของ error" ไม่ใช่ตาม keyword ที่คุ้นตา** · พ่วงมาอีกบั๊ก: 401 ของ JwtBearer ส่ง code `UNAUTHORIZED` คนละตัวกับที่ทั้งระบบใช้ (`UNAUTHENTICATED` ~100 จุด) **และไม่มีคำแปล** → token หมดอายุแล้วเจอ toast ผู้ใช้จะเห็นข้อความจาก server · เปลี่ยนให้ตรงกัน + เพิ่มคีย์ `RATE_LIMIT_EXCEEDED` (`errors.json` 315 → 316) |
| 2026-09-16 | **Phase 3.10** | **validator ของ FluentValidation ทุก flow — 42 จุด / 22 ไฟล์** (ทำก่อน 3.5/3.8 เพราะ flow ลา/OT/ลงเวลา/เบิกค่าใช้จ่าย **ยังไม่ได้เปิดใช้จริง** ส่วน validator กระทบ ticket/memo ที่ใช้อยู่ทุกวัน) · **`details` เปลี่ยนรูปจาก `{ field, error }` เป็น `{ field, code, message }`** — `field` เป็น camelCase ให้ตรงชื่อช่องในฟอร์ม, `code` ใช้หาคำแปล, `message` อังกฤษสำหรับ developer · **middleware แปลง error code ที่ FluentValidation ตั้งให้เอง** (`NotEmptyValidator`, `MaximumLengthValidator`, `InclusiveBetweenValidator` ฯลฯ) เป็น `VALIDATION_*` 8 ตัว → rule ที่ไม่ได้ตั้ง code เองก็ยังได้คำแปล ไม่ตกไปเป็นข้อความอังกฤษ default ของ library · 42 จุดที่เคยเขียนไทยใน `.WithMessage()` ได้ `.WithErrorCode()` เป็นของตัวเอง 28 code · **`errors.json` 282 → 315 คีย์ th/en** · **ตรวจแล้ว:** build API ผ่าน · `dotnet test` 311 pass/1 skip = เท่า baseline · `tsc` admin+liff ผ่าน · `next build` admin 51 route + liff 32 route ผ่าน · node test **41 pass**/2 fail (baseline 34/2 + เทสต์ใหม่ 7) · `i18n:scan` ไม่ขยับ · validator ที่มีข้อความไทยเหลือ **0** | (ยังไม่ commit) | | 🐞 **เจอ regression ที่ 3.6/3.7 ทำไว้เอง** — `apiErrorTextDetailed` เช็ค code ก้อนกลางก่อน พอ `VALIDATION_ERROR` มีคำแปลอยู่แล้วมันเลย return ทันที **ผู้ใช้ ticket/memo จึงเห็น "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง" แทนข้อความเฉพาะช่องที่เคยเห็นก่อนหน้านี้** (เช่น "กรุณาเลือกผู้ร่วมงานอย่างน้อย 1 คน") · แก้ลำดับเป็น code ของ field → code ทั่วไป → ข้อความจาก server → code ก้อนกลาง → fallback แล้วเขียนเทสต์ 7 ตัวล็อกไว้ที่ `packages/i18n/src/api-error.test.ts` · **บทเรียน: การเพิ่มคำแปลให้ code ก้อนกลางทำให้ code เฉพาะเจาะจงถูกบังได้ ต้องเรียงจากเฉพาะเจาะจงที่สุดเสมอ** |
| 2026-09-16 | **Phase 3.9** | **master data + org + auth + upload — 129 จุด / 59 ไฟล์** (ตีความ "ก้อนสุดท้ายที่เหลือ" = ทุกอย่างที่ไม่ใช่ 3.5 กับ 3.8 · 17 feature folder + 3 controller + 3 service ของ Infrastructure) · **`LocalFileStorageService` เลิกโยน `InvalidOperationException`** ที่ตกไป 500 `INTERNAL_ERROR` หันไปใช้ `BadRequestException` พก code (ไฟล์ใหญ่เกิน/ชนิดไม่รองรับ/นามสกุลไม่ตรงเนื้อหา = ความผิดฝั่งผู้เรียก ต้องเป็น 400) แล้วให้ `UploadController` เลิกดักเอง — ของเดิมยุบทุกเคสเป็น `UPLOAD_REJECTED` ก้อนเดียวพร้อมข้อความไทย · **แตก `FORBIDDEN` ของ upload 3 จุดที่คนละความหมาย** เป็น `UPLOAD_EXPENSE_FORBIDDEN`/`UPLOAD_MEMO_FORBIDDEN`/`UPLOAD_DELETE_FORBIDDEN` · **`KeyNotFoundException` ~60 จุด → `NotFoundException(entity, id, code)`** · `AppForbiddenException` ที่ไม่มี code 14 จุดได้ code แยก · **`errors.json` 246 → 282 คีย์ th/en** · **ฝั่งหน้าจอ**: หน้าองค์กร/master data ดัก code เองเพื่อชี้ error ใต้ช่องกรอกอยู่แล้ว (คงไว้เพราะดีกว่า toast) เปลี่ยนเฉพาะ**ทางหนีทีไล่ 23 จุด / 13 ไฟล์** ให้ผ่าน `apiError()` · **ตรวจแล้ว:** build API ผ่าน · `dotnet test` 311 pass/1 skip = เท่า baseline · `tsc` admin+liff ผ่าน · `next build` admin 51 route + liff 32 route ผ่าน · node test 34 pass/2 fail = เท่า baseline · **code ที่ระบบส่งได้จริง 275 ตัว ไม่มีคำแปลเหลือ 2 ตัว** (`ID_MISMATCH`, `OT_NOT_FOUND` ของ flow ลงเวลา/OT → 3.5) · throw ที่มีไทยทั้งระบบ 218 → **93** (= 3.5 52 + 3.8 41) · `i18n:scan` admin 754 → 748 (ข้อความไทยที่เป็น fallback ถูกแทนด้วย `apiError()`) | (ยังไม่ commit) | | **บั๊กที่เจอ**: ① `LeaveBalanceController` ส่ง `error` เป็น**ข้อความไทย** ไม่ใช่ code → `INVALID_YEAR` ② `ImportEmployeeCommand` ส่ง `new NotFoundException("บริษัท", …)` ทำให้ชื่อ entity ภาษาไทยหลุดไปอยู่ใน log · เทสต์ที่ต้องแก้ตาม 1 ตัว (`AddEmployeeRoleIntegrationTests` assert ข้อความไทย → assert `Code == "ROLE_NOT_FOUND"`) · **ทำ 3.9 ก่อน 3.5/3.8 ตามที่สั่ง** |
| 2026-09-16 | **Phase 3.7** | **flow Memo ทั้งหมด — 100 จุด / 33 ไฟล์** (`Memos` + `MemoReports` + `MemoController`) · **แตก code ที่กว้างเกินไป 3 ตัว**: `MEMO_NOT_APPROVED` (5 ข้อความ → 5 code ตามการกระทำ) ตามที่ 3.3 เตือนไว้ · **`MEMO_STEP_KIND_MISMATCH` (3) และ `DUPLICATE_NAME` (3) ที่ไม่อยู่ในรายการเตือนเดิมแต่กว้างพอกัน** → `MEMO_STEP_IS_ACTION`/`MEMO_STEP_IS_APPROVAL` และ `DUPLICATE_MEMO_TYPE`/`_CATEGORY`/`_SUB_CATEGORY` (ของเดิมเหลือแค่ "ชื่อนี้มีอยู่แล้ว" ซึ่งไม่บอกว่าชนกับอะไร) · code เดิมทั้ง 3 ตัวถูกลบทิ้งจากทั้งโค้ดและ catalog · **`KeyNotFoundException` 33 จุด → `NotFoundException(entity, id, code)`** · **`AppForbiddenException` ที่ไม่มี code 14 จุด** ได้ code แยกตามการกระทำ (อนุมัติ/ปฏิเสธ/รับทราบ/ส่งมอบ/ตรวจรับ/ขั้นตอน/บันทึก) · `MemoController` `PRINT_TOKEN_INVALID` เปลี่ยนข้อความเป็นอังกฤษ + เพิ่มคีย์คำแปล · `MemoReportAccess` 2 จุด → `BadRequestException` · **`errors.json` 213 → 246 คีย์ th/en** · **เดินสาย `apiErrorText` ครบทั้ง flow** liff 6 ไฟล์ (`runWithToast` ของ memo → `useRunWithToast()`) + admin 8 ไฟล์ · **เลิกนิยาม `apiMessage` เองอีก 3 ไฟล์ → ทั้งโปรเจกต์เหลือ 2** · **ตรวจแล้ว:** build API ผ่าน · `dotnet test` 311 pass/1 skip = เท่า baseline · `tsc` admin+liff ผ่าน · `next build` admin 51 route + liff 32 route ผ่าน · node test 34 pass/2 fail = เท่า baseline · `i18n:scan` ไม่ขยับ · code จาก exception ทั้งระบบ 235 ตัวมีคำแปลครบ · throw ที่มีไทยใน flow memo เหลือ **0** (ทั้งระบบเหลือ 218 = 3.5 + 3.8 + 3.9) | (ยังไม่ commit) | | เทสต์ที่ต้องแก้ตาม: `MemoStepActionTests.CompleteStep_OnApprovalStep_ThrowsKindMismatch` assert code ใหม่ `MEMO_STEP_IS_APPROVAL` · **ยังไม่ทำ 3.5** (ลา/OT/ลงเวลา) |
| 2026-09-16 | **Phase 3.6** | **flow Ticket ทั้งหมด — 196 จุด / 52 ไฟล์** (`Tickets` + `TicketRouting` + **`ExternalTickets` ที่เพิ่มเข้ามาเพราะเป็น flow เดียวกันและไม่มีงานอื่นรับไป**) · **แตก `INVALID_TICKET_STATUS` 19 ข้อความเป็น 17 code แยกตามการกระทำ** แล้วลบ code เดิมทิ้งทั้งจากโค้ดและ catalog (ไม่มีเส้นทางไหนส่งแล้ว) · **`KeyNotFoundException` 40 จุด → `NotFoundException(entity, id, code)`** เพื่อไม่ให้ยุบเป็น `NOT_FOUND` ก้อนเดียวจนผู้ใช้ไม่รู้ว่า "ไม่พบอะไร" · **เพิ่มชนิดใหม่ `BadRequestException(code, message)`** = 400 ที่พก code แทน `FluentValidation.ValidationException` ที่ throw จากในhandler 44 จุด (validator ที่ผูกฟิลด์ไม่แตะ — งาน 3.10) · **`errors.json` 127 → 213 คีย์ th/en** (ข้อความไทยเดิมกลายเป็นคำแปล th ตรงตัว ผู้ใช้ไทยจึงเห็นเหมือนเดิมทุกประโยค) · **เดินสาย `apiErrorText` ครบทั้ง flow** ด้วย hook ใหม่ `useApiError()` ทั้งสองแอป (ห่อ `apiErrorTextDetailed`: คำแปลของ code → `details`/`errors` → message → fallback) liff 13 ไฟล์ + admin 16 ไฟล์ · `runWithToast` ของ liff → `useRunWithToast()` · เลิกนิยาม `apiMessage` เองอีก 2 ไฟล์ · **แก้บั๊กที่มีอยู่ก่อน 2 จุด** (ดูหมายเหตุ) · **ตรวจแล้ว:** build API ผ่าน 0 warning · `dotnet test` 311 pass/1 skip = เท่า baseline · `tsc` admin+liff ผ่าน · `next build` admin 51 route + liff 32 route ผ่าน · node test 34 pass/2 fail = เท่า baseline · `i18n:scan` ไม่ขยับ (liff 3 / admin 754 = ของเดิม) · code ที่ส่งได้จริงทั้งระบบ 203 ตัวมีคำแปลครบ · throw ที่มีไทยใน flow ticket เหลือ **0** | (ยังไม่ commit) | | **บั๊กที่เจอระหว่างทาง** (มีมาก่อนงานนี้ ไม่ได้เกิดจาก 3.6): ① `TicketController.Create` ดัก exception เองแล้วส่ง `error` เป็น**ข้อความ**ไม่ใช่ code → ลบ try/catch ให้ middleware ตอบมาตรฐาน ② `ExternalLineLoginCommand` เรียก `AppForbiddenException` แบบ arg เดียว ทำให้ `LINE_OA_FRIEND_REQUIRED` ตกไปอยู่ `message` ส่วน `error` เป็น `FORBIDDEN` → [external/layout.tsx](apps/liff-web/app/external/layout.tsx#L61) เทียบ code ไม่เคยติด **ผู้แจ้งภายนอกที่ยังไม่แอด LINE OA เห็นจอ "บัญชีถูกระงับ" แทนจอ "กรุณาแอดเพื่อน"** · เทสต์ 2 ตัวที่ assert `.Message == "LINE_OA_FRIEND_REQUIRED"` ก็ผิดตาม แก้เป็น assert `.Code` แล้ว · **ยังไม่ทำ 3.5** (ลา/OT/ลงเวลา) — ทำ 3.6 ก่อนตามที่สั่ง |
| 2026-09-16 | **D7 + Phase 3.1–3.4** | **เคาะ D7: API ส่ง error เป็นอังกฤษล้วน** (ไม่ส่งไทย ไม่ส่งสองภาษาคู่กัน) — `message` เป็นของ developer, ผู้ใช้เห็นคำแปลจาก `code` เสมอ · สำรวจของจริงพบขอบเขตใหญ่กว่าที่ประเมินไว้เดิมมาก: **648 จุด throw (ไทย 465) + 256 จุด return error ใน controller + 6 เคสใน middleware** · **3.1** เพิ่มฐาน `AppException(StatusCode, Code, Message)` ให้ exception 8 ชนิดสืบทอด (จุดเรียกเดิมไม่พังเพราะคง overload เดิม) และแยก `Code` ออกจาก `Message` ของ `AppUnauthorizedException` แล้วแก้ 29 จุดที่ส่งข้อความมาเป็น code จริง → arg แรกเป็น SCREAMING_SNAKE ครบ 100% · **3.2** middleware อ่าน status/code จากฐาน เหลือ match เฉพาะ exception ของ BCL + เปลี่ยนข้อความไทย 6 เคสเป็นอังกฤษ · **3.3** สแกนคู่ `(code, ข้อความไทยเดิม)` ทั้งระบบแล้วสร้าง `errors.json` **6 → 127 คีย์** ทั้ง th/en (ข้อความไทยเดิมกลายเป็นคำแปล th) — ตรวจแล้ว code ที่ส่งได้จริง 121 ตัวมีคำแปลครบไม่ขาดสักตัว · **3.4** ยก helper ขึ้น `packages/i18n/src/api-error.ts` (liff เหลือ re-export) + admin 11 ไฟล์เลิกนิยาม `apiMessage` ซ้ำ + dev warning เมื่อเจอ code ที่ไม่มีคำแปล · **ตรวจแล้ว:** build API ผ่าน · `dotnet test` 311 pass/1 skip = เท่า baseline · `tsc` admin+liff ผ่าน · `next build` admin 51 route ผ่าน · node test 34 pass/2 fail = เท่า baseline | (ยังไม่ commit) | | **ผู้ใช้ยังเห็นข้อความเหมือนเดิมทุกประการ** — message จาก API ยังเป็นไทย 465 จุด เปลี่ยนเป็นอังกฤษพร้อม code ในงาน 3.5–3.9 · ⚠️ **ต้องแตก code ที่กว้างเกินไปใน 3.5–3.9**: `INVALID_TICKET_STATUS` แชร์กัน 19 ข้อความที่ความหมายต่างกันมาก ถ้าไม่แตกจะได้คำแปลกลางที่ให้ข้อมูลน้อยกว่าไทยเดิม · คีย์ที่เคยมีชื่อฝัง (`DUPLICATE_*`) เปลี่ยนเป็นคำกลางเพราะ API ยังไม่ส่ง params |
| 2026-09-14 | — | สำรวจโค้ดและร่างแผนฉบับนี้ | (ยังไม่ commit) | | รอไฟเขียว D1–D5 |
| 2026-09-14 | — | เคาะ D2 + D5: ผู้ใช้อินโดฯ เป็น external reporter ไม่ใช่พนักงาน → ปรับลำดับ Phase 1 ให้ทำกลไกสลับภาษา + external flow ก่อน, ตัด `Employee.PreferredLanguage` ออกจากเส้นทางเลือกภาษา UI (เหลือใช้กับ notification), fallback `id` → `en` | (ยังไม่ commit) | | เหลือ D1, D3, D4 |
| 2026-09-14 | — | ย้ำขอบเขต: **สลับภาษาได้ทั้งระบบ ทุก role** ไม่ใช่เฉพาะ external — เพิ่มข้อ 1.2 ตารางขอบเขต + จุดวางตัวสลับภาษาทุกจุด, เพิ่มปุ่มภาษาที่ header ของ Admin (งาน 2.2), เพิ่มเกณฑ์ตรวจรับว่าทุก role สลับได้ | (ยังไม่ commit) | | |
| 2026-09-14 | — | เพิ่มงาน 1.2 **หน้าถามภาษาตอนเข้าระบบครั้งแรกบน LIFF** แบบมีเงื่อนไข (ภาษา LINE = ไทย ไม่ถาม / ภาษาอื่นถาม) — Phase 1 เป็น 14 งาน | (ยังไม่ commit) | | ถ้าอยากถามทุกคนสลับที่ flag เดียว |
| 2026-09-14 | — | เพิ่มข้อ 6.1 + D6 **วิธีได้มาซึ่งคำแปล**: AI แปลร่าง → คนตรวจ → commit JSON ใน repo (ไม่ใช่ตาราง DB / ไม่แปลสดตอน runtime) + เพิ่มงาน 0.8 ทำ GLOSSARY.md | (ยังไม่ commit) | | รวม 45 งาน |
| 2026-09-14 | — | ตรวจความสอดคล้องทั้งเอกสาร: แก้ตารางไทม์ไลน์ข้อ 5 ให้ตรงแดชบอร์ด (15–21.5 วัน), เพิ่มความเสี่ยงจาก AI แปล 2 ข้อ, เพิ่มเกณฑ์ตรวจคีย์ครบ/ศัพท์ตรง, บันทึกทางเลือก DB-based translation กับการแปลเนื้อหาผู้ใช้ไว้ในข้อ 9 | (ยังไม่ commit) | | เอกสารพร้อมใช้ รอเคาะ D1/D3/D4/D6 |
| 2026-09-14 | — | **เคาะ D1/D3/D6 ตามข้อเสนอ · D4 ต่างจากข้อเสนอ = ทำ master data ตั้งแต่แรก** → เพิ่ม **Phase M** 7 งาน (16 ตาราง เพิ่ม `NameEn`/`NameId` แบบ additive, DTO ส่ง 3 ค่า, helper `localizedName`, ฟอร์ม Admin 9 หน้า, สคริปต์ `migration-v1-1-2.sql` ที่จะรวม `AddMemoReturnToRequester` ค้างอยู่, seed คำแปลชุดแรก), ตัด 4.4 ออก — รวม 51 งาน 17.5–25 วัน · สถานะเอกสาร → **อนุมัติแล้ว** | (ยังไม่ commit) | | เริ่ม Phase 0 ได้ |
| 2026-09-14 | — | เพิ่มงาน 0.9 **เครื่องมือ export/import Excel ให้ผู้ตรวจคำแปล** (JSON ⇄ .xlsx, ชีตต่อ namespace, ล็อก key/th, บังคับ ICU placeholder ครบ, แถวเสี่ยงต้อง reviewed ก่อน import) + ปรับ workflow ข้อ 6.1 — รวม 52 งาน 18–25.5 วัน | (ยังไม่ commit) | | .xlsx ไม่ commit — JSON เป็น source of truth |
| 2026-09-16 | **Phase 2.10** | **Settings ทั้งหมดของ Admin — 20 ไฟล์ ~1,150 จุด** (ก้อนใหญ่สุดของเฟส) · สร้าง `admin.settings.*` ~700 คีย์ แบ่ง shell/nav, permissions, notifications, audit, shifts, holidays, holidaySchedules, attendancePolicy, memo, memoFlow, taxonomy, routing, closeout, teamTemplate, template · **เลิกถือป้ายเองใน 6 ไฟล์**: `settings/layout` (เก็บแค่ key เมนู), permission page (role → `status.roleType`), audit `MODULE_CONFIG`/`ACTION_CONFIG` (เหลือไอคอน+สี), notification `statusConfig`, memo-flow `ROLE_LABEL`, routing `modeLabel` · **เพิ่มของกลาง 2 ตัว**: `fmt.formatWeekday()` ใน `@hrms/i18n/format` (แทนตาราง `DAY_NAMES` ไทย 2 ไฟล์) และ `SchoolAdmin` ใน `ROLE_TYPE_LABEL` · zod schema 4 หน้าเปลี่ยนเป็น `buildXxxSchema(t)` + `useMemo` · เลิก `+543`/`MONTHS` ไทย ใช้ `fmt.formatYear`/`fmt.formatDate` · ชื่อ modal ที่เคยต่อ string (`แก้ไข`+`หมวด`) แตกเป็นคีย์เต็มต่อชนิด · master data ทุกที่ในหน้า settings เรียก `localizedName` · **ปิดช่องว่าง `MemoTypeDto`** เพิ่ม `CompanyNameEn/Id`, `DepartmentNameEn/Id` + 4 จุดสร้าง DTO · **ตรวจแล้ว:** `tsc` admin+liff ผ่าน · `next build` admin 51 route ผ่าน · node test 16 pass/2 fail = เท่า baseline · `dotnet test` 311 pass/1 skip · key th/en ครบคู่ 3,109 คีย์ · `i18n:scan` ในขอบเขตเหลือ 0 | (ยังไม่ commit) | | **ต้อง restart API** ถึงจะเห็นชื่อบริษัท/แผนกในหน้า memo flow เป็นอังกฤษ · `perm.description` ในหน้าสิทธิ์ยังเป็นไทยจาก seed DB (ไม่มีคอลัมน์คำแปล — ถ้าจะแปลต้องเพิ่มใน permission seed) · ทั้งแอปเหลือ 754 จุด = 2.6 (ลงเวลา/ลา/`locations`) + 2.9 (เบิกค่าใช้จ่าย) + shared 5 ไฟล์เล็ก |
| 2026-09-15 | **Phase 2.7** | **อนุมัติการลา + OT ของ Admin — 3 ไฟล์ ~155 จุด** · สร้าง `admin.approval.*` (leave 44 + ot 25 คีย์) · `approvals/leaves` แปลครบทั้งสองแผง (รออนุมัติ / ขอยกเลิก) + การ์ดรายการ + แท็บ/หัวข้อ — `timeAgo()` รับ `t` เข้าไปแทนข้อความไทยในฟังก์ชัน, ครึ่งวันเลิกใช้ map ในไฟล์หันไปใช้ `status.leaveHalfDay`, จำนวนวัน/ช่วงเวลาใช้ `common.duration.days` / `common.time.range` · `ot-requests` เลิก `MONTH_TH` และ `+543` หันไปใช้ `fmt.formatDate`/`fmt.formatYear` ตาม locale, ชื่อบริษัทใช้ `localizedName`, วันที่ `yyyy-MM-dd` สร้าง `Date` แบบ local กันเลื่อนวัน · **ย้าย `OT_RATE_TYPE_LABEL` เข้า labels กลาง** (`status.otRate`) แล้วให้ LIFF `ot/[id]` ใช้ด้วย (ลบ `rate.long.*` ออกจาก `liff-web/messages/*/ot.json`) · **`LeaveStatusBadge` ของ admin** เลิกถือ label map ของตัวเอง เหลือแค่โทนสี ใช้ `status.leave` — กระทบ 4 หน้าที่ใช้ร่วมกันและปิดคำที่เคยต่าง ("รอยืนยันการยกเลิก" → "รอยกเลิก") · **ปิดช่องว่าง consumer DTO ของใบลา**: `PendingLeaveItemDto`/`LeaveRequestDto` เพิ่ม `LeaveTypeNameEn/Id` + projection 5 จุด (ใน `.Select()` ของ IQueryable ใช้ named argument ไม่ได้ — CS0853 ต้องส่ง positional) หน้าจอเรียก `localizedName` ทั้ง admin และ LIFF 2 หน้าที่ใช้ DTO คู่นี้ · **ตรวจแล้ว:** `tsc` admin+liff ผ่าน · `next build` admin 51 route + liff 32 route ผ่าน · node test 16 pass/2 fail = เท่า baseline · `dotnet test` 311 pass/1 skip · key th/en ครบคู่ 2,397 คีย์ · `i18n:scan` ในขอบเขตเหลือ 0 | (ยังไม่ commit) | | `approvals/memos/**` เป็น redirect stub ไปหน้าที่แปลแล้วใน 2.8 ไม่มีงาน · **ต้อง restart API** ถึงจะเห็นชื่อประเภทการลาเป็นอังกฤษ · `leaveTypeName` ที่เหลือ (`my/leaves`, `leave-history`, `leave-balances`, ปฏิทินลงเวลา) ยังไม่ได้เติม → ทำใน 2.6 · เหลือในเฟส: 2.6 ลงเวลา/รายงาน · 2.9 เบิกค่าใช้จ่าย · 2.10 settings |
| 2026-09-15 | **Phase 2.8** | **Memo + Ticket + รายงาน ticket ของ Admin — 41 ไฟล์ ~940 จุด** · สร้าง `admin.memo.*` (180 คีย์) และ `admin.ticket.*` (300 คีย์) · Memo 16 ไฟล์ (สถานี/ไฟล์แนบ/บันทึกความคืบหน้า/ตารางอนุมัติ/กล่องเข้าแผนก/ขั้นตอน + 4 หน้า) · Ticket 25 ไฟล์ (nav/บอร์ด/สถานี/modal 7 ตัว + 6 หน้า รวมหน้ารายงานที่ใหญ่สุด) · เคาะให้ `tickets/inbox` เลิกใช้ป้ายสถานะชุดย่อของตัวเอง หันมาใช้ `status.ticket` · เพิ่ม `MEMO_STEP_KIND_LABEL` ใน labels กลาง · refactor: `apiMessage(error, fallback)`, `thaiDateTime` → `ticketDateTime`, `InboxStatusBadge` เป็นคอมโพเนนต์, `DurationTable` รับหัวตารางจากผู้เรียก · **ตรวจแล้ว:** `tsc` ผ่าน · `next build` admin 51 route ผ่าน · node test 34 pass/2 fail = เท่า baseline · key th/en ครบคู่ 2,324 คีย์ | (ยังไม่ commit) | | `memo-flow-editor.tsx` ใช้เฉพาะหน้า `settings/memo` → ยกไป 2.10 · `laneLabel` ของ progress feed ฝั่ง admin เป็นอังกฤษอยู่แล้ว ไม่ต้องแปล · เหลือในเฟส: 2.6 ลงเวลา/รายงาน · 2.7 อนุมัติ/OT · 2.9 เบิกค่าใช้จ่าย · 2.10 settings |
| 2026-09-14 | **Phase M** | **รัน `migration-v1-1-2.sql` บน dev** (`localhost:3307/db_hrms_phase1_rehearsal` MySQL 9.6.0) ด้วย `mysql.exe` 8.0 — รอบ 1 เพิ่ม 32 คอลัมน์ + history 1 แถว, รอบ 2 no-op (idempotent ยืนยัน) · ตรวจ: `name_en`/`name_id` 17/17 ตาราง, `memos` มี 2 คอลัมน์ของ `AddMemoReturnToRequester` (DB นี้มีอยู่ก่อนแล้ว) | (ยังไม่ commit) | | `192.168.0.64` ต่อไม่ติดจากเครื่องนี้ · **prod ยังไม่รัน** — deploy รอบหน้ารัน script นี้แล้วค่อยวาง publish ใหม่ |
| 2026-09-14 | **Phase M** | **เคาะ M.6 = ไม่ทำ** — external ใช้แค่ flow เปิดใบแจ้ง คำแปลที่จำเป็นมีแค่ external ticket taxonomy ปริมาณน้อย HR กรอกผ่านช่อง EN/ID ในหน้า Admin เอง ไม่ทำสคริปต์ seed · Phase M งานครบ 7/7 (รอรัน SQL + ตรวจรับด้วยตา) | (ยังไม่ commit) | | ถ้าอนาคตต้องเติมทีละมาก ค่อยกลับมาใช้ขั้นตอน export→AI→HR→seed |
| 2026-09-14 | **Phase M** | ทำ M.1–M.5, M.7: entity 17 ตัว + EF config + migration `20260914084146_AddMasterDataLocalizedNames` (32 AddColumn) · DTO 24 / command 30 / projection ~45 จุด · `NameText.Normalize/Apply` (update: null = คงเดิม, `""` = ล้าง) · shared-types 21 type · `localizedName()` · ฟอร์ม Admin 11 ไฟล์ + api lib 9 + hook 5 · `migration-v1-1-2.sql` regenerate จาก baseline `AddTicketTeamTemplates` `--idempotent` (554 บรรทัด/35 ALTER, ตัด BOM, header ไทย) **รวม `AddMemoReturnToRequester` ที่ค้างอยู่** · **ตรวจแล้ว:** `has-pending-model-changes` No changes · `dotnet test` 293 pass/1 skip · `tsc` admin+liff ผ่าน · `next build` admin ผ่าน | (ยังไม่ commit) | | ⬜ M.6 seed คำแปลรอ export จาก prod · ⬜ **ยังไม่ได้รัน SQL กับ DB ใด** · บันทึกช่องว่าง consumer DTO `xxxName` ไว้ใต้ Phase M → ทำใน Phase 1/2 · ตอน `dotnet ef migrations script` ต้อง build ก่อน (`--no-build` กับ assembly เก่าได้ script ไม่ครบ) |
| 2026-09-14 | **Phase M (แก้บั๊ก รอบ 2 — ต้นตอจริง)** | **พบว่า Phase M ข้ามชั้น `Hrms.Api/Controllers` ไปทั้งชั้น** — request record ที่ผูกกับ JSON body ไม่เคยประกาศ `NameEn`/`NameId` เลย ค่าที่ผู้ใช้กรอกจึงถูกทิ้งตั้งแต่ก่อนเข้า command (คำว่า `NameId` ไม่ปรากฏในโฟลเดอร์ controllers เลยแม้แต่ครั้งเดียว) · จาก 32 command ที่รองรับชื่อหลายภาษา **พัง 29** เหลือถูกแค่ 3 ตัวที่ bind command ตรงโดยไม่ผ่าน request record · แก้ 9 controller: ticket taxonomy + เหตุผลปิดงาน (8 endpoint), external taxonomy (6), department/location/shift (create+update+toggle), role label (2), memo type/category/sub-category (3), company + leave type (เติม `NameId` ที่ขาด) · toggle-status 3 จุดส่งค่าเดิมกลับไปด้วยแทนการพึ่งพฤติกรรม null ของ `NameText.Apply` · เพิ่มเทสต์ `LocalizedNameControllerWiringTests` อ่านซอร์ส controller ตรวจทุกจุดที่สร้าง command (ยืนยันว่าจับได้จริงด้วยการถอดค่าออกชั่วคราวแล้วเทสต์ล้ม) · **ตรวจแล้ว:** `dotnet test` 298 pass/1 skip · build Hrms.Api ผ่าน | (ยังไม่ commit) | | ผู้ใช้เจอจาก payload ที่ส่ง `nameEn: "Software"` แล้วค่าไม่ถูกบันทึก · frontend ส่งค่าถูกต้องมาตลอด ไม่ต้องแก้ |
| 2026-09-14 | **Phase M (แก้บั๊ก รอบ 1)** | **พบ response ของ handler "สร้างใหม่" ไม่ส่ง `nameEn`/`nameId` กลับ** — `NameEn`/`NameId` เป็น optional parameter ท้าย record DTO จุดที่สร้างแบบ positional แล้วหยุดก่อนถึงสองตัวนี้จึงคืน null เงียบ ๆ โดย compiler ไม่เตือน · แก้ 5 จุด: `ToDto` ของ create handler ที่ `ManageTicketCategoryCommands` / `ManageTicketTopicCommands` / `ManageTicketSubjectCommands` / `ManageExternalTicketCategoryCommands` และ `ToDto` ของ **list** ที่ `GetLocationsQuery` · เพิ่มเทสต์ `TicketTaxonomyLocalizedNameTests` 4 ตัวกันหลุดซ้ำ · UI: เพิ่ม `LocalizedNameHint` ใต้ชื่อไทยในรายการของ ticket taxonomy ทั้ง internal/external/เหตุผลปิดงาน ให้ HR เห็นว่ารายการไหนยังไม่ได้กรอกคำแปล · **ตรวจแล้ว:** `dotnet test` 297 pass/1 skip · `tsc` + `next build` admin ผ่าน | (ยังไม่ commit) | | ตรวจครบทั้ง 25 DTO ที่มี `NameEn` — เหลือจุดเดียวที่เสี่ยงในอนาคตคือ `MemoTypeDto` ที่มี optional ท้าย 5 ตัว · ไล่ตรวจด้วย subagent ตามรายการ construction site ทุกจุด |
| 2026-09-14 | **Phase 1** | **ทำครบ 1.1–1.14 (งานโค้ด)** — กลไกสลับภาษา: `getLiffAppLanguage()`, `locale-cookie.ts`, `LocaleOnboarding` (ถามเฉพาะคนที่ LINE ไม่ใช่ไทย), `LanguageSwitcher` 2 variant · แปล LIFF ทั้งแอป: external 4 หน้า + พนักงานภายใน (เปลือก/หน้าแรก/auth/ลงเวลา/ลา/OT/เบิก/memo/ticket) · `loadMessagesWithFallback` th←en←id · `useFmt()` แก้ hydration mismatch ของการ format · `formatYear()` แทน `year + 543` · `apiErrorText`/`apiMessageDetailed` · `localizedName` ทุกจุดที่เลือกจาก lookup · เคาะคำ enum ที่เคยไม่ตรงกันรวมเข้า `labels.ts` · **ตรวจแล้ว:** `tsc` liff ผ่าน · node test 17 pass/2 fail = เท่า baseline (2 ตัวเป็นของ admin) · `next build` 35 route ผ่าน · key th/en ครบคู่ 1,124 คีย์ · `i18n:scan` 1,435 → 3 จุด | (ยังไม่ commit) | | 3 จุดที่เหลือเป็นการเทียบค่า `'อื่น ๆ'` กับ master data ไม่ใช่ข้อความ UI — คงไว้โดยตั้งใจ · ⬜ เหลือตรวจรับด้วยตาบน LINE จริง · ⬜ `i18n:export --locale en` ส่ง HR ตรวจคำแปล |
| 2026-09-14 | **Phase 0** | ทำครบ 0.1–0.9: `packages/i18n` + next-intl + provider/layout ทั้งสองแอป, รวม label 8 map (27 ไฟล์), codemod formatter 93 จุด/57 ไฟล์, สคริปต์ scan/export/import, GLOSSARY, CLAUDE.md · **ตรวจแล้ว:** `tsc` admin ผ่าน · node test 16 pass / 2 fail = เท่า baseline (2 ตัวที่ fail คือ `ticket-progress-feed.test.mjs` ของ admin ที่พังอยู่ก่อนแล้ว) · `tsc` liff ผ่านหลังแก้ `expense-attachments.ts` (re-export ไม่สร้าง binding ให้ฟังก์ชันในไฟล์) · `next build` **ผ่านทั้งสองแอป** (ทุก route เป็น ƒ dynamic ตามคาด) | (ยังไม่ commit) | | ✅ แก้แล้ว: `git add -f packages/i18n/package.json docs/i18n-multilanguage-plan.md` (staged) · ✅ แก้แล้ว: `pnpm-workspace.yaml` → `allowBuilds: {'@parcel/watcher': true, '@swc/core': true}` (pnpm 11 เติม placeholder มาเองแต่ต้องเคาะ true; `.npmrc onlyBuiltDependencies` ไม่มีผลแล้ว) → `pnpm run`/`exec` กลับมาใช้ได้ |
| | | | | | |

### ค่าพื้นฐานสำหรับวัดความคืบหน้า (บันทึกตอนจบ Phase 0.6)

| ตัวชี้วัด | baseline | หลัง Phase 1 | หลัง Phase 2 |
|---|---:|---:|---:|
| ไฟล์ liff-web ที่ยังมีข้อความไทยฝัง (ไม่นับ comment) | 71 ไฟล์ / 1,435 จุด | **2 ไฟล์ / 3 จุด** (เทียบค่า `'อื่น ๆ'` กับ master data — คงไว้โดยตั้งใจ) | |
| ไฟล์ admin-web ที่ยังมีข้อความไทยฝัง (ไม่นับ comment) | 123 ไฟล์ / 3,671 จุด | ไม่แตะในเฟสนี้ | |
| key ที่แปลครบ 2 ภาษา | 0 / 37 (มีแค่ namespace `status`) | **1,124 / 1,124** (ส่วนกลาง 46 + liff 1,078) | |

> ตัวเลขสำรวจครั้งแรก (86 / 156 ไฟล์) นับรวม comment ภาษาไทย — ใช้ตัวเลขจาก `pnpm i18n:scan` เป็น baseline ตั้งแต่นี้ไป (`docs/i18n-review/scan-baseline-20260914.json`)
