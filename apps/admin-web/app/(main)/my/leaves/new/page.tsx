'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { AlertCircle, CalendarDays, Clock, FileText, ChevronLeft, Paperclip, X } from 'lucide-react'
import Link from 'next/link'
import { useCreateLeave, useLeaveBalance, useLeaveTypes } from '@/hooks/use-leaves'
import { uploadApi } from '@/lib/upload.api'

const todayStr = new Date().toISOString().split('T')[0]

const schema = z
  .object({
    leaveTypeId: z.string().min(1, 'กรุณาเลือกประเภทการลา'),
    dateFrom:    z.string().min(1, 'กรุณาเลือกวันเริ่มต้น'),
    dateTo:      z.string().min(1, 'กรุณาเลือกวันสิ้นสุด'),
    timeFrom:    z.string().optional(),
    timeTo:      z.string().optional(),
    reason:      z.string().max(500).optional(),
  })
  .refine((d) => d.dateTo >= d.dateFrom, {
    message: 'วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น',
    path: ['dateTo'],
  })
  .refine(
    (d) => !d.timeFrom || !d.timeTo || d.timeTo > d.timeFrom,
    { message: 'เวลาสิ้นสุดต้องหลังเวลาเริ่มต้น', path: ['timeTo'] },
  )

type FormValues = z.infer<typeof schema>

const DURATION_OPTIONS = [
  { label: '30 นาที', minutes: 30 },
  { label: '1 ชม.',   minutes: 60 },
  { label: '1.5 ชม.', minutes: 90 },
  { label: '2 ชม.',   minutes: 120 },
  { label: '3 ชม.',   minutes: 180 },
  { label: '4 ชม.',   minutes: 240 },
]

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + mins
  const nh = Math.floor(total / 60) % 24
  const nm = total % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

function calcDays(from: string, to: string): number {
  if (!from || !to) return 0
  const diff = new Date(to).getTime() - new Date(from).getTime()
  return Math.max(0, Math.round(diff / 86400000) + 1)
}

function calcHours(timeFrom: string, timeTo: string): number {
  const [fh, fm] = timeFrom.split(':').map(Number)
  const [th, tm] = timeTo.split(':').map(Number)
  return (th * 60 + tm - (fh * 60 + fm)) / 60
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

const LEAVE_COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899']

export default function MyLeaveNewPage() {
  const router = useRouter()
  const { data: leaveTypes, isLoading: typesLoading } = useLeaveTypes()
  const { data: balances } = useLeaveBalance()
  const { mutateAsync: createLeave } = useCreateLeave()

  const [apiError,     setApiError]     = useState<string | null>(null)
  const [attachFiles, setAttachFiles] = useState<File[]>([])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const leaveTypeId = watch('leaveTypeId')
  const dateFrom    = watch('dateFrom')
  const dateTo      = watch('dateTo')
  const timeFrom    = watch('timeFrom')
  const timeTo      = watch('timeTo')
  const reason      = watch('reason') ?? ''

  const isSingleDay = dateFrom && dateTo && dateFrom === dateTo
  const days        = calcDays(dateFrom, dateTo)
  const hours       = timeFrom && timeTo ? calcHours(timeFrom, timeTo) : 0
  const selectedBal = balances?.find((b) => b.leaveTypeId === leaveTypeId)

  const MAX_FILES = 5
  const MAX_SIZE  = 10 * 1024 * 1024

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files ?? [])
    e.target.value = ''
    const tooBig = incoming.filter(f => f.size > MAX_SIZE)
    if (tooBig.length) {
      setApiError(`ไฟล์ต่อไปนี้ใหญ่เกิน 10 MB: ${tooBig.map(f => f.name).join(', ')}`)
      return
    }
    setAttachFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size))
      const added = [...prev, ...incoming.filter(f => !existing.has(f.name + f.size))]
      if (added.length > MAX_FILES) {
        setApiError(`แนบได้สูงสุด ${MAX_FILES} ไฟล์`)
        return prev.length < MAX_FILES ? added.slice(0, MAX_FILES) : prev
      }
      setApiError(null)
      return added
    })
  }

  function removeFile(idx: number) {
    setAttachFiles(prev => prev.filter((_, i) => i !== idx))
  }

  async function onSubmit(values: FormValues) {
    setApiError(null)
    try {
      const attachmentUrls = attachFiles.length > 0
        ? await Promise.all(attachFiles.map(f => uploadApi.upload(f, 'leaves').then(r => r.url)))
        : undefined
      const result = await createLeave({
        leaveTypeId: values.leaveTypeId,
        dateFrom:    values.dateFrom,
        dateTo:      values.dateTo,
        halfDay:     'Full',
        timeFrom:    values.timeFrom || undefined,
        timeTo:      values.timeTo   || undefined,
        reason:      values.reason   || undefined,
        attachmentUrls,
      })
      router.replace(`/my/leaves/${result.id}`)
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (code === 'OVERLAPPING_LEAVE')    setApiError('มีวันลาที่ทับซ้อนกับช่วงเวลาที่เลือกอยู่แล้ว')
      else if (code === 'INSUFFICIENT_BALANCE') setApiError('วันลาคงเหลือไม่เพียงพอ')
      else setApiError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
    }
  }

  return (
    <div className="min-h-full bg-whited/40 p-4 lg:p-6">
      <div className="mx-auto max-w-4xl space-y-5">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <Link
            href="/my/leaves"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">ยื่นคำขอลา</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">เลือกประเภทและช่วงวันที่ลา</p>
          </div>
        </div>

        {/* ── Layout: form left | summary right (desktop) ─────── */}
        <div className="grid gap-5 lg:grid-cols-3">

          {/* ── Form column ─────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* ประเภทการลา */}
            <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">ประเภทการลา</span>
                {selectedBal && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    คงเหลือ <span className="font-semibold text-primary">{selectedBal.remainingDays}</span> วัน
                  </span>
                )}
              </div>

              {typesLoading ? (
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-9 w-24 animate-pulse rounded-full bg-whited" />
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {leaveTypes
                    ?.filter((lt) => {
                      const bal = balances?.find((b) => b.leaveTypeId === lt.id)
                      // ถ้ายังไม่มีข้อมูล balance ให้แสดงไว้ก่อน, ถ้ามีต้องเหลือ > 0
                      return !bal || bal.remainingDays > 0
                    })
                    .map((lt, idx) => {
                      const color    = LEAVE_COLORS[idx % LEAVE_COLORS.length]
                      const selected = leaveTypeId === lt.id
                      return (
                        <button
                          key={lt.id}
                          type="button"
                          onClick={() => setValue('leaveTypeId', lt.id, { shouldValidate: true })}
                          className="rounded-full border-2 px-3.5 py-1.5 text-sm font-medium transition-all"
                          style={
                            selected
                              ? { borderColor: color, backgroundColor: color, color: '#fff' }
                              : { borderColor: '#e5e5e5', backgroundColor: '#fff', color: '#555' }
                          }
                        >
                          {lt.nameTh}
                        </button>
                      )
                    })}
                </div>
              )}
              <FieldError message={errors.leaveTypeId?.message} />
            </div>

            {/* วันที่ลา */}
            <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">ช่วงวันที่ลา</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">วันเริ่มต้น</label>
                  <input
                    type="date"
                    min={todayStr}
                    {...register('dateFrom')}
                    onChange={(e) => {
                      setValue('dateFrom', e.target.value, { shouldValidate: true })
                      if (dateTo && e.target.value > dateTo)
                        setValue('dateTo', e.target.value, { shouldValidate: true })
                      setValue('timeFrom', undefined)
                      setValue('timeTo', undefined)
                    }}
                    className="w-full rounded-xl border border-border bg-whited px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <FieldError message={errors.dateFrom?.message} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">วันสิ้นสุด</label>
                  <input
                    type="date"
                    min={dateFrom || todayStr}
                    {...register('dateTo')}
                    onChange={(e) => setValue('dateTo', e.target.value, { shouldValidate: true })}
                    className="w-full rounded-xl border border-border bg-whited px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <FieldError message={errors.dateTo?.message} />
                </div>
              </div>
            </div>

            {/* ระบุเวลา (single day เท่านั้น) */}
            {isSingleDay && (
              <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">ระบุเวลา</span>
                  <span className="ml-auto text-xs text-muted-foreground">ไม่บังคับ</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">เวลาเริ่มต้น</label>
                    <input
                      type="time"
                      value={timeFrom ?? ''}
                      onChange={(e) => {
                        setValue('timeFrom', e.target.value || undefined)
                        setValue('timeTo', undefined)
                      }}
                      className="w-full rounded-xl border border-border bg-whited px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">เวลาสิ้นสุด</label>
                    <input
                      type="time"
                      value={timeTo ?? ''}
                      min={timeFrom}
                      onChange={(e) => setValue('timeTo', e.target.value || undefined)}
                      className="w-full rounded-xl border border-border bg-whited px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <FieldError message={errors.timeTo?.message} />
                  </div>
                </div>

                {/* Duration presets */}
                {timeFrom && (
                  <div className="mt-3">
                    <p className="mb-2 text-xs text-muted-foreground">เลือกระยะเวลาด่วน</p>
                    <div className="flex flex-wrap gap-2">
                      {DURATION_OPTIONS.map(({ label, minutes }) => {
                        const endTime  = addMinutes(timeFrom, minutes)
                        const selected = timeTo === endTime
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setValue('timeTo', endTime)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                              selected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-whited text-foreground hover:border-primary/50'
                            }`}
                          >
                            {label}
                            {!selected && <span className="ml-1 text-muted-foreground">→ {endTime}</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {timeFrom && (
                  <button
                    type="button"
                    onClick={() => { setValue('timeFrom', undefined); setValue('timeTo', undefined) }}
                    className="mt-3 text-xs text-muted-foreground underline"
                  >
                    ล้างเวลา
                  </button>
                )}
              </div>
            )}

            {/* เหตุผล */}
            <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">
                  เหตุผล <span className="font-normal text-muted-foreground">(ถ้ามี)</span>
                </span>
              </div>
              <textarea
                {...register('reason')}
                rows={3}
                placeholder="ระบุเหตุผลการลา..."
                className="w-full resize-none rounded-xl border border-border bg-whited px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="mt-1 flex justify-end">
                <span className={`text-xs ${reason.length > 450 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {reason.length}/500
                </span>
              </div>
            </div>

            {/* เอกสารแนบ */}
            <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">
                  เอกสารแนบ
                  {leaveTypes?.find((l) => l.id === leaveTypeId)?.requiresAttachment
                    ? <span className="ml-1 text-destructive">*</span>
                    : <span className="ml-1 font-normal text-muted-foreground">(ถ้ามี)</span>}
                </span>
                {attachFiles.length > 0 && (
                  <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {attachFiles.length} ไฟล์
                  </span>
                )}
              </div>

              {attachFiles.length > 0 && (
                <div className="mb-3 space-y-2">
                  {attachFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-3 rounded-xl border border-border bg-whited p-2.5">
                      {file.type.startsWith('image/') ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="h-10 w-10 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <button type="button" onClick={() => removeFile(idx)} className="shrink-0 rounded-full p-1 hover:bg-destructive/10">
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {attachFiles.length < MAX_FILES ? (
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-border px-4 py-4 transition-colors hover:border-primary/50 hover:bg-primary/5">
                  <Paperclip className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {attachFiles.length > 0 ? 'คลิกเพื่อเพิ่มไฟล์อีก' : 'คลิกเพื่อเลือกไฟล์'}
                    </p>
                    <p className="text-xs text-muted-foreground">.jpg .jpeg .png .pdf · สูงสุด 10 MB/ไฟล์ · ไม่เกิน {MAX_FILES} ไฟล์</p>
                  </div>
                  <input type="file" accept=".jpg,.jpeg,.png,.pdf" multiple className="hidden" onChange={handleFileChange} />
                </label>
              ) : (
                <p className="text-center text-xs text-muted-foreground py-1">แนบครบ {MAX_FILES} ไฟล์แล้ว</p>
              )}
            </div>

            {/* API Error */}
            {apiError && (
              <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <p className="text-sm text-destructive">{apiError}</p>
              </div>
            )}

            {/* Submit — mobile: full width ด้านล่าง form */}
            <div className="lg:hidden">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit(onSubmit)}
                className="w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-sm disabled:opacity-60 transition-opacity"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                    กำลังส่งคำขอ...
                  </span>
                ) : 'ยืนยันการขอลา'}
              </button>
            </div>
          </div>

          {/* ── Summary column (desktop only) ────────────────── */}
          <div className="hidden lg:block">
            <div className="sticky top-4 space-y-4">
              <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
                <p className="mb-4 text-sm font-semibold text-foreground">สรุปคำขอลา</p>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ประเภท</span>
                    <span className="font-medium text-right">
                      {leaveTypes?.find((l) => l.id === leaveTypeId)?.nameTh ?? '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">วันที่</span>
                    <span className="font-medium text-right">
                      {dateFrom
                        ? new Date(dateFrom).toLocaleDateString('th-TH', { dateStyle: 'medium' })
                        : '—'}
                      {dateTo && dateTo !== dateFrom && (
                        <> – {new Date(dateTo).toLocaleDateString('th-TH', { dateStyle: 'medium' })}</>
                      )}
                    </span>
                  </div>
                  {timeFrom && timeTo && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">เวลา</span>
                      <span className="font-medium">{timeFrom} – {timeTo} น.</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border pt-3">
                    <span className="text-muted-foreground">จำนวน</span>
                    <span className="text-base font-bold text-primary">
                      {timeFrom && timeTo && hours > 0
                        ? `${hours} ชั่วโมง`
                        : days > 0 ? `${days} วัน` : '—'}
                    </span>
                  </div>
                  {selectedBal && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>คงเหลือหลังลา</span>
                      <span className={selectedBal.remainingDays - days <= 0 ? 'text-destructive font-semibold' : 'text-foreground'}>
                        {Math.max(0, selectedBal.remainingDays - days)} วัน
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmit(onSubmit)}
                  className="mt-5 w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-sm disabled:opacity-60 transition-opacity"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                      กำลังส่งคำขอ...
                    </span>
                  ) : 'ยืนยันการขอลา'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
