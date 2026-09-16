'use client'

import { use, useState, useEffect, useRef, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft, Check, Copy, Dices, Eye, EyeOff, KeyRound, Pencil, Plus, RefreshCw, Trash2, X,
  User, Building2, Layers, CalendarDays, Clock, Mail, Phone,
  IdCard, ShieldCheck, CalendarClock, CircleCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
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
import { useDepartments } from '@/hooks/use-departments'
import { useRoleLabels } from '@/hooks/use-role-labels'
import { useLeaveTypes } from '@/hooks/use-leave-types'
import { useLeaveBalances, useAdjustBalance, useCreateLeaveBalance, useSeedBalancesForEmployee } from '@/hooks/use-leave-balances'
import { usePermissionGate } from '@/hooks/use-permission-gate'
import { useShiftOverrides, useCurrentShift, useSetShiftOverride, useRemoveShiftOverride } from '@/hooks/use-shift-overrides'
import { useShifts } from '@/hooks/use-shifts'
import { useAllRolePermissions } from '@/hooks/use-permissions'
import { companyOptionLabel, useCompanyOptions } from '@/hooks/use-company-options'
import { getInitials, roleChipClass } from '@/lib/employee-roles'
import type { LeaveBalanceAdminDto } from '@/types/admin'
import * as fmt from '@hrms/i18n/format'
import { useApiError } from '@/hooks/use-api-error'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1]

// ข้อความ validation มาจาก useTranslations จึงสร้าง schema ใน component
type TranslateFn = (key: string) => string

function buildEditSchema(t: TranslateFn) {
  return z.object({
  firstName:    z.string().min(1, t('errorFirstNameRequired')),
  lastName:     z.string().min(1, t('errorLastNameRequired')),
  nickname:     z.string().max(50, { message: t('errorNicknameMax') }).optional(),
  email:        z.string().email({ message: t('errorInvalidEmail') }).optional().or(z.literal('')),
  phone:        z.string().optional(),
  hireDate:     z.string().optional(),
  nationalId:   z.string().optional(),
  companyId:    z.string().optional(),
  departmentId: z.string().optional(),
  roleLabelId:  z.string().optional(),
  })
}
type EditValues = z.infer<ReturnType<typeof buildEditSchema>>

type TabKey = 'info' | 'roles' | 'leave' | 'shift' | 'password'

// ต้องตรงกับ SetPasswordCommandValidator ฝั่ง API (อย่างน้อย 8 ตัว + พิมพ์ใหญ่/เล็ก + ตัวเลข + อักขระพิเศษ)
// key ตรงกับคีย์ข้อความใน messages (admin.employees.password.rule*)
const PASSWORD_RULES: { key: string; test: (pw: string) => boolean }[] = [
  { key: 'ruleLength',  test: (pw) => pw.length >= 8 },
  { key: 'ruleUpper',   test: (pw) => /[A-Z]/.test(pw) },
  { key: 'ruleLower',   test: (pw) => /[a-z]/.test(pw) },
  { key: 'ruleDigit',   test: (pw) => /\d/.test(pw) },
  { key: 'ruleSpecial', test: (pw) => /[\W_]/.test(pw) },
]

function isPasswordValid(pw: string) {
  return PASSWORD_RULES.every(rule => rule.test(pw))
}

// ชุดตัวอักษรสำหรับสุ่มรหัส — ตัดตัวกำกวม (l I 1 O 0 o) ออกให้อ่าน/พิมพ์ต่อง่าย
const PW_POOLS = [
  'ABCDEFGHJKMNPQRSTUVWXYZ',
  'abcdefghjkmnpqrstuvwxyz',
  '23456789',
  '!@#$%^&*-_+=?',
]

/** สุ่มรหัสผ่านด้วย crypto.getRandomValues การันตีมีครบทุกหมวดตาม PASSWORD_RULES */
function generatePassword(length = 12) {
  const all = PW_POOLS.join('')
  const rand = new Uint32Array(length * 2)
  crypto.getRandomValues(rand)
  // ตัวแรกของแต่ละหมวดก่อน ที่เหลือสุ่มจากทุกหมวดรวมกัน
  const chars = PW_POOLS.map((pool, i) => pool[rand[i] % pool.length])
  for (let i = PW_POOLS.length; i < length; i++) chars.push(all[rand[i] % all.length])
  // Fisher–Yates ไม่ให้ 4 ตัวแรกเรียงหมวดตายตัว
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rand[length + i] % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

function PasswordChecklist({ password }: { password: string }) {
  const t = useTranslations('admin.employees.password')
  return (
    <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
      {PASSWORD_RULES.map(rule => {
        const passed = rule.test(password)
        return (
          <li key={rule.key} className={`flex items-center gap-1.5 text-xs ${passed ? 'text-emerald-600' : 'text-muted-foreground'}`}>
            <CircleCheck className={`h-3.5 w-3.5 shrink-0 ${passed ? '' : 'opacity-40'}`} />
            {t(rule.key)}
          </li>
        )
      })}
    </ul>
  )
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
  const t = useTranslations('admin.employees.leave')
  const apiError = useApiError()
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
    if (isNaN(val) || val < 0) { setEditError(t('invalidNumber')); return }
    try {
      await adjustBalance.mutateAsync({ id, totalDays: val })
      toast.success(t('saveSuccess')); setEditId(null)
    } catch (err: unknown) {
      setEditError(apiError(err, t('error')))
    }
  }

  function startCreate(ltId: string) { setCreateLtId(ltId); setCreateValue('0'); setCreateError('') }
  function cancelCreate() { setCreateLtId(null); setCreateValue(''); setCreateError('') }

  async function confirmCreate(ltId: string) {
    const val = parseFloat(createValue)
    if (isNaN(val) || val < 0) { setCreateError(t('invalidNumber')); return }
    try {
      await createBalance.mutateAsync({ employeeId: empId, leaveTypeId: ltId, year, totalDays: val })
      toast.success(t('createSuccess')); setCreateLtId(null)
    } catch (err: unknown) {
      setCreateError(apiError(err, t('error')))
    }
  }

  async function handleSeed() {
    try {
      const res = await seedForEmployee.mutateAsync({ employeeId: empId, year })
      toast[res.created === 0 ? 'info' : 'success'](
        res.created === 0 ? t('seedNothing') : t('seedDone', { count: res.created }),
      )
    } catch { toast.error(t('error')) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {YEARS.map((y) => (
            <button key={y}
              onClick={() => { setYear(y); setEditId(null); setCreateLtId(null) }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                year === y ? 'bg-primary text-primary-foreground' : 'bg-whited text-muted-foreground hover:bg-whited/80'
              }`}>{y}</button>
          ))}
        </div>
        {canEdit && missingCount > 0 && (
          <Button size="sm" variant="outline" loading={seedForEmployee.isPending} onClick={handleSeed}>
            <RefreshCw className="h-3.5 w-3.5" />{t('seedMissing', { count: missingCount })}
          </Button>
        )}
      </div>

      <div className="overflow-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-whited/50">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{t('colType')}</th>
              <th className="px-4 py-2.5 text-center font-medium text-muted-foreground w-20">{t('colDefault')}</th>
              <th className="px-4 py-2.5 text-center font-medium text-muted-foreground w-32">{t('colQuota')}</th>
              <th className="px-4 py-2.5 text-center font-medium text-muted-foreground w-16">{t('colUsed')}</th>
              <th className="px-4 py-2.5 text-center font-medium text-muted-foreground w-16">{t('colPending')}</th>
              <th className="px-4 py-2.5 text-center font-medium text-muted-foreground w-20">{t('colRemaining')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
              <tr key={i} className="border-b border-border">
                {Array.from({ length: 6 }).map((__, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 w-16 animate-pulse rounded bg-whited mx-auto" />
                  </td>
                ))}
              </tr>
            ))}
            {!isLoading && activeTypes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  {t('emptyTypes')}
                </td>
              </tr>
            )}
            {!isLoading && activeTypes.map((lt) => {
              const balance    = balanceMap.get(lt.id)
              const isEditing  = editId !== null && balance?.id === editId
              const isCreating = createLtId === lt.id
              return (
                <tr key={lt.id} className="border-b border-border last:border-0 hover:bg-whited/20 transition-colors">
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
                          <Plus className="h-3 w-3" />{t('addQuota')}
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

// ── Shift override tab ───────────────────────────────────────────────────────
// source ที่ API คืน → คีย์ข้อความใน messages (admin.employees.shift.source*)
const SOURCE_LABEL_KEY: Record<string, string> = {
  override:   'sourceOverride',
  department: 'sourceDepartment',
  company:    'sourceCompany',
  none:       'sourceNone',
}

function ShiftOverrideTab({ empId, companyId, canEdit }: { empId: string; companyId: string; canEdit: boolean }) {
  const t = useTranslations('admin.employees.shift')
  const tCommon = useTranslations('common')
  const [formOpen, setFormOpen]   = useState(false)
  const [shiftId, setShiftId]     = useState('')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')
  const [reason, setReason]       = useState('')
  const [formError, setFormError] = useState('')

  const { data: current, isLoading: loadingCurrent } = useCurrentShift(empId)
  const { data: overrides = [], isLoading: loadingList } = useShiftOverrides(empId)
  const { data: shifts = [] } = useShifts(companyId)
  const setOverride    = useSetShiftOverride(empId)
  const removeOverride = useRemoveShiftOverride(empId)

  function resetForm() {
    setShiftId(''); setDateFrom(''); setDateTo(''); setReason(''); setFormError('')
  }

  async function handleSubmit() {
    if (!shiftId)   { setFormError(t('selectShiftError')); return }
    if (!dateFrom)  { setFormError(t('dateFromError')); return }
    try {
      await setOverride.mutateAsync({ shiftId, effectiveFrom: dateFrom, effectiveTo: dateTo || null, reason: reason || null })
      toast.success(t('setSuccess'))
      setFormOpen(false); resetForm()
    } catch { toast.error(tCommon('state.error')) }
  }

  async function handleRemove(overrideId: string) {
    try {
      await removeOverride.mutateAsync(overrideId)
      toast.success(t('cancelSuccess'))
    } catch { toast.error(tCommon('state.error')) }
  }

  const activeShifts = shifts.filter((s) => s.isActive)

  return (
    <div className="space-y-5">
      {/* Current effective shift */}
      <div className="rounded-lg border border-border bg-whited/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('currentTitle')}</p>
        {loadingCurrent ? (
          <div className="h-6 w-40 animate-pulse rounded bg-whited" />
        ) : current?.shiftId ? (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold">{current.shiftName}</span>
              <span className="text-sm text-muted-foreground">
                {current.startTime?.slice(0, 5)} – {current.endTime?.slice(0, 5)}
              </span>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              current.source === 'override'
                ? 'bg-orange-100 text-orange-700'
                : current.source === 'department'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-slate-100 text-slate-600'
            }`}>
              {t(SOURCE_LABEL_KEY[current.source] ?? 'sourceNone')}
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('none')}</p>
        )}
      </div>

      {/* Add override form */}
      {canEdit && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => { setFormOpen((v) => !v); resetForm() }}>
            <Plus className="h-4 w-4" />{t('setOverride')}
          </Button>
        </div>
      )}
      {formOpen && (
        <div className="rounded-lg border border-border bg-whited/40 p-4 space-y-3">
          <p className="text-sm font-medium">{t('formTitle')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t('shiftLabel')} *</Label>
              <Select value={shiftId} onChange={(e) => setShiftId(e.target.value)}>
                <option value="">{t('selectShift')}</option>
                {activeShifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)})
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('dateFrom')} *</Label>
              <DateInput value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('dateTo')} <span className="text-muted-foreground text-xs">{t('dateToHint')}</span></Label>
              <DateInput value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t('reason')}</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('reasonPlaceholder')} />
            </div>
          </div>
          {formError && <p className="text-xs text-destructive">{formError}</p>}
          <div className="flex gap-2">
            <Button size="sm" loading={setOverride.isPending} onClick={handleSubmit}>{tCommon('action.save')}</Button>
            <Button size="sm" variant="ghost" onClick={() => { setFormOpen(false); resetForm() }}>{tCommon('action.cancel')}</Button>
          </div>
        </div>
      )}

      {/* Override history */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('historyTitle')}</p>
        {loadingList ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-whited" />
            ))}
          </div>
        ) : overrides.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{t('historyEmpty')}</p>
        ) : (
          <div className="space-y-2">
            {overrides.map((o) => (
              <div
                key={o.id}
                className={`flex items-start justify-between rounded-lg border px-4 py-3 gap-3 ${o.isActive ? 'border-border' : 'opacity-50 border-dashed'}`}
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm">{o.shiftName}</span>
                    <span className="text-xs text-muted-foreground">{o.startTime.slice(0, 5)}–{o.endTime.slice(0, 5)}</span>
                    {!o.isActive && (
                      <span className="rounded-full bg-slate-100 text-slate-500 px-2 py-0.5 text-xs">{t('cancelled')}</span>
                    )}
                    {o.isActive && !o.effectiveTo && (
                      <span className="rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-xs">{t('permanent')}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {o.effectiveFrom} {o.effectiveTo ? `→ ${o.effectiveTo}` : '→ '}
                    {o.reason && <span className="ml-2 italic">{o.reason}</span>}
                  </p>
                </div>
                {canEdit && o.isActive && (
                  <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    loading={removeOverride.isPending} onClick={() => handleRemove(o.id)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations('admin.employees.detail')
  const tForm = useTranslations('admin.employees.form')
  const tRoles = useTranslations('admin.employees.roles')
  const tPw = useTranslations('admin.employees.password')
  const tRoleType = useTranslations('status.roleType')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const { id } = use(params)
  // schema สร้างใน component เพราะข้อความ validation มาจาก useTranslations
  const editSchema = useMemo(() => buildEditSchema(tForm), [tForm])
  const router  = useRouter()

  const { data: emp, isLoading } = useEmployee(id)
  const updateEmployee = useUpdateEmployee(id)
  const toggleStatus   = useToggleEmployeeStatus(id)
  const addRole        = useAddEmployeeRole(id)
  const removeRole     = useRemoveEmployeeRole(id)
  const setPasswordMut = useSetPassword(id)

  const [activeTab,     setActiveTab]     = useState<TabKey>('info')
  const [addRoleOpen,   setAddRoleOpen]   = useState(false)
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [pwOpen,        setPwOpen]        = useState(false)
  const [newPw,         setNewPw]         = useState('')
  const [pwError,       setPwError]       = useState('')
  const [showPw,        setShowPw]        = useState(false)
  const [removeTarget,  setRemoveTarget]  = useState<string | null>(null)
  const [toggleConfirm, setToggleConfirm] = useState(false)

  const { has } = usePermissionGate()
  // แยกสิทธิ์ราย tab ตาม permission ของ endpoint จริง (เดิมรวมเป็น isAdmin || isHr ก้อนเดียว)
  const canEdit          = has('employee:edit', ['Admin', 'Hr'])
  const canResetPassword = has('employee:reset-password', ['Admin'])   // SetPasswordHandler บังคับ code นี้
  const canEditBalance   = has('leave:manage-balance', ['Admin', 'Hr'])
  const canEditShift     = has('company:manage-shifts', ['Admin', 'Hr'])
  const canManageRoles   = has('employee:assign-role', ['Admin'])
  const { data: roleOptions = [] } = useAllRolePermissions(canManageRoles)

  useEffect(() => {
    if (!selectedRoleId && roleOptions.length > 0)
      setSelectedRoleId(roleOptions[0].roleId)
  }, [roleOptions, selectedRoleId])

  const { options: activeCompanies } = useCompanyOptions()

  const { register, handleSubmit, setError, reset, watch, setValue,
    formState: { errors, isSubmitting, isDirty } } =
    useForm<EditValues>({
      resolver: zodResolver(editSchema),
      values: emp ? {
        firstName:    emp.fullName.split(' ')[0] ?? '',
        lastName:     emp.fullName.split(' ').slice(1).join(' ') ?? '',
        nickname:     emp.nickname     ?? '',
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
        nickname:     values.nickname     || undefined,
        email:        values.email        || undefined,
        phone:        values.phone        || undefined,
        hireDate:     values.hireDate     || undefined,
        nationalId:   values.nationalId   || undefined,
        companyId:    values.companyId    || undefined,
        departmentId: values.departmentId || undefined,
        roleLabelId:  values.roleLabelId  || undefined,
      })
      toast.success(t('saveSuccess')); reset(values)
    } catch (err: unknown) {
      const e = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (e === 'DUPLICATE_EMAIL') setError('email', { message: tForm('errorDuplicateEmail') })
      else { setError('root', { message: apiError(err, tCommon('state.error')) }); toast.error(apiError(err, tCommon('state.error'))) }
    }
  }

  async function handleAddRole() {
    if (!selectedRoleId) return
    try {
      await addRole.mutateAsync({ roleId: selectedRoleId })
      const roleName = roleOptions.find((role) => role.roleId === selectedRoleId)?.role ?? ''
      setAddRoleOpen(false); toast.success(tRoles('addSuccess', { role: roleName }))
    } catch (err: unknown) {
      const e = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(e === 'DUPLICATE_ROLE' ? tRoles('duplicate') : tCommon('state.error'))
    }
  }

  async function confirmRemoveRole() {
    if (!removeTarget) return
    try {
      await removeRole.mutateAsync(removeTarget)
      toast.success(tRoles('removeSuccess')); setRemoveTarget(null)
    } catch (err: unknown) {
      const e = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(e === 'LAST_ADMIN' ? tRoles('lastAdmin') : tCommon('state.error'))
      setRemoveTarget(null)
    }
  }

  async function handleSetPassword() {
    if (!isPasswordValid(newPw)) { setPwError(tPw('invalid')); return }
    try {
      await setPasswordMut.mutateAsync(newPw)
      toast.success(tPw('resetSuccess'))
      setPwOpen(false); setNewPw(''); setPwError(''); setShowPw(false)
    } catch { toast.error(tCommon('state.error')) }
  }

  async function confirmToggleStatus() {
    if (!emp) return
    try {
      await toggleStatus.mutateAsync(!emp.isActive)
      toast.success(emp.isActive ? t('deactivateSuccess') : t('activateSuccess'))
      setToggleConfirm(false)
    } catch (err: unknown) {
      const e = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(e === 'CANNOT_DEACTIVATE_SELF' ? t('cannotDeactivateSelf') : tCommon('state.error'))
      setToggleConfirm(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-24 animate-pulse rounded-md bg-whited" />
        <div className="h-40 animate-pulse rounded-xl bg-whited" />
        <div className="h-10 animate-pulse rounded-lg bg-whited" />
        <div className="h-64 animate-pulse rounded-xl bg-whited" />
      </div>
    )
  }

  if (!emp) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/employees')}>
          <ArrowLeft className="h-4 w-4" />{t('back')}
        </Button>
        <p className="text-muted-foreground">{t('notFound')}</p>
      </div>
    )
  }

  const activeRoles = emp.roles.filter((r) => r.isActive)

  const TABS: { key: TabKey; label: string; icon: LucideIcon; count?: number }[] = [
    { key: 'info',  label: t('tabInfo'),   icon: User },
    { key: 'roles', label: t('tabRoles'), icon: ShieldCheck, count: activeRoles.length },
    { key: 'leave', label: t('tabLeave'),     icon: CalendarDays },
    { key: 'shift', label: t('tabShift'),  icon: CalendarClock },
    ...(canResetPassword ? [{ key: 'password' as TabKey, label: t('tabPassword'), icon: KeyRound }] : []),
  ]

  return (
    <div>
      {/* Back */}
      <div className="mb-5">
        <Button variant="ghost" size="sm" onClick={() => router.push('/employees')} className="-ml-2">
          <ArrowLeft className="h-4 w-4" />{t('backToList')}
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
                <h1 className="text-2xl font-bold leading-tight">
                  {emp.fullName}
                  {emp.nickname && (
                    <span className="ml-2 text-lg font-normal text-muted-foreground">({emp.nickname})</span>
                  )}
                </h1>
                <Badge variant={emp.isActive ? 'success' : 'secondary'} className="shrink-0">
                  {emp.isActive ? t('statusActive') : t('statusInactive')}
                </Badge>
              </div>

              <p className="text-sm font-mono text-muted-foreground">{emp.employeeCode}</p>

              {/* สังกัด */}
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
                    {t('hireDate', { date: fmt.formatDate(new Date(emp.hireDate), { day: 'numeric', month: 'short', year: 'numeric' }) })}
                  </span>
                )}
              </div>

              {/* ช่องทางติดต่อ */}
              {(emp.email || emp.phone || emp.nationalIdMasked) && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                  {emp.email && (
                    <a href={`mailto:${emp.email}`} className="flex items-center gap-1.5 hover:text-primary hover:underline">
                      <Mail className="h-3.5 w-3.5 shrink-0" />{emp.email}
                    </a>
                  )}
                  {emp.phone && (
                    <a href={`tel:${emp.phone}`} className="flex items-center gap-1.5 hover:text-primary hover:underline">
                      <Phone className="h-3.5 w-3.5 shrink-0" />{emp.phone}
                    </a>
                  )}
                  {emp.nationalIdMasked && (
                    <span className="flex items-center gap-1.5 font-mono text-xs">
                      <IdCard className="h-3.5 w-3.5 shrink-0" />{emp.nationalIdMasked}
                    </span>
                  )}
                </div>
              )}

              {activeRoles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {activeRoles.map((r) => (
                    <span
                      key={r.id}
                      title={tRoleType(r.role)}
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${roleChipClass(r.role)}`}
                    >
                      {r.role}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0 self-start sm:mt-0 mt-2">
            <Link href={`/employees/${id}/attendance`}>
              <Button size="sm" variant="outline" className="w-full">
                <CalendarDays className="h-4 w-4" />{t('attendanceHistory')}
              </Button>
            </Link>
            {canEdit && (
              <Button
                size="sm"
                variant={emp.isActive ? 'destructive' : 'outline'}
                onClick={() => setToggleConfirm(true)}
              >
                {emp.isActive ? t('deactivate') : t('activate')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab nav ───────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 -mx-4 mb-6 border-b border-border bg-background/95 px-4 backdrop-blur sm:mx-0 sm:px-0">
        <nav className="flex overflow-x-auto" role="tablist" aria-label={t('tabsAria')}>
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    isActive ? 'bg-primary/10 text-primary' : 'bg-whited text-muted-foreground'
                  }`}>
                    {tab.count}
                  </span>
                )}
                {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" />}
              </button>
            )
          })}
        </nav>
      </div>

      {/* ── Tab: ข้อมูลทั่วไป ─────────────────────────────────────────────── */}
      {activeTab === 'info' && (
        <div className="rounded-xl border border-border bg-background p-6">
          <form onSubmit={handleSubmit(onSave)} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="e-fn">{tForm('firstName')} *</Label>
                <Input id="e-fn" {...register('firstName')} disabled={!canEdit} />
                <FieldError message={errors.firstName?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-ln">{tForm('lastName')} *</Label>
                <Input id="e-ln" {...register('lastName')} disabled={!canEdit} />
                <FieldError message={errors.lastName?.message} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="e-nick">{tForm('nickname')}</Label>
                <Input id="e-nick" maxLength={50} {...register('nickname')} disabled={!canEdit} />
                <FieldError message={errors.nickname?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-email">{tForm('email')}</Label>
                <Input id="e-email" type="email" {...register('email')} disabled={!canEdit} />
                <FieldError message={errors.email?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-phone">{tForm('phone')}</Label>
                <Input id="e-phone" {...register('phone')} disabled={!canEdit} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-hire">{tForm('hireDate')}</Label>
                <DateInput id="e-hire" {...register('hireDate')} disabled={!canEdit} />
              </div>
              {(emp.nationalId || emp.nationalIdMasked) && (
                <div className="space-y-1.5">
                  <Label htmlFor="e-nid">{tForm('nationalId')}</Label>
                  {canEdit ? (
                    <Input id="e-nid" {...register('nationalId')} placeholder={emp.nationalIdMasked ?? ''} />
                  ) : (
                    <Input id="e-nid" value={emp.nationalIdMasked ?? ''} disabled />
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-border pt-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tForm('sectionAffiliation')}</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="e-company">{tForm('company')}</Label>
                  <Select id="e-company" {...register('companyId')} disabled={!canEdit}>
                    <option value="">{tForm('selectCompany')}</option>
                    {activeCompanies.map((c) => <option key={c.id} value={c.id}>{companyOptionLabel(c)}</option>)}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e-dept">{tForm('department')}</Label>
                  <Select id="e-dept" {...register('departmentId')} disabled={!canEdit}>
                    <option value="">{tForm('noDepartment')}</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e-rlabel">{tForm('position')}</Label>
                  <Select id="e-rlabel" {...register('roleLabelId')} disabled={!canEdit}>
                    <option value="">
                      {effectiveCompanyId && roleLabels.length === 0 ? tForm('noPositionInCompany') : tForm('noPosition')}
                    </option>
                    {roleLabels.map((rl) => <option key={rl.id} value={rl.id}>{rl.name}</option>)}
                  </Select>
                </div>
              </div>
            </div>

            {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
            {canEdit && (
              <div className={`flex items-center justify-end gap-2 border-t border-border pt-4 ${
                isDirty ? 'sticky bottom-0 -mx-6 -mb-6 bg-background px-6 pb-6' : ''
              }`}>
                {isDirty && (
                  <span className="mr-auto text-xs text-amber-600">{t('unsavedChanges')}</span>
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => reset()} disabled={!isDirty}>{tCommon('action.cancel')}</Button>
                <Button type="submit" size="sm" loading={isSubmitting} disabled={!isDirty}>{t('saveChanges')}</Button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* ── Tab: สิทธิ์การใช้งาน ──────────────────────────────────────────── */}
      {activeTab === 'roles' && (
        <div className="rounded-xl border border-border bg-background p-6 space-y-4">
          {canManageRoles && (
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setAddRoleOpen((v) => !v)}>
                <Plus className="h-4 w-4" />{tRoles('add')}
              </Button>
            </div>
          )}
          {canManageRoles && addRoleOpen && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-whited/50 px-4 py-3">
              <Select value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)} className="w-48">
                {roleOptions.map((role) => (
                  <option key={role.roleId} value={role.roleId}>
                    {role.roleName} ({role.role})
                  </option>
                ))}
              </Select>
              <Button size="sm" disabled={!selectedRoleId} loading={addRole.isPending} onClick={handleAddRole}>{tRoles('addConfirm')}</Button>
              <Button size="sm" variant="ghost" onClick={() => setAddRoleOpen(false)}>{tCommon('action.cancel')}</Button>
            </div>
          )}

          {activeRoles.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{tRoles('empty')}</p>
          ) : (
            <div className="space-y-2">
              {activeRoles.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-whited/30"
                >
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${roleChipClass(r.role)}`}>
                      {r.role}
                    </span>
                    <span className="text-sm text-muted-foreground">{tRoleType(r.role)}</span>
                  </div>
                  {canManageRoles && (
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
        <div className="rounded-xl border border-border bg-background p-6">
          <LeaveBalanceTab empId={id} companyId={emp.companyId ?? ''} canEdit={canEditBalance} />
        </div>
      )}

      {/* ── Tab: เวลาปฎิบัติงาน ──────────────────────────────────────────────── */}
      {activeTab === 'shift' && (
        <div className="rounded-xl border border-border bg-background p-6">
          <ShiftOverrideTab empId={id} companyId={emp.companyId ?? ''} canEdit={canEditShift} />
        </div>
      )}

      {/* ── Tab: รหัสผ่าน ─────────────────────────────────────────────────── */}
      {activeTab === 'password' && canResetPassword && (
        <div className="rounded-xl border border-border bg-background p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{tPw('title')}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{tPw('hint')}</p>
            </div>
            {!pwOpen && (
              <Button size="sm" variant="outline" onClick={() => setPwOpen(true)}>
                <KeyRound className="h-4 w-4" />{tPw('reset')}
              </Button>
            )}
          </div>
          {pwOpen && (
            <div className="rounded-lg border border-border bg-whited/40 p-4 space-y-3">
              <div className="space-y-1.5">
                <Label>{tPw('newPassword')}</Label>
                <div className="relative">
                  <Input type={showPw ? 'text' : 'password'} placeholder={tPw('placeholder')}
                    className="pr-10"
                    value={newPw} onChange={(e) => setNewPw(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSetPassword()} />
                  <button type="button" tabIndex={-1}
                    onClick={() => setShowPw(v => !v)}
                    aria-label={showPw ? tForm('hidePassword') : tForm('showPassword')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" type="button"
                    onClick={() => { setNewPw(generatePassword()); setShowPw(true); setPwError('') }}>
                    <Dices className="h-4 w-4" /> {tPw('generate')}
                  </Button>
                  {newPw && (
                    <Button size="sm" variant="outline" type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(newPw)
                          toast.success(tPw('copied'))
                        } catch {
                          toast.error(tPw('copyFailed'))
                        }
                      }}>
                      <Copy className="h-4 w-4" /> {tPw('copy')}
                    </Button>
                  )}
                </div>
                <PasswordChecklist password={newPw} />
                {pwError && <p className="text-xs text-destructive">{pwError}</p>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" loading={setPasswordMut.isPending} disabled={!isPasswordValid(newPw)} onClick={handleSetPassword}>{tCommon('action.confirm')}</Button>
                <Button size="sm" variant="ghost" onClick={() => { setPwOpen(false); setNewPw(''); setPwError(''); setShowPw(false) }}>{tCommon('action.cancel')}</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <ConfirmModal open={!!removeTarget} onClose={() => setRemoveTarget(null)} onConfirm={confirmRemoveRole}
        title={t('removeRoleTitle')} description={t('removeRoleDesc')} confirmLabel={tCommon('action.delete')}
        variant="destructive" loading={removeRole.isPending} />
      <ConfirmModal open={toggleConfirm} onClose={() => setToggleConfirm(false)} onConfirm={confirmToggleStatus}
        title={emp.isActive ? t('deactivateTitle') : t('activateTitle')}
        description={emp.isActive
          ? t('deactivateDesc', { name: emp.fullName })
          : t('activateDesc', { name: emp.fullName })}
        confirmLabel={emp.isActive ? t('deactivate') : t('activate')}
        variant={emp.isActive ? 'destructive' : 'default'} loading={toggleStatus.isPending} />
    </div>
  )
}
