import type { LeaveStatus } from '@hrms/shared-types'

const CONFIG: Record<LeaveStatus, { label: string; className: string }> = {
  Draft:             { label: 'ร่าง',          className: 'bg-gray-100 text-gray-600' },
  PendingSupervisor: { label: 'รอหัวหน้า',     className: 'bg-amber-100 text-amber-700' },
  PendingHr:         { label: 'รอ HR',          className: 'bg-blue-100 text-blue-700' },
  Approved:          { label: 'อนุมัติแล้ว',   className: 'bg-green-100 text-green-700' },
  Rejected:          { label: 'ถูกปฏิเสธ',     className: 'bg-red-100 text-red-700' },
  Cancelled:         { label: 'ยกเลิกแล้ว',    className: 'bg-gray-100 text-gray-500' },
}

export function LeaveStatusBadge({ status }: { status: LeaveStatus }) {
  const { label, className } = CONFIG[status] ?? CONFIG.Draft
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
