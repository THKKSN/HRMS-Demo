'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeft, CheckCircle2, Clock, Printer, Truck, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Modal } from '@/components/ui/modal'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { MemoDetailBody } from '@/components/memos/memo-detail-body'
import { findActionableStep, MemoStepActionButton } from '@/components/memos/memo-step-action-button'
import { MemoResubmitButton } from '@/components/memos/memo-resubmit-button'
import { useMemoSections } from '@/components/memos/memo-section-nav'
import {
  useAcknowledgeMemo,
  useApproveMemo,
  useDeliverMemo,
  useMemoById,
  useRejectMemo,
} from '@/hooks/use-memo'
import { memoApi } from '@/lib/memo.api'
import type { MemoStatus } from '@hrms/shared-types'
import * as fmt from '@hrms/i18n/format'
import { useApiError } from '@/hooks/use-api-error'

function statusVariant(status: MemoStatus): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' {
  if (status === 'Pending') return 'warning'
  if (status === 'Approved') return 'success'
  if (status === 'Rejected') return 'destructive'
  return 'secondary'
}

// ข้อความจาก API ยังเป็นไทย (รอ Phase 3) — fallback ส่งเข้ามาจากคำแปล
function PrintButton({ id }: { id: string }) {
  const t = useTranslations('admin.memo.page')
  const [downloading, setDownloading] = useState(false)

  async function handlePrint() {
    setDownloading(true)
    // เปิดแท็บทันทีตอน click (ก่อน await) กัน popup blocker
    const win = window.open('', '_blank')
    try {
      const { token } = await memoApi.createPrintToken(id)
      const url = memoApi.printUrl(id, token)
      if (win) win.location.href = url
      else window.open(url, '_blank')
    } catch {
      win?.close()
      toast.error(t('printFailed'))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Button variant="outline" onClick={handlePrint} loading={downloading}>
      <Printer className="h-4 w-4" /> {t('print')}
    </Button>
  )
}

function ApproveModal({ id, memoTypeName, requesterName, open, onClose }: {
  id: string
  memoTypeName: string
  requesterName: string
  open: boolean
  onClose: () => void
}) {
  const t = useTranslations('admin.memo.page')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const { mutateAsync: approveMemo, isPending } = useApproveMemo()
  const [comment, setComment] = useState('')

  async function handleApprove() {
    try {
      await approveMemo({ id, comment: comment.trim() || undefined })
      toast.success(t('approved'))
      setComment('')
      onClose()
    } catch (err) {
      toast.error(apiError(err, tCommon('state.error')))
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('approveTitle')}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t('approveQuestion', { memoType: memoTypeName, requester: requesterName })}
        </p>
        <div>
          <Label htmlFor="approve-comment">{t('approveCommentLabel')}</Label>
          <Textarea
            id="approve-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder={t('approveCommentPlaceholder')}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{tCommon('action.cancel')}</Button>
          <Button onClick={handleApprove} loading={isPending}>
            <CheckCircle2 className="h-4 w-4" /> {t('confirmApprove')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function RejectModal({ id, open, onClose }: { id: string; open: boolean; onClose: () => void }) {
  const t = useTranslations('admin.memo.page')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const { mutateAsync: rejectMemo, isPending } = useRejectMemo()
  const [reason, setReason] = useState('')

  async function handleReject() {
    try {
      await rejectMemo({ id, reason: reason.trim() || undefined })
      toast.success(t('rejected'))
      setReason('')
      onClose()
    } catch (err) {
      toast.error(apiError(err, tCommon('state.error')))
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('rejectTitle')}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="reject-reason">{t('rejectReasonLabel')}</Label>
          <Textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder={t('rejectReasonPlaceholder')}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{tCommon('action.cancel')}</Button>
          <Button variant="destructive" onClick={handleReject} loading={isPending}>{t('confirmReject')}</Button>
        </div>
      </div>
    </Modal>
  )
}

// หน้า detail ร่วมของ "งาน Memo" — โครงเดียวกันทุก role ต่างกันเฉพาะปุ่ม action:
// Executive/Admin (memo:approve) → อนุมัติ/ไม่อนุมัติ ตอน Pending
// Supervisor แผนกปลายทาง (memo:view-inbox) → รับทราบ/ส่งมอบ หลัง Approved
export default function SharedMemoDetailPage() {
  const t = useTranslations('admin.memo.page')
  const tStatus = useTranslations('status.memo')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const params = useParams<{ id: string }>()
  const id = params.id
  const { data: memo, isLoading } = useMemoById(id)
  const { canApprove, canViewInbox, defaultHref } = useMemoSections()

  const { mutateAsync: acknowledgeMemo, isPending: isAcknowledging } = useAcknowledgeMemo()
  const { mutateAsync: deliverMemo, isPending: isDelivering } = useDeliverMemo()

  const [rejectOpen, setRejectOpen] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [ackConfirmOpen, setAckConfirmOpen] = useState(false)
  const [deliverConfirmOpen, setDeliverConfirmOpen] = useState(false)

  async function handleAcknowledge() {
    try {
      await acknowledgeMemo(id)
      toast.success(t('acknowledged'))
      setAckConfirmOpen(false)
    } catch (err) {
      toast.error(apiError(err, tCommon('state.error')))
    }
  }

  async function handleDeliver() {
    try {
      await deliverMemo(id)
      toast.success(t('delivered'))
      setDeliverConfirmOpen(false)
    } catch (err) {
      toast.error(apiError(err, tCommon('state.error')))
    }
  }

  if (isLoading) return <div className="h-48 animate-pulse rounded-md bg-muted" />
  if (!memo) return <div className="rounded-md border border-destructive/30 p-5 text-destructive">{t('notFound')}</div>

  const isPending = memo.status === 'Pending'
  const isApproved = memo.status === 'Approved'
  const steps = memo.steps ?? []
  // เรื่องที่มีขั้นตอน config ไว้ ต้องทำครบทุกขั้นก่อนถึงจะส่งมอบได้ (backend ก็ guard ไว้อีกชั้น)
  const stepsPending = steps.some((s) => s.status !== 'Done')
  // ขั้นตอนที่ผู้ใช้คนนี้ลงมือได้ — ปุ่มอยู่แถวเดียวกับ อนุมัติ/รับทราบ/ส่งมอบ
  const actionableStep = findActionableStep(memo)
  const showApproveActions = isPending && canApprove
  const showAcknowledgeAction = isApproved && canViewInbox && !memo.acknowledgedAt
  const showDeliverAction =
    isApproved && canViewInbox && !!memo.acknowledgedAt && !memo.deliveredAt && !stepsPending

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <Link href={defaultHref} className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> {t('back')}
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{memo.memoNo}</h1>
            <Badge variant={statusVariant(memo.status)}>{tStatus(memo.status)}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('requesterAndDate', {
              name: memo.requesterName,
              date: fmt.formatDateTime(new Date(memo.createdAt)),
            })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-l-2 border-primary pl-3">
          {isApproved && <PrintButton id={id} />}
          {memo.canResubmit && <MemoResubmitButton memo={memo} />}
          {actionableStep && <MemoStepActionButton memoId={id} step={actionableStep} />}
          {showApproveActions && (
            <>
              <Button variant="outline" onClick={() => setRejectOpen(true)}>
                <XCircle className="h-4 w-4" /> {t('reject')}
              </Button>
              <Button onClick={() => setApproveOpen(true)}>
                <CheckCircle2 className="h-4 w-4" /> {t('approve')}
              </Button>
            </>
          )}
          {showAcknowledgeAction && (
            <Button onClick={() => setAckConfirmOpen(true)} loading={isAcknowledging}>
              <CheckCircle2 className="h-4 w-4" /> {t('acknowledge')}
            </Button>
          )}
          {showDeliverAction && (
            <Button onClick={() => setDeliverConfirmOpen(true)} loading={isDelivering}>
              <Truck className="h-4 w-4" /> {t('deliver')}
            </Button>
          )}
        </div>
      </div>

      {isPending && canViewInbox && !canApprove && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Clock className="h-4 w-4 shrink-0" /> {t('pendingExecutiveNotice')}
        </div>
      )}

      <MemoDetailBody memo={memo} />

      <ApproveModal
        id={id}
        memoTypeName={memo.memoTypeName}
        requesterName={memo.requesterName}
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
      />

      <RejectModal id={id} open={rejectOpen} onClose={() => setRejectOpen(false)} />

      <ConfirmModal
        open={ackConfirmOpen}
        onClose={() => setAckConfirmOpen(false)}
        onConfirm={handleAcknowledge}
        title={t('acknowledgeTitle')}
        description={t('acknowledgeQuestion', { memoType: memo.memoTypeName, requester: memo.requesterName })}
        confirmLabel={t('confirmAcknowledge')}
        loading={isAcknowledging}
      />

      <ConfirmModal
        open={deliverConfirmOpen}
        onClose={() => setDeliverConfirmOpen(false)}
        onConfirm={handleDeliver}
        title={t('deliverTitle')}
        description={t('deliverQuestion', { memoType: memo.memoTypeName, requester: memo.requesterName })}
        confirmLabel={t('confirmDeliver')}
        loading={isDelivering}
      />
    </div>
  )
}
