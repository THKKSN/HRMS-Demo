import { useTranslations } from 'next-intl'
import { LogIn, LogOut, Clock } from 'lucide-react'
import type { MyDashboardDto } from '@hrms/shared-types'

type Props = { data: MyDashboardDto['todayAttendance'] }

export function AttendanceTodayCard({ data }: Props) {
  const t = useTranslations('admin.dashboard.attendance')
  const statusColor = !data
    ? 'text-muted-foreground'
    : data.isLate
    ? 'text-amber-600'
    : 'text-green-600'

  const statusLabel = !data
    ? t('notCheckedIn')
    : data.isLate
    ? t('lateBy', { minutes: data.lateMinutes })
    : t('onTime')

  return (
    <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{t('todayTitle')}</p>
        <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2.5">
          <LogIn className="h-4 w-4 shrink-0 text-green-600" />
          <div>
            <p className="text-[10px] text-muted-foreground">{t('checkIn')}</p>
            <p className="text-sm font-bold text-foreground">
              {data?.checkInTime ? data.checkInTime.substring(0, 5) : '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2.5">
          <LogOut className="h-4 w-4 shrink-0 text-blue-600" />
          <div>
            <p className="text-[10px] text-muted-foreground">{t('checkOut')}</p>
            <p className="text-sm font-bold text-foreground">
              {data?.checkOutTime ? data.checkOutTime.substring(0, 5) : '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
