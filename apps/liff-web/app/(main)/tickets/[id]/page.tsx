'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { PageHeader } from '@/components/layout/page-header'
import { useTicket, useTicketAssignmentCandidates } from '@/hooks/use-tickets'
import { TICKET_STATUS_CLASS } from '@/lib/ticket-status'
import { AssignSheet } from '@/components/tickets/detail/assign-sheet'
import { BoardRuntimeSection } from '@/components/tickets/detail/board-runtime-section'
import {
  CancellationNotices,
  CancellationRequestSheet,
  CancellationReviewSheet,
  type CancellationDecision,
} from '@/components/tickets/detail/cancellation-section'
import { CompletionSheet } from '@/components/tickets/detail/completion-sheet'
import { ConversationSection } from '@/components/tickets/detail/conversation-section'
import { RequestInfoSheet } from '@/components/tickets/detail/request-info-sheet'
import { RejectSheet, ReviewSheet } from '@/components/tickets/detail/review-sheets'
import { StatusStationLine } from '@/components/tickets/detail/status-station-line'
import {
  SupervisorActionsSection,
  type SupervisorSheet,
} from '@/components/tickets/detail/supervisor-actions-section'
import { TeamSection } from '@/components/tickets/detail/team-section'
import { TicketActionBar } from '@/components/tickets/detail/ticket-action-bar'
import {
  AssignmentSection,
  CloseoutSummarySection,
  ProblemDetailSection,
} from '@/components/tickets/detail/ticket-summary-sections'
import { TriageSheet } from '@/components/tickets/detail/triage-sheet'

/**
 * หน้ารายละเอียด/ทำงานของใบแจ้งเรื่องบน LIFF
 * หน้านี้ทำหน้าที่แค่ประกอบ section กับคุมว่า sheet ไหนเปิดอยู่ — logic ของแต่ละหัวข้องาน
 * อยู่ใน components/tickets/detail/*
 */
export default function TicketWorkDetailPage() {
  const t = useTranslations('liff.ticket.detail')
  const tStatus = useTranslations('status.ticket')
  const { id } = useParams<{ id: string }>()
  const ticketQuery = useTicket(id)
  // โหลดรายชื่อผู้รับผิดชอบไว้ล่วงหน้าตั้งแต่เข้าหน้า เพื่อให้ AssignSheet เปิดมาแล้วมีรายชื่อทันที
  const candidatesQuery = useTicketAssignmentCandidates(id, !!ticketQuery.data?.actions.canAssign)
  const [showInfo, setShowInfo] = useState(false)
  const [showCancellation, setShowCancellation] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)
  const [supervisorSheet, setSupervisorSheet] = useState<SupervisorSheet | null>(null)
  const [cancellationReview, setCancellationReview] = useState<CancellationDecision | null>(null)
  const ticket = ticketQuery.data

  if (ticketQuery.isLoading) {
    return <div className="p-4"><div className="h-64 animate-pulse rounded-lg bg-muted" /></div>
  }
  if (!ticket) {
    return <div className="p-6 text-center text-sm text-destructive">{t('notFound')}</div>
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-36">
      <PageHeader title={ticket.ticketNo} subtitle={tStatus(ticket.status)}/>

      <div className="border-b border-border bg-background px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {/* title = ชื่อหัวข้อ (subject) — เคส "อื่น ๆ" แสดงข้อความที่ผู้แจ้งระบุแทน · categoryName/topicName เป็น snapshot ไทย (ดูแผน Phase 1) */}
            <h1 className="text-base font-semibold">{ticket.otherTopicText ?? ticket.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {[ticket.categoryName, ticket.topicName].filter(Boolean).join(' / ')}
            </p>
          </div>
          <span
            className={`shrink-0 rounded px-2 py-1 text-xs font-semibold ${TICKET_STATUS_CLASS[ticket.status]}`}
            data-ticket-status={ticket.status}
          >
            {tStatus(ticket.status)}
          </span>
        </div>
      </div>

      <StatusStationLine
        categoryName={ticket.categoryName}
        topicName={ticket.topicName}
        subjectName={ticket.subjectName ?? ticket.title}
        status={ticket.status}
        workflowName={ticket.workflowName}
        workflowAutoAcknowledgeAfterDays={ticket.workflowAutoAcknowledgeAfterDays}
        workflowSteps={ticket.workflowSteps}
        workflowCurrentStepKey={ticket.workflowCurrentStepKey}
        workflowCurrentStepIndexByStatus={ticket.workflowCurrentStepIndexByStatus}
      />

      <BoardRuntimeSection ticket={ticket} />

      <CancellationNotices
        ticket={ticket}
        onReview={setCancellationReview}
        onRequestCancellation={() => setShowCancellation(true)}
      />

      <SupervisorActionsSection ticket={ticket} onOpenSheet={setSupervisorSheet} />

      <ProblemDetailSection ticket={ticket} />
      <AssignmentSection ticket={ticket} />
      <TeamSection ticket={ticket} />
      <CloseoutSummarySection ticket={ticket} />
      <ConversationSection ticket={ticket} />

      {showInfo && <RequestInfoSheet ticket={ticket} onClose={() => setShowInfo(false)} />}
      {showCancellation && <CancellationRequestSheet ticket={ticket} onClose={() => setShowCancellation(false)} />}
      {supervisorSheet === 'triage' && <TriageSheet ticket={ticket} onClose={() => setSupervisorSheet(null)} />}
      {supervisorSheet === 'assign' && (
        <AssignSheet
          ticket={ticket}
          candidates={candidatesQuery.data ?? []}
          onClose={() => setSupervisorSheet(null)}
        />
      )}
      {supervisorSheet === 'reject' && <RejectSheet ticket={ticket} onClose={() => setSupervisorSheet(null)} />}
      {supervisorSheet === 'return' && <ReviewSheet ticket={ticket} mode="return" onClose={() => setSupervisorSheet(null)} />}
      {supervisorSheet === 'close' && <ReviewSheet ticket={ticket} mode="close" onClose={() => setSupervisorSheet(null)} />}
      {showCompletion && <CompletionSheet ticket={ticket} onClose={() => setShowCompletion(false)} />}
      {cancellationReview && (
        <CancellationReviewSheet
          ticket={ticket}
          decision={cancellationReview}
          onClose={() => setCancellationReview(null)}
        />
      )}

      <TicketActionBar
        ticket={ticket}
        onRequestInfo={() => setShowInfo(true)}
        onResolve={() => setShowCompletion(true)}
      />
    </div>
  )
}
