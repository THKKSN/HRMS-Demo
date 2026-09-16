'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle2 } from 'lucide-react'
import type { TicketDetailDto, TicketStatus } from '@hrms/shared-types'
import {
  createTicketBoardWorkflowFromDto,
  getTicketBoardWorkflowStepState,
  resolveTicketBoardWorkflow,
} from '@hrms/shared-types'
import { boardStepLabel } from '@/lib/ticket-board-step-label'

// แถบสถานีสถานะแนวนอน — เลื่อนสถานีปัจจุบันมากลางจอให้เห็นก่อนเสมอบนมือถือ
export function StatusStationLine({
  categoryName,
  topicName,
  subjectName,
  status,
  workflowName,
  workflowAutoAcknowledgeAfterDays,
  workflowSteps,
  workflowCurrentStepKey,
  workflowCurrentStepIndexByStatus,
}: {
  categoryName?: string
  topicName?: string
  subjectName: string
  status: TicketStatus
  workflowName?: string
  workflowAutoAcknowledgeAfterDays?: number
  workflowSteps: TicketDetailDto['workflowSteps']
  workflowCurrentStepKey?: string
  workflowCurrentStepIndexByStatus: TicketDetailDto['workflowCurrentStepIndexByStatus']
}) {
  const t = useTranslations('liff.ticket')
  const workflow = createTicketBoardWorkflowFromDto({ workflowName, workflowAutoAcknowledgeAfterDays, workflowSteps, workflowCurrentStepIndexByStatus })
    ?? resolveTicketBoardWorkflow({ categoryName, topicName, subjectName })
  const railRef = useRef<HTMLDivElement>(null)
  const stationState = (index: number) => getTicketBoardWorkflowStepState(
    workflow,
    status,
    index,
    workflowCurrentStepKey,
  )

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
  }, [status, workflow.steps])

  return (
    <div className="overflow-hidden border-b border-border bg-linear-to-br from-white via-slate-50 to-sky-50/60 px-4 py-5 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-sm font-semibold text-slate-950 dark:text-slate-50">{t('station.title')}</p></div>
        {status === 'AwaitingRequesterConfirmation' && workflow.autoAcknowledgeAfterDays ? (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
            {t('station.autoClose', { days: workflow.autoAcknowledgeAfterDays })}
          </span>
        ) : null}
      </div>
      <div ref={railRef} className="mt-6 overflow-x-auto scroll-smooth pb-2">
        <div className="flex min-w-max items-start px-1">
          {workflow.steps.map((step, index) => {
            const state = stationState(index)
            const nextState = index < workflow.steps.length - 1 ? stationState(index + 1) : null
            return <div key={step.key} className="flex items-start">
              <div className="w-30 text-center" data-station-state={state}>
                <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full border-4 ${state === 'complete' ? 'border-emerald-600 bg-emerald-600 text-white' : state === 'current' ? 'animate-pulse border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25' : 'border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500'}`}>
                  {state === 'complete' ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-current" />}
                </div>
                {/* ขั้นตอนมาตรฐานแปลจาก key · workflow ที่ HR ตั้งเองใช้ label ที่ตั้งไว้ */}
                <p className={`mt-2 text-[11px] font-semibold leading-4 ${state === 'upcoming' ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>{boardStepLabel(t, step)}</p>
                {state === 'current' ? <p className="mt-1 text-[9px] font-bold tracking-wide text-primary">{t('station.current')}</p> : null}
              </div>
              {nextState ? <div className={`mt-4 w-8 border-t-2 ${nextState === 'upcoming' ? 'border-dashed border-slate-300 dark:border-slate-600' : 'border-solid border-emerald-500'}`} /> : null}
            </div>
          })}
        </div>
      </div>
    </div>
  )
}
