'use client'

import { useState, useTransition, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Search, Plus, ChevronLeft, ChevronRight, Trash2, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Select } from '@/components/ui/select'
import { DateInput } from '@/components/ui/date-input'
import {
  useEmployees, useEmployee, useCreateEmployee, useUpdateEmployee,
  useToggleEmployeeStatus, useAddEmployeeRole, useRemoveEmployeeRole, useSetPassword,
} from '@/hooks/use-employees'
import { useCompanies } from '@/hooks/use-companies'
import { useDepartments } from '@/hooks/use-departments'
import { useRoleLabels } from '@/hooks/use-role-labels'
import { useAuthStore } from '@/stores/auth.store'
import type { RoleType } from '@/types/admin'

const PAGE_SIZE = 20
const ROLE_OPTIONS: RoleType[] = ['Employee', 'Supervisor', 'Hr', 'Admin', 'Executive']

// ── Schemas ───────────────────────────────────────────────────────────────────

const createSchema = z.object({
  employeeCode:  z.string().min(1, 'กรุณากรอกรหัสพนักงาน'),
  firstName:     z.string().min(1, 'กรุณากรอกชื่อ'),
  lastName:      z.string().min(1, 'กรุณากรอกนามสกุล'),
  email:         z.string().email({ message: 'อีเมลไม่ถูกต้อง' }).optional().or(z.literal('')),
  phone:         z.string().optional(),
  nationalId:    z.string().length(13, { message: 'ต้องมี 13 หลัก' }).regex(/^\d+$/, { message: 'ต้องเป็นตัวเลข' }).optional().or(z.literal('')),
  password:      z.string().min(6, 'อย่างน้อย 6 ตัวอักษร'),
  hireDate:      z.string().optional(),
  companyId:     z.string().optional(),
  departmentId:  z.string().optional(),
  roleLabelId: z.string().optional(),
})
type CreateValues = z.infer<typeof createSchema>

const editSchema = z.object({
  firstName:    z.string().min(1, 'กรุณากรอกชื่อ'),
  lastName:     z.string().min(1, 'กรุณากรอกนามสกุล'),
  email:        z.string().email({ message: 'อีเมลไม่ถูกต้อง' }).optional().or(z.literal('')),
  phone:        z.string().optional(),
  hireDate:     z.string().optional(),
  companyId:    z.string().optional(),
  departmentId: z.string().optional(),
  roleLabelId:  z.string().optional(),
})
type EditValues = z.infer<typeof editSchema>

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive mt-0.5">{message}</p>
}

// ── Create Modal ──────────────────────────────────────────────────────────────

function CreateModal({ open, onClose, defaultCompanyId }: { open: boolean; onClose: () => void; defaultCompanyId?: string }) {
  const create = useCreateEmployee()
  const employee = useAuthStore((s) => s.employee)
  const isAdmin = employee?.roles.some((r) => r.role === 'Admin') ?? false

  const { data: tree = [] } = useCompanies()
  const activeCompanies = (() => {
    const result: { id: string; name: string }[] = []
    function walk(nodes: typeof tree) {
      for (const n of nodes) {
        if (n.isActive) result.push({ id: n.id, name: n.name })
        walk(n.children)
      }
    }
    walk(tree)
    return result
  })()

  const { register, handleSubmit, setError, reset, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<CreateValues>({
      resolver: zodResolver(createSchema),
      defaultValues: { companyId: isAdmin ? (defaultCompanyId ?? '') : (employee?.companyId ?? ''), roleLabelId: '' },
    })

  const selectedCompanyId = watch('companyId')
  const effectiveCompanyId = selectedCompanyId || (isAdmin ? undefined : employee?.companyId)
  const { data: departments = [] } = useDepartments(effectiveCompanyId || undefined)
  const { data: roleLabels = [] } = useRoleLabels(effectiveCompanyId || undefined)

  // Reset company-specific fields when Admin changes company
  const isFirstCreateRender = useRef(true)
  useEffect(() => {
    if (isFirstCreateRender.current) { isFirstCreateRender.current = false; return }
    setValue('departmentId', '')
    setValue('roleLabelId', '')
  }, [selectedCompanyId, setValue])

  async function onSubmit(values: CreateValues) {
    try {
      await create.mutateAsync({
        employeeCode:  values.employeeCode,
        firstName:     values.firstName,
        lastName:      values.lastName,
        email:         values.email        || undefined,
        phone:         values.phone        || undefined,
        nationalId:    values.nationalId   || undefined,
        password:      values.password,
        hireDate:      values.hireDate     || undefined,
        companyId:     values.companyId    || undefined,
        departmentId:  values.departmentId || undefined,
        roleLabelId: values.roleLabelId || undefined,
      })
      toast.success(`เพิ่มพนักงาน "${values.firstName} ${values.lastName}" สำเร็จ`)
      reset()
      onClose()
    } catch (err: unknown) {
      const e = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (e === 'DUPLICATE_EMPLOYEE_CODE') setError('employeeCode', { message: 'รหัสพนักงานนี้มีอยู่แล้ว' })
      else if (e === 'DUPLICATE_EMAIL')    setError('email',        { message: 'อีเมลนี้มีอยู่แล้ว' })
      else if (e === 'DUPLICATE_NATIONAL_ID') setError('nationalId', { message: 'เลขบัตรประชาชนนี้มีอยู่แล้ว' })
      else { setError('root', { message: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }); toast.error('เกิดข้อผิดพลาด') }
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="เพิ่มพนักงานใหม่" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="c-code">รหัสพนักงาน *</Label>
            <Input id="c-code" {...register('employeeCode')} />
            <FieldError message={errors.employeeCode?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-fn">ชื่อ *</Label>
            <Input id="c-fn" {...register('firstName')} />
            <FieldError message={errors.firstName?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-ln">นามสกุล *</Label>
            <Input id="c-ln" {...register('lastName')} />
            <FieldError message={errors.lastName?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-email">อีเมล</Label>
            <Input id="c-email" type="email" {...register('email')} />
            <FieldError message={errors.email?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-phone">เบอร์โทรศัพท์</Label>
            <Input id="c-phone" type="tel" {...register('phone')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-nid">เลขบัตรประชาชน</Label>
            <Input id="c-nid" maxLength={13} {...register('nationalId')} />
            <FieldError message={errors.nationalId?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-hire">วันที่เริ่มงาน</Label>
            <DateInput id="c-hire" {...register('hireDate')} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="c-company">บริษัท</Label>
            <Select id="c-company" {...register('companyId')} disabled={!isAdmin}>
              {!isAdmin && <option value={employee?.companyId ?? ''}>{activeCompanies.find(c => c.id === employee?.companyId)?.name ?? 'บริษัทของตัวเอง'}</option>}
              {isAdmin && <option value="">— เลือกบริษัท —</option>}
              {isAdmin && activeCompanies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="c-dept">แผนก</Label>
            <Select id="c-dept" {...register('departmentId')} disabled={isAdmin && !selectedCompanyId}>
              <option value="">— ไม่ระบุแผนก —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="c-rlabel">ตำแหน่ง (Role Label)</Label>
            <Select id="c-rlabel" {...register('roleLabelId')} disabled={isAdmin && !selectedCompanyId}>
              <option value="">
                {effectiveCompanyId && roleLabels.length === 0
                  ? '— ยังไม่มีตำแหน่งในบริษัทนี้ —'
                  : '— ไม่ระบุ —'}
              </option>
              {roleLabels.map((rl) => (
                <option key={rl.id} value={rl.id}>{rl.name}</option>
              ))}
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="c-pw">รหัสผ่านเริ่มต้น *</Label>
            <Input id="c-pw" type="password" {...register('password')} />
            <FieldError message={errors.password?.message} />
          </div>
        </div>
        {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button type="submit" loading={isSubmitting}>บันทึก</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

function EditModal({ empId, onClose }: { empId: string; onClose: () => void }) {
  const { data: emp, isLoading } = useEmployee(empId)
  const updateEmployee   = useUpdateEmployee(empId)
  const toggleStatus     = useToggleEmployeeStatus(empId)
  const addRole          = useAddEmployeeRole(empId)
  const removeRole       = useRemoveEmployeeRole(empId)
  const setPassword      = useSetPassword(empId)

  const [addRoleOpen,    setAddRoleOpen]   = useState(false)
  const [selectedRole,   setSelectedRole]  = useState<RoleType>('Employee')
  const [pwOpen,         setPwOpen]        = useState(false)
  const [newPw,          setNewPw]         = useState('')
  const [pwError,        setPwError]       = useState('')
  const [removeTarget,   setRemoveTarget]  = useState<string | null>(null)
  const [toggleConfirm,  setToggleConfirm] = useState(false)

  const currentUser = useAuthStore((s) => s.employee)
  const isAdmin = currentUser?.roles.some((r) => r.role === 'Admin') ?? false

  const { data: tree = [] } = useCompanies()
  const activeCompanies = (() => {
    const result: { id: string; name: string }[] = []
    function walk(nodes: typeof tree) {
      for (const n of nodes) {
        if (n.isActive) result.push({ id: n.id, name: n.name })
        walk(n.children)
      }
    }
    walk(tree)
    return result
  })()

  const { register, handleSubmit, setError, reset, watch, setValue,
    formState: { errors, isSubmitting, isDirty } } =
    useForm<EditValues>({
      resolver: zodResolver(editSchema),
      values: emp ? {
        firstName:     emp.fullName.split(' ')[0] ?? '',
        lastName:      emp.fullName.split(' ').slice(1).join(' ') ?? '',
        email:         emp.email          ?? '',
        phone:         emp.phone          ?? '',
        hireDate:      emp.hireDate       ?? '',
        companyId:     emp.companyId      ?? '',
        departmentId:  emp.departmentId   ?? '',
        roleLabelId:   emp.roleLabelId    ?? '',
      } : undefined,
    })

  const selectedCompanyId = watch('companyId')
  const editEffectiveCompanyId = selectedCompanyId || emp?.companyId
  const { data: departments = [] } = useDepartments(editEffectiveCompanyId)
  const { data: roleLabels = [] } = useRoleLabels(editEffectiveCompanyId || undefined)

  // Reset company-specific fields when Admin changes company (skip initial emp load)
  const editEmpLoadedRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!selectedCompanyId) return
    if (editEmpLoadedRef.current === undefined) {
      // Record the company when emp first loads
      editEmpLoadedRef.current = selectedCompanyId
      return
    }
    if (selectedCompanyId !== editEmpLoadedRef.current) {
      setValue('departmentId', '')
      setValue('roleLabelId', '')
      editEmpLoadedRef.current = selectedCompanyId
    }
  }, [selectedCompanyId, setValue])

  async function onSave(values: EditValues) {
    try {
      await updateEmployee.mutateAsync({
        firstName:     values.firstName,
        lastName:      values.lastName,
        email:         values.email        || undefined,
        phone:         values.phone        || undefined,
        hireDate:      values.hireDate     || undefined,
        companyId:     values.companyId    || undefined,
        departmentId:  values.departmentId || undefined,
        roleLabelId: values.roleLabelId || undefined,
      })
      toast.success('บันทึกข้อมูลสำเร็จ')
      reset(values)
    } catch (err: unknown) {
      const e = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (e === 'DUPLICATE_EMAIL') setError('email', { message: 'อีเมลนี้มีอยู่แล้ว' })
      else { setError('root', { message: 'เกิดข้อผิดพลาด' }); toast.error('เกิดข้อผิดพลาด') }
    }
  }

  async function handleAddRole() {
    try {
      await addRole.mutateAsync({ role: selectedRole })
      setAddRoleOpen(false)
      toast.success(`เพิ่ม role ${selectedRole} สำเร็จ`)
    } catch (err: unknown) {
      const e = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(e === 'DUPLICATE_ROLE' ? 'role นี้มีอยู่แล้ว' : 'เกิดข้อผิดพลาด')
    }
  }

  async function confirmRemoveRole() {
    if (!removeTarget) return
    try {
      await removeRole.mutateAsync(removeTarget)
      toast.success('ลบ role สำเร็จ')
      setRemoveTarget(null)
    } catch (err: unknown) {
      const e = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(e === 'LAST_ADMIN' ? 'ไม่สามารถลบ Admin คนสุดท้ายได้' : 'เกิดข้อผิดพลาด')
      setRemoveTarget(null)
    }
  }

  async function handleSetPassword() {
    if (newPw.length < 6) { setPwError('อย่างน้อย 6 ตัวอักษร'); return }
    try {
      await setPassword.mutateAsync(newPw)
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
      toast.error(e === 'CANNOT_DEACTIVATE_SELF' ? 'ไม่สามารถปิดการใช้งานตัวเองได้' : 'เกิดข้อผิดพลาด')
      setToggleConfirm(false)
    }
  }

  return (
    <>
      <Modal open onClose={onClose} title={emp ? `${emp.fullName} · ${emp.employeeCode}` : 'โหลด...'} size="lg">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : !emp ? (
          <p className="py-10 text-center text-muted-foreground">ไม่พบข้อมูลพนักงาน</p>
        ) : (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">

            {/* ── Basic info ── */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">ข้อมูลพื้นฐาน</h3>
                <Badge variant={emp.isActive ? 'success' : 'secondary'}>
                  {emp.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                </Badge>
              </div>
              <form onSubmit={handleSubmit(onSave)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="e-fn">ชื่อ *</Label>
                    <Input id="e-fn" {...register('firstName')} />
                    <FieldError message={errors.firstName?.message} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="e-ln">นามสกุล *</Label>
                    <Input id="e-ln" {...register('lastName')} />
                    <FieldError message={errors.lastName?.message} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="e-email">อีเมล</Label>
                    <Input id="e-email" type="email" {...register('email')} />
                    <FieldError message={errors.email?.message} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="e-phone">เบอร์โทรศัพท์</Label>
                    <Input id="e-phone" {...register('phone')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="e-hire">วันที่เริ่มงาน</Label>
                    <DateInput id="e-hire" {...register('hireDate')} />
                  </div>
                  {emp.nationalIdMasked && (
                    <div className="space-y-1.5">
                      <Label>เลขบัตรประชาชน</Label>
                      <Input value={emp.nationalIdMasked} disabled />
                    </div>
                  )}
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="e-company">บริษัท</Label>
                    <Select id="e-company" {...register('companyId')} disabled={!isAdmin}>
                      {!isAdmin && <option value={emp?.companyId ?? ''}>{activeCompanies.find(c => c.id === emp?.companyId)?.name ?? emp?.companyName ?? 'บริษัทของพนักงาน'}</option>}
                      {isAdmin && <option value="">— เลือกบริษัท —</option>}
                      {isAdmin && activeCompanies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="e-dept">แผนก</Label>
                    <Select id="e-dept" {...register('departmentId')}>
                      <option value="">— ไม่ระบุแผนก —</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="e-rlabel">ตำแหน่ง (Role Label)</Label>
                    <Select id="e-rlabel" {...register('roleLabelId')}>
                      <option value="">
                        {editEffectiveCompanyId && roleLabels.length === 0
                          ? '— ยังไม่มีตำแหน่งในบริษัทนี้ —'
                          : '— ไม่ระบุ —'}
                      </option>
                      {roleLabels.map((rl) => (
                        <option key={rl.id} value={rl.id}>{rl.name}</option>
                      ))}
                    </Select>
                  </div>
                </div>
                {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => reset()} disabled={!isDirty}>
                    ยกเลิก
                  </Button>
                  <Button type="submit" size="sm" loading={isSubmitting} disabled={!isDirty}>
                    บันทึก
                  </Button>
                </div>
              </form>
            </section>

            <hr className="border-border" />

            {/* ── Roles ── */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">สิทธิ์การใช้งาน</h3>
                <Button size="sm" variant="outline" onClick={() => setAddRoleOpen((v) => !v)}>
                  <Plus className="h-4 w-4" />เพิ่ม Role
                </Button>
              </div>
              {addRoleOpen && (
                <div className="flex items-center gap-2 rounded-md bg-muted p-3">
                  <Select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value as RoleType)} className="w-36">
                    {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </Select>
                  <Button size="sm" loading={addRole.isPending} onClick={handleAddRole}>เพิ่ม</Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddRoleOpen(false)}>ยกเลิก</Button>
                </div>
              )}
              <div className="space-y-2">
                {emp.roles.length === 0 && (
                  <p className="text-sm text-muted-foreground">ยังไม่มี role</p>
                )}
                {emp.roles.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Badge>{r.role}</Badge>
                      {!r.isActive && <span className="text-xs text-muted-foreground">(ปิดใช้งาน)</span>}
                    </div>
                    <Button
                      size="icon" variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      loading={removeRole.isPending}
                      onClick={() => setRemoveTarget(r.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </section>

            <hr className="border-border" />

            {/* ── Password reset ── */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">รหัสผ่าน</h3>
                <Button size="sm" variant="outline" onClick={() => setPwOpen((v) => !v)}>
                  <KeyRound className="h-4 w-4" />รีเซ็ตรหัสผ่าน
                </Button>
              </div>
              {pwOpen && (
                <div className="space-y-2">
                  <Input
                    type="password" placeholder="รหัสผ่านใหม่"
                    value={newPw} onChange={(e) => setNewPw(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSetPassword()}
                  />
                  {pwError && <p className="text-xs text-destructive">{pwError}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" loading={setPassword.isPending} onClick={handleSetPassword}>ยืนยัน</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setPwOpen(false); setNewPw(''); setPwError('') }}>ยกเลิก</Button>
                  </div>
                </div>
              )}
            </section>

            <hr className="border-border" />

            {/* ── Toggle status ── */}
            <div className="flex justify-end">
              <Button
                size="sm"
                variant={emp.isActive ? 'destructive' : 'outline'}
                onClick={() => setToggleConfirm(true)}
              >
                {emp.isActive ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={confirmRemoveRole}
        title="ลบ Role"
        description="ยืนยันลบ role นี้ออกจากพนักงาน?"
        confirmLabel="ลบ"
        variant="destructive"
        loading={removeRole.isPending}
      />

      <ConfirmModal
        open={toggleConfirm}
        onClose={() => setToggleConfirm(false)}
        onConfirm={confirmToggleStatus}
        title={emp?.isActive ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน'}
        description={`ยืนยัน${emp?.isActive ? 'ปิด' : 'เปิด'}การใช้งานพนักงาน "${emp?.fullName}"?`}
        confirmLabel={emp?.isActive ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน'}
        variant={emp?.isActive ? 'destructive' : 'default'}
        loading={toggleStatus.isPending}
      />
    </>
  )
}

// ── List page ─────────────────────────────────────────────────────────────────

function EmployeesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const search      = searchParams.get('search') ?? ''
  const page        = Number(searchParams.get('page') ?? '1')
  const showInactive = searchParams.get('inactive') === '1'

  const [searchInput,  setSearchInput]  = useState(search)
  const [companyFilter, setCompanyFilter] = useState('')
  const [createOpen,   setCreateOpen]   = useState(false)
  const [editEmpId,    setEditEmpId]    = useState<string | null>(null)

  const { data: tree = [] } = useCompanies()
  const activeCompanies = (() => {
    const result: { id: string; name: string }[] = []
    function walk(nodes: typeof tree) {
      for (const n of nodes) {
        if (n.isActive) result.push({ id: n.id, name: n.name })
        walk(n.children)
      }
    }
    walk(tree)
    return result
  })()

  const { data, isLoading } = useEmployees({
    page,
    pageSize: PAGE_SIZE,
    search:   search || undefined,
    isActive: showInactive ? undefined : true,
    companyId: companyFilter || undefined,
  })

  function pushParams(updates: Record<string, string | undefined>) {
    const p = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v == null) p.delete(k); else p.set(k, v)
    }
    p.delete('page')
    startTransition(() => router.push(`/employees?${p.toString()}`))
  }

  const totalPages = data ? Math.ceil(data.totalCount / PAGE_SIZE) : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">พนักงาน</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />เพิ่มพนักงาน
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={companyFilter}
          onChange={(e) => { setCompanyFilter(e.target.value); pushParams({ page: undefined }) }}
          className="w-56"
        >
          <option value="">— ทุกบริษัท —</option>
          {activeCompanies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <form
          onSubmit={(e) => { e.preventDefault(); pushParams({ search: searchInput || undefined }) }}
          className="relative flex-1 max-w-sm"
        >
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ค้นหาชื่อ / รหัสพนักงาน"
            className="pl-8"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </form>
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox" className="rounded border-border"
            checked={showInactive}
            onChange={(e) => pushParams({ inactive: e.target.checked ? '1' : undefined })}
          />
          แสดงทั้งหมด (รวมปิดใช้งาน)
        </label>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">รหัส</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ชื่อ-นามสกุล</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">บริษัท</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">แผนก</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ตำแหน่ง</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">สิทธิ์</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))}
            {!isLoading && data?.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  ไม่พบข้อมูลพนักงาน
                </td>
              </tr>
            )}
            {!isLoading &&
              data?.items.map((emp) => (
                <tr
                  key={emp.id}
                  onClick={() => setEditEmpId(emp.id)}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{emp.employeeCode}</td>
                  <td className="px-4 py-3 font-medium">{emp.fullName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{emp.companyName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{emp.departmentName ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{emp.roleLabelName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {emp.roles.map((r) => (
                        <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={emp.isActive ? 'success' : 'secondary'}>
                      {emp.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                    </Badge>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>ทั้งหมด {data?.totalCount ?? 0} รายการ</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" disabled={page <= 1}
              onClick={() => { const p = new URLSearchParams(searchParams.toString()); p.set('page', String(page - 1)); router.push(`/employees?${p}`) }}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>{page} / {totalPages}</span>
            <Button variant="outline" size="icon" disabled={page >= totalPages}
              onClick={() => { const p = new URLSearchParams(searchParams.toString()); p.set('page', String(page + 1)); router.push(`/employees?${p}`) }}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <CreateModal open={createOpen} onClose={() => setCreateOpen(false)} defaultCompanyId={companyFilter || undefined} />
      {editEmpId && <EditModal empId={editEmpId} onClose={() => setEditEmpId(null)} />}
    </div>
  )
}

export default function EmployeesPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <EmployeesPage />
    </Suspense>
  )
}
