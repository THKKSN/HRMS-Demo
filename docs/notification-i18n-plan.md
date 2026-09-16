# แผนงาน LINE Notification หลายภาษา (i18n Phase 4)

> **สถานะเอกสาร:** ✅ อนุมัติแล้ว — **D8–D11 เคาะครบ 2026-09-16** · **N0–N3 เสร็จ (13/18)** · ผู้รับที่ตั้งภาษาอังกฤษได้ข้อความบน LINE เป็นอังกฤษครบทุกเส้นทางแล้ว เหลือแต่ N4 ตรวจรับ + deploy
> **ภาษาเป้าหมายของ notification:** `th` / `en` เท่านั้น (`id` อาจไม่ทำ — ดู D9)
> **ขยายจาก:** [`docs/i18n-multilanguage-plan.md`](i18n-multilanguage-plan.md) ข้อ 4 (Phase 4 · 3 งานย่อย) — ของจริงใหญ่กว่าที่เขียนไว้ จึงแยกเอกสาร
> **วันที่สำรวจโค้ดจริง:** 2026-09-16 (หลังปิด Phase 3)
> **เงื่อนไขเริ่ม:** ไม่มี — ไม่ต้องรอ 3.5/3.8 เพราะคนละเส้นทาง (notification ไม่ได้ใช้ `errors.json`)
> **วิธีใช้เอกสารนี้:** ทุกงานย่อยเป็น checkbox — เสร็จแล้วติ๊ก `[x]` แล้วเติมแถวใน [ข้อ 7 บันทึกการทำงาน](#7-บันทึกการทำงาน-log)

---

## 0. แดชบอร์ดความคืบหน้า

| เฟส | ชื่อ | งานย่อย | เสร็จ | ผู้ใช้เห็นอะไรเปลี่ยน | ประเมิน |
|---|---|---:|---:|---|---:|
| N0 | ✅ ตัดการเดาภาษาออกจากการ์ด (refactor ล้วน) | 3 | **3** | ป้ายสถานะเปลี่ยน 2 event (ตั้งใจ · ดู N0) | 0.5 วัน |
| N1 | ✅ payload เป็น `{ templateKey, params }` | 3 | **3** | ไม่เปลี่ยน (ยังไทย) | 1–1.5 วัน |
| N2 | ✅ ภาษา + คำแปล (รวม `PreferredLanguage` + `X-Locale`) | 4 | **4** | **เปลี่ยน** — ticket/memo เป็นอังกฤษตาม D9 | 1.5–2 วัน |
| N3 | ✅ job + LINE webhook ที่เหลือ | 3 | **3** | **เปลี่ยน** — ลา/ลงเวลา/ตอบแชท เป็นอังกฤษตาม D9 | 1 วัน |
| N4 | ตรวจรับ + deploy | 5 | 0 | — | 0.5 วัน |
| | **รวม** | **18** | **13** | | **4.5–5.5 วัน** |

> ⚠️ แผนหลักประเมิน Phase 4 ไว้ **2–3 วัน** ซึ่งต่ำไป เพราะนับแค่ "แปลข้อความ" ไม่ได้นับงานรื้อโครงที่ข้อ 2 ว่าไว้

---

## 1. ตัวเลขจากการสำรวจ

ข้อความไทยที่ออกไปหาผู้ใช้ทาง LINE — **327 ข้อความ**

| กลุ่ม | ข้อความ | ไฟล์ | อยู่ในแผนหลักไหม |
|---|---:|---:|---|
| การ์ด Flex ([`LineFlexBuilder.cs`](../apps/api/Hrms.Application/Common/Helpers/LineFlexBuilder.cs) · 559 บรรทัด · 6 การ์ด) | 62 | 1 | ✅ ข้อ 4.3 |
| ข้อความ notification ของ ticket (42 จุดที่ queue) | 117 | 26 | ✅ ข้อ 4.2 |
| ข้อความ notification ของ memo | 53 | 28 | ✅ ข้อ 4.2 |
| job ลา + รายงานเข้างาน | 57 | 2 | ✅ ข้อ 4.3 |
| **LINE webhook (ตอบกลับตอนผู้ใช้ทักแชท)** | **38** | **7** | ❌ **ไม่อยู่ในแผน** |

วัดซ้ำได้ด้วยสคริปต์ใน scratchpad `count-line-strings.mjs` (ยังไม่ได้ยกขึ้นเป็น `pnpm` script — ถ้าต้องวัดหลายรอบค่อยทำแบบ `i18n:scan-api`)

**เหลืออยู่หลังปิด N3:** **7 จุด** — ทั้งหมดอยู่ที่ [`WebhookKeywords`](../apps/api/Hrms.Application/Features/LineWebhook/WebhookKeywords.cs)
ซึ่งเป็น**คำสั่งที่ปุ่มบน rich menu ส่งเข้ามา ไม่ใช่ข้อความที่ผู้ใช้อ่าน** จึงตั้งใจไม่แปล (ดู N3.3)

| กลุ่ม | ก่อนเริ่ม | หลัง N3 |
|---|---:|---:|
| ticket / memo (42 จุดที่ queue + การ์ด) | 117 + 53 | **0** |
| การ์ด Flex ที่เหลือ | 62 | **0** |
| job ลา + รายงานเข้างาน | 57 | **0** |
| LINE webhook | 38 | **7** (คำสั่งของปุ่ม) |

---

## 2. สิ่งที่เจอจากการสำรวจโค้ด

### 2.1 🔴 การ์ดเลือกสีจากการอ่านคำไทยในข้อความ

[`ResolveTicketStyle`](../apps/api/Hrms.Application/Common/Helpers/LineFlexBuilder.cs#L228-L261) มี **15 เงื่อนไข** แบบ `message.Contains("ปฏิเสธ")` / `Contains("คำขอยกเลิก")` / `Contains("มอบหมาย")` ใช้เลือกสีหัวการ์ดและป้ายสถานะ

พอข้อความไม่ใช่ไทย เงื่อนไขไม่ match → **การ์ดทุกใบตกเป็นสีเขียว "งานใหม่"** ไม่ว่าเรื่องจริงจะเป็นการปฏิเสธหรือปิดงาน

**เป็นบั๊กอยู่แล้ววันนี้ด้วย** — แก้ข้อความ notification สักคำ (เช่น "ถูกปฏิเสธ" → "ไม่อนุมัติ") สีการ์ดเปลี่ยนเงียบ ๆ ไม่มีอะไรเตือน

> ส่วนที่ตัดบรรทัดแรกเป็นหัวข้อ และ split `label: value` **ใช้กับภาษาอื่นได้ปกติ** ไม่ใช่ปัญหา

### 2.2 ✅ ข้อมูลที่ต้องใช้แทนมีอยู่แล้ว

[`NotificationOutbox.EventType`](../apps/api/Hrms.Domain/Entities/NotificationOutbox.cs) เก็บ code อังกฤษล้วนอยู่แล้ว และ [`NotificationDeliveryJob`](../apps/api/Hrms.Infrastructure/Jobs/NotificationDeliveryJob.cs#L56-L68) ถือแถวนั้นอยู่ในมือตอนเรียก builder พอดี

`TicketCreated` · `TicketAccepted` · `TicketAssigned` · `TicketReassigned` · `TicketClaimed` · `TicketStarted` · `TicketResolved` · `TicketRejected` · `TicketReturned` · `TicketClosed` · `TicketCommented` · `TicketWaitingInfo` · `TicketRequesterConfirmed` · `TicketCancellationRequested` · `TicketCancelled` · `TicketCancellationRejected` · `TicketTeamMemberAdded` · `TicketTeamMemberRemoved` · `MemoStepReady` · `MemoStepRejected` · `MemoStepReturned` · `MemoStepsCompleted` · `MemoResubmitted` · `MemoReturnedToRequester` · `MemoActivity`

### 2.3 ✅ แยกพนักงาน / ผู้แจ้งภายนอก ได้ฟรี

[`TicketRequesterResolver`](../apps/api/Hrms.Application/Features/Tickets/TicketRequesterResolver.cs) แยก `EmployeeId` กับ `ExternalReporterId` ออกจากกันสะอาด → **`NotificationOutbox.RecipientEmployeeId == null` แปลว่าผู้รับเป็นผู้แจ้งภายนอก** ใช้ตัดสินภาษาได้โดยไม่ต้องมี migration และไม่ต้องมีหน้าตั้งค่า

### 2.4 🟡 job สร้างการ์ดใบเดียวแล้ววนส่งหลายคน

[`LeaveNotificationJob`](../apps/api/Hrms.Infrastructure/Jobs/LeaveNotificationJob.cs#L60-L69) กับ `DailyAttendanceReportJob` สร้างการ์ด **นอกลูป** แล้ว `foreach` push — ต่อให้รู้ภาษาผู้รับก็ยังได้ภาษาเดียวกันหมด ต้องย้ายการสร้างการ์ดเข้าไปในลูป

### 2.5 🟡 ฝั่ง .NET ยังไม่มีระบบเลือกภาษาเลย

ไม่มี `.resx` · ไม่มี `IStringLocalizer` · ไม่มีตัวเลือกชื่อ master data (API ส่ง `NameEn`/`NameId` ให้ frontend เลือกเอง) — **Phase 4 เป็นครั้งแรกที่ API ต้องตัดสินใจภาษาเอง** จึงต้องเคาะ D10

master data ที่โผล่ในข้อความพร้อมแล้วบางส่วน: `LeaveType` มี `NameTh`/`NameEn`/`NameId` ตั้งแต่ Phase M แต่ job ยังเรียก `NameTh` ตรง ๆ

### 2.6 🟡 ผู้แจ้งภายนอกไม่มีที่เก็บภาษา

[`ExternalReporter`](../apps/api/Hrms.Domain/Entities/ExternalReporter.cs) ไม่มีฟิลด์ภาษา — ถ้า D9 เลือกทางที่ต้องรู้ภาษารายคน ต้องเพิ่มที่นี่ด้วย ไม่ใช่แค่ `Employee` (กลุ่มนี้คือกลุ่มที่เคยตกลงว่าจะมีคนอินโดฯ)

---

## 3. การตัดสินใจ

### D8 — ภาษาต้นทางของคำแปล = **en** ✅ เคาะ 2026-09-16

ข้อความต้นฉบับที่ใช้ส่งให้ AI/คนแปลต่อเป็นภาษาอื่น ใช้ **อังกฤษ** เสมอ ไม่ใช่ไทย

- โปรเจกต์นี้เลือกไปแล้วโดยปริยายที่แผนหลักข้อ 5.1 (`copy messages/en → messages/id แล้วแปล`)
- คู่ `en→id` / `en→xx` มีคนตรวจและเครื่องมือรองรับมากกว่า `th→id` มาก
- key ทั้งระบบเป็นอังกฤษอยู่แล้วตาม CLAUDE.md

**สิ่งที่ D8 ไม่ได้ตัดสิน:** ผู้รับจะ *เห็น* ภาษาอะไร — คนละเรื่องกัน อยู่ที่ D9

### D9 — ผู้รับเห็นภาษาอะไร ✅ เคาะ 2026-09-16

**ตามภาษาที่ผู้ใช้ใช้อยู่จริงตอนนั้น — จำกัดแค่ `th` / `en`**

- แหล่งภาษาคือ**ตัวเดิมที่มีอยู่แล้ว** [`resolveLocale`](../packages/i18n/src/locales.ts): cookie `hrms-locale` → `liff.getAppLanguage()` → `th` (ตาม D2) — **ไม่ต้องทำหน้าตั้งค่าภาษาใหม่**
- `id` ไม่อยู่ในชุดของ notification รอบนี้ (**อาจไม่ทำอินโดฯ เลย** เพราะค่าใช้จ่ายและเวลาไม่คุ้ม) · ผู้ใช้ที่ตั้ง `id` ตกเป็น `en` ตาม D5 ที่ว่า fallback ของ id คือ en ไม่ใช่ th
- ค่าที่เก็บเป็น varchar จึงเพิ่ม `id` ทีหลังได้โดยไม่ต้องแก้โครง

> ⚠️ **ข้อจำกัดที่ต้องรู้: job ส่ง notification ทำงานนอก request** — ไม่มี cookie และไม่มี LIFF context ให้อ่าน "ภาษาตอนนั้น" ได้เอง
> และ **ผู้รับคนละคนกับผู้กระทำ** จึงเอา locale ของคนที่กดปุ่มมาใช้แทนไม่ได้
> ⇒ ต้อง **จำภาษาล่าสุดของแต่ละคนลง DB** แล้วให้ job อ่านจากตรงนั้น (งาน N2.1)
>
> วิธีที่ถูกที่สุด: frontend แนบ header `X-Locale` ไปกับทุก request (แพตเทิร์นเดียวกับ `X-Client-App` ที่ [`lib/api.ts`](../apps/liff-web/lib/api.ts) มีอยู่แล้ว) → API อัปเดตคอลัมน์แบบ lazy เฉพาะตอนค่าเปลี่ยน → **ไม่ต้องมี `PATCH /me/preferences` และไม่ต้องแตะหน้าตั้งค่าทั้ง 2 แอป** อย่างที่แผนหลักข้อ 4.1 เขียนไว้

### D10 — template ข้อความอยู่ที่ไหน ✅ เคาะ 2026-09-16

**ไฟล์เดียวกับ frontend** — `packages/i18n/messages/<locale>/notifications.json` ลิงก์เข้า `.csproj` เป็น `Content`

- ได้ใช้ `pnpm i18n:export` / `i18n:import` และ `GLOSSARY.md` เดิม → ศัพท์ในการ์ด LINE ตรงกับที่ผู้ใช้เห็นบนหน้าจอแน่นอน
- แหล่งคำแปลที่เดียวทั้งระบบ ไม่เกิดเคสคำแปลอยู่ 2 ที่แล้วไม่ตรงกัน
- deploy เป็น "copy publish ทับ" อยู่แล้ว ไฟล์ตามไปกับ publish output — **N4 ต้องยืนยันว่าไฟล์ติดไปจริง**

### D11 — ผู้แจ้งภายนอกเก็บภาษาไหม ✅ เคาะ 2026-09-16 (ตามมาจาก D9)

**เก็บ — ต้องมีทั้ง `Employee` และ `ExternalReporter`**

ผู้แจ้งภายนอกได้ notification เหมือนกัน และเป็นกลุ่มที่มีโอกาสไม่ใช่คนไทยมากที่สุด · ถ้าเพิ่มแค่ `Employee` คนกลุ่มนี้จะตกเป็น `th` ตลอด ซึ่งย้อนแย้งกับเหตุผลทั้งหมดของ D9

---

## 4. เฟสงาน

### ✅ N0 — ตัดการเดาภาษาออกจากการ์ด · 3/3 (2026-09-16)

> **refactor ล้วน** — ทำได้ทันทีโดยไม่ต้องรอ D9/D10/D11 และต้องทำทุกทางเลือกอยู่ดี

- [x] **N0.1** `ResolveTicketStyle(string message)` → `ResolveTicketStyle(string? eventType)` · ส่ง `delivery.EventType` เข้า `BuildTicketNotificationCard` · 15 เงื่อนไข `Contains` ภาษาไทยกลายเป็น `switch` ที่แมป **29 event** เป็น 9 สไตล์
  → event ที่ยังไม่ได้แมป / ค่าว่าง / `null` ตกเป็น default **ไม่โยน exception** — คิวเก่าที่ค้างอยู่ตอน deploy ต้องส่งออกได้
- [x] **N0.2** ย้ายการสร้างการ์ดใน `LeaveNotificationJob` + `DailyAttendanceReportJob` เข้าไปในลูปต่อผู้รับ — เปิดทางให้ N2 render ต่อภาษาได้
  → เก็บกวาด: `LeaveNotificationJob` มีตัวแปร `text` ที่ประกอบข้อความไทย 3 ท่อนแล้วไม่ถูกใช้เลย — ลบทิ้ง
- [x] **N0.3** [`LineFlexBuilderStyleTests`](../apps/api/Hrms.Application.Tests/Notifications/LineFlexBuilderStyleTests.cs) ล็อกคู่ `EventType → สี/ป้าย` ครบ 29 event + เคส event แปลกปลอม/ว่าง/null ต้องได้ default

**ผู้ใช้เห็นเปลี่ยน 2 จุด** (ตั้งใจ — ของเดิมเป็นผลพลอยได้จากการเดาคำ ไม่ได้ออกแบบมาแบบนั้น):

| event | เดิม | ใหม่ | ทำไม |
|---|---|---|---|
| `TicketRequesterConfirmed` | 🟢 งานใหม่ | 🟢 ปิดงานแล้ว | ข้อความว่า "ผู้แจ้งยืนยันปิดงาน…" ไม่ตรงกับคำใดใน 15 เงื่อนไขเลย เลยตกเป็น default · ป้าย "งานใหม่" บนการ์ดปิดงานคือผิด |
| `TicketTeamMemberAdded` | 🔵 มอบหมายแล้ว (คนที่ถูกดึงเข้า) / 🟢 งานใหม่ (ทีมเดิม) | 🔵 มอบหมายแล้ว ทั้งคู่ | เหตุการณ์เดียวกันได้ 2 สี เพราะข้อความของคนแรกบังเอิญมีคำว่า "ผู้รับผิดชอบหลัก:" |

**ตรวจแล้ว:** build ผ่าน · `dotnet test` **344 pass / 1 skip** (baseline 311 + เทสต์ใหม่ 33) · `i18n:scan-api` ยัง 93 จุดเท่าเดิม · ข้อความในเส้นทาง LINE **327 → 306** (เงื่อนไข `Contains` หายไป ป้ายสถานะ 9 ตัวยังอยู่)

### ✅ N1 — payload เป็น `{ templateKey, params }` · 3/3 (2026-09-16)

- [x] **N1.1** [`NotificationPayload`](../apps/api/Hrms.Application/Common/Notifications/NotificationPayload.cs) รองรับรูปใหม่ `{ templateKey, params }` **และอ่านรูปเก่า `{ Message }` ได้ด้วย** (อ่านแบบไม่สนตัวพิมพ์ เพราะ row เก่าเขียน `Message` ตัวใหญ่)
- [x] **N1.2** [`NotificationTemplate.Render`](../apps/api/Hrms.Application/Common/Notifications/NotificationTemplate.cs) + [`NotificationTemplateCatalog`](../apps/api/Hrms.Infrastructure/Services/NotificationTemplateCatalog.cs) อ่าน `notifications.json` ตาม D10 · แทนตัวแปร `{ticketNo}` `{memoTitle}` (ชื่อสื่อความ ห้าม `{0}` ตาม CLAUDE.md)
  → 💡 **กติกา "ตัวแปรว่าง = ตัดทั้งบรรทัดทิ้ง"** — ของเดิมเขียน `reason is null ? "" : $"\nเหตุผล: {reason}"` ที่จุดเรียก ซึ่งทำให้คำว่า "เหตุผล:" ค้างอยู่ในโค้ด C# แล้วแปลไม่ได้ · ย้ายเข้าเทมเพลตทั้งบรรทัดแล้วให้ตัวประกอบตัดเอง
  → ไฟล์คำแปลลิงก์เข้า `Hrms.Api.csproj` เป็น `Content` → ไปโผล่ที่ `i18n/<locale>/notifications.json` ใน output (ยืนยันแล้วว่า build ได้ไฟล์จริง)
- [x] **N1.3** ย้าย **42 จุดที่ queue** (ticket 35 / memo 7) จาก `$"..."` ต่อสตริง → `templateKey` + `params` · **แคตตาล็อก th 37 คีย์** · จุด queue ที่ยังมีข้อความไทยเหลือ **0**
  → **นี่คือของที่ทำให้ "standard" จริง** — ตอนนี้ API ต่อสตริงข้ามภาษา ซึ่งผิดกติกาที่ CLAUDE.md บังคับฝั่ง frontend อยู่แล้ว · ลำดับคำของแต่ละภาษาต่างกัน (`คุณได้รับมอบหมายงาน {ticketNo}` / `You have been assigned {ticketNo}`) ต่อสตริงแล้วแปลไม่ได้
  → `MemoStepFlow.AddNotifications` และ `TicketCancellationSupport.QueueRequesterAndAssignees` เปลี่ยน signature ตามไปด้วย · เก็บ `MemoNotificationPayload` ที่ประกาศซ้ำใน 5 ไฟล์ทิ้ง
  → ✅ **`notifications` เข้า pipeline แปลเดิมได้เลย** — `loadLocaleMessages('th')` เห็นเป็น namespace ใหม่ 37 คีย์ · N2.3 สั่ง `pnpm i18n:export` ได้ทันทีโดยไม่ต้องแก้สคริปต์

**ตรวจรับ N1:** ✅ ผ่าน — `dotnet test` **360 pass / 1 skip** · เทสต์ใหม่ 16 ตัวที่สำคัญคือ 3 กลุ่มนี้
  1. **ทุก `templateKey` ที่โค้ดส่ง มีอยู่จริงในแคตตาล็อก th** (สแกน source จริง) และไม่มีคีย์ตกค้างที่ไม่มีใครเรียก
  2. **ประกอบข้อความแล้วตรงกับข้อความไทยตัวเดิมก่อน N1 เป๊ะ ๆ** ([`NotificationCatalogRenderTests`](../apps/api/Hrms.Application.Tests/Notifications/NotificationCatalogRenderTests.cs)) รวมเคสตัดบรรทัด (งานภายในไม่มี "สถานที่:" · memo ที่ไม่มีความเห็นไม่มี "ความเห็น:")
  3. **payload รูปเก่า `{"Message":"…"}` ยังอ่านได้** · เทมเพลตหาย/ภาษาไม่มีไฟล์ ต้องไม่ throw

### ✅ N2 — ภาษา + คำแปล · 4/4 (2026-09-16)

- [x] **N2.1** จำภาษาล่าสุดของผู้ใช้ (ตาม D9) — **ไม่ต้องทำหน้าตั้งค่าใหม่ ตามที่ตั้งใจไว้**
  - `Employee.PreferredLanguage` + `ExternalReporter.PreferredLanguage` (varchar(5), default `th`) · migration `AddPreferredLanguage` — **2 คอลัมน์ ไม่มีอย่างอื่นติดมา**
  - frontend แนบ header `X-Locale` ทุก request — **3 axios instance**: [`liff-web/lib/api.ts`](../apps/liff-web/lib/api.ts) · [`liff-web/lib/external-api.ts`](../apps/liff-web/lib/external-api.ts) · [`admin-web/lib/api.ts`](../apps/admin-web/lib/api.ts)
    → อ่านจาก **cookie ตรง ๆ** ไม่ใช่ `getCurrentLocale()` เพราะ request แรก ๆ ยิงก่อน `LocaleProvider` ตั้งค่า จะเขียน `th` ทับของคนที่ตั้ง `en` ไว้ · ยังไม่มี cookie = ไม่ส่ง header เลย ดีกว่าส่งค่าที่เดาเอง
  - [`PreferredLanguageMiddleware`](../apps/api/Hrms.Api/Middleware/PreferredLanguageMiddleware.cs) วาง**หลัง** `UseAuthorization()` — ผู้แจ้งภายนอกใช้ scheme แยก `context.User` จะมี claim ก็ต่อเมื่อ authorization ตรวจ policy เสร็จ
  - เขียน DB **เฉพาะตอนค่าเปลี่ยน** 2 ชั้น: [`PreferredLanguageWriteGuard`](../apps/api/Hrms.Infrastructure/Services/PreferredLanguageWriteGuard.cs) จำค่าไว้ในหน่วยความจำ 30 นาที + `UPDATE … WHERE preferred_language <> @locale` · ใช้ `ExecuteUpdateAsync` ไม่ใช่ `SaveChangesAsync` เพื่อไม่ไป flush ของที่ DbContext ของ request นั้นถืออยู่ (ผลพลอยได้: `UpdatedAt` ไม่ขยับ ซึ่งถูกแล้ว — เปลี่ยนภาษาหน้าจอไม่ใช่ "มีคนแก้ข้อมูลพนักงาน")
  - ล้มเหลวต้องเงียบเสมอ — จำภาษาไม่สำเร็จห้ามทำให้ request ของผู้ใช้พัง
- [x] **N2.2** ตัวเลือกภาษาฝั่ง .NET: [`AppLocale`](../apps/api/Hrms.Application/Common/Localization/AppLocale.cs) (คู่แฝดของ `packages/i18n/src/locales.ts`)
  → 🔀 **ต่างจากที่เขียนไว้ตอนแรก:** คอลัมน์เก็บภาษาที่ผู้ใช้เลือก**จริง** รวม `id` ด้วย แล้วค่อยแปลง `id → en` **ตอน render** ไม่ใช่ตอนเขียน · เหตุผล: คอลัมน์ชื่อ `preferred_language` ต้องไม่โกหก และวันที่มี `messages/id/notifications.json` แค่เติมชื่อภาษาใน `NotificationLocales` ก็จบ ไม่ต้องยุ่งกับข้อมูลเดิม
  → `NotificationTemplateCatalog` เปลี่ยนภาษาสำรองเป็น**ลูกโซ่ ภาษาที่ขอ → en → th** (เดิม → th อย่างเดียว) — คีย์ที่ยังไม่ได้แปลเป็นอังกฤษยังได้ไทยไป ส่งออกได้ก่อนแล้วค่อยตามแปล
- [x] **N2.3** แปลแคตตาล็อก notification เป็นอังกฤษ (ต้นทาง en ตาม D8 จากนี้ไป) — [`messages/en/notifications.json`](../packages/i18n/messages/en/notifications.json) **45 คีย์** เท่ากับไทยเป๊ะ · ศัพท์ตาม `GLOSSARY.md` (ticket / requester / assignee / awaiting acceptance / cancelled)
  → ยังเป็น**ร่างจาก AI** ตามขั้นตอนในแผนหลัก — รอคนตรวจบน Excel (`pnpm i18n:export` / `i18n:import`) ก่อนถือว่าคำแปลนิ่ง · pipeline เห็น namespace `notifications` ของทั้ง th/en แล้ว ไม่ต้องแก้สคริปต์
  → ข้อความของ **การ์ด Flex, job ลา/ลงเวลา และ webhook ยังไม่แปล** เพราะยังไม่ได้ย้ายเป็นคีย์ — อยู่ใน N3
- [x] **N2.4** ชื่อ master data ในข้อความเปลี่ยนตามภาษาผู้รับแล้ว
  - `NotificationPayload.LocalizedParams` (ชื่อตัวแปร → ภาษา → ค่า) เก็บชื่อครบทุกภาษาตั้งแต่ตอน queue เพราะตอนนั้นยังไม่รู้ว่าผู้รับอ่านภาษาอะไร และ job ก็ไม่ควรวิ่งกลับไปอ่าน master data ทีละแถว · [`LocalizedName`](../apps/api/Hrms.Application/Common/Localization/LocalizedName.cs) เป็นคู่แฝดของ `localizedName()` ฝั่งหน้าจอ (fallback ภาษาที่เลือก → en → th)
  - ใช้กับ `department` และ `taxonomy` (หมวด / หัวข้อ) ใน `ticket.created.*`
  - 🔴 **เจอเพิ่มระหว่างทำ — ป้าย enum ยังเป็นภาษาไทยฝังใน C#**: `PriorityLabel` (4 ค่า) กับ `RoutingOutcomeLabel` (4 ค่า) ใน `CreateTicketHandler` ซึ่งผิดกติกา CLAUDE.md ที่ห้ามประกาศ label map ซ้ำ · แก้โดยให้ค่าของ params ที่ขึ้นต้นด้วย **`#` เป็นคีย์ในแคตตาล็อก** (`#enum.priority.High`) แล้ว job แปลตอนส่ง · เทสต์ล็อกว่าคำอังกฤษของความเร่งด่วนต้องตรงกับ `status.ticketPriority` ที่ผู้ใช้เห็นบนหน้าจอ
  - **ที่ตั้งใจไม่แปล** (ตรงตาม CLAUDE.md): snapshot ในหัวเรื่อง memo (`MemoCategoryNameSnapshot` / `MemoSubCategoryNameSnapshot`) · ชื่อขั้นตอน workflow ที่ HR ตั้งเอง (GLOSSARY ระบุไว้ชัด) · ชื่อบริษัทในบรรทัด "ส่งเข้า:" ของ memo
  - `LeaveType.NameTh` ที่แผนเขียนถึง อยู่ใน job ลา — ไปพร้อม **N3.1**
- [x] **N2+ ตัวการ์ดที่ใช้ส่ง ticket/memo** (ดึงมาจาก N3.2 เพราะทิ้งไว้แล้ว N2 จะครึ่ง ๆ กลาง ๆ)
  → เนื้อความเป็นอังกฤษแล้วแต่ **ป้ายสถานะ/ปุ่ม/บรรทัดเวลาบนกรอบการ์ดยังเป็นไทย** เพราะคำพวกนี้เป็นของ `LineFlexBuilder` ไม่ได้มาจาก payload
  → `ResolveTicketStyle` คืน **`LabelKey`** แทน `Label` (13 ป้าย) · `BuildTicketNotificationCard` รับ `Func<string,string> text` ไว้แปลคำบนกรอบ · เพิ่มคีย์ `card.*` 17 คีย์ทั้ง th/en
  → คำว่า "น." ท้ายเวลาอยู่ในคำแปลไทย ไม่ใช่ในโค้ด ตามกติกาใน `GLOSSARY.md` · เวลายังตรึงเป็นเวลาไทยทุกภาษา
  → **การ์ดที่เหลือ (OTP · เตือนเช็คอิน · ผลเช็คอิน/เช็คเอาต์ · สรุปวันนี้) ยังเป็นไทย** — อยู่ใน N3.2 ตามเดิม

**ตรวจรับ N2:** ✅ ผ่าน — `dotnet test` **412 pass / 1 skip** (N1 360 + ใหม่ 52) · `tsc --noEmit` ผ่านทั้ง 2 แอป · `i18n:scan` เท่าเดิม (header ไม่ใช่ข้อความที่ผู้ใช้เห็น) · `i18n:scan-api` ยัง 93 จุดเท่าเดิม · ยืนยันว่า `en/notifications.json` ไปโผล่ที่ `bin/…/i18n/en/` จริง

เทสต์ที่สำคัญที่สุดของรอบนี้:

1. **ผู้รับแต่ละคนได้ภาษาของตัวเอง ไม่ใช่ของคนที่กดปุ่ม** ([`RecipientLocaleResolverTests`](../apps/api/Hrms.Application.Tests/Notifications/RecipientLocaleResolverTests.cs)) รวมเคสผู้แจ้งภายนอกที่ต้องหาด้วย LINE user id
2. **payload ก้อนเดียวกัน render ได้ทั้งไทยและอังกฤษ** ([`NotificationCatalogRenderTests`](../apps/api/Hrms.Application.Tests/Notifications/NotificationCatalogRenderTests.cs)) — ฝั่งไทยต้องตรงกับข้อความเดิมทุกตัวอักษร
3. **อังกฤษมีคีย์ครบเท่าไทย และใช้ชื่อตัวแปรชุดเดียวกัน** — แปลแล้วสะกดชื่อตัวแปรผิด บรรทัดนั้นจะหายเงียบ ๆ ตามกติกาตัดบรรทัดของ N1
4. **ไม่เขียน DB ทุก request** ([`PreferredLanguageWriteGuardTests`](../apps/api/Hrms.Application.Tests/Notifications/PreferredLanguageWriteGuardTests.cs))
5. **การ์ดของผู้รับภาษาอังกฤษต้องไม่มีอักษรไทยหลงเหลือเลยสักตัว** — serialize การ์ดจริงแล้วไล่หาอักษรในช่วง `฀–๿`
   → ⚠️ รอบแรกเทสต์นี้**ผ่านแบบหลอก ๆ** เพราะ `System.Text.Json` escape อักษรไทยเป็น `ย…` ทำให้หาไม่เจอ · ต้องตั้ง `Encoder = UnsafeRelaxedJsonEscaping` ก่อน (เจอตอนเทสต์ฝั่งไทยแดง)

### ✅ N3 — job + LINE webhook ที่เหลือ · 3/3 (2026-09-16)

> **ตัวช่วยกลางของเฟสนี้:** [`MessageText`](../apps/api/Hrms.Application/Common/Localization/MessageText.cs) —
> ตัวแปลที่ผูกภาษาผู้รับไว้แล้ว จุดเรียกส่งแค่คีย์กับตัวแปร · หา `MessageText` ของแต่ละคนผ่าน
> [`ILineMessageTextFactory`](../apps/api/Hrms.Application/Common/Interfaces/ILineMessageTextFactory.cs)
> (`For(preferredLanguage)` เมื่อโหลดแถวมาแล้ว · `ForLineUserAsync(lineUserId)` เมื่อมีแค่ id จาก webhook)
> · การ์ด ticket/memo ของ N2 ย้ายมาใช้ตัวเดียวกัน ไม่เหลือ `Func<string,string>` แล้ว

- [x] **N3.1** `LeaveNotificationJob` + `DailyAttendanceReportJob`
  - query ผู้รับดึง `PreferredLanguage` มาพร้อม `LineUserId` แล้วประกอบการ์ดใหม่ต่อคน (ท่อที่ N0.2 เปิดไว้ได้ใช้จริงรอบนี้)
  - `LeaveType.NameTh` → `LocalizedName.For(...)` ตามที่ N2.4 ค้างไว้
  - ชื่อเดือน/ชื่อวันที่เคยเป็น array ไทยใน job → [`AppDateFormat`](../apps/api/Hrms.Application/Common/Localization/AppDateFormat.cs) ที่ใช้ `CultureInfo` (`th-TH` ให้ปี พ.ศ. เอง) — **ชื่อเดือนไม่ควรไปนั่งในไฟล์คำแปลให้คนตรวจต้องไล่เช็ค** เหมือนที่ frontend ใช้ `Intl` · ส่วนรูปประโยค ("วันอังคาร**ที่** …") ยังอยู่ในไฟล์คำแปลเพราะแต่ละภาษาเรียงไม่เหมือนกัน
  - 🐞 **แก้บั๊กที่มีอยู่เดิม:** altText ของคำขอลาเขียน `$"ขอลา{NameTh}"` แต่ชื่อประเภทการลาขึ้นต้นด้วย "ลา" อยู่แล้ว ผู้อนุมัติจึงเห็น **"ขอลาลาพักร้อน"** ทุกใบ · ย้ายคำว่า "ขอ" เข้าเทมเพลตแล้วหายซ้ำ
  - `displayText` ของปุ่ม postback ก็แปลด้วย — เป็นคำที่โผล่ในห้องแชทของ**ผู้กด**
- [x] **N3.2** การ์ดที่เหลือใน `LineFlexBuilder`
  - เตือนเช็คอิน · ผลเช็คอิน · ผลเช็คเอาต์ · สรุปวันนี้ — ป้ายสถานะบนการ์ด "วันนี้" เปลี่ยนจาก `switch` ที่คืนข้อความไทยเป็นคืน**คีย์** แบบเดียวกับ `ResolveTicketStyle`
  - คำว่า "น." ท้ายเวลาอยู่ในคำแปล (`attendance.value.time`) ไม่ใช่ในโค้ด ตามกติกาใน `GLOSSARY.md`
  - 🗑️ **`BuildOtpCard` ที่แผนสั่งให้แปล — ไม่มีใครเรียก** (OTP ส่งเป็นข้อความธรรมดาจาก `RequestOtpHandler`) · ลบทิ้งแทนที่จะแปลของที่ไม่ได้ใช้ · `ReplyWithLocationRequestAsync` ก็ตายเหมือนกัน ลบด้วย
- [x] **N3.3** LINE webhook 7 ไฟล์
  - ⚠️ **ของ 38 ข้อความที่นับไว้ มี 7 คำที่ "ห้ามแปล"** — `"ลงเวลา"` / `"ตรวจสอบสิทธิ์"` / `"เมนู"` ฯลฯ คือ**คำสั่งที่ปุ่มบน rich menu ส่งกลับเข้ามา** ไม่ใช่ข้อความให้อ่าน · ย้ายไปรวมที่ [`WebhookKeywords`](../apps/api/Hrms.Application/Features/LineWebhook/WebhookKeywords.cs) พร้อมเหตุผลกำกับ แทนที่จะกระจายเป็น `case "…"` ในสวิตช์
    → จะแปลได้ก็ต่อเมื่อ rich menu ฝั่ง LINE มีชุดภาษาอังกฤษด้วย **แล้วต้องรับทั้งสองคำพร้อมกัน** — เป็นงานฝั่ง LINE console ไม่ใช่ฝั่งโค้ด
  - ส่วนป้ายบนปุ่ม (`label`) ที่ผู้ใช้เห็น แปลปกติที่ `webhook.menu.*`
  - ผู้ใช้ที่ระบบยังไม่รู้จัก (ยังไม่ผูกบัญชี) ตอบเป็นภาษาตั้งต้น — ไม่มีภาษาให้จำ

**ตรวจรับ N3:** ✅ ผ่าน — `dotnet test` **437 pass / 1 skip** (N2 412 + ใหม่ 25) · `i18n:scan` / `i18n:scan-api` เท่าเดิม · แคตตาล็อก **141 คีย์เท่ากันทั้ง th/en** และไปโผล่ใน build output ครบทั้งสองภาษา

**ข้อความไทยในเส้นทาง LINE เหลือ 7 จุด** — เป็นคำสั่งของปุ่มใน `WebhookKeywords` ทั้งหมด **ไม่มีข้อความที่ผู้ใช้อ่านเหลืออยู่แล้ว**

### ⬜ N4 — ตรวจรับ + deploy · 0/5

- [ ] **N4.1** `pnpm test:api` ผ่าน (ระวัง `NotificationDispatchSignalTests`, `TicketNotificationDedupTests`)
- [ ] **N4.2** **เคลียร์คิว notification ให้หมดก่อน deploy** แล้วทดสอบว่า payload รูปเก่ายังส่งออกได้
- [ ] **N4.3** ยิงจริงบน LINE: ผู้รับแต่ละกลุ่มได้ภาษาตาม D9 · สีการ์ดถูกทุกชนิด · `altText` อ่านรู้เรื่อง
- [ ] **N4.4** migration `AddPreferredLanguage` (สร้างแล้วใน N2.1 — เพิ่ม 2 คอลัมน์ ไม่มีอย่างอื่นติดมา) generate เป็น SQL ด้วย `dotnet ef --idempotent` จาก baseline `AddTicketTeamTemplates` และไปพร้อม `migration-v1-1-2.sql` ที่ยังไม่ขึ้น prod
- [ ] **N4.5** ยืนยันว่า `notifications.*.json` ติดไปกับ publish output จริง (D10) — ตอนนี้ต้องมี **ทั้ง `th` และ `en`** (dev build ยืนยันแล้ว เหลือยืนยันที่ `dotnet publish`)

---

## 5. ความเสี่ยงตอน deploy

| เรื่อง | ทำไง |
|---|---|
| คิว notification ค้างในรูป `{ Message }` | N1.1 บังคับให้อ่านรูปเก่าได้ + N4.2 เคลียร์คิวก่อน |
| `DeduplicationKey` | ไม่กระทบ — ประกอบจาก `eventType:ticketId:occurrenceId:recipient` ไม่ได้ใช้เนื้อข้อความ |
| deploy = copy publish ทับ (ยกเว้น appsettings/web.config) | ต้องเช็คว่าไฟล์ `notifications.*.json` **ทั้ง th และ en** ติดไปกับ publish output จริง (N4.5) — ถ้า `en` หาย ผู้รับที่ตั้งอังกฤษจะได้ไทยเงียบ ๆ ตามลูกโซ่ภาษาสำรอง ไม่มี error ให้เห็น |
| คิวที่ queue **ก่อน** deploy แต่ส่ง **หลัง** deploy | payload ไม่มี `LocalizedParams` → ชื่อแผนก/หมวดในข้อความยังเป็นไทย ส่วนที่เหลือเป็นอังกฤษ · แก้ด้วย N4.2 (เคลียร์คิวก่อน) เหมือนกัน |
| คอลัมน์ `preferred_language` ยังเป็น `th` ทุกแถวตอน deploy เสร็จใหม่ ๆ | ถูกต้องแล้ว — ค่าจะถูกอัปเดตเองตอนผู้ใช้เปิดแอปครั้งแรกหลัง deploy (header `X-Locale`) · ระหว่างนั้นทุกคนได้ไทยเหมือนเดิม ไม่มีใครได้ข้อความผิดภาษา |
| ส่งซ้ำ/ส่งหาย ระหว่างสลับรูป payload | deploy ตอนคิวว่าง แล้วดูหน้า `settings/notification-deliveries` หลัง deploy |

---

## 6. สิ่งที่ **ไม่** อยู่ในแผนนี้

- ข้อความไทยใน `PermissionSeeder` / `DataSeeder` (86 + 23 บรรทัด) — เป็นข้อมูลตั้งต้นใน DB ไม่ใช่ข้อความที่ render ตอนส่ง
- หัวคอลัมน์ Excel export (`ExportAttendanceExcelHandler` ฯลฯ) และ PDF memo (`QuestPdfMemoGenerator`) — เป็นไฟล์ที่ผู้ใช้โหลด ไม่ใช่ notification · ควรมีแผนของตัวเอง
- `errors.json` / ข้อความ error จาก API — จบไปแล้วใน Phase 3
- **ข้อความ OTP ตอนผูกบัญชี** (`RequestOtpHandler`) — เจอระหว่างทำ N3.2 · เป็นข้อความบน LINE เหมือนกัน แต่เกิดใน**ขั้นก่อนล็อกอิน** ที่ยังไม่มี `PreferredLanguage` ให้อ่าน · ทางออกที่ถูกที่สุดคืออ่านจาก header `X-Locale` ของ request นั้นตรง ๆ (เพิ่ม `ICurrentUser.Locale`) แต่ต้องเคาะก่อนว่าจะเปิดทางนั้นไหม — **ยังไม่ทำ**
- คำสั่งของปุ่มบน rich menu (`WebhookKeywords`) — ต้องแก้ที่ LINE console ก่อน แล้วโค้ดค่อยรับสองภาษาพร้อมกัน

---

## 7. บันทึกการทำงาน (log)

| วันที่ | งาน | สิ่งที่ทำ | commit | ผู้ทำ | หมายเหตุ |
|---|---|---|---|---|---|
| 2026-09-16 | **N3 เสร็จ** | เพิ่ม `MessageText` (ตัวแปลที่ผูกภาษาผู้รับไว้แล้ว) + `ILineMessageTextFactory` เป็นทางเข้าเดียวของทุกเส้นทางที่ส่งออก LINE · `LeaveNotificationJob` + `DailyAttendanceReportJob` ดึง `PreferredLanguage` มาพร้อมผู้รับแล้วประกอบการ์ดต่อคน · `LeaveType.NameTh` → `LocalizedName.For` · ชื่อเดือน/วันย้ายไป `AppDateFormat` (CultureInfo) · การ์ดเตือนเช็คอิน/ผลเช็คอิน/เช็คเอาต์/สรุปวันนี้ แปลครบ · webhook 7 ไฟล์แปลครบ · แคตตาล็อก **141 คีย์** เท่ากันทั้ง th/en · **ตรวจแล้ว:** `dotnet test` **437 pass/1 skip** (N2 412 + ใหม่ 25) · `i18n:scan` / `i18n:scan-api` เท่าเดิม · ยืนยันไฟล์ทั้ง 2 ภาษาไปโผล่ใน build output | (ยังไม่ commit) | | 🗑️ **`BuildOtpCard` ที่แผนสั่งให้แปล ไม่มีใครเรียก** — OTP ส่งเป็นข้อความธรรมดาจาก `RequestOtpHandler` · ลบทิ้งพร้อม `ReplyWithLocationRequestAsync` ที่ตายเหมือนกัน · ⚠️ **7 คำใน webhook ห้ามแปล** เพราะเป็นคำสั่งที่ปุ่ม rich menu ส่งเข้ามา ย้ายไปรวมที่ `WebhookKeywords` พร้อมเหตุผล · 🐞 **แก้บั๊กเดิม** altText คำขอลาเคยได้ "ขอ**ลาลา**พักร้อน" เพราะต่อคำว่า "ลา" ทับชื่อประเภทที่ขึ้นต้นด้วย "ลา" อยู่แล้ว · 🔎 **เจอเพิ่ม (ยังไม่แก้):** ข้อความ OTP ใน `RequestOtpHandler` เป็นไทยตายตัว และอยู่ในขั้นก่อนล็อกอินที่ยังไม่รู้ภาษาผู้ใช้ — ต้องเคาะก่อนว่าจะอ่านภาษาจาก header `X-Locale` ของ request นั้นไหม |
| 2026-09-16 | **N2 เสร็จ** | เพิ่มคอลัมน์ `preferred_language` ที่ `employees` + `external_reporters` (migration `AddPreferredLanguage`) · frontend แนบ header `X-Locale` ครบ **3 axios instance** (อ่านจาก cookie ตรง ๆ ไม่ใช่ `getCurrentLocale()`) · `PreferredLanguageMiddleware` วางหลัง `UseAuthorization()` แล้วเขียน DB เฉพาะตอนค่าเปลี่ยน (guard ในหน่วยความจำ 30 นาที + `WHERE preferred_language <> @locale`) · `NotificationDeliveryJob` เลือกภาษาตามผู้รับผ่าน `RecipientLocaleResolver` (พนักงานดูจาก id · ผู้แจ้งภายนอกดูจาก LINE user id) · แปลแคตตาล็อกเป็นอังกฤษ **45 คีย์** · ชื่อ master data (`department`, `taxonomy`) เก็บครบทุกภาษาใน `LocalizedParams` แล้วเลือกตอนส่ง · ป้าย enum ย้ายเป็นคีย์ `#enum.priority.*` / `#enum.routing.*` · **ดึงตัวการ์ด ticket/memo มาจาก N3.2 ทำด้วย** (ป้ายสถานะ 13 ตัว + ปุ่ม + บรรทัดเวลา → คีย์ `card.*`) เพราะทิ้งไว้จะได้เนื้อความอังกฤษบนกรอบการ์ดไทย · **ตรวจแล้ว:** `dotnet test` **412 pass/1 skip** (N1 360 + ใหม่ 52) · `tsc --noEmit` ผ่านทั้ง 2 แอป · `i18n:scan` / `i18n:scan-api` เท่าเดิม · ยืนยัน `bin/…/i18n/en/notifications.json` มีจริง | (ยังไม่ commit) | | 🔀 **ต่างจากแผน 1 ข้อ:** คอลัมน์เก็บภาษาที่ผู้ใช้เลือกจริง (รวม `id`) แล้วแปลง `id → en` **ตอน render** ไม่ใช่ตอนเขียน — คอลัมน์จะได้ไม่โกหก และวันที่มีไฟล์ `id` แค่เติมชื่อภาษาใน `AppLocale.NotificationLocales` ก็จบ · 🔴 **เจอเพิ่ม:** `PriorityLabel`/`RoutingOutcomeLabel` ใน `CreateTicketHandler` เป็น label map ภาษาไทยฝังใน C# ซึ่งผิดกติกา CLAUDE.md — ย้ายเข้าแคตตาล็อกแล้ว พร้อมเทสต์ที่ล็อกว่าคำอังกฤษต้องตรงกับ `status.ticketPriority` บนหน้าจอ · คำแปลอังกฤษยังเป็น**ร่างจาก AI** รอคนตรวจบน Excel |
| 2026-09-16 | **N1 เสร็จ** | `PayloadJson` เปลี่ยนจากข้อความสำเร็จรูปเป็น `{ templateKey, params }` (อ่านรูปเก่า `{ Message }` ได้ด้วย) · เพิ่ม `NotificationTemplate` (ประกอบข้อความ + **กติกาตัวแปรว่าง = ตัดทั้งบรรทัดทิ้ง**) และ `NotificationTemplateCatalog` (อ่าน `notifications.json` จาก output) · **ย้าย 42 จุดที่ queue (ticket 35 / memo 7)** จากต่อสตริง `$"…"` เป็น templateKey + params · แคตตาล็อก th **37 คีย์** ที่ `packages/i18n/messages/th/notifications.json` ลิงก์เข้า `Hrms.Api.csproj` เป็น Content · **ตรวจแล้ว:** build ผ่าน · `dotnet test` **360 pass/1 skip** (N0 344 + ใหม่ 16) · ยืนยันไฟล์ไปโผล่ที่ `bin/…/i18n/th/notifications.json` จริง · จุด queue ที่ยังมีข้อความไทยเหลือ **0** · `i18n:scan-api` ยัง 93 จุดเท่าเดิม | (ยังไม่ commit) | | 💡 **กติกาตัดบรรทัด** แทนของเดิมที่เขียน `reason is null ? "" : $"\nเหตุผล: {reason}"` ที่จุดเรียก — แบบเดิมคำว่า "เหตุผล:" ค้างในโค้ด C# แล้วแปลไม่ได้ · ✅ **`notifications` เข้า pipeline แปลเดิมได้เลย** `loadLocaleMessages('th')` เห็นเป็น namespace ใหม่ 37 คีย์ N2.3 สั่ง `pnpm i18n:export` ได้ทันทีโดยไม่ต้องแก้สคริปต์ · เทสต์ที่สำคัญที่สุดคือตัวที่**สแกน source จริงแล้วยืนยันว่าทุก templateKey มีอยู่ในแคตตาล็อก** และตัวที่**เทียบข้อความที่ประกอบได้กับข้อความไทยตัวเดิมเป๊ะ ๆ** |
| 2026-09-16 | **N0 เสร็จ** | `ResolveTicketStyle` เลิกเดาคำไทยจากเนื้อข้อความ → อ่าน `NotificationOutbox.EventType` แทน (15 เงื่อนไข `Contains` → `switch` แมป 29 event เป็น 9 สไตล์) · ย้ายการสร้างการ์ดใน `LeaveNotificationJob` + `DailyAttendanceReportJob` เข้าไปในลูปต่อผู้รับ · เพิ่ม [`LineFlexBuilderStyleTests`](../apps/api/Hrms.Application.Tests/Notifications/LineFlexBuilderStyleTests.cs) 33 เคส · **ตรวจแล้ว:** build ผ่าน · `dotnet test` 344 pass/1 skip (baseline 311 + ใหม่ 33) · `i18n:scan-api` ยัง 93 จุดเท่าเดิม · ข้อความในเส้นทาง LINE 327 → 306 | (ยังไม่ commit) | | **ผู้ใช้เห็นเปลี่ยน 2 จุด ตั้งใจ**: `TicketRequesterConfirmed` 🟢 งานใหม่ → 🟢 ปิดงานแล้ว (ข้อความ "ยืนยันปิดงาน" ไม่ตรงคำใดใน 15 เงื่อนไขเลย เลยตกเป็น default) · `TicketTeamMemberAdded` เคยได้ 2 สีในเหตุการณ์เดียว (คนที่ถูกดึงเข้า 🔵 / ทีมเดิม 🟢) เพราะข้อความแรกบังเอิญมีคำว่า "ผู้รับผิดชอบหลัก:" → รวมเป็น 🔵 · 💡 เคสที่ชัดที่สุดของปัญหาเดิม: `TicketCommented` เอา **ข้อความที่ผู้ใช้พิมพ์เอง** มาต่อในการ์ด ใครพิมพ์คำว่า "ปฏิเสธ" ในคอมเมนต์ การ์ดเปลี่ยนเป็นสีแดงทันที |
| 2026-09-16 | ร่างแผน | สำรวจโค้ดจริงหลังปิด Phase 3 — นับ 327 ข้อความในเส้นทาง LINE · เจอ 6 เรื่องในข้อ 2 · เคาะ D8 (ภาษาต้นทาง = en) · D9/D10/D11 รอเคาะ | (ยังไม่ commit) | | Phase 4 ในแผนหลักมี 3 บรรทัด ประเมิน 2–3 วัน — ของจริง 16 งานย่อย 4–5 วัน เพราะแผนเดิมนับแค่งานแปล ไม่ได้นับงานรื้อโครง |
