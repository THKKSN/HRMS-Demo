'use client'

import { BarChart2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { useLeaveBalance } from '@/hooks/use-leaves'

export default function LeaveBalancePage() {
  const year = new Date().getFullYear()
  const { data: balances, isLoading } = useLeaveBalance(year)

  return (
    <>
      <PageHeader title={`โควตาการลา ${year + 543}`} backHref="/leaves" />

      <div className="flex flex-col gap-4 px-4 pb-24 pt-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))
        ) : !balances?.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BarChart2 className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">ยังไม่มีข้อมูลโควตาการลา</p>
          </div>
        ) : (
          balances.map(b => {
            const used = b.usedDays + b.pendingDays
            const pct = b.totalDays > 0 ? Math.min((used / b.totalDays) * 100, 100) : 0
            const usedPct = b.totalDays > 0 ? Math.min((b.usedDays / b.totalDays) * 100, 100) : 0
            const pendingPct = b.totalDays > 0 ? Math.min((b.pendingDays / b.totalDays) * 100, 100) : 0
            const isLow = b.remainingDays <= 1

            return (
              <div key={b.leaveTypeId} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{b.leaveTypeName}</p>
                  <span className={`text-sm font-semibold ${isLow ? 'text-destructive' : 'text-foreground'}`}>
                    คงเหลือ {b.remainingDays} วัน
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
                  <div className="flex h-full">
                    <div
                      className="h-full rounded-l-full bg-primary transition-all"
                      style={{ width: `${usedPct}%` }}
                    />
                    <div
                      className="h-full bg-amber-400 transition-all"
                      style={{ width: `${pendingPct}%` }}
                    />
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>ใช้ไป {b.usedDays} วัน{b.pendingDays > 0 ? ` + รออนุมัติ ${b.pendingDays} วัน` : ''}</span>
                  <span>ทั้งหมด {b.totalDays} วัน</span>
                </div>

                {/* Legend */}
                {b.pendingDays > 0 && (
                  <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                      อนุมัติแล้ว
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                      รออนุมัติ
                    </span>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
