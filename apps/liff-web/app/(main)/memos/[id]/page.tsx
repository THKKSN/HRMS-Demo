'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Building2, CheckCircle2, FileText, Loader2, PackageCheck, Truck, XCircle } from 'lucide-react'
import type { MemoDto, MemoStatus } from '@hrms/shared-types'
import { PageHeader } from '@/components/layout/page-header'
import {
  useAcknowledgeMemo, useApproveMemo, useDeliverMemo, useMemoDetail, useReceiveMemo, useRejectMemo,
} from '@/hooks/use-memo'
import { useAuthStore } from '@/stores/auth.store'

function errorMessage(error: unknown) {
  const data = (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data
  return data?.message ?? data?.error ?? 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่'
}

const STATUS_CLASS: Record<MemoStatus, string> = {
  Draft: 'border-slate-200 bg-slate-50 text-slate-700',
  Pending: 'border-amber-200 bg-amber-50 text-amber-700',
  Approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Rejected: 'border-red-200 bg-red-50 text-red-700',
}

const STATUS_LABEL: Record<MemoStatus, string> = {
  Draft: 'แบบร่าง',
  Pending: 'รออนุมัติ',
  Approved: 'อนุมัติแล้ว',
  Rejected: 'ไม่อนุมัติ',
}

function thaiDateTime(value?: string) {
  return value
    ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : undefined
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex flex-1 justify-between gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-right text-sm font-semibold">{value}</span>
      </div>
    </div>
  )
}

// ── Status Station แนวตั้งสำหรับมือถือ — flow เดียวกับ admin-web ──────────────
type StationState = 'complete' | 'current' | 'upcoming' | 'rejected'
type Station = { key: string; label: string; state: StationState; by?: string | null; at?: string }

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

function stationCircle(state: StationState) {
  switch (state) {
    case 'complete': return 'border-emerald-600 bg-emerald-600 text-white'
    case 'current': return 'animate-pulse border-[#0f8f72] bg-[#0f8f72] text-white'
    case 'rejected': return 'border-red-600 bg-red-600 text-white'
    default: return 'border-slate-300 bg-white text-slate-400'
  }
}

function MemoStatusStationMobile({ memo }: { memo: MemoDto }) {
  const stations = buildStations(memo)
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="text-sm font-semibold">สถานะการดำเนินงาน</p>
      <ol className="mt-4">
        {stations.map((station, index) => {
          const isLast = index === stations.length - 1
          const nextState = !isLast ? stations[index + 1].state : null
          return (
            <li key={station.key} className="relative flex gap-3 pb-6 last:pb-0">
              {!isLast && (
                <span
                  className={`absolute left-4 top-8 h-full w-0.5 ${nextState === 'upcoming' ? 'bg-slate-200' : 'bg-emerald-500'}`}
                  aria-hidden
                />
              )}
              <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${stationCircle(station.state)}`}>
                {station.state === 'complete' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : station.state === 'rejected' ? (
                  <XCircle className="h-4 w-4" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-current" />
                )}
              </span>
              <div className="min-w-0 pt-1">
                <p className={`text-sm font-semibold ${station.state === 'upcoming' ? 'text-slate-400' : station.state === 'rejected' ? 'text-red-600' : ''}`}>
                  {station.label}
                  {station.state === 'current' && (
                    <span className="ml-2 text-[10px] font-bold tracking-wide text-[#0f8f72]">สถานะปัจจุบัน</span>
                  )}
                </p>
                {(station.state === 'complete' || station.state === 'rejected') && (station.by || station.at) && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {station.by ?? '—'}{station.at ? ` · ${thaiDateTime(station.at)}` : ''}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export default function MemoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: memo, isLoading } = useMemoDetail(id)
  const { mutateAsync: receiveMemo, isPending: isReceiving } = useReceiveMemo()
  const approveMemo = useApproveMemo()
  const rejectMemo = useRejectMemo()
  const acknowledgeMemo = useAcknowledgeMemo()
  const deliverMemo = useDeliverMemo()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const employee = useAuthStore(s => s.employee)
  const canApprove = employee?.roles.some(role => ['Executive', 'Admin'].includes(role.role)) ?? false
  const isSupervisor = employee?.roles.some(role => role.role === 'Supervisor') ?? false
  const actionBusy = approveMemo.isPending || rejectMemo.isPending
    || acknowledgeMemo.isPending || deliverMemo.isPending

  async function handleReceive() {
    if (!window.confirm('ยืนยันว่าได้รับของ/งานเรียบร้อยแล้ว?')) return
    try {
      await receiveMemo(id)
    } catch {
      window.alert('ยืนยันรับของไม่สำเร็จ กรุณาลองใหม่')
    }
  }

  async function handleApprove() {
    if (!window.confirm('ยืนยันอนุมัติ Memo นี้?')) return
    try {
      await approveMemo.mutateAsync({ id })
    } catch (error) {
      window.alert(errorMessage(error))
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return window.alert('กรุณาระบุเหตุผลที่ไม่อนุมัติ')
    try {
      await rejectMemo.mutateAsync({ id, reason: rejectReason.trim() })
      setRejectOpen(false)
      setRejectReason('')
    } catch (error) {
      window.alert(errorMessage(error))
    }
  }

  async function handleAcknowledge() {
    if (!window.confirm('รับทราบเรื่องนี้เข้าแผนก?')) return
    try {
      await acknowledgeMemo.mutateAsync(id)
    } catch (error) {
      window.alert(errorMessage(error))
    }
  }

  async function handleDeliver() {
    if (!window.confirm('ยืนยันว่าดำเนินการและส่งมอบเรียบร้อยแล้ว?')) return
    try {
      await deliverMemo.mutateAsync(id)
    } catch (error) {
      window.alert(errorMessage(error))
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 pb-24">
        <PageHeader title="Memo" backHref="/memos/my" />
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (!memo) {
    return (
      <div className="min-h-screen bg-muted/30 pb-24">
        <PageHeader title="Memo" backHref="/memos/my" />
        <div className="px-6 py-16 text-center text-sm text-muted-foreground">ไม่พบMemo</div>
      </div>
    )
  }

  const showReceivePrompt = memo.status === 'Approved' && !!memo.deliveredAt && !memo.receivedAt
  const showApprovePanel = memo.status === 'Pending' && canApprove
  const showAcknowledge = memo.status === 'Approved' && !memo.acknowledgedAt && isSupervisor
  const showDeliver = memo.status === 'Approved' && !!memo.acknowledgedAt && !memo.deliveredAt && isSupervisor

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <PageHeader title={memo.memoNo} subtitle={memo.memoTypeName} backHref="/memos/my" />

      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[memo.status]}`}>
            {STATUS_LABEL[memo.status]}
          </span>
        </div>

        <MemoStatusStationMobile memo={memo} />

        {/* ผู้บริหาร: อนุมัติ / ไม่อนุมัติ */}
        {showApprovePanel && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-900">เรื่องนี้รอการอนุมัติจากคุณ</p>
            {!rejectOpen ? (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={actionBusy}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white disabled:opacity-60"
                >
                  {approveMemo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  อนุมัติ
                </button>
                <button
                  type="button"
                  onClick={() => setRejectOpen(true)}
                  disabled={actionBusy}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-red-300 bg-white text-sm font-bold text-red-600 disabled:opacity-60"
                >
                  <XCircle className="h-4 w-4" /> ไม่อนุมัติ
                </button>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <textarea
                  rows={3}
                  maxLength={500}
                  value={rejectReason}
                  onChange={event => setRejectReason(event.target.value)}
                  placeholder="ระบุเหตุผลที่ไม่อนุมัติ *"
                  className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={actionBusy}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {rejectMemo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    ยืนยันไม่อนุมัติ
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRejectOpen(false); setRejectReason('') }}
                    disabled={actionBusy}
                    className="h-11 rounded-xl border border-border bg-background px-4 text-sm font-semibold"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* หัวหน้าแผนกปลายทาง: รับทราบ */}
        {showAcknowledge && (
          <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-violet-900">
            <p className="text-sm">เรื่องนี้อนุมัติแล้ว รอแผนกของคุณรับทราบเพื่อเริ่มดำเนินการ</p>
            <button
              type="button"
              onClick={handleAcknowledge}
              disabled={actionBusy}
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-bold text-white disabled:opacity-60"
            >
              {acknowledgeMemo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              รับทราบเรื่อง
            </button>
          </div>
        )}

        {/* หัวหน้าแผนกปลายทาง: ส่งมอบ */}
        {showDeliver && (
          <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-teal-900">
            <p className="text-sm">รับทราบแล้ว — เมื่อดำเนินการเสร็จ กดยืนยันส่งมอบให้ผู้ขอ</p>
            <button
              type="button"
              onClick={handleDeliver}
              disabled={actionBusy}
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 text-sm font-bold text-white disabled:opacity-60"
            >
              {deliverMemo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
              ยืนยันส่งมอบ
            </button>
          </div>
        )}

        {memo.status === 'Rejected' && memo.rejectReason && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm">เหตุผลที่ไม่อนุมัติ: {memo.rejectReason}</p>
          </div>
        )}

        {showReceivePrompt && (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sky-800">
            <p className="text-sm">
              ส่งมอบแล้วโดย {memo.deliveredByName ?? '—'} เมื่อ {thaiDateTime(memo.deliveredAt)} — กรุณายืนยันรับของ
            </p>
            <button
              type="button"
              onClick={handleReceive}
              disabled={isReceiving}
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0f8f72] text-sm font-bold text-white disabled:opacity-60"
            >
              {isReceiving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
              ยืนยันรับของ
            </button>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-border bg-background">
          <DetailRow icon={FileText} label="เลขที่" value={memo.memoNo} />
          <div className="border-t border-border" />
          <DetailRow icon={FileText} label="ประเภทเรื่อง" value={`${memo.memoTypeName} / ${memo.memoCategoryNameSnapshot} / ${memo.memoSubCategoryNameSnapshot}`} />
          <div className="border-t border-border" />
          <DetailRow icon={FileText} label="บริษัท" value={memo.companyName} />
          <div className="border-t border-border" />
          <DetailRow icon={FileText} label="แผนก" value={memo.departmentName} />
        </div>

        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="mb-1 text-xs text-muted-foreground">รายละเอียด</p>
          <p className="whitespace-pre-wrap text-sm">{memo.detail}</p>
        </div>
      </div>
    </div>
  )
}
