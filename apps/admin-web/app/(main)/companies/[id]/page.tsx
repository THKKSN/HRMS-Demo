'use client'

import { use, useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { ArrowLeft, Building2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { CompanyDto, CompanyTreeDto, OrgType } from '@hrms/shared-types'
import { ORG_TYPE_LABEL } from '@hrms/i18n/labels'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { DepartmentsManagementPage } from '@/components/departments/departments-management-page'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { useCompanies, useCompany, useUpdateCompany } from '@/hooks/use-companies'
import { useApiError } from '@/hooks/use-api-error'

const ORG_TYPE_VARIANT: Record<OrgType, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  Holding: 'default',
  Subsidiary: 'secondary',
  Branch: 'warning',
  School: 'destructive',
}

// ข้อความ validation มาจาก useTranslations จึงสร้าง schema ใน component
function buildCompanySchema(t: (key: string) => string) {
  return z.object({
  name: z.string().min(1, t('errorNameRequired')).max(200),
  nameEn: z.string().max(200).optional().or(z.literal('')),
  nameId: z.string().max(200).optional().or(z.literal('')),
  orgType: z.enum(['Holding', 'Subsidiary', 'Branch', 'School']),
  parentId: z.string().optional().or(z.literal('')),
  isHeadquarters: z.boolean(),
  })
}

type CompanyFormValues = z.infer<ReturnType<typeof buildCompanySchema>>

function flattenTree(nodes: CompanyTreeDto[]): CompanyDto[] {
  const result: CompanyDto[] = []
  function walk(list: CompanyTreeDto[]) {
    for (const n of list) {
      result.push({
        id: n.id,
        name: n.name,
        nameEn: n.nameEn,
        nameId: n.nameId,
        orgType: n.orgType,
        isActive: n.isActive,
        isHeadquarters: n.isHeadquarters,
        parentId: undefined,
        parentName: undefined,
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
        name: company.name,
        nameEn: company.nameEn ?? '',
        nameId: company.nameId ?? '',
        orgType: company.orgType as OrgType,
        parentId: company.parentId ?? '',
        isHeadquarters: company.isHeadquarters,
      },
    })

  async function doUpdate(values: CompanyFormValues, isActive: boolean) {
    try {
      await update.mutateAsync({
        id: company.id,
        name: values.name,
        nameEn: values.nameEn || undefined,
        nameId: values.nameId ?? '',
        orgType: values.orgType,
        parentId: values.parentId || undefined,
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
            <Label htmlFor="company-name">{t('companyNameTh')} *</Label>
            <Input id="company-name" {...register('name')} />
            <FieldError message={errors.name?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company-name-en">{t('companyNameEn')}</Label>
            <Input id="company-name-en" {...register('nameEn')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company-name-id">{t('companyNameId')}</Label>
            <Input id="company-name-id" {...register('nameId')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company-org-type">{t('orgType')} *</Label>
            <Select id="company-org-type" {...register('orgType')}>
              <option value="Holding">{t('orgTypeHolding')}</option>
              <option value="Subsidiary">{t('orgTypeSubsidiary')}</option>
              <option value="Branch">{t('orgTypeBranch')}</option>
              <option value="School">{t('orgTypeSchool')}</option>
            </Select>
            <FieldError message={errors.orgType?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company-parent">{t('parent')}</Label>
            <Select id="company-parent" {...register('parentId')}>
              <option value="">{t('noParent')}</option>
              {otherCompanies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <FieldError message={errors.parentId?.message} />
          </div>

          <label className="flex cursor-pointer select-none items-center gap-2 text-sm">
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

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations('admin.org.companies')
  const tOrg = useTranslations('admin.org.common')
  const { id } = use(params)
  const { data: company, isLoading, isError } = useCompany(id)
  const { data: tree = [] } = useCompanies(true)
  const [editOpen, setEditOpen] = useState(false)
  const allCompanies = flattenTree(tree).filter((item) => item.isActive)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-32 animate-pulse rounded bg-whited" />
        <div className="h-28 animate-pulse rounded-md bg-whited" />
        <div className="h-72 animate-pulse rounded-md bg-whited" />
      </div>
    )
  }

  if (isError || !company) {
    return (
      <div className="space-y-4">
        <Link href="/companies" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t('back')}
        </Link>
        <div className="rounded-md border border-border bg-background p-6 text-sm text-destructive">
          {t('notFound')}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link href="/companies" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t('back')}
      </Link>

      <section className="rounded-md border border-border bg-background p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-semibold text-foreground">{company.name}</h1>
              {company.nameEn && <p className="mt-1 text-sm text-muted-foreground">{company.nameEn}</p>}
              {company.parentName && <p className="mt-1 text-sm text-muted-foreground">{t('under', { parent: company.parentName })}</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={ORG_TYPE_VARIANT[company.orgType as OrgType]}>
              {ORG_TYPE_LABEL[company.orgType as OrgType]}
            </Badge>
            {company.isHeadquarters && <Badge variant="warning">HQ</Badge>}
            <Badge variant={company.isActive ? 'success' : 'secondary'}>
              {company.isActive ? tOrg('statusActive') : tOrg('statusInactive')}
            </Badge>
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" /> {t('edit')}
            </Button>
          </div>
        </div>
      </section>

      <DepartmentsManagementPage companyId={company.id} companyName={company.name} />

      {editOpen && (
        <EditCompanyModal
          company={company}
          onClose={() => setEditOpen(false)}
          allCompanies={allCompanies}
        />
      )}
    </div>
  )
}
