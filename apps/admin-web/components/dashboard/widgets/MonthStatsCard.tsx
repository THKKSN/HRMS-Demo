import type { MyDashboardDto } from '@hrms/shared-types'

type Props = { stats: MyDashboardDto['monthStats'] }

const ITEMS = [
  { key: 'presentDays', label: 'มาทำงาน',  color: 'text-green-600',  bg: 'bg-green-50'  },
  { key: 'lateDays',    label: 'มาสาย',     color: 'text-amber-600',  bg: 'bg-amber-50'  },
  { key: 'absentDays',  label: 'ขาดงาน',   color: 'text-red-600',    bg: 'bg-red-50'    },
  { key: 'leaveDays',   label: 'วันลา',     color: 'text-purple-600', bg: 'bg-purple-50' },
] as const

export function MonthStatsCard({ stats }: Props) {
  const now = new Date()
  const label = now.toLocaleDateString('th-TH', { month: 'long', year: '2-digit' })

  return (
    <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
      <p className="text-sm font-semibold text-foreground">สถิติเดือน{label}</p>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {ITEMS.map(item => (
          <div key={item.key} className={`rounded-xl ${item.bg} p-3 text-center`}>
            <p className={`text-2xl font-bold ${item.color}`}>{stats[item.key]}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
