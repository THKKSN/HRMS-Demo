'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown, Plus, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useCompanies, useCreateCompany, useUpdateCompany } from '@/hooks/use-companies'
import type { CompanyDto, CompanyTreeDto, OrgType } from '@hrms/shared-types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const ORG_TYPE_LABEL: Record<OrgType, string> = {
  Holding: 'บริษัทแม่',
  Subsidiary: 'บริษัทลูก',
  Branch: 'สาขา',
}

const ORG_TYPE_VARIANT: Record<OrgType, 'default' | 'secondary' | 'warning'> = {
  Holding: 'default',
  Subsidiary: 'secondary',
  Branch: 'warning',
}

function flattenTree(nodes: CompanyTreeDto[]): CompanyDto[] {
  const result: CompanyDto[] = []
  function walk(list: CompanyTreeDto[]) {
    for (const n of list) {
      result.push({
        id: n.id, name: n.name, nameEn: n.nameEn,
        orgType: n.orgType, isActive: n.isActive,
        parentId: undefined, parentName: undefined,
      })
      walk(n.children)
    }
  }
  walk(nodes)
  return result
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive mt-0.5">{message}</p>
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const companySchema = z.object({
  name:     z.string().min(1, 'กรุณากรอกชื่อบริษัท').max(200),
  nameEn:   z.string().max(200).optional().or(z.literal('')),
  orgType:  z.enum(['Holding', 'Subsidiary', 'Branch']),
  parentId: z.string().optional().or(z.literal('')),
})

type CompanyFormValues = z.infer<typeof companySchema>

// ── Create Modal ──────────────────────────────────────────────────────────────

function CreateCompanyModal({
  open,
  onClose,
  allCompanies,
}: {
  open: boolean
  onClose: () => void
  allCompanies: CompanyDto[]
}) {
  const create = useCreateCompany()
  const { register, handleSubmit, setError, reset, formState: { errors, isSubmitting } } =
    useForm<CompanyFormValues>({
      resolver: zodResolver(companySchema),
      defaultValues: { orgType: 'Subsidiary' },
    })

  async function onSubmit(values: CompanyFormValues) {
    try {
      await create.mutateAsync({
        name:     values.name,
        nameEn:   values.nameEn || undefined,
        orgType:  values.orgType,
        parentId: values.parentId || undefined,
      })
      toast.success(`เพิ่มบริษัท "${values.name}" สำเร็จ`)
      reset()
      onClose()
    } catch (err: unknown) {
      const e = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (e === 'DUPLICATE_COMPANY') setError('name', { message: 'ชื่อบริษัทนี้มีอยู่แล้ว' })
      else if (e === 'PARENT_NOT_FOUND') setError('parentId', { message: 'ไม่พบบริษัทแม่ที่ระบุ' })
      else if (e === 'PARENT_INACTIVE') setError('parentId', { message: 'บริษัทแม่ถูกปิดใช้งานอยู่' })
      else { setError('root', { message: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }); toast.error('เกิดข้อผิดพลาด') }
    }
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="เพิ่มบริษัทใหม่">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="c-name">ชื่อบริษัท (ภาษาไทย) *</Label>
          <Input id="c-name" {...register('name')} placeholder="บริษัท เทสระบบ จำกัด" />
          <FieldError message={errors.name?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="c-nameen">ชื่อบริษัท (ภาษาอังกฤษ)</Label>
          <Input id="c-nameen" {...register('nameEn')} placeholder="Test System Co., Ltd." />
          <FieldError message={errors.nameEn?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="c-orgtype">ประเภทองค์กร *</Label>
          <Select id="c-orgtype" {...register('orgType')}>
            <option value="Holding">บริษัทแม่ (Holding)</option>
            <option value="Subsidiary">บริษัทลูก (Subsidiary)</option>
            <option value="Branch">สาขา (Branch)</option>
          </Select>
          <FieldError message={errors.orgType?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="c-parent">บริษัทแม่</Label>
          <Select id="c-parent" {...register('parentId')}>
            <option value="">— ไม่มีบริษัทแม่ —</option>
            {allCompanies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <FieldError message={errors.parentId?.message} />
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

function EditCompanyModal({
  company,
  onClose,
  allCompanies,
}: {
  company: CompanyDto
  onClose: () => void
  allCompanies: CompanyDto[]
}) {
  const update = useUpdateCompany()
  const [deactivateConfirm, setDeactivateConfirm] = useState(false)

  const { register, handleSubmit, setError, getValues, formState: { errors, isSubmitting, isDirty } } =
    useForm<CompanyFormValues>({
      resolver: zodResolver(companySchema),
      defaultValues: {
        name:     company.name,
        nameEn:   company.nameEn ?? '',
        orgType:  company.orgType as OrgType,
        parentId: company.parentId ?? '',
      },
    })

  async function doUpdate(values: CompanyFormValues, isActive: boolean) {
    try {
      await update.mutateAsync({
        id:       company.id,
        name:     values.name,
        nameEn:   values.nameEn || undefined,
        orgType:  values.orgType,
        parentId: values.parentId || undefined,
        isActive,
      })
      toast.success('อัปเดตข้อมูลบริษัทสำเร็จ')
      setDeactivateConfirm(false)
      onClose()
    } catch (err: unknown) {
      const e = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (e === 'CIRCULAR_PARENT') setError('parentId', { message: 'ไม่สามารถตั้งบริษัทตัวเองเป็น parent ได้' })
      else if (e === 'HAS_ACTIVE_CHILDREN') toast.error('ไม่สามารถปิดได้ — มีบริษัทลูกที่ยังใช้งานอยู่')
      else { setError('root', { message: 'เกิดข้อผิดพลาด' }); toast.error('เกิดข้อผิดพลาด') }
    }
  }

  const otherCompanies = allCompanies.filter((c) => c.id !== company.id)

  return (
    <>
      <Modal open onClose={onClose} title={`แก้ไข — ${company.name}`}>
        <form onSubmit={handleSubmit((v) => doUpdate(v, company.isActive))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="e-name">ชื่อบริษัท (ภาษาไทย) *</Label>
            <Input id="e-name" {...register('name')} />
            <FieldError message={errors.name?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="e-nameen">ชื่อบริษัท (ภาษาอังกฤษ)</Label>
            <Input id="e-nameen" {...register('nameEn')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="e-orgtype">ประเภทองค์กร *</Label>
            <Select id="e-orgtype" {...register('orgType')}>
              <option value="Holding">บริษัทแม่ (Holding)</option>
              <option value="Subsidiary">บริษัทลูก (Subsidiary)</option>
              <option value="Branch">สาขา (Branch)</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="e-parent">บริษัทแม่</Label>
            <Select id="e-parent" {...register('parentId')}>
              <option value="">— ไม่มีบริษัทแม่ —</option>
              {otherCompanies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <FieldError message={errors.parentId?.message} />
          </div>

          {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

          <div className="flex items-center justify-between pt-1">
            <Button
              type="button"
              variant={company.isActive ? 'destructive' : 'ghost'}
              size="sm"
              onClick={() => company.isActive
                ? setDeactivateConfirm(true)
                : doUpdate(getValues(), true)}
              loading={update.isPending}
            >
              {company.isActive ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน'}
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
        title="ปิดการใช้งานบริษัท"
        description={`ยืนยันปิดการใช้งาน "${company.name}"? บริษัทลูกทั้งหมดต้องถูกปิดก่อน`}
        confirmLabel="ปิดการใช้งาน"
        variant="destructive"
        loading={update.isPending}
      />
    </>
  )
}

// ── Tree Node ─────────────────────────────────────────────────────────────────

function CompanyTreeNode({
  node,
  depth,
  onEdit,
}: {
  node: CompanyTreeDto
  depth: number
  onEdit: (c: CompanyDto) => void
}) {
  const [expanded, setExpanded] = useState(depth === 0)
  const hasChildren = node.children.length > 0

  return (
    <div>
      <div
        className="group flex items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/50 transition-colors"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {/* expand/collapse */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="h-5 w-5 shrink-0 flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          {hasChildren
            ? expanded
              ? <ChevronDown className="h-3.5 w-3.5" />
              : <ChevronRight className="h-3.5 w-3.5" />
            : <span className="h-3.5 w-3.5" />}
        </button>

        {/* name */}
        <span className={`flex-1 text-sm font-medium ${!node.isActive ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
          {node.name}
          {node.nameEn && <span className="ml-1.5 text-xs text-muted-foreground font-normal">{node.nameEn}</span>}
        </span>

        {/* badges */}
        <Badge variant={ORG_TYPE_VARIANT[node.orgType as OrgType]} className="text-xs">
          {ORG_TYPE_LABEL[node.orgType as OrgType]}
        </Badge>
        {!node.isActive && (
          <Badge variant="secondary" className="text-xs">ปิดใช้งาน</Badge>
        )}

        {/* edit button */}
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onEdit({ id: node.id, name: node.name, nameEn: node.nameEn, orgType: node.orgType, isActive: node.isActive, parentId: undefined, parentName: undefined })}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <CompanyTreeNode key={child.id} node={child} depth={depth + 1} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CompaniesPage() {
  const router = useRouter()
  const employee = useAuthStore((s) => s.employee)
  const isAdmin = employee?.roles.some((r) => r.role === 'Admin') ?? false

  const [showInactive, setShowInactive] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<CompanyDto | null>(null)

  const { data: tree = [], isLoading } = useCompanies(showInactive)
  const allFlat = flattenTree(tree).filter((c) => c.isActive)

  // Admin guard (client-side — middleware covers the hard block)
  if (!isAdmin) {
    router.replace('/dashboard')
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">โครงสร้างบริษัท</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />เพิ่มบริษัท
        </Button>
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer w-fit">
        <input
          type="checkbox"
          className="rounded border-border"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
        />
        แสดงทั้งหมด (รวมปิดใช้งาน)
      </label>

      <div className="rounded-lg border border-border bg-background">
        {isLoading ? (
          <div className="space-y-1 p-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-md bg-muted" style={{ marginLeft: `${(i % 3) * 20}px` }} />
            ))}
          </div>
        ) : tree.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">ยังไม่มีบริษัท กด "เพิ่มบริษัท" เพื่อเริ่มต้น</p>
        ) : (
          <div className="p-2">
            {tree.map((node) => (
              <CompanyTreeNode
                key={node.id}
                node={node}
                depth={0}
                onEdit={(c) => setEditTarget(c)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateCompanyModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        allCompanies={allFlat}
      />

      {editTarget && (
        <EditCompanyModal
          company={editTarget}
          onClose={() => setEditTarget(null)}
          allCompanies={allFlat}
        />
      )}
    </div>
  )
}
