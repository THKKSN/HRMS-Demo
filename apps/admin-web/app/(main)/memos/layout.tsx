'use client'

import { MemoSectionNav } from '@/components/memos/memo-section-nav'

// nav ของโมดูล Memo — ซ่อนตัวเองบนหน้า detail อยู่แล้ว
// งานขั้นตอนที่รอเราดำเนินการมีหน้าเป็นของตัวเองที่ /memos/tasks จึงไม่แทรกซ้ำในทุกหน้า
export default function MemosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-8">
      <MemoSectionNav />
      {children}
    </div>
  )
}
