'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ClipboardList, Plus, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { useFmt } from '@/hooks/use-fmt'
import { useMyOtRequests, useTeamOtRequests } from '@/hooks/use-ot-requests'
import { hasPermission } from '@/lib/auth-utils'
import { useAuthStore } from '@/stores/auth.store'
import type { OtStatus } from '@hrms/shared-types'

// ─── helpers ─────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<OtStatus, string> = {
  PendingSupervisor: 'bg-amber-100 text-amber-700',
  PendingHr:        'bg-blue-100 text-blue-700',
  Approved:         'bg-green-100 text-green-700',
  Rejected:         'bg-red-100 text-red-700',
  Cancelled:        'bg-gray-100 text-gray-500',
}

type Tab = 'my' | 'team'
type StatusFilter = OtStatus | undefined
type TabKey = 'all' | 'pending' | 'pendingHr' | 'approved' | 'rejected' | 'done'

const MY_STATUS_TABS: { key: TabKey; value: StatusFilter }[] = [
  { key: 'all',      value: undefined },
  { key: 'pending',  value: 'PendingSupervisor' },
  { key: 'approved', value: 'Approved' },
  { key: 'rejected', value: 'Rejected' },
]

const TEAM_STATUS_TABS: { key: TabKey; value: StatusFilter }[] = [
  { key: 'all',       value: undefined },
  { key: 'pending',   value: 'PendingSupervisor' },
  { key: 'pendingHr', value: 'PendingHr' },
  { key: 'done',      value: 'Approved' },
]

// ─── page ─────────────────────────────────────────────────────────────────────

export default function OtPage() {
  const t = useTranslations('liff.ot')
  const tCommon = useTranslations('common')
  const tStatus = useTranslations('status.ot')
  const fmt = useFmt()
  const employee = useAuthStore((s) => s.employee)
  const isSup    = hasPermission(employee, 'ot:view-team', ['Supervisor', 'Hr', 'Admin'])

  const [mainTab,    setMainTab]    = useState<Tab>('my')
  const [myStatus,   setMyStatus]   = useState<StatusFilter>(undefined)
  const [teamStatus, setTeamStatus] = useState<StatusFilter>(undefined)

  const { data: myData,   isLoading: myLoading   } = useMyOtRequests({ status: myStatus })
  const { data: teamData, isLoading: teamLoading } = useTeamOtRequests(
    isSup && mainTab === 'team' ? { status: teamStatus } : undefined
  )

  const activeItems = mainTab === 'my'
    ? (myData?.items ?? [])
    : (teamData?.items ?? [])
  const isLoading = mainTab === 'my' ? myLoading : teamLoading

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <PageHeader title={t('list.title')} />
        <Link
          href="/ot/new"
          className="rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-white"
        >
          {t('list.request')}
        </Link>
      </div>

      {/* Main tabs (My / Team) — Supervisor only */}
      {isSup && (
        <div className="flex gap-1 px-4 pb-2">
          {(['my', 'team'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setMainTab(tab)}
              className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
                mainTab === tab
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-whited text-muted-foreground'
              }`}
            >
              {tab === 'my' ? t('list.mine') : t('list.team')}
            </button>
          ))}
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar">
        {(mainTab === 'my' ? MY_STATUS_TABS : TEAM_STATUS_TABS).map((tab) => {
          const active = mainTab === 'my' ? myStatus : teamStatus
          const setFn  = mainTab === 'my' ? setMyStatus : setTeamStatus
          return (
            <button
              key={tab.key}
              onClick={() => setFn(tab.value)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                active === tab.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'border border-border bg-background text-muted-foreground'
              }`}
            >
              {t(`list.tabs.${tab.key}`)}
            </button>
          )
        })}
      </div>

      {/* List */}
      <div className="flex flex-col gap-2 px-4 pb-28">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-whited" />
          ))
        ) : activeItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 font-medium text-foreground">{t('list.empty')}</p>
            {mainTab === 'my' && (
              <Link
                href="/ot/new"
                className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                {t('list.requestNow')}
              </Link>
            )}
          </div>
        ) : (
          activeItems.map((item) => {
            const date = new Date(item.date + 'T00:00:00')
            return (
              <Link
                key={item.id}
                href={`/ot/${item.id}`}
                className="flex items-center gap-4 rounded-2xl border border-border bg-background p-4 shadow-sm active:bg-whited/50 transition-colors"
              >
                {/* Date block — ตัวย่อวันภาษาอังกฤษทุกภาษา (ดีไซน์เดิม) ส่วนเดือนตาม locale */}
                <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl py-2 text-center">
                  <span className="text-[10px] font-medium text-orange-500">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span className="text-lg font-bold leading-none text-foreground">
                    {date.getDate()}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {fmt.formatDate(date, { month: 'short' })}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 border-l border-border pl-4">
                  {mainTab === 'team' && (
                    <p className="text-xs font-medium text-primary truncate">{item.employeeName}</p>
                  )}
                  <p className="font-semibold text-foreground truncate">
                    {tCommon('time.range', { from: item.startTime.slice(0, 5), to: item.endTime.slice(0, 5) })}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {tCommon('duration.hoursShort', { count: item.totalHours })} · {t(`rate.short.${item.rateType}`)}
                    {item.reason && ` · ${item.reason}`}
                  </p>
                </div>

                {/* Status badge */}
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[item.status]}`}>
                    {tStatus(item.status)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            )
          })
        )}
      </div>

      {/* FAB */}
      <Link
        href="/ot/new"
        className="fixed bottom-24 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg active:opacity-90 transition-opacity"
      >
        <Plus className="h-6 w-6 text-primary-foreground" />
      </Link>
    </>
  )
}
