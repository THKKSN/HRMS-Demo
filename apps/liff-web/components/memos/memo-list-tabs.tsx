'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClipboardCheck, FileText, Inbox } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'

// tab สลับมุมมอง memo — โครงเดียวกับ TicketListTabs
// ของฉัน = ทุกคน · เข้าแผนก = Supervisor · รออนุมัติ = Executive/Admin
const tabs = [
  { href: '/memos/my', label: 'My memo', icon: FileText, roles: null as string[] | null },
  { href: '/memos/inbox', label: 'Inbox', icon: Inbox, roles: ['Supervisor'] },
  { href: '/memos/approvals', label: 'Approvals', icon: ClipboardCheck, roles: ['Executive', 'Admin'] },
]

export function MemoListTabs() {
  const pathname = usePathname()
  const employee = useAuthStore(state => state.employee)
  const myRoles = employee?.roles.map(role => role.role) ?? []
  const visibleTabs = tabs.filter(tab => !tab.roles || tab.roles.some(role => myRoles.includes(role)))

  if (visibleTabs.length < 2) return null

  return (
    <nav className="border-b border-border bg-background px-4 py-3" aria-label="รายการ Memo">
      <div
        className={`grid h-10 rounded-md bg-muted p-1 ${
          visibleTabs.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
        }`}
      >
        {visibleTabs.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-w-0 items-center justify-center gap-1.5 rounded px-2 text-xs font-semibold transition-colors ${
                active
                  ? 'bg-background text-primary shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
