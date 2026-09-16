'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ClipboardCheck, FileText, Inbox } from 'lucide-react'
import { hasPermission } from '@/lib/auth-utils'
import { useAuthStore } from '@/stores/auth.store'

// tab สลับมุมมอง memo — โครงเดียวกับ TicketListTabs
// ของฉัน = ทุกคน · เข้าแผนก = memo:view-inbox · รออนุมัติ = memo:approve
const tabs = [
  { href: '/memos/my', key: 'my', icon: FileText, permission: null as string | null, fallbackRoles: [] as string[] },
  { href: '/memos/inbox', key: 'inbox', icon: Inbox, permission: 'memo:view-inbox', fallbackRoles: ['Supervisor'] },
  { href: '/memos/approvals', key: 'approvals', icon: ClipboardCheck, permission: 'memo:approve', fallbackRoles: ['Executive', 'Admin'] },
] as const

export function MemoListTabs() {
  const t = useTranslations('liff.memo.list')
  const pathname = usePathname()
  const employee = useAuthStore(state => state.employee)
  const visibleTabs = tabs.filter(
    tab => !tab.permission || hasPermission(employee, tab.permission, [...tab.fallbackRoles]),
  )

  if (visibleTabs.length < 2) return null

  return (
    <nav className="border-b border-border bg-background px-4 py-3" aria-label={t('navLabel')}>
      <div
        className={`grid h-10 rounded-md bg-muted p-1 ${
          visibleTabs.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
        }`}
      >
        {visibleTabs.map(({ href, key, icon: Icon }) => {
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
              <span className="truncate">{t(`tabs.${key}`)}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
