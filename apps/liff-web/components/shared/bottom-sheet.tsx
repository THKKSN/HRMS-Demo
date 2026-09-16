'use client'

import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { XCircle } from 'lucide-react'

// primitive กลางของ LIFF — ฟอร์ม/รายละเอียดทุกอย่างบนมือถือเปิดเป็นแผ่นเลื่อนขึ้นจากล่างจอ
// (เดิมอยู่ใน tickets/detail/ticket-detail-shared ย้ายมาที่นี่เพื่อให้ memo ใช้ตัวเดียวกันได้)

export function BottomSheet({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  const tCommon = useTranslations('common')
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="mx-auto max-h-[85vh] w-full max-w-107.5 overflow-y-auto rounded-t-lg bg-background p-4"
        onClick={event => event.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            title={tCommon('action.close')}
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-border bg-background px-4 py-5">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  )
}
