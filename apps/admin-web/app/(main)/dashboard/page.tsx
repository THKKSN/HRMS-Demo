'use client'

import { useAuthStore } from '@/stores/auth.store'
import { EmployeeDashboard } from '@/components/dashboard/EmployeeDashboard'
import { SupervisorDashboard } from '@/components/dashboard/SupervisorDashboard'
import { HrDashboard } from '@/components/dashboard/HrDashboard'
import { ExecutiveDashboard } from '@/components/dashboard/ExecutiveDashboard'
import { AdminDashboard } from '@/components/dashboard/AdminDashboard'

export default function DashboardPage() {
  const employee = useAuthStore(s => s.employee)
  const roles = employee?.roles.map(r => r.role) ?? []

  const isAdmin      = roles.includes('Admin')
  const isHr         = roles.includes('Hr')
  const isExecutive  = roles.includes('Executive')
  const isSupervisor = roles.includes('Supervisor')

  const greeting = getGreeting()
  const name = employee?.fullName?.split(' ')[0] ?? ''

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{greeting}, {name}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {new Date().toLocaleDateString('th-TH', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>
      </div>

      {isAdmin      && <AdminDashboard />}
      {!isAdmin && isHr        && <HrDashboard />}
      {!isAdmin && !isHr && isExecutive  && <ExecutiveDashboard />}
      {!isAdmin && !isHr && !isExecutive && isSupervisor && <SupervisorDashboard />}
      {!isAdmin && !isHr && !isExecutive && !isSupervisor && <EmployeeDashboard />}
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'สวัสดีตอนเช้า'
  if (h < 17) return 'สวัสดีตอนบ่าย'
  return 'สวัสดีตอนเย็น'
}
