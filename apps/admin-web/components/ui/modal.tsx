'use client'

import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClass = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-5xl',
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={cn(
        'relative max-h-[92dvh] w-full overflow-hidden rounded-t-lg border border-b-0 border-border bg-background shadow-lg sm:mx-4 sm:rounded-lg sm:border-b',
        sizeClass[size],
      )}>
        <div className="flex min-h-14 items-center justify-between border-b border-border px-4 py-3 sm:px-5 sm:py-4">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md hover:bg-whited transition-colors"
            aria-label="ปิด"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="max-h-[calc(92dvh-3.5rem)] overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
      </div>
    </div>
  )
}
