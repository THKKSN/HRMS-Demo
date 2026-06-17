'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useLeaveTypes, useUpdateLeaveType, useToggleLeaveTypeStatus } from '@/hooks/use-leave-types'

const schema = z.object({
  nameTh: z.string().min(1, 'กรุณากรอกชื่อภาษาไทย'),
  nameEn: z.string().optional(),
  defaultDaysPerYear: z.number().int().min(0).max(365),
  requiresAttachment: z.boolean(),
})
type FormValues = z.infer<typeof schema>

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive">{message}</p>
}

export default function EditLeaveTypePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { data: leaveTypes, isLoading } = useLeaveTypes()
  const lt = leaveTypes?.find((x) => x.id === id)

  const updateLeaveType = useUpdateLeaveType(id)
  const toggle = useToggleLeaveTypeStatus()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: lt
      ? {
          nameTh: lt.nameTh,
          nameEn: lt.nameEn ?? '',
          defaultDaysPerYear: lt.defaultDaysPerYear,
          requiresAttachment: lt.requiresAttachment,
        }
      : undefined,
  })

  async function onSave(values: FormValues) {
    try {
      await updateLeaveType.mutateAsync({
        nameTh: values.nameTh,
        nameEn: values.nameEn || undefined,
        defaultDaysPerYear: values.defaultDaysPerYear,
        requiresAttachment: values.requiresAttachment,
      })
      reset(values)
      router.push('/leave-types')
    } catch {
      setError('root', { message: 'เกิดข้อผิดพลาด กรุณาลองใหม่' })
    }
  }

  async function handleToggle() {
    if (!lt) return
    const action = lt.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'
    if (!confirm(`ยืนยัน${action}ประเภทลานี้?`)) return
    try {
      await toggle.mutateAsync({ id, isActive: !lt.isActive })
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data
      alert(apiErr?.error === 'IN_USE' ? 'มีคำขอลาที่ยังรออนุมัติอยู่ ไม่สามารถปิดได้' : 'เกิดข้อผิดพลาด')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!lt) {
    return <div className="py-20 text-center text-muted-foreground">ไม่พบข้อมูลประเภทลา</div>
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/leave-types">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">{lt.nameTh}</h1>
          <p className="text-sm text-muted-foreground font-mono">{lt.code}</p>
        </div>
        <Badge variant={lt.isActive ? 'success' : 'secondary'}>
          {lt.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
        </Badge>
      </div>

      <form
        onSubmit={handleSubmit(onSave)}
        className="space-y-4 rounded-lg border border-border bg-background p-6"
      >
        <div className="space-y-1.5">
          <Label>รหัส (ไม่สามารถแก้ไขได้)</Label>
          <Input value={lt.code} disabled />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="nameTh">ชื่อภาษาไทย *</Label>
          <Input id="nameTh" {...register('nameTh')} />
          <FieldError message={errors.nameTh?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="nameEn">ชื่อภาษาอังกฤษ</Label>
          <Input id="nameEn" {...register('nameEn')} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="defaultDaysPerYear">จำนวนวันต่อปี *</Label>
          <Input id="defaultDaysPerYear" type="number" min={0} max={365} {...register('defaultDaysPerYear', { valueAsNumber: true })} />
          <FieldError message={errors.defaultDaysPerYear?.message} />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" {...register('requiresAttachment')} className="rounded border-border" />
          <span className="text-sm">ต้องแนบเอกสารประกอบ</span>
        </label>

        {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => reset()} disabled={!isDirty}>
            ยกเลิกการแก้ไข
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
            บันทึก
          </Button>
        </div>
      </form>

      <div className="flex justify-end">
        <Button
          variant={lt.isActive ? 'destructive' : 'outline'}
          loading={toggle.isPending}
          onClick={handleToggle}
        >
          {lt.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
        </Button>
      </div>
    </div>
  )
}
