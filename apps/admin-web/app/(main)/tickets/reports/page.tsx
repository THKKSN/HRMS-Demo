'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts'
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Download,
  Inbox,
  RefreshCw,
  RotateCcw,
  Route,
  ShieldCheck,
  Ticket,
  Timer,
  UserRoundSearch,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TicketPriority, TicketRequestType, TicketStatus } from '@hrms/shared-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  KpiCard, MiniBar, SegmentGroup, duration, percent, rankBarClass, RANK_BADGE, TONE, type Tone,
} from '@/components/tickets/ticket-report-ui'
import {
  useTicketBacklog,
  useTicketCategoryReport,
  useTicketQualityReport,
  useTicketReportScope,
  useTicketReportSummary,
  useTicketRoutingReport,
  useTicketTrend,
  useTicketWorkloadReport,
} from '@/hooks/use-ticket-reports'
import { ticketReportsApi, type TicketReportParams } from '@/lib/ticket-reports.api'
import { localizedName, type Locale } from '@hrms/i18n'
import { usePermissionGate } from '@/hooks/use-permission-gate'
import { useAuthStore } from '@/stores/auth.store'
import * as fmt from '@hrms/i18n/format'

// key ของแท็บ — ป้ายที่แสดงมาจาก admin.ticket.reports.tab.<key>
const TABS = ['overview', 'routing', 'backlog', 'categories', 'workload', 'quality'] as const
type ReportTab = (typeof TABS)[number]
const PAGE_SIZE = 20

const REQUEST_TYPE_SEGMENTS: { value: TicketRequestType | ''; labelKey: 'all' | 'internal' | 'external' }[] = [
  { value: '', labelKey: 'all' },
  { value: 'Internal', labelKey: 'internal' },
  { value: 'External', labelKey: 'external' },
]

function isoDate(date: Date) {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

function scopeKey(value?: string): 'All' | 'SupervisorScope' | 'Permitted' {
  if (value === 'All') return 'All'
  if (value === 'SupervisorScope') return 'SupervisorScope'
  return 'Permitted'
}

function statusTone(status: TicketStatus) {
  if (status === 'Open' || status === 'WaitingInfo') return 'text-amber-700 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300'
  if (status === 'Closed') return 'text-green-700 bg-green-50 dark:bg-green-500/10 dark:text-green-300'
  if (status === 'Rejected' || status === 'Cancelled') return 'text-red-700 bg-red-50 dark:bg-red-500/10 dark:text-red-300'
  return 'text-blue-700 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-300'
}

// โทนสีถังอายุงาน — ไล่ความรุนแรงจากใหม่ (เขียว) ไปค้างนาน (แดง)
const AGING_TONES: Tone[] = ['emerald', 'teal', 'amber', 'orange', 'rose']

// สีอายุงานรายแถวในตาราง backlog
function ageTone(days: number) {
  if (days <= 3) return 'text-emerald-700 dark:text-emerald-300'
  if (days <= 7) return 'text-teal-700 dark:text-teal-300'
  if (days <= 14) return 'text-amber-700 dark:text-amber-300'
  if (days <= 30) return 'text-orange-700 dark:text-orange-300'
  return 'text-rose-700 dark:text-rose-300 font-semibold'
}

export default function TicketReportsPage() {
  const t = useTranslations('admin.ticket.reports')
  const tStatus = useTranslations('status.ticket')
  const tPriority = useTranslations('status.ticketPriority')
  const locale = useLocale() as Locale
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - 30)

  const [tab, setTab] = useState<ReportTab>('overview')
  const [dateFrom, setDateFrom] = useState(isoDate(start))
  const [dateTo, setDateTo] = useState(isoDate(now))
  const [companyId, setCompanyId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [priority, setPriority] = useState<TicketPriority | ''>('')
  const [requestType, setRequestType] = useState<TicketRequestType | ''>('')
  const [dateBasis, setDateBasis] = useState<'CreatedAt' | 'ClosedAt'>('CreatedAt')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)

  const employee = useAuthStore(state => state.employee)
  const isAdmin = employee?.roles.some(role => role.role === 'Admin') ?? false
  const isSupervisor = employee?.roles.some(role => role.role === 'Supervisor') ?? false
  // ปุ่ม Export ผูกกับ permission ของ endpoint /ticket-reports/export
  const { has } = usePermissionGate()
  const canExport = has('ticket:export-report', ['Admin', 'Supervisor'])
  const { data: scope } = useTicketReportScope()
  const departments = useMemo(
    () => scope?.departments.filter(item => !companyId || item.companyId === companyId) ?? [],
    [scope, companyId],
  )

  const params: TicketReportParams = {
    dateFrom,
    dateTo,
    companyId: companyId || undefined,
    departmentId: departmentId || undefined,
    priority: priority || undefined,
    requestType: requestType || undefined,
    dateBasis,
  }

  const summary = useTicketReportSummary(params)
  const trend = useTicketTrend(params)
  const backlog = useTicketBacklog({ ...params, page, pageSize: PAGE_SIZE })
  const categories = useTicketCategoryReport(params)
  const workload = useTicketWorkloadReport(params)
  const quality = useTicketQualityReport(params)
  const routing = useTicketRoutingReport(params)
  const loading = summary.isFetching || trend.isFetching || backlog.isFetching || categories.isFetching || workload.isFetching || quality.isFetching || routing.isFetching

  const trendData = (trend.data ?? []).map(item => ({
    ...item,
    label: fmt.formatDate(new Date(item.date), { day: 'numeric', month: 'short' }),
  }))
  const trendOpenedTotal = (trend.data ?? []).reduce((sum, item) => sum + item.openedCount, 0)
  const trendClosedTotal = (trend.data ?? []).reduce((sum, item) => sum + item.closedCount, 0)
  const trendNetTotal = trendOpenedTotal - trendClosedTotal

  const categoryRows = (categories.data ?? []).slice().sort((a, b) => b.totalCount - a.totalCount)
  const categoryMax = categoryRows[0]?.totalCount ?? 0
  const workloadRows = (workload.data ?? []).slice().sort((a, b) => b.assignedCount - a.assignedCount)
  const workloadMax = workloadRows[0]?.assignedCount ?? 0
  const totalInScope = (summary.data?.openCount ?? 0) + (summary.data?.activeCount ?? 0) + (summary.data?.waitingReviewCount ?? 0) + (summary.data?.closedCount ?? 0)

  async function refetchAll() {
    await Promise.all([
      summary.refetch(),
      trend.refetch(),
      backlog.refetch(),
      categories.refetch(),
      workload.refetch(),
      quality.refetch(),
      routing.refetch(),
    ])
  }

  async function exportExcel() {
    setExporting(true)
    try {
      const blob = await ticketReportsApi.exportExcel(params)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `ticket-report${requestType ? `-${requestType.toLowerCase()}` : ''}-${dateFrom}-${dateTo}.xlsx`
      anchor.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <ArrowLeft className="h-5 w-5 text-muted-foreground cursor-pointer" onClick={() => window.history.back()} />
      </div>

      {/* Header + Filters */}
      <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex rounded-xl bg-emerald-100 p-2.5 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
              <BarChart3 className="h-5 w-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold">{t('title')}</h1>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                  {t(`scope.${scopeKey(summary.data?.meta.appliedScope)}`)}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
              {isSupervisor && !isAdmin && (
                <p className="mt-2 text-xs text-primary">{t('scopeNote')}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SegmentGroup
              options={REQUEST_TYPE_SEGMENTS.map(segment => segment.value) as readonly (TicketRequestType | '')[]}
              value={requestType}
              onChange={value => { setRequestType(value); setPage(1) }}
              render={option => {
                const segment = REQUEST_TYPE_SEGMENTS.find(item => item.value === option)
                return segment ? t(`requestType.${segment.labelKey}`) : ''
              }}
            />
            <Button variant="outline" size="icon" title={t('reload')} onClick={refetchAll}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {canExport && (
              <Button variant="outline" loading={exporting} onClick={exportExcel} className="text-emerald-700 dark:text-emerald-300">
                <Download className="h-4 w-4" /> Export Excel
              </Button>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Input type="date" value={dateFrom} onChange={event => { setDateFrom(event.target.value); setPage(1) }} />
          <Input type="date" value={dateTo} onChange={event => { setDateTo(event.target.value); setPage(1) }} />
          <Select value={dateBasis} onChange={event => setDateBasis(event.target.value as 'CreatedAt' | 'ClosedAt')}>
            <option value="CreatedAt">{t('byCreatedAt')}</option>
            <option value="ClosedAt">{t('byClosedAt')}</option>
          </Select>
          <Select value={companyId} onChange={event => { setCompanyId(event.target.value); setDepartmentId(''); setPage(1) }}>
            <option value="">{t('allCompanies')}</option>
            {scope?.companies.map(item => <option key={item.id} value={item.id}>{localizedName(item, locale)}</option>)}
          </Select>
          <Select value={departmentId} onChange={event => { setDepartmentId(event.target.value); setPage(1) }}>
            <option value="">{t('allDepartments')}</option>
            {departments.map(item => <option key={item.id} value={item.id}>{localizedName(item, locale)}</option>)}
          </Select>
          <Select value={priority} onChange={event => { setPriority(event.target.value as TicketPriority | ''); setPage(1) }}>
            <option value="">{t('allPriorities')}</option>
            {(['Low', 'Medium', 'High', 'Critical'] as TicketPriority[]).map(item => (
              <option key={item} value={item}>{tPriority(item)}</option>
            ))}
          </Select>
        </div>
      </div>

      {summary.isError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {t('noPermission')}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label={t('kpiTotal')} value={totalInScope} hint={t('kpiTotalHint', { count: scope?.departments.length ?? 0 })} icon={Ticket} tone="sky" />
        <KpiCard label={t('kpiBacklog')} value={summary.data?.backlogCount ?? 0} hint={t('kpiBacklogHint', { count: summary.data?.activeCount ?? 0 })} icon={AlertTriangle} tone="rose" />
        <KpiCard label={t('kpiLeadTime')} value={duration(summary.data?.totalLeadTime.averageMinutes)} hint={t('kpiLeadTimeHint', { count: summary.data?.totalLeadTime.sampleCount ?? 0 })} icon={Timer} tone="indigo" />
        <KpiCard label={t('kpiReturnRate')} value={percent(quality.data?.returnRatePercent)} hint={t('kpiReturnRateHint', { count: quality.data?.returnedReviewCount ?? 0 })} icon={RotateCcw} tone="orange" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Trend chart */}
        <section className="rounded-2xl border border-border bg-background p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold">{t('trendTitle')}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{t('trendSubtitle')}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-xl bg-violet-50 px-3 py-2 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                <p className="opacity-80">{t('opened')}</p>
                <p className="mt-1 text-right text-base font-semibold tabular-nums">{trendOpenedTotal}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                <p className="opacity-80">{t('closed')}</p>
                <p className="mt-1 text-right text-base font-semibold tabular-nums">{trendClosedTotal}</p>
              </div>
              <div className={`rounded-xl px-3 py-2 ${trendNetTotal > 0 ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-muted text-muted-foreground'}`}>
                <p className="opacity-80">{t('remaining')}</p>
                <p className="mt-1 text-right text-base font-semibold tabular-nums">{trendNetTotal}</p>
              </div>
            </div>
          </div>

          {trendData.length === 0 ? (
            <EmptyState text={t('trendEmpty')} />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={trendData} margin={{ top: 4, right: 12, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e5e7eb' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="openedCount" name={t('opened')} stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.12} strokeWidth={2} />
                <Area type="monotone" dataKey="closedCount" name={t('closed')} stroke="#10b981" fill="#10b981" fillOpacity={0.12} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* Signals */}
        <section className="rounded-2xl border border-border bg-background p-4 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-semibold">{t('signalsTitle')}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t('signalsSubtitle')}</p>
          </div>
          <div className="space-y-2.5 text-sm">
            <Insight label={t('unassigned')} value={summary.data?.unassignedCount ?? 0} icon={UserRoundSearch} tone="amber" />
            <Insight label={t('supervisorQueue')} value={routing.data?.supervisorQueueCount ?? 0} icon={Users} tone="blue" />
            <Insight label={t('waitingReview')} value={summary.data?.waitingReviewCount ?? 0} icon={ClipboardCheck} tone="violet" />
          </div>
        </section>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-full bg-muted p-1 text-sm w-fit max-w-full">
        {TABS.map(item => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`shrink-0 rounded-full px-4 py-1.5 font-medium transition-colors ${
              tab === item
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t(`tab.${item}`)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-2xl border border-border bg-background p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold">{t('statusTitle')}</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              <KpiCard label={t('statusNew')} value={summary.data?.openCount ?? 0} icon={Inbox} tone="sky" />
              <KpiCard label={t('statusActive')} value={summary.data?.activeCount ?? 0} icon={Clock3} tone="violet" />
              <KpiCard label={t('statusWaitingReview')} value={summary.data?.waitingReviewCount ?? 0} icon={ShieldCheck} tone="cyan" />
              <KpiCard label={t('statusClosed')} value={summary.data?.closedCount ?? 0} icon={CheckCircle2} tone="emerald" />
            </div>
          </section>
          <section className="rounded-2xl border border-border bg-background p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold">{t('durationTitle')}</h2>
            <DurationTable
              headers={{
                period: t('colPeriod'),
                average: t('colAverage'),
                median: t('colMedian'),
                samples: t('colSamples'),
              }}
              rows={[
                [t('durationAccept'), summary.data?.timeToAccept],
                [t('durationAssign'), summary.data?.timeToAssign],
                [t('durationStart'), summary.data?.timeToStart],
                [t('durationActive'), summary.data?.activeWorkTime],
                [t('durationWaitingInfo'), summary.data?.waitingInfoTime],
                [t('durationReview'), summary.data?.reviewTime],
                [t('durationTotal'), summary.data?.totalLeadTime],
              ]}
            />
            <p className="mt-3 text-xs text-muted-foreground">
              {t('durationMeta', {
                from: summary.data?.meta.dataCompleteFrom ?? '-',
                timezone: summary.data?.meta.timezone ?? 'Asia/Bangkok',
              })}
            </p>
          </section>
        </div>
      )}

      {tab === 'routing' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label={t('routingEvaluated')} value={routing.data?.evaluatedCount ?? 0} icon={BarChart3} tone="slate" />
            <KpiCard label={t('routingAuto')} value={routing.data?.autoAssignedCount ?? 0} icon={CheckCircle2} tone="emerald" />
            <KpiCard label={t('routingSupervisor')} value={routing.data?.supervisorQueueCount ?? 0} icon={Users} tone="blue" />
            <KpiCard label={t('routingNoMatch')} value={routing.data?.noMatchCount ?? 0} icon={AlertTriangle} tone="rose" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <RateCard label="Match rate" value={routing.data?.matchRatePercent ?? 0} tone="emerald" hint={t('matchRateHint')} />
            <RateCard label="Auto-assignment rate" value={routing.data?.autoAssignmentRatePercent ?? 0} tone="blue" hint={t('autoRateHint')} />
          </div>
        </div>
      )}

      {tab === 'backlog' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {Object.entries(backlog.data?.agingBuckets ?? {}).map(([label, value], index) => {
              const tone = AGING_TONES[Math.min(index, AGING_TONES.length - 1)]
              return (
                <div key={label} className="rounded-2xl border border-border bg-background p-3 shadow-sm">
                  <span className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-medium ${TONE[tone].chip}`}>
                    {t('ageDays', { days: label })}
                  </span>
                  <p className={`mt-2 text-xl font-bold tabular-nums ${TONE[tone].value}`}>{value}</p>
                </div>
              )
            })}
          </div>
          <div className="overflow-x-auto rounded-2xl border border-border bg-background shadow-sm">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-muted/30 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">Ticket</th>
                  <th className="font-medium">{t('colDepartment')}</th>
                  <th className="font-medium">{t('colCategory')}</th>
                  <th className="font-medium">{t('colAssignee')}</th>
                  <th className="font-medium">{t('colStatus')}</th>
                  <th className="pr-3 text-right font-medium">{t('colAge')}</th>
                </tr>
              </thead>
              <tbody>
                {(backlog.data?.items.length ?? 0) === 0 && <EmptyRow colSpan={6} text={t('backlogEmpty')} />}
                {backlog.data?.items.map(item => (
                  <tr key={item.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                    <td className="p-3">
                      <Link href={`/tickets/${item.id}`} className="font-medium text-primary">{item.ticketNo}</Link>
                      <p className="mt-1 max-w-80 truncate">{item.title}</p>
                    </td>
                    <td>{item.departmentName}</td>
                    <td>{item.categoryName} / {item.topicName}</td>
                    <td>{item.assigneeName ?? '-'}</td>
                    <td><span className={`rounded-full px-2 py-1 text-xs ${statusTone(item.status)}`}>{tStatus(item.status)}</span></td>
                    <td className={`pr-3 text-right tabular-nums ${ageTone(item.ageDays)}`}>{t('ageDays', { days: item.ageDays })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t('prev')}</Button>
            <Button variant="outline" disabled={page * PAGE_SIZE >= (backlog.data?.totalCount ?? 0)} onClick={() => setPage(page + 1)}>{t('next')}</Button>
          </div>
        </div>
      )}

      {tab === 'categories' && (
        <section className="rounded-2xl border border-border bg-background p-4 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold">{t('categoriesTitle')}</h2>
          <p className="mb-4 text-xs text-muted-foreground">{t('categoriesSubtitle')}</p>
          {categoryRows.length === 0 ? (
            <EmptyState text={t('empty')} />
          ) : (
            <ul className="space-y-3">
              {categoryRows.map((item, index) => (
                <li key={`${item.categoryId}-${item.topicId}-${item.subjectId}`}>
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">
                      {RANK_BADGE[index] ?? `${index + 1}.`}{' '}
                      {[item.categoryName, item.topicName, item.subjectName].filter(Boolean).join(' / ') || '—'}
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-xs">
                      <b className={`tabular-nums text-sm ${TONE.violet.value}`}>{item.totalCount}</b>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{t('closedCount', { count: item.closedCount })}</span>
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{t('backlogCount', { count: item.backlogCount })}</span>
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{t('returnedRate', { percent: percent(item.returnRatePercent) })}</span>
                    </span>
                  </div>
                  <MiniBar value={item.totalCount} max={categoryMax} className={rankBarClass(index, 'violet')} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'workload' && (
        <section className="rounded-2xl border border-border bg-background p-4 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold">{t('workloadTitle')}</h2>
          <p className="mb-4 text-xs text-muted-foreground">{t('workloadSubtitle')}</p>
          {workloadRows.length === 0 ? (
            <EmptyState text={t('empty')} />
          ) : (
            <ul className="space-y-3">
              {workloadRows.map((item, index) => (
                <li key={item.employeeId}>
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">
                      {RANK_BADGE[index] ?? `${index + 1}.`} {item.employeeName}
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-xs">
                      <b className={`tabular-nums text-sm ${TONE.teal.value}`}>{t('assignedCount', { count: item.assignedCount })}</b>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">{t('inProgressCount', { count: item.inProgressCount })}</span>
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{t('waitingInfoCount', { count: item.waitingInfoCount })}</span>
                      <span className="rounded-full bg-violet-50 px-2 py-0.5 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">{t('waitingReviewCount', { count: item.waitingReviewCount })}</span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{t('closedCount', { count: item.closedCount })}</span>
                    </span>
                  </div>
                  <MiniBar value={item.assignedCount} max={workloadMax} className={rankBarClass(index, 'teal')} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'quality' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label={t('qualityReviewed')} value={quality.data?.reviewedTicketCount ?? 0} icon={ShieldCheck} tone="slate" />
            <KpiCard label={t('qualityReturned')} value={quality.data?.returnedReviewCount ?? 0} icon={RotateCcw} tone="orange" />
            <KpiCard label={t('kpiReturnRate')} value={percent(quality.data?.returnRatePercent)} icon={AlertTriangle} tone="rose" />
            <KpiCard label={t('qualityRounds')} value={quality.data?.averageReviewRounds ?? 0} icon={BarChart3} tone="blue" />
          </div>
          <section className="rounded-2xl border border-border bg-background p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold">{t('roundsTitle')}</h2>
            {Object.keys(quality.data?.reviewRoundDistribution ?? {}).length === 0 ? (
              <EmptyState text={t('empty')} />
            ) : (
              <ul className="space-y-3">
                {(() => {
                  const entries = Object.entries(quality.data?.reviewRoundDistribution ?? {})
                  const max = Math.max(1, ...entries.map(([, count]) => Number(count)))
                  return entries.map(([round, count], index) => (
                    <li key={round}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                        <span>{t('roundLabel', { round: Number(round) })}</span>
                        <b className={`tabular-nums ${Number(round) > 1 ? TONE.rose.value : TONE.emerald.value}`}>{count} ticket</b>
                      </div>
                      <MiniBar value={Number(count)} max={max} className={rankBarClass(index, 'blue')} />
                    </li>
                  ))
                })()}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

function Insight({ label, value, icon: Icon, tone }: { label: string; value: number; icon: LucideIcon; tone: Tone }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
      <span className="flex items-center gap-2.5 text-muted-foreground">
        <span className={`inline-flex rounded-lg p-1.5 ${TONE[tone].chip}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        {label}
      </span>
      <span className={`text-lg font-bold tabular-nums ${TONE[tone].value}`}>{value}</span>
    </div>
  )
}

function RateCard({ label, value, tone, hint }: { label: string; value: number; tone: Tone; hint: string }) {
  const barColor = tone === 'emerald' ? 'bg-emerald-500' : 'bg-blue-500'
  return (
    <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <p className={`text-xl font-bold tabular-nums ${TONE[tone].value}`}>{percent(value)}</p>
      </div>
      <div className="mt-2">
        <MiniBar value={Math.min(100, value)} max={100} className={barColor} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

// หัวตารางรับมาจากผู้เรียก เพราะคอมโพเนนต์นี้อยู่นอก component ที่เรียก useTranslations
function DurationTable({
  rows,
  headers,
}: {
  rows: Array<[string, { averageMinutes?: number; medianMinutes?: number; sampleCount: number } | undefined]>
  headers: { period: string; average: string; median: string; samples: string }
}) {
  const maxAvg = Math.max(1, ...rows.map(([, metric]) => metric?.averageMinutes ?? 0))
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-xs text-muted-foreground">
          <th className="py-2 font-medium">{headers.period}</th>
          <th className="py-2 font-medium w-1/3">{headers.average}</th>
          <th className="py-2 font-medium">{headers.median}</th>
          <th className="py-2 text-right font-medium">{headers.samples}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, metric]) => (
          <tr key={label} className="border-b border-border/60 last:border-0">
            <td className="py-2.5">{label}</td>
            <td className="py-2.5 pr-4">
              <div className="flex items-center gap-2">
                <span className="w-28 shrink-0 tabular-nums">{duration(metric?.averageMinutes)}</span>
                <MiniBar value={metric?.averageMinutes ?? 0} max={maxAvg} className="bg-indigo-400" />
              </div>
            </td>
            <td className="py-2.5 tabular-nums">{duration(metric?.medianMinutes)}</td>
            <td className="py-2.5 text-right tabular-nums text-muted-foreground">{metric?.sampleCount ?? 0}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-muted-foreground">
        <BarChart3 className="mx-auto mb-2 h-6 w-6" />
        {text}
      </td>
    </tr>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-12 text-center text-sm text-muted-foreground">
      <BarChart3 className="mx-auto mb-2 h-6 w-6" />
      {text}
    </div>
  )
}
