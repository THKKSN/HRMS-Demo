'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { TicketDetailDto } from '@hrms/shared-types'
import { useFmt } from '@/hooks/use-fmt'
import {
  useApproveTicketCancellation,
  useRejectTicketCancellation,
  useRequestTicketCancellation,
} from '@/hooks/use-tickets'
import { useApiError } from '@/hooks/use-api-error'
import { BottomSheet, useRunWithToast } from './ticket-detail-shared'

export type CancellationDecision = 'approve' | 'reject'

/**
 * แถบแจ้งสถานะคำขอยกเลิกที่อยู่ใต้หัวเรื่อง — เห็นไม่เหมือนกันตามบทบาท
 * ผู้แจ้งเห็นสถานะคำขอของตัวเอง / ฝั่งผู้รับเรื่องเห็นปุ่มพิจารณา
 */
export function CancellationNotices({
  ticket,
  onReview,
  onRequestCancellation,
}: {
  ticket: TicketDetailDto
  onReview: (decision: CancellationDecision) => void
  onRequestCancellation: () => void
}) {
  const t = useTranslations('liff.ticket.detail.cancellation')
  const fmt = useFmt()
  const canReviewCancellation = ticket.actions.isReceiverSide
    && ticket.latestCancellationRequest?.status === 'Pending'
  const dateTime = (value?: string) => (value ? fmt.formatDateTime(new Date(value)) : '-')

  return (
    <>
      {ticket.actions.isRequester && ticket.latestCancellationRequest?.status === 'Pending' && (
        <div className="flex gap-3 border-b border-amber-200 bg-amber-50 px-4 py-4 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">{t('pendingTitle')}</p>
            <p className="mt-1 text-xs leading-5">{ticket.latestCancellationRequest.reason}</p>
            <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
              {t('sentAt', { time: dateTime(ticket.latestCancellationRequest.requestedAt) })}
            </p>
          </div>
        </div>
      )}

      {canReviewCancellation && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-4 text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t('reviewTitle')}</p>
              <p className="mt-1 whitespace-pre-wrap text-xs leading-5">
                {ticket.latestCancellationRequest?.reason}
              </p>
              <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                {t('sentAt', { time: dateTime(ticket.latestCancellationRequest?.requestedAt) })}
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onReview('reject')}
              className="h-10 rounded-md border border-amber-300 bg-background text-sm font-semibold text-amber-900 dark:border-amber-500/40 dark:text-amber-100"
            >
              {t('reject')}
            </button>
            <button
              type="button"
              onClick={() => onReview('approve')}
              className="h-10 rounded-md bg-primary text-sm font-semibold text-primary-foreground"
            >
              {t('approve')}
            </button>
          </div>
        </div>
      )}

      {ticket.actions.isRequester && ticket.latestCancellationRequest?.status === 'Rejected' && (
        <div className="flex gap-3 border-b border-red-200 bg-red-50 px-4 py-4 text-red-900 dark:border-red-500/40 dark:bg-red-950/60 dark:text-red-100">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">{t('rejectedTitle')}</p>
            <p className="mt-1 text-xs leading-5">
              {ticket.latestCancellationRequest.reviewNote ?? t('noReason')}
            </p>
          </div>
        </div>
      )}

      {ticket.actions.isRequester && ticket.status === 'Cancelled' && (
        <div className="flex gap-3 border-b border-zinc-200 bg-zinc-100 px-4 py-4 text-zinc-800 dark:border-zinc-500/40 dark:bg-zinc-900/70 dark:text-zinc-200">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">{t('cancelledTitle')}</p>
            <p className="mt-1 text-xs leading-5">{ticket.cancellationReason ?? '-'}</p>
            <p className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400">
              {t('approvedBy', { name: ticket.cancelledByEmployeeName ?? t('assigneeFallback'), time: dateTime(ticket.cancelledAt) })}
            </p>
          </div>
        </div>
      )}

      {ticket.actions.canRequestCancellation && (
        <div className="border-b border-border bg-background px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{t('askTitle')}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t('askBody')}</p>
            </div>
            <button
              type="button"
              onClick={onRequestCancellation}
              className="h-9 shrink-0 rounded-md border border-destructive px-3 text-xs font-semibold text-destructive"
            >
              {t('request')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ฟอร์มผู้แจ้งส่งคำขอยกเลิก — เหตุผลต้องยาวอย่างน้อย 10 ตัวอักษรตามที่ backend บังคับ
export function CancellationRequestSheet({
  ticket,
  onClose,
}: {
  ticket: TicketDetailDto
  onClose: () => void
}) {
  const t = useTranslations('liff.ticket.detail.cancellation')
  const tCommon = useTranslations('common')
  const runWithToast = useRunWithToast()
  const requestCancellation = useRequestTicketCancellation(ticket.id)
  const [reason, setReason] = useState('')

  async function submit() {
    if (reason.trim().length < 10) {
      return toast.error(t('reasonMin'))
    }
    await runWithToast(async () => {
      await requestCancellation.mutateAsync({
        reason: reason.trim(),
        expectedUpdatedAt: ticket.updatedAt,
      })
      onClose()
    }, t('requested'), tCommon('state.error'))
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/40" onClick={onClose}>
      <div className="mx-auto w-full max-w-107.5 rounded-t-lg bg-background p-4" onClick={event => event.stopPropagation()}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <h2 className="text-base font-semibold">{t('sheetTitle')}</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('sheetBody')}</p>
          </div>
        </div>
        <label className="mt-4 block text-sm font-medium">
          {t('reason')}
          <textarea
            autoFocus
            rows={5}
            maxLength={1000}
            value={reason}
            onChange={event => setReason(event.target.value)}
            placeholder={t('reasonPlaceholder')}
            className="mt-2 w-full resize-none rounded-md border border-border p-3 text-sm outline-none focus:border-primary"
          />
        </label>
        <p className="mt-1 text-right text-[11px] text-muted-foreground">
          {reason.length}/1000
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={requestCancellation.isPending}
            onClick={onClose}
            className="h-10 rounded-md border border-border text-sm font-semibold"
          >
            {t('back')}
          </button>
          <button
            type="button"
            disabled={requestCancellation.isPending || reason.trim().length < 10}
            onClick={submit}
            className="flex h-10 items-center justify-center gap-2 rounded-md bg-destructive text-sm font-semibold text-white disabled:opacity-50"
          >
            {requestCancellation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('confirmRequest')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ฝั่งผู้รับเรื่องพิจารณาคำขอยกเลิก — ไม่อนุมัติต้องระบุเหตุผล
export function CancellationReviewSheet({
  ticket,
  decision,
  onClose,
}: {
  ticket: TicketDetailDto
  decision: CancellationDecision
  onClose: () => void
}) {
  const t = useTranslations('liff.ticket.detail.cancellation')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const approve = useApproveTicketCancellation(ticket.id)
  const reject = useRejectTicketCancellation(ticket.id)
  const [note, setNote] = useState('')
  const isApprove = decision === 'approve'
  const pending = approve.isPending || reject.isPending

  async function submit() {
    if (!isApprove && !note.trim()) return toast.error(t('rejectReasonRequired'))
    try {
      if (isApprove) {
        await approve.mutateAsync({
          reviewNote: note.trim() || undefined,
          expectedUpdatedAt: ticket.updatedAt,
        })
        toast.success(t('approved'))
      } else {
        await reject.mutateAsync({
          reviewNote: note.trim(),
          expectedUpdatedAt: ticket.updatedAt,
        })
        toast.success(t('rejected'))
      }
      onClose()
    } catch (error) {
      toast.error(apiError(error, tCommon('state.error')))
    }
  }

  return (
    <BottomSheet title={isApprove ? t('approveTitle') : t('rejectTitle')} onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-md bg-muted p-3 text-sm">
          <p className="font-semibold">{ticket.ticketNo} · {ticket.title}</p>
          <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
            {ticket.latestCancellationRequest?.reason ?? '-'}
          </p>
        </div>
        {isApprove && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-100">
            {t('approveNotice')}
          </div>
        )}
        <textarea
          autoFocus
          rows={5}
          maxLength={1000}
          value={note}
          onChange={event => setNote(event.target.value)}
          placeholder={isApprove ? t('notePlaceholder') : t('rejectReasonPlaceholder')}
          className="w-full resize-none rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-primary"
        />
        <button
          type="button"
          disabled={pending || (!isApprove && !note.trim())}
          onClick={submit}
          className={`flex h-11 w-full items-center justify-center rounded-md text-sm font-semibold text-white disabled:opacity-50 ${
            isApprove ? 'bg-primary' : 'bg-destructive'
          }`}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : isApprove ? t('confirmApprove') : t('confirmReject')}
        </button>
      </div>
    </BottomSheet>
  )
}
