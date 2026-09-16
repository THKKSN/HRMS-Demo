'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import {
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  FileText,
  Loader2,
  MapPin,
  Send,
  ShieldAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ExternalTicketCreatedDto } from '@hrms/shared-types'
import { localizedName } from '@hrms/i18n'
import { useApiError } from '@/hooks/use-api-error'
import {
  useCreateExternalTicket,
  useExternalTicketForm,
} from '@/hooks/use-external-tickets'

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder: string
  disabled?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="h-11 w-full rounded-xl border border-external-line bg-external-surface px-3 text-sm outline-none focus:border-external-brand disabled:bg-external-line/60"
      >
        <option value="">{placeholder}</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
  type?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="h-11 w-full rounded-xl border border-external-line bg-external-surface px-3 text-sm outline-none focus:border-external-brand"
      />
    </label>
  )
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="bg-external-brand px-4 pb-5 pt-1 text-white">
      <div className="flex items-center gap-3">
        <Link href="/external" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold">{title}</h1>
          <p className="text-xs text-white/75">{subtitle}</p>
        </div>
      </div>
    </div>
  )
}

export default function ExternalNewTicketPage() {
  const t = useTranslations('liff.external.new')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const locale = useLocale()
  const { data: form, isLoading, isError } = useExternalTicketForm()
  const createTicket = useCreateExternalTicket()

  // ข้อมูลผู้แจ้งกรอกที่หน้า /external/register ตอนเข้าใช้งานครั้งแรกแล้ว
  // (layout เป็นตัวบังคับ — ยังไม่ลงทะเบียนจะเข้าหน้านี้ไม่ได้)
  const [categoryId, setCategoryId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [detail, setDetail] = useState('')
  const [locationText, setLocationText] = useState('')
  const [contactNote, setContactNote] = useState('')
  const [created, setCreated] = useState<ExternalTicketCreatedDto | null>(null)

  const selectedCategory = useMemo(
    () => form?.categories.find(c => c.id === categoryId), [form, categoryId])
  const selectedTopic = useMemo(
    () => selectedCategory?.topics.find(t => t.id === topicId), [selectedCategory, topicId])
  const selectedSubject = useMemo(
    () => selectedTopic?.subjects.find(s => s.id === subjectId), [selectedTopic, subjectId])

  const canSubmit = !!subjectId && detail.trim().length > 0

  // เลือกหัวข้อ → เติม template ให้อัตโนมัติถ้ายังไม่ได้พิมพ์อะไร (พิมพ์แล้วไม่ทับของเดิม)
  function handleSubjectChange(nextSubjectId: string) {
    setSubjectId(nextSubjectId)
    const nextSubject = selectedTopic?.subjects.find(s => s.id === nextSubjectId)
    if (nextSubject?.template && detail.trim().length === 0) {
      setDetail(nextSubject.template)
    }
  }

  // กด chip แนะนำ → เติมท่อความ (ถ้าว่างใส่แทน ไม่ว่างต่อท้ายบรรทัดใหม่)
  function applySuggestion(text: string) {
    setDetail(prev => prev.trim().length === 0 ? text : `${prev}\n${text}`)
  }

  async function submitTicket(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit || createTicket.isPending) return
    try {
      const result = await createTicket.mutateAsync({
        externalTicketSubjectId: subjectId,
        detail: detail.trim(),
        locationText: locationText.trim() || undefined,
        contactNote: contactNote.trim() || undefined,
      })
      setCreated(result)
    } catch (err) {
      toast.error(apiError(err, tCommon('state.error')))
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-external-canvas">
        <Loader2 className="h-6 w-6 animate-spin text-external-muted" />
      </div>
    )
  }

  if (isError || !form || !form.isEnabled) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-external-canvas px-6 text-center">
        <ShieldAlert className="h-10 w-10 text-amber-500" />
        <p className="text-sm text-external-muted">
          {t('disabled')}
        </p>
        <Link href="/external" className="text-sm font-semibold text-external-brand-text">{tCommon('action.backHome')}</Link>
      </div>
    )
  }

  // --- สร้างเสร็จ → หน้า success แบบเดียวกับแจ้งเรื่องภายใน ---
  if (created) {
    // ชื่อหมวด/หัวข้อเอาจากตัวเลือกที่ผู้ใช้เลือกไว้ (มี nameEn/nameId) — created.*Name จาก API เป็น snapshot ไทย
    const categoryLabel = selectedCategory ? localizedName(selectedCategory, locale) : created.categoryName
    const topicLabel = selectedTopic ? localizedName(selectedTopic, locale) : created.topicName
    const subjectLabel = selectedSubject ? localizedName(selectedSubject, locale) : created.subjectName
    return (
      <div className="min-h-full bg-external-canvas">
        <PageHeader title={t('success.title')} subtitle={t('success.subtitle')} />

        <div className="px-4 pt-4">
          <div className="rounded-2xl bg-external-surface p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">{t('success.ticketNo')}</p>
            <p className="mt-1 text-2xl font-bold text-external-brand-text">{created.ticketNo}</p>
            <div className="mt-4 space-y-2 text-sm">
              <p><span className="text-muted-foreground">{t('success.category')}:</span> {categoryLabel} / {topicLabel}</p>
              <p><span className="text-muted-foreground">{t('success.subject')}:</span> {subjectLabel}</p>
              <p><span className="text-muted-foreground">{t('success.status')}:</span> {t('success.statusValue')}</p>
            </div>
            <div className="mt-5 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{t('success.noticeTitle')}</p>
                <p className="mt-1 text-xs leading-5">
                  {t('success.noticeBody')}
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Link href={`/external/${created.id}`} className="flex h-11 items-center justify-center rounded-xl bg-external-brand text-sm font-semibold text-white">
                {tCommon('action.viewDetail')}
              </Link>
              <Link href="/external" className="flex h-11 items-center justify-center rounded-xl border border-external-line bg-external-surface text-sm font-semibold">
                {t('success.viewAll')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- ฟอร์มแจ้งเรื่อง ---
  return (
    <div className="min-h-full bg-external-canvas">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <form onSubmit={submitTicket} className="flex flex-col gap-3 px-4 pb-28 pt-3">
        <section className="rounded-2xl bg-external-surface p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-external-brand-text" />
            <span className="text-sm font-semibold">{t('topicSection')}</span>
          </div>

          <div className="space-y-3">
            <SelectField
              label={t('category')}
              value={categoryId}
              onChange={value => { setCategoryId(value); setTopicId(''); setSubjectId('') }}
              placeholder={t('selectCategory')}
              options={form.categories.map(c => ({ value: c.id, label: localizedName(c, locale) }))}
            />
            <SelectField
              label={t('topic')}
              value={topicId}
              onChange={value => { setTopicId(value); setSubjectId('') }}
              disabled={!categoryId}
              placeholder={!categoryId ? t('selectCategoryFirst') : t('selectTopic')}
              options={(selectedCategory?.topics ?? []).map(item => ({ value: item.id, label: localizedName(item, locale) }))}
            />
            <SelectField
              label={t('subject')}
              value={subjectId}
              onChange={handleSubjectChange}
              disabled={!topicId}
              placeholder={!topicId ? t('selectTopicFirst') : t('selectSubject')}
              options={(selectedTopic?.subjects ?? []).map(s => ({ value: s.id, label: localizedName(s, locale) }))}
            />
            {selectedSubject?.description && (
              <p className="rounded-xl bg-external-canvas px-3 py-2 text-xs text-external-muted">{selectedSubject.description}</p>
            )}
            {selectedSubject && selectedSubject.suggestions.length > 0 && (
              <div className="rounded-xl border border-external-brand/25 bg-external-brand/10 p-3">
                <span className="mb-2 block text-xs font-medium text-external-brand-text">{t('suggestions')}</span>
                <div className="flex flex-wrap gap-2">
                  {selectedSubject.suggestions.map(suggestion => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => applySuggestion(suggestion)}
                      className="rounded-full border border-external-brand/30 bg-external-surface px-3 py-1 text-xs font-medium text-external-brand-text"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl bg-external-surface p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-external-brand-text" />
            <span className="text-sm font-semibold">{t('detailSection')}</span>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('detail')}</span>
            <textarea
              value={detail}
              onChange={e => setDetail(e.target.value)}
              placeholder={t('detailPlaceholder')}
              maxLength={2000}
              rows={5}
              className="w-full resize-none rounded-xl border border-external-line bg-external-surface px-3 py-2 text-sm outline-none focus:border-external-brand"
            />
          </label>
        </section>

        <section className="rounded-2xl bg-external-surface p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-external-brand-text" />
            <span className="text-sm font-semibold">{t('extraSection')}</span>
          </div>

          <div className="space-y-3">
            <TextInput label={t('location')} value={locationText} onChange={setLocationText} placeholder={t('locationPlaceholder')} maxLength={200} />
            <TextInput label={t('contactNote')} value={contactNote} onChange={setContactNote} placeholder={t('contactNotePlaceholder')} maxLength={500} />
          </div>
        </section>

        <button
          type="submit"
          disabled={!canSubmit || createTicket.isPending}
          className="fixed bottom-6 left-1/2 flex h-12 w-[calc(100%-2rem)] max-w-[380px] -translate-x-1/2 items-center justify-center gap-2 rounded-2xl bg-external-brand text-sm font-bold text-white shadow-lg disabled:bg-external-line disabled:text-external-muted"
        >
          {createTicket.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {t('submit')}
        </button>
      </form>
    </div>
  )
}
