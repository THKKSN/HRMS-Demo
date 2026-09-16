'use client'

import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { localizedName, type Locale } from '@hrms/i18n'
import * as fmt from '@hrms/i18n/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useAllOtRequests, useTeamOtRequests, useApproveOtRequest, useRejectOtRequest } from '@/hooks/use-ot-requests'
import { useCompanies } from '@/hooks/use-companies'
import { usePermissionGate } from '@/hooks/use-permission-gate'
import type { OtRequestDto, OtStatus } from '@hrms/shared-types'

const CURRENT_YEAR = new Date().getFullYear()
const CURRENT_MONTH = new Date().getMonth() + 1

// ป้ายสถานะ/อัตราค่าล่วงเวลาอยู่ที่ @hrms/i18n/labels (status.ot, status.otRate) — ที่นี่เหลือแค่โทนสี
const OT_STATUSES: OtStatus[] = ['PendingSupervisor', 'PendingHr', 'Approved', 'Rejected', 'Cancelled']

const STATUS_VARIANT: Record<OtStatus, 'warning' | 'info' | 'success' | 'destructive' | 'secondary'> = {
  PendingSupervisor: 'warning',
  PendingHr: 'info',
  Approved: 'success',
  Rejected: 'destructive',
  Cancelled: 'secondary',
}

/** วันที่จาก API เป็น `yyyy-MM-dd` ล้วน — สร้าง Date แบบ local ตรง ๆ กันเลื่อนวันจาก timezone */
function otDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return fmt.formatDate(new Date(y, m - 1, d), { day: 'numeric', month: 'short', year: 'numeric' })
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
  const t = useTranslations('admin.approval.ot')
  const tRate = useTranslations('status.otRate')
  const tCommon = useTranslations('common')
  const [comment, setComment] = useState('')
  const approve = useApproveOtRequest()
  const reject  = useRejectOtRequest()

  async function handleSubmit() {
    try {
      if (action === 'approve') {
        await approve.mutateAsync({ id: item.id, comment: comment || undefined })
        toast.success(t('approved'))
      } else {
        if (!comment.trim()) { toast.error(t('reasonRequired')); return }
        await reject.mutateAsync({ id: item.id, comment })
        toast.success(t('rejected'))
      }
      onClose()
    } catch {
      toast.error(tCommon('state.error'))
    }
  }

  const isPending = approve.isPending || reject.isPending

  return (
    <Modal
      open
      onClose={onClose}
      title={action === 'approve' ? t('approveTitle') : t('rejectTitle')}
      size="sm"
    >
      <div className="space-y-3">
        <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm space-y-1">
          <p className="font-medium">{item.employeeName}</p>
          <p className="text-muted-foreground">
            {t('summary', {
              date: otDate(item.date),
              range: tCommon('time.range', { from: item.startTime.slice(0, 5), to: item.endTime.slice(0, 5) }),
              hours: tCommon('duration.hoursShort', { count: item.totalHours }),
            })}
          </p>
          <p className="text-muted-foreground">{tRate(item.rateType)}</p>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">
            {action === 'approve' ? t('commentOptional') : t('rejectReason')}
          </label>
          <textarea
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
            rows={3}
            placeholder={action === 'approve' ? t('commentPlaceholder') : t('reasonPlaceholder')}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>{tCommon('action.cancel')}</Button>
          <Button
            variant={action === 'approve' ? 'default' : 'destructive'}
            loading={isPending}
            onClick={handleSubmit}
          >
            {action === 'approve' ? t('approve') : t('reject')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default function OtRequestsPage() {
  const t = useTranslations('admin.approval.ot')
  const tStatus = useTranslations('status.ot')
  const tRate = useTranslations('status.otRate')
  const tCommon = useTranslations('common')
  const locale = useLocale() as Locale
  const { has, hasAny } = usePermissionGate()
  const canApprove = hasAny(['ot:approve-supervisor', 'ot:approve-hr'], ['Admin', 'Hr', 'Supervisor'])
  const canSeeAll  = has('ot:view-all', ['Admin', 'Hr'])

  const [year, setYear]           = useState(CURRENT_YEAR)
  const [month, setMonth]         = useState<number | undefined>(CURRENT_MONTH)
  const [statusFilter, setStatus] = useState<OtStatus | undefined>(undefined)
  const [companyId, setCompanyId] = useState<string | undefined>(undefined)
  const [action, setAction]       = useState<{ item: OtRequestDto; type: 'approve' | 'reject' } | null>(null)

  const { data: tree = [] } = useCompanies()
  const flatCompanies = tree.flatMap((c) => [c, ...c.children])

  // ชื่อเดือนตามภาษาที่เลือก — เดิม hardcode ตัวย่อภาษาไทยไว้ในไฟล์
  const monthNames = useMemo(
    () => Array.from({ length: 12 }, (_, index) =>
      fmt.formatDate(new Date(CURRENT_YEAR, index, 1), { month: 'short' })),
    [locale],
  )

  const allQuery  = useAllOtRequests({ companyId, status: statusFilter, year, month })
  const teamQuery = useTeamOtRequests({ status: statusFilter, year, month })

  const queryResult = canSeeAll ? allQuery : teamQuery
  const items = queryResult.data?.items ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t('title')}</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Year */}
        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {/* ปีแสดงตามปฏิทินของภาษา (ไทยเป็น พ.ศ. อัตโนมัติ) — เดิมบวก 543 เองในโค้ด */}
          {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => (
            <option key={y} value={y}>{fmt.formatYear(y)}</option>
          ))}
        </select>

        {/* Month */}
        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={month ?? ''}
          onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">{t('allMonths')}</option>
          {monthNames.map((name, i) => (
            <option key={i + 1} value={i + 1}>{name}</option>
          ))}
        </select>

        {/* Status */}
        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={statusFilter ?? ''}
          onChange={(e) => setStatus((e.target.value || undefined) as OtStatus | undefined)}
        >
          <option value="">{t('allStatuses')}</option>
          {OT_STATUSES.map((s) => (
            <option key={s} value={s}>{tStatus(s)}</option>
          ))}
        </select>

        {/* Company (HQ HR / Admin only) */}
        {canSeeAll && flatCompanies.length > 1 && (
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={companyId ?? ''}
            onChange={(e) => setCompanyId(e.target.value || undefined)}
          >
            <option value="">{t('allCompanies')}</option>
            {flatCompanies.map((c) => (
              <option key={c.id} value={c.id}>{localizedName(c, locale)}</option>
            ))}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-lg border border-border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('colEmployee')}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('colDate')}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('colTimeRange')}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('colHours')}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('colRate')}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('colStatus')}</th>
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
                  {t('empty')}
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
                  <td className="px-4 py-3 text-muted-foreground">{otDate(ot.date)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {ot.startTime.slice(0, 5)} – {ot.endTime.slice(0, 5)}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {tCommon('duration.hoursShort', { count: ot.totalHours })}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{tRate(ot.rateType)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[ot.status]}>{tStatus(ot.status)}</Badge>
                  </td>
                  {canApprove && (
                    <td className="px-4 py-3">
                      {isPending && (
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-green-600 hover:bg-green-50"
                            title={t('approve')}
                            onClick={() => setAction({ item: ot, type: 'approve' })}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-500 hover:bg-red-50"
                            title={t('reject')}
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
        <p className="text-xs text-muted-foreground">{t('count', { count: items.length })}</p>
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
