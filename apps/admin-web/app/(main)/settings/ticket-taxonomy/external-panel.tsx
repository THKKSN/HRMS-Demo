'use client'

import { useEffect, useMemo, useState } from 'react'
import { FolderTree, Pencil, Plus, Power, PowerOff, Settings2, Tags } from 'lucide-react'
import { toast } from 'sonner'
import type {
  ExternalTicketCategoryDto,
  ExternalTicketSubjectDto,
  ExternalTicketTopicDto,
} from '@hrms/shared-types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import {
  useCreateExternalTicketCategory,
  useCreateExternalTicketSubject,
  useCreateExternalTicketTopic,
  useExternalTicketCategories,
  useExternalTicketConfiguration,
  useExternalTicketSubjects,
  useExternalTicketTopics,
  useUpdateExternalTicketCategory,
  useUpdateExternalTicketConfiguration,
  useUpdateExternalTicketSubject,
  useUpdateExternalTicketTopic,
} from '@/hooks/use-external-ticket-taxonomy'

type ExternalTaxonomyItem = ExternalTicketCategoryDto | ExternalTicketTopicDto | ExternalTicketSubjectDto
type ExternalTaxonomyKind = 'category' | 'topic' | 'subject'
type ExternalEditorState = { kind: ExternalTaxonomyKind; item?: ExternalTaxonomyItem }
type ExternalToggleState = { kind: ExternalTaxonomyKind; item: ExternalTaxonomyItem }

function apiMessage(error: unknown) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message
    ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่'
}

function EmptyRow({ text }: { text: string }) {
  return <div className="px-4 py-12 text-center text-sm text-muted-foreground">{text}</div>
}

function ConfigPanel() {
  const { data: config, isLoading, error } = useExternalTicketConfiguration()
  const updateConfig = useUpdateExternalTicketConfiguration()

  const [isEnabled, setIsEnabled] = useState(false)
  const [requireOaFriendship, setRequireOaFriendship] = useState(false)

  useEffect(() => {
    if (!config) return
    setIsEnabled(config.isEnabled)
    setRequireOaFriendship(config.requireOaFriendship)
  }, [config])

  async function save() {
    if (!config) return
    try {
      await updateConfig.mutateAsync({
        requireOaFriendship,
        isEnabled,
        expectedUpdatedAt: config.updatedAt,
      })
      toast.success('บันทึกการตั้งค่าช่องทางบุคคลภายนอกสำเร็จ')
    } catch (err) {
      toast.error(apiMessage(err))
    }
  }

  if (isLoading) return <div className="h-40 animate-pulse rounded-md bg-whited" />
  if (error) {
    return <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{apiMessage(error)}</div>
  }

  return (
    <div className="max-w-xl space-y-4 rounded-md border border-border bg-background p-4">
      <div className="flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">ตั้งค่าช่องทางแจ้งเรื่องบุคคลภายนอก</h2>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3">
        <input
          id="external-config-oa"
          type="checkbox"
          className="mt-0.5"
          checked={requireOaFriendship}
          onChange={event => setRequireOaFriendship(event.target.checked)}
        />
        <Label htmlFor="external-config-oa" className="text-sm font-normal">
          บังคับให้เพิ่มเพื่อน LINE OA ก่อนแจ้งเรื่อง
        </Label>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3">
        <input
          id="external-config-enabled"
          type="checkbox"
          className="mt-0.5"
          checked={isEnabled}
          onChange={event => setIsEnabled(event.target.checked)}
        />
        <Label htmlFor="external-config-enabled" className="text-sm font-normal">
          เปิดใช้งานช่องทางแจ้งเรื่องสำหรับบุคคลภายนอก
        </Label>
      </div>

      <div className="flex justify-end">
        <Button loading={updateConfig.isPending} onClick={save}>บันทึกการตั้งค่า</Button>
      </div>
    </div>
  )
}

function ExternalTaxonomyEditor({
  state,
  onClose,
  onSave,
}: {
  state: ExternalEditorState
  onClose: () => void
  onSave: (values: {
    name: string
    description?: string
    sortOrder: number
  }) => Promise<void>
}) {
  const [name, setName] = useState(state.item?.name ?? '')
  const [description, setDescription] = useState(state.item?.description ?? '')
  const [sortOrder, setSortOrder] = useState(state.item?.sortOrder ?? 10)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const label = state.kind === 'category' ? 'หมวด' : state.kind === 'topic' ? 'หมวดย่อย' : 'หัวข้อ'

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
    <Modal open onClose={onClose} title={`${state.item ? 'แก้ไข' : 'เพิ่ม'}${label}สำหรับบุคคลภายนอก`}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="external-taxonomy-name">ชื่อ{label} *</Label>
          <Input
            id="external-taxonomy-name"
            value={name}
            onChange={event => setName(event.target.value)}
            maxLength={100}
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="external-taxonomy-description">คำอธิบาย</Label>
          <textarea
            id="external-taxonomy-description"
            value={description}
            onChange={event => setDescription(event.target.value)}
            maxLength={500}
            rows={3}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="external-taxonomy-order">ลำดับการแสดง</Label>
          <Input
            id="external-taxonomy-order"
            type="number"
            min={0}
            max={9999}
            value={sortOrder}
            onChange={event => setSortOrder(Number(event.target.value))}
          />
        </div>
        {state.kind === 'subject' && (
          <p className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            ตั้งค่า Template และ Suggest ได้ที่แท็บ &quot;Template และ Suggest&quot;
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button type="submit" loading={saving}>บันทึก</Button>
        </div>
      </form>
    </Modal>
  )
}

export function ExternalTaxonomyPanel() {
  const [categoryId, setCategoryId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [editor, setEditor] = useState<ExternalEditorState | null>(null)
  const [toggleTarget, setToggleTarget] = useState<ExternalToggleState | null>(null)

  const { data: categories = [], isLoading: categoriesLoading } = useExternalTicketCategories()
  const { data: topics = [], isLoading: topicsLoading } = useExternalTicketTopics(categoryId)
  const { data: subjects = [], isLoading: subjectsLoading } = useExternalTicketSubjects(topicId)

  const createCategory = useCreateExternalTicketCategory()
  const updateCategory = useUpdateExternalTicketCategory()
  const createTopic = useCreateExternalTicketTopic()
  const updateTopic = useUpdateExternalTicketTopic()
  const createSubject = useCreateExternalTicketSubject()
  const updateSubject = useUpdateExternalTicketSubject()

  useEffect(() => {
    if (!categories.some(category => category.id === categoryId)) {
      setCategoryId(categories[0]?.id ?? '')
      setTopicId('')
    }
  }, [categories, categoryId])

  useEffect(() => {
    if (!topics.some(topic => topic.id === topicId)) {
      setTopicId(topics[0]?.id ?? '')
    }
  }, [topics, topicId])

  const selectedCategory = useMemo(() => categories.find(c => c.id === categoryId), [categories, categoryId])
  const selectedTopic = useMemo(() => topics.find(t => t.id === topicId), [topics, topicId])

  async function saveEditor(values: {
    name: string
    description?: string
    template?: string
    suggestions?: string[]
    sortOrder: number
  }) {
    if (!editor) return
    if (editor.kind === 'category') {
      if (editor.item) {
        await updateCategory.mutateAsync({ id: editor.item.id, ...values, isActive: editor.item.isActive })
      } else {
        await createCategory.mutateAsync(values)
      }
    } else if (editor.kind === 'topic') {
      if (editor.item) {
        await updateTopic.mutateAsync({
          id: editor.item.id,
          externalTicketCategoryId: categoryId,
          ...values,
          isActive: editor.item.isActive,
        })
      } else {
        await createTopic.mutateAsync({ externalTicketCategoryId: categoryId, ...values })
      }
    } else if (editor.item) {
      const subject = editor.item as ExternalTicketSubjectDto
      await updateSubject.mutateAsync({
        id: editor.item.id,
        externalTicketTopicId: topicId,
        ...values,
        // ต้องส่ง template/suggestions เดิมไปด้วย — endpoint update แทนที่ทุก field ไม่งั้นค่าจะถูกล้าง
        template: subject.template,
        suggestions: subject.suggestions,
        isActive: editor.item.isActive,
      })
    } else {
      await createSubject.mutateAsync({
        externalTicketTopicId: topicId,
        ...values,
      })
    }
    toast.success(`บันทึก${editor.kind === 'category' ? 'หมวด' : editor.kind === 'topic' ? 'หมวดย่อย' : 'หัวข้อ'}สำเร็จ`)
  }

  async function confirmToggle() {
    if (!toggleTarget) return
    const { item, kind } = toggleTarget
    try {
      if (kind === 'category') {
        await updateCategory.mutateAsync({
          id: item.id,
          name: item.name,
          description: item.description,
          sortOrder: item.sortOrder,
          isActive: !item.isActive,
        })
      } else if (kind === 'topic') {
        const topic = item as ExternalTicketTopicDto
        await updateTopic.mutateAsync({
          id: item.id,
          externalTicketCategoryId: topic.externalTicketCategoryId,
          name: item.name,
          description: item.description,
          sortOrder: item.sortOrder,
          isActive: !item.isActive,
        })
      } else {
        const subject = item as ExternalTicketSubjectDto
        await updateSubject.mutateAsync({
          id: item.id,
          externalTicketTopicId: subject.externalTicketTopicId,
          name: item.name,
          description: item.description,
          // ต้องส่ง template/suggestions เดิมไปด้วย — endpoint update แทนที่ทุก field ไม่งั้นค่าจะถูกล้าง
          template: subject.template,
          suggestions: subject.suggestions,
          sortOrder: item.sortOrder,
          isActive: !item.isActive,
        })
      }
      toast.success(`${item.isActive ? 'ปิด' : 'เปิด'}ใช้งาน "${item.name}" สำเร็จ`)
      setToggleTarget(null)
    } catch (err) {
      toast.error(apiMessage(err))
    }
  }

  return (
    <div className="space-y-4">
      <ConfigPanel />

      <div className="grid min-h-[420px] gap-4 xl:grid-cols-3">
        <section className="overflow-hidden rounded-md border border-border bg-background">
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <div className="flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">หมวด (ภายนอก)</h2>
            </div>
            <Button size="sm" onClick={() => setEditor({ kind: 'category' })}>
              <Plus className="h-4 w-4" /> เพิ่มหมวด
            </Button>
          </div>
          {categoriesLoading ? (
            <EmptyRow text="กำลังโหลดหมวด..." />
          ) : categories.length === 0 ? (
            <EmptyRow text="ยังไม่มีหมวดแจ้งเรื่องสำหรับบุคคลภายนอก" />
          ) : (
            <div className="divide-y divide-border">
              {categories.map(category => (
                <div
                  key={category.id}
                  className={`flex min-h-16 items-center gap-2 px-2 transition-colors ${categoryId === category.id ? 'bg-primary/5' : 'hover:bg-whited/40'}`}
                >
                  <button
                    type="button"
                    onClick={() => { setCategoryId(category.id); setTopicId('') }}
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
                <h2 className="truncate text-sm font-semibold">หมวดย่อย (ภายนอก)</h2>
              </div>
              {selectedCategory && <p className="mt-0.5 truncate text-xs text-muted-foreground">{selectedCategory.name}</p>}
            </div>
            <Button size="sm" disabled={!categoryId} onClick={() => setEditor({ kind: 'topic' })}>
              <Plus className="h-4 w-4" /> เพิ่มหมวดย่อย
            </Button>
          </div>
          {!categoryId ? (
            <EmptyRow text="เลือกหมวดเพื่อดูหมวดย่อย" />
          ) : topicsLoading ? (
            <EmptyRow text="กำลังโหลดหมวดย่อย..." />
          ) : topics.length === 0 ? (
            <EmptyRow text="ยังไม่มีหมวดย่อยในหมวดนี้" />
          ) : (
            <div className="divide-y divide-border">
              {topics.map(topic => (
                <div
                  key={topic.id}
                  className={`flex min-h-16 items-center gap-2 px-2 transition-colors ${topicId === topic.id ? 'bg-primary/5' : 'hover:bg-whited/40'}`}
                >
                  <button type="button" onClick={() => setTopicId(topic.id)} className="min-w-0 flex-1 px-2 py-3 text-left">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{topic.name}</span>
                      {!topic.isActive && <Badge variant="secondary">ปิดใช้งาน</Badge>}
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      ลำดับ {topic.sortOrder}{topic.description ? ` · ${topic.description}` : ''}
                    </p>
                  </button>
                  <Button size="icon" variant="ghost" title="แก้ไขหมวดย่อย" onClick={() => setEditor({ kind: 'topic', item: topic })}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title={topic.isActive ? 'ปิดใช้งานหมวดย่อย' : 'เปิดใช้งานหมวดย่อย'}
                    onClick={() => setToggleTarget({ kind: 'topic', item: topic })}
                  >
                    {topic.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
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
                <h2 className="truncate text-sm font-semibold">หัวข้อ (ภายนอก)</h2>
              </div>
              {selectedTopic && <p className="mt-0.5 truncate text-xs text-muted-foreground">{selectedTopic.name}</p>}
            </div>
            <Button size="sm" disabled={!topicId} onClick={() => setEditor({ kind: 'subject' })}>
              <Plus className="h-4 w-4" /> เพิ่มหัวข้อ
            </Button>
          </div>
          {!topicId ? (
            <EmptyRow text="เลือกหมวดย่อยเพื่อดูหัวข้อ" />
          ) : subjectsLoading ? (
            <EmptyRow text="กำลังโหลดหัวข้อ..." />
          ) : subjects.length === 0 ? (
            <EmptyRow text="ยังไม่มีหัวข้อในหมวดย่อยนี้" />
          ) : (
            <div className="divide-y divide-border">
              {subjects.map(subject => (
                <div key={subject.id} className="flex min-h-16 items-center gap-2 px-2 hover:bg-whited/40">
                  <div className="min-w-0 flex-1 px-2 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium">{subject.name}</span>
                      {!subject.isActive && <Badge variant="secondary">ปิดใช้งาน</Badge>}
                      {subject.template && <Badge variant="default">มี Template</Badge>}
                      {subject.suggestions.length > 0 && <Badge variant="default">Suggest {subject.suggestions.length}</Badge>}
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      ลำดับ {subject.sortOrder}{subject.description ? ` · ${subject.description}` : ''}
                    </p>
                  </div>
                  <Button size="icon" variant="ghost" title="แก้ไขหัวข้อ" onClick={() => setEditor({ kind: 'subject', item: subject })}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title={subject.isActive ? 'ปิดใช้งานหัวข้อ' : 'เปิดใช้งานหัวข้อ'}
                    onClick={() => setToggleTarget({ kind: 'subject', item: subject })}
                  >
                    {subject.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {editor && (
        <ExternalTaxonomyEditor
          state={editor}
          onClose={() => setEditor(null)}
          onSave={saveEditor}
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
        loading={updateCategory.isPending || updateTopic.isPending || updateSubject.isPending}
      />
    </div>
  )
}
