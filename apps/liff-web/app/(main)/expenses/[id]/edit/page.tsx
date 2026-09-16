'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import type { ChangeEvent, FormEvent, InputHTMLAttributes } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
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
import { apiMessageDetailed } from '@/lib/api-message'
import {
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

const TYPE_OPTIONS: ExpenseClaimType[] = ['Fuel', 'Toll', 'Parking', 'Meal', 'Other']

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

export default function EditExpensePage() {
  const t = useTranslations('liff.expense')
  const tType = useTranslations('status.expenseType')
  const tDoc = useTranslations('status.expenseDocument')
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

  // รายชื่อเอกสารที่ขาด แปลตามภาษา เช่น "ใบสั่งจ่าย และ ใบเสร็จชำระเงิน"
  const missingDocuments = (attachments: Pick<ExpenseAttachmentFileDto, 'documentType'>[]) =>
    missingExpenseDocumentLabels(type, attachments, { document: tDoc, anyFile: t('form.atLeastOneFile') }).join(t('form.documentsJoin'))

  function handleFileChange(documentType: ExpenseAttachmentDocumentType, event: ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files ?? [])
    event.target.value = ''

    const tooBig = incoming.filter(file => file.size > MAX_SIZE)
    if (tooBig.length) {
      setError(t('form.fileTooBig', { names: tooBig.map(file => file.name).join(', ') }))
      return
    }

    setFiles(prev => {
      const existing = new Set(prev.map(item => `${item.file.name}:${item.file.size}:${item.documentType}`))
      const newItems = incoming
        .filter(file => !existing.has(`${file.name}:${file.size}:${documentType}`))
        .map(file => ({ id: `${documentType}:${file.name}:${file.size}:${Date.now()}:${Math.random()}`, documentType, file }))
      const next = [...prev, ...newItems]
      if (existingAttachments.length + next.length > MAX_FILES) {
        setError(t('form.tooManyFiles', { max: MAX_FILES }))
        return next.slice(0, Math.max(0, MAX_FILES - existingAttachments.length))
      }
      setError(null)
      return next
    })
  }

  async function handleStartOcr() {
    if (files.length > 0) {
      setError(t('form.errors.saveDraftBeforeOcr'))
      return
    }

    if (existingAttachments.length === 0) {
      setError(t('form.errors.attachAndSaveBeforeOcr'))
      return
    }

    const missing = missingDocuments(existingAttachments)
    if (missing) {
      setError(t('form.errors.saveFilesBeforeOcr', { documents: missing }))
      return
    }

    setError(null)
    setOcrMessage(null)
    try {
      await startOcr()
      await refetchOcr()
    } catch (err) {
      setError(apiMessageDetailed(err, t('form.errors.saveFailed')))
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
      setOcrMessage(isAuto ? t('edit.ocrAppliedAuto', { count: applied }) : t('edit.ocrApplied', { count: applied }))
      setError(null)
    } else {
      setError(t('form.errors.noOcrData'))
    }
    return applied
  }

  async function save(mode: 'draft' | 'submit') {
    const isDraft = mode === 'draft'

    if (!isDraft && (!canSubmit || !amountNumber)) {
      const missing = missingDocuments(allAttachments)
      setError(missing ? t('form.errors.attachRequired', { documents: missing }) : t('form.errors.fillRequired'))
      return
    }

    if (isDraft && !canSaveDraft) {
      setError(t('form.errors.notEditable'))
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
      setError(apiMessageDetailed(err, t('form.errors.saveFailed')))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteDraft() {
    if (isDeletingDraft || submitting) return
    const ok = window.confirm(t('edit.confirmDelete'))
    if (!ok) return

    setError(null)
    try {
      await deleteDraft()
      router.replace('/expenses')
    } catch (err) {
      setError(apiMessageDetailed(err, t('form.errors.saveFailed')))
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
        <Header backHref="/expenses" title={t('edit.title')} />
        <div className="px-4 py-10 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 font-semibold">{t('edit.notFound')}</p>
        </div>
      </div>
    )
  }

  if (data.status !== 'Draft') {
    return (
      <div className="min-h-screen bg-muted/30 pb-24">
        <Header backHref={`/expenses/${data.id}`} title={t('edit.title')} />
        <div className="px-4 py-10 text-center">
          <ReceiptText className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 font-semibold">{t('edit.alreadySubmitted')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('edit.draftOnly')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#eef7f3]">
      <Header backHref={`/expenses/${id}`} title={t('edit.title')} subtitle={t('edit.subtitle')} />

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
            <span className="text-sm font-semibold">{t('form.typeSection')}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {TYPE_OPTIONS.map(option => (
              <button
                key={option}
                type="button"
                onClick={() => setType(option)}
                className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold ${
                  type === option
                    ? 'border-[#0f8f72] bg-emerald-50 text-[#0f8f72]'
                    : 'border-border bg-background text-foreground'
                }`}
              >
                {tType(option)}
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
            <span className="text-sm font-semibold">{t('form.billInfo')}</span>
          </div>
          <div className="min-w-0 space-y-3">
            <TextInput label={`${t('form.documentDate')} *`} value={expenseDate} onChange={setExpenseDate} type="date" />
            <TextInput label={`${t('form.amount')} *`} value={amount} onChange={setAmount} type="number" inputMode="decimal" placeholder={t('form.amountPlaceholder')} />
            <TextInput label={t('form.merchant')} value={merchantName} onChange={setMerchantName} placeholder={t('form.merchantPlaceholder')} maxLength={200} />
            <TextInput label={t('form.billNo')} value={billNo} onChange={setBillNo} placeholder={t('form.billNoPlaceholder')} maxLength={80} />
            <div className="grid grid-cols-2 gap-3">
              <TextInput label="TID" value={receiptTid} onChange={setReceiptTid} placeholder={t('form.tidPlaceholder')} maxLength={80} />
              <TextInput label="BATCH" value={receiptBatch} onChange={setReceiptBatch} placeholder={t('form.batchPlaceholder')} maxLength={80} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextInput label="MID" value={receiptMid} onChange={setReceiptMid} placeholder={t('form.midPlaceholder')} maxLength={80} />
              <TextInput label="TRACE" value={receiptTrace} onChange={setReceiptTrace} placeholder={t('form.tracePlaceholder')} maxLength={80} />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-background p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Truck className="h-4 w-4 text-[#0f8f72]" />
            <span className="text-sm font-semibold">{t('form.vehicleInfo')}</span>
          </div>
          <div className="space-y-3">
            <TextInput label={t('form.driver')} value={driverName} onChange={setDriverName} placeholder={t('form.driverPlaceholder')} maxLength={160} />
            <div className="grid grid-cols-2 gap-3">
              <TextInput label={t('form.vehicleNo')} value={vehicleNo} onChange={setVehicleNo} placeholder="272-131" maxLength={80} />
              <TextInput label={t('form.plateNo')} value={plateNo} onChange={setPlateNo} placeholder="76-9442" maxLength={80} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextInput label={t('form.fuelLiters')} value={fuelLiters} onChange={setFuelLiters} type="number" inputMode="decimal" placeholder="104" />
              <TextInput label={t('form.tripCount')} value={tripCount} onChange={setTripCount} type="number" inputMode="numeric" placeholder="1" />
            </div>
            <TextInput label={t('form.transportNo')} value={transportNo} onChange={setTransportNo} placeholder={t('form.transportNoPlaceholder')} maxLength={100} />
            <TextInput label={t('form.origin')} value={origin} onChange={setOrigin} placeholder={t('form.originPlaceholder')} maxLength={200} />
            <TextInput label={t('form.customer')} value={customerName} onChange={setCustomerName} placeholder={t('form.customerPlaceholder')} maxLength={200} />
          </div>
        </section>

        <section className="rounded-lg border border-border bg-background p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#0f8f72]" />
            <span className="text-sm font-semibold">{t('form.note')}</span>
            <span className="ml-auto text-xs text-muted-foreground">{note.length}/500</span>
          </div>
          <textarea
            value={note}
            onChange={event => setNote(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder={t('form.notePlaceholder')}
            className="w-full resize-none rounded-lg border border-border bg-whited px-3 py-2.5 text-sm outline-none focus:border-[#0f8f72]"
          />
        </section>

        <section className="rounded-lg border border-border bg-background p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-[#0f8f72]" />
            <span className="text-sm font-semibold">{t('form.attachments')}</span>
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
                        {tDoc(documentType)}
                        {required && <span className="ml-1 text-red-600">*</span>}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${(existing.length + pending.length) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {(existing.length + pending.length) ? t('form.attached') : t('form.noFile')}
                    </span>
                  </div>

                  {(existing.length > 0 || pending.length > 0) && (
                    <div className="mb-2 space-y-2">
                      {existing.map((item, index) => (
                        <div key={`${item.url}-${index}`} className="flex items-center gap-3 rounded-lg border border-border bg-white p-2.5">
                          {isImageAttachmentUrl(item.url) ? (
                            <img src={publicFileUrl(item.url)} alt={item.fileName || tDoc(item.documentType)} className="h-10 w-10 shrink-0 rounded-md object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          <a href={publicFileUrl(item.url)} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-xs font-medium">
                            {item.fileName || `${tDoc(item.documentType)} ${index + 1}`} <ExternalLink className="inline h-3 w-3" />
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
                      {t('form.addFile')}
                      <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" multiple className="hidden" onChange={(event) => handleFileChange(documentType, event)} />
                    </label>
                  )}
                </div>
              )
            })}
            {totalFiles >= MAX_FILES && <p className="py-2 text-center text-xs text-muted-foreground">{t('form.filesFull', { max: MAX_FILES })}</p>}
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
            {t('form.deleteDraft')}
          </button>
          <button
            type="button"
            disabled={!canSaveDraft}
            onClick={() => void save('draft')}
            className="flex h-12 items-center justify-center gap-1.5 rounded-lg border border-[#0f8f72] bg-white text-xs font-bold text-[#0f8f72] shadow-lg disabled:border-slate-200 disabled:text-slate-300"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t('form.saveDraft')}
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex h-12 items-center justify-center gap-1.5 rounded-lg bg-[#0f8f72] text-xs font-bold text-white shadow-lg disabled:bg-slate-300"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {t('form.submit')}
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
  const t = useTranslations('liff.expense.edit.ocr')
  const tOcrStatus = useTranslations('status.expenseOcr')
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
        <span className="text-sm font-semibold">{t('title')}</span>
        {status && (
          <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${
            status === 'Succeeded'
              ? 'bg-emerald-100 text-emerald-700'
              : status === 'Failed'
                ? 'bg-red-100 text-red-700'
                : 'bg-amber-100 text-amber-700'
          }`}
          >
            {tOcrStatus(status)}
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
          {t('read')}
        </button>
        <button
          type="button"
          disabled={!canApply}
          onClick={onApply}
          className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0f8f72] px-3 text-sm font-bold text-white disabled:bg-slate-300"
        >
          <CheckCircle2 className="h-4 w-4" />
          {t('apply')}
        </button>
      </div>

      {pendingFileCount > 0 && (
        <p className="mt-2 text-xs text-amber-700">{t('pendingFiles')}</p>
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
                <p className="text-xs text-muted-foreground">{t(`field.${key}`)}</p>
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
