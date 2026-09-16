'use client'

import { use, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import {
  ArrowLeft, ChevronLeft, ChevronRight,
  Clock, CheckCircle2, XCircle, AlertCircle, CalendarDays, Palmtree,
  Minus, Gift, UserCheck, Timer, TrendingUp, CalendarX,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEmployeeMonthlyCalendar, useEmployeeMonthlyStats } from '@/hooks/use-attendance-hr'
import { useEmployee } from '@/hooks/use-employees'
import type { AttendanceStatus, EmployeeCalendarDayDto } from '@hrms/shared-types'
import { ATTENDANCE_STATUS_LABEL as STATUS_LABELS } from '@hrms/i18n/labels'
import * as fmt from '@hrms/i18n/format'

// ── helpers ──────────────────────────────────────────────────────────────────

// ชื่อเดือน/วันมาจาก Intl ตามภาษาที่ผู้ใช้เลือก (เดิม hardcode ภาษาไทย)
const MONTH_NAMES = Array.from({ length: 12 }, (_, index) =>
  fmt.formatDate(new Date(2024, index, 1), { month: 'long' }))
const DOW_SHORT = Array.from({ length: 7 }, (_, index) =>
  fmt.formatDate(new Date(2024, 8, 1 + index), { weekday: 'short' }))

type DayKind = 'weekend' | 'holiday' | 'leave' | 'present' | 'late' | 'halfday' | 'absent' | 'nodata'

type DayCfg = {
  kind: DayKind
  cellBg: string
  textClr: string
  badgeBg: string
  badgeText: string
  icon: React.ElementType | null
  label?: string
  /** คีย์ข้อความใน messages เมื่อไม่มีชื่อจากข้อมูลจริง */
  labelKey?: string
}

function getDayCfg(day: EmployeeCalendarDayDto): DayCfg {
  if (day.isHoliday)
    return {
      kind: 'holiday',
      cellBg: 'bg-rose-50',
      textClr: 'text-rose-400',
      badgeBg: 'bg-rose-100',
      badgeText: 'text-rose-700',
      icon: Gift,
      label: day.holidayName ?? undefined,
      labelKey: 'holiday',
    }
  if (!day.isWorkingDay)
    return {
      kind: 'weekend',
      cellBg: 'bg-slate-50',
      textClr: 'text-slate-400',
      badgeBg: '',
      badgeText: '',
      icon: null,
      label: '',
    }
  if (day.isOnLeave && !day.status)
    return {
      kind: 'leave',
      cellBg: 'bg-violet-50',
      textClr: 'text-violet-900',
      badgeBg: 'bg-violet-100',
      badgeText: 'text-violet-800',
      icon: Palmtree,
      label: day.leaveTypeName ?? undefined,
      labelKey: 'onLeave',
    }
  switch (day.status) {
    case 'Present':
      return {
        kind: 'present',
        cellBg: 'bg-emerald-50',
        textClr: 'text-emerald-900',
        badgeBg: 'bg-emerald-100',
        badgeText: 'text-emerald-800',
        icon: CheckCircle2,
        labelKey: 'calNormal',
      }
    case 'Late':
      return {
        kind: 'late',
        cellBg: 'bg-amber-50',
        textClr: 'text-amber-900',
        badgeBg: 'bg-amber-100',
        badgeText: 'text-amber-800',
        icon: Clock,
        labelKey: 'calLate',
      }
    case 'HalfDay':
      return {
        kind: 'halfday',
        cellBg: 'bg-sky-50',
        textClr: 'text-sky-900',
        badgeBg: 'bg-sky-100',
        badgeText: 'text-sky-800',
        icon: AlertCircle,
        labelKey: 'calHalfDay',
      }
    case 'Absent':
      return {
        kind: 'absent',
        cellBg: 'bg-red-50',
        textClr: 'text-red-900',
        badgeBg: 'bg-red-100',
        badgeText: 'text-red-800',
        icon: XCircle,
        labelKey: 'calAbsent',
      }
    default:
      return {
        kind: 'nodata',
        cellBg: 'bg-white',
        textClr: 'text-slate-500',
        badgeBg: '',
        badgeText: '',
        icon: null,
        label: '—',
        labelKey: undefined,
      }
  }
}

function fmtTime(dt: string | null) {
  if (!dt) return '—'
  return fmt.formatTime(new Date(dt), {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok',
  })
}

type TranslateFn = (key: string, values?: Record<string, string | number>) => string

function fmtDuration(min: number | null, t: TranslateFn) {
  if (min == null || min <= 0) return '—'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h > 0) return m > 0 ? t('durationHourMinute', { hours: h, minutes: m }) : t('durationHour', { hours: h })
  return t('durationMinute', { minutes: m })
}

function fmtDateShort(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return fmt.formatDate(d, { day: 'numeric', month: 'short', weekday: 'short' })
}

// ── stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, iconCls, cardCls,
}: {
  label: string
  value: number | string
  sub?: string
  icon: React.ElementType
  iconCls: string
  cardCls: string
}) {
  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 ${cardCls}`}>
      <div className={`mt-0.5 rounded-lg p-2 ${iconCls} bg-white/60`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium opacity-60 truncate">{label}</p>
        <p className="text-2xl font-bold leading-tight">{value}</p>
        {sub && <p className="text-xs opacity-50 truncate">{sub}</p>}
      </div>
    </div>
  )
}

// ── calendar grid ─────────────────────────────────────────────────────────────

function CalendarGrid({ days, year, month }: {
  days: EmployeeCalendarDayDto[]
  year: number
  month: number
}) {
  const t = useTranslations('admin.employees.attendance')
  const tStatus = useTranslations('status.attendance')
  const firstDate = new Date(year, month - 1, 1)
  const startDow  = firstDate.getDay()
  const blanks    = Array.from({ length: startDow })
  const today     = new Date().toISOString().slice(0, 10)

  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden">
      {/* DOW header */}
      <div className="grid grid-cols-7 border-b border-border bg-slate-50">
        {DOW_SHORT.map((d, i) => (
          <div
            key={d}
            className={`py-2 text-center text-xs font-semibold ${
              i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-500'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 divide-x divide-y divide-border/60">
        {blanks.map((_, i) => (
          <div key={`blank-${i}`} className="min-h-18 bg-slate-50/50" />
        ))}
        {days.map((day) => {
          const d    = new Date(day.date + 'T00:00:00')
          const dayN = d.getDate()
          const cfg  = getDayCfg(day)
          const isToday = day.date === today
          const Icon = cfg.icon

          return (
            <div
              key={day.date}
              title={
                day.isHoliday
                  ? (day.holidayName ?? t('publicHoliday'))
                  : day.isWorkingDay
                  ? (day.status
                      ? tStatus(day.status)
                      : day.isOnLeave
                        ? (day.leaveTypeName ? t('onLeaveWithType', { type: day.leaveTypeName }) : t('onLeave'))
                        : t('noData'))
                  : t('weekend')
              }
              className={`min-h-18 flex flex-col p-1.5 gap-1 transition-colors ${cfg.cellBg} ${isToday ? 'ring-2 ring-inset ring-blue-400' : ''}`}
            >
              {/* Day number */}
              <span className={`text-xs font-semibold self-end leading-none ${cfg.textClr} ${isToday ? 'text-blue-600!' : ''}`}>
                {dayN}
              </span>

              {/* Status indicator */}
              {cfg.kind === 'weekend' ? null :
               cfg.kind === 'nodata' ? (
                <div className="flex-1 flex items-center justify-center">
                  <Minus className="h-3 w-3 text-slate-300" />
                </div>
               ) : (
                <div className={`flex-1 flex flex-col items-center justify-center gap-0.5 rounded-md py-0.5 ${cfg.badgeBg}`}>
                  {Icon && <Icon className={`h-3.5 w-3.5 ${cfg.badgeText}`} />}
                  <span className={`text-[9px] font-semibold leading-none text-center px-0.5 truncate max-w-full ${cfg.badgeText}`}>
                    {cfg.label ?? (cfg.labelKey ? t(cfg.labelKey) : '')}
                  </span>
                </div>
               )
              }
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-4 py-3 border-t border-border bg-slate-50/60 text-xs text-slate-600">
        {([
          { Icon: CheckCircle2, label: tStatus('Present'), cls: 'text-emerald-700' },
          { Icon: Clock,        label: tStatus('Late'),    cls: 'text-amber-700'   },
          { Icon: AlertCircle,  label: tStatus('HalfDay'), cls: 'text-sky-700'     },
          { Icon: XCircle,      label: tStatus('Absent'),  cls: 'text-red-700'     },
          { Icon: Palmtree,     label: t('onLeave'),       cls: 'text-violet-700'  },
          { Icon: Gift,         label: t('publicHoliday'), cls: 'text-rose-700'    },
        ] as const).map(({ Icon, label, cls }) => (
          <span key={label} className="flex items-center gap-1">
            <Icon className={`h-3 w-3 ${cls}`} />
            <span>{label}</span>
          </span>
        ))}
        <span className="flex items-center gap-1 text-slate-400">
          <Minus className="h-3 w-3" />
          <span>{t('noData')}</span>
        </span>
      </div>
    </div>
  )
}

// ── daily records table ───────────────────────────────────────────────────────

function RecordsTable({ days }: { days: EmployeeCalendarDayDto[] }) {
  const t = useTranslations('admin.employees.attendance')
  const tStatus = useTranslations('status.attendance')
  const workDays = days.filter((d) => d.isWorkingDay)

  if (workDays.length === 0)
    return <p className="py-8 text-center text-sm text-muted-foreground">{t('noData')}</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="py-2.5 pr-4 text-left font-medium">{t('colDate')}</th>
            <th className="py-2.5 pr-4 text-left font-medium">{t('colCheckIn')}</th>
            <th className="py-2.5 pr-4 text-left font-medium">{t('colCheckOut')}</th>
            <th className="py-2.5 pr-4 text-left font-medium">{t('colWorkHours')}</th>
            <th className="py-2.5 pr-4 text-left font-medium">{t('colStatus')}</th>
            <th className="py-2.5 pr-4 text-left font-medium">{t('colLate')}</th>
            <th className="py-2.5 text-left font-medium">{t('colRemark')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {workDays.map((day) => {
            const cfg = getDayCfg(day)
            const Icon = cfg.icon
            const statusLabel = day.status
              ? tStatus(day.status)
              : day.isOnLeave
              ? (day.leaveTypeName ? t('onLeaveWithType', { type: day.leaveTypeName }) : t('onLeave'))
              : t('noData')
            return (
              <tr key={day.date} className="hover:bg-slate-50 transition-colors">
                <td className="py-2.5 pr-4 text-slate-500 text-xs">{fmtDateShort(day.date)}</td>
                <td className="py-2.5 pr-4 font-mono text-slate-700">{fmtTime(day.checkInTime)}</td>
                <td className="py-2.5 pr-4 font-mono text-slate-700">{fmtTime(day.checkOutTime)}</td>
                <td className="py-2.5 pr-4 text-slate-600">{fmtDuration(day.workDurationMinutes, t)}</td>
                <td className="py-2.5 pr-4">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${cfg.badgeBg} ${cfg.badgeText} border-transparent`}>
                    {Icon && <Icon className="h-3 w-3 shrink-0" />}
                    {statusLabel}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-slate-500">
                  {day.lateMinutes > 0 ? <span className="text-amber-700 font-medium">{t('lateMinutes', { minutes: day.lateMinutes })}</span> : '—'}
                </td>
                <td className="py-2.5 text-slate-500 text-xs">{day.remark ?? '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function EmployeeAttendancePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const t = useTranslations('admin.employees.attendance')
  const { id } = use(params)
  const today  = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)

  const { data: emp } = useEmployee(id)
  const { data: calendar = [], isLoading: calLoading } = useEmployeeMonthlyCalendar(id, year, month)
  const { data: stats,         isLoading: statsLoading } = useEmployeeMonthlyStats(id, year, month)

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12) }
    else setMonth((m) => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1) }
    else setMonth((m) => m + 1)
  }

  const isLoading = calLoading || statsLoading
  const thaiYear  = year + 543

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/employees/${id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold">{t('title')}</h1>
          </div>
          {emp && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {emp.fullName} ({emp.employeeCode})
              {emp.departmentName ? ` · ${emp.departmentName}` : ''}
            </p>
          )}
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-base font-semibold">
          {t('monthYear', { month: MONTH_NAMES[month - 1], year: thaiYear })}
        </h2>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          {t('loading')}
        </div>
      ) : (
        <>
          {/* Stats cards */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard
                label={t('statWorkingDays')}
                value={stats.workingDays}
                icon={CalendarDays}
                iconCls="text-slate-600"
                cardCls="border-border bg-background text-foreground"
              />
              <StatCard
                label={t('statOnTime')}
                value={stats.presentDays}
                sub={stats.workingDays > 0 ? `${Math.round(stats.presentDays / stats.workingDays * 100)}%` : ''}
                icon={UserCheck}
                iconCls="text-emerald-700"
                cardCls="border-emerald-200 bg-emerald-50 text-emerald-900"
              />
              <StatCard
                label={t('statLate')}
                value={stats.lateDays}
                sub={stats.lateDays > 0 ? t('statLateTotal', { minutes: stats.totalLateMinutes }) : undefined}
                icon={Timer}
                iconCls="text-amber-700"
                cardCls="border-amber-200 bg-amber-50 text-amber-900"
              />
              <StatCard
                label={t('statLeave')}
                value={stats.leaveDays}
                icon={Palmtree}
                iconCls="text-violet-700"
                cardCls="border-violet-200 bg-violet-50 text-violet-900"
              />
              <StatCard
                label={t('statAbsent')}
                value={stats.absentDays}
                icon={CalendarX}
                iconCls="text-red-700"
                cardCls="border-red-200 bg-red-50 text-red-900"
              />
              <StatCard
                label={t('statRate')}
                value={`${stats.attendanceRate}%`}
                sub={stats.avgWorkDurationMinutes ? t('statAverage', { duration: fmtDuration(stats.avgWorkDurationMinutes, t) }) : undefined}
                icon={TrendingUp}
                iconCls="text-blue-700"
                cardCls="border-blue-200 bg-blue-50 text-blue-900"
              />
            </div>
          )}

          {/* Calendar */}
          {calendar.length > 0 && (
            <CalendarGrid days={calendar} year={year} month={month} />
          )}

          {/* Daily records table */}
          <div className="rounded-xl border border-border bg-background p-4">
            <h3 className="text-sm font-semibold mb-4">{t('dailyDetail')}</h3>
            <RecordsTable days={calendar} />
          </div>
        </>
      )}
    </div>
  )
}
