'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import {
  useOtRequestById,
  useCancelOtRequest,
  useApproveOtRequest,
  useRejectOtRequest,
} from '@/hooks/use-ot-requests'
import { isSupervisorOrAbove, isHrOrAdmin } from '@/lib/auth-utils'
import { useAuthStore } from '@/stores/auth.store'
import type { OtStatus } from '@hrms/shared-types'

// ─── helpers ─────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<OtStatus, string> = {
  PendingSupervisor: 'รออนุมัติหัวหน้า',
  PendingHr:        'รออนุมัติ HR',
  Approved:         'อนุมัติแล้ว',
  Rejected:         'ถูกปฏิเสธ',
  Cancelled:        'ยกเลิกแล้ว',
}

const STATUS_COLOR: Record<OtStatus, string> = {
  PendingSupervisor: 'bg-amber-100 text-amber-700',
  PendingHr:        'bg-blue-100 text-blue-700',
  Approved:         'bg-green-100 text-green-700',
  Rejected:         'bg-red-100 text-red-700',
  Cancelled:        'bg-gray-100 text-gray-500',
}

const RATE_LABEL: Record<string, string> = {
  Weekday: 'วันธรรมดา (×1.5)',
  Weekend: 'วันหยุด (×2)',
  Holiday: 'วันหยุดนักขัตฤกษ์ (×3)',
}

type TimelineStep = { label: string; done: boolean; current: boolean }

function buildTimeline(status: OtStatus): TimelineStep[] {
  const steps = [
    { key: 'PendingSupervisor', label: 'ยื่นคำขอ' },
    { key: 'PendingHr',        label: 'หัวหน้าอนุมัติ' },
    { key: 'Approved',         label: 'HR อนุมัติ' },
  ]

  const ORDER: Record<OtStatus, number> = {
    PendingSupervisor: 0,
    PendingHr: 1,
    Approved: 2,
    Rejected: 2,
    Cancelled: 2,
  }
  const cur = ORDER[status]

  return steps.map((s, idx) => ({
    label: s.label,
    done:    idx < cur,
    current: idx === cur && status !== 'Rejected' && status !== 'Cancelled',
  }))
}

function formatDateTH(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('th-TH', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatDateTime(iso?: string) {
  if (!iso) return undefined
  return new Date(iso).toLocaleString('th-TH', {
    dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Bangkok',
  })
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function OtDetailPage() {
  const { id } = useParams<{ id: string }>()
  const employee = useAuthStore((s) => s.employee)
  const roles    = employee?.roles ?? []

  const { data: ot, isLoading } = useOtRequestById(id)
  const { mutateAsync: cancelOt, isPending: isCancelling } = useCancelOtRequest()
  const { mutateAsync: approveOt, isPending: isApproving } = useApproveOtRequest()
  const { mutateAsync: rejectOt,  isPending: isRejecting  } = useRejectOtRequest()

  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)
  const [comment, setComment] = useState('')
  const [error,   setError]   = useState<string | null>(null)

  async function handleCancel() {
    try {
      await cancelOt(id)
      setShowCancelConfirm(false)
    } catch {
      setError('ยกเลิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    }
  }

  async function handleApprove() {
    try {
      setError(null)
      await approveOt({ id, comment: comment.trim() || undefined })
      setComment('')
    } catch {
      setError('อนุมัติไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    }
  }

  async function handleReject() {
    try {
      setError(null)
      await rejectOt({ id, comment: comment.trim() || undefined })
      setComment('')
      setShowRejectConfirm(false)
    } catch {
      setError('ปฏิเสธไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    }
  }

  if (isLoading) {
    return (
      <>
        <PageHeader title="รายละเอียด OT" backHref="/ot" />
        <div className="flex flex-col gap-3 px-4 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-whited" />
          ))}
        </div>
      </>
    )
  }

  if (!ot) {
    return (
      <>
        <PageHeader title="รายละเอียด OT" backHref="/ot" />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-muted-foreground">ไม่พบคำขอ OT ที่ระบุ</p>
        </div>
      </>
    )
  }

  const canCancel =
    (ot.status === 'PendingSupervisor' || ot.status === 'PendingHr') &&
    ot.employeeId === employee?.id

  const canApprove =
    (ot.status === 'PendingSupervisor' && isSupervisorOrAbove(roles)) ||
    (ot.status === 'PendingHr' && isHrOrAdmin(roles))

  const timeline = buildTimeline(ot.status)

  const rows: { label: string; value: string }[] = [
    { label: 'ผู้ขอ OT',     value: ot.employeeName },
    { label: 'วันที่',        value: formatDateTH(ot.date) },
    { label: 'ช่วงเวลา',     value: `${ot.startTime.slice(0, 5)} – ${ot.endTime.slice(0, 5)} น. (${ot.totalHours} ชม.)` },
    { label: 'ประเภท OT',    value: RATE_LABEL[ot.rateType] ?? ot.rateType },
    ...(ot.reason ? [{ label: 'เหตุผล', value: ot.reason }] : []),
    ...(ot.supervisorName ? [{ label: 'หัวหน้าผู้อนุมัติ', value: ot.supervisorName }] : []),
    ...(ot.supervisorComment ? [{ label: 'ความเห็นหัวหน้า', value: ot.supervisorComment }] : []),
    ...(ot.supervisorApprovedAt ? [{ label: 'อนุมัติเมื่อ', value: formatDateTime(ot.supervisorApprovedAt)! }] : []),
    ...(ot.hrName ? [{ label: 'HR ผู้อนุมัติ', value: ot.hrName }] : []),
    ...(ot.hrComment ? [{ label: 'ความเห็น HR', value: ot.hrComment }] : []),
    ...(ot.hrAcknowledgedAt ? [{ label: 'HR บันทึกเมื่อ', value: formatDateTime(ot.hrAcknowledgedAt)! }] : []),
    { label: 'ยื่นเมื่อ', value: formatDateTime(ot.createdAt)! },
  ]

  return (
    <>
      <PageHeader title="รายละเอียด OT" backHref="/ot" />

      <div className="flex flex-col gap-4 px-4 pb-24 pt-4">

        {/* Header card */}
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-base font-semibold">
                {ot.startTime.slice(0, 5)} – {ot.endTime.slice(0, 5)} น.
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">{formatDateTH(ot.date)}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLOR[ot.status]}`}>
              {STATUS_LABEL[ot.status]}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700">
              {ot.totalHours} ชม.
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {RATE_LABEL[ot.rateType] ?? ot.rateType}
            </span>
          </div>
        </div>

        {/* Timeline */}
        {ot.status !== 'Cancelled' && ot.status !== 'Rejected' && (
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium">สถานะ</p>
            <div className="flex items-center">
              {timeline.map((step, idx) => (
                <div key={idx} className="flex flex-1 flex-col items-center">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      step.done    ? 'bg-green-500 text-white'
                      : step.current ? 'bg-orange-500 text-white'
                      : 'bg-whited text-muted-foreground'
                    }`}
                  >
                    {step.done ? '✓' : idx + 1}
                  </div>
                  <p className="mt-1 text-center text-xs text-muted-foreground leading-tight">
                    {step.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detail rows */}
        <div className="rounded-xl border bg-white shadow-sm divide-y">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-2 px-4 py-3">
              <p className="text-sm text-muted-foreground shrink-0">{row.label}</p>
              <p className="text-sm font-medium text-right">{row.value}</p>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Approve / Reject (Supervisor / HR) */}
        {canApprove && (
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="mb-2 text-sm font-medium">ดำเนินการ</p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder="ความเห็น (ถ้ามี)..."
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setShowRejectConfirm(true)}
                disabled={isRejecting || isApproving}
                className="flex-1 rounded-xl border border-destructive py-2.5 text-sm font-medium text-destructive disabled:opacity-60"
              >
                ปฏิเสธ
              </button>
              <button
                onClick={handleApprove}
                disabled={isApproving || isRejecting}
                className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {isApproving ? 'กำลังอนุมัติ...' : 'อนุมัติ'}
              </button>
            </div>

            {showRejectConfirm && (
              <div className="mt-3 rounded-xl border border-destructive bg-destructive/5 p-3">
                <p className="text-sm font-medium">ยืนยันการปฏิเสธคำขอ OT?</p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setShowRejectConfirm(false)}
                    className="flex-1 rounded-xl border py-2 text-sm font-medium"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={isRejecting}
                    className="flex-1 rounded-xl bg-destructive py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {isRejecting ? 'กำลังดำเนินการ...' : 'ยืนยันปฏิเสธ'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cancel (เจ้าของคำขอ) */}
        {canCancel && !canApprove && !showCancelConfirm && (
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="rounded-xl border border-destructive py-3 text-sm font-medium text-destructive"
          >
            ยกเลิกคำขอ OT
          </button>
        )}

        {showCancelConfirm && (
          <div className="rounded-xl border border-destructive bg-destructive/5 p-4">
            <p className="text-sm font-medium">ยืนยันการยกเลิกคำขอ OT?</p>
            <p className="mt-1 text-xs text-muted-foreground">การกระทำนี้ไม่สามารถย้อนกลับได้</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 rounded-xl border py-2 text-sm font-medium"
              >
                ไม่ยกเลิก
              </button>
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="flex-1 rounded-xl bg-destructive py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {isCancelling ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิก'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
