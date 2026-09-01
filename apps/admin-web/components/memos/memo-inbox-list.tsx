'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { EyeIcon, FileText, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { MEMO_TABLE_PAGE_SIZE, TablePagination } from '@/components/memos/table-pagination'
import { useMemoInbox } from '@/hooks/use-memo'
import type { MemoInboxItemDto } from '@hrms/shared-types'

function thaiDateTime(value?: string) {
  return value ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—'
}

// สถานะย่อยของเรื่องในมุมแผนกปลายทาง — คำนวณจาก status + timestamp ของแต่ละขั้น
type InboxStatusKey = 'pending-approval' | 'awaiting-ack' | 'in-progress' | 'delivered' | 'completed'

export function inboxStatusKey(item: MemoInboxItemDto): InboxStatusKey {
  if (item.status === 'Pending') return 'pending-approval'
  if (item.receivedAt) return 'completed'
  if (item.deliveredAt) return 'delivered'
  if (item.acknowledgedAt) return 'in-progress'
  return 'awaiting-ack'
}

const INBOX_STATUS_OPTIONS: { value: InboxStatusKey; label: string }[] = [
  { value: 'pending-approval', label: 'รอผู้บริหารอนุมัติ' },
  { value: 'awaiting-ack', label: 'รอรับทราบ' },
  { value: 'in-progress', label: 'กำลังดำเนินการ' },
  { value: 'delivered', label: 'ส่งมอบแล้ว' },
  { value: 'completed', label: 'เสร็จสิ้น' },
]

export function inboxStatusBadge(item: MemoInboxItemDto) {
  switch (inboxStatusKey(item)) {
    case 'pending-approval': return <Badge variant="secondary">รอผู้บริหารอนุมัติ</Badge>
    case 'completed': return <Badge variant="success">เสร็จสิ้น</Badge>
    case 'delivered': return <Badge variant="success">ส่งมอบแล้ว</Badge>
    case 'in-progress': return <Badge variant="warning">กำลังดำเนินการ</Badge>
    default: return <Badge variant="warning">รอรับทราบ</Badge>
  }
}

export function MemoInboxList() {
  const [statusFilter, setStatusFilter] = useState<InboxStatusKey | ''>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  // ดึงทั้งหมด (รวมส่งมอบแล้ว) แล้วกรองตามสถานะฝั่ง client
  const { data: allItems = [], isLoading } = useMemoInbox(true)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return allItems.filter(item => {
      if (statusFilter && inboxStatusKey(item) !== statusFilter) return false
      if (!term) return true
      return [item.memoNo, item.memoTypeName, item.memoCategoryNameSnapshot, item.memoSubCategoryNameSnapshot,
        item.requesterName, item.requesterCompanyName, item.requesterDepartmentName]
        .some(value => value.toLowerCase().includes(term))
    })
  }, [allItems, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / MEMO_TABLE_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const items = filtered.slice((currentPage - 1) * MEMO_TABLE_PAGE_SIZE, currentPage * MEMO_TABLE_PAGE_SIZE)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Memo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            เรื่องที่ส่งเข้าแผนกของคุณ — เห็นตั้งแต่รอผู้บริหารอนุมัติเพื่อเตรียมงาน เมื่ออนุมัติแล้วจึงรับทราบ ดำเนินการ และส่งมอบ
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          {filtered.length} รายการ
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="ค้นหา เลขที่ / เรื่อง / ผู้ขอ..."
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as InboxStatusKey | ''); setPage(1) }}
          className="w-44"
        >
          <option value="">ทุกสถานะ</option>
          {INBOX_STATUS_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-background">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-border bg-muted/30 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">เลขที่</th>
              <th className="px-4 py-3 font-medium">เรื่อง</th>
              <th className="px-4 py-3 font-medium">ผู้ขอ</th>
              <th className="px-4 py-3 font-medium">สถานะ</th>
              <th className="px-4 py-3 font-medium">อนุมัติเมื่อ</th>
              <th className="px-4 py-3 font-medium">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 4 }).map((_, index) => (
              <tr key={index} className="border-b border-border">
                <td colSpan={7} className="px-4 py-3"><div className="h-5 animate-pulse rounded bg-muted" /></td>
              </tr>
            ))}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">ไม่มีเรื่องค้างดำเนินการ</td></tr>
            )}
            {items.map(item => (
              <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 truncate font-medium">{item.memoNo}</td>
                <td className="px-4 py-3">
                  <p className="max-w-72 truncate font-medium">{item.memoTypeName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.memoCategoryNameSnapshot} / {item.memoSubCategoryNameSnapshot}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p className="max-w-72 truncate font-medium">{item.requesterName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.requesterCompanyName} / {item.requesterDepartmentName}
                  </p>
                </td>
                <td className="px-4 py-3">{inboxStatusBadge(item)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {item.status === 'Pending' ? '—' : thaiDateTime(item.approvedAt)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/memos/${item.id}`}
                    title="ดูรายละเอียด"
                    className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-sm text-muted-foreground hover:bg-muted/80"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <TablePagination page={currentPage} totalPages={totalPages} totalItems={filtered.length} onChange={setPage} />
      </div>
    </div>
  )
}
