import type { TicketStatus } from '@hrms/shared-types'

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

export const TICKET_STATUS_CLASS: Record<TicketStatus, string> = {
  AwaitingRequesterConfirmation: 'border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-950/60 dark:text-violet-200',
  Open: 'border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-950/60 dark:text-sky-200',
  Assigned: 'border border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-950/60 dark:text-indigo-200',
  InProgress: 'border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-950/60 dark:text-blue-200',
  WaitingInfo: 'border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-200',
  Resolved: 'border border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-500/40 dark:bg-cyan-950/60 dark:text-cyan-200',
  Closed: 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/60 dark:text-emerald-200',
  Rejected: 'border border-red-200 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-950/60 dark:text-red-200',
  Cancelled: 'border border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-500/40 dark:bg-zinc-900/70 dark:text-zinc-200',
}
