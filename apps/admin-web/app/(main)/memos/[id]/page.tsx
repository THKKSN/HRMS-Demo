'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, CheckCircle2, Clock, Printer, Truck, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Modal } from '@/components/ui/modal'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { MemoDetailBody } from '@/components/memos/memo-detail-body'
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

const STATUS_LABEL: Record<MemoStatus, string> = {
  Draft: 'แบบร่าง',
  Pending: 'รออนุมัติ',
  Approved: 'อนุมัติแล้ว',
  Rejected: 'ไม่อนุมัติ',
}

function statusVariant(status: MemoStatus): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' {
  if (status === 'Pending') return 'warning'
  if (status === 'Approved') return 'success'
  if (status === 'Rejected') return 'destructive'
  return 'secondary'
}

function thaiDateTime(value: string) {
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function apiMessage(error: unknown) {
  return (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message
    ?? (error as { response?: { data?: { error?: string } } })?.response?.data?.error
    ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่'
}

function PrintButton({ id }: { id: string }) {
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
      toast.error('เปิดเอกสาร PDF ไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Button variant="outline" onClick={handlePrint} loading={downloading}>
      <Printer className="h-4 w-4" /> พิมพ์
    </Button>
  )
}

function RejectModal({ id, open, onClose }: { id: string; open: boolean; onClose: () => void }) {
  const { mutateAsync: rejectMemo, isPending } = useRejectMemo()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleReject() {
    if (!reason.trim()) { setError('กรุณาระบุเหตุผลที่ไม่อนุมัติ'); return }
    setError(null)
    try {
      await rejectMemo({ id, reason: reason.trim() })
      toast.success('ไม่อนุมัติเรื่องนี้แล้ว')
      onClose()
    } catch (err) {
      toast.error(apiMessage(err))
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="ไม่อนุมัติบันทึกข้อความ">
      <div className="space-y-4">
        <div>
          <Label htmlFor="reject-reason">เหตุผลที่ไม่อนุมัติ *</Label>
          <Textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="ระบุเหตุผล..."
          />
          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button variant="destructive" onClick={handleReject} loading={isPending}>ยืนยันไม่อนุมัติ</Button>
        </div>
      </div>
    </Modal>
  )
}

// หน้า detail ร่วมของ "งาน Memo" — โครงเดียวกันทุก role ต่างกันเฉพาะปุ่ม action:
// Executive/Admin (memo:approve) → อนุมัติ/ไม่อนุมัติ ตอน Pending
// Supervisor แผนกปลายทาง (memo:view-inbox) → รับทราบ/ส่งมอบ หลัง Approved
export default function SharedMemoDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const { data: memo, isLoading } = useMemoById(id)
  const { canApprove, canViewInbox } = useMemoSections()

  const { mutateAsync: approveMemo, isPending: isApproving } = useApproveMemo()
  const { mutateAsync: acknowledgeMemo, isPending: isAcknowledging } = useAcknowledgeMemo()
  const { mutateAsync: deliverMemo, isPending: isDelivering } = useDeliverMemo()

  const [comment, setComment] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false)
  const [ackConfirmOpen, setAckConfirmOpen] = useState(false)
  const [deliverConfirmOpen, setDeliverConfirmOpen] = useState(false)

  async function handleApprove() {
    try {
      await approveMemo({ id, comment: comment.trim() || undefined })
      toast.success('อนุมัติเรื่องนี้แล้ว')
      setApproveConfirmOpen(false)
    } catch (err) {
      toast.error(apiMessage(err))
    }
  }

  async function handleAcknowledge() {
    try {
      await acknowledgeMemo(id)
      toast.success('รับทราบเรื่องนี้แล้ว')
      setAckConfirmOpen(false)
    } catch (err) {
      toast.error(apiMessage(err))
    }
  }

  async function handleDeliver() {
    try {
      await deliverMemo(id)
      toast.success('ส่งมอบเรื่องนี้แล้ว')
      setDeliverConfirmOpen(false)
    } catch (err) {
      toast.error(apiMessage(err))
    }
  }

  if (isLoading) return <div className="h-48 animate-pulse rounded-md bg-muted" />
  if (!memo) return <div className="rounded-md border border-destructive/30 p-5 text-destructive">ไม่พบบันทึกข้อความ</div>

  const isPending = memo.status === 'Pending'
  const isApproved = memo.status === 'Approved'
  const showApproveActions = isPending && canApprove
  const showAcknowledgeAction = isApproved && canViewInbox && !memo.acknowledgedAt
  const showDeliverAction = isApproved && canViewInbox && !!memo.acknowledgedAt && !memo.deliveredAt

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <Link href="/memos/tasks" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> กลับ
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{memo.memoNo}</h1>
            <Badge variant={statusVariant(memo.status)}>{STATUS_LABEL[memo.status]}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            ผู้ขอ {memo.requesterName} · {thaiDateTime(memo.createdAt)}
          </p>
        </div>

        <div className="flex items-center gap-2 border-l-2 border-primary pl-3">
          {isApproved && <PrintButton id={id} />}
          {showApproveActions && (
            <>
              <Button variant="outline" onClick={() => setRejectOpen(true)}>
                <XCircle className="h-4 w-4" /> ไม่อนุมัติ
              </Button>
              <Button onClick={() => setApproveConfirmOpen(true)} loading={isApproving}>
                <CheckCircle2 className="h-4 w-4" /> อนุมัติ
              </Button>
            </>
          )}
          {showAcknowledgeAction && (
            <Button onClick={() => setAckConfirmOpen(true)} loading={isAcknowledging}>
              <CheckCircle2 className="h-4 w-4" /> รับทราบ
            </Button>
          )}
          {showDeliverAction && (
            <Button onClick={() => setDeliverConfirmOpen(true)} loading={isDelivering}>
              <Truck className="h-4 w-4" /> ส่งมอบแล้ว
            </Button>
          )}
        </div>
      </div>

      {isPending && canViewInbox && !canApprove && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Clock className="h-4 w-4 shrink-0" /> เรื่องนี้กำลังรอผู้บริหารอนุมัติ — เห็นล่วงหน้าเพื่อเตรียมงาน จะรับทราบได้เมื่ออนุมัติแล้ว
        </div>
      )}

      <MemoDetailBody memo={memo} />

      {showApproveActions && (
        <section className="max-w-3xl">
          <h2 className="border-b border-border pb-2 text-sm font-semibold">ความเห็นประกอบการอนุมัติ</h2>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="ระบุความเห็น (ถ้ามี)..."
            className="mt-3"
          />
        </section>
      )}

      <RejectModal id={id} open={rejectOpen} onClose={() => setRejectOpen(false)} />

      <ConfirmModal
        open={approveConfirmOpen}
        onClose={() => setApproveConfirmOpen(false)}
        onConfirm={handleApprove}
        title="ยืนยันการอนุมัติ"
        description={`ยืนยันอนุมัติเรื่อง "${memo.memoTypeName}" ของ ${memo.requesterName}?`}
        confirmLabel="ยืนยันอนุมัติ"
        loading={isApproving}
      />

      <ConfirmModal
        open={ackConfirmOpen}
        onClose={() => setAckConfirmOpen(false)}
        onConfirm={handleAcknowledge}
        title="ยืนยันการรับทราบ"
        description={`ยืนยันรับทราบเรื่อง "${memo.memoTypeName}" จาก ${memo.requesterName}? หลังรับทราบให้พิมพ์เอกสารไปดำเนินการต่อนอกระบบ`}
        confirmLabel="ยืนยันรับทราบ"
        loading={isAcknowledging}
      />

      <ConfirmModal
        open={deliverConfirmOpen}
        onClose={() => setDeliverConfirmOpen(false)}
        onConfirm={handleDeliver}
        title="ยืนยันการส่งมอบ"
        description={`ยืนยันว่าดำเนินการเรื่อง "${memo.memoTypeName}" เสร็จแล้วและส่งมอบให้ ${memo.requesterName}?`}
        confirmLabel="ยืนยันส่งมอบ"
        loading={isDelivering}
      />
    </div>
  )
}
