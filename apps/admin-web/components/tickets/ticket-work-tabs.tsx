'use client'

import Link from 'next/link'
import { ListChecks, History } from 'lucide-react'
import { cn } from '@/lib/utils'

type WorkTab = 'current' | 'history'

type TicketWorkTabsProps = {
  active: WorkTab
  onAssignedModeChange?: (history: boolean) => void
}

export function TicketWorkTabs({ active, onAssignedModeChange }: TicketWorkTabsProps) {
  const tabs = [
    {
      key: 'current' as const,
      label: 'งานปัจจุบัน',
      icon: ListChecks,
      href: '/tickets/assigned',
      history: false,
    },
    {
      key: 'history' as const,
      label: 'ประวัติงาน',
      icon: History,
      href: '/tickets/assigned?history=1',
      history: true,
    },
  ]

  return (
    <div className="flex items-center gap-2">
      {tabs.map(({ key, label, icon: Icon, href, history }) => {
        const selected = active === key
        const className = cn(
          'flex h-9 shrink-0 items-center gap-1.5 rounded px-3 text-sm font-semibold transition-colors',
          selected
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
        )

        if (onAssignedModeChange) {
          return (
            <button
              key={key}
              type="button"
              onClick={() => onAssignedModeChange(Boolean(history))}
              className={className}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          )
        }

        return (
          <Link key={key} href={href} className={className}>
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        )
      })}
    </div>
  )
}
