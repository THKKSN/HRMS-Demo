'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ClipboardList, Plus } from 'lucide-react'
import type { MemoListItemDto, MemoStatus } from '@hrms/shared-types'
import { PageHeader } from '@/components/layout/page-header'
import { MemoListCard, memoThaiDate } from '@/components/memos/memo-list-card'
import { MemoListTabs } from '@/components/memos/memo-list-tabs'
import { useMyMemos } from '@/hooks/use-memo'

const QUICK_STATUSES: Array<{ value?: MemoStatus; label: string }> = [
  { label: 'ทั้งหมด' },
  { value: 'Pending', label: 'รออนุมัติ' },
  { value: 'Approved', label: 'อนุมัติแล้ว' },
  { value: 'Rejected', label: 'ไม่อนุมัติ' },
]

const STATUS_CLASS: Record<MemoStatus, string> = {
  Draft: 'border-slate-200 bg-slate-50 text-slate-700',
  Pending: 'border-amber-200 bg-amber-50 text-amber-700',
  Approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Rejected: 'border-red-200 bg-red-50 text-red-700',
}

const STATUS_LABEL: Record<MemoStatus, string> = {
  Draft: 'แบบร่าง',
  Pending: 'รออนุมัติ',
  Approved: 'อนุมัติแล้ว',
  Rejected: 'ไม่อนุมัติ',
}

// สถานะย่อยหลังอนุมัติ — ให้ผู้ขอเห็นความคืบหน้าจนจบ flow (รับทราบ → ดำเนินการ → ส่งมอบ → รับของ)
function progressMeta(memo: MemoListItemDto): { label: string; className: string } {
  if (memo.status !== 'Approved')
    return { label: STATUS_LABEL[memo.status], className: STATUS_CLASS[memo.status] }
  if (memo.receivedAt) return { label: 'เสร็จสิ้น', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
  if (memo.deliveredAt) return { label: 'ส่งมอบแล้ว รอรับของ', className: 'border-sky-200 bg-sky-50 text-sky-700' }
  if (memo.acknowledgedAt) return { label: 'กำลังดำเนินการ', className: 'border-amber-200 bg-amber-50 text-amber-700' }
  return { label: 'รอแผนกรับทราบ', className: 'border-slate-200 bg-slate-50 text-slate-700' }
}

function MemoCard({ memo }: { memo: MemoListItemDto }) {
  const meta = progressMeta(memo)
  return (
    <MemoListCard
      id={memo.id}
      memoNo={memo.memoNo}
      taxonomy={`${memo.memoTypeName} / ${memo.memoCategoryNameSnapshot} / ${memo.memoSubCategoryNameSnapshot}`}
      badgeLabel={meta.label}
      badgeClass={meta.className}
      footerRight={memoThaiDate(memo.createdAt)}
    />
  )
}

export default function MyMemosPage() {
  const [status, setStatus] = useState<MemoStatus | undefined>()
  const { data: memos = [], isLoading, isError } = useMyMemos(status)

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <PageHeader title="Memoของฉัน" subtitle={`${memos.length} รายการ`} />
      <MemoListTabs />

      <div className="border-b border-border bg-background">
        <div className="scrollbar-none flex gap-2 overflow-x-auto px-4 py-3">
          {QUICK_STATUSES.map(item => {
            const active = status === item.value
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => setStatus(item.value)}
                className={`h-8 shrink-0 rounded-md border px-3 text-xs font-semibold ${
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="border-t border-border">
        {isLoading && Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="border-b border-border bg-background p-4">
            <div className="h-20 animate-pulse rounded-md bg-muted" />
          </div>
        ))}

        {isError && (
          <div className="m-4 rounded-md border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
            โหลดรายการไม่สำเร็จ กรุณาลองใหม่
          </div>
        )}

        {!isLoading && !isError && memos.length === 0 && (
          <div className="px-6 py-16 text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-semibold">ยังไม่มีบันทึกข้อความ</p>
            <p className="mt-1 text-xs text-muted-foreground">ลองเปลี่ยนตัวกรองหรือส่งเรื่องใหม่</p>
          </div>
        )}

        {memos.map(memo => <MemoCard key={memo.id} memo={memo} />)}
      </div>

      <div className="pointer-events-none fixed bottom-20 left-1/2 z-20 flex w-full max-w-107.5 -translate-x-1/2 justify-end px-4">
        <Link
          href="/memos/new"
          title="ส่งบันทึกข้อความใหม่"
          aria-label="ส่งบันทึกข้อความใหม่"
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background/80 active:scale-95"
        >
          <Plus className="h-6 w-6" />
        </Link>
      </div>
    </div>
  )
}
