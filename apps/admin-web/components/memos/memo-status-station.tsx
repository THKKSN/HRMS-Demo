'use client'

import { useTranslations } from 'next-intl'
import { CheckCircle2, XCircle } from 'lucide-react'
import type { MemoDto } from '@hrms/shared-types'
import * as fmt from '@hrms/i18n/format'

type StationState = 'complete' | 'current' | 'upcoming' | 'rejected'
type StationLabels = ReturnType<typeof useTranslations<'admin.memo.station'>>

type Station = {
  key: string
  label: string
  state: StationState
  // ใคร · เมื่อไหร่ ของขั้นที่เกิดขึ้นแล้ว — แสดงใต้ชื่อสถานี แทน timeline ประวัติแยก
  by?: string | null
  at?: string
}

function thaiDateTime(value?: string) {
  return value
    ? fmt.formatDateTime(new Date(value), { dateStyle: 'short', timeStyle: 'short' })
    : undefined
}

// Flow ของ Memo: ส่ง Memo → อนุมัติ Memo → แผนกรับทราบ → [ขั้นตอนที่ config ต่อ MemoType] → ส่งมอบ → ผู้ขอตรวจรับ
// เรื่องที่ MemoType ไม่ได้ตั้งขั้นตอนไว้ (หรือเรื่องเก่าก่อนมี feature นี้) จะเหลือสถานี 'ดำเนินการ/ส่งมอบ' ก้อนเดียวเหมือนเดิม
// step.label เป็นชื่อขั้นตอนที่ HR ตั้งเองต่อ MemoType — เป็นข้อมูล ไม่แปล
function buildStations(memo: MemoDto, t: StationLabels): Station[] {
  const rejected = memo.status === 'Rejected'
  const approved = memo.status === 'Approved'
  const acknowledged = !!memo.acknowledgedAt
  const delivered = !!memo.deliveredAt
  const received = !!memo.receivedAt
  const steps = memo.steps ?? []

  const head: Station[] = [
    { key: 'submitted', label: t('submitted'), state: 'complete', by: memo.requesterName, at: memo.createdAt },
    {
      key: 'approve',
      label: rejected && !memo.approvedAt ? t('approveRejected') : t('approve'),
      state: rejected && !memo.approvedAt ? 'rejected' : approved || memo.approvedAt ? 'complete' : 'current',
      by: memo.approvedByName,
      at: memo.approvedAt ?? (rejected ? memo.rejectedAt : undefined),
    },
    {
      key: 'acknowledge',
      label: t('acknowledge'),
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
        label: t('work'),
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
          label: t('deliver'),
          state: (rejected ? 'upcoming' : delivered ? 'complete' : stepsAllDone ? 'current' : 'upcoming') as StationState,
          by: memo.deliveredByName,
          at: memo.deliveredAt,
        }]
      : []),
    {
      key: 'receive',
      label: t('receive'),
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
      return 'border-slate-300 bg-white text-slate-400'
  }
}

export function MemoStatusStation({ memo }: { memo: MemoDto }) {
  const t = useTranslations('admin.memo.station')
  const stations = buildStations(memo, t)

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-background p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-950">{t('title')}</p>
      <div className="mt-6 overflow-x-auto pb-2">
        <div className="flex min-w-max items-start justify-center px-2">
          {stations.map((station, index) => {
            const nextState = index < stations.length - 1 ? stations[index + 1].state : null
            return (
              <div key={station.key} className="flex items-start">
                <div className="w-36 text-center" data-station-state={station.state}>
                  <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full border-4 ${circleClass(station.state)}`}>
                    {station.state === 'complete' ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : station.state === 'rejected' ? (
                      <XCircle className="h-5 w-5" />
                    ) : (
                      <span className="h-2.5 w-2.5 rounded-full bg-current" />
                    )}
                  </div>
                  <p className={`mt-3 text-xs font-semibold leading-5 ${station.state === 'upcoming' ? 'text-slate-400' : station.state === 'rejected' ? 'text-red-600' : 'text-slate-600'}`}>
                    {station.label}
                  </p>
                  {station.state === 'current' && (
                    <p className="mt-1 text-[10px] font-bold tracking-wide text-primary">{t('current')}</p>
                  )}
                  {(station.state === 'complete' || station.state === 'rejected') && (station.by || station.at) && (
                    <div className="mt-1 text-[10px] leading-4 text-muted-foreground">
                      {station.by && <p className="truncate">{station.by}</p>}
                      {station.at && <p>{thaiDateTime(station.at)}</p>}
                    </div>
                  )}
                </div>
                {nextState && (
                  <div className={`mt-5 w-12 border-t-2 ${nextState === 'upcoming' ? 'border-dashed border-slate-300' : 'border-solid border-emerald-500'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
