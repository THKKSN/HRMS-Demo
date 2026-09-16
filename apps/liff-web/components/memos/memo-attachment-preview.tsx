'use client'

import { useTranslations } from 'next-intl'
import { ExternalLink, FileText, XCircle } from 'lucide-react'
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

/** ชื่อไฟล์ที่แสดง — ไม่มีชื่อให้ใช้ fallback ที่ผู้เรียกแปลมา (liff.memo.attachments.fallbackName) */
export function attachmentName(file: PreviewableAttachment, fallback: string) {
  return file.fileName ?? fallback
}

/** รูปย่อสำหรับรายการไฟล์ — รูปแสดงภาพจริง ไฟล์อื่นใช้ไอคอน */
export function AttachmentThumb({
  file,
  className = 'h-11 w-11',
}: {
  file: PreviewableAttachment
  className?: string
}) {
  const t = useTranslations('liff.memo.attachments')
  if (isImageAttachment(file)) {
    return (
      <img
        src={publicFileUrl(file.url)}
        alt={attachmentName(file, t('fallbackName'))}
        loading="lazy"
        className={`${className} shrink-0 rounded-lg border border-border object-cover`}
      />
    )
  }
  return (
    <span className={`${className} flex shrink-0 items-center justify-center rounded-lg bg-primary/10`}>
      <FileText className="h-5 w-5 text-primary" />
    </span>
  )
}

/**
 * ดูรูปเต็มจอ — ทรงเดียวกับพรีวิวรูปของ ticket ใน LIFF
 * ไฟล์ที่ไม่ใช่รูป (PDF ฯลฯ) ไม่เปิดที่นี่ เพราะ in-app browser ของ LINE เรนเดอร์ PDF ใน iframe ไม่ได้
 * — ตัวเรียกจะพาไปเปิดแท็บใหม่แทน (ดู openAttachment)
 */
export function MemoImagePreview({
  file,
  onClose,
}: {
  file: PreviewableAttachment
  onClose: () => void
}) {
  const t = useTranslations('liff.memo.attachments')
  const tCommon = useTranslations('common')
  const url = publicFileUrl(file.url)
  const name = attachmentName(file, t('fallbackName'))

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black/80" onClick={onClose}>
      <div
        className="flex min-h-16 items-center justify-between gap-3 bg-background px-4"
        onClick={event => event.stopPropagation()}
      >
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{name}</p>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          title={t('openFile')}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
        <button
          type="button"
          title={tCommon('action.close')}
          onClick={onClose}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border"
        >
          <XCircle className="h-4 w-4" />
        </button>
      </div>
      <div
        className="flex min-h-0 flex-1 items-center justify-center p-3"
        onClick={event => event.stopPropagation()}
      >
        <img src={url} alt={name} className="max-h-full max-w-full object-contain" />
      </div>
    </div>
  )
}

/** ไฟล์ที่ไม่ใช่รูป — เปิดแท็บใหม่ให้ระบบปฏิบัติการจัดการเอง (PDF viewer ของเครื่อง) */
export function openAttachmentInNewTab(file: PreviewableAttachment) {
  window.open(publicFileUrl(file.url), '_blank', 'noreferrer')
}
