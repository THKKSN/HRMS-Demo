'use client'

import { useMyDashboard, useTeamDashboard } from '@/hooks/use-dashboard'
import { AttendanceTodayCard } from './widgets/AttendanceTodayCard'
import { LeaveBalanceCards } from './widgets/LeaveBalanceCards'
import { MonthStatsCard } from './widgets/MonthStatsCard'
import { TeamSummaryCards } from './widgets/TeamSummaryCards'
import { PendingApprovalList } from './widgets/PendingApprovalList'

export function SupervisorDashboard() {
  const myQuery   = useMyDashboard()
  const teamQuery = useTeamDashboard()

  const loading = myQuery.isLoading || teamQuery.isLoading

  if (loading) return <DashboardSkeleton />

  return (
    <div className="space-y-5">
      {/* ส่วนตัว */}
      {myQuery.data && (
        <>
          <AttendanceTodayCard data={myQuery.data.todayAttendance} />
          <LeaveBalanceCards balances={myQuery.data.leaveBalance} />
          <MonthStatsCard stats={myQuery.data.monthStats} />
        </>
      )}

      {/* ทีม */}
      {teamQuery.data && (
        <>
          <div className="h-px bg-border" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ภาพรวมทีม</p>
          <TeamSummaryCards data={teamQuery.data} />
          <PendingApprovalList items={teamQuery.data.pendingApprovals} />
        </>
      )}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-28 rounded-2xl bg-muted" />
      ))}
    </div>
  )
}
