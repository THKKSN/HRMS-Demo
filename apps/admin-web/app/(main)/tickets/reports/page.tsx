'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowBigLeft,
  ArrowLeft,
  BackpackIcon,
  BarChart3,
  CheckCircle2,
  CircleAlertIcon,
  Clock3,
  Download,
  Filter,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Ticket,
  Timer,
  TrendingUp,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TicketPriority, TicketStatus } from '@hrms/shared-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
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
import { TICKET_STATUS_LABEL } from '@/lib/ticket-status'
import { useAuthStore } from '@/stores/auth.store'

const tabs = ['ภาพรวม', 'Routing', 'งานค้าง', 'หมวดปัญหา', 'ภาระงาน', 'คุณภาพงาน'] as const
const PAGE_SIZE = 20

function isoDate(date: Date) {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

function duration(minutes?: number) {
  if (minutes == null) return '-'
  if (minutes < 60) return `${Math.round(minutes)} นาที`
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)} ชม.`
  return `${(minutes / 1440).toFixed(1)} วัน`
}

function percent(value?: number) {
  return `${Number(value ?? 0).toFixed(1)}%`
}

function scopeLabel(value?: string) {
  if (value === 'All') return 'ทั้งหมด'
  if (value === 'SupervisorScope') return 'หน่วยที่ดูแล'
  return 'ขอบเขตที่มีสิทธิ์'
}

function statusTone(status: TicketStatus) {
  if (status === 'Open' || status === 'WaitingInfo') return 'text-amber-700 bg-amber-50'
  if (status === 'Closed') return 'text-green-700 bg-green-50'
  if (status === 'Rejected' || status === 'Cancelled') return 'text-red-700 bg-red-50'
  return 'text-blue-700 bg-blue-50'
}

function KpiCard({
  label,
  value,
  hint,
  tone,
  icon: Icon,
}: {
  label: string
  value: string | number
  hint?: string
  tone: string
  icon: LucideIcon
}) {
  return (
    <div className="rounded-md border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`mt-2 text-2xl font-semibold ${tone}`}>{value}</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      {hint && <p className="mt-3 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function MiniBar({ value, max, className = 'bg-primary' }: { value: number; max: number; className?: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full ${className}`} style={{ width: `${Math.min(100, value * 100 / Math.max(1, max))}%` }} />
    </div>
  )
}

export default function TicketReportsPage() {
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - 30)

  const [tab, setTab] = useState<(typeof tabs)[number]>('ภาพรวม')
  const [dateFrom, setDateFrom] = useState(isoDate(start))
  const [dateTo, setDateTo] = useState(isoDate(now))
  const [companyId, setCompanyId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [priority, setPriority] = useState<TicketPriority | ''>('')
  const [dateBasis, setDateBasis] = useState<'CreatedAt' | 'ClosedAt'>('CreatedAt')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)

  const employee = useAuthStore(state => state.employee)
  const isAdmin = employee?.roles.some(role => role.role === 'Admin') ?? false
  const isSupervisor = employee?.roles.some(role => role.role === 'Supervisor') ?? false
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

  const trendMax = Math.max(1, ...(trend.data ?? []).map(item => Math.max(item.openedCount, item.closedCount)))
  const trendOpenedTotal = (trend.data ?? []).reduce((sum, item) => sum + item.openedCount, 0)
  const trendClosedTotal = (trend.data ?? []).reduce((sum, item) => sum + item.closedCount, 0)
  const trendNetTotal = trendOpenedTotal - trendClosedTotal
  const categoryMax = Math.max(1, ...(categories.data ?? []).map(item => item.totalCount))
  const workloadMax = Math.max(1, ...(workload.data ?? []).map(item => item.assignedCount))
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
      anchor.download = `ticket-report-${dateFrom}-${dateTo}.xlsx`
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
      <div className="rounded-md border border-border bg-background p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">รายงานการแจ้งเรื่อง</h1>
              <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
                {scopeLabel(summary.data?.meta.appliedScope)}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              ภาพรวมงานแจ้งปัญหา ระยะเวลาการทำงาน คุณภาพการตรวจรับ และภาระงานของผู้รับผิดชอบ
            </p>
            {isSupervisor && !isAdmin && (
              <p className="mt-2 text-xs text-primary">
                Supervisor จะเห็นเฉพาะแผนกที่ตัวเองดูแลหรือมี responsibility ใน routing
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" title="โหลดข้อมูลใหม่" onClick={refetchAll}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {(isAdmin || isSupervisor) && (
              <Button className='bg-green-800 text-white' variant="outline" loading={exporting} onClick={exportExcel}>
                <Download className="h-4 w-4" /> Excel
              </Button>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Input type="date" value={dateFrom} onChange={event => { setDateFrom(event.target.value); setPage(1) }} />
          <Input type="date" value={dateTo} onChange={event => { setDateTo(event.target.value); setPage(1) }} />
          <Select value={dateBasis} onChange={event => setDateBasis(event.target.value as 'CreatedAt' | 'ClosedAt')}>
            <option value="CreatedAt">อิงวันที่เปิดเรื่อง</option>
            <option value="ClosedAt">อิงวันที่ปิดงาน</option>
          </Select>
          <Select value={companyId} onChange={event => { setCompanyId(event.target.value); setDepartmentId(''); setPage(1) }}>
            <option value="">ทุกบริษัทในสิทธิ์</option>
            {scope?.companies.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
          <Select value={departmentId} onChange={event => { setDepartmentId(event.target.value); setPage(1) }}>
            <option value="">ทุกแผนกในสิทธิ์</option>
            {departments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
          <Select value={priority} onChange={event => { setPriority(event.target.value as TicketPriority | ''); setPage(1) }}>
            <option value="">ทุกความเร่งด่วน</option>
            <option value="Low">ปกติ</option>
            <option value="Medium">กลาง</option>
            <option value="High">ด่วน</option>
            <option value="Critical">ด่วนมาก</option>
          </Select>
        </div>
      </div>

      {summary.isError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          ไม่มีสิทธิ์ดูรายงานหรือโหลดข้อมูลไม่สำเร็จ
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Ticket ในช่วงที่เลือก" value={totalInScope} hint={`${scope?.departments.length ?? 0} แผนกในสิทธิ์`} tone="text-foreground" icon={Ticket} />
        <KpiCard label="งานค้างทั้งหมด" value={summary.data?.backlogCount ?? 0} hint={`ยังไม่ปิด ${summary.data?.activeCount ?? 0} รายการ`} tone="text-red-700" icon={AlertTriangle} />
        <KpiCard label="เวลาปิดงานเฉลี่ย" value={duration(summary.data?.totalLeadTime.averageMinutes)} hint={`${summary.data?.totalLeadTime.sampleCount ?? 0} ticket ที่ปิดแล้ว`} tone="text-blue-700" icon={Timer} />
        <KpiCard label="Return rate" value={percent(quality.data?.returnRatePercent)} hint={`${quality.data?.returnedReviewCount ?? 0} ครั้งที่ส่งกลับแก้ไข`} tone="text-orange-700" icon={RotateCcw} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-md border border-border bg-background">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                <TrendingUp className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">แนวโน้มเปิดและปิดงาน</h2>
                <p className="mt-1 text-xs text-muted-foreground">แยกจำนวนงานที่แจ้งใหม่และงานที่ปิดในแต่ละวัน</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-blue-700">
                <p className="text-blue-600/80">แจ้งเรื่อง</p>
                <p className="mt-1 text-right text-base font-semibold tabular-nums">{trendOpenedTotal}</p>
              </div>
              <div className="rounded-md border border-green-100 bg-green-50 px-3 py-2 text-green-700">
                <p className="text-green-600/80">ปิดงาน</p>
                <p className="mt-1 text-right text-base font-semibold tabular-nums">{trendClosedTotal}</p>
              </div>
              <div className={`rounded-md border px-3 py-2 ${trendNetTotal > 0 ? 'border-amber-100 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                <p className="opacity-80">คงเหลือ</p>
                <p className="mt-1 text-right text-base font-semibold tabular-nums">{trendNetTotal}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[92px_1fr_64px] gap-3 border-b border-border px-4 py-2 text-[11px] font-medium uppercase text-muted-foreground">
            <span>วันที่</span>
            <span>รายการ</span>
            {/* <span className="text-right">รวม</span> */}
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto p-4">
            {(trend.data ?? []).map(item => (
              <div key={item.date} className="grid grid-cols-[92px_1fr_64px] items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs">
                <span className="font-medium text-foreground">{formatDate(item.date)}</span>
                <div className="space-y-2">
                  <div className="grid grid-cols-[52px_1fr_32px] items-center gap-2">
                    <span className="text-blue-700">แจ้งเรื่อง</span>
                    <MiniBar value={item.openedCount} max={trendMax} className="bg-blue-500" />
                    <span className="text-right tabular-nums text-blue-700">{item.openedCount}</span>
                  </div>
                  <div className="grid grid-cols-[52px_1fr_32px] items-center gap-2">
                    <span className="text-green-700">ปิดงาน</span>
                    <MiniBar value={item.closedCount} max={trendMax} className="bg-green-500" />
                    <span className="text-right tabular-nums text-green-700">{item.closedCount}</span>
                  </div>
                </div>
                {/* <span className="text-right font-semibold tabular-nums text-foreground">{item.openedCount - item.closedCount}</span> */}
              </div>
            ))}
            {(trend.data?.length ?? 0) === 0 && <EmptyState text="ไม่มีข้อมูลแนวโน้มในช่วงที่เลือก" />}
          </div>
          <div className="flex items-center justify-center gap-8 border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <p className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> แจ้งเรื่อง
            </p>
            <p className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" /> ปิดงาน
            </p>
          </div>
        </section>

        <section className="rounded-md border border-border bg-background p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">สัญญาณที่ควรดู</h2>
              <p className="mt-1 text-xs text-muted-foreground">ใช้ช่วยตัดสินใจจัดทีมและ routing</p>
            </div>
            <Filter className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-3 text-sm">
            <Insight label="งานยังไม่มอบหมาย" value={summary.data?.unassignedCount ?? 0} tone="text-amber-700" />
            <Insight label="รอ Supervisor Queue" value={routing.data?.supervisorQueueCount ?? 0} tone="text-blue-700" />
            <Insight label="Routing ไม่พบผู้รับผิดชอบ" value={routing.data?.noMatchCount ?? 0} tone="text-red-700" />
            <Insight label="งานรอตรวจปิด" value={summary.data?.waitingReviewCount ?? 0} tone="text-violet-700" />
          </div>
        </section>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map(item => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium ${
              tab === item ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === 'ภาพรวม' && (
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-md border border-border bg-background p-4">
            <h2 className="mb-3 text-sm font-semibold">สถานะงาน</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                ['เรื่องใหม่', summary.data?.openCount ?? 0, 'text-amber-700', Ticket],
                ['กำลังดำเนินการ', summary.data?.activeCount ?? 0, 'text-blue-700', Clock3],
                ['รอตรวจปิด', summary.data?.waitingReviewCount ?? 0, 'text-violet-700', ShieldCheck],
                ['ปิดแล้ว', summary.data?.closedCount ?? 0, 'text-green-700', CheckCircle2],
              ].map(([label, value, tone, Icon]) => (
                <KpiCard key={label as string} label={label as string} value={value as number} tone={tone as string} icon={Icon as LucideIcon} />
              ))}
            </div>
          </section>
          <section className="rounded-md border border-border bg-background p-4">
            <h2 className="mb-3 text-sm font-semibold">ระยะเวลาดำเนินการ</h2>
            <DurationTable rows={[
              ['รับเรื่อง', summary.data?.timeToAccept],
              ['มอบหมาย', summary.data?.timeToAssign],
              ['เริ่มงาน', summary.data?.timeToStart],
              ['ลงมือทำ', summary.data?.activeWorkTime],
              ['รอข้อมูล', summary.data?.waitingInfoTime],
              ['รอตรวจ', summary.data?.reviewTime],
              ['เปิดถึงปิด', summary.data?.totalLeadTime],
            ]} />
            <p className="mt-3 text-xs text-muted-foreground">
              Duration data สมบูรณ์ตั้งแต่ {summary.data?.meta.dataCompleteFrom ?? '-'} · เวลา {summary.data?.meta.timezone ?? 'Asia/Bangkok'}
            </p>
          </section>
        </div>
      )}

      {tab === 'Routing' && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="ประเมิน Routing แล้ว" value={routing.data?.evaluatedCount ?? 0} tone="text-foreground" icon={BarChart3} />
            <KpiCard label="มอบหมายอัตโนมัติ" value={routing.data?.autoAssignedCount ?? 0} tone="text-green-700" icon={CheckCircle2} />
            <KpiCard label="รอ Supervisor" value={routing.data?.supervisorQueueCount ?? 0} tone="text-blue-700" icon={Users} />
            <KpiCard label="ไม่พบผู้รับผิดชอบ" value={routing.data?.noMatchCount ?? 0} tone="text-red-700" icon={AlertTriangle} />
          </div>
          <ReportTable headers={['ตัวชี้วัด', 'ค่า']} rows={[
            ['Match rate', percent(routing.data?.matchRatePercent)],
            ['Auto-assignment rate', percent(routing.data?.autoAssignmentRatePercent)],
          ]} />
        </div>
      )}

      {tab === 'งานค้าง' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {Object.entries(backlog.data?.agingBuckets ?? {}).map(([label, value]) => (
              <div key={label} className="rounded-md border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">{label} วัน</p>
                <p className="mt-1 text-xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto rounded-md border border-border bg-background">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-muted/30 text-left text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">Ticket</th>
                  <th className="font-medium">แผนก</th>
                  <th className="font-medium">หมวด</th>
                  <th className="font-medium">ผู้รับผิดชอบ</th>
                  <th className="font-medium">สถานะ</th>
                  <th className="pr-3 text-right font-medium">อายุงาน</th>
                </tr>
              </thead>
              <tbody>
                {(backlog.data?.items.length ?? 0) === 0 && <EmptyRow colSpan={6} text="ไม่มีงานค้างในช่วงที่เลือก" />}
                {backlog.data?.items.map(item => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="p-3">
                      <Link href={`/tickets/${item.id}`} className="font-medium text-primary">{item.ticketNo}</Link>
                      <p className="mt-1 max-w-80 truncate">{item.title}</p>
                    </td>
                    <td>{item.departmentName}</td>
                    <td>{item.categoryName} / {item.topicName}</td>
                    <td>{item.assigneeName ?? '-'}</td>
                    <td><span className={`rounded px-2 py-1 text-xs ${statusTone(item.status)}`}>{TICKET_STATUS_LABEL[item.status]}</span></td>
                    <td className="pr-3 text-right">{item.ageDays} วัน</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>ก่อนหน้า</Button>
            <Button variant="outline" disabled={page * PAGE_SIZE >= (backlog.data?.totalCount ?? 0)} onClick={() => setPage(page + 1)}>ถัดไป</Button>
          </div>
        </div>
      )}

      {tab === 'หมวดปัญหา' && (
        <ReportTable
          headers={['หมวด / หัวข้อ', 'ปริมาณ', 'ปิดแล้ว', 'ค้าง', 'ส่งกลับ %']}
          rows={(categories.data ?? []).map(item => [
            <div key={item.topicId} className="space-y-1">
              <p>{item.categoryName} / {item.topicName}</p>
              <MiniBar value={item.totalCount} max={categoryMax} className="bg-primary" />
            </div>,
            item.totalCount,
            item.closedCount,
            item.backlogCount,
            percent(item.returnRatePercent),
          ])}
        />
      )}

      {tab === 'ภาระงาน' && (
        <ReportTable
          headers={['พนักงาน', 'เคยรับ', 'กำลังทำ', 'รอข้อมูล', 'รอตรวจ', 'ปิดแล้ว']}
          rows={(workload.data ?? []).map(item => [
            <div key={item.employeeId} className="space-y-1">
              <p>{item.employeeName}</p>
              <MiniBar value={item.assignedCount} max={workloadMax} className="bg-blue-500" />
            </div>,
            item.assignedCount,
            item.inProgressCount,
            item.waitingInfoCount,
            item.waitingReviewCount,
            item.closedCount,
          ])}
        />
      )}

      {tab === 'คุณภาพงาน' && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Ticket ที่ตรวจแล้ว" value={quality.data?.reviewedTicketCount ?? 0} tone="text-foreground" icon={ShieldCheck} />
            <KpiCard label="ส่งกลับทั้งหมด" value={quality.data?.returnedReviewCount ?? 0} tone="text-orange-700" icon={RotateCcw} />
            <KpiCard label="Return rate" value={percent(quality.data?.returnRatePercent)} tone="text-red-700" icon={AlertTriangle} />
            <KpiCard label="รอบตรวจเฉลี่ย" value={quality.data?.averageReviewRounds ?? 0} tone="text-blue-700" icon={BarChart3} />
          </div>
          <ReportTable headers={['จำนวนรอบตรวจ', 'จำนวน Ticket']} rows={Object.entries(quality.data?.reviewRoundDistribution ?? {}).map(([round, count]) => [`${round} รอบ`, count])} />
        </div>
      )}
    </div>
  )
}

function Insight({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-lg font-semibold ${tone}`}>{value}</span>
    </div>
  )
}

function DurationTable({ rows }: { rows: Array<[string, { averageMinutes?: number; medianMinutes?: number; sampleCount: number } | undefined]> }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-muted-foreground">
          <th className="py-2 font-medium">ช่วงเวลา</th>
          <th className="py-2 font-medium">เฉลี่ย</th>
          <th className="py-2 font-medium">มัธยฐาน</th>
          <th className="py-2 text-right font-medium">จำนวน</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, metric]) => (
          <tr key={label} className="border-b border-border/60">
            <td className="py-2">{label}</td>
            <td>{duration(metric?.averageMinutes)}</td>
            <td>{duration(metric?.medianMinutes)}</td>
            <td className="text-right">{metric?.sampleCount ?? 0}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ReportTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: Array<Array<ReactNode>>
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-background">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-muted/30 text-left text-muted-foreground">
          <tr>{headers.map(header => <th key={header} className="px-4 py-3 font-medium">{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0
            ? <EmptyRow colSpan={headers.length} text="ไม่มีข้อมูลในช่วงที่เลือก" />
            : rows.map((row, index) => (
              <tr key={index} className="border-t border-border">
                {row.map((value, cell) => <td key={cell} className="px-4 py-3">{value}</td>)}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
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
