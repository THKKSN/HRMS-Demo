'use client'

import { use, useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft, Check, KeyRound, Pencil, Plus, RefreshCw, Trash2, X,
  User, Building2, Layers, CalendarDays,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { DateInput } from '@/components/ui/date-input'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import {
  useEmployee, useUpdateEmployee, useToggleEmployeeStatus,
  useAddEmployeeRole, useRemoveEmployeeRole, useSetPassword,
} from '@/hooks/use-employees'
import { useCompanies } from '@/hooks/use-companies'
import { useDepartments } from '@/hooks/use-departments'
import { useRoleLabels } from '@/hooks/use-role-labels'
import { useLeaveTypes } from '@/hooks/use-leave-types'
import { useLeaveBalances, useAdjustBalance, useCreateLeaveBalance, useSeedBalancesForEmployee } from '@/hooks/use-leave-balances'
import { useAuthStore } from '@/stores/auth.store'
import type { RoleType, LeaveBalanceAdminDto } from '@/types/admin'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1]
const ROLE_OPTIONS: RoleType[] = ['Employee', 'Supervisor', 'Hr', 'Admin', 'Executive']

const ROLE_CHIP: Record<string, string> = {
  Admin:      'bg-red-100 text-red-700 border-red-200',
  Hr:         'bg-purple-100 text-purple-700 border-purple-200',
  Supervisor: 'bg-blue-100 text-blue-700 border-blue-200',
  Executive:  'bg-amber-100 text-amber-700 border-amber-200',
  Employee:   'bg-slate-100 text-slate-600 border-slate-200',
}

const editSchema = z.object({
  firstName:    z.string().min(1, 'กรุณากรอกชื่อ'),
  lastName:     z.string().min(1, 'กรุณากรอกนามสกุล'),
  email:        z.string().email({ message: 'อีเมลไม่ถูกต้อง' }).optional().or(z.literal('')),
  phone:        z.string().optional(),
  hireDate:     z.string().optional(),
  nationalId:   z.string().optional(),
  companyId:    z.string().optional(),
  departmentId: z.string().optional(),
  roleLabelId:  z.string().optional(),
})
type EditValues = z.infer<typeof editSchema>

type TabKey = 'info' | 'roles' | 'leave' | 'password'

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  return (parts[0]?.slice(0, 2) ?? '??').toUpperCase()
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive mt-0.5">{message}</p>
}

// ── Inline input ──────────────────────────────────────────────────────────────
function InlineInput({ value, error, isPending, onChange, onConfirm, onCancel }: {
  value: string; error: string; isPending: boolean
  onChange: (v: string) => void; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <Input type="number" min={0} step={0.5} value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-20 text-right text-sm" autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') onConfirm(); if (e.key === 'Escape') onCancel() }} />
        <Button size="icon" className="h-7 w-7 shrink-0" loading={isPending} onClick={onConfirm}>
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={onCancel}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ── Leave balance tab ─────────────────────────────────────────────────────────
function LeaveBalanceTab({ empId, companyId, canEdit }: { empId: string; companyId: string; canEdit: boolean }) {
  const [year, setYear]               = useState(CURRENT_YEAR)
  const [editId, setEditId]           = useState<string | null>(null)
  const [editValue, setEditValue]     = useState('')
  const [editError, setEditError]     = useState('')
  const [createLtId, setCreateLtId]   = useState<string | null>(null)
  const [createValue, setCreateValue] = useState('0')
  const [createError, setCreateError] = useState('')

  const { data: leaveTypes = [] }              = useLeaveTypes()
  const { data: balanceData, isLoading }       = useLeaveBalances({ year, employeeId: empId, companyId, pageSize: 50 })
  const adjustBalance   = useAdjustBalance()
  const createBalance   = useCreateLeaveBalance()
  const seedForEmployee = useSeedBalancesForEmployee()

  const balanceMap = useMemo(() => {
    const map = new Map<string, LeaveBalanceAdminDto>()
    for (const b of balanceData?.items ?? []) map.set(b.leaveTypeId, b)
    return map
  }, [balanceData])

  const activeTypes  = leaveTypes.filter((lt) => lt.isActive)
  const missingCount = activeTypes.filter((lt) => !balanceMap.has(lt.id)).length

  function startEdit(b: LeaveBalanceAdminDto) { setEditId(b.id); setEditValue(String(b.totalDays)); setEditError('') }
  function cancelEdit() { setEditId(null); setEditValue(''); setEditError('') }

  async function confirmEdit(id: string) {
    const val = parseFloat(editValue)
    if (isNaN(val) || val < 0) { setEditError('กรุณากรอกตัวเลขที่ถูกต้อง (≥ 0)'); return }
    try {
      await adjustBalance.mutateAsync({ id, totalDays: val })
      toast.success('บันทึกสิทธิ์สำเร็จ'); setEditId(null)
    } catch (err: unknown) {
      const d = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data
      setEditError(d?.error === 'QUOTA_BELOW_USED' ? (d.message ?? 'สิทธิ์น้อยกว่าวันที่ใช้ไปแล้ว') : 'เกิดข้อผิดพลาด')
    }
  }

  function startCreate(ltId: string) { setCreateLtId(ltId); setCreateValue('0'); setCreateError('') }
  function cancelCreate() { setCreateLtId(null); setCreateValue(''); setCreateError('') }

  async function confirmCreate(ltId: string) {
    const val = parseFloat(createValue)
    if (isNaN(val) || val < 0) { setCreateError('กรุณากรอกตัวเลขที่ถูกต้อง (≥ 0)'); return }
    try {
      await createBalance.mutateAsync({ employeeId: empId, leaveTypeId: ltId, year, totalDays: val })
      toast.success('เพิ่มสิทธิ์สำเร็จ'); setCreateLtId(null)
    } catch (err: unknown) {
      const d = (err as { response?: { data?: { error?: string } } })?.response?.data
      setCreateError(d?.error === 'BALANCE_ALREADY_EXISTS' ? 'มีสิทธิ์นี้อยู่แล้ว' : 'เกิดข้อผิดพลาด')
    }
  }

  async function handleSeed() {
    try {
      const res = await seedForEmployee.mutateAsync({ employeeId: empId, year })
      toast[res.created === 0 ? 'info' : 'success'](
        res.created === 0 ? 'สิทธิ์ครบทุกประเภทการลาแล้ว' : `สร้างสิทธิ์วันลาแล้ว ${res.created} รายการ`,
      )
    } catch { toast.error('เกิดข้อผิดพลาด') }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {YEARS.map((y) => (
            <button key={y}
              onClick={() => { setYear(y); setEditId(null); setCreateLtId(null) }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                year === y ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}>{y}</button>
          ))}
        </div>
        {canEdit && missingCount > 0 && (
          <Button size="sm" variant="outline" loading={seedForEmployee.isPending} onClick={handleSeed}>
            <RefreshCw className="h-3.5 w-3.5" />Seed ที่ขาด ({missingCount})
          </Button>
        )}
      </div>

      <div className="overflow-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">ประเภทการลา</th>
              <th className="px-4 py-2.5 text-center font-medium text-muted-foreground w-20">ค่าเริ่มต้น</th>
              <th className="px-4 py-2.5 text-center font-medium text-muted-foreground w-32">สิทธิ์</th>
              <th className="px-4 py-2.5 text-center font-medium text-muted-foreground w-16">ใช้ไป</th>
              <th className="px-4 py-2.5 text-center font-medium text-muted-foreground w-16">รอ</th>
              <th className="px-4 py-2.5 text-center font-medium text-muted-foreground w-20">คงเหลือ</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
              <tr key={i} className="border-b border-border">
                {Array.from({ length: 6 }).map((__, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 w-16 animate-pulse rounded bg-muted mx-auto" />
                  </td>
                ))}
              </tr>
            ))}
            {!isLoading && activeTypes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  ยังไม่มีประเภทการลาในบริษัทนี้
                </td>
              </tr>
            )}
            {!isLoading && activeTypes.map((lt) => {
              const balance    = balanceMap.get(lt.id)
              const isEditing  = editId !== null && balance?.id === editId
              const isCreating = createLtId === lt.id
              return (
                <tr key={lt.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium">{lt.nameTh}</div>
                    {lt.nameEn && <div className="text-xs text-muted-foreground">{lt.nameEn}</div>}
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{lt.defaultDaysPerYear}</td>
                  <td className="px-4 py-3">
                    {!balance && !isCreating && (
                      canEdit ? (
                        <button
                          className="mx-auto flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-primary hover:font-medium transition-colors"
                          onClick={() => startCreate(lt.id)}
                        >
                          <Plus className="h-3 w-3" />เพิ่มสิทธิ์
                        </button>
                      ) : (
                        <span className="mx-auto block text-center text-muted-foreground/30">—</span>
                      )
                    )}
                    {!balance && isCreating && canEdit && (
                      <InlineInput value={createValue} error={createError} isPending={createBalance.isPending}
                        onChange={setCreateValue} onConfirm={() => confirmCreate(lt.id)} onCancel={cancelCreate} />
                    )}
                    {balance && !isEditing && (
                      <div className={`flex items-center justify-center gap-2 ${canEdit ? 'group' : ''}`}>
                        <span className="font-medium">{balance.totalDays}</span>
                        {canEdit && (
                          <Button size="icon" variant="ghost"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={() => startEdit(balance)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                    {balance && isEditing && canEdit && (
                      <InlineInput value={editValue} error={editError} isPending={adjustBalance.isPending}
                        onChange={setEditValue} onConfirm={() => confirmEdit(balance.id)} onCancel={cancelEdit} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{balance ? balance.usedDays : '—'}</td>
                  <td className="px-4 py-3 text-center text-amber-500">{balance ? balance.pendingDays : '—'}</td>
                  <td className="px-4 py-3 text-center font-semibold text-green-600">{balance ? balance.remainingDays : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router  = useRouter()

  const { data: emp, isLoading } = useEmployee(id)
  const updateEmployee = useUpdateEmployee(id)
  const toggleStatus   = useToggleEmployeeStatus(id)
  const addRole        = useAddEmployeeRole(id)
  const removeRole     = useRemoveEmployeeRole(id)
  const setPasswordMut = useSetPassword(id)

  const [activeTab,     setActiveTab]     = useState<TabKey>('info')
  const [addRoleOpen,   setAddRoleOpen]   = useState(false)
  const [selectedRole,  setSelectedRole]  = useState<RoleType>('Employee')
  const [pwOpen,        setPwOpen]        = useState(false)
  const [newPw,         setNewPw]         = useState('')
  const [pwError,       setPwError]       = useState('')
  const [removeTarget,  setRemoveTarget]  = useState<string | null>(null)
  const [toggleConfirm, setToggleConfirm] = useState(false)

  const currentUser = useAuthStore((s) => s.employee)
  const isAdmin   = currentUser?.roles.some((r) => r.role === 'Admin') ?? false
  const isHr      = currentUser?.roles.some((r) => r.role === 'Hr')    ?? false
  const canEdit   = isAdmin || isHr

  const { data: tree = [] } = useCompanies()
  const activeCompanies = useMemo(() => {
    const result: { id: string; name: string }[] = []
    function walk(nodes: typeof tree) {
      for (const n of nodes) { if (n.isActive) result.push({ id: n.id, name: n.name }); walk(n.children) }
    }
    walk(tree)
    return result
  }, [tree])

  const { register, handleSubmit, setError, reset, watch, setValue,
    formState: { errors, isSubmitting, isDirty } } =
    useForm<EditValues>({
      resolver: zodResolver(editSchema),
      values: emp ? {
        firstName:    emp.fullName.split(' ')[0] ?? '',
        lastName:     emp.fullName.split(' ').slice(1).join(' ') ?? '',
        email:        emp.email        ?? '',
        phone:        emp.phone        ?? '',
        hireDate:     emp.hireDate     ?? '',
        nationalId:   emp.nationalId   ?? '',
        companyId:    emp.companyId    ?? '',
        departmentId: emp.departmentId ?? '',
        roleLabelId:  emp.roleLabelId  ?? '',
      } : undefined,
    })

  const selectedCompanyId  = watch('companyId')
  const effectiveCompanyId = selectedCompanyId || emp?.companyId
  const { data: departments = [] } = useDepartments(effectiveCompanyId)
  const { data: roleLabels = [] }  = useRoleLabels(effectiveCompanyId || undefined)

  const empLoadedRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!selectedCompanyId) return
    if (empLoadedRef.current === undefined) { empLoadedRef.current = selectedCompanyId; return }
    if (selectedCompanyId !== empLoadedRef.current) {
      setValue('departmentId', ''); setValue('roleLabelId', '')
      empLoadedRef.current = selectedCompanyId
    }
  }, [selectedCompanyId, setValue])

  async function onSave(values: EditValues) {
    try {
      await updateEmployee.mutateAsync({
        firstName:    values.firstName,
        lastName:     values.lastName,
        email:        values.email        || undefined,
        phone:        values.phone        || undefined,
        hireDate:     values.hireDate     || undefined,
        nationalId:   values.nationalId   || undefined,
        companyId:    values.companyId    || undefined,
        departmentId: values.departmentId || undefined,
        roleLabelId:  values.roleLabelId  || undefined,
      })
      toast.success('บันทึกข้อมูลสำเร็จ'); reset(values)
    } catch (err: unknown) {
      const e = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (e === 'DUPLICATE_EMAIL') setError('email', { message: 'อีเมลนี้มีอยู่แล้ว' })
      else { setError('root', { message: 'เกิดข้อผิดพลาด' }); toast.error('เกิดข้อผิดพลาด') }
    }
  }

  async function handleAddRole() {
    try {
      await addRole.mutateAsync({ role: selectedRole })
      setAddRoleOpen(false); toast.success(`เพิ่ม role ${selectedRole} สำเร็จ`)
    } catch (err: unknown) {
      const e = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(e === 'DUPLICATE_ROLE' ? 'role นี้มีอยู่แล้ว' : 'เกิดข้อผิดพลาด')
    }
  }

  async function confirmRemoveRole() {
    if (!removeTarget) return
    try {
      await removeRole.mutateAsync(removeTarget)
      toast.success('ลบ role สำเร็จ'); setRemoveTarget(null)
    } catch (err: unknown) {
      const e = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(e === 'LAST_ADMIN' ? 'ไม่สามารถลบ Admin คนสุดท้ายได้' : 'เกิดข้อผิดพลาด')
      setRemoveTarget(null)
    }
  }

  async function handleSetPassword() {
    if (newPw.length < 6) { setPwError('อย่างน้อย 6 ตัวอักษร'); return }
    try {
      await setPasswordMut.mutateAsync(newPw)
      toast.success('รีเซ็ตรหัสผ่านสำเร็จ')
      setPwOpen(false); setNewPw(''); setPwError('')
    } catch { toast.error('เกิดข้อผิดพลาด') }
  }

  async function confirmToggleStatus() {
    if (!emp) return
    try {
      await toggleStatus.mutateAsync(!emp.isActive)
      toast.success(`${emp.isActive ? 'ปิด' : 'เปิด'}การใช้งานสำเร็จ`)
      setToggleConfirm(false)
    } catch (err: unknown) {
      const e = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(e === 'CANNOT_DEACTIVATE_SELF' ? 'ไม่สามารถพ้นสภาพตัวเองได้' : 'เกิดข้อผิดพลาด')
      setToggleConfirm(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
        <div className="h-10 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  if (!emp) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/employees')}>
          <ArrowLeft className="h-4 w-4" />กลับ
        </Button>
        <p className="text-muted-foreground">ไม่พบข้อมูลพนักงาน</p>
      </div>
    )
  }

  const activeRoles = emp.roles.filter((r) => r.isActive)

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'info',     label: 'ข้อมูลทั่วไป' },
    { key: 'roles',    label: 'สิทธิ์การใช้งาน' },
    { key: 'leave',    label: 'โควตาวันลา' },
    ...(canEdit ? [{ key: 'password' as TabKey, label: 'รหัสผ่าน' }] : []),
  ]

  return (
    <div>
      {/* Back */}
      <div className="mb-5">
        <Button variant="ghost" size="sm" onClick={() => router.push('/employees')} className="-ml-2">
          <ArrowLeft className="h-4 w-4" />กลับรายการพนักงาน
        </Button>
      </div>

      {/* ── Hero card ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-linear-to-br from-primary/5 via-background to-background p-6 mb-6">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/5" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            {/* Avatar initials */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary text-xl font-bold ring-4 ring-white dark:ring-card shadow-sm">
              {getInitials(emp.fullName)}
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold leading-tight">{emp.fullName}</h1>
                <Badge variant={emp.isActive ? 'success' : 'secondary'} className="shrink-0">
                  {emp.isActive ? 'ปฎิบัติงาน' : 'พ้นสภาพ'}
                </Badge>
              </div>

              <p className="text-sm font-mono text-muted-foreground">{emp.employeeCode}</p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                {emp.companyName && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 shrink-0" />{emp.companyName}
                  </span>
                )}
                {emp.departmentName && (
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 shrink-0" />{emp.departmentName}
                  </span>
                )}
                {emp.roleLabelName && (
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 shrink-0" />{emp.roleLabelName}
                  </span>
                )}
                {emp.hireDate && (
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    {new Date(emp.hireDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>

              {activeRoles.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {activeRoles.map((r) => (
                    <span
                      key={r.id}
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${ROLE_CHIP[r.role] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}
                    >
                      {r.role}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {canEdit && (
            <Button
              size="sm"
              variant={emp.isActive ? 'destructive' : 'outline'}
              onClick={() => setToggleConfirm(true)}
              className="shrink-0 self-start sm:mt-0 mt-2"
            >
              {emp.isActive ? 'พ้นสภาพ' : 'เปิดการปฎิบัติงาน'}
            </Button>
          )}
        </div>
      </div>

      {/* ── Tab nav ───────────────────────────────────────────────────────── */}
      <div className="border-b border-border mb-6">
        <nav className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab: ข้อมูลทั่วไป ─────────────────────────────────────────────── */}
      {activeTab === 'info' && (
        <div className="rounded-xl border border-border bg-card p-6">
          <form onSubmit={handleSubmit(onSave)} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="e-fn">ชื่อ *</Label>
                <Input id="e-fn" {...register('firstName')} disabled={!canEdit} />
                <FieldError message={errors.firstName?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-ln">นามสกุล *</Label>
                <Input id="e-ln" {...register('lastName')} disabled={!canEdit} />
                <FieldError message={errors.lastName?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-email">อีเมล</Label>
                <Input id="e-email" type="email" {...register('email')} disabled={!canEdit} />
                <FieldError message={errors.email?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-phone">เบอร์โทรศัพท์</Label>
                <Input id="e-phone" {...register('phone')} disabled={!canEdit} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-hire">วันที่เริ่มงาน</Label>
                <DateInput id="e-hire" {...register('hireDate')} disabled={!canEdit} />
              </div>
              {(emp.nationalId || emp.nationalIdMasked) && (
                <div className="space-y-1.5">
                  <Label htmlFor="e-nid">เลขบัตรประชาชน</Label>
                  {canEdit ? (
                    <Input id="e-nid" {...register('nationalId')} placeholder={emp.nationalIdMasked ?? ''} />
                  ) : (
                    <Input id="e-nid" value={emp.nationalIdMasked ?? ''} disabled />
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-border pt-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">สังกัด</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="e-company">บริษัท</Label>
                  <Select id="e-company" {...register('companyId')} disabled={!canEdit}>
                    <option value="">— เลือกบริษัท —</option>
                    {activeCompanies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e-dept">แผนก</Label>
                  <Select id="e-dept" {...register('departmentId')} disabled={!canEdit}>
                    <option value="">— ไม่ระบุแผนก —</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e-rlabel">ตำแหน่ง</Label>
                  <Select id="e-rlabel" {...register('roleLabelId')} disabled={!canEdit}>
                    <option value="">
                      {effectiveCompanyId && roleLabels.length === 0 ? '— ยังไม่มีตำแหน่งในบริษัทนี้ —' : '— ไม่ระบุ —'}
                    </option>
                    {roleLabels.map((rl) => <option key={rl.id} value={rl.id}>{rl.name}</option>)}
                  </Select>
                </div>
              </div>
            </div>

            {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
            {canEdit && (
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button type="button" variant="outline" size="sm" onClick={() => reset()} disabled={!isDirty}>ยกเลิก</Button>
                <Button type="submit" size="sm" loading={isSubmitting} disabled={!isDirty}>บันทึกการเปลี่ยนแปลง</Button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* ── Tab: สิทธิ์การใช้งาน ──────────────────────────────────────────── */}
      {activeTab === 'roles' && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          {canEdit && (
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setAddRoleOpen((v) => !v)}>
                <Plus className="h-4 w-4" />เพิ่มสิทธิ์
              </Button>
            </div>
          )}
          {canEdit && addRoleOpen && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3">
              <Select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value as RoleType)} className="w-40">
                {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
              <Button size="sm" loading={addRole.isPending} onClick={handleAddRole}>เพิ่ม</Button>
              <Button size="sm" variant="ghost" onClick={() => setAddRoleOpen(false)}>ยกเลิก</Button>
            </div>
          )}

          {emp.roles.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">ยังไม่มีสิทธิ์การใช้งาน</p>
          ) : (
            <div className="space-y-2">
              {emp.roles.map((r) => (
                <div
                  key={r.id}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${r.isActive ? 'hover:bg-muted/30' : 'opacity-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${ROLE_CHIP[r.role] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {r.role}
                    </span>
                    {!r.isActive && <span className="text-xs text-muted-foreground">พ้นสภาพ</span>}
                  </div>
                  {canEdit && r.isActive && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      loading={removeRole.isPending} onClick={() => setRemoveTarget(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: โควตาวันลา ───────────────────────────────────────────────── */}
      {activeTab === 'leave' && (
        <div className="rounded-xl border border-border bg-card p-6">
          <LeaveBalanceTab empId={id} companyId={emp.companyId ?? ''} canEdit={canEdit} />
        </div>
      )}

      {/* ── Tab: รหัสผ่าน ─────────────────────────────────────────────────── */}
      {activeTab === 'password' && canEdit && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">รีเซ็ตรหัสผ่าน</p>
              <p className="text-sm text-muted-foreground mt-0.5">กำหนดรหัสผ่านใหม่ให้กับพนักงาน</p>
            </div>
            {!pwOpen && (
              <Button size="sm" variant="outline" onClick={() => setPwOpen(true)}>
                <KeyRound className="h-4 w-4" />รีเซ็ต
              </Button>
            )}
          </div>
          {pwOpen && (
            <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
              <div className="space-y-1.5">
                <Label>รหัสผ่านใหม่</Label>
                <Input type="password" placeholder="อย่างน้อย 6 ตัวอักษร"
                  value={newPw} onChange={(e) => setNewPw(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSetPassword()} />
                {pwError && <p className="text-xs text-destructive">{pwError}</p>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" loading={setPasswordMut.isPending} onClick={handleSetPassword}>ยืนยัน</Button>
                <Button size="sm" variant="ghost" onClick={() => { setPwOpen(false); setNewPw(''); setPwError('') }}>ยกเลิก</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <ConfirmModal open={!!removeTarget} onClose={() => setRemoveTarget(null)} onConfirm={confirmRemoveRole}
        title="ลบ Role" description="ยืนยันลบ role นี้ออกจากพนักงาน?" confirmLabel="ลบ"
        variant="destructive" loading={removeRole.isPending} />
      <ConfirmModal open={toggleConfirm} onClose={() => setToggleConfirm(false)} onConfirm={confirmToggleStatus}
        title={`${emp.isActive ? 'พ้นสภาพ' : 'เปิด'}การทำงาน`}
        description={`ยืนยัน${emp.isActive ? 'พ้นสภาพ' : 'เปิด'}การทำงานพนักงาน "${emp.fullName}"?`}
        confirmLabel={emp.isActive ? 'พ้นสภาพ' : 'เปิดการปฎิิบัติงาน'}
        variant={emp.isActive ? 'destructive' : 'default'} loading={toggleStatus.isPending} />
    </div>
  )
}
