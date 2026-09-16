'use client'

import { useState, useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { useShifts, useCreateShift, useUpdateShift, useToggleShiftStatus } from '@/hooks/use-shifts'
import { useCompanies } from '@/hooks/use-companies'
import { useAuthStore } from '@/stores/auth.store'
import type { ShiftDto } from '@/types/admin'
import type { CompanyTreeDto } from '@hrms/shared-types'
import { localizedName, type Locale } from '@hrms/i18n'
import { useApiError } from '@/hooks/use-api-error'

function flattenCompanies(nodes: CompanyTreeDto[]): CompanyTreeDto[] {
  return nodes.flatMap((n) => [n, ...flattenCompanies(n.children)])
}

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(t: string) {
  return t.slice(0, 5) // "08:15:00" → "08:15"
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive mt-0.5">{message}</p>
}

// ── schema ───────────────────────────────────────────────────────────────────
// ข้อความ validation ต้องมาจาก useTranslations จึงสร้าง schema ใน component (แบบเดียวกับงาน 2.5)

type ShiftTexts = (key: string) => string

function buildShiftSchema(t: ShiftTexts) {
  return z
    .object({
      companyId: z.string().min(1, t('validation.company')),
      name: z.string().min(1, t('validation.name')).max(100),
      nameEn: z.string().max(100).optional().or(z.literal('')),
      nameId: z.string().max(100).optional().or(z.literal('')),
      startTime: z.string().regex(/^\d{2}:\d{2}$/, t('validation.timeFormat')),
      endTime: z.string().regex(/^\d{2}:\d{2}$/, t('validation.timeFormat')),
      gracePeriodMinutes: z.number().int().min(0).max(120),
    })
    .refine((d) => d.startTime < d.endTime, {
      message: t('validation.timeOrder'),
      path: ['endTime'],
    })
}

type ShiftValues = z.infer<ReturnType<typeof buildShiftSchema>>

// ── Create Modal ──────────────────────────────────────────────────────────────

function CreateModal({
  open,
  onClose,
  defaultCompanyId,
  companies,
}: {
  open: boolean
  onClose: () => void
  defaultCompanyId?: string
  companies: CompanyTreeDto[]
}) {
  const t = useTranslations('admin.settings.shifts')
  const tOrg = useTranslations('admin.org.common')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const locale = useLocale() as Locale
  const create = useCreateShift()
  const schema = useMemo(() => buildShiftSchema(t), [t])
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ShiftValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyId: defaultCompanyId ?? '',
      startTime: '08:00',
      endTime: '17:00',
      gracePeriodMinutes: 0,
    },
  })

  async function onSubmit(values: ShiftValues) {
    try {
      await create.mutateAsync({
        companyId: values.companyId,
        name: values.name,
        nameEn: values.nameEn ?? '',
        nameId: values.nameId ?? '',
        startTime: values.startTime + ':00',
        endTime: values.endTime + ':00',
        gracePeriodMinutes: values.gracePeriodMinutes,
      })
      toast.success(t('created', { name: values.name }))
      reset()
      onClose()
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data
      if (apiErr?.error === 'DUPLICATE_SHIFT')
        setError('name', { message: t('duplicate') })
      else
        toast.error(apiError(err, tCommon('state.error')))
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('addTitle')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="c-company">{tOrg('company')} <span className='text-red-500'>*</span></Label>
          <select
            id="c-company"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            {...register('companyId')}
          >
            <option value="">{tOrg('selectCompany')}</option>
            {companies?.map((c) => (
              <option key={c.id} value={c.id}>
                {localizedName(c, locale)}
              </option>
            ))}
          </select>
          <FieldError message={errors.companyId?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="c-name">{t('name')} <span className='text-red-500'>*</span></Label>
          <Input id="c-name" placeholder={t('namePlaceholder')} {...register('name')} />
          <FieldError message={errors.name?.message} />
        </div>

        {/* ชื่อภาษาอื่นสำหรับหน้าจอที่สลับภาษา — ว่างได้ ระบบจะแสดงชื่อไทยแทน */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="c-name-en">{tOrg('nameEn')}</Label>
            <Input id="c-name-en" {...register('nameEn')} />
            <FieldError message={errors.nameEn?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-name-id">{tOrg('nameId')}</Label>
            <Input id="c-name-id" {...register('nameId')} />
            <FieldError message={errors.nameId?.message} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="c-start">{t('startTime')} <span className='text-red-500'>*</span></Label>
            <Input id="c-start" type="time" {...register('startTime')} />
            <FieldError message={errors.startTime?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-end">{t('endTime')} <span className='text-red-500'>*</span></Label>
            <Input id="c-end" type="time" {...register('endTime')} />
            <FieldError message={errors.endTime?.message} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="c-grace">{t('gracePeriod')}</Label>
          <Input
            id="c-grace"
            type="number"
            min={0}
            max={120}
            {...register('gracePeriodMinutes', { valueAsNumber: true })}
          />
          <FieldError message={errors.gracePeriodMinutes?.message} />
        </div>

        {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {tCommon('action.cancel')}
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {tCommon('action.save')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

function EditModal({ item, onClose }: { item: ShiftDto; onClose: () => void }) {
  const t = useTranslations('admin.settings.shifts')
  const tOrg = useTranslations('admin.org.common')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const update = useUpdateShift()
  const toggle = useToggleShiftStatus()
  const schema = useMemo(() => buildShiftSchema(t), [t])
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ShiftValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyId: item.companyId,
      name: item.name,
      nameEn: item.nameEn ?? '',
      nameId: item.nameId ?? '',
      startTime: fmt(item.startTime),
      endTime: fmt(item.endTime),
      gracePeriodMinutes: item.gracePeriodMinutes,
    },
  })

  async function onSubmit(values: ShiftValues) {
    try {
      await update.mutateAsync({
        id: item.id,
        name: values.name,
        nameEn: values.nameEn ?? '',
        nameId: values.nameId ?? '',
        startTime: values.startTime + ':00',
        endTime: values.endTime + ':00',
        gracePeriodMinutes: values.gracePeriodMinutes,
        isActive: item.isActive,
      })
      toast.success(t('saved', { name: values.name }))
      onClose()
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data
      if (apiErr?.error === 'DUPLICATE_SHIFT')
        setError('name', { message: t('duplicate') })
      else
        toast.error(apiError(err, tCommon('state.error')))
    }
  }

  async function handleToggle() {
    try {
      await toggle.mutateAsync({ id: item.id, isActive: !item.isActive })
      toast.success(item.isActive
        ? t('deactivated', { name: item.name })
        : t('activated', { name: item.name }))
      onClose()
    } catch {
      toast.error(tCommon('state.error'))
    }
  }

  return (
    <Modal open onClose={onClose} title={`${item.name}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t('companyLocked')}</Label>
          <Input value={item.companyName} disabled />
          <input type="hidden" {...register('companyId')} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="e-name">{t('shiftName')} <span className='text-red-500'>*</span></Label>
          <Input id="e-name" {...register('name')} />
          <FieldError message={errors.name?.message} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="e-name-en">{tOrg('nameEn')}</Label>
            <Input id="e-name-en" {...register('nameEn')} />
            <FieldError message={errors.nameEn?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-name-id">{tOrg('nameId')}</Label>
            <Input id="e-name-id" {...register('nameId')} />
            <FieldError message={errors.nameId?.message} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="e-start">{t('startTime')} <span className='text-red-500'>*</span></Label>
            <Input id="e-start" type="time" {...register('startTime')} />
            <FieldError message={errors.startTime?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-end">{t('endTime')} <span className='text-red-500'>*</span></Label>
            <Input id="e-end" type="time" {...register('endTime')} />
            <FieldError message={errors.endTime?.message} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="e-grace">{t('gracePeriod')}</Label>
          <Input
            id="e-grace"
            type="number"
            min={0}
            max={120}
            {...register('gracePeriodMinutes', { valueAsNumber: true })}
          />
          <FieldError message={errors.gracePeriodMinutes?.message} />
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          <Button
            type="button"
            variant={item.isActive ? 'destructive' : 'outline'}
            onClick={handleToggle}
            loading={toggle.isPending}
          >
            {item.isActive ? tOrg('deactivate') : tOrg('activate')}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {tCommon('action.cancel')}
            </Button>
            <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
              {tCommon('action.save')}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ShiftsPage() {
  const t = useTranslations('admin.settings.shifts')
  const tOrg = useTranslations('admin.org.common')
  const locale = useLocale() as Locale
  const employee = useAuthStore((s) => s.employee)
  const isAdmin = employee?.roles.some((r) => r.role === 'Admin') ?? false
  const isHr = employee?.roles.some((r) => r.role === 'Hr') ?? false

  const { data: companiesTree } = useCompanies()
  const allCompanies = useMemo(() => flattenCompanies(companiesTree ?? []), [companiesTree])

  const myCompany = allCompanies.find((c) => c.id === employee?.companyId)
  const isHqHr = isHr && (myCompany?.isHeadquarters ?? false)
  const canSeeAll = isAdmin || isHqHr

  const [companyId, setCompanyId] = useState<string | undefined>(
    canSeeAll ? undefined : (employee?.companyId ?? undefined),
  )
  const [includeInactive, setIncludeInactive] = useState(false)

  const { data: shifts, isLoading } = useShifts(companyId, includeInactive)

  const [createOpen, setCreateOpen] = useState(false)
  const [editItem, setEditItem] = useState<ShiftDto | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">{t('title')}</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          {t('add')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {canSeeAll && (
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={companyId ?? ''}
            onChange={(e) => setCompanyId(e.target.value || undefined)}
          >
            <option value="">{tOrg('allCompanies')}</option>
            {allCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {localizedName(c, locale)}
              </option>
            ))}
          </select>
        )}
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded border-border"
          />
          {t('includeInactive')}
        </label>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-whited/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('colName')}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('colCompany')}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('colStart')}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('colEnd')}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('colGrace')}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{tOrg('colStatus')}</th>
              <th className="px-4 py-3 w-12" />
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-20 animate-pulse rounded bg-whited" />
                    </td>
                  ))}
                </tr>
              ))}

            {!isLoading && (!shifts || shifts.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  {t('empty')}
                </td>
              </tr>
            )}

            {!isLoading &&
              shifts?.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-border last:border-0 hover:bg-whited/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{localizedName(s, locale)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{s.companyName}</td>
                  <td className="px-4 py-3 font-mono">{fmt(s.startTime)}</td>
                  <td className="px-4 py-3 font-mono">{fmt(s.endTime)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.gracePeriodMinutes > 0 ? t('graceMinutes', { count: s.gracePeriodMinutes }) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={s.isActive ? 'success' : 'secondary'}>
                      {s.isActive ? tOrg('statusActive') : tOrg('statusInactive')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setEditItem(s)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <CreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultCompanyId={companyId}
        companies={allCompanies}
      />
      {editItem && <EditModal item={editItem} onClose={() => setEditItem(null)} />}
    </div>
  )
}
