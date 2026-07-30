'use client'

import { useMyDashboard } from '@/hooks/use-dashboard'
import { AttendanceTodayCard } from './widgets/AttendanceTodayCard'
import { LeaveBalanceCards } from './widgets/LeaveBalanceCards'
import { MonthStatsCard } from './widgets/MonthStatsCard'

export function EmployeeDashboard() {
  const { data, isLoading, isError } = useMyDashboard()

  if (isLoading) return <DashboardSkeleton />
  if (isError || !data) return <ErrorState />

  return (
    <div className="space-y-5">
      <AttendanceTodayCard data={data.todayAttendance} />
      <LeaveBalanceCards balances={data.leaveBalance} />
      <MonthStatsCard stats={data.monthStats} />
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-28 rounded-2xl bg-muted" />
      ))}
    </div>
  )
}

function ErrorState() {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-600">
      โหลดข้อมูล dashboard ไม่สำเร็จ กรุณาลองใหม่
    </div>
  )
}
