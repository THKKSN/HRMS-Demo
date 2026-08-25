'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Banknote,
  CalendarPlus,
  ChevronRight,
  Download,
  Eye,
  ExternalLink,
  FileText,
  Paperclip,
  ReceiptText,
  Search,
  type LucideIcon,
} from 'lucide-react'
import type { ExpenseAttachmentFileDto, ExpenseClaimDto, ExpenseClaimStatus, ExpenseClaimType } from '@hrms/shared-types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Textarea } from '@/components/ui/textarea'
import { useCreateExpenseBillingBatch } from '@/hooks/use-expense-billing-batches'
import { useExpenses } from '@/hooks/use-expenses'
import { EXPENSE_DOCUMENT_LABEL, isImageAttachmentUrl } from '@/lib/expense-attachments'
import { expensesApi } from '@/lib/expenses.api'
import { publicFileUrl } from '@/lib/public-file-url'

const PAGE_SIZE = 20
const EMPTY_EXPENSE_ITEMS: ExpenseClaimDto[] = []

const STATUS_LABEL: Record<ExpenseClaimStatus, string> = {
  Draft: 'แบบร่าง',
  Pending: 'รอตรวจ',
  Approved: 'อนุมัติแล้ว',
  Rejected: 'ปฏิเสธ',
  Cancelled: 'ยกเลิก',
  Batched: 'เข้ารอบวางบิล',
  Paid: 'จ่ายแล้ว',
}

const STATUS_VARIANT: Record<ExpenseClaimStatus, 'secondary' | 'warning' | 'success' | 'destructive' | 'outline'> = {
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

function ExpenseSummary({ items }: { items: ExpenseClaimDto[] }) {
  const pending = items.filter(item => item.status === 'Pending')
  const approved = items.filter(item => item.status === 'Approved')
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="grid gap-3 md:grid-cols-4">
      <SummaryCard icon={ReceiptText} label="รายการในหน้า" value={items.length.toLocaleString('th-TH')} />
      <SummaryCard icon={FileText} label="รอตรวจ" value={pending.length.toLocaleString('th-TH')} tone="text-amber-600" />
      <SummaryCard icon={Banknote} label="อนุมัติแล้ว" value={approved.length.toLocaleString('th-TH')} tone="text-emerald-600" />
      <SummaryCard icon={Banknote} label="ยอดรวมในหน้า" value={formatMoney(totalAmount)} suffix="บาท" />
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  suffix,
  tone = 'text-primary',
}: {
  icon: LucideIcon
  label: string
  value: string
  suffix?: string
  tone?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className={`h-4 w-4 ${tone}`} />
        {label}
      </div>
      <p className="mt-2 text-xl font-bold">
        {value}
        {suffix && <span className="ml-1 text-xs font-medium text-muted-foreground">{suffix}</span>}
      </p>
    </div>
  )
}

function ExpenseAttachmentsPreviewModal({
  expense,
  onClose,
}: {
  expense: ExpenseClaimDto
  onClose: () => void
}) {
  const [previewFile, setPreviewFile] = useState<ExpenseAttachmentFileDto | null>(null)

  if (previewFile) {
    const href = publicFileUrl(previewFile.url)
    const label = previewFile.fileName || EXPENSE_DOCUMENT_LABEL[previewFile.documentType]

    return (
      <Modal open onClose={onClose} title={label} size="xl">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="outline" onClick={() => setPreviewFile(null)}>
              <ChevronRight className="h-4 w-4 rotate-180" />
              กลับไปดูรายการไฟล์
            </Button>
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-whited"
            >
              <ExternalLink className="h-4 w-4" />
              เปิดไฟล์จริง
            </a>
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-muted">
            <img src={href} alt={label} className="max-h-[72dvh] w-full object-contain" />
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open onClose={onClose} title={`หลักฐานแนบ - ${expense.employeeName}`} size="xl">
      <div className="space-y-5">
        {(['PaymentOrder', 'Receipt', 'Other'] as const).map(documentType => {
          const files = expense.attachmentFiles.filter(file => file.documentType === documentType)
          if (files.length === 0) return null

          return (
            <div key={documentType}>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">{EXPENSE_DOCUMENT_LABEL[documentType]}</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {files.map((file, index) => (
                  <AttachmentPreviewCard key={`${file.url}-${index}`} file={file} index={index} onPreview={setPreviewFile} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

function AttachmentPreviewCard({
  file,
  index,
  onPreview,
}: {
  file: ExpenseAttachmentFileDto
  index: number
  onPreview: (file: ExpenseAttachmentFileDto) => void
}) {
  const href = publicFileUrl(file.url)
  const label = file.fileName || `${EXPENSE_DOCUMENT_LABEL[file.documentType]} ${index + 1}`

  if (isImageAttachmentUrl(file.url)) {
    return (
      <button
        type="button"
        onClick={() => onPreview(file)}
        className="group overflow-hidden rounded-lg border border-border bg-muted/20 text-left transition hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="relative aspect-[4/3] bg-muted">
          <img src={href} alt={label} loading="lazy" className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/25 group-hover:opacity-100">
            <span className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-semibold text-foreground shadow-sm">
              <Eye className="h-4 w-4" />
              ดูรูป
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-border px-3 py-2 text-xs">
          <span className="min-w-0 flex-1 truncate">{label}</span>
          <Eye className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </div>
      </button>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex min-h-24 items-center gap-3 rounded-lg border border-border bg-muted/20 p-3 transition hover:border-primary/40 hover:shadow-sm"
    >
      <FileText className="h-5 w-5 shrink-0 text-primary" />
      <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </a>
  )
}

export default function AdminExpensesPage() {
  const router = useRouter()
  const [status, setStatus] = useState<ExpenseClaimStatus | undefined>('Pending')
  const [type, setType] = useState<ExpenseClaimType | undefined>()
  const [employeeSearchInput, setEmployeeSearchInput] = useState('')
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [batchPeriodFrom, setBatchPeriodFrom] = useState('')
  const [batchPeriodTo, setBatchPeriodTo] = useState('')
  const [batchNote, setBatchNote] = useState('')
  const [previewExpense, setPreviewExpense] = useState<ExpenseClaimDto | null>(null)
  const createBatchMutation = useCreateExpenseBillingBatch()

  const params = useMemo(() => ({
    status,
    type,
    employeeSearch: employeeSearch || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    pageSize: PAGE_SIZE,
  }), [status, type, employeeSearch, dateFrom, dateTo, page])

  const query = useExpenses(params)
  const items = query.data?.items ?? EMPTY_EXPENSE_ITEMS
  const totalCount = query.data?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const approvedItems = useMemo(() => items.filter(item => item.status === 'Approved'), [items])
  const selectedItems = useMemo(
    () => items.filter(item => selectedIds.includes(item.id) && item.status === 'Approved'),
    [items, selectedIds],
  )
  const selectedTotal = selectedItems.reduce((sum, item) => sum + item.amount, 0)
  const allApprovedVisibleSelected = approvedItems.length > 0 && approvedItems.every(item => selectedIds.includes(item.id))

  useEffect(() => {
    setSelectedIds(prev => {
      const next = prev.filter(id => items.some(item => item.id === id && item.status === 'Approved'))
      return next.length === prev.length ? prev : next
    })
  }, [items])

  function resetPage<T>(setter: (value: T) => void, value: T) {
    setter(value)
    setPage(1)
  }

  async function exportExcel() {
    setExporting(true)
    try {
      const exportStatus = status ?? 'Approved'
      const blob = await expensesApi.exportExcel({
        status: exportStatus,
        type,
        employeeSearch: employeeSearch || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      const now = new Date().toISOString().slice(0, 10)
      anchor.href = url
      anchor.download = `expense-claims-${exportStatus.toLowerCase()}-${now}.xlsx`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(apiMessage(error))
    } finally {
      setExporting(false)
    }
  }

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds(prev => checked ? [...new Set([...prev, id])] : prev.filter(item => item !== id))
  }

  function toggleAllApprovedVisible(checked: boolean) {
    if (checked) {
      setSelectedIds(prev => [...new Set([...prev, ...approvedItems.map(item => item.id)])])
      return
    }
    setSelectedIds(prev => prev.filter(id => !approvedItems.some(item => item.id === id)))
  }

  function openBatchModal() {
    const dates = selectedItems.map(item => item.expenseDate).sort()
    setBatchPeriodFrom(dates[0] ?? dateFrom)
    setBatchPeriodTo(dates[dates.length - 1] ?? dateTo)
    setBatchNote('')
    setBatchModalOpen(true)
  }

  async function createBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (selectedItems.length === 0) return toast.error('กรุณาเลือกรายการที่อนุมัติแล้ว')
    if (!batchPeriodFrom || !batchPeriodTo) return toast.error('กรุณาระบุช่วงวันที่รอบวางบิล')

    try {
      const batch = await createBatchMutation.mutateAsync({
        periodFrom: batchPeriodFrom,
        periodTo: batchPeriodTo,
        expenseClaimIds: selectedItems.map(item => item.id),
        note: batchNote.trim() || undefined,
      })
      toast.success(`สร้างรอบวางบิล ${batch.batchNo} แล้ว`)
      setBatchModalOpen(false)
      setSelectedIds([])
      router.push(`/expense-billing-batches/${batch.id}`)
    } catch (error) {
      toast.error(apiMessage(error))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">ตรวจบิลค่าใช้จ่าย</h1>
          <p className="mt-1 text-sm text-muted-foreground">ตรวจหลักฐานจาก LIFF และอนุมัติหรือปฏิเสธรายการ</p>
        </div>
        <Button variant="outline" loading={exporting} onClick={exportExcel}>
          <Download className="h-4 w-4" />
          Export Excel
        </Button>
      </div>

      <ExpenseSummary items={items} />

      <div className="rounded-lg border border-border bg-background p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_160px_160px_160px_160px]">
          <form
            className="relative"
            onSubmit={(event) => {
              event.preventDefault()
              resetPage(setEmployeeSearch, employeeSearchInput.trim())
            }}
          >
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={employeeSearchInput}
              onChange={(event) => setEmployeeSearchInput(event.target.value)}
              placeholder="ค้นหาพนักงานหรือรหัสพนักงาน"
              className="pl-9"
            />
          </form>

          <select
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            value={status ?? ''}
            onChange={(event) => resetPage(setStatus, (event.target.value || undefined) as ExpenseClaimStatus | undefined)}
          >
            <option value="">ทุกสถานะ</option>
            {(Object.keys(STATUS_LABEL) as ExpenseClaimStatus[]).map(item => (
              <option key={item} value={item}>{STATUS_LABEL[item]}</option>
            ))}
          </select>

          <select
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            value={type ?? ''}
            onChange={(event) => resetPage(setType, (event.target.value || undefined) as ExpenseClaimType | undefined)}
          >
            <option value="">ทุกประเภท</option>
            {(Object.keys(TYPE_LABEL) as ExpenseClaimType[]).map(item => (
              <option key={item} value={item}>{TYPE_LABEL[item]}</option>
            ))}
          </select>

          <Input type="date" value={dateFrom} onChange={(event) => resetPage(setDateFrom, event.target.value)} />
          <Input type="date" value={dateTo} onChange={(event) => resetPage(setDateTo, event.target.value)} />
        </div>
      </div>

      {selectedItems.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div>
            <div className="text-sm font-semibold">เลือกแล้ว {selectedItems.length.toLocaleString('th-TH')} รายการ</div>
            <div className="text-sm text-muted-foreground">ยอดรวม {formatMoney(selectedTotal)} บาท</div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setSelectedIds([])}>
              ล้างรายการ
            </Button>
            <Button onClick={openBatchModal}>
              <CalendarPlus className="h-4 w-4" />
              สร้างรอบวางบิล
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-auto rounded-lg border border-border bg-background">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="w-12 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                  checked={allApprovedVisibleSelected}
                  disabled={approvedItems.length === 0}
                  onChange={(event) => toggleAllApprovedVisible(event.target.checked)}
                  aria-label="เลือก Approved ทั้งหมดในหน้านี้"
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">พนักงาน</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ประเภท</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">วันที่</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">เลขบิล</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">รถ/ทะเบียน</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">ยอดเงิน</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ไฟล์</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">สถานะ</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {query.isLoading && Array.from({ length: 5 }).map((_, index) => (
              <tr key={index} className="border-b border-border">
                {Array.from({ length: 10 }).map((__, cell) => (
                  <td key={cell} className="px-4 py-3">
                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  </td>
                ))}
              </tr>
            ))}

            {!query.isLoading && items.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                  ไม่พบรายการตามเงื่อนไขที่เลือก
                </td>
              </tr>
            )}

            {!query.isLoading && items.map(item => (
              <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border"
                    checked={selectedIds.includes(item.id)}
                    disabled={item.status !== 'Approved'}
                    onChange={(event) => toggleSelected(item.id, event.target.checked)}
                    aria-label={`เลือก ${item.employeeName}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{item.employeeName}</div>
                  <div className="text-xs text-muted-foreground">{item.customerName || item.merchantName || '-'}</div>
                </td>
                <td className="px-4 py-3">{TYPE_LABEL[item.type]}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(item.expenseDate)}</td>
                <td className="px-4 py-3 text-muted-foreground">{item.billNo || '-'}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {[item.vehicleNo, item.plateNo].filter(Boolean).join(' / ') || '-'}
                </td>
                <td className="px-4 py-3 text-right font-semibold">{formatMoney(item.amount)}</td>
                <td className="px-4 py-3">
                  {item.attachmentFiles.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setPreviewExpense(item)}
                      className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-primary transition hover:bg-whited focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={`ดูหลักฐานแนบ ${item.attachmentFiles.length} ไฟล์`}
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      {item.attachmentFiles.length}
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Paperclip className="h-3.5 w-3.5" />
                      0
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANT[item.status]}>{STATUS_LABEL[item.status]}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/expenses/${item.id}`}
                    className="inline-flex h-8 items-center gap-1 rounded-md px-3 text-sm font-medium text-primary hover:bg-whited"
                  >
                    ดูรายละเอียด <ChevronRight className="h-3.5 w-3.5" />
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

      <Modal open={batchModalOpen} onClose={() => setBatchModalOpen(false)} title="สร้างรอบวางบิล" size="lg">
        <form className="space-y-4" onSubmit={createBatch}>
          <div className="rounded-md border border-border bg-muted/20 p-3 text-sm">
            <div className="font-medium">รายการที่เลือก {selectedItems.length.toLocaleString('th-TH')} รายการ</div>
            <div className="mt-1 text-muted-foreground">ยอดรวม {formatMoney(selectedTotal)} บาท</div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium">วันที่เริ่มรอบ</span>
              <Input type="date" value={batchPeriodFrom} onChange={(event) => setBatchPeriodFrom(event.target.value)} required />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">วันที่สิ้นสุดรอบ</span>
              <Input type="date" value={batchPeriodTo} onChange={(event) => setBatchPeriodTo(event.target.value)} required />
            </label>
          </div>

          <label className="space-y-1 text-sm">
            <span className="font-medium">หมายเหตุ</span>
            <Textarea value={batchNote} onChange={(event) => setBatchNote(event.target.value)} placeholder="เช่น รอบวางบิลประจำสัปดาห์" />
          </label>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setBatchModalOpen(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" loading={createBatchMutation.isPending}>
              สร้างรอบ
            </Button>
          </div>
        </form>
      </Modal>

      {previewExpense && (
        <ExpenseAttachmentsPreviewModal
          expense={previewExpense}
          onClose={() => setPreviewExpense(null)}
        />
      )}
    </div>
  )
}
