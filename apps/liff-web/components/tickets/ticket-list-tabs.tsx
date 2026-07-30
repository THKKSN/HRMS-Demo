'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquareText, Wrench } from 'lucide-react'

const tabs = [
  { href: '/tickets/my', label: 'เรื่องที่แจ้ง', icon: MessageSquareText },
  { href: '/tickets/assigned', label: 'งานที่รับผิดชอบ', icon: Wrench },
]

export function TicketListTabs() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-border bg-background px-4 py-3" aria-label="รายการ Ticket">
      <div className="grid h-10 grid-cols-2 rounded-md bg-muted p-1">
        {tabs.map(({ href, label, icon: Icon }) => {
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
