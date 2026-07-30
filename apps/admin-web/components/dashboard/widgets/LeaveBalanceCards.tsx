import type { MyDashboardDto } from '@hrms/shared-types'

type Props = { balances: MyDashboardDto['leaveBalance'] }

export function LeaveBalanceCards({ balances }: Props) {
  const visible = balances.filter(b => b.totalDays > 0)
  if (visible.length === 0) return null

  return (
    <div>
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        วันลาคงเหลือ
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map(b => {
          const pct = b.totalDays > 0 ? Math.round((b.remainingDays / b.totalDays) * 100) : 0
          const barColor = pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-500'
          return (
            <div key={b.leaveTypeName} className="rounded-xl border border-border bg-background p-3.5 shadow-sm">
              <p className="truncate text-xs text-muted-foreground">{b.leaveTypeName}</p>
              <div className="mt-1.5 flex items-end gap-1">
                <span className="text-2xl font-bold leading-none text-foreground">{b.remainingDays}</span>
                <span className="mb-0.5 text-xs text-muted-foreground">/ {b.totalDays} วัน</span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
              </div>
              {b.pendingDays > 0 && (
                <p className="mt-1 text-[10px] text-amber-500">รออนุมัติ {b.pendingDays} วัน</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
