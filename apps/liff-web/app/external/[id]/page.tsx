'use client'

import { use, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { CheckCircle2, ChevronLeft, Loader2, Paperclip } from 'lucide-react'
import {
  DEFAULT_TICKET_BOARD_WORKFLOW,
  getTicketBoardWorkflowStepState,
  type TicketStatus,
} from '@hrms/shared-types'
import { formatPhone } from '@hrms/i18n/format'
import { TICKET_STATUS_CLASS } from '@/lib/ticket-status'
import { formatDate } from '@/lib/utils'
import { boardStepLabel } from '@/lib/ticket-board-step-label'
import { useExternalTicketDetail } from '@/hooks/use-external-tickets'

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-0.5 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap text-sm">{value || '-'}</dd>
    </div>
  )
}

// Station line ความคืบหน้าแบบเดียวกับหน้า ticket ภายใน — external ใช้ default workflow เสมอ (ไม่มี workflow ต่อ subject)
function ExternalStatusStationLine({
  status,
  workflowCurrentStepKey,
}: {
  status: TicketStatus
  workflowCurrentStepKey?: string
}) {
  const t = useTranslations('liff.ticket')
  const workflow = DEFAULT_TICKET_BOARD_WORKFLOW
  const railRef = useRef<HTMLDivElement>(null)
  const stationState = (index: number) =>
    getTicketBoardWorkflowStepState(workflow, status, index, workflowCurrentStepKey)

  useEffect(() => {
    const centerCurrentStation = () => {
      const rail = railRef.current
      const currentStation = rail?.querySelector<HTMLElement>('[data-station-state="current"]')
      if (!rail || !currentStation) return
      rail.scrollLeft = currentStation.offsetLeft - (rail.clientWidth - currentStation.clientWidth) / 2
    }

    centerCurrentStation()
    window.addEventListener('resize', centerCurrentStation)
    return () => window.removeEventListener('resize', centerCurrentStation)
  }, [status])

  return (
    <section className="overflow-hidden rounded-xl border border-external-line bg-external-surface px-4 py-5">
      <p className="text-sm font-semibold text-foreground">{t('station.title')}</p>
      <div ref={railRef} className="mt-5 overflow-x-auto scroll-smooth pb-2">
        <div className="flex min-w-max items-start px-1">
          {workflow.steps.map((step, index) => {
            const state = stationState(index)
            const nextState = index < workflow.steps.length - 1 ? stationState(index + 1) : null
            return (
              <div key={step.key} className="flex items-start">
                <div className="w-30 text-center" data-station-state={state}>
                  <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full border-4 ${state === 'complete' ? 'border-external-brand bg-external-brand text-white' : state === 'current' ? 'animate-pulse border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25' : 'border-external-line bg-external-surface text-external-muted'}`}>
                    {state === 'complete' ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-current" />}
                  </div>
                  <p className={`mt-2 text-[11px] font-semibold leading-4 ${state === 'upcoming' ? 'text-external-muted' : 'text-foreground'}`}>{boardStepLabel(t, step)}</p>
                  {state === 'current' ? <p className="mt-1 text-[9px] font-bold tracking-wide text-primary">{t('station.current')}</p> : null}
                </div>
                {nextState ? <div className={`mt-4 w-8 border-t-2 ${nextState === 'upcoming' ? 'border-dashed border-external-line' : 'border-solid border-external-brand'}`} /> : null}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default function ExternalTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useTranslations('liff.external.detail')
  const tStatus = useTranslations('status.ticket')
  const { data: ticket, isLoading, isError } = useExternalTicketDetail(id)

  if (isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-external-muted" />
      </div>
    )
  }

  if (isError || !ticket) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-external-muted">{t('notFound')}</p>
        <Link href="/external" className="text-sm font-semibold text-primary">{t('backToList')}</Link>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-external-canvas">
      <div className="bg-external-brand px-4 pb-5 pt-1 text-white">
        <div className="flex items-center gap-3">
          <Link href="/external" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold">{ticket.ticketNo}</h1>
            <p className="truncate text-xs text-white/75">{ticket.title}</p>
          </div>
          <span className={`shrink-0 rounded px-2 py-1 text-xs font-semibold ${TICKET_STATUS_CLASS[ticket.status]}`}>
            {tStatus(ticket.status)}
          </span>
        </div>
      </div>

      <div className="space-y-3 px-4 pt-3 pb-8">
      <ExternalStatusStationLine
        status={ticket.status}
        workflowCurrentStepKey={ticket.workflowCurrentStepKey}
      />

      <section className="rounded-2xl bg-external-surface p-4 shadow-sm">
        <p className="text-sm font-semibold">{ticket.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {/* ชื่อหมวด/หัวข้อเป็น snapshot ไทยจาก API — รอ Phase 1 ปรับ DTO ฝั่งผู้บริโภค (ดูแผน) */}
          {[ticket.categoryName, ticket.topicName, ticket.subjectName].filter(Boolean).join(' / ') || '-'}
        </p>
        <dl className="mt-2 divide-y divide-border/60">
          <InfoRow label={t('detail')} value={ticket.detail} />
          <InfoRow label={t('location')} value={ticket.locationText} />
          <InfoRow label={t('contactPhone')} value={formatPhone(ticket.contactPhone)} />
          <InfoRow label={t('contactNote')} value={ticket.contactNote} />
          {ticket.resolutionNote && <InfoRow label={t('resolution')} value={ticket.resolutionNote} />}
          <InfoRow label={t('createdAt')} value={formatDate(ticket.createdAt)} />
        </dl>
      </section>

      {ticket.attachments.length > 0 && (
        <section className="rounded-2xl bg-external-surface p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Paperclip className="h-4 w-4 text-external-brand-text" /> {t('attachments')}
          </h2>
          <ul className="mt-2 space-y-1">
            {ticket.attachments.map(attachment => (
              <li key={attachment.id} className="truncate text-sm text-external-brand-text">
                {attachment.fileName ?? attachment.url}
              </li>
            ))}
          </ul>
        </section>
      )}
      </div>
    </div>
  )
}
