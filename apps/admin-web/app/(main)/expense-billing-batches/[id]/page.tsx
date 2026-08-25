'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, Ban, Banknote, CalendarDays, ChevronRight, Download, FileSpreadsheet, ReceiptText, type LucideIcon } from 'lucide-react'
import type { ExpenseBillingBatchStatus, ExpenseClaimStatus, ExpenseClaimType } from '@hrms/shared-types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { expenseBillingBatchesApi } from '@/lib/expense-billing-batches.api'
import {
  useCancelExpenseBillingBatch,
  useExpenseBillingBatch,
  useMarkExpenseBillingBatchPaid,
} from '@/hooks/use-expense-billing-batches'

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

const CLAIM_STATUS_LABEL: Record<ExpenseClaimStatus, string> = {
  Draft: 'แบบร่าง',
  Pending: 'รอตรวจ',
  Approved: 'อนุมัติแล้ว',
  Rejected: 'ปฏิเสธ',
  Cancelled: 'ยกเลิก',
  Batched: 'เข้ารอบวางบิล',
  Paid: 'จ่ายแล้ว',
}

const CLAIM_STATUS_VARIANT: Record<ExpenseClaimStatus, 'secondary' | 'warning' | 'success' | 'destructive' | 'outline'> = {
  Draft: 'secondary',
  Pending: 'warning',
  Approved: 'success',
  Rejected: 'destructive',
  Cancelled: 'outline',
  Batched: 'secondary',
  Paid: 'success',
}

const TYPE_LABEL: Record<ExpenseClaimType, string> = {
  Fuel: 'ค่าน้ำมัน',
  Toll: 'ค่าทางด่วน',
  Parking: 'ค่าจอดรถ',
  Meal: 'ค่าอาหาร',
  Other: 'อื่น ๆ',
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

function apiMessage(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string; detail?: string } } }).response
    return response?.data?.message || response?.data?.detail || 'ดำเนินการไม่สำเร็จ'
  }
  return 'ดำเนินการไม่สำเร็จ'
}

export default function ExpenseBillingBatchDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const query = useExpenseBillingBatch(id)
  const markPaidMutation = useMarkExpenseBillingBatchPaid()
  const cancelMutation = useCancelExpenseBillingBatch()
  const [exporting, setExporting] = useState(false)

  const batch = query.data
  const isClosed = batch?.status === 'Paid' || batch?.status === 'Cancelled'

  async function exportExcel() {
    if (!batch) return
    setExporting(true)
    try {
      const blob = await expenseBillingBatchesApi.exportExcel(batch.id)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${batch.batchNo}.xlsx`
      anchor.click()
      URL.revokeObjectURL(url)
      toast.success('Export Excel รอบวางบิลแล้ว')
    } catch (error) {
      toast.error(apiMessage(error))
    } finally {
      setExporting(false)
    }
  }

  async function markPaid() {
    if (!batch) return
    if (!window.confirm(`ยืนยันบันทึกจ่ายเงินรอบ ${batch.batchNo}?`)) return
    try {
      await markPaidMutation.mutateAsync(batch.id)
      toast.success('บันทึกจ่ายเงินแล้ว')
    } catch (error) {
      toast.error(apiMessage(error))
    }
  }

  async function cancelBatch() {
    if (!batch) return
    if (!window.confirm(`ยืนยันยกเลิกรอบ ${batch.batchNo}? รายการในรอบจะกลับเป็นสถานะอนุมัติแล้ว`)) return
    try {
      await cancelMutation.mutateAsync(batch.id)
      toast.success('ยกเลิกรอบวางบิลแล้ว')
    } catch (error) {
      toast.error(apiMessage(error))
    }
  }

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-lg border border-border bg-muted/40" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-lg border border-border bg-muted/40" />
      </div>
    )
  }

  if (!batch) {
    return (
      <div className="rounded-lg border border-border bg-background p-8 text-center">
        <p className="font-medium">ไม่พบรอบวางบิล</p>
        <Button className="mt-4" variant="outline" onClick={() => router.push('/expense-billing-batches')}>
          กลับหน้ารอบวางบิล
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/expense-billing-batches"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับรอบวางบิล
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{batch.batchNo}</h1>
            <Badge variant={STATUS_VARIANT[batch.status]}>{STATUS_LABEL[batch.status]}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(batch.periodFrom)} - {formatDate(batch.periodTo)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" loading={exporting} disabled={batch.status === 'Cancelled'} onClick={exportExcel}>
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
          {!isClosed && (
            <>
              <Button loading={markPaidMutation.isPending} onClick={markPaid}>
                <Banknote className="h-4 w-4" />
                บันทึกจ่ายเงิน
              </Button>
              <Button variant="destructive" loading={cancelMutation.isPending} onClick={cancelBatch}>
                <Ban className="h-4 w-4" />
                ยกเลิกรอบ
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryCard icon={ReceiptText} label="จำนวนรายการ" value={batch.totalClaims.toLocaleString('th-TH')} />
        <SummaryCard icon={Banknote} label="ยอดรวม" value={formatMoney(batch.totalAmount)} suffix="บาท" />
        <SummaryCard icon={FileSpreadsheet} label="Export ล่าสุด" value={formatDateTime(batch.exportedAt)} compact />
        <SummaryCard icon={CalendarDays} label="จ่ายเงิน" value={formatDateTime(batch.paidAt)} compact />
      </div>

      {batch.note && (
        <div className="rounded-lg border border-border bg-background p-4 text-sm">
          <div className="mb-1 font-medium">หมายเหตุ</div>
          <p className="text-muted-foreground">{batch.note}</p>
        </div>
      )}

      <div className="overflow-auto rounded-lg border border-border bg-background">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">พนักงาน</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ประเภท</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">วันที่</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">เลขบิล</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">รถ/ทะเบียน</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">สถานะ</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">ยอด ณ รอบ</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {batch.items.map(item => (
              <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{item.employeeName}</td>
                <td className="px-4 py-3">{TYPE_LABEL[item.type]}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(item.expenseDate)}</td>
                <td className="px-4 py-3 text-muted-foreground">{item.billNo || '-'}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {[item.vehicleNo, item.plateNo].filter(Boolean).join(' / ') || '-'}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={CLAIM_STATUS_VARIANT[item.status]}>{CLAIM_STATUS_LABEL[item.status]}</Badge>
                </td>
                <td className="px-4 py-3 text-right font-semibold">{formatMoney(item.amountSnapshot)}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/expenses/${item.expenseClaimId}`}
                    className="inline-flex h-8 items-center gap-1 rounded-md px-3 text-sm font-medium text-primary hover:bg-whited"
                  >
                    ดูบิล <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  suffix,
  compact,
}: {
  icon: LucideIcon
  label: string
  value: string
  suffix?: string
  compact?: boolean
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </div>
      <p className={compact ? 'mt-2 text-sm font-semibold' : 'mt-2 text-xl font-bold'}>
        {value}
        {suffix && <span className="ml-1 text-xs font-medium text-muted-foreground">{suffix}</span>}
      </p>
    </div>
  )
}
