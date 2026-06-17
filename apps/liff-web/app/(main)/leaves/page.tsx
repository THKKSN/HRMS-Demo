'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { LeaveStatusBadge } from '@/components/shared/leave-status-badge'
import { useMyLeaves } from '@/hooks/use-leaves'
import type { LeaveStatus } from '@hrms/shared-types'

const STATUS_TABS: { label: string; value: LeaveStatus | undefined }[] = [
  { label: 'ทั้งหมด',      value: undefined },
  { label: 'รออนุมัติ',    value: 'PendingSupervisor' },
  { label: 'อนุมัติแล้ว',  value: 'Approved' },
  { label: 'ถูกปฏิเสธ',    value: 'Rejected' },
]

function formatDateTH(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}

export default function LeavesPage() {
  const [activeStatus, setActiveStatus] = useState<LeaveStatus | undefined>(undefined)
  const { data, isLoading } = useMyLeaves({ status: activeStatus })

  return (
    <>
      <PageHeader title="ประวัติการลา" action={
        <Link
          href="/leaves/new"
          className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground"
        >
          ขอลา
        </Link>
      } />

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.label}
            onClick={() => setActiveStatus(tab.value)}
            className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              activeStatus === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 px-4 pb-24">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))
        ) : !data?.items.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm font-medium">ยังไม่มีประวัติการลา</p>
            <Link
              href="/leaves/new"
              className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
            >
              ขอลาเลย
            </Link>
          </div>
        ) : (
          data.items.map(item => (
            <Link
              key={item.id}
              href={`/leaves/${item.id}`}
              className="rounded-xl border bg-card p-4 shadow-sm active:bg-muted"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{item.leaveTypeName}</p>
                <LeaveStatusBadge status={item.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatDateTH(item.dateFrom)}
                {item.dateFrom !== item.dateTo && ` – ${formatDateTH(item.dateTo)}`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{item.totalDays} วัน</p>
            </Link>
          ))
        )}
      </div>
    </>
  )
}
