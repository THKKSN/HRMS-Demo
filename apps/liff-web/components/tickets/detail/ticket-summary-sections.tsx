'use client'

import { useTranslations } from 'next-intl'
import { CheckCircle2, Clock3, ShieldCheck, UserRound, Wrench } from 'lucide-react'
import type { TicketDetailDto } from '@hrms/shared-types'
import { useFmt } from '@/hooks/use-fmt'
import { AttachmentList } from './ticket-attachments'
import { PROBLEM_TYPES, Section } from './ticket-detail-shared'

// ส่วนอ่านอย่างเดียวของหน้า — รายละเอียดที่ผู้แจ้งกรอกไว้, การมอบหมาย และสรุปการปิดจบงาน

export function ProblemDetailSection({ ticket }: { ticket: TicketDetailDto }) {
  const t = useTranslations('liff.ticket.detail')
  const fmt = useFmt()
  const createdEvidence = ticket.attachments.filter(item => item.stage === 'Created')

  return (
    <Section title={t('problemDetail')}>
      <p className="whitespace-pre-wrap text-sm leading-6">{ticket.detail}</p>
      <div className="mt-4 space-y-2 text-xs text-muted-foreground">
        <p className="flex items-center gap-2">
          <UserRound className="h-4 w-4" />
          {t('requester', { name: ticket.requesterName })}
          {ticket.requester.nickname && ` (${ticket.requester.nickname})`}
        </p>
        <p className="flex items-center gap-2"><Clock3 className="h-4 w-4" />{t('openedAt', { time: fmt.formatDateTime(new Date(ticket.createdAt)) })}</p>
      </div>
      <div className="mt-4"><AttachmentList attachments={createdEvidence} /></div>
    </Section>
  )
}

export function AssignmentSection({ ticket }: { ticket: TicketDetailDto }) {
  const t = useTranslations('liff.ticket.detail')
  const fmt = useFmt()
  const assignment = ticket.currentAssignment
  if (!assignment) return null

  const sourceText = assignment.assignmentSource === 'Manual'
    ? t('assignedBy', { name: assignment.assignedByEmployeeName ?? t('assignedBySupervisor') })
    : assignment.assignmentSource === 'SelfClaim'
      ? t('selfClaim')
      : assignment.assignmentSource === 'AutoTopic'
        ? t('autoTopic')
        : t('autoCategory')

  return (
    <Section title={t('assignment')}>
      <p className="text-sm font-medium">{assignment.assignedToEmployeeName}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {sourceText}
        {' · '}{fmt.formatDateTime(new Date(assignment.assignedAt))}
      </p>
      {assignment.note && <p className="mt-3 rounded-md bg-muted p-3 text-sm">{assignment.note}</p>}
    </Section>
  )
}

// สรุปการปิดจบงาน — ใช้หัวข้อชุดเดียวกับ modal ปิดงาน ให้ทั้งผู้เกี่ยวข้องกับงานและผู้แจ้งเรื่องเห็นข้อมูลตรงกัน
export function CloseoutSummarySection({ ticket }: { ticket: TicketDetailDto }) {
  const t = useTranslations('liff.ticket.detail')
  const fmt = useFmt()
  const resolvedEvidence = ticket.attachments.filter(item => item.stage === 'Resolved')
  // closeoutReasonName เป็น snapshot ไทยจาก API (ไม่แปลย้อนหลังตามแผนข้อ 9) · problemType เป็น enum เดิม แปลจาก key
  const legacyProblemType = PROBLEM_TYPES.find(item => item === ticket.problemType)
  const closeoutReasonText = ticket.closeoutReasonName
    ?? (legacyProblemType ? t(`problemType.${legacyProblemType}`) : undefined)
  const showCloseoutSummary = !!closeoutReasonText
    || !!ticket.resolutionNote
    || resolvedEvidence.length > 0
    || !!ticket.resolvedAt

  if (!showCloseoutSummary) return null

  const closeoutBanner = ticket.status === 'Closed'
    ? {
      tone: 'border-green-200 bg-green-50 text-green-900 dark:border-green-500/40 dark:bg-green-950/60 dark:text-green-100',
      title: t('banner.closedTitle'),
      caption: t('banner.closedCaption'),
    }
    : ticket.status === 'AwaitingRequesterConfirmation'
      ? {
        tone: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-500/40 dark:bg-blue-950/60 dark:text-blue-100',
        title: ticket.actions.isRequester ? t('banner.awaitingYouTitle') : t('banner.awaitingRequesterTitle'),
        caption: ticket.actions.isRequester ? t('banner.awaitingYouCaption') : t('banner.awaitingRequesterCaption'),
      }
      : ticket.status === 'Resolved'
        ? {
          tone: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-100',
          title: t('banner.resolvedTitle'),
          caption: t('banner.resolvedCaption'),
        }
        : {
          tone: 'border-border bg-muted/40 text-foreground',
          title: t('banner.draftTitle'),
          caption: t('banner.draftCaption'),
        }

  return (
    <Section title={t('closeout')}>
      <div className="space-y-4">
        <div className={`rounded-md border p-3 ${closeoutBanner.tone}`}>
          <p className="text-sm font-semibold">{closeoutBanner.title}</p>
          <p className="mt-1 text-xs leading-5">{closeoutBanner.caption}</p>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{t('closeoutReason')}</p>
          {closeoutReasonText
            ? <p className="text-sm font-medium">{closeoutReasonText}</p>
            : <p className="text-sm text-muted-foreground">{t('noCloseoutReason')}</p>}
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{t('resolutionNote')}</p>
          {ticket.resolutionNote
            ? <p className="whitespace-pre-wrap text-sm leading-6">{ticket.resolutionNote}</p>
            : <p className="text-sm text-muted-foreground">{t('noResolutionNote')}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs font-medium text-muted-foreground">{t('evidence')}</p>
            {resolvedEvidence.length > 0 && (
              <span className="text-[11px] text-muted-foreground">{t('fileCount', { count: resolvedEvidence.length })}</span>
            )}
          </div>
          {resolvedEvidence.length > 0
            ? <AttachmentList attachments={resolvedEvidence} />
            : <p className="text-sm text-muted-foreground">{t('noEvidence')}</p>}
        </div>

        {(ticket.resolvedAt || ticket.verifiedAt || ticket.closedAt) && (
          <div className="space-y-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
            {ticket.resolvedAt && (
              <p className="flex items-center gap-2">
                <Wrench className="h-3.5 w-3.5 shrink-0" />
                {t('resolvedBy', { name: ticket.resolvedByEmployeeName ?? t('assigneeFallback'), time: fmt.formatDateTime(new Date(ticket.resolvedAt)) })}
              </p>
            )}
            {ticket.verifiedAt && (
              <p className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                {t('verifiedBy', { name: ticket.verifiedByEmployeeName ?? t('reviewerFallback'), time: fmt.formatDateTime(new Date(ticket.verifiedAt)) })}
              </p>
            )}
            {ticket.closedAt && (
              <p className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                {t('closedBy', { name: ticket.closedByEmployeeName ?? t('requesterFallback'), time: fmt.formatDateTime(new Date(ticket.closedAt)) })}
              </p>
            )}
          </div>
        )}
      </div>
    </Section>
  )
}
