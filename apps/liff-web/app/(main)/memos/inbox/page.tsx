'use client'

import { useTranslations } from 'next-intl'
import { Inbox } from 'lucide-react'
import type { MemoInboxItemDto } from '@hrms/shared-types'
import { PageHeader } from '@/components/layout/page-header'
import { MemoListCard } from '@/components/memos/memo-list-card'
import { MemoListTabs } from '@/components/memos/memo-list-tabs'
import { useFmt } from '@/hooks/use-fmt'
import { useMemoInbox } from '@/hooks/use-memo'
import { hasPermission } from '@/lib/auth-utils'
import { useAuthStore } from '@/stores/auth.store'

function InboxCard({ memo }: { memo: MemoInboxItemDto }) {
  const t = useTranslations('liff.memo.list.inboxStatus')
  const fmt = useFmt()

  // สถานะย่อยของเรื่องเข้าแผนก — เรียงตาม flow: รอผู้บริหาร → รอรับทราบ → รอส่งมอบ
  const meta = memo.status === 'Pending'
    ? { label: t('awaitingExecutive'), className: 'border-slate-200 bg-slate-50 text-slate-600' }
    : !memo.acknowledgedAt
      ? { label: t('awaitingAck'), className: 'border-amber-200 bg-amber-50 text-amber-700' }
      : !memo.deliveredAt
        ? { label: t('awaitingDeliver'), className: 'border-violet-200 bg-violet-50 text-violet-700' }
        : { label: t('delivered'), className: 'border-emerald-200 bg-emerald-50 text-emerald-700' }

  return (
    <MemoListCard
      id={memo.id}
      memoNo={memo.memoNo}
      taxonomy={`${memo.memoTypeName} / ${memo.memoCategoryNameSnapshot} / ${memo.memoSubCategoryNameSnapshot}`}
      badgeLabel={meta.label}
      badgeClass={meta.className}
      footerLeft={`${memo.requesterName} · ${memo.requesterDepartmentName}`}
      footerRight={fmt.formatDateTime(new Date(memo.approvedAt ?? memo.createdAt))}
    />
  )
}

// เรื่องเข้าแผนก — สำหรับหัวหน้าแผนกปลายทาง (role Supervisor) รับทราบ/ส่งมอบ
export default function MemoInboxPage() {
  const t = useTranslations('liff.memo.list')
  const employee = useAuthStore(s => s.employee)
  const isSupervisor = hasPermission(employee, 'memo:view-inbox', ['Supervisor'])
  const { data: memos = [], isLoading, isError } = useMemoInbox(false, isSupervisor)

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <PageHeader title={t('inboxTitle')} subtitle={t('count', { count: memos.length })} />
      <MemoListTabs />

      <div className="border-t border-border">
        {!isSupervisor && (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            {t('inboxForbidden')}
          </div>
        )}

        {isSupervisor && isLoading && Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="border-b border-border bg-background p-4">
            <div className="h-20 animate-pulse rounded-md bg-muted" />
          </div>
        ))}

        {isSupervisor && isError && (
          <div className="m-4 rounded-md border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
            {t('loadFailed')}
          </div>
        )}

        {isSupervisor && !isLoading && !isError && memos.length === 0 && (
          <div className="px-6 py-16 text-center">
            <Inbox className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-semibold">{t('inboxEmpty')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('inboxEmptyHint')}</p>
          </div>
        )}

        {isSupervisor && memos.map(memo => <InboxCard key={memo.id} memo={memo} />)}
      </div>
    </div>
  )
}
