'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle2, XCircle } from 'lucide-react'
import type { MemoDto } from '@hrms/shared-types'

// แถบสถานีสถานะแนวนอน — รูปแบบเดียวกับ StatusStationLine ของ ticket
// เลื่อนสถานีปัจจุบันมากลางจอให้เห็นก่อนเสมอบนมือถือ
// memo มีสถานะ 'rejected' เพิ่มจาก ticket (เรื่องถูกปฏิเสธแล้วจบ ไม่เดินต่อ)

type StationState = 'complete' | 'current' | 'upcoming' | 'rejected'
type Station = { key: string; label: string; state: StationState; by?: string | null; at?: string }

// ป้ายสถานีหลักที่ระบบกำหนดเอง — ผู้เรียกแปลจาก liff.memo.station.* (ขั้นตอนที่ HR ตั้งเองใช้ step.label ตรง ๆ)
export type MemoStationLabels = {
  submitted: string
  rejected: string
  executiveApprove: string
  acknowledge: string
  work: string
  deliver: string
  receive: string
}

// โครงสถานีเดียวกับ admin-web: หัว 3 สถานี → ขั้นตอนที่ตั้งค่าไว้ (ถ้ามี) → ส่งมอบ/ตรวจรับ
export function buildMemoStations(memo: MemoDto, labels: MemoStationLabels): Station[] {
  const rejected = memo.status === 'Rejected'
  const approved = memo.status === 'Approved'
  const acknowledged = !!memo.acknowledgedAt
  const delivered = !!memo.deliveredAt
  const received = !!memo.receivedAt
  const steps = memo.steps ?? []

  const head: Station[] = [
    { key: 'submitted', label: labels.submitted, state: 'complete', by: memo.requesterName, at: memo.createdAt },
    {
      key: 'approve',
      label: rejected && !memo.approvedAt ? labels.rejected : labels.executiveApprove,
      state: rejected && !memo.approvedAt ? 'rejected' : approved || memo.approvedAt ? 'complete' : 'current',
      by: memo.approvedByName,
      at: memo.approvedAt ?? (rejected ? memo.rejectedAt : undefined),
    },
    {
      key: 'acknowledge',
      label: labels.acknowledge,
      state: acknowledged ? 'complete' : rejected ? 'upcoming' : approved ? 'current' : 'upcoming',
      by: memo.acknowledgedByName,
      at: memo.acknowledgedAt,
    },
  ]

  const middle: Station[] = steps.length > 0
    ? steps.map(step => ({
        key: `step-${step.id}`,
        label: step.label,
        state: step.status === 'Done'
          ? 'complete'
          : step.status === 'Rejected'
            ? 'rejected'
            : step.status === 'Current' && !rejected
              ? 'current'
              : 'upcoming',
        by: step.actedByName,
        at: step.actedAt,
      }))
    : [{
        key: 'work',
        label: labels.work,
        state: rejected ? 'upcoming' : delivered ? 'complete' : acknowledged ? 'current' : 'upcoming',
        by: memo.deliveredByName,
        at: memo.deliveredAt,
      }]

  // เรื่องที่มีขั้นตอนย่อย แยกสถานี "ส่งมอบ" ออกจากขั้นตอนสุดท้าย
  const stepsAllDone = steps.length > 0 && steps.every(s => s.status === 'Done')
  const tail: Station[] = [
    ...(steps.length > 0
      ? [{
          key: 'deliver',
          label: labels.deliver,
          state: (rejected ? 'upcoming' : delivered ? 'complete' : stepsAllDone ? 'current' : 'upcoming') as StationState,
          by: memo.deliveredByName,
          at: memo.deliveredAt,
        }]
      : []),
    {
      key: 'receive',
      label: labels.receive,
      state: rejected ? 'upcoming' : received ? 'complete' : delivered ? 'current' : 'upcoming',
      by: received ? (memo.receivedByName ?? memo.requesterName) : undefined,
      at: memo.receivedAt,
    },
  ]

  return [...head, ...middle, ...tail]
}

function circleClass(state: StationState) {
  switch (state) {
    case 'complete':
      return 'border-emerald-600 bg-emerald-600 text-white'
    case 'current':
      return 'animate-pulse border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25'
    case 'rejected':
      return 'border-red-600 bg-red-600 text-white'
    default:
      return 'border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500'
  }
}

export function MemoStatusStationLine({ memo }: { memo: MemoDto }) {
  const t = useTranslations('liff.memo.station')
  const stations = buildMemoStations(memo, {
    submitted: t('submitted'),
    rejected: t('rejected'),
    executiveApprove: t('executiveApprove'),
    acknowledge: t('acknowledge'),
    work: t('work'),
    deliver: t('deliver'),
    receive: t('receive'),
  })
  const railRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const centerCurrentStation = () => {
      const rail = railRef.current
      const currentStation = rail?.querySelector<HTMLElement>('[data-station-state="current"]')
        ?? rail?.querySelector<HTMLElement>('[data-station-state="rejected"]')
      if (!rail || !currentStation) return
      rail.scrollLeft = currentStation.offsetLeft - (rail.clientWidth - currentStation.clientWidth) / 2
    }

    centerCurrentStation()
    window.addEventListener('resize', centerCurrentStation)
    return () => window.removeEventListener('resize', centerCurrentStation)
  }, [memo.status, memo.steps, memo.acknowledgedAt, memo.deliveredAt, memo.receivedAt])

  return (
    <div className="overflow-hidden border-b border-border bg-linear-to-br from-white via-slate-50 to-sky-50/60 px-4 py-5 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-sm font-semibold text-slate-950 dark:text-slate-50">{t('title')}</p></div>
        {memo.status === 'Approved' && !memo.acknowledgedAt ? (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
            {t('awaitingAck')}
          </span>
        ) : null}
      </div>

      <div ref={railRef} className="mt-6 overflow-x-auto scroll-smooth pb-2">
        <div className="flex min-w-max items-start px-1">
          {stations.map((station, index) => {
            const nextState = index < stations.length - 1 ? stations[index + 1].state : null
            return (
              <div key={station.key} className="flex items-start">
                <div className="w-30 text-center" data-station-state={station.state}>
                  <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full border-4 ${circleClass(station.state)}`}>
                    {station.state === 'complete'
                      ? <CheckCircle2 className="h-4 w-4" />
                      : station.state === 'rejected'
                        ? <XCircle className="h-4 w-4" />
                        : <span className="h-2 w-2 rounded-full bg-current" />}
                  </div>
                  <p className={`mt-2 text-[11px] font-semibold leading-4 ${
                    station.state === 'upcoming'
                      ? 'text-slate-400 dark:text-slate-500'
                      : station.state === 'rejected'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-slate-800 dark:text-slate-100'
                  }`}>
                    {station.label}
                  </p>
                  {station.state === 'current' ? (
                    <p className="mt-1 text-[9px] font-bold tracking-wide text-primary">{t('current')}</p>
                  ) : null}
                </div>
                {nextState ? (
                  <div className={`mt-4 w-8 border-t-2 ${
                    nextState === 'upcoming'
                      ? 'border-dashed border-slate-300 dark:border-slate-600'
                      : 'border-solid border-emerald-500'
                  }`} />
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
