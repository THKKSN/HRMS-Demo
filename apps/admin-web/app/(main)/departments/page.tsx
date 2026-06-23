'use client'

import { useState } from 'react'
import { Plus, Pencil, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useCompanies } from '@/hooks/use-companies'
import { useDepartments, useCreateDepartment, useUpdateDepartment } from '@/hooks/use-departments'
import type { DepartmentListItemDto } from '@hrms/shared-types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive mt-0.5">{message}</p>
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const deptSchema = z.object({
  companyId: z.string().min(1, 'กรุณาเลือกบริษัท'),
  name: z.string().min(1, 'กรุณากรอกชื่อแผนก').max(200),
  deptType: z.string().max(100).optional().or(z.literal('')),
})

type DeptFormValues = z.infer<typeof deptSchema>

// ── Create Modal ──────────────────────────────────────────────────────────────

function CreateDeptModal({
  open,
  onClose,
  defaultCompanyId,
}: {
  open: boolean
  onClose: () => void
  defaultCompanyId?: string
}) {
  const { data: tree = [] } = useCompanies()
  const create = useCreateDepartment()

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

  const { register, handleSubmit, setError, reset, formState: { errors, isSubmitting } } =
    useForm<DeptFormValues>({
      resolver: zodResolver(deptSchema),
      defaultValues: { companyId: defaultCompanyId ?? '' },
    })

  async function onSubmit(values: DeptFormValues) {
    try {
      await create.mutateAsync({
        companyId: values.companyId,
        name: values.name,
        deptType: values.deptType || undefined,
      })
      toast.success(`เพิ่มแผนก "${values.name}" สำเร็จ`)
      reset({ companyId: defaultCompanyId ?? '' })
      onClose()
    } catch (err: unknown) {
      const e = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (e === 'DUPLICATE_DEPARTMENT') setError('name', { message: 'ชื่อแผนกนี้มีอยู่แล้วในบริษัทนี้' })
      else if (e === 'COMPANY_NOT_FOUND') setError('companyId', { message: 'ไม่พบบริษัทที่ระบุ' })
      else { setError('root', { message: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }); toast.error('เกิดข้อผิดพลาด') }
    }
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="เพิ่มแผนกใหม่">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="d-company">บริษัท *</Label>
          <Select id="d-company" {...register('companyId')}>
            <option value="">— เลือกบริษัท —</option>
            {activeCompanies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <FieldError message={errors.companyId?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="d-name">ชื่อแผนก *</Label>
          <Input id="d-name" {...register('name')} placeholder="ฝ่ายทรัพยากรบุคคล" />
          <FieldError message={errors.name?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="d-type">ประเภทแผนก</Label>
          <Input id="d-type" {...register('deptType')} placeholder="เช่น ฝ่าย, แผนก, ส่วน" />
          <FieldError message={errors.deptType?.message} />
        </div>

        {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={() => { reset(); onClose() }}>ยกเลิก</Button>
          <Button type="submit" loading={isSubmitting}>บันทึก</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

const editDeptSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อแผนก').max(200),
  deptType: z.string().max(100).optional().or(z.literal('')),
})

type EditDeptFormValues = z.infer<typeof editDeptSchema>

function EditDeptModal({
  dept,
  onClose,
}: {
  dept: DepartmentListItemDto
  onClose: () => void
}) {
  const update = useUpdateDepartment()
  const [deactivateConfirm, setDeactivateConfirm] = useState(false)

  const { register, handleSubmit, setError, getValues, formState: { errors, isSubmitting, isDirty } } =
    useForm<EditDeptFormValues>({
      resolver: zodResolver(editDeptSchema),
      defaultValues: {
        name: dept.name,
        deptType: dept.deptType ?? '',
      },
    })

  async function doUpdate(values: EditDeptFormValues, isActive: boolean) {
    try {
      await update.mutateAsync({
        id: dept.id,
        name: values.name,
        deptType: values.deptType || undefined,
        isActive,
      })
      toast.success('อัปเดตข้อมูลแผนกสำเร็จ')
      setDeactivateConfirm(false)
      onClose()
    } catch (err: unknown) {
      const e = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (e === 'DUPLICATE_DEPARTMENT') setError('name', { message: 'ชื่อแผนกนี้มีอยู่แล้วในบริษัทนี้' })
      else if (e === 'HAS_ACTIVE_EMPLOYEES') toast.error('ไม่สามารถปิดได้ — มีพนักงานที่ยังใช้งานอยู่ในแผนกนี้')
      else { setError('root', { message: 'เกิดข้อผิดพลาด' }); toast.error('เกิดข้อผิดพลาด') }
    }
  }

  return (
    <>
      <Modal open onClose={onClose} title={`แก้ไข — ${dept.name}`}>
        <form onSubmit={handleSubmit((v) => doUpdate(v, dept.isActive))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ed-name">ชื่อแผนก *</Label>
            <Input id="ed-name" {...register('name')} />
            <FieldError message={errors.name?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ed-type">ประเภทแผนก</Label>
            <Input id="ed-type" {...register('deptType')} placeholder="เช่น ฝ่าย, แผนก, ส่วน" />
            <FieldError message={errors.deptType?.message} />
          </div>

          {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

          <div className="flex items-center justify-between pt-1">
            <Button
              type="button"
              variant={dept.isActive ? 'destructive' : 'ghost'}
              size="sm"
              onClick={() =>
                dept.isActive ? setDeactivateConfirm(true) : doUpdate(getValues(), true)
              }
              loading={update.isPending}
            >
              {dept.isActive ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน'}
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>ยกเลิก</Button>
              <Button type="submit" loading={isSubmitting} disabled={!isDirty}>บันทึก</Button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={deactivateConfirm}
        onClose={() => setDeactivateConfirm(false)}
        onConfirm={() => doUpdate(getValues(), false)}
        title="ปิดการใช้งานแผนก"
        description={`ยืนยันปิดการใช้งานแผนก "${dept.name}"?`}
        confirmLabel="ปิดการใช้งาน"
        variant="destructive"
        loading={update.isPending}
      />
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DepartmentsPage() {
  const [companyFilter, setCompanyFilter] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<DepartmentListItemDto | null>(null)

  const { data: tree = [] } = useCompanies()
  const { data: departments = [], isLoading } = useDepartments(
    companyFilter || undefined,
    showInactive,
  )

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">แผนก</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />เพิ่มแผนก
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="w-56"
        >
          <option value="">ทุกบริษัท</option>
          {activeCompanies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>

        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            className="rounded border-border"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          แสดงปิดใช้งาน
        </label>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-background overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ชื่อแผนก</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ประเภท</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">บริษัท</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                <Users className="h-4 w-4 mx-auto" />
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">สถานะ</th>
              <th className="w-12" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))
            ) : departments.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted-foreground">
                  {companyFilter ? 'ไม่พบแผนกในบริษัทนี้' : 'ยังไม่มีแผนก'}
                </td>
              </tr>
            ) : (
              departments.map((dept) => (
                <tr
                  key={dept.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className={dept.isActive ? 'text-foreground font-medium' : 'text-muted-foreground line-through'}>
                      {dept.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {dept.deptType ?? <span className="text-muted-foreground/50">—</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {activeCompanies.find((c) => c.id === dept.companyId)?.name ?? dept.companyId}
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground">
                    {dept.employeeCount}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={dept.isActive ? 'success' : 'secondary'}>
                      {dept.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setEditTarget(dept)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CreateDeptModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultCompanyId={companyFilter || undefined}
      />

      {editTarget && (
        <EditDeptModal dept={editTarget} onClose={() => setEditTarget(null)} />
      )}
    </div>
  )
}
