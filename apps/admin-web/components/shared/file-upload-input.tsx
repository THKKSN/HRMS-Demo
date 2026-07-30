'use client'

import { useRef } from 'react'
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

export function FileUploadInput({
  module = 'general',
  value,
  onChange,
  accept = '.pdf,.jpg,.jpeg,.png',
  label = 'แนบไฟล์',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { isUploading, error, upload } = useUpload(module)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const result = await upload(file)
    if (result) onChange?.(result)
  }

  function handleRemove() {
    onChange?.(null)
  }

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
        {fileIcon(value.contentType)}
        <a
          href={publicFileUrl(value.url)}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1 truncate text-primary hover:underline"
        >
          {value.fileName}
        </a>
        <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(value.sizeBytes)}</span>
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
