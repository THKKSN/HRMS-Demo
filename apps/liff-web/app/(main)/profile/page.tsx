'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { useAuthStore } from '@/stores/auth.store'
import { api } from '@/lib/api'

export default function ProfilePage() {
  const router = useRouter()
  const { employee, clearAuth } = useAuthStore()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await api.post('/auth/logout')
    } catch {
      // fire-and-forget — ล้าง local state เสมอ
    }
    clearAuth()
    router.replace('/auth/link')
  }

  return (
    <>
      <PageHeader title="โปรไฟล์" />
      <div className="px-4 py-6 space-y-6">
        {/* avatar + name */}
        <div className="flex flex-col items-center gap-3 py-4">
          {employee?.avatarUrl ? (
            <img
              src={employee.avatarUrl}
              alt={employee.fullName}
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <User className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
          <div className="text-center">
            <p className="text-lg font-semibold">{employee?.fullName}</p>
            <p className="text-sm text-muted-foreground">{employee?.employeeCode}</p>
          </div>
        </div>

        {/* info rows */}
        <div className="rounded-2xl border border-border divide-y divide-border">
          {[
            { label: 'รหัสพนักงาน', value: employee?.employeeCode },
            { label: 'อีเมล', value: employee?.email ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="text-sm font-medium">{value}</span>
            </div>
          ))}
        </div>

        {/* logout button */}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/40 py-3 text-sm font-medium text-destructive disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" />
          {isLoggingOut ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ'}
        </button>
      </div>
    </>
  )
}
