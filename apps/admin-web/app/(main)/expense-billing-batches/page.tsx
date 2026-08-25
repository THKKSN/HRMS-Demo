'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { CalendarDays, ChevronRight, FileSpreadsheet, Search } from 'lucide-react'
import type { ExpenseBillingBatchStatus } from '@hrms/shared-types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useExpenseBillingBatches } from '@/hooks/use-expense-billing-batches'

const PAGE_SIZE = 20

const STATUS_LABEL: Record<ExpenseBillingBatchStatus, string> = {
  Draft: 'แบบร่าง',
  Exported: 'Export แล้ว',
  Paid: 'จ่ายแล้ว',
  Cancelled: 'ยกเลิก',
}

const STATUS_VARIANT: Record<ExpenseBillingBatchStatus, 'secondary' | 'info' | 'success' | 'outline'> = {
  Draft: 'secondary',
  Exported: 'info',
  Paid: 'success',
  Cancelled: 'outline',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`))
}

function formatDateTime(value?: string) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}

export default function ExpenseBillingBatchesPage() {
  const [status, setStatus] = useState<ExpenseBillingBatchStatus | undefined>()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [batchNoInput, setBatchNoInput] = useState('')
  const [batchNo, setBatchNo] = useState('')
  const [page, setPage] = useState(1)

  const params = useMemo(() => ({
    status,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    batchNo: batchNo || undefined,
    page,
    pageSize: PAGE_SIZE,
  }), [status, dateFrom, dateTo, batchNo, page])

  const query = useExpenseBillingBatches(params)
  const items = query.data?.items ?? []
  const totalCount = query.data?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  function resetPage<T>(setter: (value: T) => void, value: T) {
    setter(value)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">รอบวางบิลค่าใช้จ่าย</h1>
          <p className="mt-1 text-sm text-muted-foreground">ติดตามรอบวางบิล Export และสถานะการจ่ายเงิน</p>
        </div>
        <Link
          href="/expenses"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-whited focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
            <FileSpreadsheet className="h-4 w-4" />
            เลือกรายการสร้างรอบ
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-background p-4">
        <div className="grid gap-3 md:grid-cols-[180px_180px_180px_1fr]">
          <select
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            value={status ?? ''}
            onChange={(event) => resetPage(setStatus, (event.target.value || undefined) as ExpenseBillingBatchStatus | undefined)}
          >
            <option value="">ทุกสถานะ</option>
            {(Object.keys(STATUS_LABEL) as ExpenseBillingBatchStatus[]).map(item => (
              <option key={item} value={item}>{STATUS_LABEL[item]}</option>
            ))}
          </select>
          <Input type="date" value={dateFrom} onChange={(event) => resetPage(setDateFrom, event.target.value)} />
          <Input type="date" value={dateTo} onChange={(event) => resetPage(setDateTo, event.target.value)} />
          <form
            className="relative"
            onSubmit={(event) => {
              event.preventDefault()
              resetPage(setBatchNo, batchNoInput.trim())
            }}
          >
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={batchNoInput}
              onChange={(event) => setBatchNoInput(event.target.value)}
              placeholder="ค้นหา Batch No"
              className="pl-9"
            />
          </form>
        </div>
      </div>

      <div className="overflow-auto rounded-lg border border-border bg-background">
        <table className="w-full min-w-[920px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Batch No</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">รอบวันที่</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">สถานะ</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">จำนวน</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">ยอดรวม</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">สร้างโดย</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Export</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {query.isLoading && Array.from({ length: 5 }).map((_, index) => (
              <tr key={index} className="border-b border-border">
                {Array.from({ length: 8 }).map((__, cell) => (
                  <td key={cell} className="px-4 py-3">
                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  </td>
                ))}
              </tr>
            ))}

            {!query.isLoading && items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  ไม่พบรอบวางบิลตามเงื่อนไขที่เลือก
                </td>
              </tr>
            )}

            {!query.isLoading && items.map(item => (
              <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{item.batchNo}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDate(item.periodFrom)} - {formatDate(item.periodTo)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANT[item.status]}>{STATUS_LABEL[item.status]}</Badge>
                </td>
                <td className="px-4 py-3 text-right">{item.totalClaims.toLocaleString('th-TH')}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatMoney(item.totalAmount)}</td>
                <td className="px-4 py-3 text-muted-foreground">{item.createdByEmployeeName}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDateTime(item.exportedAt)}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/expense-billing-batches/${item.id}`}
                    className="inline-flex h-8 items-center gap-1 rounded-md px-3 text-sm font-medium text-primary hover:bg-whited"
                  >
                    รายละเอียด <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>แสดง {items.length} จาก {totalCount} รายการ</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(prev => Math.max(1, prev - 1))}>
            ก่อนหน้า
          </Button>
          <span>หน้า {page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(prev => prev + 1)}>
            ถัดไป
          </Button>
        </div>
      </div>
    </div>
  )
}
