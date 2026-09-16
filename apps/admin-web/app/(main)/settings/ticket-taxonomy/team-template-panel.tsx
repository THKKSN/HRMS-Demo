'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Building2, Pencil, Plus, Power, PowerOff, Users } from 'lucide-react'
import { toast } from 'sonner'
import type { TicketTeamTemplateDto } from '@hrms/shared-types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { useEmployees } from '@/hooks/use-employees'
import {
  useCreateTicketTeamTemplate,
  useManagedTicketTeamTemplates,
  useUpdateTicketTeamTemplate,
} from '@/hooks/use-ticket-taxonomy'
import { useApiError } from '@/hooks/use-api-error'

type TemplateScope = 'department' | 'company'
type EditorState = { item?: TicketTeamTemplateDto }

function EmptyRow({ text }: { text: string }) {
  return <div className="px-4 py-10 text-center text-sm text-muted-foreground">{text}</div>
}

function TemplateEditor({
  state,
  companyId,
  onClose,
  onSave,
}: {
  state: EditorState
  companyId: string
  onClose: () => void
  onSave: (values: {
    scope: TemplateScope
    name: string
    description?: string
    sortOrder: number
    employeeIds: string[]
  }) => Promise<void>
}) {
  const t = useTranslations('admin.settings.teamTemplate')
  const tTaxonomy = useTranslations('admin.settings.taxonomy')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const isEdit = !!state.item
  const [scope, setScope] = useState<TemplateScope>(
    state.item && !state.item.departmentId ? 'company' : 'department',
  )
  const [name, setName] = useState(state.item?.name ?? '')
  const [description, setDescription] = useState(state.item?.description ?? '')
  const [sortOrder, setSortOrder] = useState(state.item?.sortOrder ?? 10)
  const [employeeIds, setEmployeeIds] = useState<string[]>(
    state.item?.members.map(member => member.employeeId) ?? [],
  )
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // ดึงพนักงาน active ของบริษัทมาให้เลือก — ทีมสำเร็จรูปข้ามแผนกได้ในบริษัทเดียวกัน
  const { data: employeePage, isLoading } = useEmployees({
    companyId,
    isActive: true,
    search: search.trim() || undefined,
    pageSize: 100,
  })
  const employees = employeePage?.items ?? []

  function toggleEmployee(id: string) {
    setEmployeeIds(current =>
      current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setError(t('nameRequired'))
      return
    }
    if (employeeIds.length === 0) {
      setError(t('membersRequired'))
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({
        scope,
        name: name.trim(),
        description: description.trim() || undefined,
        sortOrder,
        employeeIds,
      })
      onClose()
    } catch (saveError) {
      setError(apiError(saveError, tCommon('state.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? t('editTitle') : t('addTitle')} size="md">
      <form className="space-y-4" onSubmit={submit}>
        <div className="space-y-1.5">
          <Label>{t('scope')}</Label>
          <div className="grid grid-cols-2 gap-2">
            {(['department', 'company'] as const).map(option => (
              <button
                key={option}
                type="button"
                disabled={isEdit}
                onClick={() => setScope(option)}
                className={`rounded-md border px-3 py-2 text-sm ${
                  scope === option ? 'border-primary bg-primary/5 font-medium text-primary' : 'border-border'
                } disabled:opacity-60`}
              >
                {option === 'department' ? t('scopeDepartment') : t('scopeCompany')}
              </button>
            ))}
          </div>
          {isEdit && <p className="text-xs text-muted-foreground">{t('scopeLocked')}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="template-name">{t('name')} *</Label>
          <Input
            id="template-name"
            value={name}
            maxLength={100}
            onChange={event => setName(event.target.value)}
            placeholder={t('namePlaceholder')}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
          <div className="space-y-1.5">
            <Label htmlFor="template-description">{tTaxonomy('description')}</Label>
            <Input
              id="template-description"
              value={description}
              maxLength={500}
              onChange={event => setDescription(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="template-sort">{t('sortOrder')}</Label>
            <Input
              id="template-sort"
              type="number"
              value={sortOrder}
              onChange={event => setSortOrder(Number(event.target.value))}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <Label>{t('members', { count: employeeIds.length })}</Label>
          </div>
          <Input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder={t('searchEmployee')}
          />
          {isLoading ? (
            <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
              {t('loadingEmployees')}
            </p>
          ) : employees.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
              {t('noEmployees')}
            </p>
          ) : (
            <div className="grid max-h-56 gap-1 overflow-y-auto rounded-md border border-border p-2 sm:grid-cols-2">
              {employees.map(employee => (
                <label
                  key={employee.id}
                  className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/40"
                >
                  <input
                    type="checkbox"
                    checked={employeeIds.includes(employee.id)}
                    onChange={() => toggleEmployee(employee.id)}
                  />
                  <span className="truncate">{employee.fullName}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{employee.employeeCode}</span>
                </label>
              ))}
            </div>
          )}
          {/* คนที่เลือกไว้แต่หลุดจากผลค้นหา ต้องเห็นว่ายังอยู่ในทีม ไม่ใช่หายไปเงียบ ๆ */}
          {state.item && state.item.members.some(member => !employees.some(item => item.id === member.employeeId)) && (
            <p className="text-xs text-muted-foreground">
              {t('hiddenMembers', {
                list: state.item.members
                  .filter(member => !employees.some(item => item.id === member.employeeId))
                  .map(member => member.employeeName)
                  .join(', '),
              })}
            </p>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>{tCommon('action.cancel')}</Button>
          <Button type="submit" loading={saving}>{tCommon('action.save')}</Button>
        </div>
      </form>
    </Modal>
  )
}

function TemplateRow({
  template,
  onEdit,
  onToggle,
}: {
  template: TicketTeamTemplateDto
  onEdit: () => void
  onToggle: () => void
}) {
  const t = useTranslations('admin.settings.teamTemplate')
  const tTaxonomy = useTranslations('admin.settings.taxonomy')
  const tCommon = useTranslations('common')
  const inactiveMembers = template.members.filter(member => !member.isActiveEmployee)
  return (
    <div className="flex min-h-16 items-center gap-2 px-2 hover:bg-muted/40">
      <div className="min-w-0 flex-1 px-2 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium">{template.name}</span>
          <Badge variant="secondary">{t('memberCount', { count: template.members.length })}</Badge>
          {inactiveMembers.length > 0 && (
            <Badge variant="warning">{t('inactiveMembers', { count: inactiveMembers.length })}</Badge>
          )}
          {!template.isActive && <Badge variant="secondary">{tTaxonomy('inactiveBadge')}</Badge>}
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {template.description
            ? tTaxonomy('orderWithDescription', { order: template.sortOrder, description: template.description })
            : tTaxonomy('order', { order: template.sortOrder })}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {template.members.map(member => member.employeeName).join(', ')}
        </p>
      </div>
      <Button size="icon" variant="ghost" title={tCommon('action.edit')} onClick={onEdit}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        title={template.isActive ? t('deactivateLabel') : t('activateLabel')}
        onClick={onToggle}
      >
        {template.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
      </Button>
    </div>
  )
}

/**
 * ตั้งค่าทีมสำเร็จรูป — ชุดรายชื่อที่ผู้รับผิดชอบกด "ดึงทีม" เข้าใบแจ้งเรื่องได้ทีเดียว
 * template ไม่ให้สิทธิ์ด้วยตัวเอง สิทธิ์ทำงานเกิดตอนถูกเพิ่มเป็นผู้ร่วมงานในใบนั้นเท่านั้น
 */
export function TeamTemplatePanel({
  companyId,
  departmentId,
}: {
  companyId: string
  departmentId: string
}) {
  const t = useTranslations('admin.settings.teamTemplate')
  const tTaxonomy = useTranslations('admin.settings.taxonomy')
  const tCloseout = useTranslations('admin.settings.closeout')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const { data: templates = [], isLoading } = useManagedTicketTeamTemplates(companyId, departmentId)
  const createTemplate = useCreateTicketTeamTemplate()
  const updateTemplate = useUpdateTicketTeamTemplate()
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [toggleTarget, setToggleTarget] = useState<TicketTeamTemplateDto | null>(null)
  const departmentTemplates = templates.filter(template => template.departmentId === departmentId)
  const companyTemplates = templates.filter(template => !template.departmentId)

  async function saveEditor(values: {
    scope: TemplateScope
    name: string
    description?: string
    sortOrder: number
    employeeIds: string[]
  }) {
    if (!editor) return
    const { scope, ...body } = values
    if (editor.item) {
      await updateTemplate.mutateAsync({ id: editor.item.id, ...body, isActive: editor.item.isActive })
    } else {
      await createTemplate.mutateAsync({
        companyId,
        departmentId: scope === 'department' ? departmentId : undefined,
        ...body,
      })
    }
    toast.success(t('saved'))
  }

  async function confirmToggle() {
    if (!toggleTarget) return
    try {
      await updateTemplate.mutateAsync({
        id: toggleTarget.id,
        name: toggleTarget.name,
        description: toggleTarget.description,
        sortOrder: toggleTarget.sortOrder,
        employeeIds: toggleTarget.members.map(member => member.employeeId),
        isActive: !toggleTarget.isActive,
      })
      toast.success(toggleTarget.isActive
        ? tTaxonomy('deactivated', { name: toggleTarget.name })
        : tTaxonomy('activated', { name: toggleTarget.name }))
      setToggleTarget(null)
    } catch (error) {
      toast.error(apiError(error, tCommon('state.error')))
    }
  }

  const sections = [
    {
      key: 'department',
      title: t('sectionDepartment'),
      hint: t('sectionDepartmentHint'),
      Icon: Users,
      items: departmentTemplates,
      empty: t('sectionDepartmentEmpty'),
    },
    {
      key: 'company',
      title: t('sectionCompany'),
      hint: t('sectionCompanyHint'),
      Icon: Building2,
      items: companyTemplates,
      empty: t('sectionCompanyEmpty'),
    },
  ] as const

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        <Button size="sm" disabled={!departmentId} onClick={() => setEditor({})}>
          <Plus className="h-4 w-4" /> {t('add')}
        </Button>
      </div>

      <div className="grid min-h-[420px] gap-4 xl:grid-cols-2">
        {sections.map(section => (
          <section key={section.key} className="overflow-hidden rounded-md border border-border bg-background">
            <div className="flex min-h-14 items-center justify-between gap-3 border-b border-border px-4 py-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <section.Icon className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold">{section.title}</h2>
                  <Badge variant="secondary">{section.items.length}</Badge>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{section.hint}</p>
              </div>
            </div>
            {!departmentId ? (
              <EmptyRow text={tCloseout('selectScopeFirst')} />
            ) : isLoading ? (
              <EmptyRow text={tCommon('state.loading')} />
            ) : section.items.length === 0 ? (
              <EmptyRow text={section.empty} />
            ) : (
              <div className="divide-y divide-border">
                {section.items.map(template => (
                  <TemplateRow
                    key={template.id}
                    template={template}
                    onEdit={() => setEditor({ item: template })}
                    onToggle={() => setToggleTarget(template)}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {editor && (
        <TemplateEditor
          state={editor}
          companyId={companyId}
          onClose={() => setEditor(null)}
          onSave={saveEditor}
        />
      )}

      {toggleTarget && (
        <ConfirmModal
          open
          title={toggleTarget.isActive ? t('toggleOffTitle') : t('toggleOnTitle')}
          description={toggleTarget.isActive
            ? t('confirmDeactivate', { name: toggleTarget.name })
            : t('confirmActivate', { name: toggleTarget.name })}
          confirmLabel={toggleTarget.isActive ? t('deactivateLabel') : t('activateLabel')}
          variant={toggleTarget.isActive ? 'destructive' : 'default'}
          loading={updateTemplate.isPending}
          onConfirm={confirmToggle}
          onClose={() => setToggleTarget(null)}
        />
      )}
    </div>
  )
}
