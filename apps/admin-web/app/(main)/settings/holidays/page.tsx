'use client'

import { useState, useMemo, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Wand2, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateInput } from '@/components/ui/date-input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import {
  useHolidays,
  useCreateHoliday,
  useUpdateHoliday,
  useToggleHolidayStatus,
  useBulkCreateHolidays,
} from '@/hooks/use-holidays'
import { useHolidaySchedules, usePreviewHolidaysFromSchedule } from '@/hooks/use-holiday-schedules'
import { useCompanies } from '@/hooks/use-companies'
import { useAuthStore } from '@/stores/auth.store'
import type { HolidayDto } from '@/types/admin'
import type { CompanyTreeDto } from '@hrms/shared-types'
import { localizedName, type Locale } from '@hrms/i18n'
import * as fmt from '@hrms/i18n/format'
import { useApiError } from '@/hooks/use-api-error'

function flattenCompanies(nodes: CompanyTreeDto[]): CompanyTreeDto[] {
  return nodes.flatMap((n) => [n, ...flattenCompanies(n.children)])
}

function holidayDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return fmt.formatDate(d, { day: 'numeric', month: 'short', year: 'numeric' })
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive mt-0.5">{message}</p>
}

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = [
  CURRENT_YEAR - 2,
  CURRENT_YEAR - 1,
  CURRENT_YEAR,
  CURRENT_YEAR + 1,
  CURRENT_YEAR + 2,
]

// ── Schemas ───────────────────────────────────────────────────────────────────
// ข้อความ validation มาจาก useTranslations จึงสร้าง schema ใน component

type HolidayTexts = (key: string) => string

function buildCreateSchema(t: HolidayTexts) {
  return z
    .object({
      scope: z.enum(['national', 'company']),
      companyId: z.string().optional(),
      name: z.string().min(1, t('validation.name')).max(200),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t('validation.dateFormat')),
    })
    .refine((d) => d.scope === 'national' || !!d.companyId, {
      message: t('validation.company'),
      path: ['companyId'],
    })
}

type CreateValues = z.infer<ReturnType<typeof buildCreateSchema>>

function buildEditSchema(t: HolidayTexts) {
  return z.object({
    name: z.string().min(1, t('validation.name')).max(200),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t('validation.dateFormat')),
  })
}

type EditValues = z.infer<ReturnType<typeof buildEditSchema>>

// ── Create Modal ──────────────────────────────────────────────────────────────

function CreateModal({
  open,
  onClose,
  defaultYear,
  canSeeAll,
  companies,
}: {
  open: boolean
  onClose: () => void
  defaultYear: number
  canSeeAll: boolean
  companies: CompanyTreeDto[]
}) {
  const t = useTranslations('admin.settings.holidays')
  const tOrg = useTranslations('admin.org.common')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const locale = useLocale() as Locale
  const create = useCreateHoliday()
  const schema = useMemo(() => buildCreateSchema(t), [t])
  const {
    register,
    handleSubmit,
    watch,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      scope: canSeeAll ? 'national' : 'company',
      companyId: '',
      name: '',
      date: `${defaultYear}-01-01`,
    },
  })

  const scope = watch('scope')

  async function onSubmit(values: CreateValues) {
    try {
      await create.mutateAsync({
        companyId: values.scope === 'company' ? values.companyId : undefined,
        name: values.name,
        date: values.date,
      })
      toast.success(t('created', { name: values.name }))
      reset()
      onClose()
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data
      if (apiErr?.error === 'DUPLICATE_HOLIDAY')
        toast.error(t('duplicate'))
      else toast.error(apiError(err, tCommon('state.error')))
      void setError
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('addTitle')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {canSeeAll && (
          <div className="space-y-1.5">
            <Label>{t('scopeLabel')}</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" value="national" {...register('scope')} />
                {t('scopeNationalOption')}
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" value="company" {...register('scope')} />
                {t('scopeCompanyOption')}
              </label>
            </div>
          </div>
        )}

        {scope === 'company' && (
          <div className="space-y-1.5">
            <Label htmlFor="c-company">{tOrg('company')} *</Label>
            <select
              id="c-company"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...register('companyId')}
            >
              <option value="">{tOrg('selectCompany')}</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {localizedName(c, locale)}
                </option>
              ))}
            </select>
            <FieldError message={errors.companyId?.message} />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="c-name">{t('name')} *</Label>
          <Input id="c-name" placeholder={t('namePlaceholder')} {...register('name')} />
          <FieldError message={errors.name?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="c-date">{t('date')} *</Label>
          <DateInput id="c-date" {...register('date')} />
          <FieldError message={errors.date?.message} />
        </div>

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

function EditModal({ item, onClose }: { item: HolidayDto; onClose: () => void }) {
  const t = useTranslations('admin.settings.holidays')
  const tOrg = useTranslations('admin.org.common')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const update = useUpdateHoliday()
  const toggle = useToggleHolidayStatus()
  const schema = useMemo(() => buildEditSchema(t), [t])
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EditValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: item.name,
      date: item.date,
    },
  })

  async function onSubmit(values: EditValues) {
    try {
      await update.mutateAsync({
        id: item.id,
        name: values.name,
        date: values.date,
        isActive: item.isActive,
      })
      toast.success(t('saved', { name: values.name }))
      onClose()
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data
      if (apiErr?.error === 'DUPLICATE_HOLIDAY')
        toast.error(t('duplicate'))
      else toast.error(apiError(err, tCommon('state.error')))
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
    <Modal open onClose={onClose} title={t('editTitle', { name: item.name })}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t('scope')}</Label>
          <div className="text-sm text-muted-foreground">
            {item.companyId === null ? (
              <span className="inline-flex items-center gap-1.5">
                <Badge variant="outline" className="text-blue-600 border-blue-300">
                  {t('scopeNational')}
                </Badge>
                {t('scopeNationalLocked')}
              </span>
            ) : (
              <span>{t('scopeCompanyLocked', { company: item.companyName ?? '' })}</span>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="e-name">{t('name')} *</Label>
          <Input id="e-name" {...register('name')} />
          <FieldError message={errors.name?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="e-date">{t('date')} *</Label>
          <DateInput id="e-date" {...register('date')} />
          <FieldError message={errors.date?.message} />
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

// ── Generate From Schedule Wizard ─────────────────────────────────────────────

function GenerateFromScheduleModal({
  open,
  onClose,
  defaultYear,
}: {
  open: boolean
  onClose: () => void
  defaultYear: number
}) {
  const t = useTranslations('admin.settings.holidays')
  const tCommon = useTranslations('common')
  const [step, setStep] = useState<1 | 2>(1)
  const [scheduleId, setScheduleId] = useState('')
  const [year, setYear] = useState(defaultYear)

  const { data: schedules } = useHolidaySchedules()
  const activeSchedules = schedules?.filter((s) => s.isActive) ?? []

  const [previewEnabled, setPreviewEnabled] = useState(false)
  const { data: previewItems, isLoading: isPreviewing } = usePreviewHolidaysFromSchedule(
    scheduleId, year, previewEnabled,
  )

  const bulkCreate = useBulkCreateHolidays()

  function handlePreview() {
    if (!scheduleId) { toast.error(t('selectRuleFirst')); return }
    setPreviewEnabled(true)
    setStep(2)
  }

  async function handleConfirm() {
    if (!previewItems?.length) return
    try {
      const result = await bulkCreate.mutateAsync(previewItems)
      toast.success(t('bulkCreated', { created: result.created, skipped: result.skipped }))
      handleClose()
    } catch {
      toast.error(tCommon('state.error'))
    }
  }

  function handleClose() {
    setStep(1)
    setScheduleId('')
    setPreviewEnabled(false)
    onClose()
  }

  const selectedSchedule = activeSchedules.find((s) => s.id === scheduleId)

  return (
    <Modal open={open} onClose={handleClose} title={t('generateTitle')}>
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="g-schedule">{t('generateRule')} *</Label>
            <select
              id="g-schedule"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={scheduleId}
              onChange={(e) => { setScheduleId(e.target.value); setPreviewEnabled(false) }}
            >
              <option value="">{t('selectRule')}</option>
              {activeSchedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.companyName
                    ? t('ruleOptionWithCompany', {
                        name: s.name, day: fmt.formatWeekday(s.dayOfWeek), company: s.companyName,
                      })
                    : t('ruleOption', { name: s.name, day: fmt.formatWeekday(s.dayOfWeek) })}
                </option>
              ))}
            </select>
            {activeSchedules.length === 0 && (
              <p className="text-xs text-muted-foreground">{t('noActiveRule')}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="g-year">{t('year')}</Label>
            <select
              id="g-year"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={year}
              onChange={(e) => { setYear(Number(e.target.value)); setPreviewEnabled(false) }}
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>{fmt.formatYear(y)}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>{tCommon('action.cancel')}</Button>
            <Button type="button" onClick={handlePreview} disabled={!scheduleId}>
              {t('preview')}
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-md bg-whited/50 px-3 py-2 text-sm">
            {t('previewHeader', { name: selectedSchedule?.name ?? '', year: fmt.formatYear(year) })}
          </div>

          {isPreviewing && (
            <div className="py-6 text-center text-sm text-muted-foreground animate-pulse">
              {t('calculating')}
            </div>
          )}

          {!isPreviewing && previewItems && (
            <>
              <p className="text-sm text-muted-foreground">
                {t('previewCount', { count: previewItems.length })}
              </p>
              <div className="max-h-56 overflow-y-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-whited/80">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t('colDate')}</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t('colName')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewItems.map((item) => (
                      <tr key={item.date} className="border-t border-border">
                        <td className="px-3 py-1.5 text-muted-foreground">{holidayDate(item.date)}</td>
                        <td className="px-3 py-1.5">{item.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setStep(1); setPreviewEnabled(false) }}
            >
              <ChevronLeft className="h-4 w-4" />
              {tCommon('action.back')}
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              loading={bulkCreate.isPending}
              disabled={!previewItems?.length}
            >
              {t('confirmCreate', { count: previewItems?.length ?? 0 })}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HolidaysPage() {
  const t = useTranslations('admin.settings.holidays')
  const tOrg = useTranslations('admin.org.common')
  const tCommon = useTranslations('common')
  const locale = useLocale() as Locale
  const employee = useAuthStore((s) => s.employee)
  const isAdmin = employee?.roles.some((r) => r.role === 'Admin') ?? false
  const isHr = employee?.roles.some((r) => r.role === 'Hr') ?? false

  const { data: companiesTree } = useCompanies()
  const allCompanies = useMemo(() => flattenCompanies(companiesTree ?? []), [companiesTree])

  const myCompany = allCompanies.find((c) => c.id === employee?.companyId)
  const isHqHr = isHr && (myCompany?.isHeadquarters ?? false)
  const canSeeAll = isAdmin || isHqHr

  const [year, setYear] = useState(CURRENT_YEAR)
  const [companyId, setCompanyId] = useState<string | undefined>(undefined)
  const [scopeInitialized, setScopeInitialized] = useState(false)
  const [includeInactive, setIncludeInactive] = useState(false)

  // ตั้ง companyId เมื่อรู้ว่าเป็น HQ HR หรือไม่ (allCompanies โหลด async)
  useEffect(() => {
    if (scopeInitialized) return
    if (!employee) return
    // รอให้ allCompanies โหลดก่อนถ้าเป็น HR (isAdmin รู้ผลทันที)
    if (isHr && allCompanies.length === 0) return

    if (canSeeAll) {
      setCompanyId(undefined)
    } else {
      setCompanyId(employee.companyId ?? undefined)
    }
    setScopeInitialized(true)
  }, [canSeeAll, isHr, allCompanies.length, employee, scopeInitialized])

  const { data: holidays, isLoading } = useHolidays(year, companyId, includeInactive)

  const [createOpen, setCreateOpen] = useState(false)
  const [editItem, setEditItem] = useState<HolidayDto | null>(null)
  const [generateOpen, setGenerateOpen] = useState(false)

  const [searchName, setSearchName] = useState('')
  const [searchDate, setSearchDate] = useState('')
  const [page, setPage] = useState(1)

  const PAGE_SIZE = 20

  const filteredHolidays = useMemo(() => {
    let list = holidays ?? []
    if (searchName.trim()) {
      const q = searchName.trim().toLowerCase()
      list = list.filter((h) => h.name.toLowerCase().includes(q))
    }
    if (searchDate) {
      list = list.filter((h) => h.date === searchDate)
    }
    return list
  }, [holidays, searchName, searchDate])

  const totalPages = Math.max(1, Math.ceil(filteredHolidays.length / PAGE_SIZE))
  const pagedHolidays = filteredHolidays.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => { setPage(1) }, [searchName, searchDate])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">{t('title')}</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setGenerateOpen(true)}>
            <Wand2 className="h-4 w-4" />
            {t('generate')}
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            {t('add')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>
              {fmt.formatYear(y)}
            </option>
          ))}
        </select>

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

        <Input
          type="text"
          placeholder={t('searchName')}
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          className="w-48"
        />

        <DateInput
          value={searchDate}
          onChange={(e) => setSearchDate(e.target.value)}
          className="w-44"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-whited/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('colName')}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('colDate')}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('colCompany')}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{tOrg('colStatus')}</th>
              <th className="px-4 py-3 w-12" />
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-whited" />
                    </td>
                  ))}
                </tr>
              ))}

            {!isLoading && filteredHolidays.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  {holidays?.length === 0 ? t('empty') : t('noSearchResult')}
                </td>
              </tr>
            )}

            {!isLoading &&
              pagedHolidays.map((h) => (
                <tr
                  key={h.id}
                  className="border-b border-border last:border-0 hover:bg-whited/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{h.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{holidayDate(h.date)}</td>
                  <td className="px-4 py-3">
                    {h.companyId === null ? (
                      <Badge variant="outline" className="text-blue-600 border-blue-300">
                        {t('scopeNational')}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">{h.companyName}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={h.isActive ? 'success' : 'secondary'}>
                      {h.isActive ? tOrg('statusActive') : tOrg('statusInactive')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setEditItem(h)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!isLoading && filteredHolidays.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {t('showingRange', {
              from: (page - 1) * PAGE_SIZE + 1,
              to: Math.min(page * PAGE_SIZE, filteredHolidays.length),
              total: filteredHolidays.length,
            })}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              {tCommon('action.previous')}
            </Button>
            <span className="px-1">
              {t('pageOf', { page, total: totalPages })}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              {tCommon('action.next')}
            </Button>
          </div>
        </div>
      )}

      <CreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultYear={year}
        canSeeAll={canSeeAll}
        companies={canSeeAll ? allCompanies : allCompanies.filter((c) => c.id === employee?.companyId)}
      />
      {editItem && <EditModal item={editItem} onClose={() => setEditItem(null)} />}
      <GenerateFromScheduleModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        defaultYear={year}
      />
    </div>
  )
}
