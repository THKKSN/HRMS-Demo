# การออกแบบการตั้งค่า External Ticket

**วันที่:** 2026-08-17

## ขอบเขต

พัฒนา Phase 2, Task 4 ของระบบ external ticket: backend สำหรับตั้งค่าช่องทางและ API taxonomy ที่ปลอดภัย งานนี้ยังไม่รวม Admin UI, endpoint สำหรับสร้าง external ticket, route จาก Rich Menu หรือการ deploy ไป production.

## แบบจำลองข้อมูล

เพิ่มเฉพาะตาราง external ต่อไปนี้ใน migration ใหม่ `AddExternalTicketConfiguration`:

- `external_ticket_configurations`: configuration หนึ่งแถวของบริษัทที่กำหนดตายตัว เก็บ `TargetDepartmentId`, `IsEnabled`, `RequireOaFriendship`, version และ URL ของ privacy notice รวมถึง `UpdatedAt`
- `external_ticket_categories`
- `external_ticket_topics`
- `external_ticket_subjects`

ตาราง category, topic และ subject เป็นลำดับชั้นสำหรับ external โดยเฉพาะ มีชื่อที่แสดง, คำอธิบาย, ลำดับ และสถานะ active มีเพียง external subject ที่เก็บ `InternalTicketSubjectId`.

บริษัทที่กำหนดตายตัวคือ `c89cb0d1-7548-4c1b-a36a-929f094f0b30` แทนด้วย `ExternalTicketConstants.TargetCompanyId` API จะไม่รับ company identifier จาก request และ category, topic, subject ใช้การเปิด/ปิดสถานะแทนการลบจริงเท่านั้น.

Migration สร้างเฉพาะตาราง, index, foreign key ของชุดนี้ และ configuration เริ่มต้นที่ปิดใช้งาน ห้ามแก้ schema requester/actor จาก Phase 1 หรือตารางอื่นที่ไม่เกี่ยวข้อง.

## สิทธิ์และ API

เพิ่ม permission `ticket:manage-external-config` และกำหนดให้ role Admin โดยค่าเริ่มต้น ทุก administrative command ต้องตรวจ permission นี้ใน application handler.

Administrative API:

```text
GET  /v1/external-ticket-config
PUT  /v1/external-ticket-config
POST /v1/external-ticket-config/categories
PUT  /v1/external-ticket-config/categories/{id}
POST /v1/external-ticket-config/topics
PUT  /v1/external-ticket-config/topics/{id}
POST /v1/external-ticket-config/subjects
PUT  /v1/external-ticket-config/subjects/{id}
```

Public API สำหรับ external session คือ `GET /v1/external/ticket-form` ซึ่งคืนเฉพาะ external taxonomy ที่ active และข้อมูลจำเป็นต่อการแสดง form ในอนาคต โดยห้ามคืน internal taxonomy identifier หรือ mapping.

## การตรวจสอบข้อมูลและ Concurrency

ก่อนเปิดใช้งานช่องทาง ต้องมี:

- target department ที่ active และอยู่ในบริษัทที่กำหนดตายตัว
- privacy notice version และ URL ที่ไม่ว่าง
- external subject ที่ active อย่างน้อยหนึ่งรายการ ซึ่ง map ไปยัง internal subject ที่ active ในบริษัทและ target department เดียวกัน

การตรวจ mapping ต้องปฏิเสธ internal subject ที่ข้ามบริษัท, ข้าม department, inactive หรือไม่พบ ทุก update รับ `ExpectedUpdatedAt`; หากเป็นค่าเก่าต้องตอบ `409 CONFIG_CHANGED` แทนการเขียนทับ configuration ล่าสุด.

ทุก administrative mutation สร้าง audit record ที่ผ่านการตัดข้อมูลอ่อนไหวแล้ว โดยบันทึกชื่อ node, สถานะ active, department และ internal subject mapping แต่ไม่บันทึก LINE หรือ contact PII.

## พฤติกรรมเมื่อเกิดข้อผิดพลาด

Command ต้อง fail อย่างชัดเจนเมื่อไม่มี permission, target department ไม่ถูกต้อง, mapping ไม่ถูกต้อง, ขาดเงื่อนไขก่อนเปิดใช้ หรือ version เก่า Public form API ซ่อน node ที่ inactive และรายงานว่าช่องทางปิดใช้งาน แทนการคืน form ที่สร้างเรื่องได้.

## การตรวจสอบ

เพิ่ม focused test สำหรับการปฏิเสธเมื่อไม่มี permission, การบังคับใช้ fixed company, ความพร้อมก่อน enable, การตรวจ taxonomy mapping, stale update และการกรอง public form ก่อนถือว่า Task 4 เสร็จ ต้องตรวจว่า migration ที่สร้างมีเฉพาะ 4 external configuration tables พร้อม index, foreign key และ disabled configuration seed.

รัน focused external configuration tests และ build ส่วน API/infrastructure ที่ได้รับผลกระทบ เริ่ม Task 5 ได้เมื่อการตรวจเหล่านี้ผ่านเท่านั้น.
