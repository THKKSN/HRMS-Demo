'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  CheckCircle2, ClipboardCheck, CornerUpLeft, FileText, Loader2, PackageCheck,
  SendHorizonal, Truck, Wrench, XCircle,
} from 'lucide-react'
import type { MemoStatus } from '@hrms/shared-types'
import { PageHeader } from '@/components/layout/page-header'
import { MemoActivitySection } from '@/components/memos/memo-activity-section'
import { MemoAttachmentList } from '@/components/memos/memo-attachment-list'
import { MemoResubmitSheet } from '@/components/memos/memo-resubmit-sheet'
import { MemoStatusStationLine } from '@/components/memos/memo-status-station'
import { MemoStepActionSheet } from '@/components/memos/memo-step-action-sheet'
import { useFmt } from '@/hooks/use-fmt'
import {
  useAcknowledgeMemo, useApproveMemo, useDeliverMemo, useMemoDetail, useReceiveMemo, useRejectMemo,
} from '@/hooks/use-memo'
import { useApiError } from '@/hooks/use-api-error'
import { hasPermission } from '@/lib/auth-utils'
import { useAuthStore } from '@/stores/auth.store'

const STATUS_CLASS: Record<MemoStatus, string> = {
  Draft: 'border-slate-200 bg-slate-50 text-slate-700',
  Pending: 'border-amber-200 bg-amber-50 text-amber-700',
  Approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Rejected: 'border-red-200 bg-red-50 text-red-700',
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

export default function MemoDetailPage() {
  const t = useTranslations('liff.memo.detail')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const tStatus = useTranslations('status.memo')
  const fmt = useFmt()
  const { id } = useParams<{ id: string }>()
  const { data: memo, isLoading } = useMemoDetail(id)
  const { mutateAsync: receiveMemo, isPending: isReceiving } = useReceiveMemo()
  const approveMemo = useApproveMemo()
  const rejectMemo = useRejectMemo()
  const acknowledgeMemo = useAcknowledgeMemo()
  const deliverMemo = useDeliverMemo()
  // modal ยืนยัน อนุมัติ/ไม่อนุมัติ — comment เป็น optional ทั้งสองกรณี
  const [actionModal, setActionModal] = useState<'approve' | 'reject' | null>(null)
  const [actionComment, setActionComment] = useState('')
  const [stepSheetOpen, setStepSheetOpen] = useState(false)
  const [resubmitSheetOpen, setResubmitSheetOpen] = useState(false)

  const employee = useAuthStore(s => s.employee)
  const canApprove = hasPermission(employee, 'memo:approve', ['Executive', 'Admin'])
  // memo:view-inbox ครอบคลุมรับทราบ/ส่งมอบของแผนกปลายทาง (ตามคำอธิบาย permission ใน seeder)
  const isSupervisor = hasPermission(employee, 'memo:view-inbox', ['Supervisor'])
  const actionBusy = approveMemo.isPending || rejectMemo.isPending
    || acknowledgeMemo.isPending || deliverMemo.isPending

  const errorMessage = (error: unknown) => apiError(error, t('actionFailed'))
  const dateTime = (value?: string) => (value ? fmt.formatDateTime(new Date(value)) : undefined)

  async function handleReceive() {
    if (!window.confirm(t('confirmReceive'))) return
    try {
      await receiveMemo(id)
    } catch {
      window.alert(t('receiveFailed'))
    }
  }

  function closeActionModal() {
    setActionModal(null)
    setActionComment('')
  }

  async function handleConfirmAction() {
    const comment = actionComment.trim() || undefined
    try {
      if (actionModal === 'approve') await approveMemo.mutateAsync({ id, comment })
      else if (actionModal === 'reject') await rejectMemo.mutateAsync({ id, reason: comment })
      closeActionModal()
    } catch (error) {
      window.alert(errorMessage(error))
    }
  }

  async function handleAcknowledge() {
    if (!window.confirm(t('confirmAcknowledge'))) return
    try {
      await acknowledgeMemo.mutateAsync(id)
    } catch (error) {
      window.alert(errorMessage(error))
    }
  }

  async function handleDeliver() {
    if (!window.confirm(t('confirmDeliver'))) return
    try {
      await deliverMemo.mutateAsync(id)
    } catch (error) {
      window.alert(errorMessage(error))
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 pb-24">
        <PageHeader title={t('title')} backHref="/memos/my" />
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
        <PageHeader title={t('title')} backHref="/memos/my" />
        <div className="px-6 py-16 text-center text-sm text-muted-foreground">{t('notFound')}</div>
      </div>
    )
  }

  const steps = memo.steps ?? []
  // ขั้นที่ผู้ใช้คนนี้ลงมือได้ — server คำนวณ canAct มาให้แล้ว
  const actionableStep = steps.find(s => s.status === 'Current' && s.canAct)
  // เรื่องที่ตั้งขั้นตอนไว้ ต้องทำครบทุกขั้นก่อนจึงส่งมอบได้ (backend guard อีกชั้น)
  const stepsPending = steps.some(s => s.status !== 'Done')

  const showReceivePrompt = memo.status === 'Approved' && !!memo.deliveredAt && !memo.receivedAt
  const showApprovePanel = memo.status === 'Pending' && canApprove
  const showAcknowledge = memo.status === 'Approved' && !memo.acknowledgedAt && isSupervisor
  const showDeliver = memo.status === 'Approved' && !!memo.acknowledgedAt
    && !memo.deliveredAt && !stepsPending && isSupervisor
  // เรื่องถูกขั้นอนุมัติตีกลับมา — ผู้ขอเป็นคนเดียวที่ปลดล็อกให้ workflow เดินต่อได้
  const showResubmit = !!memo.canResubmit
  // มี action ให้กด → แสดงแถบปุ่ม fixed เหนือ bottom nav (เผื่อ padding ล่างเพิ่ม)
  const hasFixedAction = showApprovePanel || showAcknowledge || showDeliver
    || showReceivePrompt || showResubmit || !!actionableStep

  return (
    <div className={`min-h-screen bg-muted/30 ${hasFixedAction ? 'pb-44' : 'pb-24'}`}>
      {/* memoTypeName / *NameSnapshot / companyName / departmentName เป็นชื่อไทยจาก API — รอปรับ DTO ฝั่งผู้บริโภค (ดูแผน Phase 1) */}
      <PageHeader title={memo.memoNo} subtitle={memo.memoTypeName} backHref="/memos/my" />

      {/* แถบสถานะ + สถานีเต็มความกว้าง วางต่อจาก header เหมือนหน้ารายละเอียด ticket */}
      <div className="border-b border-border bg-background px-4 py-3">
        <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[memo.status]}`}>
          {tStatus(memo.status)}
        </span>
      </div>

      <MemoStatusStationLine memo={memo} />

      {/* เอกสารแนบ + บันทึกความคืบหน้า — ใช้ Section เต็มความกว้างแบบหน้ารายละเอียด ticket */}
      <div className="overflow-hidden">
        <MemoAttachmentList attachments={memo.attachments ?? []} steps={steps} />
        <MemoActivitySection
          memoId={id}
          activities={memo.activities ?? []}
          canAdd={!!memo.canAddActivity}
        />
      </div>
      <div className="space-y-3 p-4">
        <div className="overflow-hidden rounded-2xl border border-border bg-background">
          <DetailRow icon={FileText} label={t('memoNo')} value={memo.memoNo} />
          <div className="border-t border-border" />
          <DetailRow icon={FileText} label={t('type')} value={`${memo.memoTypeName} / ${memo.memoCategoryNameSnapshot} / ${memo.memoSubCategoryNameSnapshot}`} />
          <div className="border-t border-border" />
          <DetailRow icon={FileText} label={t('company')} value={memo.companyName} />
          <div className="border-t border-border" />
          <DetailRow icon={FileText} label={t('department')} value={memo.departmentName} />
        </div>

        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="mb-1 text-xs text-muted-foreground">{t('detail')}</p>
          <p className="whitespace-pre-wrap text-sm font-semibold">{memo.detail}</p>
        </div>

        {memo.status === 'Approved' && memo.approveComment && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
            <p className="mb-1 text-xs text-muted-foreground">{t('approveComment')}</p>
            <p className="whitespace-pre-wrap text-sm font-semibold">{memo.approveComment}</p>
          </div>
        )}

        {memo.status === 'Rejected' && memo.rejectReason && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            <p className="mb-1 text-xs text-muted-foreground">{t('rejectReason')}</p>
            <p className="whitespace-pre-wrap text-sm font-semibold">{memo.rejectReason}</p>
          </div>
        )}

        {/* Status Station บอกไม่ได้ว่าเรื่องถูกพักรอผู้ขอ เพราะไม่มีสถานีไหนเป็นคิวปัจจุบัน */}
        {memo.returnedToRequesterAt && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-50">
            <p className="flex items-center gap-1.5 text-sm font-bold">
              <CornerUpLeft className="h-4 w-4" /> {t('returnedTitle')}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{memo.returnedToRequesterReason ?? t('noReason')}</p>
            <p className="mt-1.5 text-xs opacity-80">
              {t('returnedBody')}
              {dateTime(memo.returnedToRequesterAt) ? ` · ${dateTime(memo.returnedToRequesterAt)}` : ''}
            </p>
          </div>
        )}

        {/* ข้อความอธิบายสถานะที่รอ action — ตัวปุ่มอยู่แถบ fixed ด้านล่างจอ */}
        {showApprovePanel && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-900">{t('awaitingYourApproval')}</p>
          </div>
        )}
        {showAcknowledge && (
          <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-violet-900">
            <p className="text-sm">{t('awaitingAck')}</p>
          </div>
        )}
        {showDeliver && (
          <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-teal-900">
            <p className="text-sm">{t('awaitingDeliver')}</p>
          </div>
        )}
        {showReceivePrompt && (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sky-800">
            <p className="text-sm">
              {t('deliveredPrompt', { name: memo.deliveredByName ?? '—', time: dateTime(memo.deliveredAt) ?? '—' })}
            </p>
          </div>
        )}

        {/* บันทึกผลรายขั้นตอนที่ปิดไปแล้ว — step.label เป็นชื่อขั้นตอนที่ HR ตั้งเอง */}
        {steps.some(s => s.actionNote) && (
          <div className="overflow-hidden rounded-2xl border border-border bg-background">
            <p className="border-b border-border px-4 py-3 text-sm font-semibold">{t('stepNotes')}</p>
            {steps.filter(s => s.actionNote).map(step => (
              <div key={step.id} className="border-b border-border px-4 py-3 last:border-0">
                <p className="text-xs text-muted-foreground">
                  {step.label}{step.actedByName ? ` · ${step.actedByName}` : ''}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{step.actionNote}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* แถบปุ่ม action ลอยเหนือ bottom nav (nav สูง h-16) */}
      {hasFixedAction && (
        <div className="fixed bottom-16 left-1/2 z-40 w-full max-w-107.5 -translate-x-1/2 border-t border-border bg-background/95 p-3 backdrop-blur">
          {/* ขั้นตอนที่ตั้งค่าไว้มาก่อน action ประจำสถานะ — เป็นงานที่รอคนนี้อยู่จริง */}
          {actionableStep && (
            <button
              type="button"
              onClick={() => setStepSheetOpen(true)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0f8f72] text-sm font-bold text-white"
            >
              {actionableStep.stepKind === 'Work'
                ? <><Wrench className="h-4 w-4" /> {t('actStep', { label: actionableStep.label })}</>
                : <><ClipboardCheck className="h-4 w-4" /> {t('decideStep', { label: actionableStep.label })}</>}
            </button>
          )}
          {showResubmit && (
            <button
              type="button"
              onClick={() => setResubmitSheetOpen(true)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-600 text-sm font-bold text-white"
            >
              <SendHorizonal className="h-4 w-4" /> {t('resubmit')}
            </button>
          )}
          {showApprovePanel && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActionModal('approve')}
                disabled={actionBusy}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" /> {t('approve')}
              </button>
              <button
                type="button"
                onClick={() => setActionModal('reject')}
                disabled={actionBusy}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-red-300 bg-white text-sm font-bold text-red-600 disabled:opacity-60"
              >
                <XCircle className="h-4 w-4" /> {t('reject')}
              </button>
            </div>
          )}
          {showAcknowledge && (
            <button
              type="button"
              onClick={handleAcknowledge}
              disabled={actionBusy}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-bold text-white disabled:opacity-60"
            >
              {acknowledgeMemo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {t('acknowledge')}
            </button>
          )}
          {showDeliver && (
            <button
              type="button"
              onClick={handleDeliver}
              disabled={actionBusy}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 text-sm font-bold text-white disabled:opacity-60"
            >
              {deliverMemo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
              {t('deliver')}
            </button>
          )}
          {showReceivePrompt && (
            <button
              type="button"
              onClick={handleReceive}
              disabled={isReceiving}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0f8f72] text-sm font-bold text-white disabled:opacity-60"
            >
              {isReceiving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
              {t('receive')}
            </button>
          )}
        </div>
      )}

      {stepSheetOpen && actionableStep && (
        <MemoStepActionSheet
          memoId={id}
          step={actionableStep}
          onClose={() => setStepSheetOpen(false)}
        />
      )}

      {resubmitSheetOpen && (
        <MemoResubmitSheet memo={memo} onClose={() => setResubmitSheetOpen(false)} />
      )}

      {/* Modal ยืนยันอนุมัติ/ไม่อนุมัติ พร้อมช่องความเห็น (ไม่บังคับ) */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={actionBusy ? undefined : closeActionModal} />
          <div className="relative z-10 w-full max-w-md rounded-t-2xl bg-background p-5 shadow-xl sm:rounded-2xl">
            <p className="text-base font-bold">
              {actionModal === 'approve' ? t('approveModalTitle') : t('rejectModalTitle')}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('modalSubject', { type: memo.memoTypeName, name: memo.requesterName })}
            </p>
            <label className="mt-4 block text-sm font-semibold">
              {actionModal === 'approve' ? t('approveCommentLabel') : t('rejectReasonLabel')}
            </label>
            <textarea
              rows={3}
              maxLength={1000}
              value={actionComment}
              onChange={event => setActionComment(event.target.value)}
              placeholder={t('commentPlaceholder')}
              className="mt-2 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={closeActionModal}
                disabled={actionBusy}
                className="h-11 flex-1 rounded-xl border border-border bg-background text-sm font-semibold disabled:opacity-60"
              >
                {tCommon('action.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={actionBusy}
                className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white disabled:opacity-60 ${
                  actionModal === 'approve' ? 'bg-emerald-600' : 'bg-red-600'
                }`}
              >
                {actionBusy
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : actionModal === 'approve' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {actionModal === 'approve' ? t('confirmApprove') : t('confirmReject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
