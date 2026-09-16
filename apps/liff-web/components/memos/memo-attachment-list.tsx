'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Eye } from 'lucide-react'
import type { MemoAttachmentDto, MemoStepInstanceDto } from '@hrms/shared-types'
import { Section } from '@/components/shared/bottom-sheet'
import { formatFileSize } from '@/components/memos/memo-detail-shared'
import {
  AttachmentThumb, MemoImagePreview, isImageAttachment, openAttachmentInNewTab,
} from '@/components/memos/memo-attachment-preview'

function AttachmentRow({ file, onOpen }: { file: MemoAttachmentDto; onOpen: () => void }) {
  const t = useTranslations('liff.memo.attachments')
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-xl border border-border bg-background p-2.5 text-left"
    >
      <AttachmentThumb file={file} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{file.fileName ?? t('fallbackName')}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{formatFileSize(file.sizeBytes)}</span>
      </span>
      <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  )
}

/**
 * เอกสารแนบของเรื่อง จัดกลุ่มตามที่มา: จากผู้ขอ หรือจากขั้นตอนไหน
 * ไฟล์ที่แนบมากับบันทึกความคืบหน้าไม่แสดงซ้ำที่นี่ — แสดงในการ์ดบันทึกแล้ว
 */
export function MemoAttachmentList({
  attachments,
  steps,
}: {
  attachments: MemoAttachmentDto[]
  steps: MemoStepInstanceDto[]
}) {
  const t = useTranslations('liff.memo.attachments')
  const [previewFile, setPreviewFile] = useState<MemoAttachmentDto | null>(null)

  const nonActivity = attachments.filter(a => !a.memoActivityId)
  if (nonActivity.length === 0) return null

  const fromRequester = nonActivity.filter(a => !a.memoStepInstanceId)
  // step.label เป็นชื่อขั้นตอนที่ HR ตั้งเองใน workflow (ข้อมูล ไม่ใช่ข้อความระบบ)
  const groups = steps
    .map(step => ({
      key: step.id,
      label: step.label,
      files: nonActivity.filter(a => a.memoStepInstanceId === step.id),
    }))
    .filter(group => group.files.length > 0)

  function openFile(file: MemoAttachmentDto) {
    if (isImageAttachment(file)) setPreviewFile(file)
    else openAttachmentInNewTab(file)
  }

  return (
    <Section title={t('title', { count: nonActivity.length })}>
      <div className="space-y-4">
        {fromRequester.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t('fromRequester')}</p>
            {fromRequester.map(file => (
              <AttachmentRow key={file.id} file={file} onOpen={() => openFile(file)} />
            ))}
          </div>
        )}
        {groups.map(group => (
          <div key={group.key} className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{group.label}</p>
            {group.files.map(file => (
              <AttachmentRow key={file.id} file={file} onOpen={() => openFile(file)} />
            ))}
          </div>
        ))}
      </div>

      {previewFile && (
        <MemoImagePreview file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </Section>
  )
}
