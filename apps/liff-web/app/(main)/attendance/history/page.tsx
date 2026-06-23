'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, ArrowLeft, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMyAttendanceHistory } from '@/hooks/use-attendance'
import { useMyHolidays } from '@/hooks/use-holidays'
import { useMyLeaves } from '@/hooks/use-leaves'
import type { AttendanceRecordDto } from '@hrms/shared-types'

// ── constants ─────────────────────────────────────────────────────────────────

const MONTH_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

const DAY_NAMES = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

const STATUS_LABEL: Record<string, string> = {
  Present: 'มาทำงาน',
  Late: 'มาสาย',
  Absent: 'ขาดงาน',
  HalfDay: 'ครึ่งวัน',
}

const STATUS_DOT: Record<string, string> = {
  Present: 'bg-green-500',
  Late: 'bg-yellow-400',
  Absent: 'bg-red-500',
  HalfDay: 'bg-blue-400',
}

const LEAVE_BG = 'bg-purple-50'
const LEAVE_DOT = 'bg-purple-400'

const STATUS_BADGE: Record<string, string> = {
  Present: 'bg-green-100 text-green-700',
  Late: 'bg-yellow-100 text-yellow-700',
  Absent: 'bg-red-100 text-red-700',
  HalfDay: 'bg-blue-100 text-blue-700',
}

// ── helpers ───────────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, '0') }

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${pad(m)}-${pad(d)}`
}

function formatTime(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('th-TH', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok',
  })
}

function formatLate(minutes: number) {
  if (minutes < 60) return `${minutes} นาที`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h} ชม. ${m} น.` : `${h} ชม.`
}

// ── DayCell ───────────────────────────────────────────────────────────────────

type CellInfo =
  | { kind: 'empty' }
  | { kind: 'future' }
  | { kind: 'weekend' }
  | { kind: 'holiday'; name: string }
  | { kind: 'leave'; leaveTypeName: string }
  | { kind: 'record'; rec: AttendanceRecordDto }
  | { kind: 'noRecord' }

function getCell(
  dateStr: string,
  today: string,
  recordMap: Map<string, AttendanceRecordDto>,
  holidayMap: Map<string, string>,
  leaveMap: Map<string, string>,
  isWeekend: boolean,
): CellInfo {
  if (recordMap.has(dateStr)) return { kind: 'record', rec: recordMap.get(dateStr)! }
  if (leaveMap.has(dateStr)) return { kind: 'leave', leaveTypeName: leaveMap.get(dateStr)! }
  if (holidayMap.has(dateStr)) return { kind: 'holiday', name: holidayMap.get(dateStr)! }
  if (dateStr > today) return isWeekend ? { kind: 'weekend' } : { kind: 'future' }
  if (isWeekend) return { kind: 'weekend' }
  return { kind: 'noRecord' }
}

// ── Bottom Sheet ──────────────────────────────────────────────────────────────

function BottomSheet({
  day,
  dateStr,
  cell,
  onClose,
}: {
  day: number
  dateStr: string
  cell: CellInfo
  onClose: () => void
}) {
  const d = new Date(dateStr + 'T00:00:00')
  const dayName = DAY_NAMES[d.getDay()]
  const monthName = MONTH_TH[d.getMonth()]
  const year = d.getFullYear() + 543

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-t-2xl bg-background p-5 pb-8 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">
            {dayName}. {day} {monthName} {year}
          </p>
          <button onClick={onClose} className="rounded-full p-1 active:bg-muted">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        {cell.kind === 'record' && (
          <div className="space-y-3">
            <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold ${STATUS_BADGE[cell.rec.status] ?? 'bg-muted text-muted-foreground'}`}>
              {STATUS_LABEL[cell.rec.status] ?? cell.rec.status}
              {cell.rec.isLate && cell.rec.lateMinutes > 0 && ` · สาย ${formatLate(cell.rec.lateMinutes)}`}
            </span>
            <div className="rounded-xl border border-border divide-y divide-border text-sm">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-muted-foreground">เข้างาน</span>
                <span className="font-medium">{formatTime(cell.rec.checkInTime)}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-muted-foreground">ออกงาน</span>
                <span className="font-medium">{formatTime(cell.rec.checkOutTime)}</span>
              </div>
              {cell.rec.locationName && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-muted-foreground">สถานที่</span>
                  <span className="font-medium text-right max-w-[60%] truncate">{cell.rec.locationName}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {cell.kind === 'leave' && (
          <div className="flex items-center gap-2 rounded-xl bg-purple-50 px-4 py-3 text-sm text-purple-700">
            <span>📋</span>
            <span className="font-medium">ลางาน — {cell.leaveTypeName}</span>
          </div>
        )}

        {cell.kind === 'holiday' && (
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <span>🏖</span>
            <span className="font-medium">{cell.name}</span>
          </div>
        )}

        {cell.kind === 'weekend' && (
          <p className="text-sm text-muted-foreground">วันหยุดสุดสัปดาห์</p>
        )}

        {cell.kind === 'noRecord' && (
          <p className="text-sm text-muted-foreground">ยังไม่มีการลงเวลาวันนี้</p>
        )}

        {cell.kind === 'future' && (
          <p className="text-sm text-muted-foreground">ยังไม่ถึงวันนี้</p>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AttendanceHistoryPage() {
  const router = useRouter()
  const now = new Date()
  const todayStr = toDateStr(now.getFullYear(), now.getMonth() + 1, now.getDate())

  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [selected, setSelected] = useState<{ day: number; dateStr: string; cell: CellInfo } | null>(null)

  const lastDay = new Date(year, month, 0).getDate()
  const from = toDateStr(year, month, 1)
  const to = toDateStr(year, month, lastDay)

  const { data: historyData, isLoading: histLoading } = useMyAttendanceHistory(from, to)
  const { data: holidays = [], isLoading: holLoading } = useMyHolidays(year)
  const { data: leavesData, isLoading: leaveLoading } = useMyLeaves({ status: 'Approved', pageSize: 200 })

  const isLoading = histLoading || holLoading || leaveLoading

  // build lookup maps
  const recordMap = new Map<string, AttendanceRecordDto>()
  for (const rec of historyData?.items ?? []) recordMap.set(rec.date, rec)

  const yearMonthPrefix = `${year}-${pad(month)}`
  const holidayMap = new Map<string, string>()
  for (const h of holidays) {
    if (h.date.startsWith(yearMonthPrefix) && h.isActive) holidayMap.set(h.date, h.name)
  }

  // expand leave date ranges into individual dates for this month
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

  // summary
  let cntPresent = 0, cntLate = 0, cntAbsent = 0, cntHoliday = holidayMap.size, cntLeave = leaveMap.size
  for (const rec of recordMap.values()) {
    if (rec.status === 'Present') cntPresent++
    else if (rec.status === 'Late') cntLate++
    else if (rec.status === 'Absent') cntAbsent++
  }

  // calendar grid
  const firstDow = new Date(year, month - 1, 1).getDay() // 0=อา
  const totalCells = Math.ceil((firstDow + lastDay) / 7) * 7

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    const isCurrent = year === now.getFullYear() && month === now.getMonth() + 1
    if (isCurrent) return
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  function handleCellClick(day: number) {
    const dateStr = toDateStr(year, month, day)
    const dow = new Date(dateStr + 'T00:00:00').getDay()
    const isWeekend = dow === 0 || dow === 6
    const cell = getCell(dateStr, todayStr, recordMap, holidayMap, leaveMap, isWeekend)
    if (cell.kind === 'empty') return
    setSelected({ day, dateStr, cell })
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  return (
    <>
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background px-4 py-3">
        <button onClick={() => router.back()} className="rounded-full p-1 active:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-base font-semibold">ปฎิทิน</h1>
      </div>

      {/* Month selector */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button onClick={prevMonth} className="rounded-full p-2 active:bg-muted">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold">
          {MONTH_TH[month - 1]} {year + 543}
        </span>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className="rounded-full p-2 active:bg-muted disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAY_NAMES.map((d, i) => (
          <div
            key={d}
            className={`py-2 text-center text-xs font-medium ${i === 0 || i === 6 ? 'text-muted-foreground' : 'text-foreground'}`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {isLoading ? (
        <div className="grid grid-cols-7 gap-px bg-border m-px">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="aspect-square bg-background animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7">
          {Array.from({ length: totalCells }).map((_, idx) => {
            const day = idx - firstDow + 1
            if (day < 1 || day > lastDay) {
              return <div key={idx} className="aspect-square" />
            }

            const dateStr = toDateStr(year, month, day)
            const dow = new Date(dateStr + 'T00:00:00').getDay()
            const isWeekend = dow === 0 || dow === 6
            const cell = getCell(dateStr, todayStr, recordMap, holidayMap, leaveMap, isWeekend)
            const isToday = dateStr === todayStr

            // bg color
            let bg = ''
            if (cell.kind === 'weekend') bg = 'bg-muted/40'
            else if (cell.kind === 'holiday') bg = 'bg-gray-50'
            else if (cell.kind === 'leave') bg = LEAVE_BG

            return (
              <button
                key={idx}
                onClick={() => handleCellClick(day)}
                className={`relative flex flex-col items-center justify-start pt-1.5 pb-1 aspect-square border-b border-r border-border/50 active:bg-muted/60 ${bg}`}
              >
                {/* วันที่ */}
                <span
                  className={`text-xs leading-none font-medium w-6 h-6 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-primary text-primary-foreground' : ''}
                    ${isWeekend && !isToday ? 'text-muted-foreground' : ''}
                    ${cell.kind === 'future' ? 'text-muted-foreground/50' : ''}
                  `}
                >
                  {day}
                </span>

                {/* indicator */}
                <div className="mt-1 flex items-center justify-center">
                  {cell.kind === 'record' && (
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[cell.rec.status] ?? 'bg-muted-foreground'}`} />
                  )}
                  {cell.kind === 'leave' && (
                    <span className={`w-1.5 h-1.5 rounded-full ${LEAVE_DOT}`} />
                  )}
                  {cell.kind === 'holiday' && (
                    <span className="text-[9px] leading-none text-gray-600 font-medium max-w-full px-0.5 truncate">
                    </span>
                  )}
                  {cell.kind === 'noRecord' && (
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-border flex-wrap">
        {[
          { dot: 'bg-green-500', label: 'ทำงาน' },
          { dot: 'bg-yellow-400', label: 'สาย' },
          { dot: 'bg-red-500', label: 'ขาด' },
          { dot: 'bg-purple-400', label: 'ลางาน' },
          { dot: 'bg-gray-500', label: 'วันหยุด' },
        ].map(({ dot, label }) => (
          <div key={label} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${dot}`} />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Summary */}
      {!isLoading && (
        <div className="mx-4 mb-4 rounded-2xl border border-border bg-card grid grid-cols-5 divide-x divide-border text-center">
          {[
            { label: 'ทำงาน', value: cntPresent, color: 'text-green-600' },
            { label: 'สาย', value: cntLate, color: 'text-yellow-600' },
            { label: 'ขาดงาน', value: cntAbsent, color: 'text-red-600' },
            { label: 'ลางาน', value: cntLeave, color: 'text-purple-500' },
            { label: 'วันหยุด', value: cntHoliday, color: 'text-gray-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="py-3 px-1">
              <p className={`text-lg font-bold ${color}`}>{value}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Bottom sheet */}
      {selected && (
        <BottomSheet
          day={selected.day}
          dateStr={selected.dateStr}
          cell={selected.cell}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
