'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Eye, Loader2, Paperclip, Trash2 } from 'lucide-react'
import type { MemoAttachmentInput } from '@hrms/shared-types'
import { useApiError } from '@/hooks/use-api-error'
import { uploadFile } from '@/lib/upload.api'
import { MEMO_MAX_ATTACHMENTS, formatFileSize } from '@/components/memos/memo-detail-shared'
import {
  AttachmentThumb, MemoImagePreview, isImageAttachment, openAttachmentInNewTab,
} from '@/components/memos/memo-attachment-preview'

// ต้องตรงกับ AllowedExtensions ใน LocalFileStorageService — กันเลือกไฟล์ที่ server ปฏิเสธแน่ๆ
const ACCEPT_EXTENSIONS = '.pdf,.jpg,.jpeg,.png,.webp'

/**
 * เลือกไฟล์ → อัปโหลดทันที (module=memos) → เก็บ metadata ไว้ส่งพร้อม command
 * ไฟล์อยู่บน server แล้วตอนเลือก จึงกดดูตัวอย่างได้ก่อนกดส่งเรื่อง
 */
export function MemoAttachmentPicker({
  value,
  onChange,
  disabled,
  label,
}: {
  value: MemoAttachmentInput[]
  onChange: (files: MemoAttachmentInput[]) => void
  disabled?: boolean
  label?: string
}) {
  const t = useTranslations('liff.memo.attachments')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<MemoAttachmentInput | null>(null)

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setError(null)
    const room = MEMO_MAX_ATTACHMENTS - value.length
    if (room <= 0) {
      setError(t('maxFiles', { max: MEMO_MAX_ATTACHMENTS }))
      return
    }

    setUploading(true)
    try {
      const uploaded = await Promise.all(
        Array.from(files).slice(0, room).map(async file => {
          const result = await uploadFile(file, 'memos')
          return {
            url: result.url,
            fileName: result.fileName,
            contentType: result.contentType,
            sizeBytes: result.sizeBytes,
          } satisfies MemoAttachmentInput
        }),
      )
      onChange([...value, ...uploaded])
    } catch (uploadError) {
      // ดึงข้อความจริงจาก API — server ตอบเหตุผลไว้ชัด (ไฟล์ใหญ่เกิน / นามสกุลไม่รองรับ)
      setError(apiError(uploadError, tCommon('state.error')))
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function openPreview(file: MemoAttachmentInput) {
    if (isImageAttachment(file)) setPreviewFile(file)
    else openAttachmentInNewTab(file)
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading || value.length >= MEMO_MAX_ATTACHMENTS}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background text-sm font-semibold disabled:opacity-60"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        {uploading ? t('uploading') : (label ?? t('attach'))}
      </button>

      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        <p className="text-xs text-muted-foreground">{t('acceptHint')}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_EXTENSIONS}
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />

      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((file, index) => (
            <li
              key={`${file.url}-${index}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-white p-2.5 shadow-sm dark:bg-slate-900"
            >
              {/* กดที่รูปย่อ/ชื่อไฟล์เพื่อดูตัวอย่าง — แยกจากปุ่มลบ ไม่ซ้อน button ในกันเอง */}
              <button
                type="button"
                onClick={() => openPreview(file)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <AttachmentThumb file={file} className="h-14 w-14" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {file.fileName ?? t('fallbackName')}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {formatFileSize(file.sizeBytes)}
                  </span>
                </span>
                <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
              <button
                type="button"
                title={t('remove')}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                disabled={disabled}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-destructive disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {previewFile && (
        <MemoImagePreview file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </div>
  )
}
