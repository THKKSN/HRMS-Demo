'use client'

import { useTranslations } from 'next-intl'
import { CheckCircle2, Loader2, MessageSquare, Play, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import type { TicketDetailDto } from '@hrms/shared-types'
import {
  useClaimTicket,
  useConfirmTicketCompletion,
  useResumeTicket,
  useStartTicket,
  useUpdateTicketWorkDetail,
} from '@/hooks/use-tickets'
import { useApiError } from '@/hooks/use-api-error'
import { useRunWithToast } from './ticket-detail-shared'

/**
 * แถบปุ่มลอยล่างจอ — ปุ่มของผู้ดำเนินการ (รับงาน/เริ่มงาน/ขอข้อมูล/ส่งตรวจ)
 * และปุ่มตรวจรับของผู้แจ้งเรื่อง แสดงเฉพาะปุ่มที่สิทธิ์ของ ticket อนุญาต
 */
export function TicketActionBar({
  ticket,
  onRequestInfo,
  onResolve,
}: {
  ticket: TicketDetailDto
  onRequestInfo: () => void
  onResolve: () => void
}) {
  const t = useTranslations('liff.ticket.detail.actions')
  const tCommon = useTranslations('common')
  const errorFallback = tCommon('state.error')
  const apiError = useApiError()
  const runWithToast = useRunWithToast()
  const startWork = useStartTicket(ticket.id)
  const claimWork = useClaimTicket(ticket.id)
  const resumeWork = useResumeTicket(ticket.id)
  const confirmCompletion = useConfirmTicketCompletion(ticket.id)
  const saveWork = useUpdateTicketWorkDetail(ticket.id)
  const isBusy = startWork.isPending || resumeWork.isPending || saveWork.isPending
  const canConfirmCompletion = ticket.actions.isRequester
    && ticket.status === 'AwaitingRequesterConfirmation'
  const hasAnyAction = ticket.actions.canClaim
    || ticket.actions.canStart
    || ticket.actions.canResume
    || ticket.actions.canRequestInfo
    || ticket.actions.canResolve
    || canConfirmCompletion

  // เริ่มงานต้อง flush ข้อมูลก่อนเริ่มลง server ก่อน แล้วใช้ updatedAt ที่ได้กลับมายิง start
  async function startTicket() {
    try {
      const saved = await saveWork.mutateAsync({
        problemType: ticket.problemType || undefined,
        closeoutReasonId: ticket.closeoutReasonId,
        initialInspectionNote: ticket.initialInspectionNote?.trim() || undefined,
        expectedUpdatedAt: ticket.updatedAt,
      })
      await startWork.mutateAsync(saved.updatedAt)
      toast.success(t('started'))
    } catch (error) {
      toast.error(apiError(error, errorFallback))
    }
  }

  if (!hasAnyAction) return null

  return (
    <div className="fixed bottom-16 left-1/2 z-20 w-full max-w-107.5 -translate-x-1/2 border-t border-border bg-background p-3">
      <div className="flex gap-2">
        {canConfirmCompletion && (
          <button
            type="button"
            disabled={confirmCompletion.isPending}
            onClick={() => runWithToast(() => confirmCompletion.mutateAsync(ticket.updatedAt), t('confirmCompletionDone'), errorFallback)}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-green-600 text-sm font-semibold text-white disabled:opacity-50"
          >
            {confirmCompletion.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {t('confirmCompletion')}
          </button>
        )}
        {ticket.actions.canClaim && (
          <button
            type="button"
            disabled={claimWork.isPending}
            onClick={() => runWithToast(() => claimWork.mutateAsync(ticket.updatedAt), t('claimed'), errorFallback)}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {claimWork.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {t('claim')}
          </button>
        )}
        {ticket.actions.canRequestInfo && (
          <button type="button" onClick={onRequestInfo} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-border text-sm font-semibold">
            <MessageSquare className="h-4 w-4" /> {t('requestInfo')}
          </button>
        )}
        {ticket.actions.canStart && (
          <button type="button" disabled={isBusy} onClick={startTicket} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {startWork.isPending || saveWork.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Play className="h-4 w-4" />}
            {t('start')}
          </button>
        )}
        {ticket.actions.canResume && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => runWithToast(() => resumeWork.mutateAsync(ticket.updatedAt), t('resumed'), errorFallback)}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Wrench className="h-4 w-4" /> {t('resume')}
          </button>
        )}
        {ticket.actions.canResolve && (
          <button type="button" disabled={isBusy} onClick={onResolve} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-green-600 text-sm font-semibold text-white disabled:opacity-50">
            <CheckCircle2 className="h-4 w-4" />
            {t('resolve')}
          </button>
        )}
      </div>
    </div>
  )
}
