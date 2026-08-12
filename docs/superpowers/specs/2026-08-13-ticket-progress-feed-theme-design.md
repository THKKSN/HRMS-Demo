# Ticket Progress Feed Theme Design

## Goal

ปรับ activity `progressFeed` บนหน้า Ticket Detail ของ Admin Web และ LIFF ให้ Light Theme ดูสะอาด อ่านง่าย และสมดุลกับ Dark Theme พร้อมแสดงการ์ด Process ที่เป็น `Closed` ด้วยโทนสีเขียว

## Scope

- ปรับเฉพาะ activity feed บนหน้า `/tickets/{id}` ของ Admin Web และ LIFF
- ไม่เปลี่ยนโครงสร้าง API, DTO, database หรือข้อมูลเดิม
- ไม่เปลี่ยน composer, attachment viewer, จำนวนการ์ดที่แสดง หรือ Show more behavior
- Dark Theme ยังคงพื้นสีตาม lane แบบ tint เบา ๆ

## Visual System

### Light Theme

การ์ดใช้ `bg-background` เป็นพื้นหลัก ไม่ย้อมพื้นทั้งการ์ดด้วยสี lane เพื่อหลีกเลี่ยง pastel block หลายก้อนต่อเนื่องกัน สีของ lane แสดงผ่านองค์ประกอบขนาดเล็กดังนี้:

- เส้น accent ด้านซ้ายของการ์ด
- icon container
- lane badge
- border สีอ่อน

ข้อความหลักใช้ `text-foreground` และ metadata ใช้ `text-muted-foreground` เพื่อให้ contrast สม่ำเสมอทุก lane

### Dark Theme

คง tinted surface แบบ opacity ต่ำ เพราะช่วยแยกประเภทการ์ดได้ดีบนพื้นมืด โดยยังใช้ border, icon และ badge ใน hue เดียวกับ lane

## Lane Colors

| Lane | Detection | Color |
| --- | --- | --- |
| Closed | `workflowStepKey` เท่ากับ `closed` แบบไม่สนตัวพิมพ์ หรือ `workState` เท่ากับ `Closed` หลัง trim แบบไม่สนตัวพิมพ์ | Emerald |
| Process | มี `workState` | Cyan |
| Hold / Wait | มี `blockerReason` | Amber |
| Waiting / Next | มี `nextAction` | Emerald |
| Activity | ไม่เข้าเงื่อนไขข้างต้น | Slate |

ต้องตรวจ Closed ก่อน Process เพราะข้อมูลจาก API ของขั้นปิดงานมีทั้ง `workflowStepKey = "closed"` และ `workState` ทำให้ branch Process จับก่อนใน implementation ปัจจุบัน

ชื่อ lane ของการ์ด Closed ใช้ `Closed` ทั้ง Admin Web และ LIFF ส่วน title ยังคงใช้ `workState` จาก API เพื่อไม่สูญเสียรายละเอียดภาษาไทยของเหตุการณ์

## Component Behavior

Admin Web และ LIFF ใช้กฎจำแนก lane และ visual tokens ชุดเดียวกันในเชิงพฤติกรรม แม้ implementation จะอยู่ใน frontend แต่ละแอปเพื่อให้ Tailwind ตรวจพบ class แบบ static ได้แน่นอน

แต่ละ feed item ต้องมี:

- `laneLabel`
- `Icon`
- `badgeClass`
- `surfaceClass`
- `iconClass`

`surfaceClass` ของ Light Theme ต้องมีพื้น `bg-background` และ accent ด้านซ้าย ส่วน `dark:*` จึงค่อยเพิ่ม tinted background

## Accessibility

- สีไม่ใช่สัญญาณเดียว: lane badge และ icon ยังคงแสดงอยู่
- สีข้อความต้องมี contrast ชัดใน Light และ Dark Theme
- ห้ามลดขนาดข้อความหรือพื้นที่กด Show more
- attachment และ metadata ต้องไม่ถูก accent overlay หรือบัง

## Testing

- Unit test การจำแนก Closed ก่อน Process โดยใช้ entry ที่มีทั้ง `workflowStepKey = "closed"` และ `workState`
- Unit test fallback `workState = " Closed "` แบบไม่สนตัวพิมพ์
- ตรวจว่า Light surface ใช้ `bg-background` และมี accent color
- ตรวจว่า Dark surface มี tinted background
- รัน TypeScript typecheck ของ Admin Web และ LIFF
- ตรวจหน้า Ticket Detail ด้วย browser ที่ Light และ Dark Theme สำหรับ Process, Hold และ Closed อย่างน้อยหนึ่งการ์ดต่อประเภท

## Success Criteria

- Light Theme ไม่มีพื้น pastel เต็มการ์ดสำหรับ Process, Hold, Waiting และ Activity
- Dark Theme ยังคงแยก lane ด้วย tinted surface
- Closed card เป็น emerald และแสดง lane label `Closed`
- Admin Web และ LIFF ให้ผลการจำแนกและสีเหมือนกัน
- behavior อื่นของ activity feed ไม่เปลี่ยน
