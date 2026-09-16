'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Eye, Info, Loader2, Paperclip, Pencil, Send, TimerReset } from 'lucide-react'
import type { MemoActivityDto, MemoAttachmentDto, MemoAttachmentInput } from '@hrms/shared-types'
import { BottomSheet } from '@/components/shared/bottom-sheet'
import { MemoAttachmentPicker } from '@/components/memos/memo-attachment-picker'
import { MAX_ACTIVITY_MESSAGE, formatFileSize, useRunWithToast } from '@/components/memos/memo-detail-shared'
import {
  AttachmentThumb, MemoImagePreview, isImageAttachment, openAttachmentInNewTab,
} from '@/components/memos/memo-attachment-preview'
import { useFmt } from '@/hooks/use-fmt'
import { useAddMemoActivity, useUpdateMemoActivity } from '@/hooks/use-memo'

/**
 * ฟอร์มบันทึกความคืบหน้า — ส่ง `activity` มาคือโหมดแก้ไข ไม่ส่งคือเพิ่มใบใหม่
 * โหมดแก้ไขปรับได้แค่ข้อความ เพราะ backend ยังไม่มี endpoint ลบไฟล์แนบของ memo
 */
export function MemoActivityComposerSheet({
  memoId,
  activity,
  onClose,
}: {
  memoId: string
  activity?: MemoActivityDto
  onClose: () => void
}) {
  const t = useTranslations('liff.memo.activity.composer')
  const tCommon = useTranslations('common')
  const runWithToast = useRunWithToast()
  const isEditing = !!activity
  const [message, setMessage] = useState(activity?.message ?? '')
  const [attachments, setAttachments] = useState<MemoAttachmentInput[]>([])
  const addActivity = useAddMemoActivity()
  const updateActivity = useUpdateMemoActivity()
  const busy = addActivity.isPending || updateActivity.isPending

  async function submit() {
    const trimmed = message.trim()
    if (!trimmed) return
    const ok = isEditing
      ? await runWithToast(
          () => updateActivity.mutateAsync({ memoId, activityId: activity.id, message: trimmed }),
          t('editedToast'),
          tCommon('state.error'))
      : await runWithToast(
          () => addActivity.mutateAsync({
            memoId,
            message: trimmed,
            attachments: attachments.length ? attachments : undefined,
          }),
          t('addedToast'),
          tCommon('state.error'))
    if (ok) onClose()
  }

  return (
    <BottomSheet
      title={isEditing ? t('editTitle') : t('addTitle')}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-muted/40 p-3">
          {isEditing ? (
            <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
              <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{t('editHint')}</span>
            </p>
          ) : (
            <p className="text-xs leading-5 text-muted-foreground">
              {t.rich('addHint', { b: (chunks) => <b className="text-foreground">{chunks}</b> })}
            </p>
          )}
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">
            {t('message')} <span className="text-destructive">*</span>
          </span>
          <textarea
            autoFocus
            rows={5}
            maxLength={MAX_ACTIVITY_MESSAGE}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={t('placeholder')}
            className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
          />
          <span className="block text-right text-xs text-muted-foreground">
            {message.length}/{MAX_ACTIVITY_MESSAGE}
          </span>
        </label>

        {isEditing ? (
          activity.attachments.length > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Paperclip className="h-3.5 w-3.5" />
              {t('existingFiles', { count: activity.attachments.length })}
            </p>
          )
        ) : (
          <div className="space-y-1.5">
            <span className="text-sm font-semibold">
              {t('attachments')} <span className="text-xs font-normal text-muted-foreground">{tCommon('field.optional')}</span>
            </span>
            <MemoAttachmentPicker value={attachments} onChange={setAttachments} disabled={busy} />
          </div>
        )}

        <div className="space-y-2">
          <button
            type="button"
            disabled={busy || !message.trim()}
            onClick={submit}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" />
              : isEditing ? <Pencil className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {isEditing ? t('saveEdit') : t('save')}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="h-12 w-full rounded-xl border border-border bg-background text-sm font-semibold disabled:opacity-60"
          >
            {tCommon('action.cancel')}
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}

/**
 * รายละเอียดบันทึกทั้งใบ — ข้อความเต็มและไฟล์แนบครบทุกไฟล์
 * ใช้เมื่อการ์ดในฟีดแสดงไม่หมด (ข้อความยาวหรือไฟล์แนบเยอะ)
 */
export function MemoActivityDetailSheet({
  activity,
  onEdit,
  onClose,
}: {
  activity: MemoActivityDto
  onEdit?: () => void
  onClose: () => void
}) {
  const t = useTranslations('liff.memo.activity')
  const fmt = useFmt()
  const [previewFile, setPreviewFile] = useState<MemoAttachmentDto | null>(null)
  const Icon = activity.isSystem ? Info : TimerReset

  function openFile(file: MemoAttachmentDto) {
    if (isImageAttachment(file)) setPreviewFile(file)
    else openAttachmentInNewTab(file)
  }

  return (
    <BottomSheet title={t('detailSheet.title')} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 border-b border-border pb-3">
          <span
            className={`mt-0.5 shrink-0 rounded-full border p-2 ${
              activity.isSystem
                ? 'border-amber-300 bg-amber-100 text-amber-700'
                : 'border-sky-200 bg-sky-50 text-sky-700'
            }`}
          >
            <Icon className="h-4 w-4 text-current" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{activity.authorName ?? t('system')}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {activity.stepLabel ? `${activity.stepLabel} • ` : ''}
              {fmt.formatDateTime(new Date(activity.createdAt))}
            </p>
          </div>
        </div>

        <p className="whitespace-pre-wrap text-sm leading-6">{activity.message}</p>

        {activity.attachments.length > 0 && (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-sm font-semibold">
              {t('detailSheet.attachments')}
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                {t('detailSheet.fileCount', { count: activity.attachments.length })}
              </span>
            </p>
            {activity.attachments.map(file => (
              <button
                key={file.id}
                type="button"
                onClick={() => openFile(file)}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-background p-2.5 text-left"
              >
                <AttachmentThumb file={file} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{file.fileName ?? t('attachmentFallback')}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{formatFileSize(file.sizeBytes)}</span>
                </span>
                <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        {activity.canEdit && onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-semibold"
          >
            <Pencil className="h-4 w-4" /> {t('detailSheet.editThis')}
          </button>
        )}
      </div>

      {previewFile && (
        <MemoImagePreview file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </BottomSheet>
  )
}
