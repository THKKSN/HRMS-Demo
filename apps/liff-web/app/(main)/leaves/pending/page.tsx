'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { LeaveStatusBadge } from '@/components/shared/leave-status-badge'
import { usePendingApprovals } from '@/hooks/use-leaves'
import { isSupervisorOrAbove } from '@/lib/auth-utils'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'

export default function PendingApprovalsPage() {
  const router = useRouter()
  const employee = useAuthStore(s => s.employee)
  const { data, isLoading } = usePendingApprovals()

  useEffect(() => {
    if (employee && !isSupervisorOrAbove(employee.roles)) {
      router.replace('/leaves')
    }
  }, [employee, router])

  if (!employee || !isSupervisorOrAbove(employee.roles)) return null

  return (
    <>
      <PageHeader title="รออนุมัติ" backHref="/leaves" />

      <div className="flex flex-col gap-3 px-4 pb-24 pt-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))
        ) : !data?.items.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="mt-4 text-sm font-medium">ไม่มีคำขอรออนุมัติ</p>
            <p className="mt-1 text-xs text-muted-foreground">ทุกรายการได้รับการดำเนินการแล้ว</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {data.totalCount} รายการรออนุมัติ
            </p>
            {data.items.map(item => (
              <Link
                key={item.id}
                href={`/leaves/${item.id}`}
                className="rounded-xl border bg-card p-4 shadow-sm active:bg-muted"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.employeeName}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{item.leaveTypeName}</p>
                  </div>
                  <LeaveStatusBadge status={item.status} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {formatDate(item.dateFrom)}
                    {item.dateFrom !== item.dateTo && ` – ${formatDate(item.dateTo)}`}
                  </span>
                  <span>{item.totalDays} วัน</span>
                </div>
              </Link>
            ))}
          </>
        )}
      </div>
    </>
  )
}
