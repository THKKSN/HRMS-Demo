'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'
import { PageHeader } from '@/components/layout/page-header'
import { useCreateLeave, useLeaveTypes } from '@/hooks/use-leaves'
import type { HalfDayType } from '@hrms/shared-types'

const today = new Date()
today.setHours(0, 0, 0, 0)

const schema = z
  .object({
    leaveTypeId: z.string().min(1, 'กรุณาเลือกประเภทการลา'),
    dateFrom: z.date({ required_error: 'กรุณาเลือกวันเริ่มต้น' }).min(today, 'ไม่สามารถลาย้อนหลังได้'),
    dateTo: z.date({ required_error: 'กรุณาเลือกวันสิ้นสุด' }),
    halfDay: z.enum(['Full', 'Morning', 'Afternoon'] as const).default('Full'),
    reason: z.string().max(500).optional(),
  })
  .refine(d => d.dateTo >= d.dateFrom, {
    message: 'วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น',
    path: ['dateTo'],
  })
  .refine(
    d => d.halfDay === 'Full' || d.dateFrom.getTime() === d.dateTo.getTime(),
    { message: 'การลาครึ่งวันต้องเลือกวันเดียวกัน', path: ['halfDay'] }
  )

type FormValues = z.infer<typeof schema>

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10)
}

const HALF_DAY_OPTIONS: { value: HalfDayType; label: string }[] = [
  { value: 'Full', label: 'เต็มวัน' },
  { value: 'Morning', label: 'ครึ่งเช้า' },
  { value: 'Afternoon', label: 'ครึ่งบ่าย' },
]

export default function NewLeavePage() {
  const router = useRouter()
  const { data: leaveTypes, isLoading: typesLoading } = useLeaveTypes()
  const { mutateAsync: createLeave } = useCreateLeave()

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
    defaultValues: { halfDay: 'Full' },
  })

  const dateFrom = watch('dateFrom')
  const dateTo = watch('dateTo')
  const halfDay = watch('halfDay')
  const isSingleDay = dateFrom && dateTo && dateFrom.getTime() === dateTo.getTime()

  function handleRangeSelect(r: { from?: Date; to?: Date } | undefined) {
    const next = r ?? {}
    setRange(next)
    if (next.from) setValue('dateFrom', next.from, { shouldValidate: true })
    if (next.to) setValue('dateTo', next.to, { shouldValidate: true })
    else if (next.from) setValue('dateTo', next.from, { shouldValidate: true })
  }

  async function onSubmit(values: FormValues) {
    setApiError(null)
    try {
      const result = await createLeave({
        leaveTypeId: values.leaveTypeId,
        dateFrom: toISODate(values.dateFrom),
        dateTo: toISODate(values.dateTo),
        halfDay: values.halfDay,
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
    <>
      <PageHeader title="ขอลา" backHref="/leaves" />

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 px-4 pb-24 pt-4">
        {/* ประเภทการลา */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">ประเภทการลา</label>
          <select
            {...register('leaveTypeId')}
            className="rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={typesLoading}
          >
            <option value="">เลือกประเภทการลา</option>
            {leaveTypes?.map(lt => (
              <option key={lt.id} value={lt.id}>{lt.nameTh}</option>
            ))}
          </select>
          {errors.leaveTypeId && (
            <p className="text-xs text-destructive">{errors.leaveTypeId.message}</p>
          )}
        </div>

        {/* Date range picker */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">วันที่ลา</label>
          <div className="overflow-hidden rounded-xl border bg-background">
            <DayPicker
              mode="range"
              selected={{ from: range.from, to: range.to }}
              onSelect={handleRangeSelect}
              disabled={{ before: today }}
              className="p-2"
            />
          </div>
          {range.from && (
            <p className="text-xs text-muted-foreground">
              {range.from.toLocaleDateString('th-TH', { dateStyle: 'medium' })}
              {range.to && range.to.getTime() !== range.from.getTime() &&
                ` – ${range.to.toLocaleDateString('th-TH', { dateStyle: 'medium' })}`}
            </p>
          )}
          {(errors.dateFrom || errors.dateTo) && (
            <p className="text-xs text-destructive">
              {errors.dateFrom?.message ?? errors.dateTo?.message}
            </p>
          )}
        </div>

        {/* Half day toggle — แสดงเฉพาะเมื่อเลือกวันเดียวกัน */}
        {isSingleDay && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">ช่วงเวลา</label>
            <div className="flex gap-2">
              {HALF_DAY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setValue('halfDay', opt.value, { shouldValidate: true })}
                  className={`flex-1 rounded-xl border py-2 text-sm font-medium transition-colors ${
                    halfDay === opt.value
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-background text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {errors.halfDay && (
              <p className="text-xs text-destructive">{errors.halfDay.message}</p>
            )}
          </div>
        )}

        {/* เหตุผล */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">เหตุผล <span className="text-muted-foreground">(ถ้ามี)</span></label>
          <textarea
            {...register('reason')}
            rows={3}
            placeholder="ระบุเหตุผลการลา..."
            className="rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          {errors.reason && (
            <p className="text-xs text-destructive">{errors.reason.message}</p>
          )}
        </div>

        {/* API error */}
        {apiError && (
          <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {apiError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {isSubmitting ? 'กำลังส่งคำขอ...' : 'ยืนยันการขอลา'}
        </button>
      </form>
    </>
  )
}
