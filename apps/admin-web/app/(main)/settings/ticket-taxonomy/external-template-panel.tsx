'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { ClipboardList, FilePenLine, Pencil, Plus, Sparkles, Trash2, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ExternalTicketCategoryDto, ExternalTicketSubjectDto } from '@hrms/shared-types'
import { localizedName, type Locale } from '@hrms/i18n'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  useExternalTicketCategories,
  useExternalTicketSubjects,
  useExternalTicketTopics,
  useUpdateExternalTicketSubject,
} from '@/hooks/use-external-ticket-taxonomy'
import { useApiError } from '@/hooks/use-api-error'

type GuidanceEditorState = { item?: ExternalTicketSubjectDto }
type SuggestionRow = { id: string; value: string }

// หัวข้อ/ตัวเลือกสำเร็จรูปที่กดเติมได้ — ข้อความจริงมาจาก `admin.settings.template.field|quickSuggestion.*`
// ค่าที่เติมลง template เป็นภาษาที่ผู้ดูแลกำลังใช้อยู่ เพราะเป็นเนื้อหาที่ HR เขียนเก็บใน DB เอง
const TEMPLATE_FIELD_KEYS = ['symptom', 'location', 'contact', 'occurredAt'] as const
const QUICK_SUGGESTION_KEYS = ['noPower', 'shutdown', 'strangeNoise', 'damaged', 'unusable'] as const

function appendTemplateLine(template: string, line: string) {
  const trimmedTemplate = template.trimEnd()
  if (!trimmedTemplate) return `${line}\n`
  return `${trimmedTemplate}\n${line}\n`
}

function makeId() {
  return `suggestion-${Math.random().toString(36).slice(2, 10)}`
}

function toSuggestionRows(suggestions?: string[]): SuggestionRow[] {
  if (!suggestions?.length) return []
  return suggestions.map(value => ({ id: makeId(), value }))
}

function toSuggestions(rows: SuggestionRow[]): string[] {
  return rows.map(row => row.value.trim()).filter(Boolean)
}

function ScopePills({ categoryLabel, topicLabel, subjectLabel }: {
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

function SuggestionEditor({ rows, onChange }: { rows: SuggestionRow[]; onChange: (rows: SuggestionRow[]) => void }) {
  const t = useTranslations('admin.settings.template')

  function updateRow(id: string, value: string) {
    onChange(rows.map(row => row.id === id ? { ...row, value } : row))
  }

  function addSuggestion(value = '') {
    onChange([...rows, { id: makeId(), value }])
  }

  const quickSuggestions = QUICK_SUGGESTION_KEYS.map(key => t(`quickSuggestion.${key}`))
  const remainingQuickSuggestions = quickSuggestions.filter(item => !rows.some(row => row.value === item))

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-background p-4">
        <p className="text-sm font-semibold text-foreground">{t('quickAdd')}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {remainingQuickSuggestions.length === 0 && <p className="text-sm text-muted-foreground">{t('quickAddDone')}</p>}
          {remainingQuickSuggestions.map(item => (
            <Button key={item} type="button" variant="outline" size="sm" className="rounded-full" onClick={() => addSuggestion(item)}>
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
          <div key={row.id} className="flex items-center gap-2">
            <Input
              value={row.value}
              onChange={event => updateRow(row.id, event.target.value)}
              placeholder={t('suggestionPlaceholder', { index: index + 1 })}
            />
            <Button type="button" size="icon" variant="ghost" onClick={() => onChange(rows.filter(item => item.id !== row.id))}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full rounded-xl border-dashed"
        disabled={rows.length >= 20}
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
  initialTopicLabel,
  onClose,
  onSave,
}: {
  state: GuidanceEditorState
  categories: ExternalTicketCategoryDto[]
  initialTopicLabel?: string
  onClose: () => void
  onSave: (subject: ExternalTicketSubjectDto, values: { template?: string; suggestions: string[] }) => Promise<void>
}) {
  const t = useTranslations('admin.settings.template')
  const tTaxonomy = useTranslations('admin.settings.taxonomy')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const locale = useLocale() as Locale
  const isEditingExisting = Boolean(state.item)
  const [categoryId, setCategoryId] = useState('')
  const [topicId, setTopicId] = useState(state.item?.externalTicketTopicId ?? '')
  const [subjectId, setSubjectId] = useState(state.item?.id ?? '')
  const [template, setTemplate] = useState(state.item?.template ?? '')
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>(() => toSuggestionRows(state.item?.suggestions))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const { data: availableTopics = [] } = useExternalTicketTopics(categoryId)
  const { data: availableSubjects = [] } = useExternalTicketSubjects(topicId)

  const selectedCategory = categories.find(item => item.id === categoryId)
  const selectedCategoryLabel = selectedCategory ? localizedName(selectedCategory, locale) : '-'
  const selectedTopic = availableTopics.find(item => item.id === topicId)
  const selectedTopicLabel = isEditingExisting
    ? (initialTopicLabel ?? '-')
    : (selectedTopic ? localizedName(selectedTopic, locale) : '-')
  const selectedSubject = availableSubjects.find(item => item.id === subjectId)
  const selectedSubjectLabel = selectedSubject
    ? localizedName(selectedSubject, locale)
    : (state.item ? localizedName(state.item, locale) : '-')
  const previewSuggestions = useMemo(() => toSuggestions(suggestions), [suggestions])

  useEffect(() => {
    if (!isEditingExisting && !availableTopics.some(item => item.id === topicId)) setTopicId('')
  }, [availableTopics, topicId, isEditingExisting])

  useEffect(() => {
    if (!isEditingExisting && !availableSubjects.some(item => item.id === subjectId)) setSubjectId('')
  }, [availableSubjects, subjectId, isEditingExisting])

  useEffect(() => {
    if (isEditingExisting) return
    const subject = availableSubjects.find(item => item.id === subjectId)
    if (subject) {
      setTemplate(subject.template ?? '')
      setSuggestions(toSuggestionRows(subject.suggestions))
    }
  }, [subjectId, availableSubjects, isEditingExisting])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const targetSubject = state.item ?? selectedSubject
    if (!targetSubject) {
      setError(t('selectSubjectRequired'))
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(targetSubject, { template: template.trim() || undefined, suggestions: previewSuggestions })
      onClose()
    } catch (err) {
      setError(apiError(err, tCommon('state.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={isEditingExisting ? t('editorEditTitle') : t('editorAddTitle')} size="xl">
      <form onSubmit={submit} className="space-y-6">
        <section className="rounded-2xl border border-border bg-muted/40 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Wand2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">{t('editorHeading')}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t('editorSubtitle')}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-background p-5">
              <div className="mb-4 flex items-center gap-2">
                <FilePenLine className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">{t('scope')}</h3>
              </div>
              {isEditingExisting ? (
                <p className="text-sm text-muted-foreground">{t('scopeLocked')}</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>{tTaxonomy('category.heading')}</Label>
                    <Select value={categoryId} onChange={event => { setCategoryId(event.target.value); setTopicId(''); setSubjectId('') }}>
                      <option value="">{t('selectCategory')}</option>
                      {categories.map(item => <option key={item.id} value={item.id}>{localizedName(item, locale)}</option>)}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{tTaxonomy('topic.heading')}</Label>
                    <Select value={topicId} disabled={!categoryId} onChange={event => { setTopicId(event.target.value); setSubjectId('') }}>
                      <option value="">{t('selectTopic')}</option>
                      {availableTopics.map(item => <option key={item.id} value={item.id}>{localizedName(item, locale)}</option>)}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{tTaxonomy('subject.heading')} *</Label>
                    <Select value={subjectId} disabled={!topicId} onChange={event => setSubjectId(event.target.value)}>
                      <option value="">{t('selectSubject')}</option>
                      {availableSubjects.map(item => <option key={item.id} value={item.id}>{localizedName(item, locale)}</option>)}
                    </Select>
                  </div>
                </div>
              )}

              <div className="mt-4 space-y-3 rounded-xl border border-border bg-muted/40 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{t('scopePreview')}</p>
                <ScopePills categoryLabel={selectedCategoryLabel} topicLabel={selectedTopicLabel} subjectLabel={selectedSubjectLabel} />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-muted/30 p-5">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">{t('suggestHeading')}</h3>
              </div>
              <SuggestionEditor rows={suggestions} onChange={setSuggestions} />
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
                    const label = t(`field.${key}`)
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
              <Textarea value={template} onChange={event => setTemplate(event.target.value)} rows={10} maxLength={2000} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
              <div className="flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">{t('previewHeading')}</h3>
              </div>
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground">{t('previewSubject')}</p>
                  <p className="mt-1 text-sm font-semibold">{selectedSubjectLabel}</p>
                  <div className="mt-3">
                    <ScopePills categoryLabel={selectedCategoryLabel} topicLabel={selectedTopicLabel} subjectLabel={selectedSubjectLabel} />
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground">{t('previewSuggestions')}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {previewSuggestions.length === 0 && <p className="text-sm text-muted-foreground">{t('previewNoSuggestions')}</p>}
                    {previewSuggestions.map(item => (
                      <span key={item} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground">{t('previewTemplate')}</p>
                  <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-foreground">{template.trim() || t('previewNoTemplate')}</pre>
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

function GuidanceCard({ item, categoryLabel, topicLabel, onEdit }: {
  item: ExternalTicketSubjectDto
  categoryLabel: string
  topicLabel: string
  onEdit: () => void
}) {
  const t = useTranslations('admin.settings.template')
  const tTaxonomy = useTranslations('admin.settings.taxonomy')
  const locale = useLocale() as Locale
  const templateLines = (item.template ?? '').split('\n').map(line => line.trim()).filter(Boolean).length
  const subjectLabel = localizedName(item, locale)

  return (
    <div className="rounded-2xl border border-border bg-background p-5 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-base font-semibold text-foreground">{subjectLabel}</p>
            {!item.isActive && <Badge variant="secondary">{tTaxonomy('inactiveBadge')}</Badge>}
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={onEdit} title={t('editConfig')}>
          <Pencil className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-4">
        <ScopePills categoryLabel={categoryLabel} topicLabel={topicLabel} subjectLabel={subjectLabel} />
      </div>

      {item.suggestions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {item.suggestions.slice(0, 4).map(suggestion => (
            <span key={suggestion} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {suggestion}
            </span>
          ))}
          {item.suggestions.length > 4 && (
            <Badge variant="outline">{t('moreSuggestions', { count: item.suggestions.length - 4 })}</Badge>
          )}
        </div>
      )}

      <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
        {t('cardSummary', { suggestions: item.suggestions.length, lines: templateLines })}
      </p>
    </div>
  )
}

export function ExternalTemplateGuidancePanel() {
  const t = useTranslations('admin.settings.template')
  const tTaxonomy = useTranslations('admin.settings.taxonomy')
  const locale = useLocale() as Locale
  const [categoryId, setCategoryId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [guidanceEditor, setGuidanceEditor] = useState<GuidanceEditorState | null>(null)

  const { data: categories = [] } = useExternalTicketCategories()
  const { data: topics = [] } = useExternalTicketTopics(categoryId)
  const { data: subjects = [], isLoading: subjectsLoading } = useExternalTicketSubjects(topicId)
  const updateSubject = useUpdateExternalTicketSubject()

  useEffect(() => {
    if (!categoryId && categories.length) setCategoryId(categories[0].id)
  }, [categories, categoryId])

  useEffect(() => {
    if (!topics.some(topic => topic.id === topicId)) setTopicId(topics[0]?.id ?? '')
  }, [topics, topicId])

  const selectedCategory = categories.find(item => item.id === categoryId)
  const selectedTopic = topics.find(item => item.id === topicId)
  const categoryLabel = selectedCategory ? localizedName(selectedCategory, locale) : '-'
  const topicLabel = selectedTopic ? localizedName(selectedTopic, locale) : '-'
  const activeCount = subjects.filter(item => item.isActive).length
  const configuredCount = subjects.filter(item => item.template || item.suggestions.length > 0).length

  async function saveGuidance(item: ExternalTicketSubjectDto, values: { template?: string; suggestions: string[] }) {
    await updateSubject.mutateAsync({
      id: item.id,
      externalTicketTopicId: item.externalTicketTopicId,
      name: item.name,
      description: item.description,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
      ...values,
    })
    toast.success(t('saved'))
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-muted/40 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{t('studioLabel')}</p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">{t('externalHeading')}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t('externalSubtitle')}</p>
          </div>
          <Button size="lg" onClick={() => setGuidanceEditor({})}>
            <Sparkles className="h-4 w-4" /> {t('create')}
          </Button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:max-w-md">
          {[
            [t('statTotalSubjects'), subjects.length.toString()],
            [t('statConfigured'), configuredCount.toString()],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border bg-background px-4 py-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3 border-y border-border py-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="template-category">{tTaxonomy('category.heading')}</Label>
          <Select
            id="template-category"
            value={categoryId}
            disabled={!categories.length}
            onChange={event => { setCategoryId(event.target.value); setTopicId('') }}
          >
            <option value="">{t('selectCategory')}</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>{localizedName(category, locale)}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="template-topic">{tTaxonomy('topic.heading')}</Label>
          <Select
            id="template-topic"
            value={topicId}
            disabled={!categoryId || !topics.length}
            onChange={event => setTopicId(event.target.value)}
          >
            <option value="">{t('selectTopic')}</option>
            {topics.map(topic => (
              <option key={topic.id} value={topic.id}>{localizedName(topic, locale)}</option>
            ))}
          </Select>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{t('listHeading')}</h3>
            <p className="text-sm text-muted-foreground">{t('listSubtitle')}</p>
          </div>
          <Badge variant="outline">{t('activeCount', { count: activeCount })}</Badge>
        </div>

        {!topicId ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-5 py-12 text-center text-sm text-muted-foreground">
            {t('selectTopicFirst')}
          </div>
        ) : subjectsLoading ? (
          <div className="rounded-2xl border border-border bg-background px-5 py-12 text-center text-sm text-muted-foreground">
            {tTaxonomy('subject.loading')}
          </div>
        ) : subjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-5 py-12 text-center">
            <Wand2 className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-3 text-sm font-medium text-foreground">{t('noSubjectsTitle')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('noSubjectsHint')}</p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {subjects.map(item => (
              <GuidanceCard
                key={item.id}
                item={item}
                categoryLabel={categoryLabel}
                topicLabel={topicLabel}
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
          initialTopicLabel={topicLabel}
          onClose={() => setGuidanceEditor(null)}
          onSave={saveGuidance}
        />
      )}
    </div>
  )
}
