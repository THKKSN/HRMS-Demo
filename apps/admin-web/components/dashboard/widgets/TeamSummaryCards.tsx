import { Users, ClipboardCheck, UserX, Clock } from 'lucide-react'
import type { TeamDashboardDto } from '@hrms/shared-types'

type Props = { data: TeamDashboardDto }

export function TeamSummaryCards({ data }: Props) {
  const cards = [
    { icon: Users,          label: 'สมาชิกทีม',    value: data.teamSize,             color: 'text-teal-600 dark:text-teal-400',   bg: 'bg-teal-50 dark:bg-teal-500/15' },
    { icon: ClipboardCheck, label: 'รออนุมัติลา',  value: data.pendingApprovalCount, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/15' },
    { icon: Clock,          label: 'มาสายวันนี้',  value: data.todayStats.late,      color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-500/15' },
    { icon: UserX,          label: 'ขาด/ลาวันนี้', value: data.todayStats.absent + data.todayStats.onLeave, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/15' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map(c => (
        <div key={c.label} className="rounded-2xl border border-border bg-background p-4 shadow-sm">
          <div className={`inline-flex rounded-xl ${c.bg} p-2`}>
            <c.icon className={`h-5 w-5 ${c.color}`} />
          </div>
          <p className={`mt-2 text-3xl font-bold ${c.color}`}>{c.value}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{c.label}</p>
        </div>
      ))}
    </div>
  )
}
