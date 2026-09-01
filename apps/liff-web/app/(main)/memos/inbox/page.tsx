'use client'

import { Inbox } from 'lucide-react'
import type { MemoInboxItemDto } from '@hrms/shared-types'
import { PageHeader } from '@/components/layout/page-header'
import { MemoListCard, memoThaiDate } from '@/components/memos/memo-list-card'
import { MemoListTabs } from '@/components/memos/memo-list-tabs'
import { useMemoInbox } from '@/hooks/use-memo'
import { useAuthStore } from '@/stores/auth.store'

// สถานะย่อยของเรื่องเข้าแผนก — เรียงตาม flow: รอผู้บริหาร → รอรับทราบ → รอส่งมอบ
function inboxMeta(memo: MemoInboxItemDto): { label: string; className: string } {
  if (memo.status === 'Pending')
    return { label: 'รอผู้บริหารอนุมัติ', className: 'border-slate-200 bg-slate-50 text-slate-600' }
  if (!memo.acknowledgedAt)
    return { label: 'รอรับทราบ', className: 'border-amber-200 bg-amber-50 text-amber-700' }
  if (!memo.deliveredAt)
    return { label: 'รอส่งมอบ', className: 'border-violet-200 bg-violet-50 text-violet-700' }
  return { label: 'ส่งมอบแล้ว', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
}

function InboxCard({ memo }: { memo: MemoInboxItemDto }) {
  const meta = inboxMeta(memo)
  return (
    <MemoListCard
      id={memo.id}
      memoNo={memo.memoNo}
      taxonomy={`${memo.memoTypeName} / ${memo.memoCategoryNameSnapshot} / ${memo.memoSubCategoryNameSnapshot}`}
      badgeLabel={meta.label}
      badgeClass={meta.className}
      footerLeft={`${memo.requesterName} · ${memo.requesterDepartmentName}`}
      footerRight={memoThaiDate(memo.approvedAt ?? memo.createdAt)}
    />
  )
}

// เรื่องเข้าแผนก — สำหรับหัวหน้าแผนกปลายทาง (role Supervisor) รับทราบ/ส่งมอบ
export default function MemoInboxPage() {
  const employee = useAuthStore(s => s.employee)
  const isSupervisor = employee?.roles.some(role => role.role === 'Supervisor') ?? false
  const { data: memos = [], isLoading, isError } = useMemoInbox(false, isSupervisor)

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <PageHeader title="Memo เข้าแผนก" subtitle={`${memos.length} รายการ`} />
      <MemoListTabs />

      <div className="border-t border-border">
        {!isSupervisor && (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            เฉพาะหัวหน้าแผนก (Supervisor) เท่านั้นที่เข้าถึงหน้านี้ได้
          </div>
        )}

        {isSupervisor && isLoading && Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="border-b border-border bg-background p-4">
            <div className="h-20 animate-pulse rounded-md bg-muted" />
          </div>
        ))}

        {isSupervisor && isError && (
          <div className="m-4 rounded-md border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
            โหลดรายการไม่สำเร็จ กรุณาลองใหม่
          </div>
        )}

        {isSupervisor && !isLoading && !isError && memos.length === 0 && (
          <div className="px-6 py-16 text-center">
            <Inbox className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-semibold">ไม่มีเรื่องเข้าแผนก</p>
            <p className="mt-1 text-xs text-muted-foreground">เรื่องที่รอรับทราบหรือรอส่งมอบจะแสดงที่นี่</p>
          </div>
        )}

        {isSupervisor && memos.map(memo => <InboxCard key={memo.id} memo={memo} />)}
      </div>
    </div>
  )
}
