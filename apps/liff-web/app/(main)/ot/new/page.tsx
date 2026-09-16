'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslations } from 'next-intl'
import { z } from 'zod'
import { ChevronLeft, Clock, FileText, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useCreateOtRequest } from '@/hooks/use-ot-requests'
import { useAttendanceToday } from '@/hooks/use-attendance'
import { apiErrorText } from '@/lib/api-message'

// ─── helpers ─────────────────────────────────────────────────────────────────

function toISODate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const todayDate = new Date()
const todayISO  = toISODate(todayDate)

// ─── schema ───────────────────────────────────────────────────────────────────

type NewOtTranslator = ReturnType<typeof useTranslations<'liff.ot.new'>>

// ข้อความ validation มาจากไฟล์ภาษา จึงสร้าง schema ในคอมโพเนนต์ (แผน i18n งาน 1.14)
function buildSchema(t: NewOtTranslator) {
  return z
    .object({
      date:      z.string().min(1, t('validation.dateRequired')),
      startTime: z.string().min(1, t('validation.startRequired')),
      endTime:   z.string().min(1, t('validation.endRequired')),
      reason:    z.string().max(500).optional(),
    })
    .refine((d) => d.endTime > d.startTime, {
      message: t('validation.timeOrder'),
      path: ['endTime'],
    })
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>

// ─── page ─────────────────────────────────────────────────────────────────────

export default function NewOtPage() {
  const t = useTranslations('liff.ot.new')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')
  const router = useRouter()
  const { mutateAsync: createOt } = useCreateOtRequest()
  const { data: attendanceToday } = useAttendanceToday()

  const shiftEnd = attendanceToday?.shiftEnd?.slice(0, 5)

  const [apiError, setApiError] = useState<string | null>(null)

  const schema = useMemo(() => buildSchema(t), [t])
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: todayISO, startTime: shiftEnd ?? '' },
  })

  const startTime = watch('startTime')
  const endTime   = watch('endTime')

  const calcHours = (start: string, end: string) => {
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    const total = eh * 60 + em - sh * 60 - sm
    if (total <= 0) return null
    const h = Math.floor(total / 60)
    const min = total % 60
    return min === 0
      ? tCommon('duration.hoursShort', { count: h })
      : tCommon('duration.hoursMinutesShort', { hours: h, minutes: min })
  }
  const duration  = startTime && endTime ? calcHours(startTime, endTime) : null

  async function onSubmit(values: FormValues) {
    setApiError(null)
    try {
      const result = await createOt({
        date:      values.date,
        startTime: values.startTime,
        endTime:   values.endTime,
        reason:    values.reason || undefined,
      })
      router.replace(`/ot/${result.id}`)
    } catch (err: unknown) {
      // OVERLAPPING_OT แปลจาก errors.<code>
      setApiError(apiErrorText(err, tErrors, tCommon('state.error')))
    }
  }

  return (
    <div className="min-h-screen bg-[#fff8f0]">

      {/* Hero */}
      <div className="relative bg-linear-to-br from-[#f97316] to-[#ea580c] px-4 pb-5 pt-4">
        <div className="flex items-center gap-3">
          <Link
            href="/ot"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white">{t('title')}</h1>
            <p className="text-xs text-white/70">{t('subtitle')}</p>
          </div>
          {duration && (
            <div className="ml-auto rounded-xl bg-white/20 px-3 py-1.5 text-right">
              <p className="text-[10px] text-white/70">{t('amount')}</p>
              <p className="text-sm font-bold text-white">{duration}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-44 pt-4">

        {/* วันที่ */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-semibold">{t('date')}</span>
          </div>
          <input
            type="date"
            {...register('date')}
            className="w-full rounded-xl border bg-whited px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          {errors.date && (
            <p className="mt-1.5 text-xs text-destructive">{errors.date.message}</p>
          )}
        </div>

        {/* เวลา */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-semibold">{t('timeRange')}</span>
            {shiftEnd && (
              <span className="ml-auto rounded-full bg-orange-50 px-2.5 py-0.5 text-xs text-orange-600">
                {t('shiftEnds', { time: shiftEnd })}
              </span>
            )}
          </div>

          <div className="divide-y rounded-xl border bg-whited overflow-hidden">
            <label className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground">{t('start')}</span>
              <input
                type="time"
                {...register('startTime')}
                className="bg-transparent text-sm font-semibold text-orange-600 focus:outline-none"
              />
            </label>
            <label className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground">{t('end')}</span>
              <input
                type="time"
                {...register('endTime')}
                className="bg-transparent text-sm font-semibold text-orange-600 focus:outline-none"
              />
            </label>
          </div>

          {duration && (
            <div className="mt-3 flex items-center justify-between rounded-xl bg-orange-50 px-4 py-2.5">
              <span className="text-sm font-semibold text-orange-700">
                {tCommon('time.range', { from: startTime, to: endTime })}
              </span>
              <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-sm font-bold text-orange-700">
                {duration}
              </span>
            </div>
          )}

          {errors.startTime && (
            <p className="mt-1.5 text-xs text-destructive">{errors.startTime.message}</p>
          )}
          {errors.endTime && (
            <p className="mt-1.5 text-xs text-destructive">{errors.endTime.message}</p>
          )}
        </div>

        {/* เหตุผล */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-semibold">
              {t('reason')} <span className="font-normal text-muted-foreground">{tCommon('field.optional')}</span>
            </span>
          </div>
          <textarea
            {...register('reason')}
            rows={3}
            placeholder={t('reasonPlaceholder')}
            className="w-full resize-none rounded-xl border bg-whited px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {/* API Error */}
        {apiError && (
          <div className="flex items-start gap-3 rounded-2xl bg-destructive/10 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{apiError}</p>
          </div>
        )}
      </div>

      {/* Submit bar */}
      <div className="fixed bottom-16 left-0 right-0 border-t bg-white/95 px-4 py-3 backdrop-blur-sm">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleSubmit(onSubmit)}
          className="w-full rounded-2xl bg-orange-500 py-3 text-sm font-bold text-white shadow-md shadow-orange-500/30 transition-opacity disabled:opacity-60"
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
