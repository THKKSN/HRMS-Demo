'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import type { TicketDetailDto } from '@hrms/shared-types'
import { useRequestTicketInfo } from '@/hooks/use-tickets'
import { useRunWithToast } from './ticket-detail-shared'

// ผู้ดำเนินการขอข้อมูลเพิ่มจากผู้แจ้ง — ข้อความจะไปโผล่ในช่องข้อความเป็นชนิด RequestInfo
export function RequestInfoSheet({
  ticket,
  onClose,
}: {
  ticket: TicketDetailDto
  onClose: () => void
}) {
  const t = useTranslations('liff.ticket.detail.requestInfo')
  const tCommon = useTranslations('common')
  const runWithToast = useRunWithToast()
  const requestInfo = useRequestTicketInfo(ticket.id)
  const [message, setMessage] = useState('')

  async function submit() {
    if (!message.trim()) return toast.error(t('required'))
    await runWithToast(async () => {
      await requestInfo.mutateAsync({ message: message.trim(), expectedUpdatedAt: ticket.updatedAt })
      onClose()
    }, t('sent'), tCommon('state.error'))
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/40" onClick={onClose}>
      <div className="mx-auto w-full max-w-107.5 rounded-t-lg bg-background p-4" onClick={event => event.stopPropagation()}>
        <h2 className="text-base font-semibold">{t('title')}</h2>
        <textarea autoFocus rows={5} maxLength={2000} value={message} onChange={event => setMessage(event.target.value)} className="mt-3 w-full resize-none rounded-md border border-border p-3 text-sm outline-none focus:border-primary" />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-border text-sm font-semibold">{tCommon('action.cancel')}</button>
          <button type="button" disabled={requestInfo.isPending} onClick={submit} className="h-10 rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50">{t('submit')}</button>
        </div>
      </div>
    </div>
  )
}
