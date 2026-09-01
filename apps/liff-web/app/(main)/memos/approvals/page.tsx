'use client'

import { CheckCircle2, ClipboardCheck } from 'lucide-react'
import type { PendingMemoItemDto } from '@hrms/shared-types'
import { PageHeader } from '@/components/layout/page-header'
import { MemoListCard, memoThaiDate } from '@/components/memos/memo-list-card'
import { MemoListTabs } from '@/components/memos/memo-list-tabs'
import { useMemosForApproval } from '@/hooks/use-memo'
import { useAuthStore } from '@/stores/auth.store'

function ApprovalCard({ memo }: { memo: PendingMemoItemDto }) {
  return (
    <MemoListCard
      id={memo.id}
      memoNo={memo.memoNo}
      taxonomy={`${memo.memoTypeName} / ${memo.memoCategoryNameSnapshot} / ${memo.memoSubCategoryNameSnapshot}`}
      badgeLabel="รออนุมัติ"
      badgeClass="border-amber-200 bg-amber-50 text-amber-700"
      footerLeft={`${memo.requesterName} · ${memo.departmentName}`}
      footerRight={memoThaiDate(memo.createdAt)}
    />
  )
}

// รายการ Memo รออนุมัติ — สำหรับ role Executive/Admin (permission memo:approve)
export default function MemoApprovalsPage() {
  const employee = useAuthStore(s => s.employee)
  const canApprove = employee?.roles.some(role => ['Executive', 'Admin'].includes(role.role)) ?? false
  const { data: memos = [], isLoading, isError } = useMemosForApproval('Pending', canApprove)

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <PageHeader title="Memo รออนุมัติ" subtitle={`${memos.length} รายการ`} />
      <MemoListTabs />

      <div className="border-t border-border">
        {!canApprove && (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            เฉพาะผู้บริหารเท่านั้นที่เข้าถึงหน้านี้ได้
          </div>
        )}

        {canApprove && isLoading && Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="border-b border-border bg-background p-4">
            <div className="h-20 animate-pulse rounded-md bg-muted" />
          </div>
        ))}

        {canApprove && isError && (
          <div className="m-4 rounded-md border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
            โหลดรายการไม่สำเร็จ กรุณาลองใหม่
          </div>
        )}

        {canApprove && !isLoading && !isError && memos.length === 0 && (
          <div className="px-6 py-16 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500/50" />
            <p className="mt-3 text-sm font-semibold">ไม่มีเรื่องรออนุมัติ</p>
            <p className="mt-1 text-xs text-muted-foreground">เคลียร์ครบทุกเรื่องแล้ว 🎉</p>
          </div>
        )}

        {canApprove && memos.map(memo => <ApprovalCard key={memo.id} memo={memo} />)}
      </div>
    </div>
  )
}
