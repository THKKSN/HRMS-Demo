'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateEmployee } from '@/hooks/use-employees'

const schema = z.object({
  employeeCode: z.string().min(1, 'กรุณากรอกรหัสพนักงาน'),
  firstName: z.string().min(1, 'กรุณากรอกชื่อ'),
  lastName: z.string().min(1, 'กรุณากรอกนามสกุล'),
  email: z.string().email('อีเมลไม่ถูกต้อง').optional().or(z.literal('')),
  phone: z.string().optional(),
  nationalId: z
    .string()
    .length(13, 'เลขบัตรประชาชนต้องมี 13 หลัก')
    .regex(/^\d+$/, 'ต้องเป็นตัวเลขเท่านั้น')
    .optional()
    .or(z.literal('')),
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
  hireDate: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive">{message}</p>
}

export default function NewEmployeePage() {
  const router = useRouter()
  const createEmployee = useCreateEmployee()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    try {
      const result = await createEmployee.mutateAsync({
        employeeCode: values.employeeCode,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email || undefined,
        phone: values.phone || undefined,
        nationalId: values.nationalId || undefined,
        password: values.password,
        hireDate: values.hireDate || undefined,
      })
      router.push(`/employees/${result.id}`)
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data
      if (apiErr?.error === 'DUPLICATE_EMPLOYEE_CODE')
        setError('employeeCode', { message: 'รหัสพนักงานนี้มีอยู่แล้ว' })
      else if (apiErr?.error === 'DUPLICATE_EMAIL')
        setError('email', { message: 'อีเมลนี้มีอยู่แล้ว' })
      else if (apiErr?.error === 'DUPLICATE_NATIONAL_ID')
        setError('nationalId', { message: 'เลขบัตรประชาชนนี้มีอยู่แล้ว' })
      else
        setError('root', { message: 'เกิดข้อผิดพลาด กรุณาลองใหม่' })
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/employees">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold text-foreground">เพิ่มพนักงานใหม่</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 rounded-lg border border-border bg-background p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="employeeCode">รหัสพนักงาน *</Label>
            <Input id="employeeCode" {...register('employeeCode')} />
            <FieldError message={errors.employeeCode?.message} />
          </div>

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
            <Input id="phone" type="tel" {...register('phone')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nationalId">เลขบัตรประชาชน</Label>
            <Input id="nationalId" maxLength={13} {...register('nationalId')} />
            <FieldError message={errors.nationalId?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hireDate">วันที่เริ่มงาน</Label>
            <Input id="hireDate" type="date" {...register('hireDate')} />
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="password">รหัสผ่านเริ่มต้น *</Label>
            <Input id="password" type="password" {...register('password')} />
            <FieldError message={errors.password?.message} />
          </div>
        </div>

        {errors.root && (
          <p className="text-sm text-destructive">{errors.root.message}</p>
        )}

        <div className="flex gap-3 justify-end">
          <Link href="/employees">
            <Button type="button" variant="outline">ยกเลิก</Button>
          </Link>
          <Button type="submit" loading={isSubmitting}>บันทึก</Button>
        </div>
      </form>
    </div>
  )
}
