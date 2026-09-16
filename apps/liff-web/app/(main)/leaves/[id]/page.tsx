'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { localizedName, type Locale } from '@hrms/i18n'
import { PageHeader } from '@/components/layout/page-header'
import { LeaveStatusBadge } from '@/components/shared/leave-status-badge'
import { useFmt } from '@/hooks/use-fmt'
import {
  useApproveLeave, useCancelLeave, useLeaveById,
  useRejectLeave, useRequestCancelLeave,
} from '@/hooks/use-leaves'
import { apiErrorText } from '@/lib/api-message'
import { hasPermission } from '@/lib/auth-utils'
import { useAuthStore } from '@/stores/auth.store'
import type { LeaveStatus } from '@hrms/shared-types'
import { FileText, ExternalLink, Clock } from 'lucide-react'

const TIMELINE_STEPS = [
  { status: 'PendingSupervisor', key: 'submitted' },
  { status: 'PendingHr',        key: 'supervisorApproved' },
  { status: 'Approved',         key: 'hrApproved' },
] as const

const STATUS_ORDER: Record<LeaveStatus, number> = {
  Draft:                 -1,
  PendingSupervisor:      0,
  PendingHr:              1,
  Approved:               2,
  CancellationRequested:  2,
  Rejected:               2,
  Cancelled:              2,
}

export default function LeaveDetailPage() {
  const t = useTranslations('liff.leave.detail')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')
  const tHalfDay = useTranslations('status.leaveHalfDay')
  const locale = useLocale() as Locale
  const fmt = useFmt()
  const { id } = useParams<{ id: string }>()
  const employee = useAuthStore(s => s.employee)
  const { data: leave, isLoading } = useLeaveById(id)
  const { mutateAsync: cancelLeave,        isPending: isCancelling    } = useCancelLeave()
  const { mutateAsync: requestCancelLeave, isPending: isRequesting    } = useRequestCancelLeave()
  const { mutateAsync: approveLeave,       isPending: isApproving     } = useApproveLeave()
  const { mutateAsync: rejectLeave,        isPending: isRejecting     } = useRejectLeave()

  const [showCancelConfirm,  setShowCancelConfirm]  = useState(false)
  const [showRequestCancel,  setShowRequestCancel]  = useState(false)
  const [showRejectConfirm,  setShowRejectConfirm]  = useState(false)
  const [cancelReason,       setCancelReason]       = useState('')
  const [comment,            setComment]            = useState('')
  const [error,              setError]              = useState<string | null>(null)


  async function handleCancel() {
    try {
      await cancelLeave(id)
      setShowCancelConfirm(false)
    } catch {
      setError(t('errors.cancelFailed'))
    }
  }

  async function handleRequestCancel() {
    try {
      setError(null)
      await requestCancelLeave({ id, reason: cancelReason.trim() || undefined })
      setShowRequestCancel(false)
      setCancelReason('')
    } catch (err: unknown) {
      // LEAVE_ALREADY_STARTED แปลจาก errors.<code>
      setError(apiErrorText(err, tErrors, t('errors.requestCancelFailed')))
    }
  }

  async function handleApprove() {
    try {
      setError(null)
      await approveLeave({ id, comment: comment.trim() || undefined })
      setComment('')
    } catch {
      setError(t('errors.approveFailed'))
    }
  }

  async function handleReject() {
    try {
      setError(null)
      await rejectLeave({ id, comment: comment.trim() || undefined })
      setComment('')
      setShowRejectConfirm(false)
    } catch {
      setError(t('errors.rejectFailed'))
    }
  }

  if (isLoading) {
    return (
      <>
        <PageHeader title={t('title')} backHref="/leaves" />
        <div className="flex flex-col gap-3 px-4 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-whited" />
          ))}
        </div>
      </>
    )
  }

  if (!leave) {
    return (
      <>
        <PageHeader title={t('title')} backHref="/leaves" />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-muted-foreground">{t('notFound')}</p>
        </div>
      </>
    )
  }

  const currentOrder = STATUS_ORDER[leave.status]
  const isOwner   = leave.employeeId === employee?.id
  const canCancel = isOwner && (leave.status === 'PendingSupervisor' || leave.status === 'PendingHr')
  const canRequestCancel = isOwner && leave.status === 'Approved'
  // แต่ละ stage ใช้ permission ตรงกับ endpoint อนุมัติของ stage นั้น
  const canApprove =
    (leave.status === 'PendingSupervisor' && hasPermission(employee, 'leave:approve-supervisor', ['Supervisor', 'Hr', 'Admin'])) ||
    (leave.status === 'PendingHr' && hasPermission(employee, 'leave:approve-hr', ['Hr', 'Admin']))

  const terminalStatuses: LeaveStatus[] = ['Cancelled', 'Rejected', 'CancellationRequested']

  const detailRows = [
    { label: t('requester'), value: leave.employeeName },
    leave.reason            && { label: t('reason'), value: leave.reason },
    leave.supervisorName    && { label: t('supervisor'), value: leave.supervisorName },
    leave.supervisorComment && { label: t('supervisorComment'), value: leave.supervisorComment },
    leave.hrName            && { label: t('hr'), value: leave.hrName },
    leave.hrComment         && { label: t('hrComment'), value: leave.hrComment },
    { label: t('submittedAt'), value: fmt.formatDate(leave.createdAt) },
  ].filter((row): row is { label: string; value: string } => Boolean(row))

  return (
    <>
      <PageHeader title={t('title')} backHref="/leaves" />

      <div className="flex flex-col gap-4 px-4 pb-24 pt-4">
        {/* Header card */}
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-lg font-semibold">
              {localizedName(
                { name: leave.leaveTypeName, nameEn: leave.leaveTypeNameEn, nameId: leave.leaveTypeNameId },
                locale,
              )}
            </p>
            <LeaveStatusBadge status={leave.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {fmt.formatDate(leave.dateFrom)}
            {leave.dateFrom !== leave.dateTo && ` – ${fmt.formatDate(leave.dateTo)}`}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {tHalfDay(leave.halfDay)} · {tCommon('duration.days', { count: leave.totalDays })}
          </p>
        </div>

        {/* CancellationRequested banner */}
        {leave.status === 'CancellationRequested' && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-800">{t('cancellationPendingTitle')}</p>
              <p className="mt-0.5 text-xs text-amber-700">{t('cancellationPendingBody')}</p>
            </div>
          </div>
        )}

        {/* Status timeline */}
        {!terminalStatuses.includes(leave.status) && (
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium">{t('status')}</p>
            <div className="flex items-center gap-0">
              {TIMELINE_STEPS.map((step, idx) => {
                const isDone    = currentOrder > idx
                const isCurrent = currentOrder === idx
                return (
                  <div key={step.status} className="flex flex-1 flex-col items-center">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      isDone    ? 'bg-green-500 text-white'
                      : isCurrent ? 'bg-primary text-primary-foreground'
                      : 'bg-whited text-muted-foreground'
                    }`}>
                      {isDone ? '✓' : idx + 1}
                    </div>
                    <p className="mt-1 text-center text-xs text-muted-foreground leading-tight">
                      {t(`timeline.${step.key}`)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Detail rows */}
        <div className="rounded-xl border bg-white shadow-sm divide-y">
          {detailRows.map((row) => (
            <div key={row.label} className="flex justify-between gap-2 px-4 py-3">
              <p className="text-sm text-muted-foreground">{row.label}</p>
              <p className="text-sm font-medium text-right">{row.value}</p>
            </div>
          ))}
        </div>

        {/* เอกสารแนบ */}
        {leave.attachmentUrls.length > 0 && (
          <div className="rounded-xl border bg-white shadow-sm">
            <p className="border-b px-4 py-3 text-sm font-medium">{t('attachments', { count: leave.attachmentUrls.length })}</p>
            <div className="divide-y">
              {leave.attachmentUrls.map((url, idx) => {
                const name    = url.split('/').pop() ?? t('fileN', { n: idx + 1 })
                const isImage = /\.(jpg|jpeg|png)$/i.test(url)
                const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('/v1', '') ?? ''
                const fullUrl = url.startsWith('http') ? url : `${apiBase}${url}`
                return (
                  <a
                    key={idx}
                    href={fullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-whited transition-colors"
                  >
                    {isImage ? (
                      <img src={fullUrl} alt={name} className="h-10 w-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
                    <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Approve / Reject (Supervisor / HR) */}
        {canApprove && (
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="mb-2 text-sm font-medium">{t('actions')}</p>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={2}
              placeholder={t('commentPlaceholder')}
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setShowRejectConfirm(true)}
                disabled={isRejecting || isApproving}
                className="flex-1 rounded-xl border border-destructive py-2.5 text-sm font-medium text-destructive disabled:opacity-60"
              >
                {t('reject')}
              </button>
              <button
                onClick={handleApprove}
                disabled={isApproving || isRejecting}
                className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {isApproving ? t('approving') : t('approve')}
              </button>
            </div>

            {showRejectConfirm && (
              <div className="mt-3 rounded-xl border border-destructive bg-destructive/5 p-3">
                <p className="text-sm font-medium">{t('confirmRejectTitle')}</p>
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
                    {isRejecting ? tCommon('state.processing') : t('confirmReject')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ยกเลิกตรง — PendingSupervisor / PendingHr */}
        {canCancel && !canApprove && !showCancelConfirm && (
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="rounded-xl border border-destructive py-3 text-sm font-medium text-destructive"
          >
            {t('cancelRequest')}
          </button>
        )}

        {canCancel && showCancelConfirm && (
          <div className="rounded-xl border border-destructive bg-destructive/5 p-4">
            <p className="text-sm font-medium">{t('confirmCancelTitle')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('irreversible')}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 rounded-xl border py-2 text-sm font-medium"
              >
                {t('keep')}
              </button>
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="flex-1 rounded-xl bg-destructive py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {isCancelling ? t('cancelling') : t('confirmCancel')}
              </button>
            </div>
          </div>
        )}

        {/* ขอยกเลิก — Approved (ต้องผ่าน HR) */}
        {canRequestCancel && !showRequestCancel && (
          <button
            onClick={() => setShowRequestCancel(true)}
            className="rounded-xl border border-amber-400 py-3 text-sm font-medium text-amber-700"
          >
            {t('requestCancel')}
          </button>
        )}

        {canRequestCancel && showRequestCancel && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-800">{t('requestCancelTitle')}</p>
            <p className="mt-0.5 text-xs text-amber-700">{t('requestCancelBody')}</p>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              rows={2}
              placeholder={t('cancelReasonPlaceholder')}
              className="mt-3 w-full resize-none rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => { setShowRequestCancel(false); setCancelReason('') }}
                className="flex-1 rounded-xl border py-2.5 text-sm font-medium"
              >
                {tCommon('action.cancel')}
              </button>
              <button
                onClick={handleRequestCancel}
                disabled={isRequesting}
                className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {isRequesting ? tCommon('state.sending') : t('sendCancelRequest')}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
