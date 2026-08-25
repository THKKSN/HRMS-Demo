'use client'

import Link from 'next/link'
import { BellRing, ChevronRight, FolderTree, Globe, Settings2Icon, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { EmployeeSummaryDto } from '@hrms/shared-types'
import { useAuthStore } from '@/stores/auth.store'

type SettingsCard = {
  label: string
  description: string
  href: string
  icon: LucideIcon
  permissions: string[]
  fallbackRoles: string[]
}

const CARDS: SettingsCard[] = [
  {
    label: 'จัดการ Permission',
    description: 'กำหนดสิทธิ์การใช้งานของแต่ละ Role ในระบบ',
    href: '/settings/permissions',
    icon: ShieldCheck,
    permissions: ['system:manage-roles'],
    fallbackRoles: ['Admin'],
  },
  {
    label: 'Audit Log',
    description: 'ประวัติการเปลี่ยนแปลงข้อมูลสำคัญในระบบ',
    href: '/settings/audit-logs',
    icon: Settings2Icon,
    permissions: ['system:view-audit-logs'],
    fallbackRoles: ['Admin'],
  },
  {
    label: 'การส่งแจ้งเตือน',
    description: 'ตรวจสอบสถานะการส่งแจ้งเตือนผ่าน LINE และช่องทางอื่น',
    href: '/settings/notification-deliveries',
    icon: BellRing,
    permissions: ['system:manage-notifications'],
    fallbackRoles: ['Admin'],
  },
  {
    label: 'ตั้งค่าแจ้งเรื่อง (ภายใน)',
    description: 'หมวด หมวดย่อย หัวข้อ ผู้รับผิดชอบ และ Template/Suggest ของพนักงานภายใน',
    href: '/settings/ticket-taxonomy/internal',
    icon: FolderTree,
    permissions: ['system:manage-ticket'],
    fallbackRoles: ['Admin', 'Supervisor'],
  },
  {
    label: 'ตั้งค่าแจ้งเรื่อง (บุคคลภายนอก)',
    description: 'หมวด หมวดย่อย หัวข้อ และ Template/Suggest สำหรับช่องทางบุคคลภายนอก',
    href: '/settings/ticket-taxonomy/external',
    icon: Globe,
    permissions: ['system:manage-ticket'],
    fallbackRoles: ['Admin', 'Supervisor'],
  },
]

function hasAnyPermission(permissionCodes: Set<string>, permissions: string[]) {
  return !permissions.length || permissions.some(permission => permissionCodes.has(permission))
}

function hasAnyRole(employee: EmployeeSummaryDto | null, roles: string[]) {
  return employee?.roles.some(role => roles.includes(role.role)) ?? false
}

function canSeeCard(
  card: SettingsCard,
  employee: EmployeeSummaryDto | null,
  permissionCodes: Set<string>,
  hasPermissionPayload: boolean,
) {
  const hasPermissionRule = Boolean(card.permissions.length)

  if (hasPermissionRule) {
    if (hasAnyPermission(permissionCodes, card.permissions)) return true
    return !hasPermissionPayload && hasAnyRole(employee, card.fallbackRoles)
  }

  if (card.fallbackRoles.length) return hasAnyRole(employee, card.fallbackRoles)
  return true
}

export default function SettingsIndexPage() {
  const employee = useAuthStore(s => s.employee)
  const permissionCodes = new Set(employee?.permissionCodes ?? [])
  const hasPermissionPayload = Array.isArray(employee?.permissionCodes)

  const visibleCards = CARDS.filter(card =>
    canSeeCard(card, employee, permissionCodes, hasPermissionPayload),
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">ตั้งค่าระบบ</h1>
        <p className="mt-1 text-sm text-muted-foreground">จัดการสิทธิ์ ประวัติการใช้งาน และค่าคอนฟิกต่างๆ ของระบบ</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleCards.map(card => (
          <Link
            key={card.href}
            href={card.href}
            className="group flex items-start gap-4 rounded-2xl border border-border bg-background p-5 transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <card.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{card.label}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{card.description}</p>
            </div>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
        ))}
      </div>

      {visibleCards.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-5 py-12 text-center text-sm text-muted-foreground">
          คุณไม่มีสิทธิ์เข้าถึงเมนูตั้งค่าใดๆ
        </div>
      )}
    </div>
  )
}
