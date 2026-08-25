'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import type { ChangeEvent, FormEvent, InputHTMLAttributes } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  Banknote,
  ChevronLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Paperclip,
  ReceiptText,
  RefreshCw,
  Save,
  Send,
  Sparkles,
  Trash2,
  Truck,
  X,
} from 'lucide-react'
import type {
  ExpenseAttachmentDocumentType,
  ExpenseAttachmentFileDto,
  ExpenseClaimType,
  ExpenseOcrFieldSuggestionDto,
  ExpenseOcrStatus,
  ExpenseOcrSummaryDto,
} from '@hrms/shared-types'
import { useDeleteExpenseDraft, useExpense, useExpenseOcrResult, useStartExpenseOcr, useUpdateExpense } from '@/hooks/use-expenses'
import {
  EXPENSE_DOCUMENT_LABEL,
  REQUIRED_FUEL_DOCUMENTS,
  hasRequiredExpenseDocuments,
  isImageAttachmentUrl,
  missingExpenseDocumentLabels,
} from '@/lib/expense-attachments'
import { publicFileUrl } from '@/lib/public-file-url'
import { uploadExpenseAttachment } from '@/lib/upload.api'

const MAX_FILES = 5
const MAX_SIZE = 10 * 1024 * 1024

type PendingAttachment = {
  id: string
  documentType: ExpenseAttachmentDocumentType
  file: File
}

const TYPE_OPTIONS: { value: ExpenseClaimType; label: string }[] = [
  { value: 'Fuel', label: 'ค่าน้ำมัน' },
  { value: 'Toll', label: 'ค่าทางด่วน' },
  { value: 'Parking', label: 'ค่าจอดรถ' },
  { value: 'Meal', label: 'ค่าอาหาร' },
  { value: 'Other', label: 'อื่น ๆ' },
]

const OCR_FIELD_ORDER = [
  'expenseDate',
  'amount',
  'merchantName',
  'billNo',
  'receiptTid',
  'receiptBatch',
  'receiptMid',
  'receiptTrace',
  'driverName',
  'vehicleNo',
  'plateNo',
  'fuelLiters',
  'transportNo',
  'origin',
  'customerName',
  'tripCount',
] as const

type OcrFieldKey = (typeof OCR_FIELD_ORDER)[number]

const OCR_FIELD_LABEL: Record<OcrFieldKey, string> = {
  expenseDate: 'วันที่เอกสาร',
  amount: 'ยอดเงินรวม',
  merchantName: 'ร้านค้า / ปั๊มน้ำมัน',
  billNo: 'เลขที่บิล',
  receiptTid: 'TID',
  receiptBatch: 'BATCH',
  receiptMid: 'MID',
  receiptTrace: 'TRACE',
  driverName: 'ชื่อพนักงานขับรถ',
  vehicleNo: 'เบอร์รถ',
  plateNo: 'ทะเบียนรถ',
  fuelLiters: 'จำนวนลิตร',
  transportNo: 'เลขที่ใบขนส่ง',
  origin: 'ต้นทาง / สถานที่',
  customerName: 'ลูกค้า',
  tripCount: 'จำนวนเที่ยว',
}

const OCR_STATUS_LABEL: Record<ExpenseOcrStatus, string> = {
  Pending: 'รอคิว',
  Processing: 'กำลังอ่าน',
  Succeeded: 'อ่านสำเร็จ',
  Failed: 'อ่านไม่สำเร็จ',
}

function parsePositiveNumber(value: string) {
  if (!value.trim()) return undefined
  const numeric = Number(value.replace(/,/g, ''))
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined
}

function isOcrRunning(status?: ExpenseOcrStatus) {
  return status === 'Pending' || status === 'Processing'
}

function suggestionText(suggestion?: ExpenseOcrFieldSuggestionDto) {
  const value = suggestion?.value?.trim()
  return value || undefined
}

function ocrResultFingerprint(result?: ExpenseOcrSummaryDto) {
  if (!result) return ''
  return result.results
    .map(item => `${item.id}:${item.status}:${item.processedAt ?? ''}:${item.errorMessage ?? ''}`)
    .join('|')
}

function normalizeDateInput(value: string) {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value.trim())
  if (!match) return undefined
  const normalized = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
  const parsed = new Date(`${normalized}T00:00:00`)
  const [year, month, day] = normalized.split('-').map(Number)
  if (
    !Number.isFinite(parsed.getTime())
    || parsed.getFullYear() !== year
    || parsed.getMonth() + 1 !== month
    || parsed.getDate() !== day
  ) {
    return undefined
  }
  return normalized
}

function normalizeNumberInput(value: string) {
  const numeric = Number(value.replace(/,/g, '').trim())
  return Number.isFinite(numeric) ? String(numeric) : undefined
}

function suggestionFormValue(key: OcrFieldKey, suggestion?: ExpenseOcrFieldSuggestionDto) {
  const value = suggestionText(suggestion)
  if (!value) return undefined
  if (key === 'expenseDate') return normalizeDateInput(value)
  if (key === 'amount' || key === 'fuelLiters' || key === 'tripCount') return normalizeNumberInput(value)
  return value
}

function apiMessage(error: unknown) {
  const response = (error as {
    response?: { data?: { message?: string; error?: string; errors?: string[]; details?: Array<{ error?: string }> } }
  })?.response?.data
  return response?.details?.[0]?.error ?? response?.errors?.[0] ?? response?.message
    ?? response?.error ?? 'ไม่สามารถบันทึกรายการได้ กรุณาลองใหม่'
}

export default function EditExpensePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id
  const { data, isLoading } = useExpense(id)
  const { mutateAsync: updateExpense } = useUpdateExpense(id)
  const { mutateAsync: deleteDraft, isPending: isDeletingDraft } = useDeleteExpenseDraft(id)
  const {
    data: ocrResult,
    isFetching: isFetchingOcr,
    refetch: refetchOcr,
  } = useExpenseOcrResult(id, data?.status === 'Draft')
  const { mutateAsync: startOcr, isPending: isStartingOcr } = useStartExpenseOcr(id)

  const [type, setType] = useState<ExpenseClaimType>('Fuel')
  const [expenseDate, setExpenseDate] = useState('')
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
  const [existingAttachments, setExistingAttachments] = useState<ExpenseAttachmentFileDto[]>([])
  const [files, setFiles] = useState<PendingAttachment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [ocrMessage, setOcrMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const autoAppliedOcrRef = useRef('')

  useEffect(() => {
    if (!data) return
    setType(data.type)
    setExpenseDate(data.expenseDate)
    setAmount(data.amount > 0 ? String(data.amount) : '')
    setMerchantName(data.merchantName ?? '')
    setBillNo(data.billNo ?? '')
    setReceiptTid(data.receiptTid ?? '')
    setReceiptBatch(data.receiptBatch ?? '')
    setReceiptMid(data.receiptMid ?? '')
    setReceiptTrace(data.receiptTrace ?? '')
    setDriverName(data.driverName ?? '')
    setVehicleNo(data.vehicleNo ?? '')
    setPlateNo(data.plateNo ?? '')
    setFuelLiters(data.fuelLiters ? String(data.fuelLiters) : '')
    setTransportNo(data.transportNo ?? '')
    setOrigin(data.origin ?? '')
    setCustomerName(data.customerName ?? '')
    setTripCount(data.tripCount ? String(data.tripCount) : '')
    setNote(data.note ?? '')
    setExistingAttachments(data.attachmentFiles?.length
      ? data.attachmentFiles
      : data.attachmentUrls.map(url => ({ url, documentType: 'Other' as const })))
    setFiles([])
  }, [data])

  useEffect(() => {
    if (!isOcrRunning(ocrResult?.status)) return
    const timer = window.setInterval(() => {
      void refetchOcr()
    }, 3000)
    return () => window.clearInterval(timer)
  }, [ocrResult?.status, refetchOcr])

  useEffect(() => {
    if (!ocrResult || isOcrRunning(ocrResult.status)) return
    const fingerprint = ocrResultFingerprint(ocrResult)
    if (!fingerprint || autoAppliedOcrRef.current === fingerprint) return

    const hasSuggestions = OCR_FIELD_ORDER.some(key => suggestionFormValue(key, ocrResult.suggestions[key]))
    if (!hasSuggestions) return

    autoAppliedOcrRef.current = fingerprint
    applyOcrSuggestions(true)
  }, [ocrResult])

  const amountNumber = parsePositiveNumber(amount)
  const fuelLitersNumber = parsePositiveNumber(fuelLiters)
  const tripCountNumber = parsePositiveNumber(tripCount)
  const allAttachments = useMemo(
    () => [...existingAttachments, ...files.map(item => ({ url: '', documentType: item.documentType }))],
    [existingAttachments, files],
  )
  const totalFiles = existingAttachments.length + files.length

  const canSaveDraft = !!type && !!expenseDate && !submitting && !isDeletingDraft && data?.status === 'Draft'
  const canSubmit = useMemo(
    () => !!type && !!expenseDate && !!amountNumber && hasRequiredExpenseDocuments(type, allAttachments) && !submitting && !isDeletingDraft && data?.status === 'Draft',
    [type, expenseDate, amountNumber, allAttachments, submitting, isDeletingDraft, data?.status]
  )

  function handleFileChange(documentType: ExpenseAttachmentDocumentType, event: ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files ?? [])
    event.target.value = ''

    const tooBig = incoming.filter(file => file.size > MAX_SIZE)
    if (tooBig.length) {
      setError(`ไฟล์ใหญ่เกิน 10 MB: ${tooBig.map(file => file.name).join(', ')}`)
      return
    }

    setFiles(prev => {
      const existing = new Set(prev.map(item => `${item.file.name}:${item.file.size}:${item.documentType}`))
      const newItems = incoming
        .filter(file => !existing.has(`${file.name}:${file.size}:${documentType}`))
        .map(file => ({ id: `${documentType}:${file.name}:${file.size}:${Date.now()}:${Math.random()}`, documentType, file }))
      const next = [...prev, ...newItems]
      if (existingAttachments.length + next.length > MAX_FILES) {
        setError(`แนบไฟล์ได้สูงสุด ${MAX_FILES} ไฟล์`)
        return next.slice(0, Math.max(0, MAX_FILES - existingAttachments.length))
      }
      setError(null)
      return next
    })
  }

  async function handleStartOcr() {
    if (files.length > 0) {
      setError('กรุณาบันทึกร่างหลังเพิ่มไฟล์ก่อนเริ่ม OCR')
      return
    }

    if (existingAttachments.length === 0) {
      setError('กรุณาแนบไฟล์และบันทึกร่างก่อนเริ่ม OCR')
      return
    }

    const missing = missingExpenseDocumentLabels(type, existingAttachments)
    if (missing.length > 0) {
      setError(`กรุณาบันทึกไฟล์ ${missing.join(' และ ')} ก่อนเริ่ม OCR`)
      return
    }

    setError(null)
    setOcrMessage(null)
    try {
      await startOcr()
      await refetchOcr()
    } catch (err) {
      setError(apiMessage(err))
    }
  }

  function applyOcrSuggestions(isAuto = false) {
    const suggestions = ocrResult?.suggestions
    if (!suggestions) return 0

    let applied = 0
    const applyText = (key: OcrFieldKey, setter: (value: string) => void) => {
      const value = suggestionFormValue(key, suggestions[key])
      if (!value) return
      setter(value)
      applied += 1
    }

    applyText('expenseDate', setExpenseDate)
    applyText('amount', setAmount)
    applyText('merchantName', setMerchantName)
    applyText('billNo', setBillNo)
    applyText('receiptTid', setReceiptTid)
    applyText('receiptBatch', setReceiptBatch)
    applyText('receiptMid', setReceiptMid)
    applyText('receiptTrace', setReceiptTrace)
    applyText('driverName', setDriverName)
    applyText('vehicleNo', setVehicleNo)
    applyText('plateNo', setPlateNo)
    applyText('fuelLiters', setFuelLiters)
    applyText('transportNo', setTransportNo)
    applyText('origin', setOrigin)
    applyText('customerName', setCustomerName)
    applyText('tripCount', setTripCount)

    if (applied > 0) {
      setOcrMessage(isAuto ? `เติมข้อมูลจาก OCR อัตโนมัติแล้ว ${applied} ฟิลด์` : `เติมข้อมูลจาก OCR แล้ว ${applied} ฟิลด์`)
      setError(null)
    } else {
      setError('ยังไม่มีข้อมูล OCR ที่เติมลงฟอร์มได้')
    }
    return applied
  }

  async function save(mode: 'draft' | 'submit') {
    const isDraft = mode === 'draft'

    if (!isDraft && (!canSubmit || !amountNumber)) {
      const missing = missingExpenseDocumentLabels(type, allAttachments)
      setError(missing.length > 0 ? `กรุณาแนบ ${missing.join(' และ ')}` : 'กรุณากรอกข้อมูลที่จำเป็นให้ครบ')
      return
    }

    if (isDraft && !canSaveDraft) {
      setError('รายการนี้ไม่สามารถแก้ไขแบบร่างได้')
      return
    }

    setError(null)
    setSubmitting(true)

    try {
      const uploadedFiles = await Promise.all(files.map(async item => ({
        url: await uploadExpenseAttachment(item.file),
        documentType: item.documentType,
        fileName: item.file.name,
        contentType: item.file.type || undefined,
        sizeBytes: item.file.size,
      })))
      const attachmentFiles = [...existingAttachments, ...uploadedFiles]
      const attachmentUrls = attachmentFiles.map(file => file.url)
      const result = await updateExpense({
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
        attachmentUrls,
        attachmentFiles,
        saveAsDraft: isDraft,
      })
      router.replace(`/expenses/${result.id}`)
    } catch (err) {
      setError(apiMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteDraft() {
    if (isDeletingDraft || submitting) return
    const ok = window.confirm('ลบแบบร่างนี้พร้อมรูปที่แนบไว้ใช่ไหม? การลบนี้ย้อนกลับไม่ได้')
    if (!ok) return

    setError(null)
    try {
      await deleteDraft()
      router.replace('/expenses')
    } catch (err) {
      setError(apiMessage(err))
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void save('submit')
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-muted/30 pb-24">
        <Header backHref="/expenses" title="แก้ไขแบบร่าง" />
        <div className="px-4 py-10 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 font-semibold">ไม่พบรายการ</p>
        </div>
      </div>
    )
  }

  if (data.status !== 'Draft') {
    return (
      <div className="min-h-screen bg-muted/30 pb-24">
        <Header backHref={`/expenses/${data.id}`} title="แก้ไขแบบร่าง" />
        <div className="px-4 py-10 text-center">
          <ReceiptText className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 font-semibold">รายการนี้ส่งเข้าตรวจแล้ว</p>
          <p className="mt-1 text-sm text-muted-foreground">แก้ไขได้เฉพาะรายการที่ยังเป็นแบบร่าง</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#eef7f3]">
      <Header backHref={`/expenses/${id}`} title="แก้ไขแบบร่าง" subtitle="ปรับข้อมูลก่อนส่งเข้าตรวจ" />

      <form onSubmit={onSubmit} className="flex flex-col gap-3 px-4 pb-32 pt-3">
        {error && (
          <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {ocrMessage && (
          <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{ocrMessage}</span>
          </div>
        )}

        <section className="overflow-hidden rounded-lg border border-border bg-background p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-[#0f8f72]" />
            <span className="text-sm font-semibold">ประเภทค่าใช้จ่าย</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {TYPE_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setType(option.value)}
                className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold ${
                  type === option.value
                    ? 'border-[#0f8f72] bg-emerald-50 text-[#0f8f72]'
                    : 'border-border bg-background text-foreground'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <OcrAssistantPanel
          result={ocrResult}
          existingFileCount={existingAttachments.length}
          pendingFileCount={files.length}
          isStarting={isStartingOcr}
          isFetching={isFetchingOcr}
          onStart={() => void handleStartOcr()}
          onApply={() => { applyOcrSuggestions(false) }}
        />

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

        <section className="rounded-lg border border-border bg-background p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-[#0f8f72]" />
            <span className="text-sm font-semibold">หลักฐานแนบ</span>
            <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{totalFiles}/{MAX_FILES}</span>
          </div>

          <div className="space-y-3">
            {[...REQUIRED_FUEL_DOCUMENTS, 'Other' as const].map(documentType => {
              const existing = existingAttachments.filter(item => item.documentType === documentType)
              const pending = files.filter(item => item.documentType === documentType)
              const required = type === 'Fuel' && documentType !== 'Other'
              return (
                <div key={documentType} className="rounded-lg border border-border bg-whited p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">
                        {EXPENSE_DOCUMENT_LABEL[documentType]}
                        {required && <span className="ml-1 text-red-600">*</span>}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${(existing.length + pending.length) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {(existing.length + pending.length) ? 'แนบแล้ว' : 'ยังไม่มีไฟล์'}
                    </span>
                  </div>

                  {(existing.length > 0 || pending.length > 0) && (
                    <div className="mb-2 space-y-2">
                      {existing.map((item, index) => (
                        <div key={`${item.url}-${index}`} className="flex items-center gap-3 rounded-lg border border-border bg-white p-2.5">
                          {isImageAttachmentUrl(item.url) ? (
                            <img src={publicFileUrl(item.url)} alt={item.fileName || EXPENSE_DOCUMENT_LABEL[item.documentType]} className="h-10 w-10 shrink-0 rounded-md object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          <a href={publicFileUrl(item.url)} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-xs font-medium">
                            {item.fileName || `${EXPENSE_DOCUMENT_LABEL[item.documentType]} ${index + 1}`} <ExternalLink className="inline h-3 w-3" />
                          </a>
                          <button type="button" onClick={() => setExistingAttachments(prev => prev.filter(file => file.url !== item.url))} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {pending.map(item => (
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
                          <button type="button" onClick={() => setFiles(prev => prev.filter(file => file.id !== item.id))} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {totalFiles < MAX_FILES && (
                    <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background text-sm font-medium active:bg-primary/5">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      เพิ่มไฟล์
                      <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" multiple className="hidden" onChange={(event) => handleFileChange(documentType, event)} />
                    </label>
                  )}
                </div>
              )
            })}
            {totalFiles >= MAX_FILES && <p className="py-2 text-center text-xs text-muted-foreground">แนบครบ {MAX_FILES} ไฟล์แล้ว</p>}
          </div>
        </section>

        <div className="fixed bottom-20 left-1/2 grid w-[calc(100%-2rem)] max-w-96 -translate-x-1/2 grid-cols-[0.8fr_1fr_1fr] gap-2">
          <button
            type="button"
            disabled={submitting || isDeletingDraft}
            onClick={() => void handleDeleteDraft()}
            className="flex h-12 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white text-xs font-bold text-red-600 shadow-lg disabled:border-slate-200 disabled:text-slate-300"
          >
            {isDeletingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            ลบร่าง
          </button>
          <button
            type="button"
            disabled={!canSaveDraft}
            onClick={() => void save('draft')}
            className="flex h-12 items-center justify-center gap-1.5 rounded-lg border border-[#0f8f72] bg-white text-xs font-bold text-[#0f8f72] shadow-lg disabled:border-slate-200 disabled:text-slate-300"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            บันทึกร่าง
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex h-12 items-center justify-center gap-1.5 rounded-lg bg-[#0f8f72] text-xs font-bold text-white shadow-lg disabled:bg-slate-300"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            ส่งรายการ
          </button>
        </div>
      </form>
    </div>
  )
}

function OcrAssistantPanel({
  result,
  existingFileCount,
  pendingFileCount,
  isStarting,
  isFetching,
  onStart,
  onApply,
}: {
  result?: ExpenseOcrSummaryDto
  existingFileCount: number
  pendingFileCount: number
  isStarting: boolean
  isFetching: boolean
  onStart: () => void
  onApply: () => void
}) {
  const status = result?.status
  const running = isOcrRunning(status)
  const suggestions = result?.suggestions ?? {}
  const suggestionEntries = OCR_FIELD_ORDER
    .map(key => ({ key, suggestion: suggestions[key], value: suggestionFormValue(key, suggestions[key]) }))
    .filter(item => item.value)
  const canStart = existingFileCount > 0 && pendingFileCount === 0 && !isStarting && !running
  const canApply = !!result?.canApply && suggestionEntries.length > 0 && !running

  return (
    <section className="rounded-lg border border-emerald-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[#0f8f72]" />
        <span className="text-sm font-semibold">ตรวจสอบข้อมูลจากภาพ</span>
        {status && (
          <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${
            status === 'Succeeded'
              ? 'bg-emerald-100 text-emerald-700'
              : status === 'Failed'
                ? 'bg-red-100 text-red-700'
                : 'bg-amber-100 text-amber-700'
          }`}
          >
            {OCR_STATUS_LABEL[status]}
          </span>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button
          type="button"
          disabled={!canStart}
          onClick={onStart}
          className="flex h-11 items-center justify-center gap-2 rounded-lg border border-[#0f8f72] bg-white text-sm font-bold text-[#0f8f72] disabled:border-slate-200 disabled:text-slate-300"
        >
          {(isStarting || running || isFetching) ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          อ่านข้อมูลจากไฟล์
        </button>
        <button
          type="button"
          disabled={!canApply}
          onClick={onApply}
          className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0f8f72] px-3 text-sm font-bold text-white disabled:bg-slate-300"
        >
          <CheckCircle2 className="h-4 w-4" />
          เติม
        </button>
      </div>

      {pendingFileCount > 0 && (
        <p className="mt-2 text-xs text-amber-700">มีไฟล์ใหม่ที่ยังไม่บันทึก กรุณาบันทึกร่างก่อนเริ่ม OCR</p>
      )}

      {result?.results.some(item => item.errorMessage) && (
        <div className="mt-3 rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700">
          {result.results.find(item => item.errorMessage)?.errorMessage}
        </div>
      )}

      {suggestionEntries.length > 0 && (
        <div className="mt-3 space-y-2">
          {suggestionEntries.map(({ key, suggestion, value }) => (
            <div key={key} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-[#f8fbfa] px-3 py-2">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{OCR_FIELD_LABEL[key]}</p>
                <p className="truncate text-sm font-semibold">{value}</p>
              </div>
              {suggestion?.confidence != null && (
                <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs text-muted-foreground">
                  {Math.round(suggestion.confidence * 100)}%
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function Header({ backHref, title, subtitle }: { backHref: string; title: string; subtitle?: string }) {
  return (
    <div className="bg-[#0f8f72] px-4 pb-5 pt-4 text-white">
      <div className="flex items-center gap-3">
        <Link href={backHref} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-lg font-bold">{title}</h1>
          {subtitle && <p className="text-xs text-white/75">{subtitle}</p>}
        </div>
      </div>
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
    <label className="block w-full min-w-0 max-w-full overflow-hidden">
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
        style={{ boxSizing: 'border-box', minInlineSize: 0 }}
        className="block h-11 w-full min-w-0 max-w-full rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-[#0f8f72]"
      />
    </label>
  )
}
