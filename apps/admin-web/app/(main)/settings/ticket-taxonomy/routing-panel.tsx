'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { CheckCircle2, Plus, Route, UserRound, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { TicketCategoryDto, TicketRoutingMode, TicketTopicDto } from '@hrms/shared-types'
import { localizedName, type Locale } from '@hrms/i18n'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useResponsibilities, useResponsibilityEmployees, useRoutingCoverage, useRoutingMutations } from '@/hooks/use-ticket-routing'

// ป้ายวิธีมอบหมายอยู่ที่ `admin.settings.routing.mode.*` — ที่นี่เหลือแค่ลำดับตัวเลือก
const ROUTING_MODES: TicketRoutingMode[] = ['SupervisorAssign', 'AutoAssignSingle']

export function RoutingPanel({ companyId, departmentId, categories, topics, categoryId, topicId, onCategory, onTopic }: {
  companyId: string; departmentId: string; categories: TicketCategoryDto[]; topics: TicketTopicDto[]
  categoryId: string; topicId: string; onCategory: (id: string) => void; onTopic: (id: string) => void
}) {
  const t = useTranslations('admin.settings.routing')
  const locale = useLocale() as Locale
  const scope = { companyId, departmentId, categoryId: categoryId || undefined, topicId: topicId || undefined }
  const { data: responsibilities = [] } = useResponsibilities(scope)
  const { data: employees = [] } = useResponsibilityEmployees(companyId, departmentId)
  const { data: coverage } = useRoutingCoverage(companyId, departmentId)
  const mutations = useRoutingMutations(scope)
  const [employeeId, setEmployeeId] = useState('')
  const category = categories.find(item => item.id === categoryId)
  const topic = topics.find(item => item.id === topicId)

  async function add() {
    if (!categoryId || !employeeId) return toast.error(t('selectScopeFirst'))
    try {
      await mutations.create.mutateAsync({ ...scope, categoryId, topicId: topicId || undefined, employeeId })
      setEmployeeId('')
      toast.success(t('ownerAdded'))
    } catch (error) {
      toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message ?? t('addOwnerFailed'))
    }
  }

  async function preview() {
    if (!categoryId || !topicId) return toast.error(t('selectTopicFirst'))
    const result = await mutations.preview.mutateAsync({ companyId, departmentId, categoryId, topicId })
    const resultText = result.outcome === 'AutoAssigned'
      ? t('previewAuto', { name: result.candidates[0]?.employeeName ?? '' })
      : result.outcome === 'SupervisorQueue'
        ? t('previewQueue', { count: result.candidates.length })
        : t('previewNone')
    toast.success(resultText)
  }

  const coverageCards: [string, number][] = coverage
    ? [
        [t('coverageTotalTopics'), coverage.totalTopics],
        [t('coverageCovered'), coverage.coveredTopics],
        [t('coverageUncovered'), coverage.uncoveredTopics],
        [t('coverageAuto'), coverage.autoAssignTopics],
        [t('coverageAutoMultiple'), coverage.autoAssignWithMultipleCandidates],
        [t('coverageCategoryFallback'), coverage.categoryFallbacks],
      ]
    : []

  return (
    <div className="space-y-5">
      {coverage && <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {coverageCards.map(([label, value]) => <div key={label} className="border-y border-border px-3 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}
      </div>}

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <section className="space-y-4 border-r border-border pr-4">
          <div><Label>{t('category')}</Label><Select value={categoryId} onChange={event => { onCategory(event.target.value); onTopic('') }}><option value="">{t('selectCategory')}</option>{categories.map(item => <option key={item.id} value={item.id}>{localizedName(item, locale)}</option>)}</Select></div>
          <div><Label>{t('topic')}</Label><Select value={topicId} disabled={!categoryId} onChange={event => onTopic(event.target.value)}><option value="">{t('topicAll')}</option>{topics.map(item => <option key={item.id} value={item.id}>{localizedName(item, locale)}</option>)}</Select></div>
          {topic ? <div><Label>{t('topicMode')}</Label><Select value={topic.routingMode} onChange={event => mutations.topicMode.mutate({ id: topic.id, mode: event.target.value as TicketRoutingMode })}>{ROUTING_MODES.map(mode => <option key={mode} value={mode}>{t(`mode.${mode}`)}</option>)}</Select></div>
            : category && <><p className="text-xs text-muted-foreground">{t('categoryModeHint')}</p><div><Label>{t('categoryMode')}</Label><Select value={category.routingMode} onChange={event => mutations.categoryMode.mutate({ id: category.id, enableFallback: true, mode: event.target.value as TicketRoutingMode })}>{ROUTING_MODES.map(mode => <option key={mode} value={mode}>{t(`mode.${mode}`)}</option>)}</Select></div></>}
          <Button variant="outline" className="w-full" disabled={!topicId || mutations.preview.isPending} onClick={preview}><Route className="h-4 w-4" /> {t('testRouting')}</Button>
        </section>

        <section>
          <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1"><Label>{t('addOwner')}</Label><Select value={employeeId} disabled={!categoryId} onChange={event => setEmployeeId(event.target.value)}><option value="">{t('selectEmployee')}</option>{employees.map(item => <option key={item.id} value={item.id}>{t('employeeOption', { name: item.employeeName, code: item.employeeCode })}</option>)}</Select></div>
            <Button disabled={!employeeId || mutations.create.isPending} onClick={add}><Plus className="h-4 w-4" /> {t('add')}</Button>
          </div>
          <div className="divide-y divide-border">
            {responsibilities.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">{t('noOwners')}</p>}
            {responsibilities.map(item => <div key={item.id} className="flex min-h-16 items-center gap-3 py-3">
              <UserRound className="h-4 w-4 text-primary" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{t('employeeOption', { name: item.employeeName, code: item.employeeCode })}</p><p className="text-xs text-muted-foreground">{item.topicName ?? t('categoryLevelOwner', { category: item.categoryName ?? '' })}</p></div>
              {!item.employeeIsEligible && <Badge variant="destructive">{t('notEligible')}</Badge>}
              <Button size="icon" variant="ghost" title={item.isActive ? t('deactivateOwner') : t('activateOwner')} onClick={() => mutations.update.mutate({ id: item.id, isActive: !item.isActive, effectiveFrom: item.effectiveFrom, effectiveTo: item.effectiveTo, note: item.note, expectedUpdatedAt: item.updatedAt })}>{item.isActive ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}</Button>
            </div>)}
          </div>
        </section>
      </div>
    </div>
  )
}
