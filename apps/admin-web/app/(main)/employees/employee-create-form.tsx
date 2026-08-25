'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building2, Eye, EyeOff, KeyRound, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { DateInput } from '@/components/ui/date-input'
import { useCreateEmployee } from '@/hooks/use-employees'
import { useDepartments } from '@/hooks/use-departments'
import { useRoleLabels } from '@/hooks/use-role-labels'
import { companyOptionLabel, useCompanyOptions } from '@/hooks/use-company-options'
import { useAuthStore } from '@/stores/auth.store'

const schema = z.object({
  employeeCode: z.string().min(1, 'กรุณากรอกรหัสพนักงาน'),
  firstName:    z.string().min(1, 'กรุณากรอกชื่อ'),
  lastName:     z.string().min(1, 'กรุณากรอกนามสกุล'),
  nickname:     z.string().max(50, { message: 'ไม่เกิน 50 ตัวอักษร' }).optional(),
  email:      z.string().email({ message: 'อีเมลไม่ถูกต้อง' }).optional().or(z.literal('')),
  phone:        z.string().optional(),
  nationalId:   z.string().length(13, { message: 'ต้องมี 13 หลัก' })
                  .regex(/^\d+$/, { message: 'ต้องเป็นตัวเลข' }).optional().or(z.literal('')),
  password:     z.string().min(6, 'อย่างน้อย 6 ตัวอักษร'),
  hireDate:     z.string().optional(),
  companyId:    z.string().optional(),
  departmentId: z.string().optional(),
  roleLabelId:  z.string().optional(),
})
export type CreateEmployeeValues = z.infer<typeof schema>

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-0.5 text-xs text-destructive">{message}</p>
}

function Section({ icon, title, hint, children }: {
  icon: ReactNode; title: string; hint?: string; children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </section>
  )
}

type Props = {
  defaultCompanyId?: string
  onSuccess: (employeeId: string, fullName: string) => void
  onCancel: () => void
  /** ปุ่มยกเลิก/บันทึกติดขอบล่างแบบ sticky (ใช้ในโมดัล) */
  stickyActions?: boolean
}

export function EmployeeCreateForm({ defaultCompanyId, onSuccess, onCancel, stickyActions }: Props) {
  const create   = useCreateEmployee()
  const employee = useAuthStore((s) => s.employee)
  const isAdmin  = employee?.roles.some((r) => r.role === 'Admin') ?? false
  const [showPassword, setShowPassword] = useState(false)

  const { options: companies } = useCompanyOptions()

  const {
    register, handleSubmit, setError, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateEmployeeValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyId: isAdmin ? (defaultCompanyId ?? '') : (employee?.companyId ?? ''),
      departmentId: '', roleLabelId: '',
    },
  })

  const selectedCompanyId  = watch('companyId')
  const effectiveCompanyId = selectedCompanyId || (isAdmin ? undefined : employee?.companyId)
  const { data: departments = [] } = useDepartments(effectiveCompanyId || undefined)
  const { data: roleLabels = [] }  = useRoleLabels(effectiveCompanyId || undefined)

  // เปลี่ยนบริษัท = ล้างแผนก/ตำแหน่งเดิม (ข้ามรอบ render แรก)
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    setValue('departmentId', '')
    setValue('roleLabelId', '')
  }, [selectedCompanyId, setValue])

  const scopeDisabled = isAdmin && !selectedCompanyId

  async function onSubmit(values: CreateEmployeeValues) {
    try {
      const result = await create.mutateAsync({
        employeeCode: values.employeeCode,
        firstName:    values.firstName,
        lastName:     values.lastName,
        nickname:     values.nickname     || undefined,
        email:        values.email        || undefined,
        phone:        values.phone        || undefined,
        nationalId:   values.nationalId   || undefined,
        password:     values.password,
        hireDate:     values.hireDate     || undefined,
        companyId:    values.companyId    || undefined,
        departmentId: values.departmentId || undefined,
        roleLabelId:  values.roleLabelId  || undefined,
      })
      const fullName = `${values.firstName} ${values.lastName}`
      toast.success(`เพิ่มพนักงาน "${fullName}" สำเร็จ`)
      onSuccess(result.id, fullName)
    } catch (err: unknown) {
      const e = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (e === 'DUPLICATE_EMPLOYEE_CODE')    setError('employeeCode', { message: 'รหัสพนักงานนี้มีอยู่แล้ว' })
      else if (e === 'DUPLICATE_EMAIL')       setError('email',        { message: 'อีเมลนี้มีอยู่แล้ว' })
      else if (e === 'DUPLICATE_NATIONAL_ID') setError('nationalId',   { message: 'เลขบัตรประชาชนนี้มีอยู่แล้ว' })
      else { setError('root', { message: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }); toast.error('เกิดข้อผิดพลาด') }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Section icon={<UserRound className="h-3.5 w-3.5" />} title="ข้อมูลส่วนตัว">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="c-code">รหัสพนักงาน <span className="text-destructive">*</span></Label>
          <Input id="c-code" placeholder="เช่น EMP0001" {...register('employeeCode')} />
          <FieldError message={errors.employeeCode?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-fn">ชื่อ <span className="text-destructive">*</span></Label>
          <Input id="c-fn" {...register('firstName')} />
          <FieldError message={errors.firstName?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-ln">นามสกุล <span className="text-destructive">*</span></Label>
          <Input id="c-ln" {...register('lastName')} />
          <FieldError message={errors.lastName?.message} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="c-nick">ชื่อเล่น</Label>
          <Input id="c-nick" maxLength={50} placeholder="ชื่อที่เพื่อนร่วมงานเรียก" {...register('nickname')} />
          <FieldError message={errors.nickname?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-email">อีเมล</Label>
          <Input id="c-email" type="email" placeholder="name@company.com" {...register('email')} />
          <FieldError message={errors.email?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-phone">เบอร์โทรศัพท์</Label>
          <Input id="c-phone" type="tel" placeholder="08x-xxx-xxxx" {...register('phone')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-nid">เลขบัตรประชาชน</Label>
          <Input id="c-nid" inputMode="numeric" maxLength={13} placeholder="13 หลัก" {...register('nationalId')} />
          <FieldError message={errors.nationalId?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-hire">วันที่เริ่มงาน</Label>
          <DateInput id="c-hire" {...register('hireDate')} />
        </div>
      </Section>

      <Section
        icon={<Building2 className="h-3.5 w-3.5" />}
        title="สังกัด"
        hint={scopeDisabled ? 'เลือกบริษัทก่อนจึงจะเลือกแผนก/ตำแหน่งได้' : undefined}
      >
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="c-company">บริษัท</Label>
          <Select id="c-company" {...register('companyId')} disabled={!isAdmin}>
            {!isAdmin && (
              <option value={employee?.companyId ?? ''}>
                {companies.find((c) => c.id === employee?.companyId)?.name ?? 'บริษัทของตัวเอง'}
              </option>
            )}
            {isAdmin && <option value="">— เลือกบริษัท —</option>}
            {isAdmin && companies.map((c) => (
              <option key={c.id} value={c.id}>{companyOptionLabel(c)}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-dept">แผนก</Label>
          <Select id="c-dept" {...register('departmentId')} disabled={scopeDisabled}>
            <option value="">— ไม่ระบุแผนก —</option>
            {departments.filter((d) => d.isActive).map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-rlabel">ตำแหน่ง</Label>
          <Select id="c-rlabel" {...register('roleLabelId')} disabled={scopeDisabled}>
            <option value="">
              {effectiveCompanyId && roleLabels.length === 0 ? '— ยังไม่มีตำแหน่งในบริษัทนี้ —' : '— ไม่ระบุ —'}
            </option>
            {roleLabels.filter((r) => r.isActive).map((rl) => (
              <option key={rl.id} value={rl.id}>{rl.name}</option>
            ))}
          </Select>
        </div>
      </Section>

      <Section icon={<KeyRound className="h-3.5 w-3.5" />} title="การเข้าใช้งาน">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="c-pw">รหัสผ่านเริ่มต้น <span className="text-destructive">*</span></Label>
          <div className="relative">
            <Input
              id="c-pw"
              type={showPassword ? 'text' : 'password'}
              placeholder="อย่างน้อย 6 ตัวอักษร"
              className="pr-10"
              autoComplete="new-password"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:bg-whited hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <FieldError message={errors.password?.message} />
          <p className="text-xs text-muted-foreground">พนักงานสามารถเปลี่ยนรหัสผ่านเองได้ภายหลัง</p>
        </div>
      </Section>

      {errors.root && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{errors.root.message}</p>
      )}

      <div className={`flex justify-end gap-2 border-t border-border pt-4 ${
        stickyActions ? 'sticky bottom-0 -mx-4 -mb-4 bg-background px-4 pb-4 sm:-mx-5 sm:px-5' : ''
      }`}>
        <Button type="button" variant="outline" onClick={onCancel}>ยกเลิก</Button>
        <Button type="submit" loading={isSubmitting}>บันทึก</Button>
      </div>
    </form>
  )
}
