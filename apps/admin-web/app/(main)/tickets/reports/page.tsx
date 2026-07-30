'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { BarChart3, Download, RefreshCw } from 'lucide-react'
import type { TicketPriority } from '@hrms/shared-types'
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
import { useAuthStore } from '@/stores/auth.store'

const tabs = ['ภาพรวม', 'Routing', 'งานค้าง', 'หมวดปัญหา', 'ภาระงาน', 'คุณภาพงาน'] as const

function isoDate(date: Date) {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

function duration(minutes?: number) {
  if (minutes == null) return '-'
  if (minutes < 60) return `${Math.round(minutes)} นาที`
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)} ชม.`
  return `${(minutes / 1440).toFixed(1)} วัน`
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
  const { data: scope } = useTicketReportScope()
  const employee = useAuthStore(state => state.employee)
  const isAdmin = employee?.roles.some(role => role.role === 'Admin') ?? false
  const departments = useMemo(
    () => scope?.departments.filter(item => !companyId || item.companyId === companyId) ?? [],
    [scope, companyId],
  )
  const params: TicketReportParams = {
    dateFrom, dateTo,
    companyId: companyId || undefined,
    departmentId: departmentId || undefined,
    priority: priority || undefined,
    dateBasis,
  }
  const summary = useTicketReportSummary(params)
  const trend = useTicketTrend(params)
  const backlog = useTicketBacklog({ ...params, page, pageSize: 20 })
  const categories = useTicketCategoryReport(params)
  const workload = useTicketWorkloadReport(params)
  const quality = useTicketQualityReport(params)
  const routing = useTicketRoutingReport(params)
  const loading = summary.isFetching || trend.isFetching || backlog.isFetching || categories.isFetching || workload.isFetching || quality.isFetching || routing.isFetching

  async function exportCsv() {
    setExporting(true)
    try {
      const blob = await ticketReportsApi.exportCsv(params)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `ticket-report-${dateFrom}-${dateTo}.csv`
      anchor.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const summaryCards = summary.data ? [
    ['เรื่องใหม่', summary.data.openCount, 'text-amber-700'],
    ['กำลังดำเนินการ', summary.data.activeCount, 'text-blue-700'],
    ['รอตรวจปิด', summary.data.waitingReviewCount, 'text-violet-700'],
    ['ปิดแล้ว', summary.data.closedCount, 'text-green-700'],
    ['งานค้าง', summary.data.backlogCount, 'text-red-700'],
    ['ส่งกลับแก้ไข', summary.data.returnedCount, 'text-orange-700'],
  ] as const : []
  const durationRows = summary.data ? [
    ['รับเรื่อง', summary.data.timeToAccept],
    ['มอบหมาย', summary.data.timeToAssign],
    ['เริ่มงาน', summary.data.timeToStart],
    ['ลงมือทำ', summary.data.activeWorkTime],
    ['รอข้อมูล', summary.data.waitingInfoTime],
    ['รอตรวจ', summary.data.reviewTime],
    ['ตั้งแต่เปิดถึงปิด', summary.data.totalLeadTime],
  ] as const : []
  const trendMax = Math.max(1, ...(trend.data ?? []).map(item => Math.max(item.openedCount, item.closedCount)))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-semibold">รายงานการแจ้งเรื่อง</h1>
          <p className="mt-1 text-sm text-muted-foreground">ปริมาณงาน ระยะเวลา และคุณภาพการแก้ไข</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" title="โหลดข้อมูลใหม่" onClick={() => {
            summary.refetch(); trend.refetch(); backlog.refetch(); categories.refetch(); workload.refetch(); quality.refetch(); routing.refetch()
          }}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          {isAdmin && (
            <Button variant="outline" loading={exporting} onClick={exportCsv}>
              <Download className="h-4 w-4" /> CSV
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
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
          <option value="Low">ปกติ</option><option value="Medium">กลาง</option>
          <option value="High">ด่วน</option><option value="Critical">ด่วนมาก</option>
        </Select>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map(item => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium ${tab === item ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
            {item}
          </button>
        ))}
      </div>

      {summary.isError && <div className="border border-destructive/30 p-4 text-sm text-destructive">ไม่มีสิทธิ์ดูรายงานหรือโหลดข้อมูลไม่สำเร็จ</div>}

      {tab === 'ภาพรวม' && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {summaryCards.map(([label, value, color]) => (
              <div key={label} className="rounded-md border border-border bg-background p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`mt-2 text-2xl font-semibold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
          <section className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 className="border-b border-border pb-2 text-sm font-semibold">ระยะเวลาดำเนินการ</h2>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-2 font-medium">ช่วงเวลา</th><th className="py-2 font-medium">เฉลี่ย</th><th className="py-2 font-medium">มัธยฐาน</th><th className="py-2 text-right font-medium">จำนวน</th></tr></thead>
                <tbody>{durationRows.map(([label, metric]) => <tr key={label} className="border-b border-border/60"><td className="py-2">{label}</td><td>{duration(metric.averageMinutes)}</td><td>{duration(metric.medianMinutes)}</td><td className="text-right">{metric.sampleCount}</td></tr>)}</tbody>
              </table>
            </div>
            <div>
              <h2 className="border-b border-border pb-2 text-sm font-semibold">แนวโน้มเปิดและปิดงาน</h2>
              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                {(trend.data ?? []).map(item => (
                  <div key={item.date} className="grid grid-cols-[88px_1fr_48px] items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{item.date}</span>
                    <div className="space-y-1">
                      <div className="h-2 bg-muted"><div className="h-full bg-blue-500" style={{ width: `${item.openedCount * 100 / trendMax}%` }} /></div>
                      <div className="h-2 bg-muted"><div className="h-full bg-green-500" style={{ width: `${item.closedCount * 100 / trendMax}%` }} /></div>
                    </div>
                    <span className="text-right">{item.openedCount}/{item.closedCount}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <p className="text-xs text-muted-foreground">Duration data สมบูรณ์ตั้งแต่ {summary.data?.meta.dataCompleteFrom ?? '-'} · เวลา Asia/Bangkok</p>
        </div>
      )}

      {tab === 'งานค้าง' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {Object.entries(backlog.data?.agingBuckets ?? {}).map(([label, value]) => <div key={label} className="rounded-md border border-border p-3"><p className="text-xs text-muted-foreground">{label} วัน</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}
          </div>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[900px] text-sm"><thead className="bg-muted/30 text-left text-muted-foreground"><tr><th className="p-3">Ticket</th><th>แผนก</th><th>หมวด</th><th>ผู้รับผิดชอบ</th><th>สถานะ</th><th className="pr-3 text-right">อายุงาน</th></tr></thead>
              <tbody>{backlog.data?.items.map(item => <tr key={item.id} className="border-t border-border"><td className="p-3"><Link href={`/tickets/${item.id}`} className="font-medium text-primary">{item.ticketNo}</Link><p className="mt-1 max-w-80 truncate">{item.title}</p></td><td>{item.departmentName}</td><td>{item.categoryName} / {item.topicName}</td><td>{item.assigneeName ?? '-'}</td><td>{item.status}</td><td className="pr-3 text-right">{item.ageDays} วัน</td></tr>)}</tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>ก่อนหน้า</Button><Button variant="outline" disabled={page * 20 >= (backlog.data?.totalCount ?? 0)} onClick={() => setPage(page + 1)}>ถัดไป</Button></div>
        </div>
      )}

      {tab === 'Routing' && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['ประเมิน Routing แล้ว', routing.data?.evaluatedCount ?? 0],
              ['มอบหมายอัตโนมัติ', routing.data?.autoAssignedCount ?? 0],
              ['รอ Supervisor', routing.data?.supervisorQueueCount ?? 0],
              ['ไม่พบผู้รับผิดชอบ', routing.data?.noMatchCount ?? 0],
            ].map(([label, value]) => <div key={label} className="rounded-md border border-border p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}
          </div>
          <ReportTable headers={['ตัวชี้วัด', 'เปอร์เซ็นต์']} rows={[
            ['Match rate', `${routing.data?.matchRatePercent ?? 0}%`],
            ['Auto-assignment rate', `${routing.data?.autoAssignmentRatePercent ?? 0}%`],
          ]} />
        </div>
      )}

      {tab === 'หมวดปัญหา' && <ReportTable headers={['หมวด / หัวข้อ', 'ทั้งหมด', 'ปิดแล้ว', 'ค้าง', 'ส่งกลับ %']} rows={(categories.data ?? []).map(item => [`${item.categoryName} / ${item.topicName}`, item.totalCount, item.closedCount, item.backlogCount, item.returnRatePercent.toFixed(1)])} />}
      {tab === 'ภาระงาน' && <ReportTable headers={['พนักงาน', 'เคยรับ', 'กำลังทำ', 'รอข้อมูล', 'รอตรวจ', 'ปิดแล้ว']} rows={(workload.data ?? []).map(item => [item.employeeName, item.assignedCount, item.inProgressCount, item.waitingInfoCount, item.waitingReviewCount, item.closedCount])} />}
      {tab === 'คุณภาพงาน' && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[['Ticket ที่ตรวจแล้ว', quality.data?.reviewedTicketCount ?? 0], ['ส่งกลับทั้งหมด', quality.data?.returnedReviewCount ?? 0], ['Return rate', `${quality.data?.returnRatePercent ?? 0}%`], ['รอบตรวจเฉลี่ย', quality.data?.averageReviewRounds ?? 0]].map(([label, value]) => <div key={label} className="rounded-md border border-border p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}
          </div>
          <ReportTable headers={['จำนวนรอบตรวจ', 'จำนวน Ticket']} rows={Object.entries(quality.data?.reviewRoundDistribution ?? {}).map(([round, count]) => [`${round} รอบ`, count])} />
        </div>
      )}
    </div>
  )
}

function ReportTable({ headers, rows }: { headers: string[]; rows: Array<Array<string | number>> }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[680px] text-sm">
        <thead className="bg-muted/30 text-left text-muted-foreground"><tr>{headers.map(header => <th key={header} className="px-4 py-3 font-medium">{header}</th>)}</tr></thead>
        <tbody>{rows.length === 0 ? <tr><td colSpan={headers.length} className="px-4 py-12 text-center text-muted-foreground"><BarChart3 className="mx-auto mb-2 h-6 w-6" />ไม่มีข้อมูลในช่วงที่เลือก</td></tr> : rows.map((row, index) => <tr key={index} className="border-t border-border">{row.map((value, cell) => <td key={cell} className="px-4 py-3">{value}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}
