'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ChangeEvent, FormEvent, InputHTMLAttributes } from 'react'
import { useMemo, useState } from 'react'
import {
  AlertCircle,
  Banknote,
  ChevronLeft,
  FileText,
  Loader2,
  Paperclip,
  ReceiptText,
  Send,
  Sparkles,
  Truck,
  X,
} from 'lucide-react'
import type {
  ExpenseAttachmentDocumentType,
  ExpenseAttachmentFileDto,
  ExpenseClaimType,
} from '@hrms/shared-types'
import {
  EXPENSE_DOCUMENT_LABEL,
  REQUIRED_FUEL_DOCUMENTS,
  hasRequiredExpenseDocuments,
  missingExpenseDocumentLabels,
} from '@/lib/expense-attachments'
import { useCreateExpense } from '@/hooks/use-expenses'
import { type CreateExpenseBody, expensesApi } from '@/lib/expenses.api'
import { uploadExpenseAttachment } from '@/lib/upload.api'

const MAX_FILES = 5
const MAX_SIZE = 10 * 1024 * 1024

type PendingAttachment = {
  id: string
  documentType: ExpenseAttachmentDocumentType
  file: File
}

const TYPE_OPTIONS: { value: ExpenseClaimType; label: string; hint: string; tone: string }[] = [
  { value: 'Fuel', label: 'ค่าน้ำมัน', hint: 'Fleet card / ใบนำจ่าย', tone: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  { value: 'Toll', label: 'ค่าทางด่วน', hint: 'ใบเสร็จค่าผ่านทาง', tone: 'border-sky-200 bg-sky-50 text-sky-800' },
  { value: 'Parking', label: 'ค่าจอดรถ', hint: 'หลักฐานค่าจอด', tone: 'border-violet-200 bg-violet-50 text-violet-800' },
  { value: 'Meal', label: 'ค่าอาหาร', hint: 'บิลอาหาร/รับรอง', tone: 'border-amber-200 bg-amber-50 text-amber-800' },
  { value: 'Other', label: 'อื่น ๆ', hint: 'ค่าใช้จ่ายอื่น', tone: 'border-slate-200 bg-slate-50 text-slate-700' },
]

function todayInput() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parsePositiveNumber(value: string) {
  if (!value.trim()) return undefined
  const normalized = value.replace(/,/g, '')
  const numeric = Number(normalized)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined
}

function apiMessage(error: unknown) {
  const response = (error as {
    response?: { data?: { message?: string; error?: string; errors?: string[]; details?: Array<{ error?: string }> } }
  })?.response?.data
  return response?.details?.[0]?.error ?? response?.errors?.[0] ?? response?.message
    ?? response?.error ?? (error instanceof Error ? error.message : undefined)
    ?? 'ไม่สามารถส่งรายการได้ กรุณาลองใหม่'
}

export default function NewExpensePage() {
  const router = useRouter()
  const { mutateAsync: createExpense } = useCreateExpense()

  const [type, setType] = useState<ExpenseClaimType>('Fuel')
  const [expenseDate, setExpenseDate] = useState(todayInput())
  const [amount, setAmount] = useState('')
  const [merchantName, setMerchantName] = useState('')
  const [billNo, setBillNo] = useState('')
  const [receiptTid, setReceiptTid] = useState('')
  const [receiptBatch, setReceiptBatch] = useState('')
  const [receiptMid, setReceiptMid] = useState('')
  const [receiptTrace, setReceiptTrace] = useState('')
  const [driverName, setDriverName] = useState('')
  const [vehicleNo, setVehicleNo] = useState('')
  const [plateNo, setPlateNo] = useState('')
  const [fuelLiters, setFuelLiters] = useState('')
  const [transportNo, setTransportNo] = useState('')
  const [origin, setOrigin] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [tripCount, setTripCount] = useState('')
  const [note, setNote] = useState('')
  const [attachments, setAttachments] = useState<PendingAttachment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [checkingOcr, setCheckingOcr] = useState(false)

  const selectedType = TYPE_OPTIONS.find(item => item.value === type)
  const amountNumber = parsePositiveNumber(amount)
  const fuelLitersNumber = parsePositiveNumber(fuelLiters)
  const tripCountNumber = parsePositiveNumber(tripCount)

  const canSaveDraft = !!type && !!expenseDate && !submitting && !checkingOcr
  const canCheckOcr = !!type && !!expenseDate && hasRequiredExpenseDocuments(type, attachments) && !submitting && !checkingOcr
  const canSubmit = useMemo(
    () => !!type && !!expenseDate && !!amountNumber && hasRequiredExpenseDocuments(type, attachments) && !submitting && !checkingOcr,
    [type, expenseDate, amountNumber, attachments, submitting, checkingOcr]
  )

  function handleFileChange(documentType: ExpenseAttachmentDocumentType, event: ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files ?? [])
    event.target.value = ''

    const tooBig = incoming.filter(file => file.size > MAX_SIZE)
    if (tooBig.length) {
      setError(`ไฟล์ใหญ่เกิน 10 MB: ${tooBig.map(file => file.name).join(', ')}`)
      return
    }

    setAttachments(prev => {
      const existing = new Set(prev.map(item => `${item.file.name}:${item.file.size}:${item.documentType}`))
      const newItems = incoming
        .filter(file => !existing.has(`${file.name}:${file.size}:${documentType}`))
        .map(file => ({ id: `${documentType}:${file.name}:${file.size}:${Date.now()}:${Math.random()}`, documentType, file }))
      const next = [...prev, ...newItems]
      if (next.length > MAX_FILES) {
        setError(`แนบไฟล์ได้สูงสุด ${MAX_FILES} ไฟล์`)
        return next.slice(0, MAX_FILES)
      }
      setError(null)
      return next
    })
  }

  function removeAttachment(id: string) {
    setAttachments(prev => prev.filter(item => item.id !== id))
  }

  async function uploadAttachmentFiles() {
    return Promise.all(attachments.map(async item => ({
        url: await uploadExpenseAttachment(item.file),
        documentType: item.documentType,
        fileName: item.file.name,
        contentType: item.file.type || undefined,
        sizeBytes: item.file.size,
      } satisfies ExpenseAttachmentFileDto)))
  }

  function buildCreateBody(attachmentFiles: ExpenseAttachmentFileDto[], saveAsDraft: boolean): CreateExpenseBody {
    return {
      type,
      expenseDate,
      amount: amountNumber ?? 0,
      merchantName: merchantName.trim() || undefined,
      billNo: billNo.trim() || undefined,
      receiptTid: receiptTid.trim() || undefined,
      receiptBatch: receiptBatch.trim() || undefined,
      receiptMid: receiptMid.trim() || undefined,
      receiptTrace: receiptTrace.trim() || undefined,
      driverName: driverName.trim() || undefined,
      vehicleNo: vehicleNo.trim() || undefined,
      plateNo: plateNo.trim() || undefined,
      fuelLiters: fuelLitersNumber,
      transportNo: transportNo.trim() || undefined,
      origin: origin.trim() || undefined,
      customerName: customerName.trim() || undefined,
      tripCount: tripCountNumber ? Math.trunc(tripCountNumber) : undefined,
      note: note.trim() || undefined,
      attachmentUrls: attachmentFiles.map(file => file.url),
      attachmentFiles,
      saveAsDraft,
    }
  }

  async function checkOcrNow() {
    if (checkingOcr) return

    if (!canCheckOcr) {
      const missing = missingExpenseDocumentLabels(type, attachments)
      setError(missing.length > 0 ? `กรุณาถ่าย/แนบ ${missing.join(' และ ')} ก่อนตรวจ OCR` : 'กรุณาเลือกประเภทและวันที่เอกสารก่อนตรวจ OCR')
      return
    }

    setError(null)
    setCheckingOcr(true)

    try {
      const attachmentFiles = await uploadAttachmentFiles()
      const result = await createExpense(buildCreateBody(attachmentFiles, true))
      await expensesApi.startOcr(result.id)
      router.replace(`/expenses/${result.id}/edit`)
    } catch (err) {
      setError(apiMessage(err))
    } finally {
      setCheckingOcr(false)
    }
  }

  async function save(mode: 'draft' | 'submit') {
    const isDraft = mode === 'draft'

    if (!isDraft && (!canSubmit || !amountNumber)) {
      const missing = missingExpenseDocumentLabels(type, attachments)
      setError(missing.length > 0 ? `กรุณาแนบ ${missing.join(' และ ')}` : 'กรุณากรอกข้อมูลที่จำเป็นให้ครบ')
      return
    }

    if (isDraft && !canSaveDraft) {
      setError('กรุณาเลือกประเภทและวันที่เอกสารก่อนบันทึกร่าง')
      return
    }

    setError(null)
    setSubmitting(true)

    try {
      const attachmentFiles = await uploadAttachmentFiles()
      const result = await createExpense(buildCreateBody(attachmentFiles, isDraft))
      router.replace(`/expenses/${result.id}`)
    } catch (err) {
      setError(apiMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void save('submit')
  }

  const attachmentSection = (
    <section className="rounded-lg border border-emerald-200 bg-background p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Paperclip className="h-4 w-4 text-[#0f8f72]" />
        <span className="text-sm font-semibold">ตรวจสอบข้อมูล/แนบหลักฐานจากภาพ *</span>
        <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{attachments.length}/{MAX_FILES}</span>
      </div>

      <div className="space-y-3">
        {[...REQUIRED_FUEL_DOCUMENTS, 'Other' as const].map(documentType => {
          const files = attachments.filter(item => item.documentType === documentType)
          const required = type === 'Fuel' && documentType !== 'Other'
          return (
            <div key={documentType} className="rounded-lg border border-border bg-whited p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">
                    {EXPENSE_DOCUMENT_LABEL[documentType]}
                    {required && <span className="ml-1 text-red-600">*</span>}
                  </p>
                  {documentType !== 'Other' && <p className="mt-0.5 text-xs text-muted-foreground">ถ่ายหรือแนบไฟล์แยกตามประเภทเอกสาร</p>}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${files.length ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {files.length ? 'แนบแล้ว' : 'ยังไม่มีไฟล์'}
                </span>
              </div>

              {files.length > 0 && (
                <div className="mb-2 space-y-2">
                  {files.map(item => (
                    <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border bg-white p-2.5">
                      {item.file.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(item.file)} alt={item.file.name} className="h-10 w-10 shrink-0 rounded-md object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{item.file.name}</p>
                        <p className="text-xs text-muted-foreground">{(item.file.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <button type="button" onClick={() => removeAttachment(item.id)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {attachments.length < MAX_FILES && (
                <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background text-sm font-medium active:bg-primary/5">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  {files.length > 0 ? 'เพิ่มไฟล์' : 'ถ่าย/แนบไฟล์'}
                  <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" multiple className="hidden" onChange={(event) => handleFileChange(documentType, event)} />
                </label>
              )}
            </div>
          )
        })}
        {attachments.length >= MAX_FILES && <p className="py-2 text-center text-xs text-muted-foreground">แนบครบ {MAX_FILES} ไฟล์แล้ว</p>}
      </div>

      <button
        type="button"
        disabled={!canCheckOcr || checkingOcr}
        onClick={() => void checkOcrNow()}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0f8f72] text-sm font-bold text-white disabled:bg-slate-300"
      >
        {checkingOcr ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        ตรวจ OCR
      </button>
    </section>
  )

  return (
    <div className="min-h-screen bg-[#eef7f3]">
      <div className="bg-[#0f8f72] px-4 pb-5 pt-4 text-white">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold">สร้างบิล</h1>
            <p className="text-xs text-white/75">กรอกข้อมูลและแนบหลักฐานค่าใช้จ่าย</p>
          </div>
          {/* {amountNumber && (
            <div className="ml-auto rounded-lg bg-white/15 px-3 py-1.5 text-right">
              <p className="text-[10px] text-white/70">ยอดเงิน</p>
              <p className="text-sm font-bold tabular-nums">{amountNumber.toLocaleString('th-TH')}</p>
            </div>
          )} */}
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3 px-4 pb-32 pt-3">
        {error && (
          <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <section className="rounded-lg border border-border bg-background p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-[#0f8f72]" />
            <span className="text-sm font-semibold">ประเภทค่าใช้จ่าย</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {TYPE_OPTIONS.map(option => {
              const active = type === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setType(option.value)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    active ? option.tone : 'border-border bg-background text-foreground'
                  }`}
                >
                  <p className="text-sm font-semibold">{option.label}</p>
                  <p className="mt-1 text-[11px] opacity-75">{option.hint}</p>
                </button>
              )
            })}
          </div>
        </section>

        {attachmentSection}

        <section className="overflow-hidden rounded-lg border border-border bg-background p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Banknote className="h-4 w-4 text-[#0f8f72]" />
            <span className="text-sm font-semibold">ข้อมูลบิล</span>
          </div>
          <div className="min-w-0 space-y-3">
            <TextInput label="วันที่เอกสาร *" value={expenseDate} onChange={setExpenseDate} type="date" />
            <TextInput label="ยอดเงินรวม *" value={amount} onChange={setAmount} type="number" inputMode="decimal" placeholder="เช่น 8605" />
            <TextInput label="ร้านค้า / ปั๊มน้ำมัน" value={merchantName} onChange={setMerchantName} placeholder="เช่น BSRC-T.P.OIL" maxLength={200} />
            <TextInput label="เลขที่บิล" value={billNo} onChange={setBillNo} placeholder="เช่น FB-CM6905-02769" maxLength={80} />
            <div className="grid grid-cols-2 gap-3">
              <TextInput label="TID" value={receiptTid} onChange={setReceiptTid} placeholder="เช่น 28257831" maxLength={80} />
              <TextInput label="BATCH" value={receiptBatch} onChange={setReceiptBatch} placeholder="เช่น 000123" maxLength={80} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextInput label="MID" value={receiptMid} onChange={setReceiptMid} placeholder="เลข MID" maxLength={80} />
              <TextInput label="TRACE" value={receiptTrace} onChange={setReceiptTrace} placeholder="เช่น 002795" maxLength={80} />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-background p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Truck className="h-4 w-4 text-[#0f8f72]" />
            <span className="text-sm font-semibold">ข้อมูลรถและงานขนส่ง</span>
            {selectedType?.value !== 'Fuel' && <span className="ml-auto text-xs text-muted-foreground">ถ้ามี</span>}
          </div>
          <div className="space-y-3">
            <TextInput label="ชื่อพนักงานขับรถ" value={driverName} onChange={setDriverName} placeholder="ชื่อในเอกสาร" maxLength={160} />
            <div className="grid grid-cols-2 gap-3">
              <TextInput label="เบอร์รถ" value={vehicleNo} onChange={setVehicleNo} placeholder="272-131" maxLength={80} />
              <TextInput label="ทะเบียนรถ" value={plateNo} onChange={setPlateNo} placeholder="76-9442" maxLength={80} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextInput label="จำนวนลิตร" value={fuelLiters} onChange={setFuelLiters} type="number" inputMode="decimal" placeholder="104" />
              <TextInput label="จำนวนเที่ยว" value={tripCount} onChange={setTripCount} type="number" inputMode="numeric" placeholder="1" />
            </div>
            <TextInput label="เลขที่ใบขนส่ง" value={transportNo} onChange={setTransportNo} placeholder="เช่น 249842118" maxLength={100} />
            <TextInput label="ต้นทาง / สถานที่" value={origin} onChange={setOrigin} placeholder="เช่น รง. ปูนพงแก่งคอย" maxLength={200} />
            <TextInput label="ลูกค้า" value={customerName} onChange={setCustomerName} placeholder="ชื่อลูกค้าหรือปลายทาง" maxLength={200} />
          </div>
        </section>

        <section className="rounded-lg border border-border bg-background p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#0f8f72]" />
            <span className="text-sm font-semibold">หมายเหตุ</span>
            <span className="ml-auto text-xs text-muted-foreground">{note.length}/500</span>
          </div>
          <textarea
            value={note}
            onChange={event => setNote(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder="รายละเอียดเพิ่มเติมสำหรับบัญชี"
            className="w-full resize-none rounded-lg border border-border bg-whited px-3 py-2.5 text-sm outline-none focus:border-[#0f8f72]"
          />
        </section>

        <div className="fixed bottom-20 left-1/2 grid w-[calc(100%-2rem)] max-w-96 -translate-x-1/2 grid-cols-[0.9fr_1.1fr] gap-2">
          <button
            type="button"
            disabled={!canSaveDraft}
            onClick={() => void save('draft')}
            className="flex h-12 items-center justify-center gap-2 rounded-lg border border-[#0f8f72] bg-white text-sm font-bold text-[#0f8f72] shadow-lg disabled:border-slate-200 disabled:text-slate-300"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            บันทึกร่าง
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#0f8f72] text-sm font-bold text-white shadow-lg disabled:bg-slate-300"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            ส่งรายการ
          </button>
        </div>
      </form>
    </div>
  )
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  type = 'text',
  inputMode,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
  type?: string
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode']
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        type={type}
        inputMode={inputMode}
        min={type === 'number' ? '0' : undefined}
        step={type === 'number' ? '0.01' : undefined}
        className="h-11 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-[#0f8f72]"
      />
    </label>
  )
}
