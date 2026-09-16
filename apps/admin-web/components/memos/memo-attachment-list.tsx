'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Eye } from 'lucide-react'
import { AttachmentThumb, MemoAttachmentPreviewModal } from '@/components/memos/memo-attachment-preview'
import type { MemoAttachmentDto, MemoStepInstanceDto } from '@hrms/shared-types'

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function AttachmentLink({ file, onPreview }: { file: MemoAttachmentDto; onPreview: () => void }) {
  const t = useTranslations('admin.memo.attachment')
  return (
    <button
      type="button"
      onClick={onPreview}
      title={t('previewTitle')}
      className="group flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2 text-left text-xs hover:bg-muted"
    >
      <AttachmentThumb file={file} className="h-9 w-9" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium group-hover:text-primary group-hover:underline">
          {file.fileName ?? t('fallbackName')}
        </span>
        <span className="mt-0.5 block text-muted-foreground">{formatSize(file.sizeBytes)}</span>
      </span>
      <Eye className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
    </button>
  )
}

// จัดกลุ่มไฟล์แนบตามที่มา: จากผู้ขอ (ตอนสร้างเรื่อง) หรือจากขั้นตอนไหน
// ไฟล์ที่แนบมากับ activity ไม่แสดงซ้ำที่นี่ — แสดงในการ์ด activity แล้ว
export function MemoAttachmentList({
  attachments,
  steps,
}: {
  attachments: MemoAttachmentDto[]
  steps: MemoStepInstanceDto[]
}) {
  const t = useTranslations('admin.memo.attachment')
  const [previewFile, setPreviewFile] = useState<MemoAttachmentDto | null>(null)
  const nonActivity = attachments.filter(a => !a.memoActivityId)
  if (nonActivity.length === 0) return null

  // group.label = ชื่อขั้นตอนที่ HR ตั้งเอง (ข้อมูล ไม่แปล)
  const fromRequester = nonActivity.filter(a => !a.memoStepInstanceId)
  const groups = steps
    .map(step => ({
      key: step.id,
      label: step.label,
      files: nonActivity.filter(a => a.memoStepInstanceId === step.id),
    }))
    .filter(group => group.files.length > 0)

  return (
    <section className="rounded-2xl border border-border bg-background p-4 shadow-sm">
      <h2 className="border-b border-border pb-2 text-sm font-semibold">{t('sectionTitle')}</h2>
      <div className="mt-3 space-y-4">
        {fromRequester.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t('fromRequester')}</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {fromRequester.map(file => (
                <AttachmentLink key={file.id} file={file} onPreview={() => setPreviewFile(file)} />
              ))}
            </div>
          </div>
        )}
        {groups.map(group => (
          <div key={group.key}>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{group.label}</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {group.files.map(file => (
                <AttachmentLink key={file.id} file={file} onPreview={() => setPreviewFile(file)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {previewFile && (
        <MemoAttachmentPreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </section>
  )
}
