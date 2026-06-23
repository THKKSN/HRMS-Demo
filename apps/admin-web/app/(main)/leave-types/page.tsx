'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useLeaveTypes, useCreateLeaveType, useUpdateLeaveType, useToggleLeaveTypeStatus } from '@/hooks/use-leave-types'
import type { LeaveTypeAdminDto } from '@/types/admin'

// ── Schema ────────────────────────────────────────────────────────────────────

const createSchema = z.object({
  code: z
    .string()
    .min(1, 'กรุณากรอกรหัส')
    .max(10)
    .regex(/^[A-Z0-9_]+$/, 'ต้องเป็นตัวพิมพ์ใหญ่ ตัวเลข หรือ _'),
  nameTh: z.string().min(1, 'กรุณากรอกชื่อภาษาไทย'),
  nameEn: z.string().optional(),
  defaultDaysPerYear: z.number().int().min(0).max(365),
  requiresAttachment: z.boolean(),
})

const editSchema = z.object({
  nameTh: z.string().min(1, 'กรุณากรอกชื่อภาษาไทย'),
  nameEn: z.string().optional(),
  defaultDaysPerYear: z.number().int().min(0).max(365),
  requiresAttachment: z.boolean(),
})

type CreateValues = z.infer<typeof createSchema>
type EditValues = z.infer<typeof editSchema>

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive mt-0.5">{message}</p>
}

// ── Create Modal ──────────────────────────────────────────────────────────────

function CreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateLeaveType()
  const {
    register, handleSubmit, setError, reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { requiresAttachment: false, defaultDaysPerYear: 0 },
  })

  async function onSubmit(values: CreateValues) {
    try {
      await create.mutateAsync({
        code: values.code,
        nameTh: values.nameTh,
        nameEn: values.nameEn || undefined,
        defaultDaysPerYear: values.defaultDaysPerYear,
        requiresAttachment: values.requiresAttachment,
      })
      toast.success(`เพิ่มประเภทการลา "${values.nameTh}" สำเร็จ`)
      reset()
      onClose()
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data
      if (apiErr?.error === 'DUPLICATE_CODE')
        setError('code', { message: 'รหัสนี้มีอยู่แล้วในระบบ' })
      else {
        setError('root', { message: 'เกิดข้อผิดพลาด กรุณาลองใหม่' })
        toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
      }
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="เพิ่มประเภทการลาใหม่">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="c-code">รหัส (ตัวพิมพ์ใหญ่) *</Label>
          <Input id="c-code" placeholder="เช่น AL, SL, PL" {...register('code')}
            onChange={(e) => { e.target.value = e.target.value.toUpperCase(); register('code').onChange(e) }} />
          <FieldError message={errors.code?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-nameTh">ชื่อภาษาไทย *</Label>
          <Input id="c-nameTh" placeholder="เช่น ลาพักร้อน" {...register('nameTh')} />
          <FieldError message={errors.nameTh?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-nameEn">ชื่อภาษาอังกฤษ</Label>
          <Input id="c-nameEn" placeholder="Annual Leave" {...register('nameEn')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-days">จำนวนวันต่อปี *</Label>
          <Input id="c-days" type="number" min={0} max={365}
            {...register('defaultDaysPerYear', { valueAsNumber: true })} />
          <FieldError message={errors.defaultDaysPerYear?.message} />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" {...register('requiresAttachment')} className="rounded border-border" />
          <span className="text-sm">ต้องแนบเอกสารประกอบ</span>
        </label>
        {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button type="submit" loading={isSubmitting}>บันทึก</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

function EditModal({ item, onClose }: { item: LeaveTypeAdminDto; onClose: () => void }) {
  const update = useUpdateLeaveType(item.id)
  const {
    register, handleSubmit, setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      nameTh: item.nameTh,
      nameEn: item.nameEn ?? '',
      defaultDaysPerYear: item.defaultDaysPerYear,
      requiresAttachment: item.requiresAttachment,
    },
  })

  async function onSubmit(values: EditValues) {
    try {
      await update.mutateAsync({
        nameTh: values.nameTh,
        nameEn: values.nameEn || undefined,
        defaultDaysPerYear: values.defaultDaysPerYear,
        requiresAttachment: values.requiresAttachment,
      })
      toast.success(`บันทึก "${values.nameTh}" สำเร็จ`)
      onClose()
    } catch {
      setError('root', { message: 'เกิดข้อผิดพลาด กรุณาลองใหม่' })
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
    }
  }

  return (
    <Modal open onClose={onClose} title={`แก้ไข: ${item.nameTh}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label>รหัส (ไม่สามารถแก้ไขได้)</Label>
          <Input value={item.code} disabled />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="e-nameTh">ชื่อภาษาไทย *</Label>
          <Input id="e-nameTh" {...register('nameTh')} />
          <FieldError message={errors.nameTh?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="e-nameEn">ชื่อภาษาอังกฤษ</Label>
          <Input id="e-nameEn" {...register('nameEn')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="e-days">จำนวนวันต่อปี *</Label>
          <Input id="e-days" type="number" min={0} max={365}
            {...register('defaultDaysPerYear', { valueAsNumber: true })} />
          <FieldError message={errors.defaultDaysPerYear?.message} />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" {...register('requiresAttachment')} className="rounded border-border" />
          <span className="text-sm">ต้องแนบเอกสารประกอบ</span>
        </label>
        {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>บันทึก</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LeaveTypesPage() {
  const { data: leaveTypes, isLoading } = useLeaveTypes()
  const toggle = useToggleLeaveTypeStatus()

  const [createOpen, setCreateOpen] = useState(false)
  const [editItem, setEditItem] = useState<LeaveTypeAdminDto | null>(null)
  const [toggleTarget, setToggleTarget] = useState<LeaveTypeAdminDto | null>(null)

  async function confirmToggle() {
    if (!toggleTarget) return
    try {
      await toggle.mutateAsync({ id: toggleTarget.id, isActive: !toggleTarget.isActive })
      toast.success(`${toggleTarget.isActive ? 'ปิด' : 'เปิด'}ใช้งาน "${toggleTarget.nameTh}" สำเร็จ`)
      setToggleTarget(null)
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data
      toast.error(apiErr?.error === 'IN_USE'
        ? 'มีคำขอลาที่ยังรออนุมัติอยู่ ไม่สามารถปิดได้'
        : 'เกิดข้อผิดพลาด กรุณาลองใหม่')
      setToggleTarget(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">ประเภทการลา</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          เพิ่ม
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">รหัส</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ชื่อภาษาไทย</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">วันต่อปี</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">แนบเอกสาร</th>
              <th className="px-4 py-3 w-50" />
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))}
            {!isLoading && (!leaveTypes || leaveTypes.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  ยังไม่มีประเภทการลา — กดเพิ่มด้านบน
                </td>
              </tr>
            )}
            {!isLoading &&
              leaveTypes?.map((lt) => (
                <tr key={lt.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{lt.code}</td>
                  <td className="px-4 py-3 font-medium">{lt.nameTh}
                    {lt.nameEn && <span className="ml-1.5 text-xs text-muted-foreground">({lt.nameEn})</span>}
                  </td>
                  <td className="px-4 py-3">{lt.defaultDaysPerYear} วัน</td>
                  <td className="px-4 py-3">
                    <Badge variant={lt.requiresAttachment ? 'warning' : 'secondary'}>
                      {lt.requiresAttachment ? 'ต้องการ' : 'ไม่ต้องการ'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setEditItem(lt)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setToggleTarget(lt)}
                      disabled={toggle.isPending}
                    >
                      <Trash className="h-3.5 w-3.5 text-red-600" />
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <CreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
      {editItem && <EditModal item={editItem} onClose={() => setEditItem(null)} />}

      <ConfirmModal
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={confirmToggle}
        title={toggleTarget?.isActive ? 'ปิดใช้งานประเภทการลา' : 'เปิดใช้งานประเภทการลา'}
        description={`ยืนยัน${toggleTarget?.isActive ? 'ปิด' : 'เปิด'}ใช้งาน "${toggleTarget?.nameTh}"?`}
        confirmLabel={toggleTarget?.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
        variant={toggleTarget?.isActive ? 'destructive' : 'default'}
        loading={toggle.isPending}
      />
    </div>
  )
}
