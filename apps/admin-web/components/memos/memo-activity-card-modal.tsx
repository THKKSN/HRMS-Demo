'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Eye, Info, Pencil, TimerReset } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { AttachmentThumb, MemoAttachmentPreviewModal } from '@/components/memos/memo-attachment-preview'
import type { MemoActivityDto, MemoAttachmentDto } from '@hrms/shared-types'
import * as fmt from '@hrms/i18n/format'

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/**
 * รายละเอียดบันทึกทั้งใบ — ข้อความเต็มและไฟล์แนบครบทุกไฟล์
 * ใช้เมื่อการ์ดในฟีดแสดงไม่หมด (ข้อความยาวหรือไฟล์แนบเยอะ) โดยฟีดยังคงอ่านสรุปได้เร็ว
 */
export function MemoActivityCardModal({
  activity,
  onEdit,
  onClose,
}: {
  activity: MemoActivityDto
  onEdit?: () => void
  onClose: () => void
}) {
  const t = useTranslations('admin.memo.activity')
  const tAttachment = useTranslations('admin.memo.attachment')
  const tCommon = useTranslations('common')
  const [previewFile, setPreviewFile] = useState<MemoAttachmentDto | null>(null)
  const Icon = activity.isSystem ? Info : TimerReset

  return (
    <Modal open onClose={onClose} title={t('cardTitle')} size="xl">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-start gap-3">
            <span
              className={`mt-0.5 shrink-0 rounded-full border p-2 ${
                activity.isSystem
                  ? 'border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-700 dark:bg-amber-900 dark:text-amber-300'
                  : 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-900 dark:text-sky-300'
              }`}
            >
              <Icon className="h-4 w-4 text-current" />
            </span>
            <div>
              <p className="text-sm font-semibold">{activity.authorName ?? t('systemAuthor')}</p>
              {/* stepLabel = ชื่อขั้นตอนที่ HR ตั้งเอง (ข้อมูล ไม่แปล) */}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {activity.stepLabel ? `${activity.stepLabel} • ` : ''}
                {fmt.formatDateTime(new Date(activity.createdAt))}
              </p>
            </div>
          </div>
          {activity.canEdit && onEdit && (
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="h-4 w-4" /> {tCommon('action.edit')}
            </Button>
          )}
        </div>

        <p className="whitespace-pre-wrap text-sm leading-6">{activity.message}</p>

        {activity.attachments.length > 0 && (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-sm font-medium">
              {tAttachment('sectionTitle')}
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                {t('fileCount', { count: activity.attachments.length })}
              </span>
            </p>
            {/* ไฟล์เยอะก็ยังอ่านไหว — 2 คอลัมน์บนจอกว้าง และเลื่อนในกล่องถ้าเกินจอ */}
            <div className="grid max-h-[46dvh] gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
              {activity.attachments.map(file => (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => setPreviewFile(file)}
                  title={tAttachment('previewTitle')}
                  className="group flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-left text-xs hover:bg-muted"
                >
                  <AttachmentThumb file={file} className="h-9 w-9" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium group-hover:text-primary group-hover:underline">
                      {file.fileName ?? tAttachment('fallbackName')}
                    </span>
                    <span className="mt-0.5 block text-muted-foreground">{formatSize(file.sizeBytes)}</span>
                  </span>
                  <Eye className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {previewFile && (
        <MemoAttachmentPreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </Modal>
  )
}
