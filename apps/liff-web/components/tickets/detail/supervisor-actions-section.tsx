'use client'

import { useTranslations } from 'next-intl'
import { CheckCircle2, Loader2, Pencil, RotateCcw, ShieldCheck, UserRound, XCircle } from 'lucide-react'
import type { TicketDetailDto } from '@hrms/shared-types'
import { useAcceptTicket } from '@/hooks/use-tickets'
import { Section, useRunWithToast } from './ticket-detail-shared'

// ฟอร์มฝั่งผู้รับเรื่อง/หัวหน้าที่เปิดจากปุ่มในส่วนนี้
export type SupervisorSheet = 'triage' | 'assign' | 'reject' | 'return' | 'close'

// ปุ่มจัดการงานของฝั่งผู้รับเรื่อง — ไม่มีสิทธิ์ข้อไหนเลยก็ไม่ต้องแสดงทั้ง section
export function SupervisorActionsSection({
  ticket,
  onOpenSheet,
}: {
  ticket: TicketDetailDto
  onOpenSheet: (sheet: SupervisorSheet) => void
}) {
  const t = useTranslations('liff.ticket.detail.supervisor')
  const tCommon = useTranslations('common')
  const runWithToast = useRunWithToast()
  const acceptTicket = useAcceptTicket(ticket.id)
  const hasSupervisorActions = ticket.actions.canAccept
    || ticket.actions.canTriage
    || ticket.actions.canAssign
    || ticket.actions.canReject
    || ticket.actions.canReturnForRevision
    || ticket.actions.canClose

  if (!hasSupervisorActions) return null

  return (
    <Section title={t('title')}>
      <div className="space-y-3">
        <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          {/* targetCompanyName/targetDepartmentName เป็นชื่อไทยจาก API — รอปรับ DTO ฝั่งผู้บริโภค (ดูแผน Phase 1) */}
          <p className="font-medium text-foreground">{ticket.targetCompanyName} · {ticket.targetDepartmentName}</p>
          <p className="mt-1">
            {ticket.currentAssignment
              ? t('currentAssignee', { name: ticket.currentAssignment.assignedToEmployeeName })
              : ticket.status === 'Open'
                ? t('noAssignee')
                : t('assigneeUnknown')}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {ticket.actions.canAccept && (
            <button
              type="button"
              disabled={acceptTicket.isPending}
              onClick={() => runWithToast(() => acceptTicket.mutateAsync(ticket.updatedAt), t('accepted'), tCommon('state.error'))}
              className="flex h-10 items-center justify-center gap-2 rounded-md border border-primary text-sm font-semibold text-primary disabled:opacity-50"
            >
              {acceptTicket.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {t('accept')}
            </button>
          )}
          {ticket.actions.canTriage && (
            <button type="button" onClick={() => onOpenSheet('triage')} className="flex h-10 items-center justify-center gap-2 rounded-md border border-border text-sm font-semibold">
              <Pencil className="h-4 w-4" /> {t('triage')}
            </button>
          )}
          {ticket.actions.canAssign && (
            <button type="button" onClick={() => onOpenSheet('assign')} className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground">
              <UserRound className="h-4 w-4" />
              {ticket.currentAssignment ? t('reassign') : t('assign')}
            </button>
          )}
          {ticket.actions.canReject && (
            <button type="button" onClick={() => onOpenSheet('reject')} className="flex h-10 items-center justify-center gap-2 rounded-md bg-destructive text-sm font-semibold text-white">
              <XCircle className="h-4 w-4" /> {t('reject')}
            </button>
          )}
          {ticket.actions.canReturnForRevision && (
            <button type="button" onClick={() => onOpenSheet('return')} className="flex h-10 items-center justify-center gap-2 rounded-md border border-border text-sm font-semibold">
              <RotateCcw className="h-4 w-4" /> {t('return')}
            </button>
          )}
          {ticket.actions.canClose && (
            <button type="button" onClick={() => onOpenSheet('close')} className="flex h-10 items-center justify-center gap-2 rounded-md bg-green-600 text-sm font-semibold text-white">
              <ShieldCheck className="h-4 w-4" /> {t('close')}
            </button>
          )}
        </div>
      </div>
    </Section>
  )
}
