'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { EyeIcon, FileText } from 'lucide-react'
import { MemoSectionNav } from '@/components/memos/memo-section-nav'
import { MEMO_TABLE_PAGE_SIZE, TablePagination } from '@/components/memos/table-pagination'
import { useMyMemos } from '@/hooks/use-memo'
import { cn } from '@/lib/utils'
import type { MemoListItemDto, MemoStatus } from '@hrms/shared-types'
import * as fmt from '@hrms/i18n/format'

// แท็บกรอง — undefined = ทั้งหมด · ป้ายสถานะมาจาก status.memo
const STATUS_TABS: (MemoStatus | undefined)[] = [undefined, 'Pending', 'Approved', 'Rejected']

const STATUS_CLASS: Record<MemoStatus, string> = {
  Draft: 'bg-slate-100 text-slate-700',
  Pending: 'bg-amber-100 text-amber-700',
  Approved: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-red-100 text-red-700',
}

// สถานะย่อยหลังอนุมัติ — ให้ผู้ขอเห็นความคืบหน้าจนจบ flow (รับทราบ → ดำเนินการ → ส่งมอบ → ตรวจรับ)
type ProgressKey = 'completed' | 'delivered' | 'inProgress' | 'awaitingAck'
const PROGRESS_CLASS: Record<ProgressKey, string> = {
  completed: 'bg-emerald-100 text-emerald-700',
  delivered: 'bg-sky-100 text-sky-700',
  inProgress: 'bg-amber-100 text-amber-700',
  awaitingAck: 'bg-slate-100 text-slate-700',
}

function progressKey(item: MemoListItemDto): ProgressKey | null {
  if (item.status !== 'Approved') return null
  if (item.receivedAt) return 'completed'
  if (item.deliveredAt) return 'delivered'
  if (item.acknowledgedAt) return 'inProgress'
  return 'awaitingAck'
}

export default function MyMemosPage() {
  const t = useTranslations('admin.memo.my')
  const tStatus = useTranslations('status.memo')
  const tCommon = useTranslations('common')
  const [activeStatus, setActiveStatus] = useState<MemoStatus | undefined>(undefined)
  const [page, setPage] = useState(1)
  const { data: allItems = [], isLoading } = useMyMemos(activeStatus)

  const totalPages = Math.max(1, Math.ceil(allItems.length / MEMO_TABLE_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const items = allItems.slice((currentPage - 1) * MEMO_TABLE_PAGE_SIZE, currentPage * MEMO_TABLE_PAGE_SIZE)

  return (
    <div className="space-y-4">
      <MemoSectionNav />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          {t('count', { count: allItems.length })}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab ?? 'all'}
            onClick={() => { setActiveStatus(tab); setPage(1) }}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              activeStatus === tab
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-background border border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {tab ? tStatus(tab) : t('tabAll')}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-background">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-border bg-muted/30 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">{t('colNo')}</th>
              <th className="px-4 py-3 font-medium">{t('colSubject')}</th>
              <th className="px-4 py-3 font-medium">{t('colStatus')}</th>
              <th className="px-4 py-3 font-medium">{t('colSentAt')}</th>
              <th className="px-4 py-3 font-medium">{t('colManage')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 4 }).map((_, index) => (
              <tr key={index} className="border-b border-border">
                <td colSpan={5} className="px-4 py-3"><div className="h-5 animate-pulse rounded bg-muted" /></td>
              </tr>
            ))}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center text-muted-foreground">
                  {t('emptyPrefix')}
                  <Link href="/my/memos/new" className="text-primary underline">{t('emptyLink')}</Link>
                </td>
              </tr>
            )}
            {items.map((item) => {
              const progress = progressKey(item)
              return (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 truncate font-medium">{item.memoNo}</td>
                  <td className="px-4 py-3">
                    <p className="max-w-72 truncate font-medium">{item.memoTypeName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.memoCategoryNameSnapshot} / {item.memoSubCategoryNameSnapshot}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                      progress ? PROGRESS_CLASS[progress] : STATUS_CLASS[item.status],
                    )}>
                      {progress ? t(`progress.${progress}`) : tStatus(item.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {fmt.formatDateTime(new Date(item.createdAt), { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/my/memos/${item.id}`}
                      title={tCommon('action.viewDetail')}
                      className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-sm text-muted-foreground hover:bg-muted/80"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <TablePagination page={currentPage} totalPages={totalPages} totalItems={allItems.length} onChange={setPage} />
      </div>
    </div>
  )
}
