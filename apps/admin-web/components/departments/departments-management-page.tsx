'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Pencil, Users } from 'lucide-react'
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
import { useDepartments, useCreateDepartment, useUpdateDepartment } from '@/hooks/use-departments'
import { useEmployees } from '@/hooks/use-employees'
import { useShifts } from '@/hooks/use-shifts'
import type { DepartmentListItemDto } from '@hrms/shared-types'
import { useApiError } from '@/hooks/use-api-error'

// ── Helpers ───────────────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive mt-0.5">{message}</p>
}

// ── Schemas ───────────────────────────────────────────────────────────────────

// ข้อความ validation มาจาก useTranslations จึงสร้าง schema ใน component
function buildDeptSchema(t: (key: string) => string) {
  return z.object({
  companyId: z.string().min(1, t('errorSelectCompany')),
  name: z.string().min(1, t('errorNameRequired')).max(200),
  nameEn: z.string().max(200).optional().or(z.literal('')),
  nameId: z.string().max(200).optional().or(z.literal('')),
  deptType: z.string().max(100).optional().or(z.literal('')),
  })
}

type DeptFormValues = z.infer<ReturnType<typeof buildDeptSchema>>

// ── Create Modal ──────────────────────────────────────────────────────────────

function CreateDeptModal({
  open,
  onClose,
  defaultCompanyId,
  lockedCompanyName,
}: {
  open: boolean
  onClose: () => void
  defaultCompanyId?: string
  lockedCompanyName?: string
}) {
  const t = useTranslations('admin.org.departments')
  const tOrg = useTranslations('admin.org.common')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const deptSchema = useMemo(() => buildDeptSchema(t), [t])
  const { data: tree = [] } = useCompanies()
  const create = useCreateDepartment()

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
    useForm<DeptFormValues>({
      resolver: zodResolver(deptSchema),
      defaultValues: { companyId: defaultCompanyId ?? '' },
    })

  async function onSubmit(values: DeptFormValues) {
    try {
      await create.mutateAsync({
        companyId: values.companyId,
        name: values.name,
        nameEn: values.nameEn ?? '',
        nameId: values.nameId ?? '',
        deptType: values.deptType || undefined,
      })
      toast.success(t('createSuccess', { name: values.name }))
      reset({ companyId: defaultCompanyId ?? '' })
      onClose()
    } catch (err: unknown) {
      const e = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (e === 'DUPLICATE_DEPARTMENT') setError('name', { message: t('errorDuplicate') })
      else if (e === 'COMPANY_NOT_FOUND') setError('companyId', { message: t('errorCompanyNotFound') })
      else { setError('root', { message: apiError(err, tOrg('errorRetry')) }); toast.error(apiError(err, tOrg('error'))) }
    }
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title={t('addTitle')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {lockedCompanyName ? (
          <div className="space-y-1.5">
            <Label>{tOrg('company')}</Label>
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm font-medium">
              {lockedCompanyName}
            </div>
            <input type="hidden" {...register('companyId')} />
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="d-company">{tOrg('company')} *</Label>
            <Select id="d-company" {...register('companyId')}>
              <option value="">{tOrg('selectCompany')}</option>
              {activeCompanies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <FieldError message={errors.companyId?.message} />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="d-name">{t('name')} *</Label>
          <Input id="d-name" {...register('name')} placeholder={t('namePlaceholder')} />
          <FieldError message={errors.name?.message} />
        </div>

        {/* ชื่อภาษาอื่นสำหรับหน้าจอที่สลับภาษา — ว่างได้ ระบบจะแสดงชื่อไทยแทน */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="d-name-en">{tOrg('nameEn')}</Label>
            <Input id="d-name-en" {...register('nameEn')} placeholder="Human Resources" />
            <FieldError message={errors.nameEn?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-name-id">{tOrg('nameId')}</Label>
            <Input id="d-name-id" {...register('nameId')} placeholder="Sumber Daya Manusia" />
            <FieldError message={errors.nameId?.message} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="d-type">{t('deptType')}</Label>
          <Input id="d-type" {...register('deptType')} placeholder={t('deptTypePlaceholder')} />
          <FieldError message={errors.deptType?.message} />
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
function buildEditDeptSchema(t: (key: string) => string) {
  return z.object({
  name: z.string().min(1, t('errorNameRequired')).max(200),
  nameEn: z.string().max(200).optional().or(z.literal('')),
  nameId: z.string().max(200).optional().or(z.literal('')),
  deptType: z.string().max(100).optional().or(z.literal('')),
  shiftId: z.string().optional().or(z.literal('')),
  managerEmployeeId: z.string().optional().or(z.literal('')),
  })
}

type EditDeptFormValues = z.infer<ReturnType<typeof buildEditDeptSchema>>

function EditDeptModal({
  dept,
  onClose,
}: {
  dept: DepartmentListItemDto
  onClose: () => void
}) {
  const t = useTranslations('admin.org.departments')
  const tOrg = useTranslations('admin.org.common')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const editDeptSchema = useMemo(() => buildEditDeptSchema(t), [t])
  const update = useUpdateDepartment()
  const [deactivateConfirm, setDeactivateConfirm] = useState(false)

  const { data: shifts = [] } = useShifts(dept.companyId)
  const activeShifts = shifts.filter((s) => s.isActive)

  const { data: employeesResult } = useEmployees({ departmentId: dept.id, isActive: true, pageSize: 200 })
  const departmentEmployees = employeesResult?.items ?? []

  const { register, handleSubmit, setError, getValues, formState: { errors, isSubmitting, isDirty } } =
    useForm<EditDeptFormValues>({
      resolver: zodResolver(editDeptSchema),
      defaultValues: {
        name: dept.name,
        nameEn: dept.nameEn ?? '',
        nameId: dept.nameId ?? '',
        deptType: dept.deptType ?? '',
        shiftId: dept.shiftId ?? '',
        managerEmployeeId: dept.managerEmployeeId ?? '',
      },
    })

  async function doUpdate(values: EditDeptFormValues, isActive: boolean) {
    try {
      await update.mutateAsync({
        id: dept.id,
        name: values.name,
        nameEn: values.nameEn ?? '',
        nameId: values.nameId ?? '',
        deptType: values.deptType || undefined,
        shiftId: values.shiftId || null,
        managerEmployeeId: values.managerEmployeeId || undefined,
        isActive,
      })
      toast.success(t('updateSuccess'))
      setDeactivateConfirm(false)
      onClose()
    } catch (err: unknown) {
      const e = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (e === 'DUPLICATE_DEPARTMENT') setError('name', { message: t('errorDuplicate') })
      else if (e === 'HAS_ACTIVE_EMPLOYEES') toast.error(t('errorHasActiveEmployees'))
      else { setError('root', { message: apiError(err, tOrg('error')) }); toast.error(apiError(err, tOrg('error'))) }
    }
  }

  return (
    <>
      <Modal open onClose={onClose} title={tOrg('editTitle', { name: dept.name })}>
        <form onSubmit={handleSubmit((v) => doUpdate(v, dept.isActive))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ed-name">{t('name')} *</Label>
            <Input id="ed-name" {...register('name')} />
            <FieldError message={errors.name?.message} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ed-name-en">{tOrg('nameEn')}</Label>
              <Input id="ed-name-en" {...register('nameEn')} />
              <FieldError message={errors.nameEn?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ed-name-id">{tOrg('nameId')}</Label>
              <Input id="ed-name-id" {...register('nameId')} />
              <FieldError message={errors.nameId?.message} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ed-type">{t('deptType')}</Label>
            <Input id="ed-type" {...register('deptType')} placeholder={t('deptTypePlaceholder')} />
            <FieldError message={errors.deptType?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ed-shift">{t('defaultShift')}</Label>
            <Select id="ed-shift" {...register('shiftId')}>
              <option value="">{t('useCompanyShift')}</option>
              {activeShifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)})
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ed-manager">{t('manager')}</Label>
            <Select id="ed-manager" {...register('managerEmployeeId')}>
              <option value="">{t('noManager')}</option>
              {departmentEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.employeeCode} — {emp.fullName}
                </option>
              ))}
            </Select>
            {dept.managerEmployeeId && !departmentEmployees.some((emp) => emp.id === dept.managerEmployeeId) && (
              <p className="text-xs text-muted-foreground">
                {t('managerMissing', { name: dept.managerName ?? dept.managerEmployeeId ?? '' })}
              </p>
            )}
          </div>

          {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

          <div className="flex items-center justify-between pt-1">
            <Button
              type="button"
              variant={dept.isActive ? 'destructive' : 'ghost'}
              size="sm"
              onClick={() =>
                dept.isActive ? setDeactivateConfirm(true) : doUpdate(getValues(), true)
              }
              loading={update.isPending}
            >
              {dept.isActive ? tOrg('deactivate') : tOrg('activate')}
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
        description={t('deactivateDesc', { name: dept.name })}
        confirmLabel={tOrg('deactivate')}
        variant="destructive"
        loading={update.isPending}
      />
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function DepartmentsManagementPage({
  companyId,
  companyName,
}: {
  companyId?: string
  companyName?: string
}) {
  const t = useTranslations('admin.org.departments')
  const tOrg = useTranslations('admin.org.common')
  const isScopedToCompany = !!companyId
  const [companyFilter, setCompanyFilter] = useState(companyId ?? '')
  const [showInactive, setShowInactive] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<DepartmentListItemDto | null>(null)

  const { data: tree = [] } = useCompanies()
  const effectiveCompanyId = companyId ?? companyFilter
  const { data: departments = [], isLoading } = useDepartments(
    effectiveCompanyId || undefined,
    showInactive,
  )

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
        <div>
          <h1 className="text-xl font-semibold text-foreground">{t('title')}</h1>
          {companyName && (
            <p className="mt-1 text-sm text-muted-foreground">{companyName}</p>
          )}
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />{t('add')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {!isScopedToCompany && (
          <Select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="w-56"
          >
            <option value="">{tOrg('allCompanies')}</option>
            {activeCompanies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        )}

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

      {/* Table */}
      <div className="rounded-lg border border-border bg-background overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-whited/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('colName')}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('colType')}</th>
              {!isScopedToCompany && (
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{tOrg('company')}</th>
              )}
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                <Users className="h-4 w-4 mx-auto" />
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{tOrg('colStatus')}</th>
              <th className="w-12" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {Array.from({ length: isScopedToCompany ? 5 : 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-whited" />
                    </td>
                  ))}
                </tr>
              ))
            ) : departments.length === 0 ? (
              <tr>
                <td colSpan={isScopedToCompany ? 5 : 6} className="py-12 text-center text-muted-foreground">
                  {effectiveCompanyId ? t('emptyInCompany') : t('empty')}
                </td>
              </tr>
            ) : (
              departments.map((dept) => (
                <tr
                  key={dept.id}
                  className="border-b border-border last:border-0 hover:bg-whited/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className={dept.isActive ? 'text-foreground font-medium' : 'text-muted-foreground line-through'}>
                      {dept.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {dept.deptType ?? <span className="text-muted-foreground/50">—</span>}
                  </td>
                  {!isScopedToCompany && (
                    <td className="px-4 py-3 text-muted-foreground">
                      {activeCompanies.find((c) => c.id === dept.companyId)?.name ?? dept.companyId}
                    </td>
                  )}
                  <td className="px-4 py-3 text-center text-muted-foreground">
                    {dept.employeeCount}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={dept.isActive ? 'success' : 'secondary'}>
                      {dept.isActive ? tOrg('statusActive') : tOrg('statusInactive')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setEditTarget(dept)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CreateDeptModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultCompanyId={effectiveCompanyId || undefined}
        lockedCompanyName={companyName}
      />

      {editTarget && (
        <EditDeptModal dept={editTarget} onClose={() => setEditTarget(null)} />
      )}
    </div>
  )
}
