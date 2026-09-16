'use client'

import { useTranslations } from 'next-intl'
import { ExternalLink, FileText } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { publicFileUrl } from '@/lib/public-file-url'

// ข้อมูลขั้นต่ำที่พรีวิวต้องใช้ — ใช้ร่วมได้ทั้ง MemoAttachmentInput (ยังไม่ส่งเรื่อง)
// และ MemoAttachmentDto (ส่งแล้ว) เพราะไฟล์ถูกอัปโหลดขึ้น server ตอนเลือกไฟล์ไปแล้วทั้งสองกรณี
export type PreviewableAttachment = {
  url: string
  fileName?: string | null
  contentType?: string | null
}

// เช็คจาก contentType ก่อน แล้ว fallback เป็นนามสกุลใน url — ไฟล์เก่าบางใบ contentType ว่าง
export function isImageAttachment(file: PreviewableAttachment) {
  return file.contentType?.startsWith('image/')
    || /\.(?:jpe?g|png|webp|gif)(?:[?#].*)?$/i.test(file.url)
}

export function isPdfAttachment(file: PreviewableAttachment) {
  return file.contentType === 'application/pdf'
    || /\.pdf(?:[?#].*)?$/i.test(file.url)
}

/** ชื่อไฟล์สำหรับแสดงผล — ไฟล์เก่าบางใบไม่มีชื่อ ผู้เรียกจึงส่งคำแทนที่แปลแล้วเข้ามา */
export function attachmentName(file: PreviewableAttachment, fallback: string) {
  return file.fileName ?? fallback
}

/** รูปย่อสำหรับรายการไฟล์ — รูปแสดงภาพจริง ไฟล์อื่นใช้ไอคอน */
export function AttachmentThumb({
  file,
  className = 'h-10 w-10',
}: {
  file: PreviewableAttachment
  className?: string
}) {
  const t = useTranslations('admin.memo.attachment')
  if (isImageAttachment(file)) {
    return (
      <img
        src={publicFileUrl(file.url)}
        alt={attachmentName(file, t('fallbackName'))}
        loading="lazy"
        className={`${className} shrink-0 rounded-md border border-border object-cover`}
      />
    )
  }
  return (
    <span className={`${className} flex shrink-0 items-center justify-center rounded-md bg-primary/10`}>
      <FileText className="h-4 w-4 text-primary" />
    </span>
  )
}

/** พรีวิวเอกสารใน modal — รูปแสดงเต็ม, PDF ฝัง iframe (เบราว์เซอร์เรนเดอร์เองไม่ต้องโหลด lib) */
export function MemoAttachmentPreviewModal({
  file,
  onClose,
}: {
  file: PreviewableAttachment
  onClose: () => void
}) {
  const t = useTranslations('admin.memo.attachment')
  const url = publicFileUrl(file.url)
  const name = attachmentName(file, t('fallbackName'))

  return (
    <Modal open onClose={onClose} title={name} size="xl">
      <div className="space-y-3">
        {isImageAttachment(file) ? (
          <div className="overflow-hidden rounded-lg border border-border bg-muted">
            <img src={url} alt={name} className="max-h-[68dvh] w-full object-contain" />
          </div>
        ) : isPdfAttachment(file) ? (
          <iframe
            src={url}
            title={name}
            className="h-[68dvh] w-full rounded-lg border border-border bg-muted"
          />
        ) : (
          <p className="rounded-lg border border-border bg-muted/40 px-3 py-10 text-center text-sm text-muted-foreground">
            {t('cannotPreview')}
          </p>
        )}

        {/* ทางออกสำรองเสมอ เผื่อ iframe ถูกบล็อกหรือรูปโหลดไม่ขึ้น */}
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {t('openNewTab')}
        </a>
      </div>
    </Modal>
  )
}
