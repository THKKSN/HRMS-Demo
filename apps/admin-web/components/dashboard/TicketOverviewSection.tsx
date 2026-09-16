'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts'
import {
  Building2, CheckCircle2, ClipboardCheck, Globe, Inbox, TicketCheck, Timer,
  TriangleAlert, UserRoundSearch, Wrench,
} from 'lucide-react'
import type { TicketRequestType } from '@hrms/shared-types'
import { KpiCard, MetricCell, MiniBar, SegmentGroup, duration, rankBarClass, RANK_BADGE } from '@/components/tickets/ticket-report-ui'
import { MemoOverviewCards } from './MemoOverviewCards'
import {
  useTicketCategoryReport,
  useTicketReportScope,
  useTicketReportSummary,
  useTicketTrend,
  useTicketWorkloadReport,
} from '@/hooks/use-ticket-reports'
import { useLocale, useTranslations } from 'next-intl'
import { localizedName, type Locale } from '@hrms/i18n'
import type { TicketReportParams } from '@/lib/ticket-reports.api'
import * as fmt from '@hrms/i18n/format'

const RANGE_OPTIONS = ['today', '7d', '30d', 'custom'] as const
type RangeKey = (typeof RANGE_OPTIONS)[number]

// ค่าใน segment ตรงกับ TicketRequestType ของ API ('' = ทุกช่องทาง) ส่วนป้ายมาจาก messages
const SEGMENT_VALUES = ['', 'Internal', 'External'] as const
const SEGMENT_LABEL_KEYS: Record<string, string> = {
  '': 'channel.all',
  Internal: 'channel.internal',
  External: 'channel.external',
}
const MIN_CLOSED_SAMPLE = 1

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// วันที่ย้อนหลัง n วันในรูปแบบ YYYY-MM-DD ตามเวลาเครื่อง (ไทย)
function daysAgo(count: number) {
  const date = new Date()
  date.setDate(date.getDate() - count)
  return isoDate(date)
}

// 'YYYY-MM-DD' → '7 ส.ค.' — แยก parse เองเพราะ new Date('2026-08-07') ถูกอ่านเป็น UTC แล้วเลื่อนวันใน +07
function thaiShortDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  return fmt.formatDate(new Date(year, month - 1, day), { day: 'numeric', month: 'short' })
}

// แปลงตัวเลือกช่วงเวลาเป็นวันที่จริง — custom สลับให้เสมอถ้าผู้ใช้เลือกวันเริ่มหลังวันสิ้นสุด (API จะ 400)
function resolveRange(key: RangeKey, customFrom: string, customTo: string): [string, string] {
  if (key === 'custom') return customFrom <= customTo ? [customFrom, customTo] : [customTo, customFrom]
  const today = daysAgo(0)
  if (key === 'today') return [today, today]
  return [daysAgo(key === '7d' ? 6 : 29), today]
}

export function TicketOverviewSection({
  showCompanyFilter = false,
  showSlowClosers = false,
}: {
  showCompanyFilter?: boolean
  showSlowClosers?: boolean
}) {
  const t = useTranslations('admin.dashboard.ticketOverview')
  const locale = useLocale() as Locale
  const [rangeKey, setRangeKey] = useState<RangeKey>('30d')
  const [customFrom, setCustomFrom] = useState(() => daysAgo(29))
  const [customTo, setCustomTo] = useState(() => daysAgo(0))
  const [requestType, setRequestType] = useState<TicketRequestType | ''>('')
  const [companyId, setCompanyId] = useState('')

  const [dateFrom, dateTo] = resolveRange(rangeKey, customFrom, customTo)
  // ป้ายกำกับช่วงเวลาที่เอาไปใช้ซ้ำในหัวการ์ดต่างๆ — ช่วงที่เลือกเองแสดงเป็นวันที่จริง
  const rangeLabel = rangeKey === 'custom'
    ? `${thaiShortDate(dateFrom)} – ${thaiShortDate(dateTo)}`
    : t(`range.${rangeKey}`)

  const params: TicketReportParams = {
    dateFrom,
    dateTo,
    companyId: companyId || undefined,
    requestType: requestType || undefined,
  }

  const scopeQuery = useTicketReportScope()
  const summaryQuery = useTicketReportSummary(params)
  const trendQuery = useTicketTrend(params)
  const categoriesQuery = useTicketCategoryReport(params)
  const workloadQuery = useTicketWorkloadReport(params)
  const internalSummary = useTicketReportSummary({ ...params, requestType: 'Internal' })
  const externalSummary = useTicketReportSummary({ ...params, requestType: 'External' })

  // ผู้ใช้ที่ไม่มีสิทธิ์ ticket:view-report (403) — ซ่อนทั้ง section
  if (summaryQuery.isError) return null

  const summary = summaryQuery.data
  const companies = scopeQuery.data?.companies ?? []
  const trend = (trendQuery.data ?? []).map(item => ({
    ...item,
    label: fmt.formatDate(new Date(item.date), { day: 'numeric', month: 'short' }),
  }))

  const topTopics = (categoriesQuery.data ?? [])
    .slice()
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, 10)
  const maxTopicCount = topTopics[0]?.totalCount ?? 0

  const workload = (workloadQuery.data ?? [])
    .slice()
    .sort((a, b) => b.assignedCount - a.assignedCount)
    .slice(0, 10)
  const maxAssigned = workload[0]?.assignedCount ?? 0

  const slowClosers = (workloadQuery.data ?? [])
    .filter(item => item.closedSampleCount >= MIN_CLOSED_SAMPLE && item.averageLeadTimeMinutes != null)
    .sort((a, b) => (b.averageLeadTimeMinutes ?? 0) - (a.averageLeadTimeMinutes ?? 0))
    .slice(0, 10)

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-xl bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
            <TicketCheck className="h-4 w-4" />
          </span>
          <p className="text-sm font-semibold">{t('title')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentGroup
            options={RANGE_OPTIONS}
            value={rangeKey}
            onChange={setRangeKey}
            render={option => t(`range.${option}`)}
          />
          {rangeKey === 'custom' && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={customFrom}
                max={daysAgo(0)}
                onChange={event => setCustomFrom(event.target.value)}
                className="h-8 rounded-full border border-border bg-background px-3 text-xs outline-none focus:border-primary"
              />
              <span className="text-xs text-muted-foreground">{t('range.to')}</span>
              <input
                type="date"
                value={customTo}
                max={daysAgo(0)}
                onChange={event => setCustomTo(event.target.value)}
                className="h-8 rounded-full border border-border bg-background px-3 text-xs outline-none focus:border-primary"
              />
            </div>
          )}
          <SegmentGroup
            options={SEGMENT_VALUES as readonly (TicketRequestType | '')[]}
            value={requestType}
            onChange={setRequestType}
            render={option => t(SEGMENT_LABEL_KEYS[option] ?? 'channel.all')}
          />
          {showCompanyFilter && companies.length > 1 && (
            <select
              value={companyId}
              onChange={event => setCompanyId(event.target.value)}
              className="h-8 rounded-full border border-border bg-background px-3 text-xs outline-none focus:border-primary"
            >
              <option value="">{t('allCompanies')}</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {summaryQuery.isLoading || !summary ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : (
        <>
          {/* ① KPI cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <KpiCard label={t('kpi.open')} value={summary.openCount} icon={Inbox} tone="sky" />
            <KpiCard label={t('kpi.unassigned')} value={summary.unassignedCount} icon={UserRoundSearch} tone="amber" />
            <KpiCard label={t('kpi.active')} value={summary.activeCount} icon={Wrench} tone="violet" />
            <KpiCard label={t('kpi.waitingReview')} value={summary.waitingReviewCount} icon={ClipboardCheck} tone="cyan" />
            <KpiCard label={t('kpi.closed')} value={summary.closedCount} icon={CheckCircle2} tone="emerald" />
            <KpiCard label={t('kpi.backlog')} value={summary.backlogCount} icon={TriangleAlert} tone="rose" />
          </div>
          {/* ② เวลา/สัดส่วน (2×2) คู่กับกราฟแนวโน้ม — จับคู่ในแถวเดียวกันแทนที่จะกินเต็มแถวคนละแถว */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
              <div className="grid h-full grid-cols-2 grid-rows-2 gap-px bg-border">
                <MetricCell
                  label={t('timeToAccept')}
                  value={duration(summary.timeToAccept.averageMinutes)}
                  hint={t('medianHint', {
                    median: duration(summary.timeToAccept.medianMinutes),
                    count: summary.timeToAccept.sampleCount,
                  })}
                  icon={Timer}
                  tone="teal"
                />
                <MetricCell
                  label={t('totalLeadTime')}
                  value={duration(summary.totalLeadTime.averageMinutes)}
                  hint={t('medianHint', {
                    median: duration(summary.totalLeadTime.medianMinutes),
                    count: summary.totalLeadTime.sampleCount,
                  })}
                  icon={Timer}
                  tone="indigo"
                />
                <MetricCell
                  label={t('channel.internal')}
                  value={`${internalSummary.data?.openCount ?? '—'} / ${internalSummary.data?.backlogCount ?? '—'}`}
                  hint={t('channelSplitHint')}
                  icon={Building2}
                  tone="blue"
                />
                <MetricCell
                  label={t('channel.external')}
                  value={`${externalSummary.data?.openCount ?? '—'} / ${externalSummary.data?.backlogCount ?? '—'}`}
                  hint={t('channelSplitHint')}
                  icon={Globe}
                  tone="rose"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4 shadow-sm lg:col-span-2">
              <p className="mb-4 text-sm font-semibold">{t('trendTitle', { range: rangeLabel })}</p>
              <ResponsiveContainer width="100%" height={188}>
              <AreaChart data={trend} margin={{ top: 4, right: 12, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e5e7eb' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="openedCount" name={t('seriesOpened')} stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.12} strokeWidth={2} />
                <Area type="monotone" dataKey="closedCount" name={t('seriesClosed')} stroke="#10b981" fill="#10b981" fillOpacity={0.12} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex items-center justify-end text-xs text-muted-foreground">
            <Link href="/tickets/reports" className="rounded-full bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20">
              {t('fullReport')}
            </Link>
          </div>
          {/* ③+④ Tier lists */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
              <p className="mb-3 text-sm font-semibold">{t('topSubjects')}</p>
              {topTopics.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('emptyRange')}</p>
              ) : (
                <ul className="space-y-2.5">
                  {topTopics.map((item, index) => (
                    <li key={`${item.categoryId}-${item.topicId}-${item.subjectId}`}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate">
                          {RANK_BADGE[index] ?? `${index + 1}.`}{' '}
                          {/* ชื่อ master data มาครบ 3 ภาษาจาก API — เลือกตามภาษาที่ผู้ใช้ตั้ง (fallback: locale → en → th) */}
                          {[
                            localizedName({ name: item.categoryName, nameEn: item.categoryNameEn, nameId: item.categoryNameId }, locale),
                            localizedName({ name: item.topicName, nameEn: item.topicNameEn, nameId: item.topicNameId }, locale),
                            localizedName({ name: item.subjectName, nameEn: item.subjectNameEn, nameId: item.subjectNameId }, locale),
                          ].filter(Boolean).join(' / ') || '—'}
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums text-violet-700 dark:text-violet-300">{item.totalCount}</span>
                      </div>
                      <MiniBar value={item.totalCount} max={maxTopicCount} className={rankBarClass(index, 'violet')} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
              <p className="mb-3 text-sm font-semibold">{t('staff')}</p>
              {workload.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('emptyRange')}</p>
              ) : (
                <ul className="space-y-2.5">
                  {workload.map((item, index) => (
                    <li key={item.employeeId}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate">
                          {RANK_BADGE[index] ?? `${index + 1}.`} {item.employeeName}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {t.rich('staffCounts', {
                            assigned: () => <b className="tabular-nums text-teal-700 dark:text-teal-300">{item.assignedCount}</b>,
                            inProgress: item.inProgressCount,
                            closed: item.closedCount,
                          })}
                        </span>
                      </div>
                      <MiniBar value={item.assignedCount} max={maxAssigned} className={rankBarClass(index, 'teal')} />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* ⑤ Slow closers — Executive/Admin เท่านั้น */}
          {showSlowClosers && slowClosers.length > 0 && (
            <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
              <p className="text-sm font-semibold">{t('slowClosers.title')}</p>
              <p className="mb-3 text-xs text-muted-foreground">
                {t('slowClosers.hint', { min: MIN_CLOSED_SAMPLE })}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">{t('slowClosers.colEmployee')}</th>
                      <th className="py-2 pr-3 text-right font-medium">{t('slowClosers.colClosed')}</th>
                      <th className="py-2 pr-3 text-right font-medium">{t('slowClosers.colAverage')}</th>
                      <th className="py-2 pr-3 text-right font-medium">{t('slowClosers.colMedian')}</th>
                      <th className="py-2 text-right font-medium">{t('slowClosers.colWorkingTime')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slowClosers.map((item, index) => (
                      <tr key={item.employeeId} className="border-b border-border/60 last:border-0">
                        <td className="py-2 pr-3">
                          <span className={`mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                            index < 3
                              ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {index + 1}
                          </span>
                          {item.employeeName}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">{item.closedSampleCount}</td>
                        <td className={`py-2 pr-3 text-right font-semibold tabular-nums ${index < 3 ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                          {duration(item.averageLeadTimeMinutes)}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">{duration(item.medianLeadTimeMinutes)}</td>
                        <td className="py-2 text-right tabular-nums">{duration(item.averageWorkTimeMinutes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          </div>

          {/* ⑥ ภาพรวม Memo — วางท้ายสุดให้เนื้อหา ticket จบเป็นก้อนก่อน ใช้ตัวกรองช่วงเวลา/บริษัทร่วมกัน */}
          <div className="h-px bg-border" />
          <MemoOverviewCards
            params={{ dateFrom: params.dateFrom, dateTo: params.dateTo, companyId: params.companyId }}
            rangeLabel={rangeLabel}
          />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('dataCompleteFrom', {
              date: fmt.formatDate(new Date(summary.meta.dataCompleteFrom), { day: 'numeric', month: 'short', year: 'numeric' }),
            })}</span>
          </div>
        </>
      )}
    </section>
  )
}
