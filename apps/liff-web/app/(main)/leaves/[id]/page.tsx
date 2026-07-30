'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { LeaveStatusBadge } from '@/components/shared/leave-status-badge'
import {
  useApproveLeave, useCancelLeave, useLeaveById,
  useRejectLeave, useRequestCancelLeave,
} from '@/hooks/use-leaves'
import { isHrOrAdmin, isSupervisorOrAbove } from '@/lib/auth-utils'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import type { LeaveStatus } from '@hrms/shared-types'
import { FileText, ExternalLink, Clock } from 'lucide-react'

const TIMELINE_STEPS: { status: LeaveStatus; label: string }[] = [
  { status: 'PendingSupervisor', label: 'ยื่นคำขอแล้ว' },
  { status: 'PendingHr',        label: 'หัวหน้าอนุมัติ' },
  { status: 'Approved',         label: 'HR อนุมัติ' },
]

const STATUS_ORDER: Record<LeaveStatus, number> = {
  Draft:                 -1,
  PendingSupervisor:      0,
  PendingHr:              1,
  Approved:               2,
  CancellationRequested:  2,
  Rejected:               2,
  Cancelled:              2,
}

const HALF_DAY_LABEL: Record<string, string> = {
  Full: 'เต็มวัน',
  Morning: 'ครึ่งเช้า',
  Afternoon: 'ครึ่งบ่าย',
}

export default function LeaveDetailPage() {
  const { id } = useParams<{ id: string }>()
  const employee = useAuthStore(s => s.employee)
  const { data: leave, isLoading } = useLeaveById(id)
  const { mutateAsync: cancelLeave,        isPending: isCancelling    } = useCancelLeave()
  const { mutateAsync: requestCancelLeave, isPending: isRequesting    } = useRequestCancelLeave()
  const { mutateAsync: approveLeave,       isPending: isApproving     } = useApproveLeave()
  const { mutateAsync: rejectLeave,        isPending: isRejecting     } = useRejectLeave()

  const [showCancelConfirm,  setShowCancelConfirm]  = useState(false)
  const [showRequestCancel,  setShowRequestCancel]  = useState(false)
  const [showRejectConfirm,  setShowRejectConfirm]  = useState(false)
  const [cancelReason,       setCancelReason]       = useState('')
  const [comment,            setComment]            = useState('')
  const [error,              setError]              = useState<string | null>(null)

  const roles = employee?.roles ?? []

  async function handleCancel() {
    try {
      await cancelLeave(id)
      setShowCancelConfirm(false)
    } catch {
      setError('ยกเลิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    }
  }

  async function handleRequestCancel() {
    try {
      setError(null)
      await requestCancelLeave({ id, reason: cancelReason.trim() || undefined })
      setShowRequestCancel(false)
      setCancelReason('')
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (code === 'LEAVE_ALREADY_STARTED') setError('ไม่สามารถยกเลิกการลาที่เริ่มต้นหรือผ่านไปแล้ว กรุณาติดต่อ HR')
      else setError('ส่งคำขอยกเลิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
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
            <div key={i} className="h-14 animate-pulse rounded-xl bg-whited" />
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
  const isOwner   = leave.employeeId === employee?.id
  const canCancel = isOwner && (leave.status === 'PendingSupervisor' || leave.status === 'PendingHr')
  const canRequestCancel = isOwner && leave.status === 'Approved'
  const canApprove =
    (leave.status === 'PendingSupervisor' && isSupervisorOrAbove(roles)) ||
    (leave.status === 'PendingHr' && isHrOrAdmin(roles))

  const terminalStatuses: LeaveStatus[] = ['Cancelled', 'Rejected', 'CancellationRequested']

  return (
    <>
      <PageHeader title="รายละเอียดการลา" backHref="/leaves" />

      <div className="flex flex-col gap-4 px-4 pb-24 pt-4">
        {/* Header card */}
        <div className="rounded-xl border bg-white p-4 shadow-sm">
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

        {/* CancellationRequested banner */}
        {leave.status === 'CancellationRequested' && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-800">รอ HR ดำเนินการยกเลิก</p>
              <p className="mt-0.5 text-xs text-amber-700">คำขอยกเลิกถูกส่งแล้ว HR กำลังพิจารณา</p>
            </div>
          </div>
        )}

        {/* Status timeline */}
        {!terminalStatuses.includes(leave.status) && (
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium">สถานะ</p>
            <div className="flex items-center gap-0">
              {TIMELINE_STEPS.map((step, idx) => {
                const isDone    = currentOrder > idx
                const isCurrent = currentOrder === idx
                return (
                  <div key={step.status} className="flex flex-1 flex-col items-center">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      isDone    ? 'bg-green-500 text-white'
                      : isCurrent ? 'bg-primary text-primary-foreground'
                      : 'bg-whited text-muted-foreground'
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
        <div className="rounded-xl border bg-white shadow-sm divide-y">
          {[
            { label: 'ผู้ขอลา',          value: leave.employeeName },
            leave.reason                && { label: 'เหตุผล',              value: leave.reason },
            leave.supervisorName        && { label: 'หัวหน้าผู้อนุมัติ',  value: leave.supervisorName },
            leave.supervisorComment     && { label: 'ความเห็นหัวหน้า',    value: leave.supervisorComment },
            leave.hrName                && { label: 'HR ผู้อนุมัติ',      value: leave.hrName },
            leave.hrComment             && { label: 'ความเห็น HR',         value: leave.hrComment },
            { label: 'ยื่นเมื่อ',        value: formatDate(leave.createdAt) },
          ]
            .filter(Boolean)
            .map((row) => (
              <div key={(row as { label: string }).label} className="flex justify-between gap-2 px-4 py-3">
                <p className="text-sm text-muted-foreground">{(row as { label: string }).label}</p>
                <p className="text-sm font-medium text-right">{(row as { value: string }).value}</p>
              </div>
            ))}
        </div>

        {/* เอกสารแนบ */}
        {leave.attachmentUrls.length > 0 && (
          <div className="rounded-xl border bg-white shadow-sm">
            <p className="border-b px-4 py-3 text-sm font-medium">เอกสารแนบ ({leave.attachmentUrls.length})</p>
            <div className="divide-y">
              {leave.attachmentUrls.map((url, idx) => {
                const name    = url.split('/').pop() ?? `ไฟล์ ${idx + 1}`
                const isImage = /\.(jpg|jpeg|png)$/i.test(url)
                const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('/v1', '') ?? ''
                const fullUrl = url.startsWith('http') ? url : `${apiBase}${url}`
                return (
                  <a
                    key={idx}
                    href={fullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-whited transition-colors"
                  >
                    {isImage ? (
                      <img src={fullUrl} alt={name} className="h-10 w-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
                    <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </a>
                )
              })}
            </div>
          </div>
        )}

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

        {/* ยกเลิกตรง — PendingSupervisor / PendingHr */}
        {canCancel && !canApprove && !showCancelConfirm && (
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="rounded-xl border border-destructive py-3 text-sm font-medium text-destructive"
          >
            ยกเลิกคำขอลา
          </button>
        )}

        {canCancel && showCancelConfirm && (
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

        {/* ขอยกเลิก — Approved (ต้องผ่าน HR) */}
        {canRequestCancel && !showRequestCancel && (
          <button
            onClick={() => setShowRequestCancel(true)}
            className="rounded-xl border border-amber-400 py-3 text-sm font-medium text-amber-700"
          >
            ขอยกเลิกการลา (รอ HR อนุมัติ)
          </button>
        )}

        {canRequestCancel && showRequestCancel && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-800">ขอยกเลิกการลา</p>
            <p className="mt-0.5 text-xs text-amber-700">คำขอนี้จะถูกส่งให้ HR พิจารณา ยังไม่ยกเลิกทันที</p>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              rows={2}
              placeholder="เหตุผลที่ต้องการยกเลิก (ถ้ามี)..."
              className="mt-3 w-full resize-none rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => { setShowRequestCancel(false); setCancelReason('') }}
                className="flex-1 rounded-xl border py-2.5 text-sm font-medium"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleRequestCancel}
                disabled={isRequesting}
                className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {isRequesting ? 'กำลังส่ง...' : 'ส่งคำขอยกเลิก'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
