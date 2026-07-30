'use client'

import { useEffect, useMemo, useState } from 'react'
import { FolderTree, Pencil, Plus, Power, PowerOff, Route, Tags } from 'lucide-react'
import { toast } from 'sonner'
import type { TicketCategoryDto, TicketTopicDto } from '@hrms/shared-types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import {
  useCreateTicketCategory,
  useCreateTicketTopic,
  useManagedTicketCategories,
  useManagedTicketTopics,
  useTicketManagementScope,
  useUpdateTicketCategory,
  useUpdateTicketTopic,
} from '@/hooks/use-ticket-taxonomy'
import { RoutingPanel } from './routing-panel'

type TaxonomyItem = TicketCategoryDto | TicketTopicDto
type EditorState = { kind: 'category' | 'topic'; item?: TaxonomyItem }
type ToggleState = { kind: 'category' | 'topic'; item: TaxonomyItem }

function apiMessage(error: unknown) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message
    ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่'
}

function TaxonomyEditor({
  state,
  onClose,
  onSave,
}: {
  state: EditorState
  onClose: () => void
  onSave: (values: { name: string; description?: string; sortOrder: number }) => Promise<void>
}) {
  const [name, setName] = useState(state.item?.name ?? '')
  const [description, setDescription] = useState(state.item?.description ?? '')
  const [sortOrder, setSortOrder] = useState(state.item?.sortOrder ?? 10)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const label = state.kind === 'category' ? 'หมวด' : 'หัวข้อย่อย'

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setError(`กรุณากรอกชื่อ${label}`)
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        sortOrder,
      })
      onClose()
    } catch (err) {
      setError(apiMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`${state.item ? 'แก้ไข' : 'เพิ่ม'}${label}`}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="taxonomy-name">ชื่อ{label} *</Label>
          <Input
            id="taxonomy-name"
            value={name}
            onChange={event => setName(event.target.value)}
            maxLength={100}
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="taxonomy-description">คำอธิบาย</Label>
          <textarea
            id="taxonomy-description"
            value={description}
            onChange={event => setDescription(event.target.value)}
            maxLength={500}
            rows={3}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="taxonomy-order">ลำดับการแสดง</Label>
          <Input
            id="taxonomy-order"
            type="number"
            min={0}
            max={9999}
            value={sortOrder}
            onChange={event => setSortOrder(Number(event.target.value))}
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

function EmptyRow({ text }: { text: string }) {
  return <div className="px-4 py-12 text-center text-sm text-muted-foreground">{text}</div>
}

export default function TicketTaxonomyPage() {
  const { data: scope, isLoading: scopeLoading, error: scopeError } = useTicketManagementScope()
  const [companyId, setCompanyId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [routingTopicId, setRoutingTopicId] = useState('')
  const [view, setView] = useState<'taxonomy' | 'routing'>('taxonomy')
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [toggleTarget, setToggleTarget] = useState<ToggleState | null>(null)

  const departments = useMemo(
    () => scope?.departments.filter(department => department.companyId === companyId) ?? [],
    [scope, companyId],
  )
  const { data: categories = [], isLoading: categoriesLoading } =
    useManagedTicketCategories(companyId, departmentId)
  const { data: topics = [], isLoading: topicsLoading } =
    useManagedTicketTopics(companyId, departmentId, categoryId)

  const createCategory = useCreateTicketCategory()
  const updateCategory = useUpdateTicketCategory()
  const createTopic = useCreateTicketTopic()
  const updateTopic = useUpdateTicketTopic()

  useEffect(() => {
    if (!companyId && scope?.companies.length) setCompanyId(scope.companies[0].id)
  }, [scope, companyId])

  useEffect(() => {
    if (!departments.some(department => department.id === departmentId)) {
      setDepartmentId(departments[0]?.id ?? '')
      setCategoryId('')
    }
  }, [departments, departmentId])

  useEffect(() => {
    if (!categories.some(category => category.id === categoryId)) {
      setCategoryId(categories[0]?.id ?? '')
    }
  }, [categories, categoryId])

  async function saveEditor(values: { name: string; description?: string; sortOrder: number }) {
    if (!editor) return
    if (editor.kind === 'category') {
      if (editor.item) {
        await updateCategory.mutateAsync({
          id: editor.item.id,
          ...values,
          isActive: editor.item.isActive,
        })
      } else {
        await createCategory.mutateAsync({ companyId, departmentId, ...values })
      }
    } else if (editor.item) {
      await updateTopic.mutateAsync({
        id: editor.item.id,
        ...values,
        isActive: editor.item.isActive,
      })
    } else {
      await createTopic.mutateAsync({ companyId, departmentId, categoryId, ...values })
    }
    toast.success(`บันทึก${editor.kind === 'category' ? 'หมวด' : 'หัวข้อย่อย'}สำเร็จ`)
  }

  async function confirmToggle() {
    if (!toggleTarget) return
    const { item, kind } = toggleTarget
    try {
      const body = {
        id: item.id,
        name: item.name,
        description: item.description,
        sortOrder: item.sortOrder,
        isActive: !item.isActive,
      }
      if (kind === 'category') await updateCategory.mutateAsync(body)
      else await updateTopic.mutateAsync(body)
      toast.success(`${item.isActive ? 'ปิด' : 'เปิด'}ใช้งาน "${item.name}" สำเร็จ`)
      setToggleTarget(null)
    } catch (error) {
      toast.error(apiMessage(error))
    }
  }

  if (scopeLoading) {
    return <div className="h-40 animate-pulse rounded-md bg-whited" />
  }

  if (scopeError) {
    return <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{apiMessage(scopeError)}</div>
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">หมวดแจ้งเรื่อง</h1>
        <p className="mt-1 text-sm text-muted-foreground">จัดลำดับและกำหนดหัวข้อที่แสดงในฟอร์มแจ้งเรื่อง</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        <Button variant={view === 'taxonomy' ? 'default' : 'ghost'} onClick={() => setView('taxonomy')}><FolderTree className="h-4 w-4" /> หมวดและหัวข้อ</Button>
        <Button variant={view === 'routing' ? 'default' : 'ghost'} onClick={() => setView('routing')}><Route className="h-4 w-4" /> ผู้รับผิดชอบและ Routing</Button>
      </div>

      <div className="grid gap-3 border-y border-border py-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="taxonomy-company">บริษัท</Label>
          <Select
            id="taxonomy-company"
            value={companyId}
            disabled={!scope?.companies.length}
            onChange={event => {
              setCompanyId(event.target.value)
              setDepartmentId('')
              setCategoryId('')
            }}
          >
            <option value="">— เลือกบริษัท —</option>
            {(scope?.companies ?? []).map(company => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="taxonomy-department">แผนกที่ดูแล</Label>
          <Select
            id="taxonomy-department"
            value={departmentId}
            disabled={!companyId || departments.length === 0}
            onChange={event => {
              setDepartmentId(event.target.value)
              setCategoryId('')
            }}
          >
            <option value="">— เลือกแผนก —</option>
            {departments.map(department => (
              <option key={department.id} value={department.id}>{department.name}</option>
            ))}
          </Select>
        </div>
      </div>

      {view === 'taxonomy' ? <div className="grid min-h-[420px] gap-4 lg:grid-cols-2">
          <section className="overflow-hidden rounded-md border border-border bg-background">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <div className="flex items-center gap-2">
                <FolderTree className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">หมวด</h2>
              </div>
              <Button size="sm" disabled={!departmentId} onClick={() => setEditor({ kind: 'category' })}>
                <Plus className="h-4 w-4" /> เพิ่มหมวด
              </Button>
            </div>
            {!departmentId ? (
              <EmptyRow text="เลือกบริษัทและแผนกก่อนเพิ่มหมวด" />
            ) : categoriesLoading ? (
              <EmptyRow text="กำลังโหลดหมวด..." />
            ) : categories.length === 0 ? (
              <EmptyRow text="ยังไม่มีหมวดแจ้งเรื่อง" />
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
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        ลำดับ {category.sortOrder}{category.description ? ` · ${category.description}` : ''}
                      </p>
                    </button>
                    <Button size="icon" variant="ghost" title="แก้ไขหมวด" onClick={() => setEditor({ kind: 'category', item: category })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title={category.isActive ? 'ปิดใช้งานหมวด' : 'เปิดใช้งานหมวด'}
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
              <Button size="sm" disabled={!categoryId} onClick={() => setEditor({ kind: 'topic' })}>
                <Plus className="h-4 w-4" /> เพิ่มหัวข้อ
              </Button>
            </div>
            {!categoryId ? (
              <EmptyRow text="เลือกหมวดเพื่อดูหัวข้อย่อย" />
            ) : topicsLoading ? (
              <EmptyRow text="กำลังโหลดหัวข้อย่อย..." />
            ) : topics.length === 0 ? (
              <EmptyRow text="ยังไม่มีหัวข้อย่อยในหมวดนี้" />
            ) : (
              <div className="divide-y divide-border">
                {topics.map(topic => (
                  <div key={topic.id} className="flex min-h-16 items-center gap-2 px-2 hover:bg-whited/40">
                    <div className="min-w-0 flex-1 px-2 py-3">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{topic.name}</span>
                        {!topic.isActive && <Badge variant="secondary">ปิดใช้งาน</Badge>}
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        ลำดับ {topic.sortOrder}{topic.description ? ` · ${topic.description}` : ''}
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" title="แก้ไขหัวข้อ" onClick={() => setEditor({ kind: 'topic', item: topic })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title={topic.isActive ? 'ปิดใช้งานหัวข้อ' : 'เปิดใช้งานหัวข้อ'}
                      onClick={() => setToggleTarget({ kind: 'topic', item: topic })}
                    >
                      {topic.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
      </div> : <RoutingPanel
        companyId={companyId}
        departmentId={departmentId}
        categories={categories}
        topics={topics}
        categoryId={categoryId}
        topicId={routingTopicId}
        onCategory={id => { setCategoryId(id); setRoutingTopicId('') }}
        onTopic={setRoutingTopicId}
      />}

      {editor && <TaxonomyEditor state={editor} onClose={() => setEditor(null)} onSave={saveEditor} />}

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
        loading={updateCategory.isPending || updateTopic.isPending}
      />
    </div>
  )
}
