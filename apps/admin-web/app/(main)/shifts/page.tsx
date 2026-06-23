'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { useShifts, useCreateShift, useUpdateShift, useToggleShiftStatus } from '@/hooks/use-shifts'
import { useCompanies } from '@/hooks/use-companies'
import { useAuthStore } from '@/stores/auth.store'
import type { ShiftDto } from '@/types/admin'
import type { CompanyTreeDto } from '@hrms/shared-types'

function flattenCompanies(nodes: CompanyTreeDto[]): CompanyTreeDto[] {
  return nodes.flatMap((n) => [n, ...flattenCompanies(n.children)])
}

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(t: string) {
  return t.slice(0, 5) // "08:15:00" → "08:15"
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive mt-0.5">{message}</p>
}

// ── schema ───────────────────────────────────────────────────────────────────

const shiftSchema = z
  .object({
    companyId: z.string().min(1, 'กรุณาเลือกบริษัท'),
    name: z.string().min(1, 'กรุณาระบุชื่อกะ').max(100),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'รูปแบบเวลาไม่ถูกต้อง'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'รูปแบบเวลาไม่ถูกต้อง'),
    gracePeriodMinutes: z.number().int().min(0).max(120),
  })
  .refine((d) => d.startTime < d.endTime, {
    message: 'เวลาเข้างานต้องน้อยกว่าเวลาเลิกงาน',
    path: ['endTime'],
  })

type ShiftValues = z.infer<typeof shiftSchema>

// ── Create Modal ──────────────────────────────────────────────────────────────

function CreateModal({
  open,
  onClose,
  defaultCompanyId,
  companies,
}: {
  open: boolean
  onClose: () => void
  defaultCompanyId?: string
  companies: CompanyTreeDto[]
}) {
  const create = useCreateShift()
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ShiftValues>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      companyId: defaultCompanyId ?? '',
      startTime: '08:00',
      endTime: '17:00',
      gracePeriodMinutes: 0,
    },
  })

  async function onSubmit(values: ShiftValues) {
    try {
      await create.mutateAsync({
        companyId: values.companyId,
        name: values.name,
        startTime: values.startTime + ':00',
        endTime: values.endTime + ':00',
        gracePeriodMinutes: values.gracePeriodMinutes,
      })
      toast.success(`เพิ่มกะ "${values.name}" สำเร็จ`)
      reset()
      onClose()
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data
      if (apiErr?.error === 'DUPLICATE_SHIFT')
        setError('name', { message: 'มีชื่อกะนี้อยู่แล้วใน company นี้' })
      else
        toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="เพิ่มกะงานใหม่">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="c-company">บริษัท *</Label>
          <select
            id="c-company"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            {...register('companyId')}
          >
            <option value="">— เลือกบริษัท —</option>
            {companies?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <FieldError message={errors.companyId?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="c-name">ชื่อกะ *</Label>
          <Input id="c-name" placeholder="เช่น กะเช้า" {...register('name')} />
          <FieldError message={errors.name?.message} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="c-start">เวลาเข้างาน *</Label>
            <Input id="c-start" type="time" {...register('startTime')} />
            <FieldError message={errors.startTime?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-end">เวลาเลิกงาน *</Label>
            <Input id="c-end" type="time" {...register('endTime')} />
            <FieldError message={errors.endTime?.message} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="c-grace">ผ่อนปรน (นาที)</Label>
          <Input
            id="c-grace"
            type="number"
            min={0}
            max={120}
            {...register('gracePeriodMinutes', { valueAsNumber: true })}
          />
          <FieldError message={errors.gracePeriodMinutes?.message} />
        </div>

        {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit" loading={isSubmitting}>
            บันทึก
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

function EditModal({ item, onClose }: { item: ShiftDto; onClose: () => void }) {
  const update = useUpdateShift()
  const toggle = useToggleShiftStatus()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ShiftValues>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      companyId: item.companyId,
      name: item.name,
      startTime: fmt(item.startTime),
      endTime: fmt(item.endTime),
      gracePeriodMinutes: item.gracePeriodMinutes,
    },
  })

  async function onSubmit(values: ShiftValues) {
    try {
      await update.mutateAsync({
        id: item.id,
        name: values.name,
        startTime: values.startTime + ':00',
        endTime: values.endTime + ':00',
        gracePeriodMinutes: values.gracePeriodMinutes,
        isActive: item.isActive,
      })
      toast.success(`บันทึก "${values.name}" สำเร็จ`)
      onClose()
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data
      if (apiErr?.error === 'DUPLICATE_SHIFT')
        setError('name', { message: 'มีชื่อกะนี้อยู่แล้วใน company นี้' })
      else
        toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
    }
  }

  async function handleToggle() {
    try {
      await toggle.mutateAsync({ id: item.id, isActive: !item.isActive })
      toast.success(`${item.isActive ? 'ปิด' : 'เปิด'}ใช้งาน "${item.name}" สำเร็จ`)
      onClose()
    } catch {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
    }
  }

  return (
    <Modal open onClose={onClose} title={`แก้ไขกะงาน: ${item.name}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label>บริษัท (ไม่สามารถเปลี่ยนได้)</Label>
          <Input value={item.companyName} disabled />
          <input type="hidden" {...register('companyId')} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="e-name">ชื่อกะ *</Label>
          <Input id="e-name" {...register('name')} />
          <FieldError message={errors.name?.message} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="e-start">เวลาเข้างาน *</Label>
            <Input id="e-start" type="time" {...register('startTime')} />
            <FieldError message={errors.startTime?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-end">เวลาเลิกงาน *</Label>
            <Input id="e-end" type="time" {...register('endTime')} />
            <FieldError message={errors.endTime?.message} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="e-grace">ผ่อนปรน (นาที)</Label>
          <Input
            id="e-grace"
            type="number"
            min={0}
            max={120}
            {...register('gracePeriodMinutes', { valueAsNumber: true })}
          />
          <FieldError message={errors.gracePeriodMinutes?.message} />
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          <Button
            type="button"
            variant={item.isActive ? 'destructive' : 'outline'}
            onClick={handleToggle}
            loading={toggle.isPending}
          >
            {item.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
              บันทึก
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ShiftsPage() {
  const employee = useAuthStore((s) => s.employee)
  const isAdmin = employee?.roles.some((r) => r.role === 'Admin') ?? false
  const isHr = employee?.roles.some((r) => r.role === 'Hr') ?? false

  const { data: companiesTree } = useCompanies()
  const allCompanies = useMemo(() => flattenCompanies(companiesTree ?? []), [companiesTree])

  const myCompany = allCompanies.find((c) => c.id === employee?.companyId)
  const isHqHr = isHr && (myCompany?.isHeadquarters ?? false)
  const canSeeAll = isAdmin || isHqHr

  const [companyId, setCompanyId] = useState<string | undefined>(
    canSeeAll ? undefined : (employee?.companyId ?? undefined),
  )
  const [includeInactive, setIncludeInactive] = useState(false)

  const { data: shifts, isLoading } = useShifts(companyId, includeInactive)

  const [createOpen, setCreateOpen] = useState(false)
  const [editItem, setEditItem] = useState<ShiftDto | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">เวลาทำงาน</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          เพิ่มกะงาน
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {canSeeAll && (
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={companyId ?? ''}
            onChange={(e) => setCompanyId(e.target.value || undefined)}
          >
            <option value="">ทุกบริษัท</option>
            {allCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded border-border"
          />
          รวมที่ปิดใช้งาน
        </label>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ชื่อกะ</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">บริษัท</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">เข้างาน</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">เลิกงาน</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ผ่อนปรน</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">สถานะ</th>
              <th className="px-4 py-3 w-12" />
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))}

            {!isLoading && (!shifts || shifts.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  ยังไม่มีกะงาน — กด &quot;+ เพิ่มกะงาน&quot; เพื่อเริ่มต้น
                </td>
              </tr>
            )}

            {!isLoading &&
              shifts?.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{s.companyName}</td>
                  <td className="px-4 py-3 font-mono">{fmt(s.startTime)}</td>
                  <td className="px-4 py-3 font-mono">{fmt(s.endTime)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.gracePeriodMinutes > 0 ? `${s.gracePeriodMinutes} นาที` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={s.isActive ? 'success' : 'secondary'}>
                      {s.isActive ? 'ใช้งาน' : 'ปิด'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setEditItem(s)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <CreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultCompanyId={companyId}
        companies={allCompanies}
      />
      {editItem && <EditModal item={editItem} onClose={() => setEditItem(null)} />}
    </div>
  )
}
