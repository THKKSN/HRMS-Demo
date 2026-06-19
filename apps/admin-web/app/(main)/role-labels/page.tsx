'use client'

import { useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
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
import { useRoleLabels, useCreateRoleLabel, useUpdateRoleLabel, useDeleteRoleLabel } from '@/hooks/use-role-labels'
import type { RoleLabelDto } from '@hrms/shared-types'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive mt-0.5">{message}</p>
}

// ── Create Modal ──────────────────────────────────────────────────────────────

const createSchema = z.object({
  companyId: z.string().min(1, 'กรุณาเลือกบริษัท'),
  name: z.string().min(1, 'กรุณากรอกชื่อตำแหน่ง').max(100),
})
type CreateValues = z.infer<typeof createSchema>

function CreateModal({
  open,
  onClose,
  defaultCompanyId,
}: {
  open: boolean
  onClose: () => void
  defaultCompanyId?: string
}) {
  const { data: tree = [] } = useCompanies()
  const create = useCreateRoleLabel()

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
    useForm<CreateValues>({
      resolver: zodResolver(createSchema),
      defaultValues: { companyId: defaultCompanyId ?? '' },
    })

  async function onSubmit(values: CreateValues) {
    try {
      await create.mutateAsync({ companyId: values.companyId, name: values.name })
      toast.success(`เพิ่มตำแหน่ง "${values.name}" สำเร็จ`)
      reset({ companyId: defaultCompanyId ?? '' })
      onClose()
    } catch (err: unknown) {
      const e = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (e === 'DUPLICATE_ROLE_LABEL') setError('name', { message: 'ชื่อนี้มีอยู่แล้วในบริษัทนี้' })
      else { setError('root', { message: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }); toast.error('เกิดข้อผิดพลาด') }
    }
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="เพิ่มตำแหน่งใหม่">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="rl-company">บริษัท *</Label>
          <Select id="rl-company" {...register('companyId')}>
            <option value="">— เลือกบริษัท —</option>
            {activeCompanies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <FieldError message={errors.companyId?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rl-name">ชื่อตำแหน่ง *</Label>
          <Input id="rl-name" {...register('name')} placeholder="เช่น ผู้จัดการฝ่าย, พนักงานธุรการ" />
          <FieldError message={errors.name?.message} />
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

const editSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อตำแหน่ง').max(100),
})
type EditValues = z.infer<typeof editSchema>

function EditModal({
  label,
  onClose,
}: {
  label: RoleLabelDto
  onClose: () => void
}) {
  const update = useUpdateRoleLabel()
  const deleteLabel = useDeleteRoleLabel()
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const { register, handleSubmit, setError, getValues, formState: { errors, isSubmitting, isDirty } } =
    useForm<EditValues>({
      resolver: zodResolver(editSchema),
      defaultValues: { name: label.name },
    })

  async function doUpdate(values: EditValues, isActive: boolean) {
    try {
      await update.mutateAsync({ id: label.id, name: values.name, isActive })
      toast.success('อัปเดตตำแหน่งสำเร็จ')
      onClose()
    } catch (err: unknown) {
      const e = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (e === 'DUPLICATE_ROLE_LABEL') setError('name', { message: 'ชื่อนี้มีอยู่แล้วในบริษัทนี้' })
      else { setError('root', { message: 'เกิดข้อผิดพลาด' }); toast.error('เกิดข้อผิดพลาด') }
    }
  }

  async function handleDelete() {
    try {
      await deleteLabel.mutateAsync(label.id)
      toast.success(`ลบตำแหน่ง "${label.name}" สำเร็จ`)
      setDeleteConfirm(false)
      onClose()
    } catch (err: unknown) {
      const e = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(e === 'ROLE_LABEL_IN_USE' ? 'ไม่สามารถลบได้ — มีพนักงานที่ใช้ตำแหน่งนี้อยู่' : 'เกิดข้อผิดพลาด')
      setDeleteConfirm(false)
    }
  }

  return (
    <>
      <Modal open onClose={onClose} title={`แก้ไข — ${label.name}`}>
        <form onSubmit={handleSubmit((v) => doUpdate(v, label.isActive))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="erl-name">ชื่อตำแหน่ง *</Label>
            <Input id="erl-name" {...register('name')} />
            <FieldError message={errors.name?.message} />
          </div>
          {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={label.isActive ? 'destructive' : 'ghost'}
                size="sm"
                onClick={() => doUpdate(getValues(), !label.isActive)}
                loading={update.isPending}
              >
                {label.isActive ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive border-destructive hover:bg-destructive/10"
                onClick={() => setDeleteConfirm(true)}
              >
                ลบ
              </Button>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>ยกเลิก</Button>
              <Button type="submit" loading={isSubmitting} disabled={!isDirty}>บันทึก</Button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="ลบตำแหน่ง"
        description={`ยืนยันลบตำแหน่ง "${label.name}"? (ลบไม่ได้ถ้ามีพนักงานใช้อยู่)`}
        confirmLabel="ลบ"
        variant="destructive"
        loading={deleteLabel.isPending}
      />
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RoleLabelsPage() {
  const [companyFilter, setCompanyFilter] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<RoleLabelDto | null>(null)

  const { data: tree = [] } = useCompanies()
  const { data: labels = [], isLoading } = useRoleLabels(companyFilter || undefined, showInactive)

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
        <h1 className="text-xl font-semibold text-foreground">ตำแหน่ง (Role Label)</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />เพิ่มตำแหน่ง
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="w-56"
        >
          <option value="">— เลือกบริษัท —</option>
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

      <div className="rounded-lg border border-border bg-background overflow-hidden">
        {!companyFilter ? (
          <p className="py-12 text-center text-sm text-muted-foreground">เลือกบริษัทเพื่อดูตำแหน่ง</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">ชื่อตำแหน่ง</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">บริษัท</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">สถานะ</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {[1, 2, 3, 4].map((j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : labels.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-muted-foreground">
                    ยังไม่มีตำแหน่งในบริษัทนี้
                  </td>
                </tr>
              ) : (
                labels.map((lbl) => (
                  <tr
                    key={lbl.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className={lbl.isActive ? 'font-medium text-foreground' : 'text-muted-foreground line-through'}>
                        {lbl.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {activeCompanies.find((c) => c.id === lbl.companyId)?.name ?? lbl.companyId}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={lbl.isActive ? 'success' : 'secondary'}>
                        {lbl.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setEditTarget(lbl)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <CreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultCompanyId={companyFilter || undefined}
      />

      {editTarget && (
        <EditModal label={editTarget} onClose={() => setEditTarget(null)} />
      )}
    </div>
  )
}
