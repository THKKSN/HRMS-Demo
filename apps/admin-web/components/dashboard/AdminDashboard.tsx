'use client'

import { Building2, LayoutDashboard, Users, UserCheck } from 'lucide-react'
import { useAdminDashboard } from '@/hooks/use-dashboard'
import { AuditLogTable } from './widgets/AuditLogTable'

export function AdminDashboard() {
  const { data, isLoading, isError } = useAdminDashboard()

  if (isLoading) return <DashboardSkeleton />
  if (isError || !data) return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-600">
      โหลดข้อมูล dashboard ไม่สำเร็จ กรุณาลองใหม่
    </div>
  )

  const stats = [
    { icon: Building2,       label: 'บริษัท',           value: data.totalCompanies,   color: 'text-blue-600',   bg: 'bg-blue-50'   },
    { icon: LayoutDashboard, label: 'แผนก',             value: data.totalDepartments, color: 'text-purple-600', bg: 'bg-purple-50' },
    { icon: Users,           label: 'พนักงานทั้งหมด',   value: data.totalEmployees,   color: 'text-gray-700',   bg: 'bg-gray-100'  },
    { icon: UserCheck,       label: 'พนักงานที่ active', value: data.activeEmployees,  color: 'text-green-600',  bg: 'bg-green-50'  },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(s => (
          <div key={s.label} className="rounded-2xl border border-border bg-background p-4 shadow-sm">
            <div className={`inline-flex rounded-xl ${s.bg} p-2`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <p className={`mt-2 text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <AuditLogTable logs={data.recentAuditLogs} />
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-2xl bg-muted" />)}
      </div>
      <div className="h-64 rounded-2xl bg-muted" />
    </div>
  )
}
