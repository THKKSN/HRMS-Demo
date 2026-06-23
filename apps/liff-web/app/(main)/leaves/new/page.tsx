'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'
import { useCreateLeave, useLeaveBalance, useLeaveTypes } from '@/hooks/use-leaves'
import { useAttendanceToday } from '@/hooks/use-attendance'
import { ChevronLeft, CalendarDays, Clock, FileText, AlertCircle } from 'lucide-react'
import Link from 'next/link'

const today = new Date()
today.setHours(0, 0, 0, 0)

const schema = z
  .object({
    leaveTypeId: z.string({ error: 'กรุณาเลือกประเภทการลา' }).min(1, 'กรุณาเลือกประเภทการลา'),
    dateFrom: z.date({ error: 'กรุณาเลือกวันเริ่มต้น' }),
    dateTo: z.date({ error: 'กรุณาเลือกวันสิ้นสุด' }),
    timeFrom: z.string().optional(),
    timeTo: z.string().optional(),
    reason: z.string().max(500).optional(),
  })
  .refine(d => d.dateTo >= d.dateFrom, {
    message: 'วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น',
    path: ['dateTo'],
  })
  .refine(
    d => !d.timeFrom || !d.timeTo || d.timeTo > d.timeFrom,
    { message: 'เวลาสิ้นสุดต้องหลังเวลาเริ่มต้น', path: ['timeTo'] }
  )

type FormValues = z.infer<typeof schema>

function toISODate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function calcDisplay(from?: Date, to?: Date, timeFrom?: string, timeTo?: string) {
  if (!from || !to) return null
  if (timeFrom && timeTo) {
    const [fh, fm] = timeFrom.split(':').map(Number)
    const [th, tm] = timeTo.split(':').map(Number)
    const hours = (th * 60 + tm - fh * 60 - fm) / 60
    return hours > 0 ? `${hours} ชั่วโมง` : null
  }
  const days = Math.round((to.getTime() - from.getTime()) / 86400000) + 1
  return `${days} วัน`
}

const DURATION_OPTIONS = [
  { label: '30 นาที', minutes: 30 },
  { label: '1 ชม.',   minutes: 60 },
  { label: '1.5 ชม.', minutes: 90 },
  { label: '2 ชม.',   minutes: 120 },
  { label: '3 ชม.',   minutes: 180 },
  { label: '4 ชม.',   minutes: 240 },
  { label: 'ครึ่งวัน', minutes: 240 },
  { label: 'เต็มวัน',  minutes: 480 },
]

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + mins
  const nh = Math.floor(total / 60) % 24
  const nm = total % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

const LEAVE_COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#06b6d4']

export default function NewLeavePage() {
  const router = useRouter()
  const { data: leaveTypes, isLoading: typesLoading } = useLeaveTypes()
  const { data: balances } = useLeaveBalance()
  const { mutateAsync: createLeave } = useCreateLeave()
  const { data: attendanceToday } = useAttendanceToday()

  const shiftStart = attendanceToday?.shiftStart?.slice(0, 5) // "HH:mm"
  const shiftEnd   = attendanceToday?.shiftEnd?.slice(0, 5)

  const [range, setRange] = useState<{ from?: Date; to?: Date }>({})
  const [apiError, setApiError] = useState<string | null>(null)

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

  async function onSubmit(values: FormValues) {
    setApiError(null)
    try {
      const result = await createLeave({
        leaveTypeId: values.leaveTypeId,
        dateFrom: toISODate(values.dateFrom),
        dateTo: toISODate(values.dateTo),
        halfDay: 'Full',
        timeFrom: values.timeFrom,
        timeTo: values.timeTo,
        reason: values.reason,
      })
      router.replace(`/leaves/${result.id}`)
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (code === 'OVERLAPPING_LEAVE') setApiError('มีวันลาที่ทับซ้อนกับช่วงเวลาที่เลือกอยู่แล้ว')
      else if (code === 'INSUFFICIENT_BALANCE') setApiError('วันลาคงเหลือไม่เพียงพอ')
      else setApiError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
    }
  }

  return (
    <div className="min-h-screen bg-[#f0f6ff]">

      {/* Hero — compact */}
      <div className="relative bg-linear-to-br from-[#0ea5e9] to-[#0284c7] px-4 pb-5 pt-4">
        <div className="flex items-center gap-3">
          <Link href="/leaves" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white">ขอลางาน</h1>
            <p className="text-xs text-white/70">เลือกประเภทและช่วงวันที่ลา</p>
          </div>
          {displayDuration && (
            <div className="ml-auto rounded-xl bg-white/20 px-3 py-1.5 text-right">
              <p className="text-[10px] text-white/70">จำนวน</p>
              <p className="text-sm font-bold text-white">{displayDuration}</p>
            </div>
          )}
        </div>

        {dateFrom && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-white/70" />
            <span className="text-sm font-medium text-white">
              {dateFrom.toLocaleDateString('th-TH', { dateStyle: 'medium' })}
              {dateTo && dateTo.getTime() !== dateFrom.getTime() &&
                ` – ${dateTo.toLocaleDateString('th-TH', { dateStyle: 'medium' })}`}
              {timeFrom && timeTo && ` · ${timeFrom}–${timeTo} น.`}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 px-4 pb-44 pt-3">

        {/* ประเภทการลา */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
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
            <div className="flex gap-2">
              {[1, 2, 3].map(i => <div key={i} className="h-9 w-24 animate-pulse rounded-full bg-muted" />)}
            </div>
          ) : availableTypes?.length === 0 ? (
            <p className="text-sm text-muted-foreground">ไม่มีประเภทการลาที่มีโควต้าเหลือ</p>
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
                    {lt.nameTh}
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
            <span className="text-sm font-semibold">เลือกวันที่ลา</span>
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
              button_previous: 'h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground',
              button_next:     'h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground',
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
              <span className="text-sm font-semibold">ระบุเวลา</span>
              {shiftStart && shiftEnd ? (
                <span className="ml-auto rounded-full bg-sky-50 px-2.5 py-0.5 text-xs text-sky-600">
                  กะ {shiftStart}–{shiftEnd}
                </span>
              ) : (
                <span className="ml-auto text-xs text-muted-foreground">ไม่บังคับ</span>
              )}
            </div>

            {/* เวลาเริ่ม / สิ้นสุด — list row style */}
            <div className="divide-y rounded-xl border bg-muted overflow-hidden">
              <label className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">เวลาเริ่มต้น</span>
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
                <span className="text-sm text-muted-foreground">เวลาสิ้นสุด</span>
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
                <p className="mb-2 mt-3 text-xs font-medium text-muted-foreground">เลือกระยะเวลาด่วน</p>
                <div className="flex flex-wrap gap-2">
                  {DURATION_OPTIONS.map(({ label, minutes }) => {
                    const endTime = addMinutes(timeFrom, minutes)
                    const selected = timeTo === endTime
                    return (
                      <button
                        key={`${label}-${minutes}`}
                        type="button"
                        onClick={() => setValue('timeTo', endTime)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                          selected
                            ? 'border-primary bg-primary text-white'
                            : 'border-border bg-muted text-foreground'
                        }`}
                      >
                        {label}
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
                <span className="text-sm font-semibold text-primary">{timeFrom} – {timeTo} น.</span>
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
                ล้างเวลา
              </button>
            )}
          </div>
        )}

        {/* เหตุผล */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
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
            className="w-full resize-none rounded-xl border bg-muted px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="mt-1 flex justify-end">
            <span className={`text-xs ${reason.length > 450 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {reason.length}/500
            </span>
          </div>
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
            <span className="font-medium text-foreground">{selectedType.nameTh}</span>
            <span>
              {dateFrom.toLocaleDateString('th-TH', { dateStyle: 'short' })}
              {dateTo && dateTo.getTime() !== dateFrom.getTime()
                ? ` – ${dateTo.toLocaleDateString('th-TH', { dateStyle: 'short' })}`
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
              กำลังส่งคำขอ...
            </span>
          ) : (
            'ยืนยันการขอลา'
          )}
        </button>
      </div>
    </div>
  )
}
