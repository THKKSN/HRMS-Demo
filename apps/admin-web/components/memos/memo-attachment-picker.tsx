'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Eye, Loader2, Paperclip, X } from 'lucide-react'
import { uploadApi } from '@/lib/upload.api'
import { AttachmentThumb, MemoAttachmentPreviewModal } from '@/components/memos/memo-attachment-preview'
import type { MemoAttachmentInput } from '@hrms/shared-types'

export const MEMO_MAX_ATTACHMENTS = 10

// ต้องตรงกับ AllowedExtensions ใน LocalFileStorageService — ใส่ accept ไว้กันเลือกไฟล์ที่ server ปฏิเสธแน่ๆ
const ACCEPT_EXTENSIONS = '.pdf,.jpg,.jpeg,.png,.webp'

// ดึงข้อความจริงจาก API — ฝั่ง server ตอบเหตุผลไว้ชัดแล้ว (เช่น ไฟล์ใหญ่เกิน, นามสกุลไม่รองรับ)
// ถ้ากลบทิ้งเป็นข้อความเดียวหมด ผู้ใช้จะไม่รู้ว่าต้องแก้อะไร · ข้อความจาก server ยังเป็นไทย (รอ Phase 3)
function uploadErrorMessage(error: unknown, fallback: string) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message
    ?? fallback
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// เลือกไฟล์ → upload ทันที (module=memos) → เก็บ metadata ไว้ส่งไปพร้อม command
// ใช้ร่วมกันทั้งตอนสร้างเรื่อง, ทำ step, และเพิ่ม activity
export function MemoAttachmentPicker({
  value,
  onChange,
  disabled,
  label,
}: {
  value: MemoAttachmentInput[]
  onChange: (files: MemoAttachmentInput[]) => void
  disabled?: boolean
  /** ข้อความบนปุ่ม — ไม่ส่งมาใช้ค่าตั้งต้น "แนบไฟล์" ที่แปลแล้ว */
  label?: string
}) {
  const t = useTranslations('admin.memo.attachment')
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // ไฟล์ที่กำลังพรีวิว — ไฟล์ถูกอัปโหลดขึ้น server แล้วตอนเลือก จึงเปิดดูได้ก่อนกดส่งเรื่อง
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
          const result = await uploadApi.upload(file, 'memos')
          return {
            url: result.url,
            fileName: result.fileName,
            contentType: result.contentType,
            sizeBytes: result.sizeBytes,
            storageKey: result.key,
          } satisfies MemoAttachmentInput
        }),
      )
      onChange([...value, ...uploaded])
    } catch (uploadError) {
      setError(uploadErrorMessage(uploadError, t('uploadFailed')))
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading || value.length >= MEMO_MAX_ATTACHMENTS}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
        {uploading ? t('uploading') : label ?? t('attach')}
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_EXTENSIONS}
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />

      {!error && <p className="text-[11px] text-muted-foreground">{t('acceptHint')}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}

      {value.length > 0 && (
        <ul className="space-y-1.5">
          {value.map((file, index) => (
            <li
              key={`${file.url}-${index}`}
              className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2 text-xs"
            >
              {/* กดที่รูปย่อหรือชื่อไฟล์เพื่อพรีวิว — แยกจากปุ่มลบ ไม่ซ้อน button ในกันเอง */}
              <button
                type="button"
                onClick={() => setPreviewFile(file)}
                className="group flex min-w-0 flex-1 items-center gap-2 text-left"
                title={t('previewTitle')}
              >
                <AttachmentThumb file={file} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium group-hover:text-primary group-hover:underline">
                    {file.fileName ?? t('fallbackName')}
                  </span>
                  <span className="mt-0.5 block text-muted-foreground">{formatSize(file.sizeBytes)}</span>
                </span>
                <Eye className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
              </button>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                disabled={disabled}
                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-50"
                aria-label={t('remove')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {previewFile && (
        <MemoAttachmentPreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </div>
  )
}
