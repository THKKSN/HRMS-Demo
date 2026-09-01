'use client'

import { MemoStatusStation } from '@/components/memos/memo-status-station'
import type { MemoDto } from '@hrms/shared-types'

function thaiDateTime(value?: string) {
  return value
    ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : '—'
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  )
}

// เนื้อหา standard ของหน้า Memo detail — ใช้ร่วมกันทุก role (ปุ่ม action อยู่ที่ header ของแต่ละหน้า)
// ใคร/เมื่อไหร่ ของแต่ละขั้นแสดงใน Status Station แล้ว — ไม่มี timeline แยก
export function MemoDetailBody({ memo }: { memo: MemoDto }) {
  return (
    <div className="space-y-5">
      <MemoStatusStation memo={memo} />

      {memo.status === 'Rejected' && memo.rejectReason && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          เหตุผลที่ไม่อนุมัติ: {memo.rejectReason}
        </div>
      )}

      <div className="w-full space-y-6">
        <section>
          <h2 className="border-b border-border pb-2 text-sm font-semibold">ข้อมูลเรื่อง</h2>
          <dl className="divide-y divide-border">
            <InfoRow label="เลขที่" value={memo.memoNo} />
            <InfoRow label="ประเภทเรื่อง" value={memo.memoTypeName} />
            <InfoRow label="หมวดหมู่" value={`${memo.memoCategoryNameSnapshot} / ${memo.memoSubCategoryNameSnapshot}`} />
            <InfoRow label="ผู้ขอ" value={memo.requesterName} />
            <InfoRow label="ต้นสังกัดผู้ขอ" value={`${memo.companyName} / ${memo.departmentName}`} />
            <InfoRow label="ส่งเรื่องเมื่อ" value={thaiDateTime(memo.createdAt)} />
          </dl>
        </section>

        <section>
          <h2 className="border-b border-border pb-2 text-sm font-semibold">รายละเอียด</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm">{memo.detail}</p>
        </section>
      </div>
    </div>
  )
}
