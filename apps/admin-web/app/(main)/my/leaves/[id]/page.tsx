'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { ChevronLeft, CheckCircle2, XCircle, Clock, AlertCircle, FileText, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { LeaveStatusBadge } from '@/components/shared/leave-status-badge'
import { useApproveLeave, useCancelLeave, useLeaveById, useRejectLeave, useRequestCancelLeave } from '@/hooks/use-leaves'
import { isHrOrAdmin, isSupervisorOrAbove } from '@/lib/auth-utils'
import { useAuthStore } from '@/stores/auth.store'
import type { LeaveStatus } from '@hrms/shared-types'

const TIMELINE_STEPS: { status: LeaveStatus; label: string; sublabel: string }[] = [
  { status: 'PendingSupervisor', label: 'ยื่นคำขอ',       sublabel: 'รอหัวหน้าอนุมัติ' },
  { status: 'PendingHr',        label: 'หัวหน้าอนุมัติ', sublabel: 'รอ HR อนุมัติ' },
  { status: 'Approved',         label: 'HR อนุมัติ',      sublabel: 'เสร็จสิ้น' },
]

const STATUS_ORDER: Record<LeaveStatus, number> = {
  Draft: -1, PendingSupervisor: 0, PendingHr: 1,
  Approved: 2, Rejected: 2, Cancelled: 2, CancellationRequested: 2,
}

const HALF_DAY_LABEL: Record<string, string> = {
  Full: 'เต็มวัน', Morning: 'ครึ่งเช้า', Afternoon: 'ครึ่งบ่าย',
}

const CAN_CANCEL: LeaveStatus[] = ['PendingSupervisor', 'PendingHr']

function formatDateTH(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok',
  })
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-4 py-3">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  )
}

export default function LeaveDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const employee = useAuthStore((s) => s.employee)

  const { data: leave, isLoading } = useLeaveById(id)
  const { mutateAsync: cancelLeave,        isPending: isCancelling  } = useCancelLeave()
  const { mutateAsync: requestCancelLeave, isPending: isRequesting  } = useRequestCancelLeave()
  const { mutateAsync: approveLeave,       isPending: isApproving   } = useApproveLeave()
  const { mutateAsync: rejectLeave,        isPending: isRejecting   } = useRejectLeave()

  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showRequestCancel, setShowRequestCancel] = useState(false)
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)
  const [cancelReason,      setCancelReason]      = useState('')
  const [comment,           setComment]           = useState('')
  const [error,             setError]             = useState<string | null>(null)

  const roles = employee?.roles ?? []

  async function handleCancel() {
    try { await cancelLeave(id); router.push('/my/leaves') }
    catch { setError('ยกเลิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
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
    } catch { setError('อนุมัติไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  async function handleReject() {
    try {
      setError(null)
      await rejectLeave({ id, comment: comment.trim() || undefined })
      setComment('')
      setShowRejectConfirm(false)
    } catch { setError('ปฏิเสธไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-full bg-whited/40 p-4 lg:p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="h-9 w-32 animate-pulse rounded-xl bg-whited" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-whited" />
          ))}
        </div>
      </div>
    )
  }

  if (!leave) {
    return (
      <div className="min-h-full bg-whited/40 p-4 lg:p-6">
        <div className="mx-auto max-w-3xl flex flex-col items-center justify-center py-20 text-center">
          <p className="font-medium text-foreground">ไม่พบคำขอลาที่ระบุ</p>
          <Link href="/my/leaves" className="mt-4 text-sm text-primary underline">กลับหน้าประวัติการลา</Link>
        </div>
      </div>
    )
  }

  const currentOrder      = STATUS_ORDER[leave.status]
  const isOwner           = leave.employeeId === employee?.id
  const canCancel         = isOwner && CAN_CANCEL.includes(leave.status)
  const canRequestCancel  = isOwner && leave.status === 'Approved'
  const canApprove =
    (leave.status === 'PendingSupervisor' && isSupervisorOrAbove(roles)) ||
    (leave.status === 'PendingHr'         && isHrOrAdmin(roles))

  return (
    <div className="min-h-full bg-whited/40 p-4 lg:p-6">
      <div className="mx-auto max-w-3xl space-y-5">

        {/* ── Back + header ───────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <Link
            href="/my/leaves"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground truncate">{leave.leaveTypeName}</h1>
              <LeaveStatusBadge status={leave.status} />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {formatDateTH(leave.dateFrom)}
              {leave.dateFrom !== leave.dateTo && ` – ${formatDateTH(leave.dateTo)}`}
            </p>
          </div>
        </div>

        {/* ── Timeline (แสดงเฉพาะเมื่อไม่ยกเลิก/ปฏิเสธ) ─────── */}
        {leave.status !== 'Cancelled' && leave.status !== 'Rejected' && (
          <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
            <p className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">สถานะการดำเนินการ</p>
            <div className="flex items-start">
              {TIMELINE_STEPS.map((step, idx) => {
                const isDone    = currentOrder > idx
                const isCurrent = currentOrder === idx
                const isLast    = idx === TIMELINE_STEPS.length - 1
                return (
                  <div key={step.status} className="flex flex-1 flex-col items-center">
                    <div className="flex w-full items-center">
                      {/* line left */}
                      <div className={`flex-1 h-0.5 ${idx === 0 ? 'bg-transparent' : isDone || isCurrent ? 'bg-primary' : 'bg-border'}`} />
                      {/* dot */}
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                        isDone    ? 'bg-green-500 text-white' :
                        isCurrent ? 'bg-primary text-primary-foreground' :
                                    'bg-whited text-muted-foreground'
                      }`}>
                        {isDone ? <CheckCircle2 className="h-4 w-4" /> : <span>{idx + 1}</span>}
                      </div>
                      {/* line right */}
                      <div className={`flex-1 h-0.5 ${isLast ? 'bg-transparent' : isDone ? 'bg-primary' : 'bg-border'}`} />
                    </div>
                    <p className="mt-2 text-center text-xs font-medium text-foreground">{step.label}</p>
                    {isCurrent && (
                      <p className="text-center text-[10px] text-primary">{step.sublabel}</p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Rejected / Cancelled banner */}
            {leave.status === 'Approved' && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-2.5 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                การลาได้รับการอนุมัติแล้ว
              </div>
            )}
          </div>
        )}

        {/* Rejected / Cancelled banner แสดงแยก */}
        {(leave.status === 'Rejected' || leave.status === 'Cancelled') && (
          <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
            leave.status === 'Rejected'
              ? 'border-destructive/30 bg-destructive/5 text-destructive'
              : 'border-border bg-whited text-muted-foreground'
          }`}>
            {leave.status === 'Rejected'
              ? <XCircle className="h-4 w-4 shrink-0" />
              : <Clock className="h-4 w-4 shrink-0" />}
            {leave.status === 'Rejected' ? 'คำขอลาถูกปฏิเสธ' : 'คำขอลาถูกยกเลิกแล้ว'}
          </div>
        )}

        {/* ── Detail card ─────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-background shadow-sm">
          <div className="px-5 py-4 divide-y divide-border">
            <DetailRow label="ผู้ขอลา"      value={leave.employeeName} />
            <DetailRow label="ประเภทการลา"  value={leave.leaveTypeName} />
            <DetailRow label="วันที่"
              value={
                `${formatDateTH(leave.dateFrom)}` +
                (leave.dateFrom !== leave.dateTo ? ` – ${formatDateTH(leave.dateTo)}` : '')
              }
            />
            <DetailRow label="รูปแบบ"       value={`${HALF_DAY_LABEL[leave.halfDay]} · ${leave.totalDays} วัน`} />
            {leave.timeFrom && leave.timeTo && (
              <DetailRow label="เวลา" value={`${leave.timeFrom} – ${leave.timeTo} น.`} />
            )}
            <DetailRow label="เหตุผล"          value={leave.reason} />
            <DetailRow label="หัวหน้าผู้อนุมัติ" value={leave.supervisorName} />
            <DetailRow label="ความเห็นหัวหน้า"  value={leave.supervisorComment} />
            <DetailRow label="HR ผู้อนุมัติ"    value={leave.hrName} />
            <DetailRow label="ความเห็น HR"      value={leave.hrComment} />
            <DetailRow label="ยื่นเมื่อ"        value={formatDateTH(leave.createdAt)} />
          </div>
        </div>

        {/* เอกสารแนบ */}
        {leave.attachmentUrls.length > 0 && (
          <div className="rounded-2xl border border-border bg-background shadow-sm overflow-hidden">
            <p className="border-b border-border px-5 py-3 text-sm font-semibold">
              เอกสารแนบ ({leave.attachmentUrls.length})
            </p>
            <div className="divide-y divide-border">
              {leave.attachmentUrls.map((url, idx) => {
                const name = url.split('/').pop() ?? `ไฟล์ ${idx + 1}`
                const isImage = /\.(jpg|jpeg|png)$/i.test(url)
                const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('/v1', '') ?? ''
                const fullUrl = url.startsWith('http') ? url : `${apiBase}${url}`
                return (
                  <a
                    key={idx}
                    href={fullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-5 py-3 hover:bg-whited transition-colors"
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

        {/* ── Error ───────────────────────────────────────────── */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* ── Approve / Reject (Supervisor / HR) ─────────────── */}
        {canApprove && (
          <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
            <p className="mb-3 text-sm font-semibold">ดำเนินการ</p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder="ความเห็น (ถ้ามี)..."
              className="w-full resize-none rounded-xl border border-border bg-whited px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowRejectConfirm(true)}
                disabled={isRejecting || isApproving}
                className="rounded-xl border border-destructive py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-60 transition-colors"
              >
                ปฏิเสธ
              </button>
              <button
                onClick={handleApprove}
                disabled={isApproving || isRejecting}
                className="rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
              >
                {isApproving ? 'กำลังอนุมัติ...' : 'อนุมัติ ✓'}
              </button>
            </div>

            {showRejectConfirm && (
              <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
                <p className="text-sm font-semibold text-destructive">ยืนยันการปฏิเสธคำขอลา?</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowRejectConfirm(false)}
                    className="rounded-xl border border-border py-2 text-sm font-medium"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={isRejecting}
                    className="rounded-xl bg-destructive py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {isRejecting ? 'กำลังดำเนินการ...' : 'ยืนยันปฏิเสธ'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Cancel button (เจ้าของ — PendingSupervisor/PendingHr) ── */}
        {canCancel && !canApprove && (
          showCancelConfirm ? (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
              <p className="font-semibold text-destructive">ยืนยันการยกเลิกคำขอลา?</p>
              <p className="mt-1 text-sm text-muted-foreground">การกระทำนี้ไม่สามารถย้อนกลับได้</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="rounded-xl border border-border py-2.5 text-sm font-medium"
                >
                  ไม่ยกเลิก
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isCancelling}
                  className="rounded-xl bg-destructive py-2.5 text-sm font-medium text-white disabled:opacity-60"
                >
                  {isCancelling ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิก'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="w-full rounded-2xl border border-destructive/50 py-3 text-sm font-semibold text-destructive hover:bg-destructive/5 transition-colors"
            >
              ยกเลิกคำขอลา
            </button>
          )
        )}

        {/* ── CancellationRequested banner ────────────────────── */}
        {leave.status === 'CancellationRequested' && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-800">รอ HR ดำเนินการยกเลิก</p>
              <p className="mt-0.5 text-sm text-amber-700">คำขอยกเลิกถูกส่งแล้ว HR กำลังพิจารณา</p>
            </div>
          </div>
        )}

        {/* ── ขอยกเลิก (Approved → CancellationRequested) ────── */}
        {canRequestCancel && (
          showRequestCancel ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
              <p className="font-semibold text-amber-800">ขอยกเลิกการลา</p>
              <p className="mt-1 text-sm text-amber-700">คำขอนี้จะถูกส่งให้ HR พิจารณา ยังไม่ยกเลิกทันที</p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={2}
                placeholder="เหตุผลที่ต้องการยกเลิก (ถ้ามี)..."
                className="mt-3 w-full resize-none rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setShowRequestCancel(false); setCancelReason('') }}
                  className="rounded-xl border border-border py-2.5 text-sm font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleRequestCancel}
                  disabled={isRequesting}
                  className="rounded-xl bg-amber-500 py-2.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-60 transition-colors"
                >
                  {isRequesting ? 'กำลังส่ง...' : 'ส่งคำขอยกเลิก'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowRequestCancel(true)}
              className="w-full rounded-2xl border border-amber-400 py-3 text-sm font-semibold text-amber-700 hover:bg-amber-50 transition-colors"
            >
              ขอยกเลิกการลา (รอ HR อนุมัติ)
            </button>
          )
        )}

      </div>
    </div>
  )
}
