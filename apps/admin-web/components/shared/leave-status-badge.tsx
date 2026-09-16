'use client'

import { useTranslations } from 'next-intl'
import type { LeaveStatus } from '@hrms/shared-types'

// ป้ายสถานะอยู่ที่ @hrms/i18n/labels (status.leave) — ที่นี่เหลือแค่โทนสี
const TONE: Record<LeaveStatus, string> = {
  Draft:                   'bg-gray-100 text-gray-600',
  PendingSupervisor:       'bg-amber-100 text-amber-700',
  PendingHr:               'bg-blue-100 text-blue-700',
  Approved:                'bg-green-100 text-green-700',
  Rejected:                'bg-red-100 text-red-700',
  Cancelled:               'bg-gray-100 text-gray-500',
  CancellationRequested:   'bg-orange-100 text-orange-700',
}

export function LeaveStatusBadge({ status }: { status: LeaveStatus }) {
  const t = useTranslations('status.leave')
  const key = status in TONE ? status : 'Draft'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[key]}`}>
      {t(key)}
    </span>
  )
}
