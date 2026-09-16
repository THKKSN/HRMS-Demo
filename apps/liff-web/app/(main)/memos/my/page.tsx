'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ClipboardList, Plus } from 'lucide-react'
import type { MemoListItemDto, MemoStatus } from '@hrms/shared-types'
import { PageHeader } from '@/components/layout/page-header'
import { MemoListCard } from '@/components/memos/memo-list-card'
import { MemoListTabs } from '@/components/memos/memo-list-tabs'
import { useFmt } from '@/hooks/use-fmt'
import { useMyMemos } from '@/hooks/use-memo'

// แท็บสถานะใช้ป้ายจาก status.memo ตรง ๆ (undefined = ทั้งหมด)
const QUICK_STATUSES: (MemoStatus | undefined)[] = [undefined, 'Pending', 'Approved', 'Rejected']

const STATUS_CLASS: Record<MemoStatus, string> = {
  Draft: 'border-slate-200 bg-slate-50 text-slate-700',
  Pending: 'border-amber-200 bg-amber-50 text-amber-700',
  Approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Rejected: 'border-red-200 bg-red-50 text-red-700',
}

function MemoCard({ memo }: { memo: MemoListItemDto }) {
  const t = useTranslations('liff.memo.list.progress')
  const tStatus = useTranslations('status.memo')
  const fmt = useFmt()

  // สถานะย่อยหลังอนุมัติ — ให้ผู้ขอเห็นความคืบหน้าจนจบ flow (รับทราบ → ดำเนินการ → ส่งมอบ → ตรวจรับ)
  const meta = memo.status !== 'Approved'
    ? { label: tStatus(memo.status), className: STATUS_CLASS[memo.status] }
    : memo.receivedAt
      ? { label: t('done'), className: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
      : memo.deliveredAt
        ? { label: t('deliveredAwaitingReceive'), className: 'border-sky-200 bg-sky-50 text-sky-700' }
        : memo.acknowledgedAt
          ? { label: t('inProgress'), className: 'border-amber-200 bg-amber-50 text-amber-700' }
          : { label: t('awaitingAck'), className: 'border-slate-200 bg-slate-50 text-slate-700' }

  return (
    <MemoListCard
      id={memo.id}
      memoNo={memo.memoNo}
      taxonomy={`${memo.memoTypeName} / ${memo.memoCategoryNameSnapshot} / ${memo.memoSubCategoryNameSnapshot}`}
      badgeLabel={meta.label}
      badgeClass={meta.className}
      footerRight={fmt.formatDateTime(new Date(memo.createdAt))}
    />
  )
}

export default function MyMemosPage() {
  const t = useTranslations('liff.memo.list')
  const tStatus = useTranslations('status.memo')
  const [status, setStatus] = useState<MemoStatus | undefined>()
  const { data: memos = [], isLoading, isError } = useMyMemos(status)

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <PageHeader title={t('myTitle')} subtitle={t('count', { count: memos.length })} />
      <MemoListTabs />

      <div className="border-b border-border bg-background">
        <div className="scrollbar-none flex gap-2 overflow-x-auto px-4 py-3">
          {QUICK_STATUSES.map(item => {
            const active = status === item
            return (
              <button
                key={item ?? 'all'}
                type="button"
                onClick={() => setStatus(item)}
                className={`h-8 shrink-0 rounded-md border px-3 text-xs font-semibold ${
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground'
                }`}
              >
                {item ? tStatus(item) : t('all')}
              </button>
            )
          })}
        </div>
      </div>

      <div className="border-t border-border">
        {isLoading && Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="border-b border-border bg-background p-4">
            <div className="h-20 animate-pulse rounded-md bg-muted" />
          </div>
        ))}

        {isError && (
          <div className="m-4 rounded-md border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
            {t('loadFailed')}
          </div>
        )}

        {!isLoading && !isError && memos.length === 0 && (
          <div className="px-6 py-16 text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-semibold">{t('myEmpty')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('myEmptyHint')}</p>
          </div>
        )}

        {memos.map(memo => <MemoCard key={memo.id} memo={memo} />)}
      </div>

      <div className="pointer-events-none fixed bottom-20 left-1/2 z-20 flex w-full max-w-107.5 -translate-x-1/2 justify-end px-4">
        <Link
          href="/memos/new"
          title={t('newMemo')}
          aria-label={t('newMemo')}
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background/80 active:scale-95"
        >
          <Plus className="h-6 w-6" />
        </Link>
      </div>
    </div>
  )
}
