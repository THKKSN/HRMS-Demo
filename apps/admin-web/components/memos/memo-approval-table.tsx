'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { EyeIcon, FileText, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { MEMO_TABLE_PAGE_SIZE, TablePagination } from '@/components/memos/table-pagination'
import { useMemosForApproval } from '@/hooks/use-memo'
import type { MemoStatus } from '@hrms/shared-types'

const STATUS_LABEL: Record<MemoStatus, string> = {
  Draft: 'แบบร่าง',
  Pending: 'รออนุมัติ',
  Approved: 'อนุมัติแล้ว',
  Rejected: 'ไม่อนุมัติ',
}

function statusVariant(status: MemoStatus): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' {
  if (status === 'Pending') return 'warning'
  if (status === 'Approved') return 'success'
  if (status === 'Rejected') return 'destructive'
  return 'secondary'
}

function thaiDateTime(value: string) {
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

export function MemoApprovalTable() {
  const [status, setStatus] = useState<MemoStatus | undefined>('Pending')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { data: allItems = [], isLoading } = useMemosForApproval(status)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return allItems
    return allItems.filter(item =>
      [item.memoNo, item.memoTypeName, item.memoCategoryNameSnapshot, item.memoSubCategoryNameSnapshot,
        item.requesterName, item.companyName, item.departmentName]
        .some(value => value.toLowerCase().includes(term)))
  }, [allItems, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / MEMO_TABLE_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const items = filtered.slice((currentPage - 1) * MEMO_TABLE_PAGE_SIZE, currentPage * MEMO_TABLE_PAGE_SIZE)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">อนุมัติ Memo</h2>
          <p className="mt-1 text-sm text-muted-foreground">ตรวจสอบและดำเนินการอนุมัติบันทึกข้อความของพนักงาน</p>
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
          value={status ?? ''}
          onChange={event => { setStatus((event.target.value || undefined) as MemoStatus | undefined); setPage(1) }}
          className="w-44"
        >
          <option value="">ทุกสถานะ</option>
          {(Object.keys(STATUS_LABEL) as MemoStatus[]).map(item => (
            <option key={item} value={item}>{STATUS_LABEL[item]}</option>
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
              <th className="px-4 py-3 font-medium">ส่งเมื่อ</th>
              <th className="px-4 py-3 font-medium">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 6 }).map((_, index) => (
              <tr key={index} className="border-b border-border">
                <td colSpan={6} className="px-4 py-3"><div className="h-5 animate-pulse rounded bg-muted" /></td>
              </tr>
            ))}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">ไม่พบรายการในเงื่อนไขที่เลือก</td></tr>
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
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.companyName} / {item.departmentName}</p>
                </td>
                <td className="px-4 py-3"><Badge variant={statusVariant(item.status)}>{STATUS_LABEL[item.status]}</Badge></td>
                <td className="px-4 py-3 text-muted-foreground">{thaiDateTime(item.createdAt)}</td>
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
