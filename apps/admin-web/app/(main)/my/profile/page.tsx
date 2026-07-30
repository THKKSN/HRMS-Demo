'use client'

import {
  User,
  Building2,
  Users,
  Briefcase,
  CreditCard,
  Phone,
  Mail,
  CalendarDays,
} from 'lucide-react'
import { useMe } from '@/hooks/use-me'
import { useAuthStore } from '@/stores/auth.store'

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Bangkok',
  })
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value?: string | null
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-whited">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex flex-1 flex-col gap-0.5 min-w-0">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-medium text-foreground wrap-break-word">{value || '—'}</span>
      </div>
    </div>
  )
}

function SectionCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
        {title}
      </p>
      <div className="divide-y divide-border">{children}</div>
    </div>
  )
}

function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4 shadow-sm space-y-3">
      <div className="h-3 w-20 rounded bg-whited animate-pulse" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-1.5">
          <div className="h-7 w-7 rounded-lg bg-whited animate-pulse shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 w-16 rounded bg-whited animate-pulse" />
            <div className="h-3.5 w-32 rounded bg-whited animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function MyProfilePage() {
  const { employee: authEmployee } = useAuthStore()
  const { data: profile, isLoading } = useMe()

  const name   = profile?.fullName     ?? authEmployee?.fullName
  const avatar = profile?.avatarUrl    ?? authEmployee?.avatarUrl
  const code   = profile?.employeeCode ?? authEmployee?.employeeCode

  return (
    <div className="min-h-full bg-whited/40 p-4 lg:p-6">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* ── Hero card ─────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
          {/* gradient banner */}
          <div className="h-24 bg-linear-to-r from-primary/20 via-primary/10 to-transparent" />

          <div className="flex flex-col items-center px-6 pb-6 sm:flex-row sm:items-end sm:gap-5 -mt-10 sm:-mt-12">
            {/* Avatar */}
            <div className="shrink-0">
              {avatar ? (
                <img
                  src={avatar}
                  alt={name}
                  className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover ring-4 ring-background shadow-md"
                />
              ) : (
                <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-primary/10 ring-4 ring-background shadow-md">
                  <User className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
                </div>
              )}
            </div>

            {/* Name + code + badge */}
            {isLoading ? (
              <div className="mt-4 sm:mt-0 sm:pb-1 space-y-2 flex flex-col items-center sm:items-start w-full">
                <div className="h-6 w-44 rounded-lg bg-whited animate-pulse" />
                <div className="h-4 w-28 rounded bg-whited animate-pulse" />
                <div className="h-5 w-20 rounded-full bg-whited animate-pulse" />
              </div>
            ) : (
              <div className="mt-4 sm:mt-0 sm:pb-1 text-center sm:text-left flex-1 min-w-0">
                <h1 className="text-xl font-bold text-foreground truncate">{name}</h1>
                <p className="text-sm text-muted-foreground">{code}</p>
                {profile?.roleLabelName && (
                  <span className="mt-2 inline-block rounded-full bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">
                    {profile.roleLabelName}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Info grid ─────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <SkeletonCard rows={3} />
            <SkeletonCard rows={4} />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {/* สังกัด */}
            <SectionCard title="สังกัด">
              <InfoRow icon={Building2} label="บริษัท"   value={profile?.companyName} />
              <InfoRow icon={Users}     label="แผนก"     value={profile?.departmentName} />
              <InfoRow icon={Briefcase} label="ตำแหน่ง"  value={profile?.roleLabelName} />
            </SectionCard>

            {/* ข้อมูลส่วนตัว */}
            <SectionCard title="ข้อมูลส่วนตัว">
              <InfoRow icon={CreditCard}   label="รหัสพนักงาน"   value={profile?.employeeCode} />
              <InfoRow icon={Phone}        label="เบอร์โทรศัพท์"  value={profile?.phone} />
              <InfoRow icon={Mail}         label="อีเมล"           value={profile?.email} />
              <InfoRow icon={CalendarDays} label="วันที่เริ่มงาน"  value={formatDate(profile?.hireDate)} />
            </SectionCard>
          </div>
        )}

      </div>
    </div>
  )
}
