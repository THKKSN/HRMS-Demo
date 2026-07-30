'use client'

import { useState } from 'react'
import { useMyDashboard, useCompanyDashboard, useAccessibleCompanies } from '@/hooks/use-dashboard'
import { AttendanceTodayCard } from './widgets/AttendanceTodayCard'
import { LeaveBalanceCards } from './widgets/LeaveBalanceCards'
import { MonthStatsCard } from './widgets/MonthStatsCard'
import { CompanyTodayCards } from './widgets/CompanyTodayCards'
import { AttendanceTrendChart } from './widgets/AttendanceTrendChart'
import { CompanySelector } from './CompanySelector'

export function HrDashboard() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | undefined>(undefined)

  const myQuery        = useMyDashboard()
  const companyQuery   = useCompanyDashboard(selectedCompanyId)
  const companiesQuery = useAccessibleCompanies()

  const loading = myQuery.isLoading || companyQuery.isLoading

  if (loading) return <DashboardSkeleton />

  const companies = companiesQuery.data ?? []
  // แสดง selector เฉพาะเมื่อมีมากกว่า 1 บริษัท หรือ isSystemWide
  const showSelector = companyQuery.data?.isSystemWide || companies.length > 1

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

      {/* ภาพรวมบริษัท */}
      {companyQuery.data && (
        <>
          <div className="h-px bg-border" />

          {/* Header + selector */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              ภาพรวมองค์กร
            </p>
            {showSelector && (
              <CompanySelector
                companies={companies}
                selectedId={selectedCompanyId}
                onChange={setSelectedCompanyId}
              />
            )}
          </div>

          <CompanyTodayCards
            stats={companyQuery.data.todayStats}
            totalEmployees={companyQuery.data.totalEmployees}
            isSystemWide={companyQuery.data.isSystemWide && !selectedCompanyId}
          />
          <AttendanceTrendChart trend={companyQuery.data.monthlyTrend} />
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
