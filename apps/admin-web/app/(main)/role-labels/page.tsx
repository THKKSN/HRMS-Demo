'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
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
import { useApiError } from '@/hooks/use-api-error'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive mt-0.5">{message}</p>
}

// ── Create Modal ──────────────────────────────────────────────────────────────

// ข้อความ validation มาจาก useTranslations จึงสร้าง schema ใน component
function buildCreateSchema(t: (key: string) => string) {
  return z.object({
  companyId: z.string().min(1, t('errorSelectCompany')),
  name: z.string().min(1, t('errorNameRequired')).max(100),
  nameEn: z.string().max(100).optional().or(z.literal('')),
  nameId: z.string().max(100).optional().or(z.literal('')),
  })
}
type CreateValues = z.infer<ReturnType<typeof buildCreateSchema>>

function CreateModal({
  open,
  onClose,
  defaultCompanyId,
}: {
  open: boolean
  onClose: () => void
  defaultCompanyId?: string
}) {
  const t = useTranslations('admin.org.roleLabels')
  const tOrg = useTranslations('admin.org.common')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const createSchema = useMemo(() => buildCreateSchema(t), [t])
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
      await create.mutateAsync({
        companyId: values.companyId,
        name: values.name,
        nameEn: values.nameEn ?? '',
        nameId: values.nameId ?? '',
      })
      toast.success(t('createSuccess', { name: values.name }))
      reset({ companyId: defaultCompanyId ?? '' })
      onClose()
    } catch (err: unknown) {
      const e = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (e === 'DUPLICATE_ROLE_LABEL') setError('name', { message: t('errorDuplicate') })
      else { setError('root', { message: apiError(err, tOrg('errorRetry')) }); toast.error(apiError(err, tOrg('error'))) }
    }
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title={t('addTitle')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="rl-company">{tOrg('company')} *</Label>
          <Select id="rl-company" {...register('companyId')}>
            <option value="">{tOrg('selectCompany')}</option>
            {activeCompanies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <FieldError message={errors.companyId?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rl-name">{t('name')} *</Label>
          <Input id="rl-name" {...register('name')} placeholder={t('namePlaceholder')} />
          <FieldError message={errors.name?.message} />
        </div>
        {/* ชื่อภาษาอื่นสำหรับหน้าจอที่สลับภาษา — ว่างได้ ระบบจะแสดงชื่อไทยแทน */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="rl-name-en">{tOrg('nameEn')}</Label>
            <Input id="rl-name-en" {...register('nameEn')} />
            <FieldError message={errors.nameEn?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rl-name-id">{tOrg('nameId')}</Label>
            <Input id="rl-name-id" {...register('nameId')} />
            <FieldError message={errors.nameId?.message} />
          </div>
        </div>
        {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={() => { reset(); onClose() }}>{tCommon('action.cancel')}</Button>
          <Button type="submit" loading={isSubmitting}>{tCommon('action.save')}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

// ข้อความ validation มาจาก useTranslations จึงสร้าง schema ใน component
function buildEditSchema(t: (key: string) => string) {
  return z.object({
  name: z.string().min(1, t('errorNameRequired')).max(100),
  nameEn: z.string().max(100).optional().or(z.literal('')),
  nameId: z.string().max(100).optional().or(z.literal('')),
  })
}
type EditValues = z.infer<ReturnType<typeof buildEditSchema>>

function EditModal({
  label,
  onClose,
}: {
  label: RoleLabelDto
  onClose: () => void
}) {
  const t = useTranslations('admin.org.roleLabels')
  const tOrg = useTranslations('admin.org.common')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const editSchema = useMemo(() => buildEditSchema(t), [t])
  const update = useUpdateRoleLabel()
  const deleteLabel = useDeleteRoleLabel()
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const { register, handleSubmit, setError, getValues, formState: { errors, isSubmitting, isDirty } } =
    useForm<EditValues>({
      resolver: zodResolver(editSchema),
      defaultValues: { name: label.name, nameEn: label.nameEn ?? '', nameId: label.nameId ?? '' },
    })

  async function doUpdate(values: EditValues, isActive: boolean) {
    try {
      await update.mutateAsync({
        id: label.id,
        name: values.name,
        nameEn: values.nameEn ?? '',
        nameId: values.nameId ?? '',
        isActive,
      })
      toast.success(t('updateSuccess'))
      onClose()
    } catch (err: unknown) {
      const e = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (e === 'DUPLICATE_ROLE_LABEL') setError('name', { message: t('errorDuplicate') })
      else { setError('root', { message: apiError(err, tOrg('error')) }); toast.error(apiError(err, tOrg('error'))) }
    }
  }

  async function handleDelete() {
    try {
      await deleteLabel.mutateAsync(label.id)
      toast.success(t('deleteSuccess', { name: label.name }))
      setDeleteConfirm(false)
      onClose()
    } catch (err: unknown) {
      const e = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(e === 'ROLE_LABEL_IN_USE' ? t('errorInUse') : tOrg('error'))
      setDeleteConfirm(false)
    }
  }

  return (
    <>
      <Modal open onClose={onClose} title={tOrg('editTitle', { name: label.name })}>
        <form onSubmit={handleSubmit((v) => doUpdate(v, label.isActive))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="erl-name">{t('name')} *</Label>
            <Input id="erl-name" {...register('name')} />
            <FieldError message={errors.name?.message} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="erl-name-en">{tOrg('nameEn')}</Label>
              <Input id="erl-name-en" {...register('nameEn')} />
              <FieldError message={errors.nameEn?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="erl-name-id">{tOrg('nameId')}</Label>
              <Input id="erl-name-id" {...register('nameId')} />
              <FieldError message={errors.nameId?.message} />
            </div>
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
                {label.isActive ? tOrg('deactivate') : tOrg('activate')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive border-destructive hover:bg-destructive/10"
                onClick={() => setDeleteConfirm(true)}
              >
                {tCommon('action.delete')}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>{tCommon('action.cancel')}</Button>
              <Button type="submit" loading={isSubmitting} disabled={!isDirty}>{tCommon('action.save')}</Button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={t('deleteTitle')}
        description={t('deleteDesc', { name: label.name })}
        confirmLabel={tCommon('action.delete')}
        variant="destructive"
        loading={deleteLabel.isPending}
      />
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RoleLabelsPage() {
  const t = useTranslations('admin.org.roleLabels')
  const tOrg = useTranslations('admin.org.common')
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
        <h1 className="text-xl font-semibold text-foreground">{t('title')}</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />{t('add')}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="w-56"
        >
          <option value="">{tOrg('selectCompany')}</option>
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
          {tOrg('showInactive')}
        </label>
      </div>

      <div className="rounded-lg border border-border bg-background overflow-hidden">
        {!companyFilter ? (
          <p className="py-12 text-center text-sm text-muted-foreground">{t('selectCompanyHint')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-whited/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('name')}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{tOrg('company')}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{tOrg('colStatus')}</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {[1, 2, 3, 4].map((j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-whited" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : labels.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-muted-foreground">
                    {t('empty')}
                  </td>
                </tr>
              ) : (
                labels.map((lbl) => (
                  <tr
                    key={lbl.id}
                    className="border-b border-border last:border-0 hover:bg-whited/30 transition-colors"
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
                        {lbl.isActive ? tOrg('statusActive') : tOrg('statusInactive')}
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
