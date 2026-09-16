'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Paperclip, Pencil, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { MemoAttachmentPicker } from '@/components/memos/memo-attachment-picker'
import { useAddMemoActivity, useUpdateMemoActivity } from '@/hooks/use-memo'
import type { MemoActivityDto, MemoAttachmentInput } from '@hrms/shared-types'
import { useApiError } from '@/hooks/use-api-error'

// ต้องตรงกับ validator ฝั่ง backend (AddMemoActivityValidator / UpdateMemoActivityValidator)
export const MAX_ACTIVITY_MESSAGE = 4000

// ข้อความจาก API ยังเป็นไทย (รอ Phase 3) — fallback ส่งเข้ามาจากคำแปล
/**
 * ฟอร์มบันทึกความคืบหน้า — ส่ง `activity` มาคือโหมดแก้ไข ไม่ส่งคือเพิ่มใบใหม่
 * โหมดแก้ไขปรับได้แค่ข้อความ เพราะ backend ยังไม่มี endpoint ลบไฟล์แนบของ memo
 */
export function MemoActivityModal({
  memoId,
  activity,
  onClose,
}: {
  memoId: string
  activity?: MemoActivityDto
  onClose: () => void
}) {
  const t = useTranslations('admin.memo.activityForm')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const isEditing = !!activity
  const [message, setMessage] = useState(activity?.message ?? '')
  const [attachments, setAttachments] = useState<MemoAttachmentInput[]>([])
  const addActivity = useAddMemoActivity()
  const updateActivity = useUpdateMemoActivity()
  const busy = addActivity.isPending || updateActivity.isPending

  async function submit() {
    const trimmed = message.trim()
    if (!trimmed) return
    try {
      if (isEditing) {
        await updateActivity.mutateAsync({ memoId, activityId: activity.id, message: trimmed })
        toast.success(t('edited'))
      } else {
        await addActivity.mutateAsync({
          memoId,
          message: trimmed,
          attachments: attachments.length ? attachments : undefined,
        })
        toast.success(t('added'))
      }
      onClose()
    } catch (error) {
      toast.error(apiError(error, t('failed')))
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isEditing ? t('editTitle') : t('addTitle')}
      size="md"
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          {isEditing ? (
            <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
              <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{t('editHint')}</span>
            </p>
          ) : (
            <p className="text-xs leading-5 text-muted-foreground">
              {t.rich('addHint', { b: chunks => <b className="text-foreground">{chunks}</b> })}
            </p>
          )}
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">
            {t('message')} <span className="text-destructive">*</span>
          </span>
          <textarea
            autoFocus
            rows={5}
            maxLength={MAX_ACTIVITY_MESSAGE}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={t('messagePlaceholder')}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <span className="block text-right text-xs text-muted-foreground">
            {message.length}/{MAX_ACTIVITY_MESSAGE}
          </span>
        </label>

        {isEditing ? (
          activity.attachments.length > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Paperclip className="h-3.5 w-3.5" />
              {t('keptFiles', { count: activity.attachments.length })}
            </p>
          )
        ) : (
          <div className="space-y-1.5">
            <span className="text-sm font-medium">
              {t('attachments')} <span className="text-xs font-normal text-muted-foreground">{t('optional')}</span>
            </span>
            <MemoAttachmentPicker value={attachments} onChange={setAttachments} disabled={busy} />
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" disabled={busy} onClick={onClose}>{tCommon('action.cancel')}</Button>
          <Button loading={busy} disabled={!message.trim()} onClick={submit}>
            {isEditing ? <Pencil className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {isEditing ? t('saveEdit') : tCommon('action.save')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
