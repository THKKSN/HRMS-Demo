'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User, Building2, Users, Briefcase, CalendarDays, Phone, Mail, CreditCard } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { useAuthStore } from '@/stores/auth.store'
import { useMe } from '@/hooks/use-employee'
import { api } from '@/lib/api'

function formatDate(dateStr?: string) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Bangkok',
  })
}

function InfoRow({ icon: Icon, label, value }: {
  icon: React.ElementType
  label: string
  value?: string | null
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex flex-1 items-center justify-between min-w-0">
        <span className="text-sm text-muted-foreground shrink-0">{label}</span>
        <span className="text-sm font-medium text-right ml-2 truncate max-w-[60%]">{value || '—'}</span>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const { employee: authEmployee, clearAuth } = useAuthStore()
  const { data: profile, isLoading } = useMe()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try { await api.post('/auth/logout') } catch { /* fire-and-forget */ }
    clearAuth()
    router.replace('/auth/link')
  }

  const name = profile?.fullName ?? authEmployee?.fullName
  const avatar = profile?.avatarUrl ?? authEmployee?.avatarUrl
  const code = profile?.employeeCode ?? authEmployee?.employeeCode

  return (
    <>
      <PageHeader title="โปรไฟล์" />
      <div className="px-4 py-6 space-y-5">

        {/* Avatar + name */}
        <div className="flex flex-col items-center gap-3 py-2">
          {avatar ? (
            <img src={avatar} alt={name} className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <User className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
          {isLoading ? (
            <div className="space-y-2 flex flex-col items-center">
              <div className="h-5 w-36 rounded bg-muted animate-pulse" />
              <div className="h-4 w-24 rounded bg-muted animate-pulse" />
            </div>
          ) : (
            <div className="text-center">
              <p className="text-lg font-semibold">{name}</p>
              <p className="text-sm text-muted-foreground">{code}</p>
              {profile?.roleLabelName && (
                <span className="mt-1 inline-block rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
                  {profile.roleLabelName}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ข้อมูลส่วนตัว */}
        {isLoading ? (
          <div className="rounded-2xl border border-border divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                <div className="h-4 w-28 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-border divide-y divide-border">
              <InfoRow icon={Building2} label="บริษัท"   value={profile?.companyName} />
              <InfoRow icon={Users}     label="แผนก"     value={profile?.departmentName} />
              <InfoRow icon={Briefcase} label="ตำแหน่ง"  value={profile?.roleLabelName} />
            </div>
            <div className="rounded-2xl border border-border divide-y divide-border">
              <InfoRow icon={CreditCard} label="รหัสพนักงาน" value={profile?.employeeCode} />
              <InfoRow icon={Phone}      label="เบอร์โทรศัพท์" value={profile?.phone} />
              <InfoRow icon={Mail}       label="อีเมล"          value={profile?.email} />
              <InfoRow icon={CalendarDays} label="วันที่เริ่มงาน" value={formatDate(profile?.hireDate)} />
            </div>
          </>
        )}

        {/* Logout */}
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
