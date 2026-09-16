'use client'

import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/stores/auth.store'
import { usePermissionGate } from '@/hooks/use-permission-gate'
import { EmployeeDashboard } from '@/components/dashboard/EmployeeDashboard'
import { SupervisorDashboard } from '@/components/dashboard/SupervisorDashboard'
import { HrDashboard } from '@/components/dashboard/HrDashboard'
import { ExecutiveDashboard } from '@/components/dashboard/ExecutiveDashboard'
import { AdminDashboard } from '@/components/dashboard/AdminDashboard'
import * as fmt from '@hrms/i18n/format'

export default function DashboardPage() {
  const t = useTranslations('admin.dashboard')
  const employee = useAuthStore(s => s.employee)
  const { has } = usePermissionGate()

  // เลือก dashboard ตาม permission ของ endpoint ที่แต่ละตัว fetch จริง (fallback role เฉพาะ payload เก่า):
  // Admin → /dashboard/admin (system:view-audit-logs) · Hr → /dashboard/company (attendance:view-all)
  // Executive → memo:approve (ลายเซ็นเฉพาะ Executive/Admin) · Supervisor → /dashboard/team (leave:view-team)
  const isAdmin      = has('system:view-audit-logs', ['Admin'])
  const isHr         = has('attendance:view-all', ['Hr'])
  const isExecutive  = has('memo:approve', ['Executive'])
  const isSupervisor = has('leave:view-team', ['Supervisor'])

  const greeting = t(`greeting.${greetingKey()}`)
  const name = employee?.fullName?.split(' ')[0] ?? ''

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{t('greeting.withName', { greeting, name })}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {fmt.formatDate(new Date(), {
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

// ช่วงเวลาของวันตามเครื่องผู้ใช้ → คีย์คำทักทาย (ข้อความอยู่ใน messages)
function greetingKey() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
