'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, PackageCheck, Printer, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { MemoDetailBody } from '@/components/memos/memo-detail-body'
import { useMemoById, useReceiveMemo } from '@/hooks/use-memo'
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

export default function MyMemoDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const { data: memo, isLoading } = useMemoById(id)
  const { mutateAsync: receiveMemo, isPending: isReceiving } = useReceiveMemo()
  const [receiveConfirmOpen, setReceiveConfirmOpen] = useState(false)

  if (isLoading) return <div className="h-48 animate-pulse rounded-md bg-muted" />
  if (!memo) return <div className="rounded-md border border-destructive/30 p-5 text-destructive">ไม่พบบันทึกข้อความ</div>

  async function handleReceive() {
    try {
      await receiveMemo(id)
      toast.success('ยืนยันรับของแล้ว')
      setReceiveConfirmOpen(false)
    } catch (err) {
      toast.error(apiMessage(err))
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <Link href="/my/memos" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> กลับ
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{memo.memoNo}</h1>
            <Badge variant={statusVariant(memo.status)}>{STATUS_LABEL[memo.status]}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{memo.requesterName} · {thaiDateTime(memo.createdAt)}</p>
        </div>

        {memo.status === 'Approved' && (
          <div className="flex items-center gap-2 border-l-2 border-primary pl-3">
            <PrintButton id={id} />
            {memo.deliveredAt && !memo.receivedAt && (
              <Button onClick={() => setReceiveConfirmOpen(true)} loading={isReceiving}>
                <PackageCheck className="h-4 w-4" /> ยืนยันรับของ
              </Button>
            )}
          </div>
        )}
      </div>

      {/* prompt ยืนยันรับของ — action เฉพาะผู้ขอ อยู่นอก body ร่วม */}
      {memo.status === 'Approved' && memo.deliveredAt && !memo.receivedAt && (
        <div className="flex items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          <Truck className="h-4 w-4 shrink-0" />
          ส่งมอบแล้วโดย {memo.deliveredByName ?? '—'} เมื่อ {thaiDateTime(memo.deliveredAt)} — กรุณายืนยันรับของ
        </div>
      )}

      <MemoDetailBody memo={memo} />

      <ConfirmModal
        open={receiveConfirmOpen}
        onClose={() => setReceiveConfirmOpen(false)}
        onConfirm={handleReceive}
        title="ยืนยันการรับของ"
        description={`ยืนยันว่าได้รับของ/งานสำหรับเรื่อง "${memo.memoTypeName}" เรียบร้อยแล้ว?`}
        confirmLabel="ยืนยันรับของ"
        loading={isReceiving}
      />
    </div>
  )
}
