'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  BarChart3,
  Building2,
  GitBranch,
  MapPin,
  Tag,
  Clock,
  CalendarOff,
  CalendarCog,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type NavItem = { label: string; href: string; icon: LucideIcon }
type NavGroup = { title: string; items: NavItem[] }

function NavLink({ label, href, icon: Icon }: NavItem) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + '/')
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  )
}

export function Sidebar() {
  const employee = useAuthStore((s) => s.employee)
  const isAdmin = employee?.roles.some((r) => r.role === 'Admin') ?? false
  const isHr = employee?.roles.some((r) => r.role === 'Hr') ?? false

  const groups: NavGroup[] = [
    {
      title: 'ภาพรวม',
      items: [
        { label: 'แดชบอร์ด', href: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'พนักงาน',
      items: [
        { label: 'พนักงาน',   href: '/employees',     icon: Users },
        ...((isAdmin || isHr) ? [{ label: 'ประเภทการลา', href: '/leave-types',    icon: CalendarDays }] :[]),
        ...((isAdmin || isHr) ? [{ label: 'สิทธิ์วันลา', href: '/leave-balances', icon: BarChart3 }] :[]),
        ...((isAdmin || isHr) ? [{ label: 'เวลาทำงาน',   href: '/shifts',         icon: Clock }] :[]),
        ...((isAdmin || isHr) ? [{ label: 'วันหยุด',    href: '/holidays',          icon: CalendarOff }] :[]),
        ...((isAdmin || isHr) ? [{ label: 'กฎวันหยุด', href: '/holiday-schedules', icon: CalendarCog }] :[])
      ],
    },
    ...((isAdmin || isHr) ? [{
      title: 'โครงสร้างองค์กร',
      items: [
        { label: 'บริษัท', href: '/companies', icon: Building2 },
        { label: 'แผนก',    href: '/departments', icon: GitBranch },
        {  label: 'สถานที่', href: '/locations',   icon: MapPin },
        { label: 'ตำแหน่ง', href: '/role-labels', icon: Tag }
      ],
    },
  ] : []),
  ]

  return (
    <aside className="flex h-full w-(--sidebar-width) flex-col border-r border-border bg-background">
      <div className="flex justify-center h-14 items-center border-b border-border px-4">
        <span className="text-base font-semibold text-foreground">HRMS</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.href} {...item} />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
