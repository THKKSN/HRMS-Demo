'use client'

import { useState, useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import {
  useHolidaySchedules,
  useCreateHolidaySchedule,
  useUpdateHolidaySchedule,
  useToggleHolidayScheduleStatus,
} from '@/hooks/use-holiday-schedules'
import { useCompanies } from '@/hooks/use-companies'
import { useAuthStore } from '@/stores/auth.store'
import type { WeeklyHolidayScheduleDto } from '@/types/admin'
import type { CompanyTreeDto } from '@hrms/shared-types'
import { localizedName, type Locale } from '@hrms/i18n'
import * as fmt from '@hrms/i18n/format'

// ── Helpers ────────────────────────────────────────────────────────────────────

function flattenCompanies(nodes: CompanyTreeDto[]): CompanyTreeDto[] {
  return nodes.flatMap((n) => [n, ...flattenCompanies(n.children)])
}

const DAY_OF_WEEK_OPTIONS = [0, 1, 2, 3, 4, 5, 6]

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive mt-0.5">{message}</p>
}

// ── Schema ─────────────────────────────────────────────────────────────────────
// ข้อความ validation มาจาก useTranslations จึงสร้าง schema ใน component

function buildScheduleSchema(t: (key: string) => string) {
  return z
    .object({
      name: z.string().min(1, t('validation.name')).max(200),
      scope: z.enum(['global', 'company']),
      companyId: z.string().optional(),
      dayOfWeek: z.number().min(0).max(6),
      workDayOccurrences: z.array(z.number().min(1).max(5)),
      isActive: z.boolean().optional(),
    })
    .refine((d) => d.scope === 'global' || !!d.companyId, {
      message: t('validation.company'),
      path: ['companyId'],
    })
}

type ScheduleValues = z.infer<ReturnType<typeof buildScheduleSchema>>

// ── ScheduleForm (shared by Create + Edit) ─────────────────────────────────────

function ScheduleForm({
  defaultValues,
  canSeeAll,
  companies,
  onSubmit,
  onCancel,
  isSubmitting,
  showStatus = false,
}: {
  defaultValues: Partial<ScheduleValues>
  canSeeAll: boolean
  companies: CompanyTreeDto[]
  onSubmit: (v: ScheduleValues) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
  showStatus?: boolean
}) {
  const t = useTranslations('admin.settings.holidaySchedules')
  const tOrg = useTranslations('admin.org.common')
  const tCommon = useTranslations('common')
  const locale = useLocale() as Locale
  const schema = useMemo(() => buildScheduleSchema(t), [t])
  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<ScheduleValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      scope: canSeeAll ? 'global' : 'company',
      workDayOccurrences: [],
      isActive: true,
      dayOfWeek: 6,
      ...defaultValues,
    },
  })

  const scope = watch('scope')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="s-name">{t('name')} *</Label>
        <Input id="s-name" placeholder={t('namePlaceholder')} {...register('name')} />
        <FieldError message={errors.name?.message} />
      </div>

      {canSeeAll && (
        <div className="space-y-1.5">
          <Label>{t('scope')}</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" value="global" {...register('scope')} />
              {t('scopeGlobalOption')}
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
          <Label htmlFor="s-company">{tOrg('company')} *</Label>
          <select
            id="s-company"
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
        <Label htmlFor="s-dow">{t('dayOfWeek')} *</Label>
        <select
          id="s-dow"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          {...register('dayOfWeek', { valueAsNumber: true })}
        >
          {DAY_OF_WEEK_OPTIONS.map((day) => (
            <option key={day} value={day}>
              {fmt.formatWeekday(day)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label>{t('workOccurrences')}</Label>
        <div className="flex flex-wrap gap-3">
          {[1, 2, 3, 4, 5].map((occ) => (
            <Controller
              key={occ}
              name="workDayOccurrences"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.value?.includes(occ) ?? false}
                    onChange={(e) => {
                      const current = field.value ?? []
                      field.onChange(
                        e.target.checked
                          ? [...current, occ]
                          : current.filter((v) => v !== occ),
                      )
                    }}
                    className="rounded border-border"
                  />
                  {t('occurrence', { n: occ })}
                </label>
              )}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{t('workOccurrencesHint')}</p>
      </div>

      {showStatus && (
        <div className="space-y-1.5">
          <Label>{t('status')}</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" value="true" {...register('isActive')} />
              {tOrg('activate')}
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" value="false" {...register('isActive')} />
              {tOrg('deactivate')}
            </label>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {tCommon('action.cancel')}
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {tCommon('action.save')}
        </Button>
      </div>
    </form>
  )
}

// ── Create Modal ───────────────────────────────────────────────────────────────

function CreateModal({
  open,
  onClose,
  canSeeAll,
  companies,
}: {
  open: boolean
  onClose: () => void
  canSeeAll: boolean
  companies: CompanyTreeDto[]
}) {
  const t = useTranslations('admin.settings.holidaySchedules')
  const tCommon = useTranslations('common')
  const create = useCreateHolidaySchedule()

  async function onSubmit(values: ScheduleValues) {
    try {
      await create.mutateAsync({
        companyId: values.scope === 'company' ? values.companyId : undefined,
        name: values.name,
        dayOfWeek: values.dayOfWeek,
        workDayOccurrences: values.workDayOccurrences,
      })
      toast.success(t('created', { name: values.name }))
      onClose()
    } catch {
      toast.error(tCommon('state.error'))
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('addTitle')}>
      <ScheduleForm
        defaultValues={{}}
        canSeeAll={canSeeAll}
        companies={companies}
        onSubmit={onSubmit}
        onCancel={onClose}
        isSubmitting={create.isPending}
      />
    </Modal>
  )
}

// ── Edit Modal ─────────────────────────────────────────────────────────────────

function EditModal({
  item,
  onClose,
  canSeeAll,
  companies,
}: {
  item: WeeklyHolidayScheduleDto
  onClose: () => void
  canSeeAll: boolean
  companies: CompanyTreeDto[]
}) {
  const t = useTranslations('admin.settings.holidaySchedules')
  const tOrg = useTranslations('admin.org.common')
  const tCommon = useTranslations('common')
  const update = useUpdateHolidaySchedule()
  const toggle = useToggleHolidayScheduleStatus()

  async function onSubmit(values: ScheduleValues) {
    try {
      await update.mutateAsync({
        id: item.id,
        name: values.name,
        dayOfWeek: values.dayOfWeek,
        workDayOccurrences: values.workDayOccurrences,
        isActive: item.isActive,
      })
      toast.success(t('saved', { name: values.name }))
      onClose()
    } catch {
      toast.error(tCommon('state.error'))
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
      <div className="space-y-4">
        <div className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          {t('scopeLine')}{' '}
          {item.companyId === null ? (
            <Badge variant="outline" className="text-blue-600 border-blue-300 ml-1">
              {t('scopeAll')}
            </Badge>
          ) : (
            <span className="font-medium text-foreground">{item.companyName}</span>
          )}
        </div>

        <ScheduleForm
          defaultValues={{
            name: item.name,
            scope: item.companyId === null ? 'global' : 'company',
            companyId: item.companyId ?? undefined,
            dayOfWeek: item.dayOfWeek,
            workDayOccurrences: item.workDayOccurrences,
          }}
          canSeeAll={canSeeAll}
          companies={companies}
          onSubmit={onSubmit}
          onCancel={onClose}
          isSubmitting={update.isPending}
        />

        <div className="border-t border-border pt-3">
          <Button
            type="button"
            variant={item.isActive ? 'destructive' : 'outline'}
            size="sm"
            onClick={handleToggle}
            loading={toggle.isPending}
          >
            {item.isActive ? tOrg('deactivate') : tOrg('activate')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function HolidaySchedulesPage() {
  const t = useTranslations('admin.settings.holidaySchedules')
  const tOrg = useTranslations('admin.org.common')
  const employee = useAuthStore((s) => s.employee)
  const isAdmin = employee?.roles.some((r) => r.role === 'Admin') ?? false
  const isHr = employee?.roles.some((r) => r.role === 'Hr') ?? false

  const { data: companiesTree } = useCompanies()
  const allCompanies = useMemo(() => flattenCompanies(companiesTree ?? []), [companiesTree])

  const myCompany = allCompanies.find((c) => c.id === employee?.companyId)
  const isHqHr = isHr && (myCompany?.isHeadquarters ?? false)
  const canSeeAll = isAdmin || isHqHr

  const [includeInactive, setIncludeInactive] = useState(false)
  const { data: schedules, isLoading } = useHolidaySchedules(undefined, includeInactive)

  const [createOpen, setCreateOpen] = useState(false)
  const [editItem, setEditItem] = useState<WeeklyHolidayScheduleDto | null>(null)

  const visibleCompanies = canSeeAll
    ? allCompanies
    : allCompanies.filter((c) => c.id === employee?.companyId)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">{t('title')}</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          {t('add')}
        </Button>
      </div>

      <div className="flex items-center gap-3">
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

      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('colName')}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('colDayOfWeek')}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('colWorkDays')}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('colCompany')}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{tOrg('colStatus')}</th>
              <th className="px-4 py-3 w-12" />
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))}

            {!isLoading && (!schedules || schedules.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  {t('empty')}
                </td>
              </tr>
            )}

            {!isLoading &&
              schedules?.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3">{fmt.formatWeekday(s.dayOfWeek)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {s.workDayOccurrences.length === 0
                      ? t('everyWeek')
                      : t('workOnOccurrences', {
                          list: [...s.workDayOccurrences].sort((a, b) => a - b).join(', '),
                        })}
                  </td>
                  <td className="px-4 py-3">
                    {s.companyId === null ? (
                      <Badge variant="outline" className="text-blue-600 border-blue-300">
                        {t('scopeAll')}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">{s.companyName}</span>
                    )}
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
        canSeeAll={canSeeAll}
        companies={visibleCompanies}
      />
      {editItem && (
        <EditModal
          item={editItem}
          onClose={() => setEditItem(null)}
          canSeeAll={canSeeAll}
          companies={visibleCompanies}
        />
      )}
    </div>
  )
}
