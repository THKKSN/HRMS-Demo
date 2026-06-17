'use client'

import Link from 'next/link'
import { Calendar, Clock, FileText, User, ClipboardList } from 'lucide-react'
import { usePendingApprovals } from '@/hooks/use-leaves'
import { isSupervisorOrAbove } from '@/lib/auth-utils'
import { useAuthStore } from '@/stores/auth.store'
import type { LucideIcon } from 'lucide-react'

const DAY_TH = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
const MONTH_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

function todayThai() {
  const d = new Date()
  return `วัน${DAY_TH[d.getDay()]}ที่ ${d.getDate()} ${MONTH_TH[d.getMonth()]} ${d.getFullYear() + 543}`
}

const QUICK_CARDS: { label: string; desc: string; icon: LucideIcon; href: string }[] = [
  { label: 'ลางาน', desc: 'ส่งคำขอลา', icon: Calendar, href: '/leaves' },
  { label: 'ลงเวลา', desc: 'Check-in / Check-out', icon: Clock, href: '/attendance' },
  { label: 'สลิปเงินเดือน', desc: 'ดูสลิปล่าสุด', icon: FileText, href: '/payslips' },
  { label: 'โปรไฟล์', desc: 'ข้อมูลของฉัน', icon: User, href: '/profile' },
]

function PendingApprovalCard() {
  const employee = useAuthStore(s => s.employee)
  const enabled = !!employee && isSupervisorOrAbove(employee.roles)
  const { data } = usePendingApprovals(enabled ? {} : false)

  if (!enabled) return null

  const count = data?.totalCount ?? 0

  return (
    <Link
      href="/leaves/pending"
      className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"
    >
      <ClipboardList className="h-5 w-5 shrink-0 text-amber-600" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900">รออนุมัติ</p>
        <p className="text-xs text-amber-700">
          {count > 0 ? `${count} รายการรอการดำเนินการ` : 'ไม่มีรายการรออนุมัติ'}
        </p>
      </div>
      {count > 0 && (
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}

export default function HomePage() {
  const employee = useAuthStore((s) => s.employee)

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Greeting */}
      <div>
        <p className="text-sm text-muted-foreground">{todayThai()}</p>
        <h1 className="mt-1 text-xl font-bold">
          สวัสดี, {employee?.fullName ?? 'คุณ'}
        </h1>
      </div>

      {/* Pending approval card (Supervisor/HR only) */}
      <PendingApprovalCard />

      {/* Quick cards */}
      <div className="grid grid-cols-2 gap-3">
        {QUICK_CARDS.map(({ label, desc, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-2xl border border-border bg-card p-4 space-y-2 active:bg-muted"
          >
            <Icon className="h-6 w-6 text-primary" />
            <p className="text-sm font-semibold">{label}</p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
