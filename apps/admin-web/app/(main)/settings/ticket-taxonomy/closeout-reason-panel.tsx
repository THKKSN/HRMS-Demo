'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Building2, ClipboardCheck, Pencil, Plus, Power, PowerOff } from 'lucide-react'
import { toast } from 'sonner'
import type { TicketCategoryDto, TicketCloseoutReasonDto } from '@hrms/shared-types'
import { localizedName, type Locale } from '@hrms/i18n'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LocalizedNameHint } from '@/components/ui/localized-name-hint'
import { Modal } from '@/components/ui/modal'
import {
  useCreateTicketCloseoutReason,
  useManagedTicketCloseoutReasons,
  useUpdateTicketCloseoutReason,
} from '@/hooks/use-ticket-taxonomy'
import { useApiError } from '@/hooks/use-api-error'

type ReasonScope = 'department' | 'company'
type EditorState = { item?: TicketCloseoutReasonDto }

function EmptyRow({ text }: { text: string }) {
  return <div className="px-4 py-10 text-center text-sm text-muted-foreground">{text}</div>
}

function ReasonEditor({
  state,
  categories,
  onClose,
  onSave,
}: {
  state: EditorState
  categories: TicketCategoryDto[]
  onClose: () => void
  onSave: (values: {
    scope: ReasonScope
    name: string
    nameEn?: string
    nameId?: string
    description?: string
    sortOrder: number
    categoryIds: string[]
    requiresResolutionNote: boolean
    requiresCompletionEvidence: boolean
  }) => Promise<void>
}) {
  const t = useTranslations('admin.settings.closeout')
  const tTaxonomy = useTranslations('admin.settings.taxonomy')
  const tOrg = useTranslations('admin.org.common')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const locale = useLocale() as Locale
  const isEdit = !!state.item
  const [scope, setScope] = useState<ReasonScope>(state.item && !state.item.departmentId ? 'company' : 'department')
  const [name, setName] = useState(state.item?.name ?? '')
  const [nameEn, setNameEn] = useState(state.item?.nameEn ?? '')
  const [nameId, setNameId] = useState(state.item?.nameId ?? '')
  const [description, setDescription] = useState(state.item?.description ?? '')
  const [sortOrder, setSortOrder] = useState(state.item?.sortOrder ?? 10)
  const [categoryIds, setCategoryIds] = useState<string[]>(state.item?.categoryIds ?? [])
  const [requiresResolutionNote, setRequiresResolutionNote] = useState(state.item?.requiresResolutionNote ?? true)
  const [requiresCompletionEvidence, setRequiresCompletionEvidence] = useState(state.item?.requiresCompletionEvidence ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const activeCategories = categories.filter(category => category.isActive || categoryIds.includes(category.id))

  function toggleCategory(id: string) {
    setCategoryIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setError(t('nameRequired'))
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({
        scope,
        name: name.trim(),
        nameEn: nameEn.trim(),
        nameId: nameId.trim(),
        description: description.trim() || undefined,
        sortOrder,
        categoryIds: scope === 'department' ? categoryIds : [],
        requiresResolutionNote,
        requiresCompletionEvidence,
      })
      onClose()
    } catch (err) {
      setError(apiError(err, tCommon('state.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? t('editTitle') : t('addTitle')}>
      <form onSubmit={submit} className="space-y-4">
        {/* scope เปลี่ยนไม่ได้หลังสร้าง เพราะ ticket ที่ผูกไว้แล้วอ้างอิง scope เดิม — ถ้าจะย้ายให้ปิดใช้แล้วสร้างใหม่ */}
        <div className="space-y-1.5">
          <Label>{t('scope')}</Label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { key: 'department', label: t('scopeDepartment'), hint: t('scopeDepartmentHint') },
              { key: 'company', label: t('scopeCompany'), hint: t('scopeCompanyHint') },
            ] as const).map(option => (
              <button
                key={option.key}
                type="button"
                disabled={isEdit}
                onClick={() => setScope(option.key)}
                className={`rounded-md border px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-70 ${
                  scope === option.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-slate-300'
                }`}
              >
                <span className="block font-semibold">{option.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{option.hint}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="closeout-name">{t('name')} *</Label>
          <Input id="closeout-name" value={name} onChange={event => setName(event.target.value)} maxLength={100} autoFocus />
        </div>
        {/* ชื่อภาษาอื่นสำหรับหน้าจอที่สลับภาษา — ว่างได้ ระบบจะแสดงชื่อไทยแทน */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="closeout-name-en">{tOrg('nameEn')}</Label>
            <Input id="closeout-name-en" value={nameEn} onChange={event => setNameEn(event.target.value)} maxLength={100} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="closeout-name-id">{tOrg('nameId')}</Label>
            <Input id="closeout-name-id" value={nameId} onChange={event => setNameId(event.target.value)} maxLength={100} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="closeout-description">{tTaxonomy('description')}</Label>
          <textarea
            id="closeout-description"
            value={description}
            onChange={event => setDescription(event.target.value)}
            maxLength={500}
            rows={3}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="closeout-order">{tTaxonomy('sortOrder')}</Label>
          <Input
            id="closeout-order"
            type="number"
            min={0}
            max={9999}
            value={sortOrder}
            onChange={event => setSortOrder(Number(event.target.value))}
          />
        </div>
        {/* กติกาความครบถ้วนตอนจบงาน — ปิดเฉพาะเหตุผลที่ปิดจบได้เลย เช่น "ไม่พบปัญหา" */}
        <div className="space-y-1.5">
          <Label>{t('requirements')}</Label>
          <div className="space-y-1 rounded-md border border-border p-2">
            <label className="flex items-start gap-2 rounded px-2 py-1 text-sm hover:bg-muted/40">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={requiresResolutionNote}
                onChange={event => setRequiresResolutionNote(event.target.checked)}
              />
              <span>
                <span className="block font-medium">{t('requireNote')}</span>
                <span className="block text-xs text-muted-foreground">{t('requireNoteHint')}</span>
              </span>
            </label>
            <label className="flex items-start gap-2 rounded px-2 py-1 text-sm hover:bg-muted/40">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={requiresCompletionEvidence}
                onChange={event => setRequiresCompletionEvidence(event.target.checked)}
              />
              <span>
                <span className="block font-medium">{t('requireEvidence')}</span>
                <span className="block text-xs text-muted-foreground">{t('requireEvidenceHint')}</span>
              </span>
            </label>
          </div>
        </div>
        {scope === 'department' && (
          <div className="space-y-1.5">
            <Label>{t('limitCategories')}</Label>
            {activeCategories.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                {t('noCategories')}
              </p>
            ) : (
              <div className="grid max-h-48 gap-1 overflow-y-auto rounded-md border border-border p-2 sm:grid-cols-2">
                {activeCategories.map(category => (
                  <label key={category.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/40">
                    <input
                      type="checkbox"
                      checked={categoryIds.includes(category.id)}
                      onChange={() => toggleCategory(category.id)}
                    />
                    <span className="truncate">{localizedName(category, locale)}</span>
                    {!category.isActive && <Badge variant="secondary">{tTaxonomy('inactiveBadge')}</Badge>}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>{tCommon('action.cancel')}</Button>
          <Button type="submit" loading={saving}>{tCommon('action.save')}</Button>
        </div>
      </form>
    </Modal>
  )
}

function ReasonRow({
  reason,
  categoryName,
  onEdit,
  onToggle,
}: {
  reason: TicketCloseoutReasonDto
  categoryName: (id: string) => string
  onEdit: () => void
  onToggle: () => void
}) {
  const t = useTranslations('admin.settings.closeout')
  const tTaxonomy = useTranslations('admin.settings.taxonomy')
  const tCommon = useTranslations('common')
  const locale = useLocale() as Locale
  return (
    <div className="flex min-h-16 items-center gap-2 px-2 hover:bg-whited/40">
      <div className="min-w-0 flex-1 px-2 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium">{localizedName(reason, locale)}</span>
          {reason.legacyProblemType && <Badge variant="outline">{t('systemDefault')}</Badge>}
          {!reason.requiresResolutionNote && <Badge variant="warning">{t('noteOptional')}</Badge>}
          {!reason.requiresCompletionEvidence && <Badge variant="warning">{t('evidenceOptional')}</Badge>}
          {!reason.isActive && <Badge variant="secondary">{tTaxonomy('inactiveBadge')}</Badge>}
        </div>
        {/* เหตุผลปิดงานเป็นของผู้รับผิดชอบภายใน ผู้แจ้งภายนอกไม่เห็น จึงไม่ต้องเตือนเรื่องภาษาอินโดฯ */}
        <LocalizedNameHint nameEn={reason.nameEn} nameId={reason.nameId} showIndonesian={false} />
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {reason.description
            ? tTaxonomy('orderWithDescription', { order: reason.sortOrder, description: reason.description })
            : tTaxonomy('order', { order: reason.sortOrder })}
        </p>
        {reason.categoryIds.length > 0 && (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {t('onlyCategories', { list: reason.categoryIds.map(categoryName).join(', ') })}
          </p>
        )}
      </div>
      <Button size="icon" variant="ghost" title={tCommon('action.edit')} onClick={onEdit}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" title={reason.isActive ? tTaxonomy('toggleOffTitle') : tTaxonomy('toggleOnTitle')} onClick={onToggle}>
        {reason.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
      </Button>
    </div>
  )
}

/**
 * ตั้งค่า master "ประเภทปัญหา/เหตุผลปิดงาน" ที่ผู้รับผิดชอบเลือกตอนส่งงานให้ตรวจ
 * แบ่ง 2 กลุ่ม: ของแผนกที่เลือก (ผูกหมวดได้) และระดับบริษัท (ทุกแผนกใช้ร่วม)
 */
export function CloseoutReasonPanel({
  companyId,
  departmentId,
  categories,
}: {
  companyId: string
  departmentId: string
  categories: TicketCategoryDto[]
}) {
  const t = useTranslations('admin.settings.closeout')
  const tTaxonomy = useTranslations('admin.settings.taxonomy')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const locale = useLocale() as Locale
  const { data: reasons = [], isLoading } = useManagedTicketCloseoutReasons(companyId, departmentId)
  const createReason = useCreateTicketCloseoutReason()
  const updateReason = useUpdateTicketCloseoutReason()
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [toggleTarget, setToggleTarget] = useState<TicketCloseoutReasonDto | null>(null)
  const departmentReasons = reasons.filter(reason => reason.departmentId === departmentId)
  const companyReasons = reasons.filter(reason => !reason.departmentId)
  const categoryName = (id: string) => {
    const category = categories.find(item => item.id === id)
    return category ? localizedName(category, locale) : t('deletedCategory')
  }

  async function saveEditor(values: {
    scope: ReasonScope
    name: string
    nameEn?: string
    nameId?: string
    description?: string
    sortOrder: number
    categoryIds: string[]
    requiresResolutionNote: boolean
    requiresCompletionEvidence: boolean
  }) {
    if (!editor) return
    const { scope, ...body } = values
    if (editor.item) {
      await updateReason.mutateAsync({ id: editor.item.id, ...body, isActive: editor.item.isActive })
    } else {
      await createReason.mutateAsync({
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
      await updateReason.mutateAsync({
        id: toggleTarget.id,
        name: toggleTarget.name,
        description: toggleTarget.description,
        sortOrder: toggleTarget.sortOrder,
        categoryIds: toggleTarget.categoryIds,
        requiresResolutionNote: toggleTarget.requiresResolutionNote,
        requiresCompletionEvidence: toggleTarget.requiresCompletionEvidence,
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
      Icon: ClipboardCheck,
      items: departmentReasons,
      empty: t('sectionDepartmentEmpty'),
    },
    {
      key: 'company',
      title: t('sectionCompany'),
      hint: t('sectionCompanyHint'),
      Icon: Building2,
      items: companyReasons,
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
              <EmptyRow text={t('selectScopeFirst')} />
            ) : isLoading ? (
              <EmptyRow text={tCommon('state.loading')} />
            ) : section.items.length === 0 ? (
              <EmptyRow text={section.empty} />
            ) : (
              <div className="divide-y divide-border">
                {section.items.map(reason => (
                  <ReasonRow
                    key={reason.id}
                    reason={reason}
                    categoryName={categoryName}
                    onEdit={() => setEditor({ item: reason })}
                    onToggle={() => setToggleTarget(reason)}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {editor && (
        <ReasonEditor state={editor} categories={categories} onClose={() => setEditor(null)} onSave={saveEditor} />
      )}

      <ConfirmModal
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={confirmToggle}
        title={toggleTarget?.isActive ? tTaxonomy('toggleOffTitle') : tTaxonomy('toggleOnTitle')}
        description={toggleTarget
          ? (toggleTarget.isActive
              ? t('confirmDeactivate', { name: toggleTarget.name })
              : t('confirmActivate', { name: toggleTarget.name }))
          : undefined}
        confirmLabel={tCommon('action.confirm')}
        variant={toggleTarget?.isActive ? 'destructive' : 'default'}
        loading={updateReason.isPending}
      />
    </div>
  )
}
