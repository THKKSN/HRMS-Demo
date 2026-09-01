'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, Home, MessagesSquare, User } from 'lucide-react'
import { usePendingApprovals } from '@/hooks/use-leaves'
import { useTicketPendingCounts } from '@/hooks/use-tickets'
import { isSupervisorOrAbove } from '@/lib/auth-utils'
import { useAuthStore } from '@/stores/auth.store'

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

function CountBadge({ total }: { total: number }) {
  if (total === 0) return null
  return (
    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
      {total > 99 ? '99+' : total}
    </span>
  )
}

// badge เรื่อง memo ที่รอฉันดำเนินการ (รออนุมัติสำหรับผู้บริหาร / รอรับทราบสำหรับหัวหน้าแผนก)
function MemoBadge() {
  const employee = useAuthStore(s => s.employee)
  const { data: counts } = useTicketPendingCounts(!!employee)
  return <CountBadge total={(counts?.memoAwaitingApproval ?? 0) + (counts?.memoAwaitingAck ?? 0)} />
}

// badge ticket ที่รอฉันดำเนินการ — รวมทุกมุม: งานในมือ/งานรอรับ/เรื่องรอตรวจรับ/inbox แผนก
function TicketBadge() {
  const employee = useAuthStore(s => s.employee)
  const { data: counts } = useTicketPendingCounts(!!employee)
  const total =
    (counts?.assignedActive ?? 0) +
    (counts?.assignedWaitingInfo ?? 0) +
    (counts?.claimable ?? 0) +
    (counts?.awaitingMyConfirmation ?? 0) +
    (counts?.inboxUntriaged ?? 0) +
    (counts?.cancellationPending ?? 0)
  return <CountBadge total={total} />
}

export function BottomNav() {
  const pathname = usePathname()
  const employee = useAuthStore(s => s.employee)
  const isExecutive = employee?.roles.some(role => ['Executive', 'Admin'].includes(role.role)) ?? false
  const isSupervisor = employee?.roles.some(role => role.role === 'Supervisor') ?? false
  // ปลายทางแท็บ Memo ตามหน้าที่หลักของ role: ผู้บริหาร → รออนุมัติ, หัวหน้าแผนก → เข้าแผนก, อื่นๆ → ของฉัน
  const memoHref = isExecutive ? '/memos/approvals' : isSupervisor ? '/memos/inbox' : '/memos/my'
  // แท็บแจ้งเรื่องแนวเดียวกัน: หัวหน้าแผนก → กล่องรับเรื่อง, อื่นๆ → เรื่องที่แจ้ง
  const ticketHref = isSupervisor ? '/tickets/inbox' : '/tickets/my'

  const tabs = [
    { label: 'หน้าแรก', href: '/', icon: Home },
    { label: 'แจ้งเรื่อง', href: ticketHref, icon: MessagesSquare },
    { label: 'Memo', href: memoHref, icon: FileText },
    { label: 'โปรไฟล์', href: '/profile', icon: User },
  ]

  return (
    <nav className="fixed bottom-0 left-1/2 w-full max-w-107.5 -translate-x-1/2 border-t border-border bg-background">
      <ul className="flex h-16 items-stretch">
        {tabs.map(({ label, href, icon: Icon }) => {
          const isActive =
            href === '/'
              ? pathname === '/'
              : href === ticketHref
                ? pathname.startsWith('/tickets')
                : href === memoHref
                  ? pathname.startsWith('/memos')
                  : pathname.startsWith(href)

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
                  {href === ticketHref && <TicketBadge />}
                  {href === memoHref && <MemoBadge />}
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
