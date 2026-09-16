'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ExternalLink, FileText, Loader2, Trash2, XCircle } from 'lucide-react'
import type { TicketAttachmentDto } from '@hrms/shared-types'
import { useProtectedFileUrl } from '@/hooks/use-protected-file-url'

// ไฟล์แนบของ ticket ทั้งหมด — รายการที่อัปโหลดแล้ว, ไฟล์ที่รออัปโหลด และตัวเปิดดูรูปเต็มจอ

export function isImageAttachment(attachment: TicketAttachmentDto) {
  return attachment.contentType?.startsWith('image/')
    || /\.(?:jpe?g|png|webp|gif)(?:[?#].*)?$/i.test(attachment.url)
}

// ไฟล์ที่ผู้ใช้เลือกไว้แต่ยังไม่ได้ส่งขึ้น server — ลบออกจาก state ได้ทันที
export function PendingTicketFileItem({
  file,
  disabled,
  onRemove,
}: {
  file: File
  disabled: boolean
  onRemove: () => void
}) {
  const t = useTranslations('liff.ticket.detail.attachments')
  const previewUrl = useMemo(
    () => file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    [file],
  )

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-white p-2.5 shadow-sm dark:bg-slate-900">
      {previewUrl ? (
        <img src={previewUrl} alt={file.name} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <FileText className="h-6 w-6 text-primary" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{file.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
      </div>
      <button
        type="button"
        title={t('removeImage')}
        disabled={disabled}
        onClick={onRemove}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-destructive disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

// ไฟล์ที่อยู่บน server แล้ว — การลบมีผลทันที ไม่ต้องรอกดบันทึก
export function UploadedEvidenceItem({
  attachment,
  disabled,
  deleting,
  onDelete,
}: {
  attachment: TicketAttachmentDto
  disabled: boolean
  deleting: boolean
  onDelete: () => void
}) {
  const t = useTranslations('liff.ticket.detail.attachments')
  const url = useProtectedFileUrl(attachment.url)
  const isImage = isImageAttachment(attachment)

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-white p-2.5 shadow-sm dark:bg-slate-900">
      {isImage && url ? (
        <img src={url} alt={attachment.fileName} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <FileText className="h-6 w-6 text-primary" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{attachment.fileName}</p>
        <p className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-400">{t('uploaded')}</p>
      </div>
      <button
        type="button"
        title={t('deleteUploaded')}
        disabled={disabled}
        onClick={onDelete}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-destructive disabled:opacity-50"
      >
        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </button>
    </div>
  )
}

function TicketImagePreviewSheet({
  url,
  fileName,
  onClose,
}: {
  url: string
  fileName: string
  onClose: () => void
}) {
  const t = useTranslations('liff.ticket.detail.attachments')
  const tCommon = useTranslations('common')
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black/80" onClick={onClose}>
      <div className="flex min-h-16 items-center justify-between gap-3 bg-background px-4" onClick={event => event.stopPropagation()}>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{fileName}</p>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border"
          title={t('openFile')}
        >
          <ExternalLink className="h-4 w-4" />
        </a>
        <button type="button" title={tCommon('action.close')} onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border">
          <XCircle className="h-4 w-4" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-3" onClick={event => event.stopPropagation()}>
        <img src={url} alt={fileName} className="max-h-full max-w-full object-contain" />
      </div>
    </div>
  )
}

function AttachmentLink({
  attachment,
  fileName,
}: {
  attachment: TicketAttachmentDto
  fileName: string
}) {
  const url = useProtectedFileUrl(attachment.url)
  const [previewOpen, setPreviewOpen] = useState(false)
  if (!url) return <div className="h-24 animate-pulse rounded-md bg-muted" />
  if (isImageAttachment(attachment)) {
    return (
      <>
        <button type="button" onClick={() => setPreviewOpen(true)} className="block w-full text-left">
          <div className="aspect-[4/3] overflow-hidden bg-muted">
            <img src={url} alt={fileName} loading="lazy" className="h-full w-full object-cover" />
          </div>
          <div className="flex items-center gap-2 px-2.5 py-2 text-xs">
            <span className="min-w-0 flex-1 truncate">{fileName}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </div>
        </button>
        {previewOpen && (
          <TicketImagePreviewSheet
            url={url}
            fileName={fileName}
            onClose={() => setPreviewOpen(false)}
          />
        )}
      </>
    )
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className="block">
      <div className="flex min-h-16 items-center gap-3 p-3">
        <FileText className="h-5 w-5 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate text-sm">{fileName}</span>
      </div>
      <div className="flex items-center gap-2 px-2.5 py-2 text-xs">
        <span className="min-w-0 flex-1 truncate">{fileName}</span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </div>
    </a>
  )
}

export function AttachmentList({ attachments }: { attachments: TicketAttachmentDto[] }) {
  const t = useTranslations('liff.ticket.detail.attachments')
  if (attachments.length === 0) return <p className="text-sm text-muted-foreground">{t('none')}</p>
  return (
    <div className="grid grid-cols-2 gap-3">
      {attachments.map((item, index) => {
        const fileName = item.fileName || t('evidenceN', { n: index + 1 })
        return (
          <div key={item.id} className={`${isImageAttachment(item) ? '' : 'col-span-full'} min-w-0 overflow-hidden rounded-md border border-border bg-background`}>
            <AttachmentLink attachment={item} fileName={fileName} />
          </div>
        )
      })}
    </div>
  )
}
