'use client'

import Link from 'next/link'
import { useState, useCallback, useEffect, useRef } from 'react'
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, X, CalendarRange } from 'lucide-react'
import { LeaveStatusBadge } from '@/components/shared/leave-status-badge'
import { useAllLeaves } from '@/hooks/use-leaves'
import type { LeaveRequestListItemDto, LeaveStatus } from '@hrms/shared-types'

// ── Types ─────────────────────────────────────────────────────────────────────

type SortKey = 'employeeName' | 'leaveTypeName' | 'dateFrom' | 'totalDays' | 'status' | 'createdAt'
type SortDir = 'asc' | 'desc'

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { label: string; value: LeaveStatus | '' }[] = [
  { label: 'ทุกสถานะ',            value: '' },
  { label: 'รอหัวหน้า',           value: 'PendingSupervisor' },
  { label: 'รอ HR',               value: 'PendingHr' },
  { label: 'อนุมัติแล้ว',         value: 'Approved' },
  { label: 'ถูกปฏิเสธ',           value: 'Rejected' },
  { label: 'ยกเลิกแล้ว',          value: 'Cancelled' },
  { label: 'รอยืนยันการยกเลิก',   value: 'CancellationRequested' },
]

const PAGE_SIZE_OPTIONS = [20, 50, 100]

const QUICK_RANGES: { label: string; dateFrom: string; dateTo: string }[] = (() => {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  const thisMonthStart = new Date(y, m, 1)
  const thisMonthEnd   = new Date(y, m + 1, 0)
  const lastMonthStart = new Date(y, m - 1, 1)
  const lastMonthEnd   = new Date(y, m, 0)
  const thisYearStart  = new Date(y, 0, 1)
  const thisYearEnd    = new Date(y, 11, 31)

  return [
    { label: 'เดือนนี้',       dateFrom: fmt(thisMonthStart), dateTo: fmt(thisMonthEnd) },
    { label: 'เดือนที่แล้ว',   dateFrom: fmt(lastMonthStart), dateTo: fmt(lastMonthEnd) },
    { label: `ปี ${y + 543}`,  dateFrom: fmt(thisYearStart),  dateTo: fmt(thisYearEnd) },
  ]
})()

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTH(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit',
  })
}

function formatDateTimeShort(iso: string) {
  return new Date(iso).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Bangkok',
  })
}

function sortItems(items: LeaveRequestListItemDto[], key: SortKey, dir: SortDir) {
  return [...items].sort((a, b) => {
    let av: string | number = ''
    let bv: string | number = ''
    switch (key) {
      case 'employeeName':  av = a.employeeName ?? ''; bv = b.employeeName ?? ''; break
      case 'leaveTypeName': av = a.leaveTypeName;      bv = b.leaveTypeName;      break
      case 'dateFrom':      av = a.dateFrom;           bv = b.dateFrom;           break
      case 'totalDays':     av = a.totalDays;          bv = b.totalDays;          break
      case 'status':        av = a.status;             bv = b.status;             break
      case 'createdAt':     av = a.createdAt;          bv = b.createdAt;          break
    }
    if (av < bv) return dir === 'asc' ? -1 : 1
    if (av > bv) return dir === 'asc' ? 1 : -1
    return 0
  })
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/40" />
  return sortDir === 'asc'
    ? <ChevronUp className="h-3.5 w-3.5 text-primary" />
    : <ChevronDown className="h-3.5 w-3.5 text-primary" />
}

function Th({
  col, label, sortKey, sortDir, onSort, className = '',
}: {
  col: SortKey; label: string; sortKey: SortKey; sortDir: SortDir
  onSort: (c: SortKey) => void; className?: string
}) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold text-muted-foreground select-none cursor-pointer hover:text-foreground transition-colors ${className}`}
      onClick={() => onSort(col)}
    >
      <div className="flex items-center gap-1">
        {label}
        <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </div>
    </th>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LeaveHistoryPage() {
  const [search, setSearch]       = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus]       = useState<LeaveStatus | ''>('')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')
  const [page, setPage]           = useState(1)
  const [pageSize, setPageSize]   = useState(20)
  const [sortKey, setSortKey]     = useState<SortKey>('createdAt')
  const [sortDir, setSortDir]     = useState<SortDir>('desc')

  // debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  // reset page on filter change
  useEffect(() => { setPage(1) }, [debouncedSearch, status, dateFrom, dateTo, pageSize])

  const { data, isLoading } = useAllLeaves({
    page,
    pageSize,
    status: status || undefined,
    search: debouncedSearch || undefined,
    dateFrom: dateFrom || undefined,
    dateTo:   dateTo   || undefined,
  })

  const handleSort = useCallback((col: SortKey) => {
    setSortDir(prev => col === sortKey ? (prev === 'asc' ? 'desc' : 'asc') : 'desc')
    setSortKey(col)
  }, [sortKey])

  const sortedItems = data?.items ? sortItems(data.items, sortKey, sortDir) : []
  const totalPages  = data ? Math.ceil(data.totalCount / pageSize) : 1

  function applyQuickRange(r: typeof QUICK_RANGES[0]) {
    setDateFrom(r.dateFrom)
    setDateTo(r.dateTo)
  }

  function clearFilters() {
    setSearch('')
    setStatus('')
    setDateFrom('')
    setDateTo('')
  }

  const hasFilters = search || status || dateFrom || dateTo

  return (
    <div className="min-h-full bg-muted/30 p-4 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-4">

        {/* ── Header ──────────────────────────────────────── */}
        <div>
          <h1 className="text-xl font-bold text-foreground">ประวัติการลา</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">ตรวจสอบคำขอลาของพนักงานทุกคน</p>
        </div>

        {/* ── Filter bar ──────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-background p-4 shadow-sm space-y-3">
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="ค้นหาชื่อพนักงาน..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted/40 py-2 pl-9 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Status */}
            <select
              value={status}
              onChange={e => setStatus(e.target.value as LeaveStatus | '')}
              className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* Page size */}
            <select
              value={pageSize}
              onChange={e => setPageSize(Number(e.target.value))}
              className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            >
              {PAGE_SIZE_OPTIONS.map(s => (
                <option key={s} value={s}>{s} รายการ</option>
              ))}
            </select>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                ล้างตัวกรอง
              </button>
            )}
          </div>

          {/* Date range row */}
          <div className="flex flex-wrap items-center gap-3">
            <CalendarRange className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
            <span className="text-sm text-muted-foreground">ถึง</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
            <div className="flex gap-2">
              {QUICK_RANGES.map(r => (
                <button
                  key={r.label}
                  onClick={() => applyQuickRange(r)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    dateFrom === r.dateFrom && dateTo === r.dateTo
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Table ───────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-background shadow-sm overflow-hidden">
          {/* Table header info */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {isLoading ? '...' : `${data?.totalCount ?? 0} รายการ`}
              {(dateFrom || dateTo) && (
                <span className="ml-2 text-xs text-primary">
                  {dateFrom && formatDateTH(dateFrom)} – {dateTo && formatDateTH(dateTo)}
                </span>
              )}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <Th col="employeeName"  label="พนักงาน"     sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <Th col="leaveTypeName" label="ประเภทลา"    sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <Th col="dateFrom"      label="วันที่ลา"    sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <Th col="totalDays"     label="จำนวน"       sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-center" />
                  <Th col="status"        label="สถานะ"       sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <Th col="createdAt"     label="ยื่นเมื่อ"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  Array.from({ length: pageSize > 10 ? 10 : pageSize }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 animate-pulse rounded bg-muted" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : sortedItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-sm text-muted-foreground">
                      ไม่พบข้อมูลที่ตรงกับเงื่อนไข
                    </td>
                  </tr>
                ) : (
                  sortedItems.map(item => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {item.employeeName ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.leaveTypeName}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDateTH(item.dateFrom)}
                        {item.dateFrom !== item.dateTo && (
                          <span> – {formatDateTH(item.dateTo)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {item.totalDays} วัน
                      </td>
                      <td className="px-4 py-3">
                        <LeaveStatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTimeShort(item.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/my/leaves/${item.id}`}
                          className="text-xs text-primary hover:underline"
                        >
                          ดูรายละเอียด
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ──────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                หน้า {page} จาก {totalPages}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="rounded-lg border px-2.5 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors"
                >
                  «
                </button>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors"
                >
                  ก่อนหน้า
                </button>

                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                  const p = start + i
                  return p <= totalPages ? (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        p === page
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      {p}
                    </button>
                  ) : null
                })}

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors"
                >
                  ถัดไป
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="rounded-lg border px-2.5 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
