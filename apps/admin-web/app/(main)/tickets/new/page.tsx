'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Send } from 'lucide-react'
import { toast } from 'sonner'
import { localizedName, type Locale } from '@hrms/i18n'
import {
  applyTicketGuidanceSuggestion,
  applyTicketGuidanceTemplate,
  resolveTicketSubjectGuidance,
  type ResolvedTicketSubjectGuidance,
  type TicketPriority,
} from '@hrms/shared-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { FileUploadInput } from '@/components/shared/file-upload-input'
import type { UploadResult } from '@/lib/upload.api'
import { useCreateTicket, useResolvedTicketSubjectGuidance, useTicketCategories, useTicketLookupCompanies, useTicketLookupDepartments, useTicketSubjects, useTicketTopics } from '@/hooks/use-tickets'
import { useAuthStore } from '@/stores/auth.store'

// บริษัทปลายทางคงที่ของระบบแจ้งเรื่อง — ทุกใบส่งเข้าบริษัทนี้เสมอ ไม่ว่าผู้แจ้งอยู่บริษัทไหน
// ถ้าไม่ตั้ง env จะ fallback เป็นบริษัทของผู้แจ้งเอง (ใช้ตอน dev / e2e)
const FIXED_TICKET_COMPANY_ID = process.env.NEXT_PUBLIC_TICKET_COMPANY_ID ?? ''

// ข้อความจาก API ยังเป็นไทย (รอ Phase 3) — fallback ส่งเข้ามาจากคำแปล
function message(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { message?: string; error?: string; errors?: string[] } } }).response?.data
  return data?.message ?? data?.errors?.[0] ?? data?.error ?? fallback
}

export default function NewTicketPage() {
  const t = useTranslations('admin.ticket.new')
  const tPriority = useTranslations('status.ticketPriority')
  const tCommon = useTranslations('common')
  const locale = useLocale() as Locale
  const router = useRouter()
  const create = useCreateTicket()
  const myCompanyId = useAuthStore(state => state.employee?.companyId)
  const [companyId, setCompanyId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [otherTopicText, setOtherTopicText] = useState('')
  const [detail, setDetail] = useState('')
  const [priority, setPriority] = useState<TicketPriority>('Medium')
  const [contactPhone, setContactPhone] = useState('')
  const [contactNote, setContactNote] = useState('')
  const [attachment, setAttachment] = useState<UploadResult | null>(null)
  const { data: companies = [] } = useTicketLookupCompanies()
  const { data: departments = [] } = useTicketLookupDepartments(companyId)
  const { data: categories = [] } = useTicketCategories(companyId, departmentId)
  const { data: topics = [] } = useTicketTopics(companyId, departmentId, categoryId)
  const { data: subjects = [] } = useTicketSubjects(companyId, departmentId, categoryId, topicId)
  const { data: resolvedSubjectGuidance } = useResolvedTicketSubjectGuidance(companyId, departmentId, categoryId, topicId, subjectId)
  const selectedCompany = companies.find(item => item.id === companyId)
  const selectedCategory = categories.find(item => item.id === categoryId)
  const selectedTopic = topics.find(item => item.id === topicId)
  const selectedSubject = subjects.find(item => item.id === subjectId)
  // "อื่น ๆ" เป็นชื่อไทยที่ HR ตั้งไว้ใน master data (กติกาเดิม) — เทียบกับ name ไทยเสมอไม่ว่าจอจะเป็นภาษาอะไร
  const requiresOther = selectedSubject?.name.trim() === 'อื่น ๆ'
  const subjectGuidance = useMemo<ResolvedTicketSubjectGuidance | null>(() => {
    if (resolvedSubjectGuidance && (resolvedSubjectGuidance.template || resolvedSubjectGuidance.suggestions.length > 0)) {
      return {
        suggestions: resolvedSubjectGuidance.suggestions,
        template: resolvedSubjectGuidance.template ?? '',
        suggestionTargetLabel: resolvedSubjectGuidance.suggestionTargetLabel,
        workflowKey: resolvedSubjectGuidance.workflowDefinitionId ?? resolvedSubjectGuidance.guidanceConfigId ?? 'default',
      }
    }

    return resolveTicketSubjectGuidance({
      categoryName: selectedCategory?.name,
      topicName: selectedTopic?.name,
      subjectName: selectedSubject?.name,
    })
  }, [resolvedSubjectGuidance, selectedCategory?.name, selectedTopic?.name, selectedSubject?.name])

  useEffect(() => {
    if (!subjectGuidance) return
    setDetail(currentDetail => applyTicketGuidanceTemplate(currentDetail, subjectGuidance))
  }, [subjectGuidance])

  // เลือก CompanyId ให้อัตโนมัติ ไม่ต้องให้ผู้แจ้งเลือกเอง
  // ห้าม fallback เป็น companies[0] เพราะ lookup คืนหลายบริษัท จะได้บริษัทผิด
  useEffect(() => {
    const targetCompanyId = FIXED_TICKET_COMPANY_ID || myCompanyId
    if (!companies.length || !targetCompanyId) return
    const autoCompanyId = companies.find(item => item.id === targetCompanyId)?.id
    if (!autoCompanyId || autoCompanyId === companyId) return
    setCompanyId(autoCompanyId)
    setDepartmentId('')
    setCategoryId('')
    setTopicId('')
    setSubjectId('')
    setOtherTopicText('')
  }, [companies, companyId, myCompanyId])

  function selectDetailSuggestion(suggestion: NonNullable<typeof subjectGuidance>['suggestions'][number]) {
    if (!subjectGuidance) return
    setDetail(currentDetail => applyTicketGuidanceSuggestion(currentDetail, suggestion, subjectGuidance))
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!companyId || !departmentId || !categoryId || !topicId || !subjectId || !detail.trim()) return toast.error(t('requiredFields'))
    if (requiresOther && !otherTopicText.trim()) return toast.error(t('otherRequired'))
    try {
      const result = await create.mutateAsync({
        requestType: 'Internal',
        targetCompanyId: companyId,
        targetDepartmentId: departmentId,
        categoryId,
        topicId,
        otherTopicText: requiresOther ? otherTopicText.trim() : undefined,
        subjectId,
        detail: detail.trim(),
        priority,
        contactPhone: contactPhone.trim() || undefined,
        contactNote: contactNote.trim() || undefined,
        attachmentUrls: attachment ? [attachment.url] : undefined,
      })
      toast.success(t('created', { ticketNo: result.ticketNo }))
      router.push(`/tickets/${result.id}`)
    } catch (error) {
      toast.error(message(error, t('failed')))
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <form onSubmit={submit} className="space-y-6">
        <section className="border-y border-border py-5">
          <h2 className="mb-4 text-sm font-semibold">{t('orgSection')}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t('company')}>
              <div className="flex h-10 w-full items-center rounded-md border border-border bg-muted px-3 text-sm text-muted-foreground">
                {!companies.length
                  ? t('loadingCompany')
                  : selectedCompany ? localizedName(selectedCompany, locale) : t('companyNotFound')}
              </div>
            </Field>
            <Field label={t('department')}>
              <Select value={departmentId} disabled={!companyId} onChange={event => { setDepartmentId(event.target.value); setCategoryId(''); setTopicId(''); setSubjectId(''); setOtherTopicText('') }}>
                <option value="">{t('selectDepartment')}</option>
                {departments.map(item => <option key={item.id} value={item.id}>{localizedName(item, locale)}</option>)}
              </Select>
            </Field>
            <Field label={t('category')}>
              <Select value={categoryId} disabled={!departmentId} onChange={event => { setCategoryId(event.target.value); setTopicId(''); setSubjectId(''); setOtherTopicText('') }}>
                <option value="">{t('selectCategory')}</option>
                {categories.filter(item => item.isActive).map(item => <option key={item.id} value={item.id}>{localizedName(item, locale)}</option>)}
              </Select>
            </Field>
            <Field label={t('topic')}>
              <Select value={topicId} disabled={!categoryId} onChange={event => { setTopicId(event.target.value); setSubjectId(''); setOtherTopicText('') }}>
                <option value="">{t('selectTopic')}</option>
                {topics.filter(item => item.isActive).map(item => <option key={item.id} value={item.id}>{localizedName(item, locale)}</option>)}
              </Select>
            </Field>
            <Field label={t('subject')}>
              <Select value={subjectId} disabled={!topicId} onChange={event => { setSubjectId(event.target.value); setOtherTopicText('') }}>
                <option value="">{t('selectSubject')}</option>
                {subjects.filter(item => item.isActive).map(item => <option key={item.id} value={item.id}>{localizedName(item, locale)}</option>)}
              </Select>
            </Field>
            {requiresOther && (
              <Field label={t('otherTopic')} wide>
                <Input value={otherTopicText} onChange={event => setOtherTopicText(event.target.value)} maxLength={200} />
              </Field>
            )}
            {subjectGuidance && (
              <Field label={t('suggestions')} wide>
                {/* suggestion.label เป็นข้อความที่ HR ตั้งค่า — ไม่แปล */}
                <div className="flex flex-wrap gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3">
                  {subjectGuidance.suggestions.map(suggestion => (
                    <button
                      key={suggestion.label}
                      type="button"
                      onClick={() => selectDetailSuggestion(suggestion)}
                      className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-medium text-emerald-800"
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              </Field>
            )}
          </div>
        </section>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold">{t('detailSection')}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t('detail')} wide>
              <div className="space-y-2">
                <textarea
                  rows={6}
                  value={detail}
                  onChange={event => setDetail(event.target.value)}
                  placeholder={subjectGuidance?.template}
                  maxLength={2000}
                  className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
                {subjectGuidance && <p className="text-xs text-emerald-700">{t('templateHint')}</p>}
              </div>
            </Field>
            <Field label={t('priority')}>
              <Select value={priority} onChange={event => setPriority(event.target.value as TicketPriority)}>
                {(['Low', 'Medium', 'High', 'Critical'] as TicketPriority[]).map(item => (
                  <option key={item} value={item}>{tPriority(item)}</option>
                ))}
              </Select>
            </Field>
            <Field label={t('contactPhone')}><Input value={contactPhone} onChange={event => setContactPhone(event.target.value)} maxLength={30} /></Field>
            <Field label={t('contactNote')} wide><Input value={contactNote} onChange={event => setContactNote(event.target.value)} maxLength={500} /></Field>
            <Field label={t('attachment')} wide><FileUploadInput module="tickets" value={attachment} onChange={setAttachment} accept="image/*,.pdf" label={t('attachmentLabel')} /></Field>
          </div>
        </section>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>{tCommon('action.cancel')}</Button>
          <Button type="submit" loading={create.isPending}><Send className="h-4 w-4" /> {t('submit')}</Button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <div className={`space-y-1.5 ${wide ? 'md:col-span-2' : ''}`}><Label>{label}</Label>{children}</div>
}
