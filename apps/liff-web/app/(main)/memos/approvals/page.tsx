'use client'

import { useTranslations } from 'next-intl'
import { CheckCircle2 } from 'lucide-react'
import type { PendingMemoItemDto } from '@hrms/shared-types'
import { PageHeader } from '@/components/layout/page-header'
import { MemoListCard } from '@/components/memos/memo-list-card'
import { MemoListTabs } from '@/components/memos/memo-list-tabs'
import { useFmt } from '@/hooks/use-fmt'
import { useMemosForApproval } from '@/hooks/use-memo'
import { hasPermission } from '@/lib/auth-utils'
import { useAuthStore } from '@/stores/auth.store'

function ApprovalCard({ memo }: { memo: PendingMemoItemDto }) {
  const tStatus = useTranslations('status.memo')
  const fmt = useFmt()
  return (
    <MemoListCard
      id={memo.id}
      memoNo={memo.memoNo}
      taxonomy={`${memo.memoTypeName} / ${memo.memoCategoryNameSnapshot} / ${memo.memoSubCategoryNameSnapshot}`}
      badgeLabel={tStatus('Pending')}
      badgeClass="border-amber-200 bg-amber-50 text-amber-700"
      footerLeft={`${memo.requesterName} · ${memo.departmentName}`}
      footerRight={fmt.formatDateTime(new Date(memo.createdAt))}
    />
  )
}

// รายการ Memo รออนุมัติ — สำหรับ role Executive/Admin (permission memo:approve)
export default function MemoApprovalsPage() {
  const t = useTranslations('liff.memo.list')
  const employee = useAuthStore(s => s.employee)
  const canApprove = hasPermission(employee, 'memo:approve', ['Executive', 'Admin'])
  const { data: memos = [], isLoading, isError } = useMemosForApproval('Pending', canApprove)

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <PageHeader title={t('approvalsTitle')} subtitle={t('count', { count: memos.length })} />
      <MemoListTabs />

      <div className="border-t border-border">
        {!canApprove && (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            {t('approvalsForbidden')}
          </div>
        )}

        {canApprove && isLoading && Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="border-b border-border bg-background p-4">
            <div className="h-20 animate-pulse rounded-md bg-muted" />
          </div>
        ))}

        {canApprove && isError && (
          <div className="m-4 rounded-md border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
            {t('loadFailed')}
          </div>
        )}

        {canApprove && !isLoading && !isError && memos.length === 0 && (
          <div className="px-6 py-16 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500/50" />
            <p className="mt-3 text-sm font-semibold">{t('approvalsEmpty')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('approvalsEmptyHint')}</p>
          </div>
        )}

        {canApprove && memos.map(memo => <ApprovalCard key={memo.id} memo={memo} />)}
      </div>
    </div>
  )
}
