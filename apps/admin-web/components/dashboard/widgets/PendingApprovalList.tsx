import Link from 'next/link'
import { ClipboardList } from 'lucide-react'
import type { TeamDashboardDto } from '@hrms/shared-types'

type Props = { items: TeamDashboardDto['pendingApprovals'] }

export function PendingApprovalList({ items }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-background shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-amber-500" />
          <p className="text-sm font-semibold text-foreground">รออนุมัติ</p>
          {items.length > 0 && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
              {items.length}
            </span>
          )}
        </div>
        <Link href="/leaves/pending" className="text-xs text-primary hover:underline">
          ดูทั้งหมด
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">ไม่มีรายการรออนุมัติ</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.slice(0, 5).map(item => (
            <li key={item.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{item.employeeName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.leaveTypeName} · {formatDate(item.dateFrom)}
                  {item.dateTo !== item.dateFrom && ` – ${formatDate(item.dateTo)}`}
                  {' '}({item.totalDays} วัน)
                </p>
              </div>
              <Link
                href={`/leaves/${item.id}`}
                className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
              >
                พิจารณา
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}
