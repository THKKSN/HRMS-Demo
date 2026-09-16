import { useTranslations } from 'next-intl'
import type { MyDashboardDto } from '@hrms/shared-types'
import * as fmt from '@hrms/i18n/format'

type Props = { stats: MyDashboardDto['monthStats'] }

// key ตรงกับทั้งฟิลด์ใน stats และคีย์ข้อความใน messages (admin.dashboard.monthStats.*)
const ITEMS = [
  { key: 'presentDays', color: 'text-green-600',  bg: 'bg-green-50'  },
  { key: 'lateDays',    color: 'text-amber-600',  bg: 'bg-amber-50'  },
  { key: 'absentDays',  color: 'text-red-600',    bg: 'bg-red-50'    },
  { key: 'leaveDays',   color: 'text-purple-600', bg: 'bg-purple-50' },
] as const

export function MonthStatsCard({ stats }: Props) {
  const t = useTranslations('admin.dashboard.monthStats')
  const now = new Date()
  const label = fmt.formatDate(now, { month: 'long', year: '2-digit' })

  return (
    <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
      <p className="text-sm font-semibold text-foreground">{t('title', { month: label })}</p>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {ITEMS.map(item => (
          <div key={item.key} className={`rounded-xl ${item.bg} p-3 text-center`}>
            <p className={`text-2xl font-bold ${item.color}`}>{stats[item.key]}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{t(item.key)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
