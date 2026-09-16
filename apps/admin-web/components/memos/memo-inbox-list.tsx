'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { EyeIcon, FileText, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { MEMO_TABLE_PAGE_SIZE, TablePagination } from '@/components/memos/table-pagination'
import { useMemoInbox } from '@/hooks/use-memo'
import { useMe } from '@/hooks/use-me'
import type { MemoInboxItemDto } from '@hrms/shared-types'
import * as fmt from '@hrms/i18n/format'

function shortDateTime(value?: string) {
  return value ? fmt.formatDateTime(new Date(value), { dateStyle: 'short', timeStyle: 'short' }) : '—'
}

// สถานะย่อยของเรื่องในมุมแผนกปลายทาง — คำนวณจาก status + timestamp ของแต่ละขั้น
type InboxStatusKey = 'pending-approval' | 'awaiting-ack' | 'in-progress' | 'delivered' | 'completed'

export function inboxStatusKey(item: MemoInboxItemDto): InboxStatusKey {
  if (item.status === 'Pending') return 'pending-approval'
  if (item.receivedAt) return 'completed'
  if (item.deliveredAt) return 'delivered'
  if (item.acknowledgedAt) return 'in-progress'
  return 'awaiting-ack'
}

const INBOX_STATUS_KEYS: InboxStatusKey[] = [
  'pending-approval', 'awaiting-ack', 'in-progress', 'delivered', 'completed',
]

const INBOX_STATUS_VARIANT: Record<InboxStatusKey, 'secondary' | 'success' | 'warning'> = {
  'pending-approval': 'secondary',
  'awaiting-ack': 'warning',
  'in-progress': 'warning',
  delivered: 'success',
  completed: 'success',
}

/** ป้ายสถานะของกล่องเข้าแผนก — ใช้ในหน้าอื่นด้วย จึงเป็นคอมโพเนนต์เพื่อเรียก useTranslations ได้ */
export function InboxStatusBadge({ item }: { item: MemoInboxItemDto }) {
  const t = useTranslations('admin.memo.inbox.status')
  const key = inboxStatusKey(item)
  return <Badge variant={INBOX_STATUS_VARIANT[key]}>{t(key)}</Badge>
}

export function MemoInboxList() {
  const t = useTranslations('admin.memo.inbox')
  const tCommon = useTranslations('common')
  const [statusFilter, setStatusFilter] = useState<InboxStatusKey | ''>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { data: me } = useMe()
  // ดึงทั้งหมด (รวมส่งมอบแล้ว) แล้วกรองตามสถานะฝั่ง client
  const { data: allItems = [], isLoading } = useMemoInbox(true)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return allItems.filter(item => {
      if (statusFilter && inboxStatusKey(item) !== statusFilter) return false
      if (!term) return true
      return [item.memoNo, item.memoTypeName, item.memoCategoryNameSnapshot, item.memoSubCategoryNameSnapshot,
        item.requesterName, item.requesterCompanyName, item.requesterDepartmentName]
        .some(value => value.toLowerCase().includes(term))
    })
  }, [allItems, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / MEMO_TABLE_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const items = filtered.slice((currentPage - 1) * MEMO_TABLE_PAGE_SIZE, currentPage * MEMO_TABLE_PAGE_SIZE)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {me?.departmentName ? t('titleWithDepartment', { department: me.departmentName }) : t('title')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          {t('count', { count: filtered.length })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder={t('searchPlaceholder')}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as InboxStatusKey | ''); setPage(1) }}
          className="w-44"
        >
          <option value="">{t('allStatuses')}</option>
          {INBOX_STATUS_KEYS.map(key => (
            <option key={key} value={key}>{t(`status.${key}`)}</option>
          ))}
        </Select>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-background">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-border bg-muted/30 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">{t('colNo')}</th>
              <th className="px-4 py-3 font-medium">{t('colSubject')}</th>
              <th className="px-4 py-3 font-medium">{t('colRequester')}</th>
              <th className="px-4 py-3 font-medium">{t('colStatus')}</th>
              <th className="px-4 py-3 font-medium">{t('colApprovedAt')}</th>
              <th className="px-4 py-3 font-medium">{t('colManage')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 4 }).map((_, index) => (
              <tr key={index} className="border-b border-border">
                <td colSpan={7} className="px-4 py-3"><div className="h-5 animate-pulse rounded bg-muted" /></td>
              </tr>
            ))}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                  {search || statusFilter ? (
                    t('emptyFiltered')
                  ) : (
                    <>
                      <p>
                        {me?.departmentName
                          ? t('emptyDepartment', { department: me.departmentName })
                          : t('emptyYourDepartment')}
                      </p>
                      {/* อธิบายว่าเป็นเรื่องปกติ ไม่ใช่ระบบเสีย — ปลายทางกำหนดที่ประเภทเรื่อง */}
                      <p className="mt-1 text-xs">{t('emptyHint')}</p>
                    </>
                  )}
                </td>
              </tr>
            )}
            {items.map(item => (
              <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 truncate font-medium">{item.memoNo}</td>
                <td className="px-4 py-3">
                  <p className="max-w-72 truncate font-medium">{item.memoTypeName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.memoCategoryNameSnapshot} / {item.memoSubCategoryNameSnapshot}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p className="max-w-72 truncate font-medium">{item.requesterName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.requesterCompanyName} / {item.requesterDepartmentName}
                  </p>
                </td>
                <td className="px-4 py-3"><InboxStatusBadge item={item} /></td>
                <td className="px-4 py-3 text-muted-foreground">
                  {item.status === 'Pending' ? '—' : shortDateTime(item.approvedAt)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/memos/${item.id}`}
                    title={tCommon('action.viewDetail')}
                    className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-sm text-muted-foreground hover:bg-muted/80"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <TablePagination page={currentPage} totalPages={totalPages} totalItems={filtered.length} onChange={setPage} />
      </div>
    </div>
  )
}
