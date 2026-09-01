'use client'

import { useState, useMemo, type ReactNode } from 'react'
import { usePermissions, useAllRolePermissions, useSetRolePermissions } from '@/hooks/use-permissions'
import type { PermissionDto } from '@hrms/shared-types'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Save, Shield, Users, Calendar, Clock, Building2,
  Settings, LayoutGrid, AlertTriangle, Check, Lock,
  FolderTree, ReceiptText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLES = ['Employee', 'Supervisor', 'Hr', 'Executive', 'Admin'] as const
type Role = (typeof ROLES)[number]

const MODULES = ['employee', 'leave', 'attendance', 'company', 'ticket', 'ticket-taxonomy', 'expense', 'memo', 'system'] as const

const MODULE_META = {
  employee:   { label: 'พนักงาน',   Icon: Users,     color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200',   dot: 'bg-blue-500'   },
  leave:      { label: 'วันลา',     Icon: Calendar,  color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  attendance: { label: 'การเข้างาน', Icon: Clock,     color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200',  dot: 'bg-amber-500'  },
  company:    { label: 'บริษัท',    Icon: Building2, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200', dot: 'bg-violet-500' },
  ticket:     { label: 'แจ้งเรื่อง', Icon: FolderTree, color: 'text-cyan-700',  bg: 'bg-cyan-50',   border: 'border-cyan-200',   dot: 'bg-cyan-500'   },
  'ticket-taxonomy': { label: 'ตั้งค่าแจ้งเรื่อง', Icon: FolderTree, color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200', dot: 'bg-teal-500' },
  expense:    { label: 'วางบิล',     Icon: ReceiptText, color: 'text-rose-700', bg: 'bg-rose-50',   border: 'border-rose-200',   dot: 'bg-rose-500'   },
  memo:       { label: 'Memo', Icon: ReceiptText, color: 'text-lime-700', bg: 'bg-lime-50', border: 'border-lime-200', dot: 'bg-lime-500' },
  system:     { label: 'ระบบ',      Icon: Settings,  color: 'text-slate-600',  bg: 'bg-slate-100', border: 'border-slate-200',  dot: 'bg-slate-500'  },
} as const

const ROLE_META: Record<Role, { label: string; color: string; bg: string; border: string; checkBg: string }> = {
  Employee:   { label: 'พนักงาน',  color: 'text-slate-700',   bg: 'bg-slate-100',   border: 'border-slate-300',  checkBg: 'bg-slate-600'   },
  Supervisor: { label: 'หัวหน้า',  color: 'text-blue-700',    bg: 'bg-blue-100',    border: 'border-blue-300',   checkBg: 'bg-blue-600'    },
  Hr:         { label: 'HR',       color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-300', checkBg: 'bg-emerald-600' },
  Executive:  { label: 'ผู้บริหาร', color: 'text-purple-700',  bg: 'bg-purple-100',  border: 'border-purple-300', checkBg: 'bg-purple-600'  },
  Admin:      { label: 'Admin',    color: 'text-amber-700',   bg: 'bg-amber-100',   border: 'border-amber-300',  checkBg: 'bg-amber-500'   },
}

// permission ที่อ่อนไหวสูง อนุญาตให้ผูกกับ role ที่กำหนดไว้เท่านั้น ต้องตรงกับ
// RestrictedPermissions ใน SetRolePermissionsCommand.cs (backend เป็นตัว enforce จริง)
const RESTRICTED_PERMISSIONS: Record<string, Role[]> = {
  'memo:approve': ['Admin', 'Executive'],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildMatrix(
  roleData: { role: string; permissionCodes: string[] }[],
  permissions: PermissionDto[],
): Record<string, Set<string>> {
  const codeToId: Record<string, string> = {}
  for (const p of permissions) codeToId[p.code] = p.id

  const map: Record<string, Set<string>> = {}
  for (const role of ROLES) {
    const rd = roleData.find((r) => r.role === role)
    map[role] = new Set((rd?.permissionCodes ?? []).map((c) => codeToId[c]).filter(Boolean))
  }
  return map
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PermissionsPage() {
  const { data: permissions = [], isLoading: loadingPerms } = usePermissions()
  const { data: roleData = [], isLoading: loadingRoles } = useAllRolePermissions()
  const setRolePerms = useSetRolePermissions()

  const [selectedModule, setSelectedModule] = useState<string>('all')
  const [draft, setDraft] = useState<Record<string, Set<string>> | null>(null)

  const baseMatrix = useMemo(
    () => (roleData.length && permissions.length ? buildMatrix(roleData, permissions) : null),
    [roleData, permissions],
  )

  const matrix: Record<string, Set<string>> = draft ?? baseMatrix ?? {}

  const filteredPermissions = useMemo(() => {
    if (selectedModule === 'all') return permissions
    return permissions.filter((p) => p.module === selectedModule)
  }, [permissions, selectedModule])

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, PermissionDto[]> = {}
    for (const p of filteredPermissions) {
      ;(groups[p.module] ??= []).push(p)
    }
    return groups
  }, [filteredPermissions])

  function toggle(role: string, permId: string) {
    setDraft((prev) => {
      const base = prev ?? matrix
      const next: Record<string, Set<string>> = {}
      for (const r of ROLES) next[r] = new Set(base[r] ?? [])
      if (next[role].has(permId)) next[role].delete(permId)
      else next[role].add(permId)
      return next
    })
  }

  function handleReset() {
    setDraft(null)
  }

  async function handleSave() {
    if (!draft) return
    try {
      await Promise.all(
        ROLES.filter((r) => r !== 'Admin').map((role) =>
          setRolePerms.mutateAsync({
            roleId: roleData.find((item) => item.role === role)!.roleId,
            permissionIds: [...draft[role]],
          }),
        ),
      )
      setDraft(null)
      toast.success('บันทึกสิทธิ์เรียบร้อย')
    } catch {
      toast.error('บันทึกไม่สำเร็จ กรุณาลองใหม่')
    }
  }

  const isLoading = loadingPerms || loadingRoles
  const isDirty = draft !== null
  const totalPerms = permissions.length

  return (
    <div className="relative min-h-screen pb-24">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">สิทธิ์การใช้งาน</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              กำหนดสิทธิ์การเข้าถึงของแต่ละ Role — Admin มีสิทธิ์ทุกอย่างเสมอ
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={!isDirty || setRolePerms.isPending} loading={setRolePerms.isPending} size="md">
          <Save className="h-4 w-4" />
          บันทึก
        </Button>
      </div>

      {/* ── Role Summary Cards ── */}
      {/* <div className="grid grid-cols-5 gap-3 mb-6">
        {ROLES.map((role) => {
          const meta = ROLE_META[role]
          const count = role === 'Admin' ? totalPerms : (matrix[role]?.size ?? 0)
          const pct = totalPerms > 0 ? Math.round((count / totalPerms) * 100) : 0
          return (
            <div
              key={role}
              className={cn(
                'rounded-xl border p-3.5 flex flex-col gap-2',
                meta.bg, meta.border,
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn('text-xs font-semibold', meta.color)}>{meta.label}</span>
                {role === 'Admin' && <Lock className="h-3 w-3 text-amber-500" />}
              </div>
              <div className={cn('text-2xl font-bold', meta.color)}>{count}</div>
              <div className="space-y-1">
                <div className="h-1.5 rounded-full bg-black/10 overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', meta.checkBg)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{pct}% จาก {totalPerms} สิทธิ์</p>
              </div>
            </div>
          )
        })}
      </div> */}

      {/* ── Module Filter ── */}
      <div className="flex gap-2 flex-wrap mb-5">
        <ModuleTab
          active={selectedModule === 'all'}
          onClick={() => setSelectedModule('all')}
          icon={<LayoutGrid className="h-3.5 w-3.5" />}
          label="ทั้งหมด"
          count={permissions.length}
        />
        {MODULES.map((mod) => {
          const meta = MODULE_META[mod]
          const count = permissions.filter((p) => p.module === mod).length
          return (
            <ModuleTab
              key={mod}
              active={selectedModule === mod}
              onClick={() => setSelectedModule(mod)}
              icon={<meta.Icon className="h-3.5 w-3.5" />}
              label={meta.label}
              count={count}
              activeColor={meta.color}
              activeBg={meta.bg}
              activeBorder={meta.border}
            />
          )
        })}
      </div>

      {/* ── Matrix ── */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-whited/40">
                  <th className="text-left px-5 py-3.5 font-semibold text-muted-foreground w-72">
                    สิทธิ์การใช้งาน
                  </th>
                  {ROLES.map((role) => {
                    const meta = ROLE_META[role]
                    return (
                      <th key={role} className="px-4 py-3.5 text-center min-w-27.5">
                        <div className="flex flex-col items-center gap-1">
                          <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', meta.bg, meta.color, 'border', meta.border)}>
                            {meta.label}
                          </span>
                          {role === 'Admin' && (
                            <span className="text-[10px] text-amber-500 font-medium flex items-center gap-0.5">
                              <Lock className="h-2.5 w-2.5" /> ทุกสิทธิ์
                            </span>
                          )}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedPermissions).map(([module, perms]) => (
                  <ModuleGroup
                    key={module}
                    module={module}
                    permissions={perms}
                    matrix={matrix}
                    onToggle={toggle}
                    showHeader={selectedModule === 'all'}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Dirty Banner ── */}
      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border bg-background border-amber-300">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-sm font-medium">มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก</p>
          <div className="flex gap-2 ml-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              ยกเลิก
            </Button>
            <Button size="sm" onClick={handleSave} loading={setRolePerms.isPending}>
              <Save className="h-3.5 w-3.5" />
              บันทึก
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── ModuleTab ─────────────────────────────────────────────────────────────────

function ModuleTab({
  active, onClick, icon, label, count,
  activeColor, activeBg, activeBorder,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
  count: number
  activeColor?: string
  activeBg?: string
  activeBorder?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all',
        active
          ? cn(activeBg ?? 'bg-primary/10', activeColor ?? 'text-primary', activeBorder ?? 'border-primary/40')
          : 'bg-background text-muted-foreground border-border hover:border-muted-foreground/40 hover:text-foreground',
      )}
    >
      {icon}
      {label}
      <span className={cn(
        'ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
        active ? 'bg-current/15 text-current' : 'bg-whited text-muted-foreground',
      )}>
        {count}
      </span>
    </button>
  )
}

// ── ModuleGroup ───────────────────────────────────────────────────────────────

function ModuleGroup({
  module, permissions, matrix, onToggle, showHeader,
}: {
  module: string
  permissions: PermissionDto[]
  matrix: Record<string, Set<string>>
  onToggle: (role: string, permId: string) => void
  showHeader: boolean
}) {
  const meta = MODULE_META[module as keyof typeof MODULE_META]
  if (!meta) return null
  const { Icon } = meta

  return (
    <>
      {showHeader && (
        <tr className={cn('border-y border-border', meta.bg)}>
          <td colSpan={ROLES.length + 1} className="px-5 py-2.5">
            <div className="flex items-center gap-2">
              <div className={cn('p-1 rounded-md', meta.bg, 'border', meta.border)}>
                <Icon className={cn('h-3.5 w-3.5', meta.color)} />
              </div>
              <span className={cn('text-xs font-bold uppercase tracking-wider', meta.color)}>
                {meta.label}
              </span>
              <span className="text-xs text-muted-foreground">— {permissions.length} สิทธิ์</span>
            </div>
          </td>
        </tr>
      )}
      {permissions.map((perm, idx) => (
        <PermissionRow
          key={perm.id}
          perm={perm}
          matrix={matrix}
          onToggle={onToggle}
          isLast={idx === permissions.length - 1}
        />
      ))}
    </>
  )
}

// ── PermissionRow ─────────────────────────────────────────────────────────────

function PermissionRow({
  perm, matrix, onToggle, isLast,
}: {
  perm: PermissionDto
  matrix: Record<string, Set<string>>
  onToggle: (role: string, permId: string) => void
  isLast: boolean
}) {
  return (
    <tr className={cn(
      'group transition-colors hover:bg-whited/30',
      !isLast && 'border-b border-border/60',
    )}>
      {/* Permission info */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2 mb-0.5">
          <code className="text-xs font-mono text-muted-foreground bg-whited px-1.5 py-0.5 rounded">
            {perm.action}
          </code>
          {perm.isSystem && (
            <Badge variant="default" className="text-[10px] px-1.5 py-0">System</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{perm.description}</p>
      </td>

      {/* Checkboxes per role */}
      {ROLES.map((role) => {
        const checked = role === 'Admin' ? true : (matrix[role]?.has(perm.id) ?? false)
        const isAdmin = role === 'Admin'
        const restrictedTo = RESTRICTED_PERMISSIONS[perm.code]
        const isRestricted = !isAdmin && restrictedTo && !restrictedTo.includes(role)
        const isLocked = isAdmin || isRestricted
        const meta = ROLE_META[role]
        return (
          <td key={role} className="px-4 py-3.5 text-center">
            <button
              type="button"
              disabled={isLocked}
              onClick={() => !isLocked && onToggle(role, perm.id)}
              title={isRestricted ? `permission นี้กำหนดให้เฉพาะ ${restrictedTo.join('/')} เท่านั้น` : undefined}
              className={cn(
                'inline-flex items-center justify-center w-6 h-6 rounded-md border-2 transition-all',
                checked
                  ? cn(meta.checkBg, 'border-transparent text-white shadow-sm')
                  : 'border-border bg-background hover:border-muted-foreground/50',
                isLocked && 'cursor-not-allowed opacity-80',
                !isLocked && !checked && 'cursor-pointer hover:bg-whited/50',
              )}
            >
              {checked && <Check className="h-3.5 w-3.5 stroke-3" />}
            </button>
          </td>
        )
      })}
    </tr>
  )
}

// ── LoadingSkeleton ───────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Role cards skeleton */}
      <div className="grid grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-whited" />
        ))}
      </div>
      {/* Table skeleton */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="h-12 bg-whited/40 border-b border-border" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 border-b border-border/60 bg-background flex items-center px-5 gap-4">
            <div className="h-4 w-48 bg-whited rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
