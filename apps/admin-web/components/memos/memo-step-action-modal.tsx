'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle2, CornerUpLeft, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { MemoAttachmentPicker } from '@/components/memos/memo-attachment-picker'
import {
  useApproveMemoStep, useCompleteMemoStep, useRejectMemoStep, useReturnMemoStep,
} from '@/hooks/use-memo'
import type {
  MemoAttachmentInput, MemoReturnTargetDto, MemoStepInstanceDto,
} from '@hrms/shared-types'
import { useApiError } from '@/hooks/use-api-error'

// 'decide' = หน้าจอหลักของขั้น Approval · reject/return = ขอเหตุผลก่อนยืนยัน
type ApprovalMode = 'decide' | 'reject' | 'return'

const REQUESTER_KEY = 'requester'

// ปลายทาง "ผู้ขอ" ไม่มี stepInstanceId — ใช้คีย์คงที่แทนเพื่อให้ select ผูกค่าได้
function targetKey(target?: MemoReturnTargetDto) {
  return target?.stepInstanceId ?? REQUESTER_KEY
}

// ข้อความจาก API ยังเป็นไทย (รอ Phase 3) — fallback ส่งเข้ามาจากคำแปล
/**
 * modal ดำเนินการขั้นตอนปัจจุบัน — แยกจากหน้าหลักเพื่อให้ทบทวนก่อนกดยืนยัน
 * (ปิดขั้นตอนแล้วเรื่องเดินหน้าทันที ย้อนไม่ได้ ต่างจากบันทึกความคืบหน้าที่แก้ทีหลังได้)
 *
 * กติกาย้อนขั้นต่างกันตามชนิดของขั้น — ขั้นอนุมัติคือผู้ตัดสินจึงเลือกจุดกลับได้ทุกขั้นก่อนหน้า
 * หรือย้อนถึงผู้ขอ ส่วนขั้นดำเนินการเป็นผู้ทำงาน ส่งคืนได้แค่คนที่ส่งงานมาให้เท่านั้น
 * (server เป็นคนคำนวณ step.returnTargets — ที่นี่แค่แสดงตามที่ได้มา)
 */
export function MemoStepActionModal({
  memoId,
  step,
  onClose,
}: {
  memoId: string
  step: MemoStepInstanceDto
  onClose: () => void
}) {
  const t = useTranslations('admin.memo.stepAction')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const returnTargets = step.returnTargets ?? []
  const [note, setNote] = useState('')
  const [reason, setReason] = useState('')
  const [attachments, setAttachments] = useState<MemoAttachmentInput[]>([])
  const [mode, setMode] = useState<ApprovalMode>('decide')
  const [error, setError] = useState<string | null>(null)
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
  const returnLabel = isWork ? t('returnWork') : t('returnApproval')

  async function run(action: () => Promise<unknown>) {
    setError(null)
    try {
      await action()
      onClose()
    } catch (actionError) {
      setError(apiError(actionError, t('failed')))
    }
  }

  function submitReturn() {
    return back.mutateAsync({
      memoId,
      stepId: step.id,
      reason: reason.trim(),
      targetStepInstanceId: selectedTarget?.stepInstanceId,
      toRequester: !selectedTarget?.stepInstanceId,
    })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isWork ? t('titleWork', { step: step.label }) : t('titleApproval', { step: step.label })}
      size="md"
    >
      <div className="space-y-4">
        {/* บอกผลของการกดยืนยันไว้ก่อน — ผู้ใช้จะรู้ว่ากดแล้วเกิดอะไรขึ้นกับเรื่อง */}
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
          {/* selectedTarget.label = ชื่อขั้นตอนที่ HR ตั้งเอง (ข้อมูล ไม่แปล) */}
          <p className="text-sm font-semibold">
            {mode === 'reject'
              ? t('banner.rejectTitle')
              : mode === 'return'
                ? selectedTarget?.stepInstanceId
                  ? t('banner.returnToStepTitle', { step: selectedTarget.label })
                  : t('banner.returnToRequesterTitle')
                : t('banner.decideTitle')}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {mode === 'reject'
              ? t('banner.rejectBody')
              : mode === 'return'
                ? selectedTarget?.stepInstanceId
                  ? t('banner.returnToStepBody')
                  : t('banner.returnToRequesterBody')
                : isWork
                  ? t('banner.decideWorkBody')
                  : t('banner.decideApprovalBody')}
          </p>
        </div>

        {mode === 'decide' ? (
          <>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">
                {isWork ? t('noteWork') : t('noteApproval')}
                <span className="ml-1 text-xs font-normal text-muted-foreground">{t('optional')}</span>
              </span>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                maxLength={1000}
                rows={4}
                placeholder={isWork ? t('notePlaceholderWork') : t('notePlaceholderApproval')}
                className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </label>

            {/* ขั้นอนุมัติไม่แนบไฟล์ — เอกสารเป็นหน้าที่ของขั้นดำเนินการ */}
            {isWork && (
              <div className="space-y-1.5">
                <span className="text-sm font-medium">{t('attachments')}</span>
                <MemoAttachmentPicker value={attachments} onChange={setAttachments} disabled={busy} />
              </div>
            )}
          </>
        ) : (
          <>
            {/* ขั้นดำเนินการมีปลายทางเดียวจึงไม่ต้องเลือก — แสดงเป็นข้อความในกล่องเตือนด้านบนพอ */}
            {mode === 'return' && returnTargets.length > 1 && (
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">
                  {t('returnTo')} <span className="text-destructive">*</span>
                </span>
                <select
                  value={selectedKey}
                  onChange={e => setSelectedKey(e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                >
                  {returnTargets.map(target => (
                    <option key={targetKey(target)} value={targetKey(target)}>
                      {target.stepInstanceId
                        ? t('targetStep', { order: target.sortOrder, label: target.label })
                        : target.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block space-y-1.5">
              <span className="text-sm font-medium">
                {t('reason')} <span className="text-destructive">*</span>
              </span>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                maxLength={1000}
                rows={4}
                placeholder={mode === 'reject' ? t('reasonPlaceholderReject') : t('reasonPlaceholderReturn')}
                className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
          </>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          {mode === 'decide' ? (
            <>
              <Button variant="outline" disabled={busy} onClick={onClose}>{tCommon('action.cancel')}</Button>

              {isWork ? (
                <>
                  {canReturn && (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => { setMode('return'); setError(null) }}
                      className="border-amber-500 text-amber-700 hover:bg-amber-50 dark:text-amber-400"
                    >
                      <CornerUpLeft className="h-4 w-4" /> {returnLabel}
                    </Button>
                  )}
                  <Button
                    loading={busy}
                    onClick={() => run(() => complete.mutateAsync({
                      memoId, stepId: step.id, note: note.trim() || undefined,
                      attachments: attachments.length ? attachments : undefined,
                    }))}
                  >
                    <CheckCircle2 className="h-4 w-4" /> {t('confirmComplete')}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => { setMode('reject'); setError(null) }}
                    className="border-red-500 text-red-600 hover:bg-red-50 dark:text-red-400"
                  >
                    <XCircle className="h-4 w-4" /> {t('reject')}
                  </Button>
                  {canReturn && (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => { setMode('return'); setError(null) }}
                      className="border-amber-500 text-amber-700 hover:bg-amber-50 dark:text-amber-400"
                    >
                      <CornerUpLeft className="h-4 w-4" /> {returnLabel}
                    </Button>
                  )}
                  <Button
                    loading={busy}
                    onClick={() => run(() => approve.mutateAsync({
                      memoId, stepId: step.id, comment: note.trim() || undefined,
                    }))}
                  >
                    <CheckCircle2 className="h-4 w-4" /> {t('approve')}
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => { setMode('decide'); setReason(''); setError(null) }}
              >
                {tCommon('action.back')}
              </Button>
              <Button
                variant="destructive"
                loading={busy}
                disabled={busy || !reason.trim()}
                onClick={() => run(() => (mode === 'reject'
                  ? reject.mutateAsync({ memoId, stepId: step.id, reason: reason.trim() })
                  : submitReturn()))}
                className={mode === 'return' ? 'bg-amber-600 hover:bg-amber-700' : undefined}
              >
                {mode === 'reject' ? t('confirmReject') : t('confirmReturn', { action: returnLabel })}
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
