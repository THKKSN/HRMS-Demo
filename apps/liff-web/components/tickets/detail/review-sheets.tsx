'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { TicketDetailDto } from '@hrms/shared-types'
import { useCloseTicket, useRejectTicket, useReturnTicketForRevision } from '@/hooks/use-tickets'
import { useApiError } from '@/hooks/use-api-error'
import { BottomSheet } from './ticket-detail-shared'

// ปฏิเสธใบแจ้งเรื่องตั้งแต่ต้นทาง (ยังไม่ได้เริ่มงาน)
export function RejectSheet({ ticket, onClose }: { ticket: TicketDetailDto; onClose: () => void }) {
  const t = useTranslations('liff.ticket.detail.reject')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const reject = useRejectTicket(ticket.id)
  const [reason, setReason] = useState('')

  async function submit() {
    if (!reason.trim()) return toast.error(t('reasonRequired'))
    try {
      await reject.mutateAsync({ reason: reason.trim(), expectedUpdatedAt: ticket.updatedAt })
      toast.success(t('done'))
      onClose()
    } catch (error) {
      toast.error(apiError(error, tCommon('state.error')))
    }
  }

  return (
    <BottomSheet title={t('title')} onClose={onClose}>
      <div className="space-y-4">
        <textarea autoFocus rows={5} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} placeholder={t('reasonPlaceholder')} className="w-full resize-none rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-primary" />
        <button type="button" disabled={reject.isPending || !reason.trim()} onClick={submit} className="flex h-11 w-full items-center justify-center rounded-md bg-destructive text-sm font-semibold text-white disabled:opacity-50">
          {reject.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('confirm')}
        </button>
      </div>
    </BottomSheet>
  )
}

// ผู้ตรวจรับพิจารณางานที่ส่งตรวจ — ส่งกลับแก้ไข (บังคับเหตุผล) หรือตรวจผ่านแล้วปิดงาน
export function ReviewSheet({ ticket, mode, onClose }: { ticket: TicketDetailDto; mode: 'return' | 'close'; onClose: () => void }) {
  const t = useTranslations('liff.ticket.detail.review')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const returnTicket = useReturnTicketForRevision(ticket.id)
  const closeTicket = useCloseTicket(ticket.id)
  const [note, setNote] = useState('')
  const isReturn = mode === 'return'
  const pending = returnTicket.isPending || closeTicket.isPending

  async function submit() {
    if (isReturn && !note.trim()) return toast.error(t('returnRequired'))
    try {
      if (isReturn) {
        await returnTicket.mutateAsync({ reviewNote: note.trim(), expectedUpdatedAt: ticket.updatedAt })
        toast.success(t('returned'))
      } else {
        await closeTicket.mutateAsync({ reviewNote: note.trim() || undefined, expectedUpdatedAt: ticket.updatedAt })
        toast.success(t('closed'))
      }
      onClose()
    } catch (error) {
      toast.error(apiError(error, tCommon('state.error')))
    }
  }

  return (
    <BottomSheet title={isReturn ? t('returnTitle') : t('closeTitle')} onClose={onClose}>
      <div className="space-y-4">
        <textarea autoFocus rows={5} maxLength={2000} value={note} onChange={event => setNote(event.target.value)} placeholder={isReturn ? t('returnPlaceholder') : t('closePlaceholder')} className="w-full resize-none rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-primary" />
        <button type="button" disabled={pending || (isReturn && !note.trim())} onClick={submit} className="flex h-11 w-full items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : isReturn ? t('confirmReturn') : t('confirmClose')}
        </button>
      </div>
    </BottomSheet>
  )
}
