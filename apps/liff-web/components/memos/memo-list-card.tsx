'use client'

import Link from 'next/link'

// การ์ดรายการ memo ใช้ร่วมทั้ง 3 หน้า (ของฉัน / เข้าแผนก / รออนุมัติ) — ต้นแบบจากหน้า memos/my
export function MemoListCard({
  id,
  memoNo,
  taxonomy,
  badgeLabel,
  badgeClass,
  footerLeft,
  footerRight,
}: {
  id: string
  memoNo: string
  taxonomy: string
  badgeLabel: string
  badgeClass: string
  footerLeft?: string
  footerRight: string
}) {
  return (
    <Link
      href={`/memos/${id}`}
      className="block border-b border-border bg-background px-4 py-4 transition-colors active:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="line-clamp-2 text-sm font-semibold leading-5">{memoNo}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{taxonomy}</p>
        </div>
        <span className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-semibold ${badgeClass}`}>
          {badgeLabel}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
        <span className="min-w-0 truncate">{footerLeft ?? ''}</span>
        <span className="shrink-0">{footerRight}</span>
      </div>
    </Link>
  )
}

export function memoThaiDate(value: string) {
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
