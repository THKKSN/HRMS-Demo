'use client'

import { useState } from 'react'
import { Check, X, Clock, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useAllOtRequests, useTeamOtRequests, useApproveOtRequest, useRejectOtRequest } from '@/hooks/use-ot-requests'
import { useCompanies } from '@/hooks/use-companies'
import { useAuthStore } from '@/stores/auth.store'
import type { OtRequestDto, OtStatus } from '@hrms/shared-types'

const MONTH_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
const CURRENT_YEAR = new Date().getFullYear()
const CURRENT_MONTH = new Date().getMonth() + 1

const STATUS_LABEL: Record<OtStatus, string> = {
  PendingSupervisor: 'รออนุมัติ (Sup.)',
  PendingHr: 'รออนุมัติ (HR)',
  Approved: 'อนุมัติแล้ว',
  Rejected: 'ปฏิเสธ',
  Cancelled: 'ยกเลิก',
}

const STATUS_VARIANT: Record<OtStatus, 'warning' | 'info' | 'success' | 'destructive' | 'secondary'> = {
  PendingSupervisor: 'warning',
  PendingHr: 'info',
  Approved: 'success',
  Rejected: 'destructive',
  Cancelled: 'secondary',
}

const RATE_LABEL: Record<string, string> = {
  Weekday: 'วันทำงาน (1.5×)',
  Weekend: 'วันหยุดสัปดาห์ (2×)',
  Holiday: 'วันหยุดนักขัตฤกษ์ (3×)',
}

function thaiDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${d} ${MONTH_TH[m - 1]} ${y + 543}`
}

function ActionModal({
  item,
  action,
  onClose,
}: {
  item: OtRequestDto
  action: 'approve' | 'reject'
  onClose: () => void
}) {
  const [comment, setComment] = useState('')
  const approve = useApproveOtRequest()
  const reject  = useRejectOtRequest()

  async function handleSubmit() {
    try {
      if (action === 'approve') {
        await approve.mutateAsync({ id: item.id, comment: comment || undefined })
        toast.success('อนุมัติ OT สำเร็จ')
      } else {
        if (!comment.trim()) { toast.error('กรุณาระบุเหตุผลการปฏิเสธ'); return }
        await reject.mutateAsync({ id: item.id, comment })
        toast.success('ปฏิเสธ OT แล้ว')
      }
      onClose()
    } catch {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
    }
  }

  const isPending = approve.isPending || reject.isPending

  return (
    <Modal
      open
      onClose={onClose}
      title={action === 'approve' ? 'อนุมัติคำขอ OT' : 'ปฏิเสธคำขอ OT'}
      size="sm"
    >
      <div className="space-y-3">
        <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm space-y-1">
          <p className="font-medium">{item.employeeName}</p>
          <p className="text-muted-foreground">
            {thaiDate(item.date)} · {item.startTime.slice(0,5)}–{item.endTime.slice(0,5)} ({item.totalHours} ชม.)
          </p>
          <p className="text-muted-foreground">{RATE_LABEL[item.rateType]}</p>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">
            {action === 'approve' ? 'ความคิดเห็น (ไม่จำเป็น)' : 'เหตุผลการปฏิเสธ *'}
          </label>
          <textarea
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
            rows={3}
            placeholder={action === 'approve' ? 'ระบุความคิดเห็น...' : 'ระบุเหตุผล...'}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button
            variant={action === 'approve' ? 'default' : 'destructive'}
            loading={isPending}
            onClick={handleSubmit}
          >
            {action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default function OtRequestsPage() {
  const employee = useAuthStore((s) => s.employee)
  const isAdmin     = employee?.roles.some((r) => r.role === 'Admin') ?? false
  const isHr        = employee?.roles.some((r) => r.role === 'Hr') ?? false
  const isSupervisor = employee?.roles.some((r) => r.role === 'Supervisor') ?? false
  const canApprove  = isAdmin || isHr || isSupervisor
  const canSeeAll   = isAdmin || isHr

  const [year, setYear]           = useState(CURRENT_YEAR)
  const [month, setMonth]         = useState<number | undefined>(CURRENT_MONTH)
  const [statusFilter, setStatus] = useState<OtStatus | undefined>(undefined)
  const [companyId, setCompanyId] = useState<string | undefined>(undefined)
  const [action, setAction]       = useState<{ item: OtRequestDto; type: 'approve' | 'reject' } | null>(null)

  const { data: tree = [] } = useCompanies()
  const flatCompanies = tree.flatMap((c) => [c, ...c.children])

  const allQuery  = useAllOtRequests({ companyId, status: statusFilter, year, month })
  const teamQuery = useTeamOtRequests({ status: statusFilter, year, month })

  const queryResult = canSeeAll ? allQuery : teamQuery
  const items = queryResult.data?.items ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">คำขอ OT</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Year */}
        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => (
            <option key={y} value={y}>{y + 543}</option>
          ))}
        </select>

        {/* Month */}
        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={month ?? ''}
          onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">ทุกเดือน</option>
          {MONTH_TH.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>

        {/* Status */}
        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={statusFilter ?? ''}
          onChange={(e) => setStatus((e.target.value || undefined) as OtStatus | undefined)}
        >
          <option value="">ทุกสถานะ</option>
          {(Object.keys(STATUS_LABEL) as OtStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>

        {/* Company (HQ HR / Admin only) */}
        {canSeeAll && flatCompanies.length > 1 && (
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={companyId ?? ''}
            onChange={(e) => setCompanyId(e.target.value || undefined)}
          >
            <option value="">ทุกบริษัท</option>
            {flatCompanies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-lg border border-border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">พนักงาน</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">วันที่</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ช่วงเวลา</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ชั่วโมง</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ประเภท</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">สถานะ</th>
              {canApprove && <th className="px-4 py-3 w-28" />}
            </tr>
          </thead>
          <tbody>
            {queryResult.isLoading && Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} className="border-b border-border">
                {Array.from({ length: canApprove ? 7 : 6 }).map((__, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  </td>
                ))}
              </tr>
            ))}

            {!queryResult.isLoading && items.length === 0 && (
              <tr>
                <td colSpan={canApprove ? 7 : 6} className="px-4 py-12 text-center text-muted-foreground">
                  ไม่พบคำขอ OT ในเงื่อนไขที่เลือก
                </td>
              </tr>
            )}

            {!queryResult.isLoading && items.map((ot) => {
              const isPending = ot.status === 'PendingSupervisor' || ot.status === 'PendingHr'
              return (
                <tr key={ot.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium">{ot.employeeName}</div>
                    {ot.departmentName && <div className="text-xs text-muted-foreground">{ot.departmentName}</div>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{thaiDate(ot.date)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {ot.startTime.slice(0, 5)} – {ot.endTime.slice(0, 5)}
                  </td>
                  <td className="px-4 py-3 font-medium">{ot.totalHours} ชม.</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{RATE_LABEL[ot.rateType]}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[ot.status]}>{STATUS_LABEL[ot.status]}</Badge>
                  </td>
                  {canApprove && (
                    <td className="px-4 py-3">
                      {isPending && (
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-green-600 hover:bg-green-50"
                            title="อนุมัติ"
                            onClick={() => setAction({ item: ot, type: 'approve' })}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-500 hover:bg-red-50"
                            title="ปฏิเสธ"
                            onClick={() => setAction({ item: ot, type: 'reject' })}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {!queryResult.isLoading && items.length > 0 && (
        <p className="text-xs text-muted-foreground">{items.length} รายการ</p>
      )}

      {action && (
        <ActionModal
          item={action.item}
          action={action.type}
          onClose={() => setAction(null)}
        />
      )}
    </div>
  )
}
