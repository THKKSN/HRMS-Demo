'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, Clock, FileText, User } from 'lucide-react'
import { usePendingApprovals } from '@/hooks/use-leaves'
import { isSupervisorOrAbove } from '@/lib/auth-utils'
import { useAuthStore } from '@/stores/auth.store'

const tabs = [
  { label: 'หน้าแรก', href: '/', icon: Home },
  { label: 'ลางาน', href: '/leaves', icon: Calendar },
  { label: 'ลงเวลา', href: '/attendance', icon: Clock },
  { label: 'สลิปเงินเดือน', href: '/payslips', icon: FileText },
  { label: 'โปรไฟล์', href: '/profile', icon: User },
]

function PendingBadge() {
  const employee = useAuthStore(s => s.employee)
  const enabled = !!employee && isSupervisorOrAbove(employee.roles)
  const { data } = usePendingApprovals(enabled ? {} : false)

  if (!enabled || !data?.totalCount) return null

  return (
    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
      {data.totalCount > 99 ? '99+' : data.totalCount}
    </span>
  )
}

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-1/2 w-full max-w-107.5 -translate-x-1/2 border-t border-border bg-background">
      <ul className="flex h-16 items-stretch">
        {tabs.map(({ label, href, icon: Icon }) => {
          const isActive =
            href === '/' ? pathname === '/' : pathname.startsWith(href)

          return (
            <li key={href} className="flex flex-1">
              <Link
                href={href}
                className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="relative">
                  <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                  {href === '/leaves' && <PendingBadge />}
                </span>
                <span>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
