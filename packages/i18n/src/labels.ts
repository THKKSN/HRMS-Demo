import type {
  AttendanceStatus,
  ExpenseAttachmentDocumentType,
  ExpenseBillingBatchStatus,
  ExpenseClaimStatus,
  ExpenseClaimType,
  ExpenseOcrStatus,
  HalfDayType,
  LeaveStatus,
  MemoStatus,
  MemoStepKind,
  OrgType,
  OtRateType,
  OtStatus,
  TicketPriority,
  TicketStatus,
} from '@hrms/shared-types'

/**
 * ป้ายภาษาไทยของ enum ที่เคยประกาศซ้ำกันใน liff-web และ admin-web — รวมไว้ที่เดียว (i18n Phase 0.4)
 *
 * - ค่าที่ย้ายมาใน Phase 0 ต้องเท่ากับของเดิมทุกตัวอักษร (Phase 0 ห้ามเปลี่ยนสิ่งที่ผู้ใช้เห็น)
 * - ไฟล์นี้เป็น source ของ namespace `status` ใน messages/th — ไม่ใช่กลับกัน เพราะ test .mjs
 *   โหลด .ts ตรง ๆ ด้วย Node ซึ่ง import JSON ไม่ได้ถ้าไม่มี import attribute
 * - enum ที่ค่าไทยเคยไม่ตรงกันระหว่างหน้า ให้เคาะคำเดียวตอนแปลหน้านั้นใน Phase 1/2 แล้วค่อยเพิ่มที่นี่
 *   (LeaveStatus เคาะแล้วใช้คำของ liff · OtStatus, ExpenseClaimStatus.Rejected ยังรอ — ดู docs/i18n-multilanguage-plan.md)
 */

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  AwaitingRequesterConfirmation: 'รอผู้แจ้งบันทึกจบงานตรวจรับ',
  Open: 'เรื่องใหม่',
  Assigned: 'มอบหมายแล้ว',
  InProgress: 'กำลังดำเนินการ',
  WaitingInfo: 'รอข้อมูล',
  Resolved: 'รอตรวจรับ',
  Closed: 'ปิดงานแล้ว',
  Rejected: 'ปฏิเสธ',
  Cancelled: 'ยกเลิก',
}

export const TICKET_PRIORITY_LABEL: Record<TicketPriority, string> = {
  Low: 'ปกติ',
  Medium: 'กลาง',
  High: 'ด่วน',
  Critical: 'ด่วนมาก',
}

export const MEMO_STATUS_LABEL: Record<MemoStatus, string> = {
  Draft: 'แบบร่าง',
  Pending: 'รออนุมัติ',
  Approved: 'อนุมัติแล้ว',
  Rejected: 'ไม่อนุมัติ',
}

/**
 * ประเภทของขั้นตอนใน workflow ของ memo — เคาะคำตอนแปล Admin (Phase 2.8)
 * ใช้คำกลางของ enum ("ดำเนินการ" / "อนุมัติ") ตามหน้าตั้งค่า workflow
 * หน้ารายการงานที่ต้องสื่อว่า "กำลังรอ" มีคีย์ของตัวเองที่ `admin.memo.tasks.waitingKind.*`
 */
export const MEMO_STEP_KIND_LABEL: Record<MemoStepKind, string> = {
  Work: 'ดำเนินการ',
  Approval: 'อนุมัติ',
}

export const EXPENSE_CLAIM_TYPE_LABEL: Record<ExpenseClaimType, string> = {
  Fuel: 'ค่าน้ำมัน',
  Toll: 'ค่าทางด่วน',
  Parking: 'ค่าจอดรถ',
  Meal: 'ค่าอาหาร',
  Other: 'อื่น ๆ',
}

export const EXPENSE_BILLING_BATCH_STATUS_LABEL: Record<ExpenseBillingBatchStatus, string> = {
  Draft: 'แบบร่าง',
  Exported: 'Export แล้ว',
  Paid: 'จ่ายแล้ว',
  Cancelled: 'ยกเลิก',
}

export const EXPENSE_DOCUMENT_LABEL: Record<ExpenseAttachmentDocumentType, string> = {
  PaymentOrder: 'ใบสั่งจ่าย',
  Receipt: 'ใบเสร็จชำระเงิน',
  Other: 'เอกสารอื่น',
}

/** สิทธิ์การใช้งานระดับระบบ — เดิมอยู่ที่ `admin-web/lib/employee-roles.ts` (ย้ายมาใน Phase 2.5) */
export const ROLE_TYPE_LABEL: Record<string, string> = {
  Admin: 'ผู้ดูแลระบบ',
  Hr: 'ฝ่ายบุคคล',
  Supervisor: 'หัวหน้างาน',
  Executive: 'ผู้บริหาร',
  Employee: 'พนักงาน',
  // เพิ่มตอนแปล settings (Phase 2.10) — เดิมมีเฉพาะใน memo-flow-editor
  SchoolAdmin: 'ผู้ดูแลโรงเรียน',
}

export const ORG_TYPE_LABEL: Record<OrgType, string> = {
  Holding: 'บริษัทหลัก',
  Subsidiary: 'บริษัทในเครือ',
  Branch: 'สาขา',
  School: 'โรงเรียน',
}

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  Present: 'มาทำงาน',
  Late: 'มาสาย',
  Absent: 'ขาดงาน',
  HalfDay: 'ครึ่งวัน',
}

// เคาะ Phase 1 (2026-09-14): ใช้คำของ liff `leave-status-badge` เป็นหลัก — admin ที่เคยใช้ "รอยืนยันการยกเลิก" ให้ตามใน Phase 2
export const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = {
  Draft: 'ร่าง',
  PendingSupervisor: 'รอหัวหน้า',
  PendingHr: 'รอ HR',
  CancellationRequested: 'รอยกเลิก',
  Approved: 'อนุมัติแล้ว',
  Rejected: 'ถูกปฏิเสธ',
  Cancelled: 'ยกเลิกแล้ว',
}

export const LEAVE_HALF_DAY_LABEL: Record<HalfDayType, string> = {
  Full: 'เต็มวัน',
  Morning: 'ครึ่งเช้า',
  Afternoon: 'ครึ่งบ่าย',
}

// เคาะ Phase 1 (2026-09-14): ใช้ชุดคำเดียวกับ LeaveStatus (เดิม liff 2 หน้า + admin ใช้คนละคำ) — admin ให้ตามใน Phase 2
export const OT_STATUS_LABEL: Record<OtStatus, string> = {
  PendingSupervisor: 'รอหัวหน้า',
  PendingHr: 'รอ HR',
  Approved: 'อนุมัติแล้ว',
  Rejected: 'ถูกปฏิเสธ',
  Cancelled: 'ยกเลิกแล้ว',
}

// เคาะ Phase 1 (2026-09-14): Rejected = "ไม่อนุมัติ" ตาม liff (admin เคยใช้ "ปฏิเสธ") — admin ให้ตามใน Phase 2
/**
 * อัตราค่าล่วงเวลาตามชนิดวัน — เคาะคำตอนแปล Admin (Phase 2.7) ใช้คำชุดเดียวกับ LIFF
 * ตัวคูณ (×1.5) เป็นตัวเลข ไม่ต้องแปล จึงติดมากับข้อความได้ทุกภาษา
 */
export const OT_RATE_TYPE_LABEL: Record<OtRateType, string> = {
  Weekday: 'วันธรรมดา (×1.5)',
  Weekend: 'วันหยุด (×2)',
  Holiday: 'วันหยุดนักขัตฤกษ์ (×3)',
}

export const EXPENSE_CLAIM_STATUS_LABEL: Record<ExpenseClaimStatus, string> = {
  Draft: 'แบบร่าง',
  Pending: 'รอตรวจ',
  Approved: 'อนุมัติแล้ว',
  Rejected: 'ไม่อนุมัติ',
  Cancelled: 'ยกเลิก',
  Batched: 'เข้ารอบวางบิล',
  Paid: 'จ่ายแล้ว',
}

export const EXPENSE_OCR_STATUS_LABEL: Record<ExpenseOcrStatus, string> = {
  Pending: 'รอคิว',
  Processing: 'กำลังอ่าน',
  Succeeded: 'อ่านสำเร็จ',
  Failed: 'อ่านไม่สำเร็จ',
}

/**
 * namespace `status` ของ messages ภาษาไทย — ประกอบจาก label map ข้างบนตรง ๆ
 * key ต้องสะกดตรงกับที่ภาษาอื่นใช้ใน messages/<locale>/status.json (เช่น status.ticket.InProgress)
 * ไฟล์นี้ต้องไม่ import อะไรนอกจาก type เพื่อให้ Node โหลดตรง ๆ ได้ (test .mjs และ scripts/i18n-*.mjs)
 */
export const STATUS_MESSAGES = {
  ticket: TICKET_STATUS_LABEL,
  ticketPriority: TICKET_PRIORITY_LABEL,
  memo: MEMO_STATUS_LABEL,
  memoStepKind: MEMO_STEP_KIND_LABEL,
  expenseType: EXPENSE_CLAIM_TYPE_LABEL,
  expenseBillingBatch: EXPENSE_BILLING_BATCH_STATUS_LABEL,
  expenseDocument: EXPENSE_DOCUMENT_LABEL,
  orgType: ORG_TYPE_LABEL,
  roleType: ROLE_TYPE_LABEL,
  attendance: ATTENDANCE_STATUS_LABEL,
  leave: LEAVE_STATUS_LABEL,
  leaveHalfDay: LEAVE_HALF_DAY_LABEL,
  ot: OT_STATUS_LABEL,
  otRate: OT_RATE_TYPE_LABEL,
  expenseClaim: EXPENSE_CLAIM_STATUS_LABEL,
  expenseOcr: EXPENSE_OCR_STATUS_LABEL,
} as const
