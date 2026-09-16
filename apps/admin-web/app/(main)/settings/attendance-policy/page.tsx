'use client'

import { useState, useEffect, useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Plus, Pencil, Save, X,
  ShieldAlert, ShieldCheck, ShieldX, TriangleAlert,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useCompanies } from '@/hooks/use-companies'
import {
  useAttendancePolicy,
  useUpsertAttendancePolicy,
  useAttendanceViolations,
} from '@/hooks/use-attendance-policy'
import type { CompanyTreeDto, AttendanceMonthlyViolationDto } from '@hrms/shared-types'
import { localizedName, type Locale } from '@hrms/i18n'
import * as fmt from '@hrms/i18n/format'

// ── helpers ───────────────────────────────────────────────────────────────────

function flattenCompanies(nodes: CompanyTreeDto[]): CompanyTreeDto[] {
  return nodes.flatMap((n) => [n, ...flattenCompanies(n.children)])
}

// ── Schema ────────────────────────────────────────────────────────────────────
// ข้อความ validation มาจาก useTranslations จึงสร้าง schema ใน component

function buildPolicySchema(t: (key: string) => string) {
  return z.object({
    maxLateMinutesPerMonth: z.number().int().min(0, t('validation.notNegative')).max(1440, t('validation.maxMinutes')),
    maxLateCountPerMonth: z.number().int().min(0, t('validation.notNegative')).max(31, t('validation.maxTimes')),
    maxAbsenceCountPerMonth: z.number().int().min(0, t('validation.notNegative')).max(31, t('validation.maxTimes')),
  })
}
type PolicyValues = z.infer<ReturnType<typeof buildPolicySchema>>

// ── Policy Form Modal ─────────────────────────────────────────────────────────

function PolicyModal({
  open,
  onClose,
  companyId,
  defaultValues,
}: {
  open: boolean
  onClose: () => void
  companyId: string
  defaultValues: PolicyValues
}) {
  const t = useTranslations('admin.settings.attendancePolicy')
  const tCommon = useTranslations('common')
  const upsert = useUpsertAttendancePolicy(companyId)
  const schema = useMemo(() => buildPolicySchema(t), [t])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PolicyValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  useEffect(() => {
    if (open) reset(defaultValues)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (values: PolicyValues) => {
    try {
      await upsert.mutateAsync({ companyId, ...values })
      toast.success(t('saved'))
      onClose()
    } catch {
      toast.error(t('saveFailed'))
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-2xl bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <ShieldAlert className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-base font-semibold text-foreground">{t('cardTitle')}</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-whited hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-5">
          <p className="text-sm text-muted-foreground">
            {t.rich('modalHint', {
              b: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
            })}
          </p>

          <div className="space-y-4">
            {/* นาทีสาย */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {t('maxLateMinutes')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={1440}
                  className="w-full rounded-xl border border-border bg-whited px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  {...register('maxLateMinutesPerMonth', { valueAsNumber: true })}
                />
                <span className="shrink-0 text-sm text-muted-foreground w-12">{t('unitMinutes')}</span>
              </div>
              {errors.maxLateMinutesPerMonth && (
                <p className="text-xs text-destructive">{errors.maxLateMinutesPerMonth.message}</p>
              )}
            </div>

            {/* ครั้งสาย */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {t('maxLateCount')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={31}
                  className="w-full rounded-xl border border-border bg-whited px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  {...register('maxLateCountPerMonth', { valueAsNumber: true })}
                />
                <span className="shrink-0 text-sm text-muted-foreground w-12">{t('unitTimes')}</span>
              </div>
              {errors.maxLateCountPerMonth && (
                <p className="text-xs text-destructive">{errors.maxLateCountPerMonth.message}</p>
              )}
            </div>

            {/* ครั้งขาด */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {t('maxAbsenceCount')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={31}
                  className="w-full rounded-xl border border-border bg-whited px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  {...register('maxAbsenceCountPerMonth', { valueAsNumber: true })}
                />
                <span className="shrink-0 text-sm text-muted-foreground w-12">{t('unitTimes')}</span>
              </div>
              {errors.maxAbsenceCountPerMonth && (
                <p className="text-xs text-destructive">{errors.maxAbsenceCountPerMonth.message}</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-whited transition-colors"
            >
              {tCommon('action.cancel')}
            </button>
            <button
              type="submit"
              disabled={upsert.isPending}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Save className="h-4 w-4" />
              {upsert.isPending ? tCommon('state.saving') : tCommon('action.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Policy Card ───────────────────────────────────────────────────────────────

function PolicyCard({ companyId }: { companyId: string }) {
  const t = useTranslations('admin.settings.attendancePolicy')
  const tCommon = useTranslations('common')
  const { data: policy, isLoading } = useAttendancePolicy(companyId)
  const [modalOpen, setModalOpen] = useState(false)

  if (isLoading) {
    return <div className="h-36 animate-pulse rounded-2xl bg-whited" />
  }

  const modalDefaults: PolicyValues = policy
    ? {
        maxLateMinutesPerMonth: policy.maxLateMinutesPerMonth,
        maxLateCountPerMonth: policy.maxLateCountPerMonth,
        maxAbsenceCountPerMonth: policy.maxAbsenceCountPerMonth,
      }
    : { maxLateMinutesPerMonth: 90, maxLateCountPerMonth: 10, maxAbsenceCountPerMonth: 3 }

  return (
    <>
      {policy ? (
        /* มี policy แล้ว — แสดง summary card */
        <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <ShieldAlert className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">{t('cardTitle')}</h2>
                <p className="text-xs text-muted-foreground">{t('cardHint')}</p>
              </div>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-whited hover:text-foreground transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              {tCommon('action.edit')}
            </button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-whited/60 p-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {policy.maxLateMinutesPerMonth === 0 ? '∞' : policy.maxLateMinutesPerMonth}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t('statLateMinutes')}</p>
            </div>
            <div className="rounded-xl bg-whited/60 p-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {policy.maxLateCountPerMonth === 0 ? '∞' : policy.maxLateCountPerMonth}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t('statLateCount')}</p>
            </div>
            <div className="rounded-xl bg-whited/60 p-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {policy.maxAbsenceCountPerMonth === 0 ? '∞' : policy.maxAbsenceCountPerMonth}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t('statAbsenceCount')}</p>
            </div>
          </div>
        </div>
      ) : (
        /* ยังไม่มี policy — empty state */
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-background py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-whited">
            <ShieldAlert className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="mt-4 font-semibold text-foreground">{t('emptyTitle')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('emptyHint')}</p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-5 flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t('addPolicy')}
          </button>
        </div>
      )}

      <PolicyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        companyId={companyId}
        defaultValues={modalDefaults}
      />
    </>
  )
}

// ── Violations Table ──────────────────────────────────────────────────────────

function ViolationRow({ item }: { item: AttendanceMonthlyViolationDto }) {
  const t = useTranslations('admin.settings.attendancePolicy')
  return (
    <tr className="border-b border-border last:border-0 hover:bg-whited/40 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {item.isViolated
            ? <ShieldX className="h-4 w-4 shrink-0 text-destructive" />
            : <ShieldCheck className="h-4 w-4 shrink-0 text-green-500" />}
          <span className="text-sm font-medium text-foreground">{item.employeeName}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-center text-sm">
        <span className={item.isLateCountViolated ? 'font-semibold text-destructive' : 'text-foreground'}>
          {item.totalLateCount}
        </span>
        {item.isLateCountViolated && <TriangleAlert className="ml-1 inline h-3.5 w-3.5 text-destructive" />}
      </td>
      <td className="px-4 py-3 text-center text-sm">
        <span className={item.isLateMinutesViolated ? 'font-semibold text-destructive' : 'text-foreground'}>
          {item.totalLateMinutes}
        </span>
        {item.isLateMinutesViolated && <TriangleAlert className="ml-1 inline h-3.5 w-3.5 text-destructive" />}
      </td>
      <td className="px-4 py-3 text-center text-sm">
        <span className={item.isAbsenceViolated ? 'font-semibold text-destructive' : 'text-foreground'}>
          {item.totalAbsenceCount}
        </span>
        {item.isAbsenceViolated && <TriangleAlert className="ml-1 inline h-3.5 w-3.5 text-destructive" />}
      </td>
      <td className="px-4 py-3 text-center">
        {item.isViolated ? (
          <span className="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
            {t('violated')}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600">
            {t('normal')}
          </span>
        )}
      </td>
    </tr>
  )
}

function ViolationsTable({ companyId }: { companyId: string }) {
  const t = useTranslations('admin.settings.attendancePolicy')
  const tOrg = useTranslations('admin.org.common')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data, isLoading } = useAttendanceViolations(companyId, year, month)
  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i)
  // ชื่อเดือนตามภาษาที่เลือก — เดิม hardcode ชื่อเดือนไทยไว้ในไฟล์
  const months = useMemo(
    () => Array.from({ length: 12 }, (_, i) =>
      fmt.formatDate(new Date(now.getFullYear(), i, 1), { month: 'long' })),
    [locale], // eslint-disable-line react-hooks/exhaustive-deps
  )

  return (
    <div className="rounded-2xl border border-border bg-background shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t('violationsTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('violationsSubtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {months.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {years.map((y) => (
              <option key={y} value={y}>{fmt.formatYear(y)}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-whited" />
          ))}
        </div>
      ) : !data?.items.length ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShieldCheck className="h-10 w-10 text-green-500" />
          <p className="mt-3 font-medium text-foreground">{tCommon('state.noData')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('noViolationData')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-whited/40">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('colEmployee')}</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('colLateCount')}</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('colLateMinutes')}</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('colAbsenceCount')}</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tOrg('colStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <ViolationRow key={item.employeeId} item={item} />
              ))}
            </tbody>
          </table>
          <div className="border-t border-border px-5 py-3">
            <p className="text-xs text-muted-foreground">
              {t.rich('summary', {
                total: data.totalCount,
                violated: data.items.filter((i) => i.isViolated).length,
              })}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AttendancePolicyPage() {
  const t = useTranslations('admin.settings.attendancePolicy')
  const locale = useLocale() as Locale
  const employee = useAuthStore((s) => s.employee)
  const { data: companiesTree } = useCompanies()

  const companies = companiesTree ? flattenCompanies(companiesTree) : []
  const defaultCompanyId = employee?.roles[0]?.companyId ?? companies[0]?.id ?? ''
  const [selectedCompanyId, setSelectedCompanyId] = useState('')

  const companyId = selectedCompanyId || defaultCompanyId

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t('title')}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>

        {companies.length > 1 && (
          <select
            value={companyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="rounded-xl border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{localizedName(c, locale)}</option>
            ))}
          </select>
        )}
      </div>

      {companyId ? (
        <>
          <PolicyCard companyId={companyId} />
          <ViolationsTable companyId={companyId} />
        </>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-border bg-background text-sm text-muted-foreground">
          {t('loadingCompanies')}
        </div>
      )}
    </div>
  )
}
