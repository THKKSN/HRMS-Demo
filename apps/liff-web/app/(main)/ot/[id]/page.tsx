'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { PageHeader } from '@/components/layout/page-header'
import { useFmt } from '@/hooks/use-fmt'
import {
  useOtRequestById,
  useCancelOtRequest,
  useApproveOtRequest,
  useRejectOtRequest,
} from '@/hooks/use-ot-requests'
import { hasPermission } from '@/lib/auth-utils'
import { useAuthStore } from '@/stores/auth.store'
import type { OtStatus } from '@hrms/shared-types'

// ─── helpers ─────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<OtStatus, string> = {
  PendingSupervisor: 'bg-amber-100 text-amber-700',
  PendingHr:        'bg-blue-100 text-blue-700',
  Approved:         'bg-green-100 text-green-700',
  Rejected:         'bg-red-100 text-red-700',
  Cancelled:        'bg-gray-100 text-gray-500',
}

const TIMELINE_KEYS = ['submitted', 'supervisorApproved', 'hrApproved'] as const

const STATUS_ORDER: Record<OtStatus, number> = {
  PendingSupervisor: 0,
  PendingHr: 1,
  Approved: 2,
  Rejected: 2,
  Cancelled: 2,
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function OtDetailPage() {
  const t = useTranslations('liff.ot')
  const tCommon = useTranslations('common')
  const tStatus = useTranslations('status.ot')
  const tRate = useTranslations('status.otRate')
  const fmt = useFmt()
  const { id } = useParams<{ id: string }>()
  const employee = useAuthStore((s) => s.employee)

  const { data: ot, isLoading } = useOtRequestById(id)
  const { mutateAsync: cancelOt, isPending: isCancelling } = useCancelOtRequest()
  const { mutateAsync: approveOt, isPending: isApproving } = useApproveOtRequest()
  const { mutateAsync: rejectOt,  isPending: isRejecting  } = useRejectOtRequest()

  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)
  const [comment, setComment] = useState('')
  const [error,   setError]   = useState<string | null>(null)

  const formatDateLong = (dateStr: string) =>
    fmt.formatDate(new Date(dateStr + 'T00:00:00'), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const formatDateTime = (iso?: string) =>
    iso ? fmt.formatDateTime(new Date(iso), { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Bangkok' }) : undefined

  async function handleCancel() {
    try {
      await cancelOt(id)
      setShowCancelConfirm(false)
    } catch {
      setError(t('detail.errors.cancelFailed'))
    }
  }

  async function handleApprove() {
    try {
      setError(null)
      await approveOt({ id, comment: comment.trim() || undefined })
      setComment('')
    } catch {
      setError(t('detail.errors.approveFailed'))
    }
  }

  async function handleReject() {
    try {
      setError(null)
      await rejectOt({ id, comment: comment.trim() || undefined })
      setComment('')
      setShowRejectConfirm(false)
    } catch {
      setError(t('detail.errors.rejectFailed'))
    }
  }

  if (isLoading) {
    return (
      <>
        <PageHeader title={t('detail.title')} backHref="/ot" />
        <div className="flex flex-col gap-3 px-4 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-whited" />
          ))}
        </div>
      </>
    )
  }

  if (!ot) {
    return (
      <>
        <PageHeader title={t('detail.title')} backHref="/ot" />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-muted-foreground">{t('detail.notFound')}</p>
        </div>
      </>
    )
  }

  const canCancel =
    (ot.status === 'PendingSupervisor' || ot.status === 'PendingHr') &&
    ot.employeeId === employee?.id

  // แต่ละ stage ใช้ permission ตรงกับ endpoint อนุมัติของ stage นั้น
  const canApprove =
    (ot.status === 'PendingSupervisor' && hasPermission(employee, 'ot:approve-supervisor', ['Supervisor', 'Hr', 'Admin'])) ||
    (ot.status === 'PendingHr' && hasPermission(employee, 'ot:approve-hr', ['Hr', 'Admin']))

  const currentOrder = STATUS_ORDER[ot.status]
  const timelineActive = ot.status !== 'Rejected' && ot.status !== 'Cancelled'

  const timeRange = tCommon('time.range', { from: ot.startTime.slice(0, 5), to: ot.endTime.slice(0, 5) })
  const hoursLabel = tCommon('duration.hoursShort', { count: ot.totalHours })
  const rateLabel = tRate(ot.rateType)

  const rows: { label: string; value: string }[] = [
    { label: t('detail.requester'), value: ot.employeeName },
    { label: t('detail.date'),      value: formatDateLong(ot.date) },
    { label: t('detail.timeRange'), value: t('detail.timeRangeWithHours', { range: timeRange, hours: hoursLabel }) },
    { label: t('detail.type'),      value: rateLabel },
    ...(ot.reason ? [{ label: t('detail.reason'), value: ot.reason }] : []),
    ...(ot.supervisorName ? [{ label: t('detail.supervisor'), value: ot.supervisorName }] : []),
    ...(ot.supervisorComment ? [{ label: t('detail.supervisorComment'), value: ot.supervisorComment }] : []),
    ...(ot.supervisorApprovedAt ? [{ label: t('detail.approvedAt'), value: formatDateTime(ot.supervisorApprovedAt)! }] : []),
    ...(ot.hrName ? [{ label: t('detail.hr'), value: ot.hrName }] : []),
    ...(ot.hrComment ? [{ label: t('detail.hrComment'), value: ot.hrComment }] : []),
    ...(ot.hrAcknowledgedAt ? [{ label: t('detail.hrAcknowledgedAt'), value: formatDateTime(ot.hrAcknowledgedAt)! }] : []),
    { label: t('detail.submittedAt'), value: formatDateTime(ot.createdAt)! },
  ]

  return (
    <>
      <PageHeader title={t('detail.title')} backHref="/ot" />

      <div className="flex flex-col gap-4 px-4 pb-24 pt-4">

        {/* Header card */}
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-base font-semibold">{timeRange}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{formatDateLong(ot.date)}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLOR[ot.status]}`}>
              {tStatus(ot.status)}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700">
              {hoursLabel}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {rateLabel}
            </span>
          </div>
        </div>

        {/* Timeline */}
        {timelineActive && (
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium">{t('detail.status')}</p>
            <div className="flex items-center">
              {TIMELINE_KEYS.map((key, idx) => {
                const done = idx < currentOrder
                const current = idx === currentOrder
                return (
                  <div key={key} className="flex flex-1 flex-col items-center">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        done    ? 'bg-green-500 text-white'
                        : current ? 'bg-orange-500 text-white'
                        : 'bg-whited text-muted-foreground'
                      }`}
                    >
                      {done ? '✓' : idx + 1}
                    </div>
                    <p className="mt-1 text-center text-xs text-muted-foreground leading-tight">
                      {t(`detail.timeline.${key}`)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Detail rows */}
        <div className="rounded-xl border bg-white shadow-sm divide-y">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-2 px-4 py-3">
              <p className="text-sm text-muted-foreground shrink-0">{row.label}</p>
              <p className="text-sm font-medium text-right">{row.value}</p>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Approve / Reject (Supervisor / HR) */}
        {canApprove && (
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="mb-2 text-sm font-medium">{t('detail.actions')}</p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder={t('detail.commentPlaceholder')}
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setShowRejectConfirm(true)}
                disabled={isRejecting || isApproving}
                className="flex-1 rounded-xl border border-destructive py-2.5 text-sm font-medium text-destructive disabled:opacity-60"
              >
                {t('detail.reject')}
              </button>
              <button
                onClick={handleApprove}
                disabled={isApproving || isRejecting}
                className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {isApproving ? t('detail.approving') : t('detail.approve')}
              </button>
            </div>

            {showRejectConfirm && (
              <div className="mt-3 rounded-xl border border-destructive bg-destructive/5 p-3">
                <p className="text-sm font-medium">{t('detail.confirmRejectTitle')}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setShowRejectConfirm(false)}
                    className="flex-1 rounded-xl border py-2 text-sm font-medium"
                  >
                    {tCommon('action.cancel')}
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={isRejecting}
                    className="flex-1 rounded-xl bg-destructive py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {isRejecting ? tCommon('state.processing') : t('detail.confirmReject')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cancel (เจ้าของคำขอ) */}
        {canCancel && !canApprove && !showCancelConfirm && (
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="rounded-xl border border-destructive py-3 text-sm font-medium text-destructive"
          >
            {t('detail.cancelRequest')}
          </button>
        )}

        {showCancelConfirm && (
          <div className="rounded-xl border border-destructive bg-destructive/5 p-4">
            <p className="text-sm font-medium">{t('detail.confirmCancelTitle')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('detail.irreversible')}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 rounded-xl border py-2 text-sm font-medium"
              >
                {t('detail.keep')}
              </button>
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="flex-1 rounded-xl bg-destructive py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {isCancelling ? t('detail.cancelling') : t('detail.confirmCancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
