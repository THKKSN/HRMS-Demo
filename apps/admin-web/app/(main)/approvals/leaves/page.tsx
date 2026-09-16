'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import {
  CheckCircle2, XCircle, ClipboardList, ChevronLeft,
  CalendarDays, Clock, User, FileText, MessageSquare,
} from 'lucide-react'
import { LeaveStatusBadge } from '@/components/shared/leave-status-badge'
import {
  usePendingApprovals,
  useLeaveById,
  useApproveLeave,
  useRejectLeave,
  useCancellationPending,
  useApproveCancelLeave,
  useRejectCancelLeave,
} from '@/hooks/use-leaves'
import { useAuthStore } from '@/stores/auth.store'
import { usePermissionGate } from '@/hooks/use-permission-gate'
import type { PendingLeaveItemDto } from '@hrms/shared-types'
import { localizedName, type Locale } from '@hrms/i18n'
import * as fmt from '@hrms/i18n/format'

// ── helpers ────────────────────────────────────────────────────────────────────

type LeaveTexts = ReturnType<typeof useTranslations<'admin.approval.leave'>>

function formatDateShort(dateStr: string) {
  return fmt.formatDate(new Date(dateStr), {
    day: 'numeric', month: 'short', year: '2-digit', timeZone: 'Asia/Bangkok',
  })
}
function formatDateLong(dateStr: string) {
  return fmt.formatDate(new Date(dateStr), {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok',
  })
}
/** เวลาที่ผ่านมาแบบหยาบ ๆ — เกิน 7 วันแสดงวันที่จริงแทน */
function timeAgo(dateStr: string, t: LeaveTexts) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (h < 1) return t('justNow')
  if (h < 24) return t('hoursAgo', { count: h })
  if (d < 7) return t('daysAgo', { count: d })
  return formatDateShort(dateStr)
}

// ── Leave List Card ────────────────────────────────────────────────────────────

function LeaveCard({
  item, selected, onClick,
}: { item: PendingLeaveItemDto; selected: boolean; onClick: () => void }) {
  const t = useTranslations('admin.approval.leave')
  const tCommon = useTranslations('common')
  const locale = useLocale() as Locale
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-4 transition-colors ${
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-background hover:bg-whited/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-whited">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="truncate text-sm font-semibold text-foreground">{item.employeeName}</p>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {localizedName(
              { name: item.leaveTypeName, nameEn: item.leaveTypeNameEn, nameId: item.leaveTypeNameId },
              locale,
            )}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDateShort(item.dateFrom)}
            {item.dateFrom !== item.dateTo && ` – ${formatDateShort(item.dateTo)}`}
            {' · '}{tCommon('duration.days', { count: item.totalDays })}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <LeaveStatusBadge status={item.status} />
          <span className="text-[10px] text-muted-foreground">{timeAgo(item.createdAt, t)}</span>
        </div>
      </div>
    </button>
  )
}

// ── Detail Panel: Pending Approval ────────────────────────────────────────────

function DetailPanel({
  selectedId,
  onBack,
  onRefresh,
  onDone,
}: { selectedId: string | null; onBack: () => void; onRefresh: () => void; onDone: () => void }) {
  const t = useTranslations('admin.approval.leave')
  const tHalfDay = useTranslations('status.leaveHalfDay')
  const tCommon = useTranslations('common')
  const locale = useLocale() as Locale
  const { data: leave, isLoading } = useLeaveById(selectedId ?? '')
  const { mutateAsync: approveLeave, isPending: isApproving } = useApproveLeave()
  const { mutateAsync: rejectLeave,  isPending: isRejecting  } = useRejectLeave()

  const [comment,           setComment]           = useState('')
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)
  const [error,             setError]             = useState<string | null>(null)
  const [success,           setSuccess]           = useState<'approved' | 'rejected' | null>(null)

  useEffect(() => {
    setComment('')
    setShowRejectConfirm(false)
    setError(null)
    setSuccess(null)
  }, [selectedId])

  if (!selectedId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <ClipboardList className="h-12 w-12 text-muted-foreground/40" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">{t('selectItem')}</p>
        <p className="mt-1 text-xs text-muted-foreground/60">{t('selectItemApprove')}</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-5 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-whited" />
        ))}
      </div>
    )
  }

  if (!leave) return null

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        {success === 'approved' ? (
          <>
            <CheckCircle2 className="h-14 w-14 text-green-500" />
            <p className="mt-4 text-base font-bold text-foreground">{t('approvedTitle')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('approvedBody', { name: leave.employeeName })}</p>
          </>
        ) : (
          <>
            <XCircle className="h-14 w-14 text-destructive" />
            <p className="mt-4 text-base font-bold text-foreground">{t('rejectedTitle')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('rejectedBody', { name: leave.employeeName })}</p>
          </>
        )}
        <button
          onClick={onDone}
          className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          {t('next')}
        </button>
      </div>
    )
  }

  async function handleApprove() {
    setError(null)
    try {
      await approveLeave({ id: leave!.id, comment: comment.trim() || undefined })
      setSuccess('approved')
      onRefresh()
    } catch { setError(t('approveFailed')) }
  }

  async function handleReject() {
    setError(null)
    try {
      await rejectLeave({ id: leave!.id, comment: comment.trim() || undefined })
      setSuccess('rejected')
      onRefresh()
    } catch { setError(t('rejectFailed')) }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3 lg:hidden">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-primary">
          <ChevronLeft className="h-4 w-4" /> {t('back')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">{t('requestLabel')}</p>
            <h2 className="mt-1 text-lg font-bold text-foreground">{leave.employeeName}</h2>
          </div>
          <LeaveStatusBadge status={leave.status} />
        </div>

        <div className="rounded-xl border border-border divide-y divide-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex flex-1 justify-between gap-2">
              <span className="text-sm text-muted-foreground">{t('leaveType')}</span>
              <span className="text-sm font-semibold">
                {localizedName(
                  { name: leave.leaveTypeName, nameEn: leave.leaveTypeNameEn, nameId: leave.leaveTypeNameId },
                  locale,
                )}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex flex-1 justify-between gap-2 min-w-0">
              <span className="text-sm text-muted-foreground shrink-0">{t('date')}</span>
              <span className="text-sm font-semibold text-right">
                {formatDateLong(leave.dateFrom)}
                {leave.dateFrom !== leave.dateTo && ` – ${formatDateLong(leave.dateTo)}`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex flex-1 justify-between gap-2">
              <span className="text-sm text-muted-foreground">{t('amount')}</span>
              <span className="text-sm font-semibold">
                {t('amountWithHalfDay', {
                  halfDay: tHalfDay(leave.halfDay),
                  days: tCommon('duration.days', { count: leave.totalDays }),
                })}
              </span>
            </div>
          </div>
          {leave.timeFrom && leave.timeTo && (
            <div className="flex items-center gap-3 px-4 py-3">
              <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex flex-1 justify-between gap-2">
                <span className="text-sm text-muted-foreground">{t('time')}</span>
                <span className="text-sm font-semibold">
                  {tCommon('time.range', { from: leave.timeFrom, to: leave.timeTo })}
                </span>
              </div>
            </div>
          )}
        </div>

        {leave.reason && (
          <div className="rounded-xl border border-border bg-whited/40 px-4 py-3">
            <p className="text-xs text-muted-foreground mb-1">{t('reason')}</p>
            <p className="text-sm text-foreground">{leave.reason}</p>
          </div>
        )}

        {leave.supervisorComment && (
          <div className="rounded-xl border border-border bg-whited/40 px-4 py-3">
            <p className="text-xs text-muted-foreground mb-1">{t('supervisorComment')}</p>
            <p className="text-sm text-foreground">{leave.supervisorComment}</p>
          </div>
        )}

        {(leave.status === 'PendingSupervisor' || leave.status === 'PendingHr') && (
          <div className="space-y-3 pt-1">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">{t('comment')}</span>
                <span className="text-xs text-muted-foreground">{t('optional')}</span>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder={t('commentPlaceholder')}
                className="w-full resize-none rounded-xl border border-border bg-whited px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            {showRejectConfirm ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 space-y-3">
                <p className="text-sm font-semibold text-destructive">{t('confirmReject')}</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowRejectConfirm(false)}
                    className="rounded-xl border border-border py-2 text-sm font-medium"
                  >
                    {tCommon('action.cancel')}
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={isRejecting}
                    className="rounded-xl bg-destructive py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {isRejecting ? t('processing') : t('confirmRejectButton')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowRejectConfirm(true)}
                  disabled={isApproving}
                  className="rounded-xl border border-destructive py-3 text-sm font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-60 transition-colors"
                >
                  {t('reject')}
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isApproving || isRejecting}
                  className="rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
                >
                  {isApproving ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      {t('approving')}
                    </span>
                  ) : t('approve')}
                </button>
              </div>
            )}
          </div>
        )}

        {leave.status !== 'PendingSupervisor' && leave.status !== 'PendingHr' && (
          <div className="rounded-xl bg-whited px-4 py-3 text-sm text-muted-foreground text-center">
            {t('alreadyHandled')}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Detail Panel: Cancellation Request ────────────────────────────────────────

function CancellationDetailPanel({
  selectedId,
  onBack,
  onRefresh,
  onDone,
}: { selectedId: string | null; onBack: () => void; onRefresh: () => void; onDone: () => void }) {
  const t = useTranslations('admin.approval.leave')
  const tCommon = useTranslations('common')
  const locale = useLocale() as Locale
  const { data: leave, isLoading } = useLeaveById(selectedId ?? '')
  const { mutateAsync: approveCancel, isPending: isApproving } = useApproveCancelLeave()
  const { mutateAsync: rejectCancel,  isPending: isRejecting  } = useRejectCancelLeave()

  const [comment,           setComment]           = useState('')
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)
  const [error,             setError]             = useState<string | null>(null)
  const [success,           setSuccess]           = useState<'approved' | 'rejected' | null>(null)

  useEffect(() => {
    setComment('')
    setShowRejectConfirm(false)
    setError(null)
    setSuccess(null)
  }, [selectedId])

  if (!selectedId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <ClipboardList className="h-12 w-12 text-muted-foreground/40" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">{t('selectItem')}</p>
        <p className="mt-1 text-xs text-muted-foreground/60">{t('selectItemAct')}</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-5 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-whited" />
        ))}
      </div>
    )
  }

  if (!leave) return null

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        {success === 'approved' ? (
          <>
            <CheckCircle2 className="h-14 w-14 text-green-500" />
            <p className="mt-4 text-base font-bold text-foreground">{t('cancelApprovedTitle')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('cancelApprovedBody', { name: leave.employeeName })}</p>
          </>
        ) : (
          <>
            <XCircle className="h-14 w-14 text-destructive" />
            <p className="mt-4 text-base font-bold text-foreground">{t('cancelRejectedTitle')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('cancelRejectedBody', { name: leave.employeeName })}</p>
          </>
        )}
        <button
          onClick={onDone}
          className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          {t('next')}
        </button>
      </div>
    )
  }

  async function handleApprove() {
    setError(null)
    try {
      await approveCancel({ id: leave!.id, comment: comment.trim() || undefined })
      setSuccess('approved')
      onRefresh()
    } catch { setError(tCommon('state.error')) }
  }

  async function handleReject() {
    setError(null)
    try {
      await rejectCancel({ id: leave!.id, comment: comment.trim() || undefined })
      setSuccess('rejected')
      onRefresh()
    } catch { setError(tCommon('state.error')) }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3 lg:hidden">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-primary">
          <ChevronLeft className="h-4 w-4" /> {t('back')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">{t('cancellationLabel')}</p>
            <h2 className="mt-1 text-lg font-bold text-foreground">{leave.employeeName}</h2>
          </div>
          <LeaveStatusBadge status={leave.status} />
        </div>

        <div className="rounded-xl border border-border divide-y divide-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex flex-1 justify-between gap-2">
              <span className="text-sm text-muted-foreground">{t('leaveType')}</span>
              <span className="text-sm font-semibold">
                {localizedName(
                  { name: leave.leaveTypeName, nameEn: leave.leaveTypeNameEn, nameId: leave.leaveTypeNameId },
                  locale,
                )}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex flex-1 justify-between gap-2 min-w-0">
              <span className="text-sm text-muted-foreground shrink-0">{t('leaveDate')}</span>
              <span className="text-sm font-semibold text-right">
                {formatDateLong(leave.dateFrom)}
                {leave.dateFrom !== leave.dateTo && ` – ${formatDateLong(leave.dateTo)}`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex flex-1 justify-between gap-2">
              <span className="text-sm text-muted-foreground">{t('amount')}</span>
              <span className="text-sm font-semibold">
                {tCommon('duration.days', { count: leave.totalDays })}
              </span>
            </div>
          </div>
        </div>

        {leave.reason && (
          <div className="rounded-xl border border-border bg-whited/40 px-4 py-3">
            <p className="text-xs text-muted-foreground mb-1">{t('originalReason')}</p>
            <p className="text-sm text-foreground">{leave.reason}</p>
          </div>
        )}

        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
          <p className="text-xs font-medium text-orange-700 mb-1">{t('restoreNoticeTitle')}</p>
          <p className="text-sm text-orange-800">{t('restoreNoticeBody', { days: leave.totalDays })}</p>
        </div>

        {leave.status === 'CancellationRequested' && (
          <div className="space-y-3 pt-1">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">{t('comment')}</span>
                <span className="text-xs text-muted-foreground">{t('optional')}</span>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder={t('commentPlaceholder')}
                className="w-full resize-none rounded-xl border border-border bg-whited px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            {showRejectConfirm ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 space-y-3">
                <p className="text-sm font-semibold text-destructive">{t('confirmRejectCancellation')}</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowRejectConfirm(false)}
                    className="rounded-xl border border-border py-2 text-sm font-medium"
                  >
                    {tCommon('action.cancel')}
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={isRejecting}
                    className="rounded-xl bg-destructive py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {isRejecting ? t('processing') : tCommon('action.confirm')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowRejectConfirm(true)}
                  disabled={isApproving}
                  className="rounded-xl border border-destructive py-3 text-sm font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-60 transition-colors"
                >
                  {t('rejectCancellation')}
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isApproving || isRejecting}
                  className="rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
                >
                  {isApproving ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      {t('processing')}
                    </span>
                  ) : t('approveCancellation')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

type TabId = 'pending' | 'cancellation'

export default function ApprovalsLeavesPage() {
  const t = useTranslations('admin.approval.leave')
  const router   = useRouter()
  const employee = useAuthStore((s) => s.employee)
  const { has, hasAny } = usePermissionGate()
  // เข้าหน้าได้ถ้าอนุมัติ stage ใด stage หนึ่งได้ · tab ยกเลิกการลาเป็นของ stage HR
  const canApprove = hasAny(['leave:approve-supervisor', 'leave:approve-hr'], ['Supervisor', 'Hr', 'Admin'])
  const isHr = has('leave:approve-hr', ['Hr', 'Admin'])

  const { data: pendingData,      isLoading: pendingLoading,      refetch: refetchPending }      = usePendingApprovals()
  const { data: cancellationData, isLoading: cancellationLoading, refetch: refetchCancellation } = useCancellationPending()

  const [tab,        setTab]        = useState<TabId>('pending')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => {
    if (employee && !canApprove) {
      router.replace('/dashboard')
    }
  }, [employee, canApprove, router])

  if (!employee || !canApprove) return null

  const activeItems    = tab === 'pending' ? pendingData?.items      ?? [] : cancellationData?.items      ?? []
  const activeTotal    = tab === 'pending' ? pendingData?.totalCount ?? 0  : cancellationData?.totalCount ?? 0
  const activeLoading  = tab === 'pending' ? pendingLoading : cancellationLoading
  const cancellationCount = cancellationData?.totalCount ?? 0

  function handleSelect(id: string) {
    setSelectedId(id)
    setShowDetail(true)
  }

  function handleRefresh() {
    tab === 'pending' ? refetchPending() : refetchCancellation()
  }

  function handleDone() {
    setSelectedId(null)
    setShowDetail(false)
  }

  function handleTabChange(t: TabId) {
    setTab(t)
    setSelectedId(null)
    setShowDetail(false)
  }

  return (
    <div className="min-h-full bg-whited/40 p-4 lg:p-6">
      <div className="mx-auto max-w-6xl space-y-4">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">{t('title')}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {activeLoading ? '...' : t('pendingCount', { count: activeTotal })}
            </p>
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────── */}
        {isHr && (
          <div className="flex gap-1 rounded-xl border border-border bg-background p-1 w-fit">
            <button
              onClick={() => handleTabChange('pending')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === 'pending'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('tabPending')}
              {(pendingData?.totalCount ?? 0) > 0 && (
                <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
                  {pendingData?.totalCount}
                </span>
              )}
            </button>
            <button
              onClick={() => handleTabChange('cancellation')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === 'cancellation'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('tabCancellation')}
              {cancellationCount > 0 && (
                <span className="ml-2 rounded-full bg-orange-100 px-1.5 py-0.5 text-xs font-semibold text-orange-700">
                  {cancellationCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* ── Layout: List | Detail ────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-4 lg:items-start">

          {/* ── List panel ──────────────── */}
          <div className={`w-full lg:flex-55 min-w-0 ${showDetail ? 'hidden lg:block' : ''}`}>
            <div className="rounded-2xl border border-border bg-background shadow-sm overflow-hidden">
              <div className="border-b border-border px-5 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {tab === 'pending' ? t('listPending') : t('listCancellation')}
                </p>
              </div>

              {activeLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-20 animate-pulse rounded-xl bg-whited" />
                  ))}
                </div>
              ) : !activeItems.length ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                  <p className="mt-4 font-medium text-foreground">{t('emptyTitle')}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t('emptyHint')}</p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {activeItems.map((item) => (
                    <LeaveCard
                      key={item.id}
                      item={item}
                      selected={selectedId === item.id}
                      onClick={() => handleSelect(item.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Detail panel ──────────────── */}
          <div className={`w-full lg:flex-45 min-w-0 lg:sticky lg:top-4 ${!showDetail && !selectedId ? 'hidden lg:block' : ''} ${!showDetail ? 'hidden lg:block' : ''}`}>
            <div className="rounded-2xl border border-border bg-background shadow-sm min-h-80">
              {tab === 'pending' ? (
                <DetailPanel
                  selectedId={selectedId}
                  onBack={() => setShowDetail(false)}
                  onRefresh={handleRefresh}
                  onDone={handleDone}
                />
              ) : (
                <CancellationDetailPanel
                  selectedId={selectedId}
                  onBack={() => setShowDetail(false)}
                  onRefresh={handleRefresh}
                  onDone={handleDone}
                />
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
