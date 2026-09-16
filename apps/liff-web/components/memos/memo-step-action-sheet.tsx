'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle2, CornerUpLeft, Loader2, XCircle } from 'lucide-react'
import type {
  MemoAttachmentInput, MemoReturnTargetDto, MemoStepInstanceDto,
} from '@hrms/shared-types'
import { BottomSheet } from '@/components/shared/bottom-sheet'
import { MemoAttachmentPicker } from '@/components/memos/memo-attachment-picker'
import { useRunWithToast } from '@/components/memos/memo-detail-shared'
import {
  useApproveMemoStep, useCompleteMemoStep, useRejectMemoStep, useReturnMemoStep,
} from '@/hooks/use-memo'

// 'decide' = หน้าจอหลักของขั้น Approval · reject/return = ขอเหตุผลก่อนยืนยัน
type ApprovalMode = 'decide' | 'reject' | 'return'

const REQUESTER_KEY = 'requester'

// ปลายทาง "ผู้ขอ" ไม่มี stepInstanceId — ใช้คีย์คงที่แทนเพื่อให้ select ผูกค่าได้
function targetKey(target?: MemoReturnTargetDto) {
  return target?.stepInstanceId ?? REQUESTER_KEY
}

/**
 * ดำเนินการขั้นตอนปัจจุบันบนมือถือ — เปิดเป็นแผ่นเลื่อนขึ้น
 * มีกล่องบอกผลลัพธ์ก่อนกด เพราะปิดขั้นตอนแล้วเรื่องเดินหน้าทันที ย้อนไม่ได้
 *
 * ขั้นอนุมัติคือผู้ตัดสิน เลือกจุดย้อนได้ทุกขั้นก่อนหน้าหรือย้อนถึงผู้ขอ
 * ส่วนขั้นดำเนินการเป็นผู้ทำงาน ส่งคืนได้แค่คนที่ส่งงานมาให้ (server คำนวณ step.returnTargets มาให้แล้ว)
 * step.label / target.label เป็นชื่อขั้นตอนที่ HR ตั้งเอง (ข้อมูล) — ไม่แปล
 */
export function MemoStepActionSheet({
  memoId,
  step,
  onClose,
}: {
  memoId: string
  step: MemoStepInstanceDto
  onClose: () => void
}) {
  const t = useTranslations('liff.memo.stepAction')
  const tCommon = useTranslations('common')
  const runWithToast = useRunWithToast()
  const returnTargets = step.returnTargets ?? []
  const [note, setNote] = useState('')
  const [reason, setReason] = useState('')
  const [attachments, setAttachments] = useState<MemoAttachmentInput[]>([])
  const [mode, setMode] = useState<ApprovalMode>('decide')
  // ปลายทางเรียงตามลำดับ workflow — ตัวสุดท้ายคือขั้นก่อนหน้าติดกัน ซึ่งเป็นค่าที่ใช้บ่อยที่สุด
  const [selectedKey, setSelectedKey] = useState(() => targetKey(returnTargets.at(-1)))

  const complete = useCompleteMemoStep()
  const approve = useApproveMemoStep()
  const reject = useRejectMemoStep()
  const back = useReturnMemoStep()
  const busy = complete.isPending || approve.isPending || reject.isPending || back.isPending

  const isWork = step.stepKind === 'Work'
  const canReturn = returnTargets.length > 0
  const selectedTarget = returnTargets.find(target => targetKey(target) === selectedKey)
  const toRequester = !selectedTarget?.stepInstanceId
  const returnLabel = isWork ? t('returnPrev') : t('returnEdit')
  const confirmReturnLabel = isWork ? t('confirmReturnPrev') : t('confirmReturnEdit')

  async function run(action: () => Promise<unknown>, message: string) {
    if (await runWithToast(action, message, tCommon('state.error'))) onClose()
  }

  function confirmReason() {
    if (mode === 'reject') {
      return run(
        () => reject.mutateAsync({ memoId, stepId: step.id, reason: reason.trim() }),
        t('toast.rejected'))
    }
    return run(
      () => back.mutateAsync({
        memoId,
        stepId: step.id,
        reason: reason.trim(),
        targetStepInstanceId: selectedTarget?.stepInstanceId,
        toRequester,
      }),
      toRequester ? t('toast.returnedToRequester') : t('toast.returnedToStep', { label: selectedTarget?.label ?? '' }))
  }

  const heading = mode === 'reject'
    ? t('rejectHeading')
    : mode === 'return'
      ? toRequester
        ? t('returnToRequesterHeading')
        : t('returnToStepHeading', { label: selectedTarget?.label ?? '' })
      : t('reviewHeading')

  const body = mode === 'reject'
    ? t('rejectBody')
    : mode === 'return'
      ? toRequester ? t('returnToRequesterBody') : t('returnToStepBody')
      : isWork ? t('workBody') : t('approveBody')

  return (
    <BottomSheet
      title={isWork ? t('workTitle', { label: step.label }) : t('approvalTitle', { label: step.label })}
      onClose={onClose}
    >
      <div className="space-y-4">
        {/* บอกผลของการกดยืนยันไว้ก่อน — ผู้ใช้จะรู้ว่ากดแล้วเกิดอะไรขึ้นกับเรื่อง */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
          <p className="text-sm font-semibold">{heading}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{body}</p>
        </div>

        {mode === 'decide' ? (
          <>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">
                {isWork ? t('workNote') : t('approveNote')}
                <span className="ml-1 text-xs font-normal text-muted-foreground">{t('notRequired')}</span>
              </span>
              <textarea
                rows={4}
                maxLength={1000}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder={isWork ? t('workNotePlaceholder') : t('approveNotePlaceholder')}
                className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
              />
            </label>

            {/* ขั้นอนุมัติไม่แนบไฟล์ — เอกสารเป็นหน้าที่ของขั้นดำเนินการ */}
            {isWork && (
              <div className="space-y-1.5">
                <span className="text-sm font-semibold">{t('attachments')}</span>
                <MemoAttachmentPicker value={attachments} onChange={setAttachments} disabled={busy} />
              </div>
            )}
          </>
        ) : (
          <>
            {/* ขั้นดำเนินการมีปลายทางเดียว ไม่ต้องเลือก — กล่องเตือนด้านบนบอกไปแล้วว่าไปไหน */}
            {mode === 'return' && returnTargets.length > 1 && (
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold">
                  {t('returnTarget')} <span className="text-destructive">*</span>
                </span>
                <select
                  value={selectedKey}
                  onChange={e => setSelectedKey(e.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                >
                  {returnTargets.map(target => (
                    <option key={targetKey(target)} value={targetKey(target)}>
                      {target.stepInstanceId ? t('stepOption', { order: target.sortOrder, label: target.label }) : target.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">
                {t('reason')} <span className="text-destructive">*</span>
              </span>
              <textarea
                autoFocus
                rows={4}
                maxLength={1000}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder={mode === 'reject' ? t('rejectReasonPlaceholder') : t('returnReasonPlaceholder')}
                className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
              />
            </label>
          </>
        )}

        {/* ปุ่มสูง h-12 ให้กดง่ายบนมือถือ เรียงเป็นแถวเต็มความกว้าง */}
        {mode === 'decide' ? (
          <div className="space-y-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => (isWork
                ? run(() => complete.mutateAsync({
                    memoId, stepId: step.id, note: note.trim() || undefined,
                    attachments: attachments.length ? attachments : undefined,
                  }), t('toast.completed'))
                : run(() => approve.mutateAsync({
                    memoId, stepId: step.id, comment: note.trim() || undefined,
                  }), t('toast.approved')))}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {isWork ? t('confirmWork') : t('approve')}
            </button>

            {canReturn && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setMode('return')}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white text-sm font-bold text-amber-700 disabled:opacity-60 dark:bg-slate-900 dark:text-amber-400"
              >
                <CornerUpLeft className="h-4 w-4" /> {returnLabel}
              </button>
            )}

            {/* ปิดเรื่องเป็นสิทธิ์ของขั้นอนุมัติเท่านั้น ขั้นดำเนินการส่งคืนงานได้อย่างเดียว */}
            {!isWork && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setMode('reject')}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-300 bg-white text-sm font-bold text-red-600 disabled:opacity-60 dark:bg-slate-900 dark:text-red-400"
              >
                <XCircle className="h-4 w-4" /> {t('reject')}
              </button>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="h-12 w-full rounded-xl border border-border bg-background text-sm font-semibold disabled:opacity-60"
            >
              {tCommon('action.cancel')}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              disabled={busy || !reason.trim()}
              onClick={confirmReason}
              className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white disabled:opacity-60 ${
                mode === 'reject' ? 'bg-red-600' : 'bg-amber-600'
              }`}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'reject' ? t('confirmReject') : confirmReturnLabel}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => { setMode('decide'); setReason('') }}
              className="h-12 w-full rounded-xl border border-border bg-background text-sm font-semibold disabled:opacity-60"
            >
              {tCommon('action.back')}
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
