'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Send } from 'lucide-react'
import type { TicketDetailDto } from '@hrms/shared-types'
import { useFmt } from '@/hooks/use-fmt'
import { useAddTicketComment, useTicketComments } from '@/hooks/use-tickets'
import { Section, useRunWithToast } from './ticket-detail-shared'

// ช่องข้อความของใบแจ้งเรื่อง — ข้อความประเภท RequestInfo ไฮไลต์สีเหลืองให้เห็นว่าเป็นการขอข้อมูลเพิ่ม
export function ConversationSection({ ticket }: { ticket: TicketDetailDto }) {
  const t = useTranslations('liff.ticket.detail.conversation')
  const tCommon = useTranslations('common')
  const runWithToast = useRunWithToast()
  const fmt = useFmt()
  const commentsQuery = useTicketComments(ticket.id)
  const addComment = useAddTicketComment(ticket.id)
  const [comment, setComment] = useState('')

  async function submitComment() {
    if (!comment.trim()) return
    await runWithToast(async () => {
      await addComment.mutateAsync({ message: comment.trim(), commentType: 'General' })
      setComment('')
    }, t('sent'), tCommon('state.error'))
  }

  return (
    <Section title={t('title')}>
      <div className="space-y-3">
        {(commentsQuery.data?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">{t('empty')}</p>}
        {commentsQuery.data?.map(item => (
          <div key={item.id} className={`rounded-md p-3 text-sm ${item.commentType === 'RequestInfo' ? 'border border-amber-200 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-950/60' : 'bg-muted'}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold">{item.employeeName}</p>
              <p className="text-[10px] text-muted-foreground">{fmt.formatDateTime(new Date(item.createdAt))}</p>
            </div>
            <p className="mt-1 whitespace-pre-wrap leading-5">{item.message}</p>
          </div>
        ))}
        {ticket.actions.canComment && (
          <div className="flex items-end gap-2">
            <textarea rows={2} maxLength={2000} value={comment} onChange={event => setComment(event.target.value)} placeholder={t('placeholder')} className="min-h-11 flex-1 resize-none rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-primary" />
            <button type="button" title={t('send')} disabled={!comment.trim() || addComment.isPending} onClick={submitComment} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-50">
              <Send className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </Section>
  )
}
