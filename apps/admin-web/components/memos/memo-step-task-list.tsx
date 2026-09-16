'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { EyeIcon, ListChecks, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { MEMO_TABLE_PAGE_SIZE, TablePagination } from '@/components/memos/table-pagination'
import { useMemoStepTasks } from '@/hooks/use-memo'
import type { MemoStepKind } from '@hrms/shared-types'
import * as fmt from '@hrms/i18n/format'

const STEP_KINDS: MemoStepKind[] = ['Work', 'Approval']

function shortDateTime(value: string) {
  return fmt.formatDateTime(new Date(value), { dateStyle: 'short', timeStyle: 'short' })
}

/**
 * ขั้นตอนที่รอผู้ใช้ปัจจุบันดำเนินการ
 * asPage = เนื้อหาหลักของหน้า /memos/tasks — ตารางเต็มพร้อมค้นหา/กรอง/แบ่งหน้า แบบเดียวกับหน้า Memo อื่น
 * default = โหมด section ย่อที่ซ่อนตัวเองเมื่อไม่มีงาน สำหรับแทรกในหน้าอื่น
 */
export function MemoStepTaskList({ asPage = false }: { asPage?: boolean } = {}) {
  const t = useTranslations('admin.memo.tasks')
  const tCommon = useTranslations('common')
  const { data: allItems = [], isLoading } = useMemoStepTasks()
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState<MemoStepKind | ''>('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return allItems.filter(item => {
      if (kind && item.stepKind !== kind) return false
      if (!term) return true
      return [item.memoNo, item.memoTypeName, item.memoCategoryNameSnapshot,
        item.memoSubCategoryNameSnapshot, item.requesterName, item.stepLabel]
        .some(value => value.toLowerCase().includes(term))
    })
  }, [allItems, kind, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / MEMO_TABLE_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const items = filtered.slice((currentPage - 1) * MEMO_TABLE_PAGE_SIZE, currentPage * MEMO_TABLE_PAGE_SIZE)

  // โหมดย่อ: ไม่มีงานก็ไม่ต้องกินพื้นที่หน้าอื่น
  if (!asPage && (isLoading || allItems.length === 0)) return null

  if (!asPage) {
    return (
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">{t('sectionTitle')}</h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {allItems.length}
          </span>
        </div>
        <div className="divide-y divide-border overflow-hidden rounded-md border border-border bg-background">
          {allItems.map(task => (
            <Link
              key={task.stepInstanceId}
              href={`/memos/${task.memoId}`}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-muted/40"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {task.stepSortOrder}. {task.stepLabel}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {t(`waitingKind.${task.stepKind}`)}
                  </span>
                </p>
                {/* ชื่อประเภท/หมวดเป็น snapshot ตอนสร้างเรื่อง — ไม่แปลย้อนหลังตามแผนข้อ 9 */}
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {task.memoNo} · {task.memoTypeName} - {task.memoCategoryNameSnapshot} · {t('requester', { name: task.requesterName })}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{shortDateTime(task.createdAt)}</span>
            </Link>
          ))}
        </div>
      </section>
    )
  }

  return (
    <div className="space-y-4">

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder={t('searchPlaceholder')}
            className="pl-9"
          />
        </div>
        <Select
          value={kind}
          onChange={e => { setKind(e.target.value as MemoStepKind | ''); setPage(1) }}
          className="w-44"
        >
          <option value="">{t('allKinds')}</option>
          {STEP_KINDS.map(item => (
            <option key={item} value={item}>{t(`waitingKind.${item}`)}</option>
          ))}
        </Select>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-background">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-border bg-muted/30 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">{t('colNo')}</th>
              <th className="px-4 py-3 font-medium">{t('colStep')}</th>
              <th className="px-4 py-3 font-medium">{t('colSubject')}</th>
              <th className="px-4 py-3 font-medium">{t('colRequester')}</th>
              <th className="px-4 py-3 font-medium">{t('colSentAt')}</th>
              <th className="px-4 py-3 font-medium">{t('colManage')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 6 }).map((_, index) => (
              <tr key={index} className="border-b border-border">
                <td colSpan={6} className="px-4 py-3"><div className="h-5 animate-pulse rounded bg-muted" /></td>
              </tr>
            ))}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                  {search || kind ? t('emptyFiltered') : t('empty')}
                </td>
              </tr>
            )}
            {items.map(task => (
              <tr key={task.stepInstanceId} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 truncate font-medium">{task.memoNo}</td>
                <td className="px-4 py-3">
                  <p className="max-w-64 truncate font-medium">
                    {task.stepSortOrder}. {task.stepLabel}
                  </p>
                  <Badge
                    variant={task.stepKind === 'Approval' ? 'warning' : 'secondary'}
                    className="mt-1"
                  >
                    {t(`waitingKind.${task.stepKind}`)}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <p className="max-w-64 truncate font-medium">{task.memoTypeName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {task.memoCategoryNameSnapshot} / {task.memoSubCategoryNameSnapshot}
                  </p>
                </td>
                <td className="px-4 py-3 max-w-56 truncate">{task.requesterName}</td>
                <td className="px-4 py-3 text-muted-foreground">{shortDateTime(task.createdAt)}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/memos/${task.memoId}`}
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
