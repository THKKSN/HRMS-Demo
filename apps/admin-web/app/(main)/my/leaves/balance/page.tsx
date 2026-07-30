'use client'

import { BarChart2, AlertTriangle } from 'lucide-react'
import { useLeaveBalance } from '@/hooks/use-leaves'
import type { LeaveBalanceDto } from '@hrms/shared-types'

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border bg-background p-5 shadow-sm space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-28 rounded bg-whited" />
        <div className="h-8 w-16 rounded-xl bg-whited" />
      </div>
      <div className="h-2.5 w-full rounded-full bg-whited" />
      <div className="flex justify-between">
        <div className="h-3 w-24 rounded bg-whited" />
        <div className="h-3 w-16 rounded bg-whited" />
      </div>
    </div>
  )
}

function LeaveCard({ b }: { b: LeaveBalanceDto }) {
  const usedPct    = b.totalDays > 0 ? Math.min((b.usedDays    / b.totalDays) * 100, 100) : 0
  const pendingPct = b.totalDays > 0 ? Math.min((b.pendingDays / b.totalDays) * 100, 100) : 0
  const remainPct  = b.totalDays > 0 ? Math.min((b.remainingDays / b.totalDays) * 100, 100) : 0
  const isLow      = b.remainingDays <= 1 && b.totalDays > 0
  const isEmpty    = b.totalDays === 0

  return (
    <div className={`rounded-2xl border bg-background p-5 shadow-sm transition-colors ${
      isLow ? 'border-destructive/40' : 'border-border'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">{b.leaveTypeName}</p>
          {isLow && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-destructive">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              วันลาใกล้หมด
            </p>
          )}
        </div>

        {/* วันคงเหลือ — big badge */}
        <div className={`shrink-0 flex flex-col items-center justify-center rounded-xl px-3 py-1.5 min-w-14 ${
          isLow    ? 'bg-destructive/10 text-destructive' :
          isEmpty  ? 'bg-whited text-muted-foreground' :
                     'bg-primary/10 text-primary'
        }`}>
          <span className="text-xl font-bold leading-none">{b.remainingDays}</span>
          <span className="text-[10px] font-medium mt-0.5">วัน</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-whited">
        <div className="flex h-full">
          <div
            className={`h-full transition-all ${isLow ? 'bg-destructive' : 'bg-primary'}`}
            style={{ width: `${usedPct}%` }}
          />
          <div
            className="h-full bg-amber-400 transition-all"
            style={{ width: `${pendingPct}%` }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-3 grid grid-cols-3 divide-x divide-border text-center">
        <div className="pr-3">
          <p className="text-xs text-muted-foreground">ใช้ไปแล้ว</p>
          <p className="text-sm font-semibold text-foreground">{b.usedDays} วัน</p>
        </div>
        <div className="px-3">
          <p className="text-xs text-muted-foreground">รออนุมัติ</p>
          <p className={`text-sm font-semibold ${b.pendingDays > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>
            {b.pendingDays} วัน
          </p>
        </div>
        <div className="pl-3">
          <p className="text-xs text-muted-foreground">ทั้งหมด</p>
          <p className="text-sm font-semibold text-foreground">{b.totalDays} วัน</p>
        </div>
      </div>

      {/* Legend */}
      {(b.usedDays > 0 || b.pendingDays > 0) && (
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {b.usedDays > 0 && (
            <span className="flex items-center gap-1.5">
              <span className={`inline-block h-2 w-2 rounded-full ${isLow ? 'bg-destructive' : 'bg-primary'}`} />
              อนุมัติแล้ว
            </span>
          )}
          {b.pendingDays > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
              รออนุมัติ
            </span>
          )}
          <span className="flex items-center gap-1.5 ml-auto">
            <span className="inline-block h-2 w-2 rounded-full bg-whited" />
            คงเหลือ {remainPct.toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  )
}

export default function MyLeaveBalancePage() {
  const year = new Date().getFullYear()
  const { data: balances, isLoading } = useLeaveBalance(year)
  const thaiYear = year + 543

  const lowBalances = balances?.filter((b) => b.remainingDays <= 1 && b.totalDays > 0) ?? []

  return (
    <div className="min-h-full bg-whited/40 p-4 lg:p-6">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* ── Header ────────────────────────────────────────── */}
        <div>
          <h1 className="text-xl font-bold text-foreground">วันลาคงเหลือ</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">ปีงบประมาณ พ.ศ. {thaiYear}</p>
        </div>

        {/* ── Summary banner เมื่อมีวันลาใกล้หมด ────────────── */}
        {!isLoading && lowBalances.length > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
            <p className="text-sm text-destructive">
              <span className="font-semibold">แจ้งเตือน:</span>{' '}
              {lowBalances.map((b) => b.leaveTypeName).join(', ')} เหลือน้อยกว่า 2 วัน
            </p>
          </div>
        )}

        {/* ── Cards ─────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : !balances?.length ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-background py-20 text-center shadow-sm">
            <BarChart2 className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 font-medium text-foreground">ยังไม่มีข้อมูลสิทธิ์การลา</p>
            <p className="mt-1 text-sm text-muted-foreground">ติดต่อฝ่าย HR เพื่อตั้งค่าสิทธิ์วันลา</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {balances
              .filter((b) => b.totalDays > 0)
              .map((b) => <LeaveCard key={b.leaveTypeId} b={b} />)}
          </div>
        )}

      </div>
    </div>
  )
}
