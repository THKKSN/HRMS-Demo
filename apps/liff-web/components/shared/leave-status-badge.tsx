import { useTranslations } from 'next-intl'
import type { LeaveStatus } from '@hrms/shared-types'

// ป้ายข้อความอยู่ที่ @hrms/i18n (status.leave) — ไฟล์นี้เหลือแค่สี
const CLASS_NAME: Record<LeaveStatus, string> = {
  Draft:                 'bg-gray-100 text-gray-600',
  PendingSupervisor:     'bg-amber-100 text-amber-700',
  PendingHr:             'bg-blue-100 text-blue-700',
  CancellationRequested: 'bg-orange-100 text-orange-700',
  Approved:              'bg-green-100 text-green-700',
  Rejected:              'bg-red-100 text-red-700',
  Cancelled:             'bg-gray-100 text-gray-500',
}

export function LeaveStatusBadge({ status }: { status: LeaveStatus }) {
  const t = useTranslations('status.leave')
  const key: LeaveStatus = status in CLASS_NAME ? status : 'Draft'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CLASS_NAME[key]}`}>
      {t(key)}
    </span>
  )
}
