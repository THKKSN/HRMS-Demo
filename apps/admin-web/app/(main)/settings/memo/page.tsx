'use client'

import { useEffect, useState } from 'react'
import { FolderTree, Pencil, Plus, Power, PowerOff, Tags } from 'lucide-react'
import { toast } from 'sonner'
import type { MemoCategoryDto, MemoSubCategoryDto, MemoTypeDto } from '@hrms/shared-types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import {
  useCreateMemoCategory,
  useCreateMemoSubCategory,
  useCreateMemoType,
  useMemoCategories,
  useMemoSubCategories,
  useMemoTypes,
  useToggleMemoCategoryStatus,
  useToggleMemoSubCategoryStatus,
  useToggleMemoTypeStatus,
  useUpdateMemoCategory,
  useUpdateMemoSubCategory,
  useUpdateMemoType,
} from '@/hooks/use-memo'
import { companyOptionLabel, useCompanyOptions } from '@/hooks/use-company-options'
import { useDepartments } from '@/hooks/use-departments'
import { useMe } from '@/hooks/use-me'

type TaxonomyItem = MemoCategoryDto | MemoSubCategoryDto
type TaxonomyKind = 'category' | 'subCategory'
type ToggleTarget =
  | { kind: 'type'; item: MemoTypeDto }
  | { kind: TaxonomyKind; item: TaxonomyItem }
type EditorState =
  | { kind: 'type'; item?: MemoTypeDto }
  | { kind: TaxonomyKind; item?: TaxonomyItem }

function apiMessage(error: unknown) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message
    ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่'
}

function NameOnlyEditor({
  title,
  initialName,
  onClose,
  onSave,
}: {
  title: string
  initialName?: string
  onClose: () => void
  onSave: (name: string) => Promise<void>
}) {
  const [name, setName] = useState(initialName ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setError('กรุณากรอกชื่อ')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(name.trim())
      onClose()
    } catch (err) {
      setError(apiMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={title}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="memo-editor-name">ชื่อ *</Label>
          <Input
            id="memo-editor-name"
            value={name}
            onChange={event => setName(event.target.value)}
            maxLength={200}
            autoFocus
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button type="submit" loading={saving}>บันทึก</Button>
        </div>
      </form>
    </Modal>
  )
}

function MemoTypeEditor({
  initial,
  onClose,
  onSave,
}: {
  initial?: MemoTypeDto
  onClose: () => void
  onSave: (values: { name: string; companyId: string; departmentId: string }) => Promise<void>
}) {
  const { options: companyOptions } = useCompanyOptions()
  const { data: me } = useMe()
  const isSupervisor = !!me?.roles.some(r => r.role === 'Supervisor') && !me?.roles.some(r => r.role === 'Admin' || r.role === 'Executive')
  const isSupervisorScoped = isSupervisor && !!me?.companyId && !!me?.departmentId
  // Supervisor แก้ไข/เลือกปลายทางเองไม่ได้เสมอ — ตอนสร้างใหม่ auto-fill เป็นหน่วยงานตัวเอง
  // ตอนแก้ไข คงค่าเดิมของ memo type นั้นไว้ (ไม่ overwrite เป็นของ Supervisor)
  const locked = isSupervisorScoped

  const [name, setName] = useState(initial?.name ?? '')
  const [companyId, setCompanyId] = useState(initial?.companyId ?? '')
  const [departmentId, setDepartmentId] = useState(initial?.departmentId ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isSupervisorScoped && !initial) {
      setCompanyId(me!.companyId)
      setDepartmentId(me!.departmentId!)
    }
  }, [isSupervisorScoped, initial, me])

  const { data: departments = [] } = useDepartments(companyId || undefined)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) return setError('กรุณากรอกชื่อ')
    if (!companyId) return setError('กรุณาเลือกบริษัท')
    if (!departmentId) return setError('กรุณาเลือกแผนก')

    setSaving(true)
    setError('')
    try {
      await onSave({ name: name.trim(), companyId, departmentId })
      onClose()
    } catch (err) {
      setError(apiMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={initial ? 'แก้ไขประเภทเรื่อง' : 'เพิ่มประเภทเรื่อง'}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="memo-type-name">ชื่อประเภทเรื่อง *</Label>
          <Input id="memo-type-name" value={name} onChange={event => setName(event.target.value)} maxLength={200} autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="memo-type-company">บริษัทปลายทาง *</Label>
          <p className="text-xs text-muted-foreground">
            {locked
              ? (initial
                  ? 'คุณเป็น Supervisor — ไม่สามารถเปลี่ยนปลายทางของประเภทเรื่องนี้ได้'
                  : 'คุณเป็น Supervisor — ระบบล็อคปลายทางเป็นหน่วยงานของคุณโดยอัตโนมัติ')
              : 'เมื่อ Executive อนุมัติเรื่องประเภทนี้แล้ว ระบบจะแจ้งเตือน Supervisor ของหน่วยงานนี้'}
          </p>
          <Select
            id="memo-type-company"
            value={companyId}
            disabled={locked}
            onChange={event => { setCompanyId(event.target.value); setDepartmentId('') }}
          >
            <option value="">— เลือกบริษัท —</option>
            {companyOptions.map(option => (
              <option key={option.id} value={option.id}>{companyOptionLabel(option)}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="memo-type-department">แผนกปลายทาง *</Label>
          <Select
            id="memo-type-department"
            value={departmentId}
            disabled={!companyId || locked}
            onChange={event => setDepartmentId(event.target.value)}
          >
            <option value="">— เลือกแผนก —</option>
            {departments.map(department => (
              <option key={department.id} value={department.id}>{department.name}</option>
            ))}
          </Select>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button type="submit" loading={saving}>บันทึก</Button>
        </div>
      </form>
    </Modal>
  )
}

function EmptyRow({ text }: { text: string }) {
  return <div className="px-4 py-12 text-center text-sm text-muted-foreground">{text}</div>
}

export default function MemoSettingsPage() {
  const [memoTypeId, setMemoTypeId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [editorOpen, setEditorOpen] = useState<EditorState | null>(null)
  const [toggleTarget, setToggleTarget] = useState<ToggleTarget | null>(null)

  const { data: memoTypes = [], isLoading: typesLoading } = useMemoTypes()
  const { data: categories = [], isLoading: categoriesLoading } = useMemoCategories(memoTypeId)
  const { data: subCategories = [], isLoading: subCategoriesLoading } = useMemoSubCategories(categoryId)
  const selectedMemoType = memoTypes.find(t => t.id === memoTypeId)

  const createType = useCreateMemoType()
  const updateType = useUpdateMemoType()
  const toggleType = useToggleMemoTypeStatus()
  const createCategory = useCreateMemoCategory()
  const updateCategory = useUpdateMemoCategory(memoTypeId)
  const toggleCategory = useToggleMemoCategoryStatus(memoTypeId)
  const createSubCategory = useCreateMemoSubCategory()
  const updateSubCategory = useUpdateMemoSubCategory(categoryId)
  const toggleSubCategory = useToggleMemoSubCategoryStatus(categoryId)

  useEffect(() => {
    if (!memoTypeId && memoTypes.length) setMemoTypeId(memoTypes[0].id)
  }, [memoTypes, memoTypeId])

  useEffect(() => {
    if (!categories.some(category => category.id === categoryId)) {
      setCategoryId(categories[0]?.id ?? '')
    }
  }, [categories, categoryId])

  async function confirmToggle() {
    if (!toggleTarget) return
    const { kind, item } = toggleTarget
    try {
      if (kind === 'type') await toggleType.mutateAsync({ id: item.id, isActive: !item.isActive })
      else if (kind === 'category') await toggleCategory.mutateAsync({ id: item.id, isActive: !item.isActive })
      else await toggleSubCategory.mutateAsync({ id: item.id, isActive: !item.isActive })
      toast.success(`${item.isActive ? 'ปิด' : 'เปิด'}ใช้งาน "${item.name}" สำเร็จ`)
      setToggleTarget(null)
    } catch (error) {
      toast.error(apiMessage(error))
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">บันทึกข้อความ (Memo)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ประเภทเรื่อง หมวดหมู่ และหัวข้อย่อย — ผู้อนุมัติคือผู้บริหาร (Executive) เสมอ
          หลังอนุมัติแล้วระบบแจ้งเตือน Supervisor ของหน่วยงานปลายทางอัตโนมัติ
        </p>
      </div>

      <div className="flex flex-col gap-3 border-y border-border py-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-sm flex-1 space-y-1.5">
          <Label htmlFor="memo-type-select">ประเภทเรื่อง</Label>
          <Select
            id="memo-type-select"
            value={memoTypeId}
            disabled={typesLoading || !memoTypes.length}
            onChange={event => { setMemoTypeId(event.target.value); setCategoryId('') }}
          >
            <option value="">— เลือกประเภทเรื่อง —</option>
            {memoTypes.map(type => (
              <option key={type.id} value={type.id}>{type.name}{!type.isActive ? ' (ปิดใช้งาน)' : ''}</option>
            ))}
          </Select>
        </div>
        <div className="flex gap-2">
          {memoTypeId && selectedMemoType && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditorOpen({ kind: 'type', item: selectedMemoType })}
              >
                <Pencil className="h-4 w-4" /> แก้ไข
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setToggleTarget({ kind: 'type', item: selectedMemoType })}
              >
                {selectedMemoType.isActive
                  ? <><PowerOff className="h-4 w-4" /> ปิดใช้งานประเภทนี้</>
                  : <><Power className="h-4 w-4" /> เปิดใช้งานประเภทนี้</>}
              </Button>
            </>
          )}
          <Button size="sm" onClick={() => setEditorOpen({ kind: 'type' })}>
            <Plus className="h-4 w-4" /> เพิ่มประเภทเรื่อง
          </Button>
        </div>
      </div>

      {memoTypeId && selectedMemoType && (
        <p className="text-sm text-muted-foreground">
          ปลายทางแจ้งเตือนหลังอนุมัติ: <span className="font-medium text-foreground">{selectedMemoType.companyName}</span>
          {' / '}
          <span className="font-medium text-foreground">{selectedMemoType.departmentName}</span>
        </p>
      )}

      <div className="grid min-h-[420px] gap-4 md:grid-cols-2">
        <section className="overflow-hidden rounded-md border border-border bg-background">
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <div className="flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">หมวดหมู่</h2>
            </div>
            <Button size="sm" disabled={!memoTypeId} onClick={() => setEditorOpen({ kind: 'category' })}>
              <Plus className="h-4 w-4" /> เพิ่มหมวดหมู่
            </Button>
          </div>
          {!memoTypeId ? (
            <EmptyRow text="เลือกประเภทเรื่องก่อนเพิ่มหมวดหมู่" />
          ) : categoriesLoading ? (
            <EmptyRow text="กำลังโหลดหมวดหมู่..." />
          ) : categories.length === 0 ? (
            <EmptyRow text="ยังไม่มีหมวดหมู่ในประเภทเรื่องนี้" />
          ) : (
            <div className="divide-y divide-border">
              {categories.map(category => (
                <div
                  key={category.id}
                  className={`flex min-h-16 items-center gap-2 px-2 transition-colors ${categoryId === category.id ? 'bg-primary/5' : 'hover:bg-whited/40'}`}
                >
                  <button
                    type="button"
                    onClick={() => setCategoryId(category.id)}
                    className="min-w-0 flex-1 px-2 py-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{category.name}</span>
                      {!category.isActive && <Badge variant="secondary">ปิดใช้งาน</Badge>}
                    </div>
                  </button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title="แก้ไขหมวดหมู่"
                    onClick={() => setEditorOpen({ kind: 'category', item: category })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title={category.isActive ? 'ปิดใช้งานหมวดหมู่' : 'เปิดใช้งานหมวดหมู่'}
                    onClick={() => setToggleTarget({ kind: 'category', item: category })}
                  >
                    {category.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-md border border-border bg-background">
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Tags className="h-4 w-4 text-primary" />
                <h2 className="truncate text-sm font-semibold">หัวข้อย่อย</h2>
              </div>
              {categoryId && <p className="mt-0.5 truncate text-xs text-muted-foreground">{categories.find(c => c.id === categoryId)?.name}</p>}
            </div>
            <Button size="sm" disabled={!categoryId} onClick={() => setEditorOpen({ kind: 'subCategory' })}>
              <Plus className="h-4 w-4" /> เพิ่มหัวข้อย่อย
            </Button>
          </div>
          {!categoryId ? (
            <EmptyRow text="เลือกหมวดหมู่เพื่อดูหัวข้อย่อย" />
          ) : subCategoriesLoading ? (
            <EmptyRow text="กำลังโหลดหัวข้อย่อย..." />
          ) : subCategories.length === 0 ? (
            <EmptyRow text="ยังไม่มีหัวข้อย่อยในหมวดหมู่นี้" />
          ) : (
            <div className="divide-y divide-border">
              {subCategories.map(subCategory => (
                <div key={subCategory.id} className="flex min-h-16 items-center gap-2 px-2 hover:bg-whited/40">
                  <div className="min-w-0 flex-1 px-2 py-3">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{subCategory.name}</span>
                      {!subCategory.isActive && <Badge variant="secondary">ปิดใช้งาน</Badge>}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    title="แก้ไขหัวข้อย่อย"
                    onClick={() => setEditorOpen({ kind: 'subCategory', item: subCategory })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title={subCategory.isActive ? 'ปิดใช้งานหัวข้อย่อย' : 'เปิดใช้งานหัวข้อย่อย'}
                    onClick={() => setToggleTarget({ kind: 'subCategory', item: subCategory })}
                  >
                    {subCategory.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {editorOpen?.kind === 'type' && (
        <MemoTypeEditor
          initial={editorOpen.item}
          onClose={() => setEditorOpen(null)}
          onSave={async values => {
            if (editorOpen.item) {
              await updateType.mutateAsync({ id: editorOpen.item.id, ...values })
              toast.success('แก้ไขประเภทเรื่องสำเร็จ')
            } else {
              const created = await createType.mutateAsync(values)
              setMemoTypeId(created.id)
              toast.success('สร้างประเภทเรื่องสำเร็จ')
            }
          }}
        />
      )}
      {editorOpen?.kind === 'category' && (
        <NameOnlyEditor
          title={editorOpen.item ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่'}
          initialName={editorOpen.item?.name}
          onClose={() => setEditorOpen(null)}
          onSave={async name => {
            if (editorOpen.item) {
              await updateCategory.mutateAsync({ id: editorOpen.item.id, name })
              toast.success('แก้ไขหมวดหมู่สำเร็จ')
            } else {
              await createCategory.mutateAsync({ memoTypeId, name })
              toast.success('สร้างหมวดหมู่สำเร็จ')
            }
          }}
        />
      )}
      {editorOpen?.kind === 'subCategory' && (
        <NameOnlyEditor
          title={editorOpen.item ? 'แก้ไขหัวข้อย่อย' : 'เพิ่มหัวข้อย่อย'}
          initialName={editorOpen.item?.name}
          onClose={() => setEditorOpen(null)}
          onSave={async name => {
            if (editorOpen.item) {
              await updateSubCategory.mutateAsync({ id: editorOpen.item.id, name })
              toast.success('แก้ไขหัวข้อย่อยสำเร็จ')
            } else {
              await createSubCategory.mutateAsync({ memoCategoryId: categoryId, name })
              toast.success('สร้างหัวข้อย่อยสำเร็จ')
            }
          }}
        />
      )}

      <ConfirmModal
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={confirmToggle}
        title={`${toggleTarget?.item.isActive ? 'ปิด' : 'เปิด'}การใช้งาน`}
        description={toggleTarget
          ? `ยืนยัน${toggleTarget.item.isActive ? 'ปิด' : 'เปิด'}ใช้งาน "${toggleTarget.item.name}"?`
          : undefined}
        confirmLabel="ยืนยัน"
        variant={toggleTarget?.item.isActive ? 'destructive' : 'default'}
        loading={toggleType.isPending || toggleCategory.isPending || toggleSubCategory.isPending}
      />
    </div>
  )
}
