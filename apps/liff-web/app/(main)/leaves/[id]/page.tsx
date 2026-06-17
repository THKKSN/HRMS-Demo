'use client'

import { useParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { LeaveStatusBadge } from '@/components/shared/leave-status-badge'
import { useApproveLeave, useCancelLeave, useLeaveById, useRejectLeave } from '@/hooks/use-leaves'
import { isHrOrAdmin, isSupervisorOrAbove } from '@/lib/auth-utils'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import type { LeaveStatus } from '@hrms/shared-types'

const TIMELINE_STEPS: { status: LeaveStatus; label: string }[] = [
  { status: 'PendingSupervisor', label: 'ยื่นคำขอแล้ว' },
  { status: 'PendingHr',        label: 'หัวหน้าอนุมัติ' },
  { status: 'Approved',         label: 'HR อนุมัติ' },
]

const STATUS_ORDER: Record<LeaveStatus, number> = {
  Draft: -1,
  PendingSupervisor: 0,
  PendingHr: 1,
  Approved: 2,
  Rejected: 2,
  Cancelled: 2,
}

const HALF_DAY_LABEL: Record<string, string> = {
  Full: 'เต็มวัน',
  Morning: 'ครึ่งเช้า',
  Afternoon: 'ครึ่งบ่าย',
}

const CAN_CANCEL: LeaveStatus[] = ['PendingSupervisor', 'PendingHr']

export default function LeaveDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const employee = useAuthStore(s => s.employee)
  const { data: leave, isLoading } = useLeaveById(id)
  const { mutateAsync: cancelLeave, isPending: isCancelling } = useCancelLeave()
  const { mutateAsync: approveLeave, isPending: isApproving } = useApproveLeave()
  const { mutateAsync: rejectLeave, isPending: isRejecting } = useRejectLeave()

  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)

  const roles = employee?.roles ?? []

  async function handleCancel() {
    try {
      await cancelLeave(id)
      setShowCancelConfirm(false)
    } catch {
      setError('ยกเลิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    }
  }

  async function handleApprove() {
    try {
      setError(null)
      await approveLeave({ id, comment: comment.trim() || undefined })
      setComment('')
    } catch {
      setError('อนุมัติไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    }
  }

  async function handleReject() {
    try {
      setError(null)
      await rejectLeave({ id, comment: comment.trim() || undefined })
      setComment('')
      setShowRejectConfirm(false)
    } catch {
      setError('ปฏิเสธไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    }
  }

  if (isLoading) {
    return (
      <>
        <PageHeader title="รายละเอียดการลา" backHref="/leaves" />
        <div className="flex flex-col gap-3 px-4 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </>
    )
  }

  if (!leave) {
    return (
      <>
        <PageHeader title="รายละเอียดการลา" backHref="/leaves" />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-muted-foreground">ไม่พบคำขอลาที่ระบุ</p>
        </div>
      </>
    )
  }

  const currentOrder = STATUS_ORDER[leave.status]
  const canCancel = CAN_CANCEL.includes(leave.status)

  // canApprove: ต้องมีสิทธิ์ตรงกับ step ปัจจุบัน
  const canApprove =
    (leave.status === 'PendingSupervisor' && isSupervisorOrAbove(roles)) ||
    (leave.status === 'PendingHr' && isHrOrAdmin(roles))

  return (
    <>
      <PageHeader title="รายละเอียดการลา" backHref="/leaves" />

      <div className="flex flex-col gap-4 px-4 pb-24 pt-4">
        {/* Header card */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-lg font-semibold">{leave.leaveTypeName}</p>
            <LeaveStatusBadge status={leave.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(leave.dateFrom)}
            {leave.dateFrom !== leave.dateTo && ` – ${formatDate(leave.dateTo)}`}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {HALF_DAY_LABEL[leave.halfDay]} · {leave.totalDays} วัน
          </p>
        </div>

        {/* Status timeline */}
        {leave.status !== 'Cancelled' && leave.status !== 'Rejected' && (
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium">สถานะ</p>
            <div className="flex items-center gap-0">
              {TIMELINE_STEPS.map((step, idx) => {
                const isDone = currentOrder > idx
                const isCurrent = currentOrder === idx
                return (
                  <div key={step.status} className="flex flex-1 flex-col items-center">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      isDone ? 'bg-green-500 text-white'
                        : isCurrent ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {isDone ? '✓' : idx + 1}
                    </div>
                    <p className="mt-1 text-center text-xs text-muted-foreground leading-tight">
                      {step.label}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Detail rows */}
        <div className="rounded-xl border bg-card shadow-sm divide-y">
          {[
            { label: 'ผู้ขอลา', value: leave.employeeName },
            leave.reason && { label: 'เหตุผล', value: leave.reason },
            leave.supervisorComment && { label: 'ความเห็นหัวหน้า', value: leave.supervisorComment },
            leave.hrComment && { label: 'ความเห็น HR', value: leave.hrComment },
            { label: 'ยื่นเมื่อ', value: formatDate(leave.createdAt) },
          ]
            .filter(Boolean)
            .map((row) => (
              <div key={(row as { label: string }).label} className="flex justify-between gap-2 px-4 py-3">
                <p className="text-sm text-muted-foreground">{(row as { label: string }).label}</p>
                <p className="text-sm font-medium text-right">{(row as { value: string }).value}</p>
              </div>
            ))}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Approve / Reject section (Supervisor / HR) */}
        {canApprove && (
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="mb-2 text-sm font-medium">ดำเนินการ</p>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={2}
              placeholder="ความเห็น (ถ้ามี)..."
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
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

            {/* Reject confirm inline */}
            {showRejectConfirm && (
              <div className="mt-3 rounded-xl border border-destructive bg-destructive/5 p-3">
                <p className="text-sm font-medium">ยืนยันการปฏิเสธคำขอลา?</p>
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

        {/* Cancel button (เจ้าของคำขอ) */}
        {canCancel && !canApprove && !showCancelConfirm && (
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="rounded-xl border border-destructive py-3 text-sm font-medium text-destructive"
          >
            ยกเลิกคำขอลา
          </button>
        )}

        {showCancelConfirm && (
          <div className="rounded-xl border border-destructive bg-destructive/5 p-4">
            <p className="text-sm font-medium">ยืนยันการยกเลิกคำขอลา?</p>
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
