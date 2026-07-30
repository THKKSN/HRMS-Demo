'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { ClipboardList, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { useSidebar } from './sidebar-context'
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
  ShieldAlert,
  ShieldCheck,
  UserCircle,
  Wallet,
  Receipt,
  Fingerprint,
  FileText,
  ClipboardCheck,
  AlarmClock,
  FolderTree,
  Inbox,
  MessageSquareWarning,
  Ban,
  Wrench,
  BellRing,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type NavItem  = { label: string; href: string; icon: LucideIcon }
type NavGroup = { title: string; items: NavItem[] }

function NavLink({ label, href, icon: Icon, onNavigate }: NavItem & { onNavigate?: () => void }) {
  const pathname = usePathname()
  // ใช้ exact match สำหรับ /my/leaves เพื่อกันชนกับ /my/leaves/new และ /my/leaves/balance
  const active =
    pathname === href ||
    (href !== '/my/leaves' && pathname.startsWith(href + '/'))
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-whited hover:text-foreground',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const employee = useAuthStore((s) => s.employee)

  const isAdmin      = employee?.roles.some((r) => r.role === 'Admin')      ?? false
  const isHr         = employee?.roles.some((r) => r.role === 'Hr')         ?? false
  const isSupervisor = employee?.roles.some((r) => r.role === 'Supervisor') ?? false
  const isExecutive  = employee?.roles.some((r) => r.role === 'Executive')  ?? false
  const isEmployee   = employee?.roles.some((r) => r.role === 'Employee')   ?? false
  const canApprove   = isAdmin || isHr || isSupervisor
  const canManageHr  = isAdmin || isHr
  const canManageTicketTaxonomy = isAdmin || isSupervisor
  const canViewTicketReports = isAdmin || isSupervisor || isExecutive
  const canCreateTicket = isAdmin || isHr || isSupervisor || isEmployee

  const groups: NavGroup[] = [
    // ── ทุก role ────────────────────────────────────────────────
    {
      title: 'ภาพรวม',
      items: [
        { label: 'แดชบอร์ด', href: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'ส่วนตัว',
      items: [
        { label: 'โปรไฟล์',       href: '/my/profile',        icon: UserCircle },
        // { label: 'วันลาค  งเหลือ',  href: '/my/leaves/balance', icon: Wallet },
        { label: 'ประวัติการเข้างาน', href: '/my/attendance', icon: Fingerprint },
        { label: 'สลิปเงินเดือน', href: '/my/payslips',       icon: Receipt },
      ],
    },
    {
      title: 'การลา',
      items: [
        // { label: 'ยื่นลา',       href: '/my/leaves/new', icon: FileText },
        { label: 'การลาของฉัน', href: '/my/leaves',     icon: CalendarDays },
        // ── Admin / HR / Supervisor ─────────────────────────────────
        ...(canApprove ?
        [{ label: 'คำขอลาที่รออนุมัติ', href: '/approvals/leaves', icon: ClipboardCheck }] : [])
      ],
    },

    {
      title: 'OT',
      items: [
        ...(canApprove ?
        [{ label: 'คำขอ OT', href: '/ot-requests', icon: AlarmClock }] :
        [{ label: 'OT ของฉัน', href: '/ot-requests', icon: AlarmClock }])
      ],
    },

    ...(canCreateTicket || canManageTicketTaxonomy || canViewTicketReports ? [{
      title: 'การแจ้งเรื่อง',
      items: [
        ...(canCreateTicket ? [{ label: 'แจ้งเรื่องภายใน', href: '/tickets/new', icon: MessageSquareWarning }] : []),
        ...(canCreateTicket ? [{ label: 'งานที่รับผิดชอบ', href: '/tickets/assigned', icon: Wrench }] : []),
        ...(canManageTicketTaxonomy ? [{ label: 'กล่องงาน', href: '/tickets/inbox', icon: Inbox }] : []),
        ...(canManageTicketTaxonomy ? [{ label: 'คำขอยกเลิก', href: '/tickets/cancellations', icon: Ban }] : []),
        ...(canViewTicketReports ? [{ label: 'รายงานแจ้งเรื่อง', href: '/tickets/reports', icon: BarChart3 }] : []),
        ...(canManageTicketTaxonomy ? [{ label: 'หมวดและหัวข้อ', href: '/ticket-taxonomy', icon: FolderTree }] : []),
      ],
    }] : []),

    // ── Admin / HR ───────────────────────────────────────────────
    ...(canManageHr ? [{
      title: 'HR management',
      items: [
        { label: 'พนักงาน',             href: '/employees',         icon: Users },
        { label: 'บันทึกการเข้างาน',    href: '/attendance',         icon: Clock },
        { label: 'ประวัติการลา',         href: '/leave-history',     icon: ClipboardList },
        { label: 'ประเภทการลา',         href: '/leave-types',       icon: CalendarDays },
        { label: 'สิทธิ์วันลา',         href: '/leave-balances',    icon: BarChart3 },
        { label: 'เวลาทำงาน',        href: '/shifts',            icon: Clock },
        { label: 'วันหยุด',           href: '/holidays',          icon: CalendarOff },
        { label: 'กฎวันหยุด',        href: '/holiday-schedules', icon: CalendarCog },
        { label: 'กฎการเข้างาน',     href: '/attendance-policy', icon: ShieldAlert },
      ],
    }] : []),

    // ── Admin เท่านั้น ────────────────────────────────────────────
    ...(isAdmin ? [
      {
        title: 'โครงสร้างองค์กร',
        items: [
          { label: 'บริษัท',  href: '/companies',   icon: Building2 },
          { label: 'แผนก',    href: '/departments', icon: GitBranch },
          { label: 'สถานที่', href: '/locations',   icon: MapPin },
          { label: 'ตำแหน่ง', href: '/role-labels', icon: Tag },
        ],
      },
      {
        title: 'ตั้งค่าระบบ',
        items: [
          { label: 'จัดการ Permission', href: '/settings/permissions', icon: ShieldCheck },
          { label: 'Audit Log',         href: '/settings/audit-logs',  icon: FileText },
          { label: 'การส่งแจ้งเตือน', href: '/settings/notification-deliveries', icon: BellRing },
        ],
      },
    ] : []),
  ]

  return (
    <>
      <div className="flex h-14 items-center justify-between border-b border-border px-4 shrink-0">
        <span className="text-base font-semibold text-foreground">HRMS</span>
        {/* ปุ่มปิดบน mobile เท่านั้น */}
        {onNavigate && (
          <button
            onClick={onNavigate}
            className="lg:hidden flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-whited hover:text-foreground transition-colors"
            aria-label="ปิดเมนู"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-4 overflow-y-auto scrollbar-none">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.href} {...item} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </>
  )
}

// ── Desktop sidebar (lg+) ──────────────────────────────────────────────────────
export function Sidebar() {
  return (
    <aside className="hidden lg:flex h-full w-(--sidebar-width) flex-col border-r border-border bg-background">
      <SidebarContent />
    </aside>
  )
}

// ── Mobile drawer ─────────────────────────────────────────────────────────────
export function MobileDrawer() {
  const { isOpen, close } = useSidebar()
  const pathname = usePathname()

  // ปิด drawer เมื่อ navigate
  useEffect(() => {
    close()
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'lg:hidden fixed inset-0 z-40 bg-black/50 transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={close}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-background transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <SidebarContent onNavigate={close} />
      </aside>
    </>
  )
}
