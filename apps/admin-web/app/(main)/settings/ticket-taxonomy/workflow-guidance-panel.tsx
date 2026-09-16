'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { ClipboardList, FilePenLine, Pencil, Plus, Sparkles, Target, Trash2, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import type {
  TicketCategoryDto,
  TicketGuidanceSuggestion,
  TicketSubjectDto,
  TicketSubjectGuidanceConfigDto,
  TicketTopicDto,
} from '@hrms/shared-types'
import { localizedName, type Locale } from '@hrms/i18n'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  useCreateTicketGuidanceConfig,
  useTicketGuidanceConfigs,
  useUpdateTicketGuidanceConfig,
} from '@/hooks/use-ticket-workflow-masters'
import { useApiError } from '@/hooks/use-api-error'

type GuidanceEditorState = { item?: TicketSubjectGuidanceConfigDto }
type SuggestionForm = { id: string; label: string; value: string }

// หัวข้อ/ตัวเลือก/ขั้นบอร์ดสำเร็จรูป — ข้อความจริงมาจาก `admin.settings.template.*`
// ค่าที่เติมลง template เป็นภาษาที่ผู้ดูแลกำลังใช้อยู่ เพราะเป็นเนื้อหาที่เก็บลง DB เอง
const TEMPLATE_FIELD_KEYS = [
  'documentName', 'documentNumber', 'problem', 'plateNumber', 'vehicleNumber', 'symptom', 'lastLocation',
] as const

const QUICK_SUGGESTION_KEYS = [
  'repairRequest', 'repairOrder', 'sendForRepair', 'jobOrder', 'maintenanceList', 'expenseCover',
] as const

const BOARD_STEP_KEYS = ['report', 'accept', 'assign', 'inProgress', 'review', 'requesterConfirm'] as const

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function appendTemplateLine(template: string, line: string) {
  const trimmedTemplate = template.trimEnd()
  if (!trimmedTemplate) return `${line}\n`
  return `${trimmedTemplate}\n${line}\n`
}

function toSuggestionForms(suggestions?: TicketGuidanceSuggestion[]) {
  if (!suggestions?.length) return []
  return suggestions.map(item => ({
    id: makeId('suggestion'),
    label: item.label,
    value: item.value,
  }))
}

function toSuggestions(rows: SuggestionForm[]): TicketGuidanceSuggestion[] {
  return rows
    .map(row => ({
      label: row.label.trim(),
      value: row.value.trim() || row.label.trim(),
    }))
    .filter(row => row.label && row.value)
}

function ScopePills({
  categoryLabel,
  topicLabel,
  subjectLabel,
}: {
  categoryLabel: string
  topicLabel: string
  subjectLabel: string
}) {
  const t = useTranslations('admin.settings.template')
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="outline">{t('pillCategory', { name: categoryLabel })}</Badge>
      <Badge variant="outline">{t('pillTopic', { name: topicLabel })}</Badge>
      <Badge variant="outline">{t('pillSubject', { name: subjectLabel })}</Badge>
    </div>
  )
}

function StepChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  )
}

function SuggestionEditor({
  rows,
  targetLabel,
  onTargetLabelChange,
  onChange,
}: {
  rows: SuggestionForm[]
  targetLabel: string
  onTargetLabelChange: (value: string) => void
  onChange: (rows: SuggestionForm[]) => void
}) {
  const t = useTranslations('admin.settings.template')

  function updateRow(id: string, patch: Partial<SuggestionForm>) {
    onChange(rows.map(row => row.id === id ? { ...row, ...patch } : row))
  }

  function addSuggestion(label = '', value = '') {
    onChange([...rows, { id: makeId('suggestion'), label, value }])
  }

  const quickSuggestions = QUICK_SUGGESTION_KEYS.map(key => t(`internalQuickSuggestion.${key}`))
  const remainingQuickSuggestions = quickSuggestions.filter(item => !rows.some(row => row.label === item))

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">{t('suggestTargetTitle')}</p>
        </div>
        <div className="mt-3 space-y-1.5">
          <Label>{t('suggestTargetLabel')}</Label>
          <Input value={targetLabel} onChange={event => onTargetLabelChange(event.target.value)} placeholder={t('suggestTargetPlaceholder')} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background p-4">
        <p className="text-sm font-semibold text-foreground">{t('quickAdd')}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {remainingQuickSuggestions.length === 0 && <p className="text-sm text-muted-foreground">{t('quickAddDone')}</p>}
          {remainingQuickSuggestions.map(item => (
            <Button key={item} type="button" variant="outline" size="sm" className="rounded-full" onClick={() => addSuggestion(item, item)}>
              <Plus className="h-3.5 w-3.5" /> {item}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
            {t('noSuggestions')}
          </div>
        )}

        {rows.map((row, index) => (
          <div key={row.id} className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">{t('suggestionIndex', { index: index + 1 })}</p>
              <Button type="button" size="icon" variant="ghost" onClick={() => onChange(rows.filter(item => item.id !== row.id))}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t('suggestionDisplay')}</Label>
                <Input value={row.label} onChange={event => updateRow(row.id, { label: event.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('suggestionValue')}</Label>
                <Input value={row.value} onChange={event => updateRow(row.id, { value: event.target.value })} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full rounded-xl border-dashed"
        onClick={() => addSuggestion()}
      >
        <Plus className="h-4 w-4" /> {t('addSuggestion')}
      </Button>
    </div>
  )
}

function GuidanceEditor({
  state,
  categories,
  topics,
  subjects,
  onClose,
  onSave,
}: {
  state: GuidanceEditorState
  categories: TicketCategoryDto[]
  topics: TicketTopicDto[]
  subjects: TicketSubjectDto[]
  onClose: () => void
  onSave: (values: {
    categoryId?: string
    topicId?: string
    subjectId?: string
    workflowDefinitionId?: string
    name: string
    suggestionTargetLabel?: string
    suggestions: TicketGuidanceSuggestion[]
    template: string
    priority: number
    isActive: boolean
  }) => Promise<void>
}) {
  const t = useTranslations('admin.settings.template')
  const tTaxonomy = useTranslations('admin.settings.taxonomy')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const locale = useLocale() as Locale
  const [categoryId, setCategoryId] = useState(state.item?.categoryId ?? '')
  const [topicId, setTopicId] = useState(state.item?.topicId ?? '')
  const [subjectId, setSubjectId] = useState(state.item?.subjectId ?? '')
  const [name, setName] = useState(state.item?.name ?? '')
  // ค่าตั้งต้นเป็นหัวข้อ "ชื่อเอกสาร:" ตามภาษาที่ผู้ดูแลใช้อยู่ (เดิม hardcode ไทย)
  const [suggestionTargetLabel, setSuggestionTargetLabel] = useState(
    state.item?.suggestionTargetLabel ?? `${t('internalField.documentName')}:`,
  )
  const [suggestions, setSuggestions] = useState<SuggestionForm[]>(() => toSuggestionForms(state.item?.suggestions))
  const [template, setTemplate] = useState(state.item?.template ?? '')
  const [priority, setPriority] = useState(state.item?.priority ?? 10)
  const [isActive, setIsActive] = useState(state.item?.isActive ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const availableTopics = useMemo(
    () => topics.filter(item => !categoryId || item.categoryId === categoryId),
    [topics, categoryId],
  )
  const availableSubjects = useMemo(
    () => subjects.filter(item => (!categoryId || item.categoryId === categoryId) && (!topicId || item.topicId === topicId)),
    [subjects, categoryId, topicId],
  )
  const selectedCategory = categories.find(item => item.id === categoryId)
  const selectedTopic = availableTopics.find(item => item.id === topicId)
  const selectedSubject = availableSubjects.find(item => item.id === subjectId)
  const selectedCategoryLabel = categoryId ? (selectedCategory ? localizedName(selectedCategory, locale) : '-') : t('allCategories')
  const selectedTopicLabel = topicId ? (selectedTopic ? localizedName(selectedTopic, locale) : '-') : t('allTopics')
  const selectedSubjectLabel = subjectId ? (selectedSubject ? localizedName(selectedSubject, locale) : '-') : t('allSubjects')
  const previewSuggestions = useMemo(() => toSuggestions(suggestions), [suggestions])
  const renderedTemplatePreview = useMemo(() => {
    const firstSuggestion = previewSuggestions[0]?.label ?? t('previewSuggestPlaceholder')
    if (!suggestionTargetLabel.trim()) return template.trim()
    return template.replaceAll(suggestionTargetLabel, `${suggestionTargetLabel} ${firstSuggestion}`)
  }, [previewSuggestions, suggestionTargetLabel, template, t])

  useEffect(() => {
    if (!availableTopics.some(item => item.id === topicId)) setTopicId('')
  }, [availableTopics, topicId])

  useEffect(() => {
    if (!availableSubjects.some(item => item.id === subjectId)) setSubjectId('')
  }, [availableSubjects, subjectId])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !template.trim()) {
      setError(t('nameAndTemplateRequired'))
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSave({
        categoryId: categoryId || undefined,
        topicId: topicId || undefined,
        subjectId: subjectId || undefined,
        workflowDefinitionId: undefined,
        name: name.trim(),
        suggestionTargetLabel: suggestionTargetLabel.trim() || undefined,
        suggestions: previewSuggestions,
        template: template.trim(),
        priority,
        isActive,
      })
      onClose()
    } catch (err) {
      setError(apiError(err, tCommon('state.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={state.item ? t('editorEditTitle') : t('editorAddTitle')} size="xl">
      <form onSubmit={submit} className="space-y-6">
        <section className="rounded-2xl border border-border bg-muted/40 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Wand2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">{t('internalEditorHeading')}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t('internalEditorSubtitle')}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-background p-5">
              <div className="mb-4 flex items-center gap-2">
                <FilePenLine className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">{t('internalScopeHeading')}</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{t('configName')}</Label>
                  <Input value={name} onChange={event => setName(event.target.value)} />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>{tTaxonomy('category.heading')}</Label>
                    <Select value={categoryId} onChange={event => setCategoryId(event.target.value)}>
                      <option value="">{t('allCategories')}</option>
                      {categories.map(item => <option key={item.id} value={item.id}>{localizedName(item, locale)}</option>)}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{tTaxonomy('topic.heading')}</Label>
                    <Select value={topicId} onChange={event => setTopicId(event.target.value)}>
                      <option value="">{t('allTopics')}</option>
                      {availableTopics.map(item => <option key={item.id} value={item.id}>{localizedName(item, locale)}</option>)}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{tTaxonomy('subject.heading')}</Label>
                    <Select value={subjectId} onChange={event => setSubjectId(event.target.value)}>
                      <option value="">{t('allSubjects')}</option>
                      {availableSubjects.map(item => <option key={item.id} value={item.id}>{localizedName(item, locale)}</option>)}
                    </Select>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3 rounded-xl border border-border bg-muted/40 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{t('scopePreview')}</p>
                <ScopePills categoryLabel={selectedCategoryLabel} topicLabel={selectedTopicLabel} subjectLabel={selectedSubjectLabel} />
              </div>

              <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">{t('boardWorkflow')}</p>
                <p className="mt-3 text-sm font-semibold text-foreground">{t('standardBoard')}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {BOARD_STEP_KEYS.map(step => <StepChip key={step}>{t(`boardStep.${step}`)}</StepChip>)}
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_160px]">
                <div className="space-y-1.5">
                  <Label>{t('priority')}</Label>
                  <Input type="number" min={0} max={9999} value={priority} onChange={event => setPriority(Number(event.target.value))} />
                </div>
                <label className="flex items-center gap-2 pt-7 text-sm font-medium text-foreground">
                  <input type="checkbox" checked={isActive} onChange={event => setIsActive(event.target.checked)} />
                  {t('active')}
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-muted/30 p-5">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">{t('previewSuggestions')}</h3>
              </div>
              <SuggestionEditor
                rows={suggestions}
                targetLabel={suggestionTargetLabel}
                onTargetLabelChange={setSuggestionTargetLabel}
                onChange={setSuggestions}
              />
            </div>

            <div className="rounded-2xl border border-border bg-background p-5">
              <div className="mb-4 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">{t('templateHeading')}</h3>
              </div>
              <div className="mb-4 rounded-xl border border-border bg-muted/40 p-4">
                <p className="text-sm font-semibold text-foreground">{t('templateHelper')}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {TEMPLATE_FIELD_KEYS.map(key => {
                    const label = t(`internalField.${key}`)
                    return (
                      <Button
                        key={key}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => setTemplate(current => appendTemplateLine(current, `${label}:`))}
                      >
                        <Plus className="h-3.5 w-3.5" /> {label}
                      </Button>
                    )
                  })}
                </div>
              </div>
              <Textarea value={template} onChange={event => setTemplate(event.target.value)} rows={10} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
              <div className="flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">{t('previewUserHeading')}</h3>
              </div>
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground">{t('previewSubject')}</p>
                  <p className="mt-1 text-sm font-semibold">{name.trim() || t('previewUnnamedConfig')}</p>
                  <div className="mt-3">
                    <ScopePills categoryLabel={selectedCategoryLabel} topicLabel={selectedTopicLabel} subjectLabel={selectedSubjectLabel} />
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground">{t('workflowUsed')}</p>
                  <p className="mt-1 text-sm font-semibold">{t('standardBoardName')}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {BOARD_STEP_KEYS.map(step => <StepChip key={step}>{t(`boardStep.${step}`)}</StepChip>)}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground">{t('previewSuggestions')}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {previewSuggestions.length === 0 && <p className="text-sm text-muted-foreground">{t('previewNoSuggestions')}</p>}
                    {previewSuggestions.map(item => (
                      <span key={`${item.label}-${item.value}`} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {item.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground">{t('previewTemplateUser')}</p>
                  <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-foreground">{renderedTemplatePreview.trim() || t('previewNoTemplate')}</pre>
                </div>

                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground">{t('configCompleteness')}</p>
                  <div className="mt-3 grid gap-2">
                    <div className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-foreground">
                      {previewSuggestions.length > 0
                        ? t('suggestReady', { count: previewSuggestions.length })
                        : t('suggestEmpty')}
                    </div>
                    <div className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-foreground">
                      {template.trim()
                        ? t('templateReady', { count: template.trim().split('\n').filter(Boolean).length })
                        : t('templateEmpty')}
                    </div>
                    <div className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-foreground">
                      {t('workflowStandard')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose}>{tCommon('action.cancel')}</Button>
          <Button type="submit" loading={saving}>{t('saveConfig')}</Button>
        </div>
      </form>
    </Modal>
  )
}

function GuidanceCard({
  item,
  categoryNameById,
  topicNameById,
  subjectNameById,
  onEdit,
}: {
  item: TicketSubjectGuidanceConfigDto
  categoryNameById: Record<string, string>
  topicNameById: Record<string, string>
  subjectNameById: Record<string, string>
  onEdit: () => void
}) {
  const t = useTranslations('admin.settings.template')
  const tTaxonomy = useTranslations('admin.settings.taxonomy')
  const scopeCategory = item.categoryId ? categoryNameById[item.categoryId] : t('allCategories')
  const scopeTopic = item.topicId ? topicNameById[item.topicId] : t('allTopics')
  const scopeSubject = item.subjectId ? subjectNameById[item.subjectId] : t('allSubjects')
  const templateLines = item.template.split('\n').map(line => line.trim()).filter(Boolean).length

  return (
    <div className="rounded-2xl border border-border bg-background p-5 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-base font-semibold text-foreground">{item.name}</p>
            {!item.isActive && <Badge variant="secondary">{tTaxonomy('inactiveBadge')}</Badge>}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t('cardWorkflow')}</p>
        </div>
        <Button size="icon" variant="ghost" onClick={onEdit} title={t('editConfig')}>
          <Pencil className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-4">
        <ScopePills categoryLabel={scopeCategory} topicLabel={scopeTopic} subjectLabel={scopeSubject} />
      </div>

      {item.suggestions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {item.suggestions.slice(0, 4).map(suggestion => (
            <span key={`${suggestion.label}-${suggestion.value}`} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {suggestion.label}
            </span>
          ))}
          {item.suggestions.length > 4 && (
            <Badge variant="outline">{t('moreSuggestions', { count: item.suggestions.length - 4 })}</Badge>
          )}
        </div>
      )}

      <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
        {t('cardSummaryInternal', { suggestions: item.suggestions.length, lines: templateLines })}
      </p>
    </div>
  )
}

export function WorkflowGuidancePanel({
  companyId,
  departmentId,
  categories,
  topics,
  subjects,
}: {
  companyId: string
  departmentId: string
  categories: TicketCategoryDto[]
  topics: TicketTopicDto[]
  subjects: TicketSubjectDto[]
}) {
  const t = useTranslations('admin.settings.template')
  const locale = useLocale() as Locale
  const { data: guidances = [], isLoading: guidancesLoading } = useTicketGuidanceConfigs(companyId, departmentId)
  const createGuidance = useCreateTicketGuidanceConfig()
  const updateGuidance = useUpdateTicketGuidanceConfig()
  const [guidanceEditor, setGuidanceEditor] = useState<GuidanceEditorState | null>(null)

  const categoryNameById = useMemo(
    () => Object.fromEntries(categories.map(item => [item.id, localizedName(item, locale)])), [categories, locale])
  const topicNameById = useMemo(
    () => Object.fromEntries(topics.map(item => [item.id, localizedName(item, locale)])), [topics, locale])
  const subjectNameById = useMemo(
    () => Object.fromEntries(subjects.map(item => [item.id, localizedName(item, locale)])), [subjects, locale])

  const activeCount = guidances.filter(item => item.isActive).length

  async function saveGuidance(values: {
    categoryId?: string
    topicId?: string
    subjectId?: string
    workflowDefinitionId?: string
    name: string
    suggestionTargetLabel?: string
    suggestions: TicketGuidanceSuggestion[]
    template: string
    priority: number
    isActive: boolean
  }) {
    const payload = { ...values, workflowDefinitionId: undefined }
    if (guidanceEditor?.item) {
      await updateGuidance.mutateAsync({ id: guidanceEditor.item.id, ...payload })
    } else {
      await createGuidance.mutateAsync({ companyId, departmentId, ...payload })
    }
    toast.success(t('saved'))
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-muted/40 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{t('studioLabel')}</p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">{t('internalHeading')}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t('internalSubtitle')}</p>
          </div>
          <Button size="lg" disabled={!companyId || !departmentId} onClick={() => setGuidanceEditor({})}>
            <Sparkles className="h-4 w-4" /> {t('create')}
          </Button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:max-w-md">
          {[
            [t('statTotalConfigs'), guidances.length.toString()],
            [t('statActive'), activeCount.toString()],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border bg-background px-4 py-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{t('listHeading')}</h3>
            <p className="text-sm text-muted-foreground">{t('internalListSubtitle')}</p>
          </div>
          <Badge variant="outline">{t('configCount', { count: guidances.length })}</Badge>
        </div>

        {guidancesLoading ? (
          <div className="rounded-2xl border border-border bg-background px-5 py-12 text-center text-sm text-muted-foreground">
            {t('loadingConfigs')}
          </div>
        ) : guidances.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-5 py-12 text-center">
            <Wand2 className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-3 text-sm font-medium text-foreground">{t('noConfigsTitle')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('noConfigsHint')}</p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {guidances.map(item => (
              <GuidanceCard
                key={item.id}
                item={item}
                categoryNameById={categoryNameById}
                topicNameById={topicNameById}
                subjectNameById={subjectNameById}
                onEdit={() => setGuidanceEditor({ item })}
              />
            ))}
          </div>
        )}
      </section>

      {guidanceEditor && (
        <GuidanceEditor
          state={guidanceEditor}
          categories={categories}
          topics={topics}
          subjects={subjects}
          onClose={() => setGuidanceEditor(null)}
          onSave={saveGuidance}
        />
      )}
    </div>
  )
}
