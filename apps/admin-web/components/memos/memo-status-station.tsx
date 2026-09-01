'use client'

import { CheckCircle2, XCircle } from 'lucide-react'
import type { MemoDto } from '@hrms/shared-types'

type StationState = 'complete' | 'current' | 'upcoming' | 'rejected'

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
    ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
    : undefined
}

// Flow ของ Memo ตายตัว: ส่งเรื่อง → ผู้บริหารอนุมัติ → แผนกรับทราบ → ดำเนินการ/ส่งมอบ → ผู้ขอรับของ
// คำนวณสถานะแต่ละสถานีจาก status + timestamp โดยตรง (ไม่มี workflow config แบบ Ticket)
function buildStations(memo: MemoDto): Station[] {
  const rejected = memo.status === 'Rejected'
  const approved = memo.status === 'Approved'
  const acknowledged = !!memo.acknowledgedAt
  const delivered = !!memo.deliveredAt
  const received = !!memo.receivedAt

  return [
    { key: 'submitted', label: 'ส่งเรื่อง', state: 'complete', by: memo.requesterName, at: memo.createdAt },
    {
      key: 'approve',
      label: rejected ? 'ไม่อนุมัติ' : 'ผู้บริหารอนุมัติ',
      state: rejected ? 'rejected' : approved ? 'complete' : 'current',
      by: memo.approvedByName,
      at: rejected ? memo.rejectedAt : memo.approvedAt,
    },
    {
      key: 'acknowledge',
      label: 'แผนกรับทราบ',
      state: rejected ? 'upcoming' : acknowledged ? 'complete' : approved ? 'current' : 'upcoming',
      by: memo.acknowledgedByName,
      at: memo.acknowledgedAt,
    },
    {
      key: 'work',
      label: 'ดำเนินการ/ส่งมอบ',
      state: rejected ? 'upcoming' : delivered ? 'complete' : acknowledged ? 'current' : 'upcoming',
      by: memo.deliveredByName,
      at: memo.deliveredAt,
    },
    {
      key: 'receive',
      label: 'ผู้ขอรับของ',
      state: rejected ? 'upcoming' : received ? 'complete' : delivered ? 'current' : 'upcoming',
      by: received ? (memo.receivedByName ?? memo.requesterName) : undefined,
      at: memo.receivedAt,
    },
  ]
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
  const stations = buildStations(memo)

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-background p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-950">สถานะการดำเนินงาน</p>
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
                    <p className="mt-1 text-[10px] font-bold tracking-wide text-primary">สถานะปัจจุบัน</p>
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
