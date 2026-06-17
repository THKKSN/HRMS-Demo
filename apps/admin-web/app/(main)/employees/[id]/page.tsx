'use client'

import { use, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { ArrowLeft, Trash2, Plus, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  useEmployee,
  useUpdateEmployee,
  useToggleEmployeeStatus,
  useAddEmployeeRole,
  useRemoveEmployeeRole,
  useSetPassword,
} from '@/hooks/use-employees'
import type { RoleType } from '@/types/admin'

const ROLE_OPTIONS: RoleType[] = ['Employee', 'Supervisor', 'Hr', 'Admin', 'Executive']

const editSchema = z.object({
  firstName: z.string().min(1, 'กรุณากรอกชื่อ'),
  lastName: z.string().min(1, 'กรุณากรอกนามสกุล'),
  email: z.string().email('อีเมลไม่ถูกต้อง').optional().or(z.literal('')),
  phone: z.string().optional(),
  hireDate: z.string().optional(),
})
type EditValues = z.infer<typeof editSchema>

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive">{message}</p>
}

export default function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: emp, isLoading } = useEmployee(id)
  const updateEmployee = useUpdateEmployee(id)
  const toggleStatus = useToggleEmployeeStatus(id)
  const addRole = useAddEmployeeRole(id)
  const removeRole = useRemoveEmployeeRole(id)
  const setPassword = useSetPassword(id)

  const [addRoleOpen, setAddRoleOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<RoleType>('Employee')
  const [pwOpen, setPwOpen] = useState(false)
  const [newPw, setNewPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    values: emp
      ? {
          firstName: emp.fullName.split(' ')[0] ?? '',
          lastName: emp.fullName.split(' ').slice(1).join(' ') ?? '',
          email: emp.email ?? '',
          phone: emp.phone ?? '',
          hireDate: emp.hireDate ?? '',
        }
      : undefined,
  })

  async function onSave(values: EditValues) {
    try {
      await updateEmployee.mutateAsync({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email || undefined,
        phone: values.phone || undefined,
        hireDate: values.hireDate || undefined,
      })
      setSuccessMsg('บันทึกสำเร็จ')
      setTimeout(() => setSuccessMsg(''), 2000)
      reset(values)
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data
      if (apiErr?.error === 'DUPLICATE_EMAIL')
        setError('email', { message: 'อีเมลนี้มีอยู่แล้ว' })
      else
        setError('root', { message: 'เกิดข้อผิดพลาด กรุณาลองใหม่' })
    }
  }

  async function handleAddRole() {
    try {
      await addRole.mutateAsync({ role: selectedRole })
      setAddRoleOpen(false)
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data
      alert(apiErr?.error === 'DUPLICATE_ROLE' ? 'role นี้มีอยู่แล้ว' : 'เกิดข้อผิดพลาด')
    }
  }

  async function handleRemoveRole(roleId: string) {
    if (!confirm('ยืนยันลบ role นี้?')) return
    try {
      await removeRole.mutateAsync(roleId)
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data
      alert(apiErr?.error === 'LAST_ADMIN' ? 'ไม่สามารถลบ Admin คนสุดท้ายได้' : 'เกิดข้อผิดพลาด')
    }
  }

  async function handleSetPassword() {
    if (newPw.length < 6) {
      setPwError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
      return
    }
    try {
      await setPassword.mutateAsync(newPw)
      setPwOpen(false)
      setNewPw('')
      setPwError('')
      setSuccessMsg('รีเซ็ตรหัสผ่านสำเร็จ')
      setTimeout(() => setSuccessMsg(''), 2000)
    } catch {
      setPwError('เกิดข้อผิดพลาด')
    }
  }

  async function handleToggleStatus() {
    if (!emp) return
    const action = emp.isActive ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน'
    if (!confirm(`ยืนยัน${action}พนักงานคนนี้?`)) return
    try {
      await toggleStatus.mutateAsync(!emp.isActive)
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data
      alert(apiErr?.error === 'CANNOT_DEACTIVATE_SELF' ? 'ไม่สามารถปิดการใช้งานตัวเองได้' : 'เกิดข้อผิดพลาด')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!emp) {
    return (
      <div className="py-20 text-center text-muted-foreground">ไม่พบข้อมูลพนักงาน</div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/employees">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">{emp.fullName}</h1>
          <p className="text-sm text-muted-foreground">{emp.employeeCode}</p>
        </div>
        <Badge variant={emp.isActive ? 'success' : 'secondary'}>
          {emp.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
        </Badge>
      </div>

      {/* Edit form */}
      <form
        onSubmit={handleSubmit(onSave)}
        className="rounded-lg border border-border bg-background p-6 space-y-4"
      >
        <h2 className="text-sm font-semibold text-foreground">ข้อมูลพื้นฐาน</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">ชื่อ *</Label>
            <Input id="firstName" {...register('firstName')} />
            <FieldError message={errors.firstName?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">นามสกุล *</Label>
            <Input id="lastName" {...register('lastName')} />
            <FieldError message={errors.lastName?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">อีเมล</Label>
            <Input id="email" type="email" {...register('email')} />
            <FieldError message={errors.email?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
            <Input id="phone" {...register('phone')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hireDate">วันที่เริ่มงาน</Label>
            <Input id="hireDate" type="date" {...register('hireDate')} />
          </div>
          {emp.nationalIdMasked && (
            <div className="space-y-1.5">
              <Label>เลขบัตรประชาชน</Label>
              <Input value={emp.nationalIdMasked} disabled />
            </div>
          )}
        </div>

        {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
        {successMsg && <p className="text-sm text-green-600">{successMsg}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => reset()} disabled={!isDirty}>
            ยกเลิกการแก้ไข
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
            บันทึก
          </Button>
        </div>
      </form>

      {/* Roles section */}
      <div className="rounded-lg border border-border bg-background p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">สิทธิ์การใช้งาน</h2>
          <Button size="sm" variant="outline" onClick={() => setAddRoleOpen((v) => !v)}>
            <Plus className="h-4 w-4" />
            เพิ่ม Role
          </Button>
        </div>

        {addRoleOpen && (
          <div className="flex items-center gap-2 rounded-md bg-muted p-3">
            <Select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as RoleType)}
              className="w-40"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
            <Button size="sm" loading={addRole.isPending} onClick={handleAddRole}>
              เพิ่ม
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAddRoleOpen(false)}>
              ยกเลิก
            </Button>
          </div>
        )}

        <div className="space-y-2">
          {emp.roles.length === 0 && (
            <p className="text-sm text-muted-foreground">ยังไม่มี role</p>
          )}
          {emp.roles.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <Badge variant="default">{r.role}</Badge>
                {!r.isActive && <span className="text-xs text-muted-foreground">(ปิดใช้งาน)</span>}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive"
                loading={removeRole.isPending}
                onClick={() => handleRemoveRole(r.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Password reset */}
      <div className="rounded-lg border border-border bg-background p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">รหัสผ่าน</h2>
          <Button size="sm" variant="outline" onClick={() => setPwOpen((v) => !v)}>
            <KeyRound className="h-4 w-4" />
            รีเซ็ตรหัสผ่าน
          </Button>
        </div>
        {pwOpen && (
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="รหัสผ่านใหม่"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
            />
            {pwError && <p className="text-xs text-destructive">{pwError}</p>}
            <div className="flex gap-2">
              <Button size="sm" loading={setPassword.isPending} onClick={handleSetPassword}>
                ยืนยัน
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setPwOpen(false); setNewPw(''); setPwError('') }}>
                ยกเลิก
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Toggle status */}
      <div className="flex justify-end">
        <Button
          variant={emp.isActive ? 'destructive' : 'outline'}
          loading={toggleStatus.isPending}
          onClick={handleToggleStatus}
        >
          {emp.isActive ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน'}
        </Button>
      </div>
    </div>
  )
}
