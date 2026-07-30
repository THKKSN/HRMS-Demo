'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, MapPin, AlertCircle, CalendarDays } from 'lucide-react'
import { useMyAttendanceHistory } from '@/hooks/use-attendance'
import { useHolidays } from '@/hooks/use-holidays'
import { useMyLeaves } from '@/hooks/use-leaves'
import type { AttendanceRecordDto } from '@hrms/shared-types'

// ── constants ──────────────────────────────────────────────────────────────────

const MONTH_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]
const DAY_NAMES = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

const STATUS_LABEL: Record<string, string> = {
  Present: 'มาทำงาน', Late: 'มาสาย', Absent: 'ขาดงาน', HalfDay: 'ครึ่งวัน',
}
const STATUS_DOT: Record<string, string> = {
  Present: 'bg-green-500', Late: 'bg-amber-400', Absent: 'bg-red-500', HalfDay: 'bg-blue-400',
}
const STATUS_BADGE: Record<string, string> = {
  Present: 'bg-green-100 text-green-700',
  Late:    'bg-amber-100 text-amber-700',
  Absent:  'bg-red-100 text-red-700',
  HalfDay: 'bg-blue-100 text-blue-700',
}

// ── helpers ────────────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, '0') }
function toDateStr(y: number, m: number, d: number) { return `${y}-${pad(m)}-${pad(d)}` }

function formatTime(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('th-TH', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok',
  })
}
function formatLate(minutes: number) {
  if (minutes < 60) return `${minutes} นาที`
  const h = Math.floor(minutes / 60), m = minutes % 60
  return m > 0 ? `${h} ชม. ${m} น.` : `${h} ชม.`
}
function formatDateLong(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${DAY_NAMES[d.getDay()]}. ${d.getDate()} ${MONTH_TH[d.getMonth()]} ${d.getFullYear() + 543}`
}

// ── types ──────────────────────────────────────────────────────────────────────

type CellInfo =
  | { kind: 'empty' }
  | { kind: 'future' }
  | { kind: 'weekend' }
  | { kind: 'holiday'; name: string }
  | { kind: 'leave'; leaveTypeName: string }
  | { kind: 'record'; rec: AttendanceRecordDto }
  | { kind: 'noRecord' }

function getCell(
  dateStr: string, today: string,
  recordMap: Map<string, AttendanceRecordDto>,
  holidayMap: Map<string, string>,
  leaveMap: Map<string, string>,
  isWeekend: boolean,
): CellInfo {
  if (recordMap.has(dateStr)) return { kind: 'record', rec: recordMap.get(dateStr)! }
  if (leaveMap.has(dateStr))  return { kind: 'leave',  leaveTypeName: leaveMap.get(dateStr)! }
  if (holidayMap.has(dateStr)) return { kind: 'holiday', name: holidayMap.get(dateStr)! }
  if (dateStr > today) return isWeekend ? { kind: 'weekend' } : { kind: 'future' }
  if (isWeekend)       return { kind: 'weekend' }
  return { kind: 'noRecord' }
}

// ── Detail Panel ───────────────────────────────────────────────────────────────

function DetailPanel({ selected }: { selected: { dateStr: string; cell: CellInfo } | null }) {
  if (!selected) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
        <CalendarDays className="h-12 w-12 text-muted-foreground/40" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">เลือกวันในปฏิทิน</p>
        <p className="mt-1 text-xs text-muted-foreground/60">เพื่อดูรายละเอียดการเข้างาน</p>
      </div>
    )
  }

  const { dateStr, cell } = selected

  return (
    <div className="p-5 space-y-4">
      {/* Date header */}
      <div className="pb-3 border-b border-border">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">รายละเอียด</p>
        <p className="text-base font-bold text-foreground">{formatDateLong(dateStr)}</p>
      </div>

      {/* Record */}
      {cell.kind === 'record' && (
        <div className="space-y-3">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE[cell.rec.status] ?? 'bg-whited text-muted-foreground'}`}>
            {STATUS_LABEL[cell.rec.status] ?? cell.rec.status}
            {cell.rec.isLate && cell.rec.lateMinutes > 0 && ` · สาย ${formatLate(cell.rec.lateMinutes)}`}
          </span>

          <div className="rounded-xl border border-border divide-y divide-border">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> เข้างาน
              </div>
              <span className="text-sm font-semibold text-foreground">{formatTime(cell.rec.checkInTime)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> ออกงาน
              </div>
              <span className="text-sm font-semibold text-foreground">{formatTime(cell.rec.checkOutTime)}</span>
            </div>
            {cell.rec.locationName && (
              <div className="flex items-start justify-between gap-2 px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                  <MapPin className="h-3.5 w-3.5" /> สถานที่
                </div>
                <span className="text-sm font-medium text-right">{cell.rec.locationName}</span>
              </div>
            )}
          </div>

          {/* Duration */}
          {cell.rec.checkInTime && cell.rec.checkOutTime && (() => {
            const inMs  = new Date(cell.rec.checkInTime).getTime()
            const outMs = new Date(cell.rec.checkOutTime).getTime()
            const diff  = outMs - inMs
            if (diff <= 0) return null
            const h = Math.floor(diff / 3600000)
            const m = Math.floor((diff % 3600000) / 60000)
            return (
              <div className="flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3">
                <span className="text-sm text-muted-foreground">ระยะเวลาทำงาน</span>
                <span className="text-sm font-bold text-primary">{h} ชม. {m} น.</span>
              </div>
            )
          })()}
        </div>
      )}

      {cell.kind === 'leave' && (
        <div className="flex items-center gap-3 rounded-xl bg-purple-50 border border-purple-100 px-4 py-3">
          <span className="text-lg">📋</span>
          <div>
            <p className="text-sm font-semibold text-purple-800">ลางาน</p>
            <p className="text-xs text-purple-600">{cell.leaveTypeName}</p>
          </div>
        </div>
      )}

      {cell.kind === 'holiday' && (
        <div className="flex items-center gap-3 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
          <span className="text-lg">🏖️</span>
          <div>
            <p className="text-sm font-semibold text-gray-700">วันหยุดนักขัตฤกษ์</p>
            <p className="text-xs text-gray-500">{cell.name}</p>
          </div>
        </div>
      )}

      {cell.kind === 'weekend' && (
        <div className="flex items-center gap-3 rounded-xl bg-whited px-4 py-3">
          <span className="text-lg">😴</span>
          <p className="text-sm text-muted-foreground">วันหยุดสุดสัปดาห์</p>
        </div>
      )}

      {cell.kind === 'noRecord' && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">ไม่มีการลงเวลาในวันนี้</p>
        </div>
      )}

      {cell.kind === 'future' && (
        <div className="flex items-center gap-3 rounded-xl bg-whited px-4 py-3">
          <span className="text-lg">🔮</span>
          <p className="text-sm text-muted-foreground">ยังไม่ถึงวันนี้</p>
        </div>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function MyAttendancePage() {
  const now      = new Date()
  const todayStr = toDateStr(now.getFullYear(), now.getMonth() + 1, now.getDate())

  const [year,     setYear]     = useState(now.getFullYear())
  const [month,    setMonth]    = useState(now.getMonth() + 1)
  const [selected, setSelected] = useState<{ dateStr: string; cell: CellInfo } | null>(null)

  const lastDay  = new Date(year, month, 0).getDate()
  const from     = toDateStr(year, month, 1)
  const to       = toDateStr(year, month, lastDay)

  const { data: historyData, isLoading: histLoading } = useMyAttendanceHistory(from, to)
  const { data: holidays = [],  isLoading: holLoading  } = useHolidays(year)
  const { data: leavesData, isLoading: leaveLoading   } = useMyLeaves({ status: 'Approved', pageSize: 200 })

  const isLoading = histLoading || holLoading || leaveLoading

  // build lookup maps
  const recordMap = new Map<string, AttendanceRecordDto>()
  for (const rec of historyData?.items ?? []) recordMap.set(rec.date, rec)

  const yearMonthPrefix = `${year}-${pad(month)}`
  const holidayMap = new Map<string, string>()
  for (const h of holidays) {
    if (h.date.startsWith(yearMonthPrefix) && h.isActive) holidayMap.set(h.date, h.name)
  }

  const leaveMap = new Map<string, string>()
  for (const leave of leavesData?.items ?? []) {
    const d = new Date(leave.dateFrom + 'T00:00:00')
    const end = new Date(leave.dateTo + 'T00:00:00')
    while (d <= end) {
      const ds = toDateStr(d.getFullYear(), d.getMonth() + 1, d.getDate())
      if (ds >= from && ds <= to) leaveMap.set(ds, leave.leaveTypeName)
      d.setDate(d.getDate() + 1)
    }
  }

  // summary counts
  let cntPresent = 0, cntLate = 0, cntAbsent = 0
  for (const rec of recordMap.values()) {
    if (rec.status === 'Present') cntPresent++
    else if (rec.status === 'Late') cntLate++
    else if (rec.status === 'Absent') cntAbsent++
  }

  // calendar grid
  const firstDow   = new Date(year, month - 1, 1).getDay()
  const totalCells = Math.ceil((firstDow + lastDay) / 7) * 7
  function prevMonth() {
    setSelected(null)
    if (month === 1) { setYear((y) => y - 1); setMonth(12) }
    else setMonth((m) => m - 1)
  }
  const maxMonths = now.getFullYear() * 12 + now.getMonth() + 12 // ไปข้างหน้าได้สูงสุด 12 เดือน
  const viewingMonths = year * 12 + (month - 1)
  const canGoNext = viewingMonths < maxMonths

  function nextMonth() {
    if (!canGoNext) return
    setSelected(null)
    if (month === 12) { setYear((y) => y + 1); setMonth(1) }
    else setMonth((m) => m + 1)
  }
  function handleCellClick(day: number) {
    const dateStr  = toDateStr(year, month, day)
    const dow      = new Date(dateStr + 'T00:00:00').getDay()
    const isWeekend = dow === 0 || dow === 6
    const cell     = getCell(dateStr, todayStr, recordMap, holidayMap, leaveMap, isWeekend)
    if (cell.kind === 'empty') return
    setSelected({ dateStr, cell })
  }

  return (
    <div className="min-h-full bg-whited/40 p-4 lg:p-6">
      <div className="mx-auto max-w-6xl space-y-4">

        {/* ── Page header ─────────────────────────────────────── */}
        <div>
          <h1 className="text-xl font-bold text-foreground">ประวัติการเข้างาน</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">ตรวจสอบเวลาเข้า-ออกของคุณ</p>
        </div>

        {/* ── Main layout: stacked mobile | 70/30 desktop ────── */}
        <div className="flex flex-col lg:flex-row gap-4 lg:items-start">

          {/* ── Calendar panel (full mobile | 70% desktop) ──────── */}
          <div className="w-full lg:flex-7 min-w-0 rounded-2xl border border-border bg-background shadow-sm overflow-hidden">

            {/* Month navigation */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <button
                onClick={prevMonth}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-whited transition-colors text-muted-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-bold text-foreground">
                {MONTH_TH[month - 1]} {year + 543}
              </span>
              <button
                onClick={nextMonth}
                disabled={!canGoNext}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-whited transition-colors text-muted-foreground disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-border">
              {DAY_NAMES.map((d, i) => (
                <div
                  key={d}
                  className={`py-2.5 text-center text-xs font-semibold ${
                    i === 0 || i === 6 ? 'text-muted-foreground/60' : 'text-muted-foreground'
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Grid */}
            {isLoading ? (
              <div className="grid grid-cols-7">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="aspect-square border-b border-r border-border/40 animate-pulse bg-whited/30" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7">
                {Array.from({ length: totalCells }).map((_, idx) => {
                  const day = idx - firstDow + 1
                  if (day < 1 || day > lastDay) return <div key={idx} className="aspect-square" />

                  const dateStr   = toDateStr(year, month, day)
                  const dow       = new Date(dateStr + 'T00:00:00').getDay()
                  const isWeekend = dow === 0 || dow === 6
                  const cell      = getCell(dateStr, todayStr, recordMap, holidayMap, leaveMap, isWeekend)
                  const isToday   = dateStr === todayStr
                  const isSelected = selected?.dateStr === dateStr

                  let cellBg = ''
                  if (cell.kind === 'weekend') cellBg = 'bg-whited/30'
                  else if (cell.kind === 'holiday') cellBg = 'bg-gray-50'
                  else if (cell.kind === 'leave') cellBg = 'bg-purple-50'

                  return (
                    <button
                      key={idx}
                      onClick={() => handleCellClick(day)}
                      className={`relative flex flex-col items-center pt-2 pb-1.5 aspect-square border-b border-r border-border/40 transition-colors hover:bg-primary/5 ${cellBg} ${
                        isSelected ? 'ring-2 ring-inset ring-primary' : ''
                      }`}
                    >
                      {/* วันที่ */}
                      <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full leading-none ${
                        isToday    ? 'bg-primary text-primary-foreground font-bold' :
                        isWeekend  ? 'text-muted-foreground/50' :
                        cell.kind === 'future' ? 'text-muted-foreground/30' : 'text-foreground'
                      }`}>
                        {day}
                      </span>

                      {/* Dot indicator */}
                      <div className="mt-1">
                        {cell.kind === 'record' && (
                          <span className={`block w-1.5 h-1.5 rounded-full ${STATUS_DOT[cell.rec.status] ?? 'bg-whited-foreground'}`} />
                        )}
                        {cell.kind === 'leave' && (
                          <span className="block w-1.5 h-1.5 rounded-full bg-purple-400" />
                        )}
                        {cell.kind === 'holiday' && (
                          <span className="block w-1.5 h-1.5 rounded-full bg-gray-400" />
                        )}
                        {cell.kind === 'noRecord' && (
                          <span className="block w-1 h-1 rounded-full bg-whited-foreground/25" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Legend + Summary */}
            <div className="border-t border-border px-5 py-4 space-y-3">
              {/* Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {[
                  { dot: 'bg-green-500',  label: 'ทำงาน' },
                  { dot: 'bg-amber-400',  label: 'มาสาย' },
                  { dot: 'bg-red-500',    label: 'ขาดงาน' },
                  { dot: 'bg-purple-400', label: 'ลางาน' },
                  { dot: 'bg-gray-400',   label: 'วันหยุด' },
                ].map(({ dot, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${dot}`} />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>

              {/* Summary counts */}
              {!isLoading && (
                <div className="grid grid-cols-5 divide-x divide-border rounded-xl border border-border text-center">
                  {[
                    { label: 'ทำงาน',   value: cntPresent,      color: 'text-green-600' },
                    { label: 'สาย',     value: cntLate,          color: 'text-amber-600' },
                    { label: 'ขาดงาน',  value: cntAbsent,        color: 'text-red-600' },
                    { label: 'ลางาน',   value: leaveMap.size,    color: 'text-purple-600' },
                    { label: 'วันหยุด', value: holidayMap.size,  color: 'text-gray-600' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="py-2.5 px-1">
                      <p className={`text-base font-bold ${color}`}>{value}</p>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Detail panel (full mobile | 30% desktop) ────────── */}
          {/* mobile: แสดงเฉพาะเมื่อเลือกวันแล้ว | desktop: แสดงเสมอ + sticky */}
          <div className={`w-full lg:flex-3 min-w-0 lg:sticky lg:top-4 ${!selected ? 'hidden lg:block' : ''}`}>
            <div className="rounded-2xl border border-border bg-background shadow-sm min-h-64">
              <DetailPanel selected={selected} />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
