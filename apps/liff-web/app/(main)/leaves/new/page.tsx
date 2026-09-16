'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocale, useTranslations } from 'next-intl'
import { z } from 'zod'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'
import { localizedName } from '@hrms/i18n'
import { useCreateLeave, useLeaveBalance, useLeaveTypes } from '@/hooks/use-leaves'
import { useAttendanceToday } from '@/hooks/use-attendance'
import { useFmt } from '@/hooks/use-fmt'
import { ChevronLeft, CalendarDays, Clock, FileText, AlertCircle, Paperclip, X } from 'lucide-react'
import Link from 'next/link'
import { apiErrorText } from '@/lib/api-message'
import { uploadLeaveAttachment } from '@/lib/upload.api'

const today = new Date()
today.setHours(0, 0, 0, 0)

type NewLeaveTranslator = ReturnType<typeof useTranslations<'liff.leave.new'>>

// ข้อความ validation มาจากไฟล์ภาษา จึงสร้าง schema ในคอมโพเนนต์ (แผน i18n งาน 1.14)
function buildSchema(t: NewLeaveTranslator) {
  return z
    .object({
      leaveTypeId: z.string({ error: t('validation.leaveTypeRequired') }).min(1, t('validation.leaveTypeRequired')),
      dateFrom: z.date({ error: t('validation.dateFromRequired') }),
      dateTo: z.date({ error: t('validation.dateToRequired') }),
      timeFrom: z.string().optional(),
      timeTo: z.string().optional(),
      reason: z.string().max(500).optional(),
    })
    .refine(d => d.dateTo >= d.dateFrom, {
      message: t('validation.dateOrder'),
      path: ['dateTo'],
    })
    .refine(
      d => !d.timeFrom || !d.timeTo || d.timeTo > d.timeFrom,
      { message: t('validation.timeOrder'), path: ['timeTo'] }
    )
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>

function toISODate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const DURATION_OPTIONS = [
  { key: 'm30', minutes: 30 },
  { key: 'h1', minutes: 60 },
  { key: 'h1_5', minutes: 90 },
  { key: 'h2', minutes: 120 },
  { key: 'h3', minutes: 180 },
  { key: 'h4', minutes: 240 },
  { key: 'halfDay', minutes: 240 },
  { key: 'fullDay', minutes: 480 },
] as const

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + mins
  const nh = Math.floor(total / 60) % 24
  const nm = total % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

const LEAVE_COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#06b6d4']

export default function NewLeavePage() {
  const t = useTranslations('liff.leave.new')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')
  const locale = useLocale()
  const fmt = useFmt()
  const router = useRouter()
  const { data: leaveTypes, isLoading: typesLoading } = useLeaveTypes()
  const { data: balances } = useLeaveBalance()
  const { mutateAsync: createLeave } = useCreateLeave()
  const { data: attendanceToday } = useAttendanceToday()

  const shiftStart = attendanceToday?.shiftStart?.slice(0, 5) // "HH:mm"
  const shiftEnd   = attendanceToday?.shiftEnd?.slice(0, 5)

  const [range, setRange] = useState<{ from?: Date; to?: Date }>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [attachFiles, setAttachFiles] = useState<File[]>([])

  const schema = useMemo(() => buildSchema(t), [t])
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const leaveTypeId = watch('leaveTypeId')
  const dateFrom = watch('dateFrom')
  const dateTo = watch('dateTo')
  const timeFrom = watch('timeFrom')
  const timeTo = watch('timeTo')
  const reason = watch('reason') ?? ''

  // จำนวนที่ลา — เป็นชั่วโมงถ้าระบุเวลาในวันเดียว ไม่งั้นเป็นวัน
  const calcDisplay = (from?: Date, to?: Date, tFrom?: string, tTo?: string) => {
    if (!from || !to) return null
    if (tFrom && tTo) {
      const [fh, fm] = tFrom.split(':').map(Number)
      const [th, tm] = tTo.split(':').map(Number)
      const hours = (th * 60 + tm - fh * 60 - fm) / 60
      return hours > 0 ? tCommon('duration.hours', { count: hours }) : null
    }
    const days = Math.round((to.getTime() - from.getTime()) / 86400000) + 1
    return tCommon('duration.days', { count: days })
  }

  const isSingleDay = dateFrom && dateTo && dateFrom.getTime() === dateTo.getTime()
  const displayDuration = calcDisplay(dateFrom, dateTo, timeFrom, timeTo)
  const selectedType = leaveTypes?.find(lt => lt.id === leaveTypeId)
  const selectedBal = balances?.find(b => b.leaveTypeId === leaveTypeId)

  const availableTypes = leaveTypes?.filter(lt => {
    const bal = balances?.find(b => b.leaveTypeId === lt.id)
    return !bal || bal.remainingDays > 0
  })

  function handleRangeSelect(r: { from?: Date; to?: Date } | undefined) {
    const next = r ?? {}
    setRange(next)
    if (next.from) setValue('dateFrom', next.from)
    if (next.to) setValue('dateTo', next.to)
    else if (next.from) setValue('dateTo', next.from)
    setValue('timeFrom', undefined)
    setValue('timeTo', undefined)
  }

  const MAX_FILES = 5
  const MAX_SIZE  = 10 * 1024 * 1024

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files ?? [])
    e.target.value = ''
    const tooBig = incoming.filter(f => f.size > MAX_SIZE)
    if (tooBig.length) {
      setApiError(t('fileTooBig', { names: tooBig.map(f => f.name).join(', ') }))
      return
    }
    setAttachFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size))
      const added = [...prev, ...incoming.filter(f => !existing.has(f.name + f.size))]
      if (added.length > MAX_FILES) {
        setApiError(t('tooManyFiles', { max: MAX_FILES }))
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
        ? await Promise.all(attachFiles.map(f => uploadLeaveAttachment(f)))
        : undefined
      const result = await createLeave({
        leaveTypeId: values.leaveTypeId,
        dateFrom: toISODate(values.dateFrom),
        dateTo: toISODate(values.dateTo),
        halfDay: 'Full',
        timeFrom: values.timeFrom,
        timeTo: values.timeTo,
        reason: values.reason,
        attachmentUrls,
      })
      router.replace(`/leaves/${result.id}`)
    } catch (err: unknown) {
      // OVERLAPPING_LEAVE / INSUFFICIENT_BALANCE แปลจาก errors.<code>
      setApiError(apiErrorText(err, tErrors, tCommon('state.error')))
    }
  }

  const optionalHint = <span className="font-normal text-muted-foreground">{tCommon('field.optional')}</span>

  return (
    <div className="min-h-screen bg-[#f0f6ff]">

      {/* Hero — compact */}
      <div className="relative bg-linear-to-br from-[#0ea5e9] to-[#0284c7] px-4 pb-5 pt-4">
        <div className="flex items-center gap-3">
          <Link href="/leaves" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white">{t('title')}</h1>
            <p className="text-xs text-white/70">{t('subtitle')}</p>
          </div>
          {displayDuration && (
            <div className="ml-auto rounded-xl bg-white/20 px-3 py-1.5 text-right">
              <p className="text-[10px] text-white/70">{t('amount')}</p>
              <p className="text-sm font-bold text-white">{displayDuration}</p>
            </div>
          )}
        </div>

        {dateFrom && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-white/70" />
            <span className="text-sm font-medium text-white">
              {fmt.formatDate(dateFrom, { dateStyle: 'medium' })}
              {dateTo && dateTo.getTime() !== dateFrom.getTime() &&
                ` – ${fmt.formatDate(dateTo, { dateStyle: 'medium' })}`}
              {timeFrom && timeTo && ` · ${tCommon('time.range', { from: timeFrom, to: timeTo })}`}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 px-4 pb-44 pt-3">

        {/* ประเภทการลา */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">{t('leaveType')}</span>
            {selectedBal && (
              <span className="ml-auto text-xs text-muted-foreground">
                {t.rich('remaining', {
                  days: selectedBal.remainingDays,
                  b: (chunks) => <span className="font-semibold text-primary">{chunks}</span>,
                })}
              </span>
            )}
          </div>

          {typesLoading ? (
            <div className="flex gap-2">
              {[1, 2, 3].map(i => <div key={i} className="h-9 w-24 animate-pulse rounded-full bg-whited" />)}
            </div>
          ) : availableTypes?.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noTypes')}</p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
              {availableTypes?.map((lt, idx) => {
                const color = LEAVE_COLORS[idx % LEAVE_COLORS.length]
                const selected = leaveTypeId === lt.id
                return (
                  <button
                    key={lt.id}
                    type="button"
                    onClick={() => setValue('leaveTypeId', lt.id)}
                    className="shrink-0 rounded-full border-2 px-3 py-1.5 text-sm font-medium transition-all"
                    style={selected
                      ? { borderColor: color, backgroundColor: color, color: '#fff' }
                      : { borderColor: '#e5e5e5', backgroundColor: '#fff', color: '#555' }
                    }
                  >
                    {localizedName(lt, locale)}
                  </button>
                )
              })}
            </div>
          )}
          {errors.leaveTypeId && (
            <p className="mt-2 text-xs text-destructive">{errors.leaveTypeId.message}</p>
          )}
        </div>

        {/* ปฏิทิน */}
        <div className="rounded-2xl bg-white px-3 pb-3 pt-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2 px-1">
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">{t('selectDates')}</span>
          </div>

          <DayPicker
            mode="range"
            selected={{ from: range.from, to: range.to }}
            onSelect={handleRangeSelect}
            disabled={{ before: today }}
            classNames={{
              root:          'w-full',
              months:        'w-full',
              month:         'w-full',
              month_grid:    'w-full border-collapse',
              weekdays:      'flex w-full',
              weekday:       'flex-1 text-center py-2 text-xs font-medium text-muted-foreground',
              week:          'flex w-full',
              day:           'flex-1',
              day_button:    'w-full h-10 flex items-center justify-center text-sm transition-colors',
              selected:      '',
              range_start:   '',
              range_middle:  '',
              range_end:     '',
              today:         '',
              disabled:      'opacity-30 pointer-events-none',
              outside:       'opacity-0 pointer-events-none',
              nav:           'flex items-center justify-between px-1 mb-2',
              button_previous: 'h-8 w-8 flex items-center justify-center rounded-full hover:bg-whited transition-colors text-muted-foreground',
              button_next:     'h-8 w-8 flex items-center justify-center rounded-full hover:bg-whited transition-colors text-muted-foreground',
              month_caption:   'flex-1 text-center text-sm font-semibold',
              caption_label:   'text-sm font-semibold',
            }}
            modifiersStyles={{
              range_start:  { background: '#0ea5e9', color: '#fff', borderRadius: '9999px' },
              range_end:    { background: '#0ea5e9', color: '#fff', borderRadius: '9999px' },
              range_middle: { background: '#eeeeee', color: '#777', borderRadius: '9999px' },
              selected:     { background: '#0ea5e9', color: '#fff', borderRadius: '9999px' },
              today:        { fontWeight: '700', color: '#0ea5e9' },
            }}
          />

          {(errors.dateFrom || errors.dateTo) && (
            <p className="mt-1 px-1 text-xs text-destructive">
              {errors.dateFrom?.message ?? errors.dateTo?.message}
            </p>
          )}
        </div>

        {/* Time slot picker — start + duration → auto end */}
        {isSingleDay && (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">{t('specifyTime')}</span>
              {shiftStart && shiftEnd ? (
                <span className="ml-auto rounded-full bg-sky-50 px-2.5 py-0.5 text-xs text-sky-600">
                  {t('shift', { from: shiftStart, to: shiftEnd })}
                </span>
              ) : (
                <span className="ml-auto text-xs text-muted-foreground">{t('notRequired')}</span>
              )}
            </div>

            {/* เวลาเริ่ม / สิ้นสุด — list row style */}
            <div className="divide-y rounded-xl border bg-whited overflow-hidden">
              <label className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">{t('timeFrom')}</span>
                <input
                  type="time"
                  value={timeFrom ?? ''}
                  min={shiftStart}
                  max={shiftEnd}
                  onChange={e => {
                    setValue('timeFrom', e.target.value || undefined)
                    setValue('timeTo', undefined)
                  }}
                  className="bg-transparent text-sm font-semibold text-primary focus:outline-none"
                />
              </label>
              <label className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">{t('timeTo')}</span>
                <input
                  type="time"
                  value={timeTo ?? ''}
                  min={timeFrom ?? shiftStart}
                  max={shiftEnd}
                  onChange={e => setValue('timeTo', e.target.value || undefined)}
                  className="bg-transparent text-sm font-semibold text-primary focus:outline-none"
                />
              </label>
            </div>

            {/* Duration presets — กดเพื่อ auto-set เวลาสิ้นสุด */}
            {timeFrom && (
              <>
                <p className="mb-2 mt-3 text-xs font-medium text-muted-foreground">{t('quickDuration')}</p>
                <div className="flex flex-wrap gap-2">
                  {DURATION_OPTIONS.map(({ key, minutes }) => {
                    const endTime = addMinutes(timeFrom, minutes)
                    const selected = timeTo === endTime
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setValue('timeTo', endTime)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                          selected
                            ? 'border-primary bg-primary text-white'
                            : 'border-border bg-whited text-foreground'
                        }`}
                      >
                        {t(`presets.${key}`)}
                        {!selected && <span className="ml-1 text-muted-foreground">→ {endTime}</span>}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {/* Result summary */}
            {timeFrom && timeTo && displayDuration && (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-primary/5 px-4 py-2.5">
                <span className="text-sm font-semibold text-primary">{tCommon('time.range', { from: timeFrom, to: timeTo })}</span>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-bold text-primary">
                  {displayDuration}
                </span>
              </div>
            )}

            {errors.timeTo && <p className="mt-2 text-xs text-destructive">{errors.timeTo.message}</p>}

            {timeFrom && (
              <button
                type="button"
                onClick={() => { setValue('timeFrom', undefined); setValue('timeTo', undefined) }}
                className="mt-2 w-full text-center text-xs text-muted-foreground underline"
              >
                {t('clearTime')}
              </button>
            )}
          </div>
        )}

        {/* เหตุผล */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">
              {t('reason')} {optionalHint}
            </span>
          </div>
          <textarea
            {...register('reason')}
            rows={3}
            placeholder={t('reasonPlaceholder')}
            className="w-full resize-none rounded-xl border bg-whited px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="mt-1 flex justify-end">
            <span className={`text-xs ${reason.length > 450 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {reason.length}/500
            </span>
          </div>
        </div>

        {/* เอกสารแนบ */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">
              {t('attachments')}{selectedType?.requiresAttachment
                ? <span className="ml-1 text-destructive">*</span>
                : <span className="ml-1">{optionalHint}</span>}
            </span>
            {attachFiles.length > 0 && (
              <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {t('fileCount', { count: attachFiles.length })}
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
                    <p className="truncate text-xs font-medium">{file.name}</p>
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
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border py-4 transition-colors hover:border-primary/50 hover:bg-primary/5">
              <Paperclip className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {attachFiles.length > 0 ? t('tapToAdd') : t('tapToSelect')}
              </span>
              <span className="text-xs text-muted-foreground/70">{t('fileHint', { max: MAX_FILES })}</span>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" multiple className="hidden" onChange={handleFileChange} />
            </label>
          ) : (
            <p className="text-center text-xs text-muted-foreground py-2">{t('filesFull', { max: MAX_FILES })}</p>
          )}
        </div>

        {/* API Error */}
        {apiError && (
          <div className="flex items-start gap-3 rounded-2xl bg-destructive/10 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{apiError}</p>
          </div>
        )}
      </div>

      {/* Submit bar — อยู่เหนือ bottom nav (h-16) */}
      <div className="fixed bottom-16 left-0 right-0 border-t bg-white/95 px-4 py-3 backdrop-blur-sm">
        {selectedType && dateFrom && (
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{localizedName(selectedType, locale)}</span>
            <span>
              {fmt.formatDate(dateFrom, { dateStyle: 'short' })}
              {dateTo && dateTo.getTime() !== dateFrom.getTime()
                ? ` – ${fmt.formatDate(dateTo, { dateStyle: 'short' })}`
                : ''}
              {displayDuration && ` · ${displayDuration}`}
            </span>
          </div>
        )}
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleSubmit(onSubmit)}
          className="w-full rounded-2xl bg-primary py-3 text-sm font-bold text-white shadow-md shadow-primary/30 transition-opacity disabled:opacity-60"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {t('submitting')}
            </span>
          ) : (
            t('submit')
          )}
        </button>
      </div>
    </div>
  )
}
