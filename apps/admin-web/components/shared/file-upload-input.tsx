'use client'

import { useEffect, useRef, useState } from 'react'
import { Paperclip, X, Loader2, FileText, ImageIcon } from 'lucide-react'
import { useUpload } from '@/hooks/use-upload'
import type { UploadModule, UploadResult } from '@/lib/upload.api'
import { publicFileUrl } from '@/lib/public-file-url'

type Props = {
  module?: UploadModule
  value?: UploadResult | null
  onChange?: (result: UploadResult | null) => void
  accept?: string
  label?: string
}

function fileIcon(contentType: string) {
  if (contentType.startsWith('image/')) return <ImageIcon className="h-4 w-4 shrink-0 text-blue-500" />
  return <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function isPendingTicketUpload(url: string) {
  return url.startsWith('ticket-upload:')
}

export function FileUploadInput({
  module = 'general',
  value,
  onChange,
  accept = '.pdf,.jpg,.jpeg,.png',
  label = 'แนบไฟล์',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const { isUploading, error, upload } = useUpload(module)

  useEffect(() => {
    if (value || !previewUrl) return
    URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
  }, [previewUrl, value])

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const nextPreviewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    setPreviewUrl(current => {
      if (current) URL.revokeObjectURL(current)
      return nextPreviewUrl
    })

    const result = await upload(file)
    if (result) {
      onChange?.(result)
    } else if (nextPreviewUrl) {
      URL.revokeObjectURL(nextPreviewUrl)
      setPreviewUrl(null)
    }
  }

  function handleRemove() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    onChange?.(null)
  }

  if (value) {
    const pendingTicketUpload = isPendingTicketUpload(value.url)
    const fileHref = pendingTicketUpload ? null : publicFileUrl(value.url)
    const imageSrc = previewUrl ?? (value.contentType.startsWith('image/') && fileHref ? fileHref : null)

    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
        {imageSrc ? (
          <img src={imageSrc} alt={value.fileName} className="h-12 w-12 shrink-0 rounded-md object-cover" />
        ) : (
          fileIcon(value.contentType)
        )}
        <div className="min-w-0 flex-1">
          {fileHref ? (
            <a
              href={fileHref}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate text-primary hover:underline"
            >
              {value.fileName}
            </a>
          ) : (
            <p className="truncate font-medium text-foreground">{value.fileName}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {formatBytes(value.sizeBytes)}
            {pendingTicketUpload ? ' · พร้อมแนบเมื่อบันทึกใบแจ้งเรื่อง' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRemove}
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2.5 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-60"
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Paperclip className="h-4 w-4" />
        )}
        {isUploading ? 'กำลังอัปโหลด...' : label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFile}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
