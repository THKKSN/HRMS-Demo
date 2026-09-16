'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  BellRing, CalendarCog, CalendarOff, ChevronLeft, ChevronRight, Clock,
  FileText, FolderTree, Globe, Settings2Icon, ShieldAlert, ShieldCheck, SlidersHorizontal,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/utils'
import { canSeeItem } from '@/lib/permission'

const COLLAPSED_STORAGE_KEY = 'hrms.settingsSidebar.collapsed'

// ชื่อ/คำอธิบายเมนูอยู่ที่ `admin.settings.nav.<key>` — ที่นี่เก็บแค่ key กับสิทธิ์
type SettingsNavItem = {
  key: string
  href: string
  icon: LucideIcon
  permissions: string[]
  fallbackRoles: string[]
}

const NAV_ITEMS: SettingsNavItem[] = [
  // ── ทั่วไป (ทุกคนเข้าได้ — ค่าเก็บในเครื่องผู้ใช้) ─────────────────
  {
    key: 'general',
    href: '/settings/general',
    icon: SlidersHorizontal,
    permissions: [],
    fallbackRoles: [],
  },
  // ── บริหารเวลาทำงาน ──────────────────────────────────────────────
  {
    key: 'shifts',
    href: '/settings/shifts',
    icon: Clock,
    permissions: ['company:manage-shifts'],
    fallbackRoles: ['Admin', 'Hr'],
  },
  {
    key: 'attendancePolicy',
    href: '/settings/attendance-policy',
    icon: ShieldAlert,
    permissions: ['attendance:manage-policy'],
    fallbackRoles: ['Admin', 'Hr'],
  },
  {
    key: 'holidays',
    href: '/settings/holidays',
    icon: CalendarOff,
    permissions: ['company:manage-holidays'],
    fallbackRoles: ['Admin', 'Hr'],
  },
  {
    key: 'holidaySchedules',
    href: '/settings/holiday-schedules',
    icon: CalendarCog,
    permissions: ['company:manage-holidays'],
    fallbackRoles: ['Admin', 'Hr'],
  },
  // ── ระบบแจ้งเรื่องและMemo ──────────────────────────────
  {
    key: 'ticketTaxonomyInternal',
    href: '/settings/ticket-taxonomy/internal',
    icon: FolderTree,
    permissions: ['system:manage-ticket'],
    fallbackRoles: ['Admin', 'Supervisor'],
  },
  {
    key: 'ticketTaxonomyExternal',
    href: '/settings/ticket-taxonomy/external',
    icon: Globe,
    permissions: ['system:manage-ticket'],
    fallbackRoles: ['Admin', 'Supervisor'],
  },
  {
    key: 'memo',
    href: '/settings/memo',
    icon: FileText,
    permissions: ['system:manage-memo'],
    fallbackRoles: ['Admin'],
  },
  // ── การบริหารระบบ ────────────────────────────────────────────────
  {
    key: 'permissions',
    href: '/settings/permissions',
    icon: ShieldCheck,
    permissions: ['system:manage-roles'],
    fallbackRoles: ['Admin'],
  },
  {
    key: 'auditLogs',
    href: '/settings/audit-logs',
    icon: Settings2Icon,
    permissions: ['system:view-audit-logs'],
    fallbackRoles: ['Admin'],
  },
  {
    key: 'notifications',
    href: '/settings/notification-deliveries',
    icon: BellRing,
    permissions: ['system:manage-notifications'],
    fallbackRoles: ['Admin'],
  },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('admin.settings')
  const pathname = usePathname()
  const employee = useAuthStore(s => s.employee)
  const permissionCodes = new Set(employee?.permissionCodes ?? [])
  const hasPermissionPayload = Array.isArray(employee?.permissionCodes)

  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === '1')
    } catch {
      // localStorage ไม่พร้อมใช้งาน — ใช้ค่า default
    }
  }, [])

  function toggleCollapsed() {
    setCollapsed(prev => {
      const next = !prev
      try {
        window.localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? '1' : '0')
      } catch {
        // ignore
      }
      return next
    })
  }

  const visibleItems = NAV_ITEMS.filter(item =>
    canSeeItem(item, employee, permissionCodes, hasPermissionPayload),
  )

  return (
    <div>
      {visibleItems.length === 0 ? (
        <div className="space-y-5">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{t('shell.title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('shell.subtitle')}</p>
          </div>
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-5 py-12 text-center text-sm text-muted-foreground">
            {t('shell.noAccess')}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
          <nav
            className={cn(
              'shrink-0 space-y-3 rounded-2xl border border-border bg-background py-3 transition-[width] duration-200 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto',
              collapsed ? 'lg:w-14' : 'lg:w-64',
            )}
          >
            <div className={cn('flex items-center gap-2 border-b border-border pb-3', collapsed ? 'justify-center px-1.5' : 'justify-between px-3')}>
              {!collapsed && (
                <div className="min-w-0">
                  <h1 className="text-lg font-semibold text-foreground">{t('shell.title')}</h1>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t('shell.subtitle')}</p>
                </div>
              )}
              <button
                type="button"
                onClick={toggleCollapsed}
                title={collapsed ? t('shell.expandMenu') : t('shell.collapseMenu')}
                aria-label={collapsed ? t('shell.expandMenu') : t('shell.collapseMenu')}
                className="flex shrink-0 items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-whited/60 hover:text-foreground"
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
            </div>
            <div className={cn('space-y-1', collapsed ? 'px-1.5' : 'px-3')}>
              {visibleItems.map(item => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                const label = t(`nav.${item.key}.label`)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? label : t(`nav.${item.key}.description`)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                      collapsed && 'justify-center px-2',
                      active
                        ? 'bg-primary/10 font-semibold text-primary'
                        : 'text-muted-foreground hover:bg-whited/60 hover:text-foreground',
                    )}
                  >
                    <item.icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
                    {!collapsed && <span className="min-w-0 truncate">{label}</span>}
                  </Link>
                )
              })}
            </div>
          </nav>

          <div className="min-w-0 flex-1">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}
