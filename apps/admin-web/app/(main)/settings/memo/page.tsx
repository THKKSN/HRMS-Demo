'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { FolderTree, Pencil, Plus, Power, PowerOff, Tags } from 'lucide-react'
import { toast } from 'sonner'
import type { MemoCategoryDto, MemoSubCategoryDto, MemoTypeDto } from '@hrms/shared-types'
import { MemoFlowEditor } from '@/components/memos/memo-flow-editor'
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
import { localizedName, type Locale } from '@hrms/i18n'
import { useApiError } from '@/hooks/use-api-error'

type TaxonomyItem = MemoCategoryDto | MemoSubCategoryDto
type TaxonomyKind = 'category' | 'subCategory'
type ToggleTarget =
  | { kind: 'type'; item: MemoTypeDto }
  | { kind: TaxonomyKind; item: TaxonomyItem }
type EditorState =
  | { kind: 'type'; item?: MemoTypeDto }
  | { kind: TaxonomyKind; item?: TaxonomyItem }

type LocalizedNameValues = { name: string; nameEn: string; nameId: string }

function NameOnlyEditor({
  title,
  initial,
  onClose,
  onSave,
}: {
  title: string
  initial?: { name: string; nameEn?: string | null; nameId?: string | null }
  onClose: () => void
  onSave: (values: LocalizedNameValues) => Promise<void>
}) {
  const t = useTranslations('admin.settings.memo')
  const tOrg = useTranslations('admin.org.common')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const [name, setName] = useState(initial?.name ?? '')
  const [nameEn, setNameEn] = useState(initial?.nameEn ?? '')
  const [nameId, setNameId] = useState(initial?.nameId ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setError(t('nameRequired'))
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({ name: name.trim(), nameEn: nameEn.trim(), nameId: nameId.trim() })
      onClose()
    } catch (err) {
      setError(apiError(err, tCommon('state.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={title}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="memo-editor-name">{t('name')} *</Label>
          <Input
            id="memo-editor-name"
            value={name}
            onChange={event => setName(event.target.value)}
            maxLength={200}
            autoFocus
          />
        </div>
        {/* ชื่อภาษาอื่นสำหรับหน้าจอที่สลับภาษา — ว่างได้ ระบบจะแสดงชื่อไทยแทน */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="memo-editor-name-en">{tOrg('nameEn')}</Label>
            <Input id="memo-editor-name-en" value={nameEn} onChange={event => setNameEn(event.target.value)} maxLength={200} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="memo-editor-name-id">{tOrg('nameId')}</Label>
            <Input id="memo-editor-name-id" value={nameId} onChange={event => setNameId(event.target.value)} maxLength={200} />
          </div>
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

// ผู้อนุมัติด่านแรกไม่อยู่ในฟอร์มนี้ — ตั้งที่การ์ด "ลำดับขั้นตอน" ให้เห็นภาพรวม flow พร้อมกัน
function MemoTypeEditor({
  initial,
  onClose,
  onSave,
}: {
  initial?: MemoTypeDto
  onClose: () => void
  onSave: (values: LocalizedNameValues & { companyId: string; departmentId: string }) => Promise<void>
}) {
  const t = useTranslations('admin.settings.memo')
  const tOrg = useTranslations('admin.org.common')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const locale = useLocale() as Locale
  const { options: companyOptions } = useCompanyOptions()
  const { data: me } = useMe()
  const isSupervisor = !!me?.roles.some(r => r.role === 'Supervisor') && !me?.roles.some(r => r.role === 'Admin' || r.role === 'Executive')
  const isSupervisorScoped = isSupervisor && !!me?.companyId && !!me?.departmentId
  // Supervisor แก้ไข/เลือกปลายทางเองไม่ได้เสมอ — ตอนสร้างใหม่ auto-fill เป็นหน่วยงานตัวเอง
  // ตอนแก้ไข คงค่าเดิมของ memo type นั้นไว้ (ไม่ overwrite เป็นของ Supervisor)
  const locked = isSupervisorScoped

  const [name, setName] = useState(initial?.name ?? '')
  const [nameEn, setNameEn] = useState(initial?.nameEn ?? '')
  const [nameId, setNameId] = useState(initial?.nameId ?? '')
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
    if (!name.trim()) return setError(t('nameRequired'))
    if (!companyId) return setError(t('companyRequired'))
    if (!departmentId) return setError(t('departmentRequired'))

    setSaving(true)
    setError('')
    try {
      await onSave({ name: name.trim(), nameEn: nameEn.trim(), nameId: nameId.trim(), companyId, departmentId })
      onClose()
    } catch (err) {
      setError(apiError(err, tCommon('state.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={initial ? t('editTypeTitle') : t('addTypeTitle')}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="memo-type-name">{t('typeName')} *</Label>
          <Input id="memo-type-name" value={name} onChange={event => setName(event.target.value)} maxLength={200} autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="memo-type-name-en">{tOrg('nameEn')}</Label>
            <Input id="memo-type-name-en" value={nameEn} onChange={event => setNameEn(event.target.value)} maxLength={200} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="memo-type-name-id">{tOrg('nameId')}</Label>
            <Input id="memo-type-name-id" value={nameId} onChange={event => setNameId(event.target.value)} maxLength={200} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="memo-type-company">{t('targetCompany')} *</Label>
          <p className="text-xs text-muted-foreground">
            {locked
              ? (initial ? t('targetLockedEdit') : t('targetLockedCreate'))
              : t('targetHint')}
          </p>
          <Select
            id="memo-type-company"
            value={companyId}
            disabled={locked}
            onChange={event => { setCompanyId(event.target.value); setDepartmentId('') }}
          >
            <option value="">{tOrg('selectCompany')}</option>
            {companyOptions.map(option => (
              <option key={option.id} value={option.id}>{companyOptionLabel(option)}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="memo-type-department">{t('targetDepartment')} *</Label>
          <Select
            id="memo-type-department"
            value={departmentId}
            disabled={!companyId || locked}
            onChange={event => setDepartmentId(event.target.value)}
          >
            <option value="">{t('selectDepartment')}</option>
            {departments.map(department => (
              <option key={department.id} value={department.id}>{localizedName(department, locale)}</option>
            ))}
          </Select>
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

function EmptyRow({ text }: { text: string }) {
  return <div className="px-4 py-12 text-center text-sm text-muted-foreground">{text}</div>
}

export default function MemoSettingsPage() {
  const t = useTranslations('admin.settings.memo')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const locale = useLocale() as Locale
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
      toast.success(item.isActive
        ? t('deactivated', { name: item.name })
        : t('activated', { name: item.name }))
      setToggleTarget(null)
    } catch (error) {
      toast.error(apiError(error, tCommon('state.error')))
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="flex flex-col gap-3 border-y border-border py-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-sm flex-1 space-y-1.5">
          <Label htmlFor="memo-type-select">{t('memoType')}</Label>
          <Select
            id="memo-type-select"
            value={memoTypeId}
            disabled={typesLoading || !memoTypes.length}
            onChange={event => { setMemoTypeId(event.target.value); setCategoryId('') }}
          >
            <option value="">{t('selectMemoType')}</option>
            {memoTypes.map(type => (
              <option key={type.id} value={type.id}>
                {localizedName(type, locale)}{!type.isActive ? t('inactiveSuffix') : ''}
              </option>
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
                <Pencil className="h-4 w-4" /> {tCommon('action.edit')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setToggleTarget({ kind: 'type', item: selectedMemoType })}
              >
                {selectedMemoType.isActive
                  ? <><PowerOff className="h-4 w-4" /> {t('deactivateType')}</>
                  : <><Power className="h-4 w-4" /> {t('activateType')}</>}
              </Button>
            </>
          )}
          <Button size="sm" onClick={() => setEditorOpen({ kind: 'type' })}>
            <Plus className="h-4 w-4" /> {t('addType')}
          </Button>
        </div>
      </div>

      {selectedMemoType && <MemoFlowEditor memoType={selectedMemoType} />}

      <div className="grid min-h-[420px] gap-4 md:grid-cols-2">
        <section className="overflow-hidden rounded-md border border-border bg-background">
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <div className="flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">{t('categories')}</h2>
            </div>
            <Button size="sm" disabled={!memoTypeId} onClick={() => setEditorOpen({ kind: 'category' })}>
              <Plus className="h-4 w-4" /> {t('addCategory')}
            </Button>
          </div>
          {!memoTypeId ? (
            <EmptyRow text={t('selectTypeFirst')} />
          ) : categoriesLoading ? (
            <EmptyRow text={t('loadingCategories')} />
          ) : categories.length === 0 ? (
            <EmptyRow text={t('noCategories')} />
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
                      <span className="truncate text-sm font-medium">{localizedName(category, locale)}</span>
                      {!category.isActive && <Badge variant="secondary">{t('inactiveBadge')}</Badge>}
                    </div>
                  </button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title={t('editCategory')}
                    onClick={() => setEditorOpen({ kind: 'category', item: category })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title={category.isActive ? t('deactivateCategory') : t('activateCategory')}
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
                <h2 className="truncate text-sm font-semibold">{t('subCategories')}</h2>
              </div>
              {categoryId && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {localizedName(categories.find(c => c.id === categoryId), locale)}
                </p>
              )}
            </div>
            <Button size="sm" disabled={!categoryId} onClick={() => setEditorOpen({ kind: 'subCategory' })}>
              <Plus className="h-4 w-4" /> {t('addSubCategory')}
            </Button>
          </div>
          {!categoryId ? (
            <EmptyRow text={t('selectCategoryFirst')} />
          ) : subCategoriesLoading ? (
            <EmptyRow text={t('loadingSubCategories')} />
          ) : subCategories.length === 0 ? (
            <EmptyRow text={t('noSubCategories')} />
          ) : (
            <div className="divide-y divide-border">
              {subCategories.map(subCategory => (
                <div key={subCategory.id} className="flex min-h-16 items-center gap-2 px-2 hover:bg-whited/40">
                  <div className="min-w-0 flex-1 px-2 py-3">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{localizedName(subCategory, locale)}</span>
                      {!subCategory.isActive && <Badge variant="secondary">{t('inactiveBadge')}</Badge>}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    title={t('editSubCategory')}
                    onClick={() => setEditorOpen({ kind: 'subCategory', item: subCategory })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title={subCategory.isActive ? t('deactivateSubCategory') : t('activateSubCategory')}
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
              toast.success(t('typeUpdated'))
            } else {
              const created = await createType.mutateAsync(values)
              setMemoTypeId(created.id)
              toast.success(t('typeCreated'))
            }
          }}
        />
      )}
      {editorOpen?.kind === 'category' && (
        <NameOnlyEditor
          title={editorOpen.item ? t('categoryEditTitle') : t('categoryAddTitle')}
          initial={editorOpen.item}
          onClose={() => setEditorOpen(null)}
          onSave={async values => {
            if (editorOpen.item) {
              await updateCategory.mutateAsync({ id: editorOpen.item.id, ...values })
              toast.success(t('categoryUpdated'))
            } else {
              await createCategory.mutateAsync({ memoTypeId, ...values })
              toast.success(t('categoryCreated'))
            }
          }}
        />
      )}
      {editorOpen?.kind === 'subCategory' && (
        <NameOnlyEditor
          title={editorOpen.item ? t('subCategoryEditTitle') : t('subCategoryAddTitle')}
          initial={editorOpen.item}
          onClose={() => setEditorOpen(null)}
          onSave={async values => {
            if (editorOpen.item) {
              await updateSubCategory.mutateAsync({ id: editorOpen.item.id, ...values })
              toast.success(t('subCategoryUpdated'))
            } else {
              await createSubCategory.mutateAsync({ memoCategoryId: categoryId, ...values })
              toast.success(t('subCategoryCreated'))
            }
          }}
        />
      )}

      <ConfirmModal
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={confirmToggle}
        title={toggleTarget?.item.isActive ? t('toggleOffTitle') : t('toggleOnTitle')}
        description={toggleTarget
          ? (toggleTarget.item.isActive
              ? t('confirmDeactivate', { name: toggleTarget.item.name })
              : t('confirmActivate', { name: toggleTarget.item.name }))
          : undefined}
        confirmLabel={tCommon('action.confirm')}
        variant={toggleTarget?.item.isActive ? 'destructive' : 'default'}
        loading={toggleType.isPending || toggleCategory.isPending || toggleSubCategory.isPending}
      />
    </div>
  )
}
