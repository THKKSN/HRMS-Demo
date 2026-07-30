import type { TicketStatus } from '@hrms/shared-types'

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  Open: 'เรื่องใหม่',
  Assigned: 'มอบหมายแล้ว',
  InProgress: 'กำลังดำเนินการ',
  WaitingInfo: 'รอข้อมูล',
  Resolved: 'รอตรวจรับ',
  Closed: 'ปิดงานแล้ว',
  Rejected: 'ปฏิเสธ',
  Cancelled: 'ยกเลิก',
}
