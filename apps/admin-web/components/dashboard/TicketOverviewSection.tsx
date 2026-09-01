'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts'
import {
  CheckCircle2, ClipboardCheck, Inbox, TicketCheck, Timer, TriangleAlert, UserRoundSearch, Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { TicketRequestType } from '@hrms/shared-types'
import {
  useTicketCategoryReport,
  useTicketReportScope,
  useTicketReportSummary,
  useTicketTrend,
  useTicketWorkloadReport,
} from '@/hooks/use-ticket-reports'
import type { TicketReportParams } from '@/lib/ticket-reports.api'

const RANGE_OPTIONS = [7, 30, 90] as const
const SEGMENTS: { value: TicketRequestType | ''; label: string }[] = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'Internal', label: 'ภายใน' },
  { value: 'External', label: 'ภายนอก' },
]
const RANK_BADGE = ['🥇', '🥈', '🥉']
const MIN_CLOSED_SAMPLE = 3

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function duration(minutes?: number | null) {
  if (minutes === null || minutes === undefined) return '—'
  if (minutes < 60) return `${Math.round(minutes)} นาที`
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)} ชม.`
  return `${(minutes / 1440).toFixed(1)} วัน`
}

// โทนสีตามความหมายข้อมูล — ชุดเดียวกับ quick-link เดิมของแอป
type Tone = 'sky' | 'amber' | 'violet' | 'cyan' | 'emerald' | 'rose' | 'teal' | 'indigo'
const TONE: Record<Tone, { chip: string; value: string }> = {
  sky:     { chip: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400',             value: 'text-sky-700 dark:text-sky-300' },
  amber:   { chip: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',     value: 'text-amber-700 dark:text-amber-300' },
  violet:  { chip: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400', value: 'text-violet-700 dark:text-violet-300' },
  cyan:    { chip: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400',         value: 'text-cyan-700 dark:text-cyan-300' },
  emerald: { chip: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400', value: 'text-emerald-700 dark:text-emerald-300' },
  rose:    { chip: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400',         value: 'text-rose-700 dark:text-rose-300' },
  teal:    { chip: 'bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400',         value: 'text-teal-700 dark:text-teal-300' },
  indigo:  { chip: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400', value: 'text-indigo-700 dark:text-indigo-300' },
}

function KpiCard({
  label, value, hint, icon: Icon, tone,
}: {
  label: string
  value: string | number
  hint?: string
  icon: LucideIcon
  tone: Tone
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
      <div className={`inline-flex rounded-xl p-2 ${TONE[tone].chip}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${TONE[tone].value}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

function MiniBar({ value, max, className }: { value: number; max: number; className: string }) {
  const width = max > 0 ? Math.max(2, (value / max) * 100) : 0
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full ${className}`} style={{ width: `${width}%` }} />
    </div>
  )
}

function SegmentGroup<T extends string | number>({
  options, value, onChange, render,
}: {
  options: readonly T[]
  value: T
  onChange: (option: T) => void
  render: (option: T) => string
}) {
  return (
    <div className="flex gap-0.5 rounded-full bg-muted p-0.5 text-xs">
      {options.map(option => (
        <button
          key={String(option)}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
            value === option
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {render(option)}
        </button>
      ))}
    </div>
  )
}

export function TicketOverviewSection({
  showCompanyFilter = false,
  showSlowClosers = false,
}: {
  showCompanyFilter?: boolean
  showSlowClosers?: boolean
}) {
  const [days, setDays] = useState<(typeof RANGE_OPTIONS)[number]>(30)
  const [requestType, setRequestType] = useState<TicketRequestType | ''>('')
  const [companyId, setCompanyId] = useState('')

  const to = new Date()
  const from = new Date()
  from.setDate(to.getDate() - (days - 1))
  const params: TicketReportParams = {
    dateFrom: isoDate(from),
    dateTo: isoDate(to),
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
    label: new Date(item.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
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
          <p className="text-sm font-semibold">ภาพรวมการแจ้งเรื่อง</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentGroup
            options={RANGE_OPTIONS}
            value={days}
            onChange={setDays}
            render={option => `${option} วัน`}
          />
          <SegmentGroup
            options={SEGMENTS.map(segment => segment.value) as readonly (TicketRequestType | '')[]}
            value={requestType}
            onChange={setRequestType}
            render={option => SEGMENTS.find(segment => segment.value === option)?.label ?? ''}
          />
          {showCompanyFilter && companies.length > 1 && (
            <select
              value={companyId}
              onChange={event => setCompanyId(event.target.value)}
              className="h-8 rounded-full border border-border bg-background px-3 text-xs outline-none focus:border-primary"
            >
              <option value="">ทุกบริษัท</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {summaryQuery.isLoading || !summary ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : (
        <>
          {/* ① KPI cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <KpiCard label="เปิดใหม่" value={summary.openCount} icon={Inbox} tone="sky" />
            <KpiCard label="ยังไม่มีผู้รับ" value={summary.unassignedCount} icon={UserRoundSearch} tone="amber" />
            <KpiCard label="กำลังดำเนินการ" value={summary.activeCount} icon={Wrench} tone="violet" />
            <KpiCard label="รอตรวจรับ" value={summary.waitingReviewCount} icon={ClipboardCheck} tone="cyan" />
            <KpiCard label="ปิดแล้ว" value={summary.closedCount} icon={CheckCircle2} tone="emerald" />
            <KpiCard label="งานค้าง" value={summary.backlogCount} icon={TriangleAlert} tone="rose" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KpiCard
              label="เวลารับงานเฉลี่ย"
              value={duration(summary.timeToAccept.averageMinutes)}
              hint={`median ${duration(summary.timeToAccept.medianMinutes)} · ${summary.timeToAccept.sampleCount} งาน`}
              icon={Timer}
              tone="teal"
            />
            <KpiCard
              label="เวลาจบงานเฉลี่ย"
              value={duration(summary.totalLeadTime.averageMinutes)}
              hint={`median ${duration(summary.totalLeadTime.medianMinutes)} · ${summary.totalLeadTime.sampleCount} งาน`}
              icon={Timer}
              tone="indigo"
            />
            <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
              <p className="text-xs text-muted-foreground">ภายใน vs ภายนอก (เปิดใหม่ / ค้าง)</p>
              <div className="mt-2 flex items-center gap-3 text-sm">
                <span className="flex-1 rounded-xl bg-teal-50 px-3 py-2 dark:bg-teal-500/10">
                  <span className="block text-[11px] text-teal-700 dark:text-teal-300">ภายใน</span>
                  <b className="tabular-nums text-teal-700 dark:text-teal-300">{internalSummary.data?.openCount ?? '—'}</b>
                  <span className="text-muted-foreground"> / {internalSummary.data?.backlogCount ?? '—'}</span>
                </span>
                <span className="flex-1 rounded-xl bg-rose-50 px-3 py-2 dark:bg-rose-500/10">
                  <span className="block text-[11px] text-rose-700 dark:text-rose-300">ภายนอก</span>
                  <b className="tabular-nums text-rose-700 dark:text-rose-300">{externalSummary.data?.openCount ?? '—'}</b>
                  <span className="text-muted-foreground"> / {externalSummary.data?.backlogCount ?? '—'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* ② Trend */}
          <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
            <p className="mb-4 text-sm font-semibold">ความถี่การแจ้งเรื่อง {days} วัน</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trend} margin={{ top: 4, right: 12, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e5e7eb' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="openedCount" name="เปิดใหม่" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.12} strokeWidth={2} />
                <Area type="monotone" dataKey="closedCount" name="ปิดแล้ว" stroke="#10b981" fill="#10b981" fillOpacity={0.12} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* ③+④ Tier lists */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
              <p className="mb-3 text-sm font-semibold">หัวข้อที่ถูกแจ้งมากที่สุด</p>
              {topTopics.length === 0 ? (
                <p className="text-sm text-muted-foreground">ไม่มีข้อมูลในช่วงที่เลือก</p>
              ) : (
                <ul className="space-y-2.5">
                  {topTopics.map((item, index) => (
                    <li key={`${item.categoryId}-${item.topicId}-${item.subjectId}`}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate">
                          {RANK_BADGE[index] ?? `${index + 1}.`}{' '}
                          {[item.categoryName, item.topicName, item.subjectName].filter(Boolean).join(' / ') || '—'}
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums text-violet-700 dark:text-violet-300">{item.totalCount}</span>
                      </div>
                      <MiniBar
                        value={item.totalCount}
                        max={maxTopicCount}
                        className={index === 0 ? 'bg-violet-500' : index === 1 ? 'bg-violet-400' : index === 2 ? 'bg-violet-300' : 'bg-violet-200 dark:bg-violet-500/30'}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
              <p className="mb-3 text-sm font-semibold">การมอบหมายงาน</p>
              {workload.length === 0 ? (
                <p className="text-sm text-muted-foreground">ไม่มีข้อมูลในช่วงที่เลือก</p>
              ) : (
                <ul className="space-y-2.5">
                  {workload.map((item, index) => (
                    <li key={item.employeeId}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate">
                          {RANK_BADGE[index] ?? `${index + 1}.`} {item.employeeName}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          รับ <b className="tabular-nums text-teal-700 dark:text-teal-300">{item.assignedCount}</b> · ทำอยู่ {item.inProgressCount} · ปิด {item.closedCount}
                        </span>
                      </div>
                      <MiniBar
                        value={item.assignedCount}
                        max={maxAssigned}
                        className={index === 0 ? 'bg-teal-500' : index === 1 ? 'bg-teal-400' : index === 2 ? 'bg-teal-300' : 'bg-teal-200 dark:bg-teal-500/30'}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* ⑤ Slow closers — Executive/Admin เท่านั้น */}
          {showSlowClosers && slowClosers.length > 0 && (
            <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
              <p className="text-sm font-semibold">เวลาจบงานเฉลี่ยรายคน (ช้า → เร็ว)</p>
              <p className="mb-3 text-xs text-muted-foreground">
                เฉพาะคนที่ปิดงานตั้งแต่ {MIN_CLOSED_SAMPLE} งานขึ้นไปในช่วงที่เลือก
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">พนักงาน</th>
                      <th className="py-2 pr-3 text-right font-medium">ปิดแล้ว</th>
                      <th className="py-2 pr-3 text-right font-medium">เฉลี่ย</th>
                      <th className="py-2 pr-3 text-right font-medium">Median</th>
                      <th className="py-2 text-right font-medium">เวลาทำจริงเฉลี่ย</th>
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

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>ข้อมูลระยะเวลาเชื่อถือได้ตั้งแต่ {new Date(summary.meta.dataCompleteFrom).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <Link href="/tickets/reports" className="rounded-full bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20">
              ดูรายงานเต็ม →
            </Link>
          </div>
        </>
      )}
    </section>
  )
}
