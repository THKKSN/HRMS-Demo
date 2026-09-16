'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeft, PackageCheck, Printer, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { MemoDetailBody } from '@/components/memos/memo-detail-body'
import { findActionableStep, MemoStepActionButton } from '@/components/memos/memo-step-action-button'
import { MemoResubmitButton } from '@/components/memos/memo-resubmit-button'
import { useMemoById, useReceiveMemo } from '@/hooks/use-memo'
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

export default function MyMemoDetailPage() {
  const t = useTranslations('admin.memo.page')
  const tStatus = useTranslations('status.memo')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const params = useParams<{ id: string }>()
  const id = params.id
  const { data: memo, isLoading } = useMemoById(id)
  const { mutateAsync: receiveMemo, isPending: isReceiving } = useReceiveMemo()
  const [receiveConfirmOpen, setReceiveConfirmOpen] = useState(false)

  if (isLoading) return <div className="h-48 animate-pulse rounded-md bg-muted" />
  if (!memo) return <div className="rounded-md border border-destructive/30 p-5 text-destructive">{t('notFound')}</div>

  const actionableStep = findActionableStep(memo)

  async function handleReceive() {
    try {
      await receiveMemo(id)
      toast.success(t('received'))
      setReceiveConfirmOpen(false)
    } catch (err) {
      toast.error(apiError(err, tCommon('state.error')))
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <Link href="/my/memos" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> {t('back')}
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{memo.memoNo}</h1>
            <Badge variant={statusVariant(memo.status)}>{tStatus(memo.status)}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('nameAndDate', {
              name: memo.requesterName,
              date: fmt.formatDateTime(new Date(memo.createdAt)),
            })}
          </p>
        </div>

        {memo.status === 'Approved' && (
          <div className="flex flex-wrap items-center gap-2 border-l-2 border-primary pl-3">
            <PrintButton id={id} />
            {/* เรื่องถูกขั้นอนุมัติตีกลับมา — ผู้ขอเป็นคนเดียวที่ปลดล็อกให้เดินต่อได้ */}
            {memo.canResubmit && <MemoResubmitButton memo={memo} />}
            {/* ผู้ขออาจถูก config ให้รับผิดชอบขั้นตอนของเรื่องตัวเองได้ — ปุ่มจึงต้องมีในหน้านี้ด้วย */}
            {actionableStep && <MemoStepActionButton memoId={id} step={actionableStep} />}
            {memo.deliveredAt && !memo.receivedAt && (
              <Button onClick={() => setReceiveConfirmOpen(true)} loading={isReceiving}>
                <PackageCheck className="h-4 w-4" /> {t('receive')}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* prompt ยืนยันตรวจรับ — action เฉพาะผู้ขอ อยู่นอก body ร่วม */}
      {memo.status === 'Approved' && memo.deliveredAt && !memo.receivedAt && (
        <div className="flex items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          <Truck className="h-4 w-4 shrink-0" />
          {t('deliveredNotice', {
            name: memo.deliveredByName ?? '—',
            date: fmt.formatDateTime(new Date(memo.deliveredAt)),
          })}
        </div>
      )}

      <MemoDetailBody memo={memo} />

      <ConfirmModal
        open={receiveConfirmOpen}
        onClose={() => setReceiveConfirmOpen(false)}
        onConfirm={handleReceive}
        title={t('receiveTitle')}
        description={t('receiveQuestion', { memoType: memo.memoTypeName })}
        confirmLabel={t('confirmReceive')}
        loading={isReceiving}
      />
    </div>
  )
}
