'use client'

import { useEffect, useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { ChevronRight, ChevronDown, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { usePermissionGate } from '@/hooks/use-permission-gate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useCompanies, useCreateCompany, useUpdateCompany } from '@/hooks/use-companies'
import type { CompanyDto, CompanyTreeDto, OrgType } from '@hrms/shared-types'
import { ORG_TYPE_LABEL } from '@hrms/i18n/labels'
import { useApiError } from '@/hooks/use-api-error'

// ── Helpers ───────────────────────────────────────────────────────────────────

const ORG_TYPE_VARIANT: Record<OrgType, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  Holding: 'default',
  Subsidiary: 'secondary',
  Branch: 'warning',
  School: 'destructive',
}

function flattenTree(nodes: CompanyTreeDto[]): CompanyDto[] {
  const result: CompanyDto[] = []
  function walk(list: CompanyTreeDto[]) {
    for (const n of list) {
      result.push({
        id: n.id, name: n.name, nameEn: n.nameEn, nameId: n.nameId,
        orgType: n.orgType, isActive: n.isActive,
        isHeadquarters: n.isHeadquarters,
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

// ข้อความ validation มาจาก useTranslations จึงสร้าง schema ใน component
type TranslateFn = (key: string) => string

function buildCompanySchema(t: TranslateFn) {
  return z.object({
  name:           z.string().min(1, t('errorNameRequired')).max(200),
  nameEn:         z.string().max(200).optional().or(z.literal('')),
  nameId:         z.string().max(200).optional().or(z.literal('')),
  orgType:        z.enum(['Holding', 'Subsidiary', 'Branch', 'School']),
  parentId:       z.string().optional().or(z.literal('')),
  isHeadquarters: z.boolean(),
  })
}

type CompanyFormValues = z.infer<ReturnType<typeof buildCompanySchema>>

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
  const t = useTranslations('admin.org.companies')
  const tOrg = useTranslations('admin.org.common')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const companySchema = useMemo(() => buildCompanySchema(t), [t])
  const create = useCreateCompany()
  const { register, handleSubmit, setError, reset, formState: { errors, isSubmitting } } =
    useForm<CompanyFormValues>({
      resolver: zodResolver(companySchema),
      defaultValues: { orgType: 'Subsidiary', isHeadquarters: false },
    })

  async function onSubmit(values: CompanyFormValues) {
    try {
      await create.mutateAsync({
        name:           values.name,
        nameEn:         values.nameEn || undefined,
        nameId:         values.nameId ?? '',
        orgType:        values.orgType,
        parentId:       values.parentId || undefined,
        isHeadquarters: values.isHeadquarters,
      })
      toast.success(t('createSuccess', { name: values.name }))
      reset()
      onClose()
    } catch (err: unknown) {
      const e = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (e === 'DUPLICATE_COMPANY') setError('name', { message: t('errorDuplicate') })
      else if (e === 'PARENT_NOT_FOUND') setError('parentId', { message: t('errorParentNotFound') })
      else if (e === 'PARENT_INACTIVE') setError('parentId', { message: t('errorParentInactive') })
      else { setError('root', { message: apiError(err, tOrg('errorRetry')) }); toast.error(apiError(err, tOrg('error'))) }
    }
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title={t('addTitle')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="c-name">{t('companyNameTh')} *</Label>
          <Input id="c-name" {...register('name')} placeholder={t('namePlaceholder')} />
          <FieldError message={errors.name?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="c-nameen">{t('companyNameEn')}</Label>
          <Input id="c-nameen" {...register('nameEn')} placeholder="Test System Co., Ltd." />
          <FieldError message={errors.nameEn?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="c-nameid">{t('companyNameId')}</Label>
          <Input id="c-nameid" {...register('nameId')} placeholder="PT Test System" />
          <FieldError message={errors.nameId?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="c-orgtype">{t('orgType')} *</Label>
          <Select id="c-orgtype" {...register('orgType')}>
            <option value="Holding">{t('orgTypeHolding')}</option>
            <option value="Subsidiary">{t('orgTypeSubsidiary')}</option>
            <option value="Branch">{t('orgTypeBranch')}</option>
            <option value="School">{t('orgTypeSchool')}</option>
          </Select>
          <FieldError message={errors.orgType?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="c-parent">{t('parent')}</Label>
          <Select id="c-parent" {...register('parentId')}>
            <option value="">{t('noParent')}</option>
            {allCompanies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <FieldError message={errors.parentId?.message} />
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input type="checkbox" className="rounded border-border" {...register('isHeadquarters')} />
          <span>{t('hqHint')}</span>
        </label>

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

function EditCompanyModal({
  company,
  onClose,
  allCompanies,
}: {
  company: CompanyDto
  onClose: () => void
  allCompanies: CompanyDto[]
}) {
  const t = useTranslations('admin.org.companies')
  const tOrg = useTranslations('admin.org.common')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const companySchema = useMemo(() => buildCompanySchema(t), [t])
  const update = useUpdateCompany()
  const [deactivateConfirm, setDeactivateConfirm] = useState(false)

  const { register, handleSubmit, setError, getValues, formState: { errors, isSubmitting, isDirty } } =
    useForm<CompanyFormValues>({
      resolver: zodResolver(companySchema),
      defaultValues: {
        name:           company.name,
        nameEn:         company.nameEn ?? '',
        nameId:         company.nameId ?? '',
        orgType:        company.orgType as OrgType,
        parentId:       company.parentId ?? '',
        isHeadquarters: company.isHeadquarters,
      },
    })

  async function doUpdate(values: CompanyFormValues, isActive: boolean) {
    try {
      await update.mutateAsync({
        id:             company.id,
        name:           values.name,
        nameEn:         values.nameEn || undefined,
        nameId:         values.nameId ?? '',
        orgType:        values.orgType,
        parentId:       values.parentId || undefined,
        isActive,
        isHeadquarters: values.isHeadquarters,
      })
      toast.success(t('updateSuccess'))
      setDeactivateConfirm(false)
      onClose()
    } catch (err: unknown) {
      const e = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (e === 'CIRCULAR_PARENT') setError('parentId', { message: t('errorCircularParent') })
      else if (e === 'HAS_ACTIVE_CHILDREN') toast.error(t('errorHasActiveChildren'))
      else { setError('root', { message: apiError(err, tOrg('error')) }); toast.error(apiError(err, tOrg('error'))) }
    }
  }

  const otherCompanies = allCompanies.filter((c) => c.id !== company.id)

  return (
    <>
      <Modal open onClose={onClose} title={tOrg('editTitle', { name: company.name })}>
        <form onSubmit={handleSubmit((v) => doUpdate(v, company.isActive))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="e-name">{t('companyNameTh')} *</Label>
            <Input id="e-name" {...register('name')} />
            <FieldError message={errors.name?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="e-nameen">{t('companyNameEn')}</Label>
            <Input id="e-nameen" {...register('nameEn')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="e-nameid">{t('companyNameId')}</Label>
            <Input id="e-nameid" {...register('nameId')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="e-orgtype">{t('orgType')} *</Label>
            <Select id="e-orgtype" {...register('orgType')}>
              <option value="Holding">{t('orgTypeHolding')}</option>
              <option value="Subsidiary">{t('orgTypeSubsidiary')}</option>
              <option value="Branch">{t('orgTypeBranch')}</option>
              <option value="School">{t('orgTypeSchool')}</option>
            </Select>
            <FieldError message={errors.orgType?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="e-parent">{t('parent')}</Label>
            <Select id="e-parent" {...register('parentId')}>
              <option value="">{t('noParent')}</option>
              {otherCompanies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <FieldError message={errors.parentId?.message} />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input type="checkbox" className="rounded border-border" {...register('isHeadquarters')} />
            <span>{t('hq')}</span>
          </label>

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
              {company.isActive ? tOrg('deactivate') : tOrg('activate')}
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>{tCommon('action.cancel')}</Button>
              <Button type="submit" loading={isSubmitting} disabled={!isDirty}>{tCommon('action.save')}</Button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={deactivateConfirm}
        onClose={() => setDeactivateConfirm(false)}
        onConfirm={() => doUpdate(getValues(), false)}
        title={t('deactivateTitle')}
        description={t('deactivateDesc', { name: company.name })}
        confirmLabel={tOrg('deactivate')}
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
}: {
  node: CompanyTreeDto
  depth: number
}) {
  const t = useTranslations('admin.org.companies')
  const tOrg = useTranslations('admin.org.common')
  const [expanded, setExpanded] = useState(depth === 0)
  const hasChildren = node.children.length > 0

  return (
    <div>
      <div
        className="group flex items-center gap-2 rounded-md px-2 py-2 hover:bg-whited/50 transition-colors"
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
        {node.isHeadquarters && (
          <Badge variant="default" className="text-white-xs bg-amber-500 hover:bg-amber-500">HQ</Badge>
        )}
        {!node.isActive && (
          <Badge variant="secondary" className="text-xs">{tOrg('statusInactive')}</Badge>
        )}

        <Link
          href={`/companies/${node.id}`}
          className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          {t('viewDetail')}
        </Link>
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <CompanyTreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CompaniesPage() {
  const t = useTranslations('admin.org.companies')
  const router = useRouter()
  const { has, hasAny } = usePermissionGate()
  // เข้าหน้าได้ถ้าดูข้อมูลบริษัทได้ · ปุ่มเพิ่มบริษัทเฉพาะผู้จัดการโครงสร้างบริษัท
  const canView = hasAny(['company:view', 'company:edit', 'system:manage-companies'], ['Admin', 'Hr'])
  const isAdmin = has('system:manage-companies', ['Admin'])

  const [showInactive, setShowInactive] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const { data: tree = [], isLoading } = useCompanies(showInactive)
  const allFlat = flattenTree(tree).filter((c) => c.isActive)

  useEffect(() => {
    if (!canView) router.replace('/dashboard')
  }, [canView, router])

  if (!canView) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">{t('title')}</h1>
        {isAdmin && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />{t('add')}
          </Button>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer w-fit">
        <input
          type="checkbox"
          className="rounded border-border"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
        />
        {t('showAll')}
      </label>

      <div className="rounded-lg border border-border bg-background">
        {isLoading ? (
          <div className="space-y-1 p-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-md bg-whited" style={{ marginLeft: `${(i % 3) * 20}px` }} />
            ))}
          </div>
        ) : tree.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <div className="p-2">
            {tree.map((node) => (
              <CompanyTreeNode
                key={node.id}
                node={node}
                depth={0}
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
    </div>
  )
}
