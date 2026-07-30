'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, XCircle, ClipboardList, ChevronLeft,
  CalendarDays, Clock, User, FileText, MessageSquare,
} from 'lucide-react'
import { LeaveStatusBadge } from '@/components/shared/leave-status-badge'
import {
  usePendingApprovals,
  useLeaveById,
  useApproveLeave,
  useRejectLeave,
  useCancellationPending,
  useApproveCancelLeave,
  useRejectCancelLeave,
} from '@/hooks/use-leaves'
import { useAuthStore } from '@/stores/auth.store'
import { isSupervisorOrAbove } from '@/lib/auth-utils'
import type { PendingLeaveItemDto } from '@hrms/shared-types'

// ── helpers ────────────────────────────────────────────────────────────────────

function formatDateTH(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit', timeZone: 'Asia/Bangkok',
  })
}
function formatDateLong(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok',
  })
}
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (h < 1) return 'เมื่อกี้'
  if (h < 24) return `${h} ชม. ที่แล้ว`
  if (d < 7) return `${d} วันที่แล้ว`
  return formatDateTH(dateStr)
}

const HALF_DAY_LABEL: Record<string, string> = {
  Full: 'เต็มวัน', Morning: 'ครึ่งเช้า', Afternoon: 'ครึ่งบ่าย',
}

// ── Leave List Card ────────────────────────────────────────────────────────────

function LeaveCard({
  item, selected, onClick,
}: { item: PendingLeaveItemDto; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-4 transition-colors ${
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-background hover:bg-whited/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-whited">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="truncate text-sm font-semibold text-foreground">{item.employeeName}</p>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">{item.leaveTypeName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDateTH(item.dateFrom)}
            {item.dateFrom !== item.dateTo && ` – ${formatDateTH(item.dateTo)}`}
            {' · '}{item.totalDays} วัน
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <LeaveStatusBadge status={item.status} />
          <span className="text-[10px] text-muted-foreground">{timeAgo(item.createdAt)}</span>
        </div>
      </div>
    </button>
  )
}

// ── Detail Panel: Pending Approval ────────────────────────────────────────────

function DetailPanel({
  selectedId,
  onBack,
  onRefresh,
  onDone,
}: { selectedId: string | null; onBack: () => void; onRefresh: () => void; onDone: () => void }) {
  const { data: leave, isLoading } = useLeaveById(selectedId ?? '')
  const { mutateAsync: approveLeave, isPending: isApproving } = useApproveLeave()
  const { mutateAsync: rejectLeave,  isPending: isRejecting  } = useRejectLeave()

  const [comment,           setComment]           = useState('')
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)
  const [error,             setError]             = useState<string | null>(null)
  const [success,           setSuccess]           = useState<'approved' | 'rejected' | null>(null)

  useEffect(() => {
    setComment('')
    setShowRejectConfirm(false)
    setError(null)
    setSuccess(null)
  }, [selectedId])

  if (!selectedId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <ClipboardList className="h-12 w-12 text-muted-foreground/40" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">เลือกรายการจากทางซ้าย</p>
        <p className="mt-1 text-xs text-muted-foreground/60">เพื่อดูรายละเอียดและดำเนินการอนุมัติ</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-5 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-whited" />
        ))}
      </div>
    )
  }

  if (!leave) return null

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        {success === 'approved' ? (
          <>
            <CheckCircle2 className="h-14 w-14 text-green-500" />
            <p className="mt-4 text-base font-bold text-foreground">อนุมัติสำเร็จ</p>
            <p className="mt-1 text-sm text-muted-foreground">คำขอลาของ {leave.employeeName} ได้รับการอนุมัติแล้ว</p>
          </>
        ) : (
          <>
            <XCircle className="h-14 w-14 text-destructive" />
            <p className="mt-4 text-base font-bold text-foreground">ปฏิเสธแล้ว</p>
            <p className="mt-1 text-sm text-muted-foreground">คำขอลาของ {leave.employeeName} ถูกปฏิเสธแล้ว</p>
          </>
        )}
        <button
          onClick={onDone}
          className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          ดูรายการถัดไป
        </button>
      </div>
    )
  }

  async function handleApprove() {
    setError(null)
    try {
      await approveLeave({ id: leave!.id, comment: comment.trim() || undefined })
      setSuccess('approved')
      onRefresh()
    } catch { setError('อนุมัติไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  async function handleReject() {
    setError(null)
    try {
      await rejectLeave({ id: leave!.id, comment: comment.trim() || undefined })
      setSuccess('rejected')
      onRefresh()
    } catch { setError('ปฏิเสธไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3 lg:hidden">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-primary">
          <ChevronLeft className="h-4 w-4" /> กลับ
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">คำขอลา</p>
            <h2 className="mt-1 text-lg font-bold text-foreground">{leave.employeeName}</h2>
          </div>
          <LeaveStatusBadge status={leave.status} />
        </div>

        <div className="rounded-xl border border-border divide-y divide-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex flex-1 justify-between gap-2">
              <span className="text-sm text-muted-foreground">ประเภทการลา</span>
              <span className="text-sm font-semibold">{leave.leaveTypeName}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex flex-1 justify-between gap-2 min-w-0">
              <span className="text-sm text-muted-foreground shrink-0">วันที่</span>
              <span className="text-sm font-semibold text-right">
                {formatDateLong(leave.dateFrom)}
                {leave.dateFrom !== leave.dateTo && ` – ${formatDateLong(leave.dateTo)}`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex flex-1 justify-between gap-2">
              <span className="text-sm text-muted-foreground">จำนวน</span>
              <span className="text-sm font-semibold">
                {HALF_DAY_LABEL[leave.halfDay]} · {leave.totalDays} วัน
              </span>
            </div>
          </div>
          {leave.timeFrom && leave.timeTo && (
            <div className="flex items-center gap-3 px-4 py-3">
              <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex flex-1 justify-between gap-2">
                <span className="text-sm text-muted-foreground">เวลา</span>
                <span className="text-sm font-semibold">{leave.timeFrom} – {leave.timeTo} น.</span>
              </div>
            </div>
          )}
        </div>

        {leave.reason && (
          <div className="rounded-xl border border-border bg-whited/40 px-4 py-3">
            <p className="text-xs text-muted-foreground mb-1">เหตุผล</p>
            <p className="text-sm text-foreground">{leave.reason}</p>
          </div>
        )}

        {leave.supervisorComment && (
          <div className="rounded-xl border border-border bg-whited/40 px-4 py-3">
            <p className="text-xs text-muted-foreground mb-1">ความเห็นหัวหน้า</p>
            <p className="text-sm text-foreground">{leave.supervisorComment}</p>
          </div>
        )}

        {(leave.status === 'PendingSupervisor' || leave.status === 'PendingHr') && (
          <div className="space-y-3 pt-1">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">ความเห็น</span>
                <span className="text-xs text-muted-foreground">(ถ้ามี)</span>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="ระบุความเห็นประกอบการพิจารณา..."
                className="w-full resize-none rounded-xl border border-border bg-whited px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            {showRejectConfirm ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 space-y-3">
                <p className="text-sm font-semibold text-destructive">ยืนยันการปฏิเสธคำขอลา?</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowRejectConfirm(false)}
                    className="rounded-xl border border-border py-2 text-sm font-medium"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={isRejecting}
                    className="rounded-xl bg-destructive py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {isRejecting ? 'กำลังดำเนินการ...' : 'ยืนยันปฏิเสธ'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowRejectConfirm(true)}
                  disabled={isApproving}
                  className="rounded-xl border border-destructive py-3 text-sm font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-60 transition-colors"
                >
                  ปฏิเสธ
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isApproving || isRejecting}
                  className="rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
                >
                  {isApproving ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      กำลังอนุมัติ...
                    </span>
                  ) : 'อนุมัติ ✓'}
                </button>
              </div>
            )}
          </div>
        )}

        {leave.status !== 'PendingSupervisor' && leave.status !== 'PendingHr' && (
          <div className="rounded-xl bg-whited px-4 py-3 text-sm text-muted-foreground text-center">
            คำขอนี้ได้รับการดำเนินการแล้ว
          </div>
        )}
      </div>
    </div>
  )
}

// ── Detail Panel: Cancellation Request ────────────────────────────────────────

function CancellationDetailPanel({
  selectedId,
  onBack,
  onRefresh,
  onDone,
}: { selectedId: string | null; onBack: () => void; onRefresh: () => void; onDone: () => void }) {
  const { data: leave, isLoading } = useLeaveById(selectedId ?? '')
  const { mutateAsync: approveCancel, isPending: isApproving } = useApproveCancelLeave()
  const { mutateAsync: rejectCancel,  isPending: isRejecting  } = useRejectCancelLeave()

  const [comment,           setComment]           = useState('')
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)
  const [error,             setError]             = useState<string | null>(null)
  const [success,           setSuccess]           = useState<'approved' | 'rejected' | null>(null)

  useEffect(() => {
    setComment('')
    setShowRejectConfirm(false)
    setError(null)
    setSuccess(null)
  }, [selectedId])

  if (!selectedId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <ClipboardList className="h-12 w-12 text-muted-foreground/40" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">เลือกรายการจากทางซ้าย</p>
        <p className="mt-1 text-xs text-muted-foreground/60">เพื่อดูรายละเอียดและดำเนินการ</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-5 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-whited" />
        ))}
      </div>
    )
  }

  if (!leave) return null

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        {success === 'approved' ? (
          <>
            <CheckCircle2 className="h-14 w-14 text-green-500" />
            <p className="mt-4 text-base font-bold text-foreground">อนุมัติการยกเลิกสำเร็จ</p>
            <p className="mt-1 text-sm text-muted-foreground">วันลาของ {leave.employeeName} ถูกคืนกลับแล้ว</p>
          </>
        ) : (
          <>
            <XCircle className="h-14 w-14 text-destructive" />
            <p className="mt-4 text-base font-bold text-foreground">ปฏิเสธการยกเลิกแล้ว</p>
            <p className="mt-1 text-sm text-muted-foreground">{leave.employeeName} ยังคงอยู่ในสถานะลา</p>
          </>
        )}
        <button
          onClick={onDone}
          className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          ดูรายการถัดไป
        </button>
      </div>
    )
  }

  async function handleApprove() {
    setError(null)
    try {
      await approveCancel({ id: leave!.id, comment: comment.trim() || undefined })
      setSuccess('approved')
      onRefresh()
    } catch { setError('เกิดข้อผิดพลาด กรุณาลองใหม่') }
  }

  async function handleReject() {
    setError(null)
    try {
      await rejectCancel({ id: leave!.id, comment: comment.trim() || undefined })
      setSuccess('rejected')
      onRefresh()
    } catch { setError('เกิดข้อผิดพลาด กรุณาลองใหม่') }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3 lg:hidden">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-primary">
          <ChevronLeft className="h-4 w-4" /> กลับ
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">ขอยกเลิกการลา</p>
            <h2 className="mt-1 text-lg font-bold text-foreground">{leave.employeeName}</h2>
          </div>
          <LeaveStatusBadge status={leave.status} />
        </div>

        <div className="rounded-xl border border-border divide-y divide-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex flex-1 justify-between gap-2">
              <span className="text-sm text-muted-foreground">ประเภทการลา</span>
              <span className="text-sm font-semibold">{leave.leaveTypeName}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex flex-1 justify-between gap-2 min-w-0">
              <span className="text-sm text-muted-foreground shrink-0">วันที่ลา</span>
              <span className="text-sm font-semibold text-right">
                {formatDateLong(leave.dateFrom)}
                {leave.dateFrom !== leave.dateTo && ` – ${formatDateLong(leave.dateTo)}`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex flex-1 justify-between gap-2">
              <span className="text-sm text-muted-foreground">จำนวน</span>
              <span className="text-sm font-semibold">{leave.totalDays} วัน</span>
            </div>
          </div>
        </div>

        {leave.reason && (
          <div className="rounded-xl border border-border bg-whited/40 px-4 py-3">
            <p className="text-xs text-muted-foreground mb-1">เหตุผลการลาเดิม</p>
            <p className="text-sm text-foreground">{leave.reason}</p>
          </div>
        )}

        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
          <p className="text-xs font-medium text-orange-700 mb-1">ถ้าอนุมัติการยกเลิก</p>
          <p className="text-sm text-orange-800">วันลา {leave.totalDays} วันจะถูกคืนกลับเข้าสิทธิ์ของพนักงาน</p>
        </div>

        {leave.status === 'CancellationRequested' && (
          <div className="space-y-3 pt-1">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">ความเห็น</span>
                <span className="text-xs text-muted-foreground">(ถ้ามี)</span>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="ระบุความเห็นประกอบการพิจารณา..."
                className="w-full resize-none rounded-xl border border-border bg-whited px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            {showRejectConfirm ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 space-y-3">
                <p className="text-sm font-semibold text-destructive">ปฏิเสธการยกเลิก? พนักงานจะยังคงอยู่ในสถานะลา</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowRejectConfirm(false)}
                    className="rounded-xl border border-border py-2 text-sm font-medium"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={isRejecting}
                    className="rounded-xl bg-destructive py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {isRejecting ? 'กำลังดำเนินการ...' : 'ยืนยัน'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowRejectConfirm(true)}
                  disabled={isApproving}
                  className="rounded-xl border border-destructive py-3 text-sm font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-60 transition-colors"
                >
                  ไม่อนุมัติ
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isApproving || isRejecting}
                  className="rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
                >
                  {isApproving ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      กำลังดำเนินการ...
                    </span>
                  ) : 'อนุมัติการยกเลิก ✓'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

type TabId = 'pending' | 'cancellation'

export default function ApprovalsLeavesPage() {
  const router   = useRouter()
  const employee = useAuthStore((s) => s.employee)
  const isHr     = employee?.roles.some((r) => r.role === 'Hr' || r.role === 'Admin') ?? false

  const { data: pendingData,      isLoading: pendingLoading,      refetch: refetchPending }      = usePendingApprovals()
  const { data: cancellationData, isLoading: cancellationLoading, refetch: refetchCancellation } = useCancellationPending()

  const [tab,        setTab]        = useState<TabId>('pending')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => {
    if (employee && !isSupervisorOrAbove(employee.roles)) {
      router.replace('/dashboard')
    }
  }, [employee, router])

  if (!employee || !isSupervisorOrAbove(employee.roles)) return null

  const activeItems    = tab === 'pending' ? pendingData?.items      ?? [] : cancellationData?.items      ?? []
  const activeTotal    = tab === 'pending' ? pendingData?.totalCount ?? 0  : cancellationData?.totalCount ?? 0
  const activeLoading  = tab === 'pending' ? pendingLoading : cancellationLoading
  const cancellationCount = cancellationData?.totalCount ?? 0

  function handleSelect(id: string) {
    setSelectedId(id)
    setShowDetail(true)
  }

  function handleRefresh() {
    tab === 'pending' ? refetchPending() : refetchCancellation()
  }

  function handleDone() {
    setSelectedId(null)
    setShowDetail(false)
  }

  function handleTabChange(t: TabId) {
    setTab(t)
    setSelectedId(null)
    setShowDetail(false)
  }

  return (
    <div className="min-h-full bg-whited/40 p-4 lg:p-6">
      <div className="mx-auto max-w-6xl space-y-4">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">อนุมัติการลา</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {activeLoading ? '...' : `${activeTotal} รายการรอดำเนินการ`}
            </p>
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────── */}
        {isHr && (
          <div className="flex gap-1 rounded-xl border border-border bg-background p-1 w-fit">
            <button
              onClick={() => handleTabChange('pending')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === 'pending'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              รออนุมัติการลา
              {(pendingData?.totalCount ?? 0) > 0 && (
                <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
                  {pendingData?.totalCount}
                </span>
              )}
            </button>
            <button
              onClick={() => handleTabChange('cancellation')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === 'cancellation'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              รออนุมัติยกเลิก
              {cancellationCount > 0 && (
                <span className="ml-2 rounded-full bg-orange-100 px-1.5 py-0.5 text-xs font-semibold text-orange-700">
                  {cancellationCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* ── Layout: List | Detail ────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-4 lg:items-start">

          {/* ── List panel ──────────────── */}
          <div className={`w-full lg:flex-55 min-w-0 ${showDetail ? 'hidden lg:block' : ''}`}>
            <div className="rounded-2xl border border-border bg-background shadow-sm overflow-hidden">
              <div className="border-b border-border px-5 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {tab === 'pending' ? 'คำขอรออนุมัติ' : 'คำขอยกเลิกการลา'}
                </p>
              </div>

              {activeLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-20 animate-pulse rounded-xl bg-whited" />
                  ))}
                </div>
              ) : !activeItems.length ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                  <p className="mt-4 font-medium text-foreground">ไม่มีรายการรอดำเนินการ</p>
                  <p className="mt-1 text-sm text-muted-foreground">ทุกรายการได้รับการดำเนินการแล้ว</p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {activeItems.map((item) => (
                    <LeaveCard
                      key={item.id}
                      item={item}
                      selected={selectedId === item.id}
                      onClick={() => handleSelect(item.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Detail panel ──────────────── */}
          <div className={`w-full lg:flex-45 min-w-0 lg:sticky lg:top-4 ${!showDetail && !selectedId ? 'hidden lg:block' : ''} ${!showDetail ? 'hidden lg:block' : ''}`}>
            <div className="rounded-2xl border border-border bg-background shadow-sm min-h-80">
              {tab === 'pending' ? (
                <DetailPanel
                  selectedId={selectedId}
                  onBack={() => setShowDetail(false)}
                  onRefresh={handleRefresh}
                  onDone={handleDone}
                />
              ) : (
                <CancellationDetailPanel
                  selectedId={selectedId}
                  onBack={() => setShowDetail(false)}
                  onRefresh={handleRefresh}
                  onDone={handleDone}
                />
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
