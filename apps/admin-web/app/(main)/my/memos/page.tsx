'use client'

import Link from 'next/link'
import { useState } from 'react'
import { EyeIcon, FileText } from 'lucide-react'
import { MemoSectionNav } from '@/components/memos/memo-section-nav'
import { MEMO_TABLE_PAGE_SIZE, TablePagination } from '@/components/memos/table-pagination'
import { useMyMemos } from '@/hooks/use-memo'
import { cn } from '@/lib/utils'
import type { MemoListItemDto, MemoStatus } from '@hrms/shared-types'

const STATUS_TABS: { label: string; value: MemoStatus | undefined }[] = [
  { label: 'ทั้งหมด', value: undefined },
  { label: 'รออนุมัติ', value: 'Pending' },
  { label: 'อนุมัติแล้ว', value: 'Approved' },
  { label: 'ไม่อนุมัติ', value: 'Rejected' },
]

const STATUS_META: Record<MemoStatus, { label: string; className: string }> = {
  Draft:    { label: 'แบบร่าง',   className: 'bg-slate-100 text-slate-700' },
  Pending:  { label: 'รออนุมัติ', className: 'bg-amber-100 text-amber-700' },
  Approved: { label: 'อนุมัติแล้ว', className: 'bg-emerald-100 text-emerald-700' },
  Rejected: { label: 'ไม่อนุมัติ', className: 'bg-red-100 text-red-700' },
}

function thaiDateTime(value: string) {
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

// สถานะย่อยหลังอนุมัติ — ให้ผู้ขอเห็นความคืบหน้าจนจบ flow (รับทราบ → ดำเนินการ → ส่งมอบ → รับของ)
function progressMeta(item: MemoListItemDto) {
  if (item.status !== 'Approved') return STATUS_META[item.status]
  if (item.receivedAt) return { label: 'เสร็จสิ้น', className: 'bg-emerald-100 text-emerald-700' }
  if (item.deliveredAt) return { label: 'ส่งมอบแล้ว รอรับของ', className: 'bg-sky-100 text-sky-700' }
  if (item.acknowledgedAt) return { label: 'กำลังดำเนินการ', className: 'bg-amber-100 text-amber-700' }
  return { label: 'รอแผนกรับทราบ', className: 'bg-slate-100 text-slate-700' }
}

export default function MyMemosPage() {
  const [activeStatus, setActiveStatus] = useState<MemoStatus | undefined>(undefined)
  const [page, setPage] = useState(1)
  const { data: allItems = [], isLoading } = useMyMemos(activeStatus)

  const totalPages = Math.max(1, Math.ceil(allItems.length / MEMO_TABLE_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const items = allItems.slice((currentPage - 1) * MEMO_TABLE_PAGE_SIZE, currentPage * MEMO_TABLE_PAGE_SIZE)

  return (
    <div className="space-y-4">
      <MemoSectionNav />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Memo ของฉัน</h2>
          <p className="mt-1 text-sm text-muted-foreground">ติดตามเรื่องที่คุณส่ง ตั้งแต่รออนุมัติจนถึงรับของ</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          {allItems.length} รายการ
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => { setActiveStatus(tab.value); setPage(1) }}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              activeStatus === tab.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-background border border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-background">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-border bg-muted/30 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">เลขที่</th>
              <th className="px-4 py-3 font-medium">เรื่อง</th>
              <th className="px-4 py-3 font-medium">สถานะ</th>
              <th className="px-4 py-3 font-medium">ส่งเมื่อ</th>
              <th className="px-4 py-3 font-medium">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 4 }).map((_, index) => (
              <tr key={index} className="border-b border-border">
                <td colSpan={5} className="px-4 py-3"><div className="h-5 animate-pulse rounded bg-muted" /></td>
              </tr>
            ))}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center text-muted-foreground">
                  ยังไม่มีบันทึกข้อความ —{' '}
                  <Link href="/my/memos/new" className="text-primary underline">ส่งเรื่องใหม่</Link>
                </td>
              </tr>
            )}
            {items.map((item) => {
              const meta = progressMeta(item)
              return (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 truncate font-medium">{item.memoNo}</td>
                  <td className="px-4 py-3">
                    <p className="max-w-72 truncate font-medium">{item.memoTypeName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.memoCategoryNameSnapshot} / {item.memoSubCategoryNameSnapshot}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', meta.className)}>
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{thaiDateTime(item.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/my/memos/${item.id}`}
                      title="ดูรายละเอียด"
                      className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-sm text-muted-foreground hover:bg-muted/80"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <TablePagination page={currentPage} totalPages={totalPages} totalItems={allItems.length} onChange={setPage} />
      </div>
    </div>
  )
}
