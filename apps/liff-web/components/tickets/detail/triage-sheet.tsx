'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { TicketDetailDto, TicketPriority } from '@hrms/shared-types'
import { localizedName } from '@hrms/i18n'
import {
  useTicketCategories,
  useTicketSubjects,
  useTicketTopics,
  useTriageTicket,
} from '@/hooks/use-tickets'
import { useApiError } from '@/hooks/use-api-error'
import { BottomSheet } from './ticket-detail-shared'

const PRIORITIES: TicketPriority[] = ['Low', 'Medium', 'High', 'Critical']

// จัดประเภทใบแจ้งเรื่องใหม่ (หมวด / หมวดย่อย / หัวข้อ / ความเร่งด่วน)
export function TriageSheet({ ticket, onClose }: { ticket: TicketDetailDto; onClose: () => void }) {
  const t = useTranslations('liff.ticket.detail.triage')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const tPriority = useTranslations('status.ticketPriority')
  const locale = useLocale()
  const triage = useTriageTicket(ticket.id)
  const [categoryId, setCategoryId] = useState(ticket.categoryId)
  const [topicId, setTopicId] = useState(ticket.topicId)
  const [subjectId, setSubjectId] = useState(ticket.subjectId ?? '')
  const [otherTopicText, setOtherTopicText] = useState(ticket.otherTopicText ?? '')
  const [priority, setPriority] = useState<TicketPriority>(ticket.priority)
  const [locationText, setLocationText] = useState(ticket.locationText ?? '')
  const [vehicleText, setVehicleText] = useState(ticket.vehicleText ?? '')
  const { data: categories = [] } = useTicketCategories({ companyId: ticket.targetCompanyId, departmentId: ticket.targetDepartmentId })
  const { data: topics = [] } = useTicketTopics({ companyId: ticket.targetCompanyId, departmentId: ticket.targetDepartmentId, categoryId })
  const { data: subjects = [] } = useTicketSubjects({ companyId: ticket.targetCompanyId, departmentId: ticket.targetDepartmentId, categoryId, topicId })
  const selectedTopic = topics.find(topic => topic.id === topicId)
  const selectedSubject = subjects.find(subject => subject.id === subjectId)
  // "อื่น ๆ" เป็นชื่อไทยที่ HR ตั้งไว้ใน master data (กติกาเดิม) — เทียบกับ name ไทยเสมอไม่ว่าจอจะเป็นภาษาอะไร
  const requiresOther = selectedTopic?.name.trim() === 'อื่น ๆ' || selectedSubject?.name.trim() === 'อื่น ๆ'

  async function submit() {
    if (!categoryId || !topicId) return toast.error(t('categoryRequired'))
    if (requiresOther && !otherTopicText.trim()) return toast.error(t('otherRequired'))
    try {
      await triage.mutateAsync({
        categoryId,
        topicId,
        subjectId: subjectId || undefined,
        otherTopicText: requiresOther ? otherTopicText.trim() : undefined,
        priority,
        locationText: locationText.trim() || undefined,
        vehicleText: vehicleText.trim() || undefined,
        expectedUpdatedAt: ticket.updatedAt,
      })
      toast.success(t('saved'))
      onClose()
    } catch (error) {
      toast.error(apiError(error, tCommon('state.error')))
    }
  }

  return (
    <BottomSheet title={t('title')} onClose={onClose}>
      <div className="space-y-4">
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">{t('category')}</span>
          <select value={categoryId} onChange={event => { setCategoryId(event.target.value); setTopicId(''); setSubjectId(''); setOtherTopicText('') }} className="h-10 w-full rounded-md border border-border bg-background px-3 outline-none focus:border-primary">
            <option value="">{t('selectCategory')}</option>
            {categories.filter(item => item.isActive).map(item => <option key={item.id} value={item.id}>{localizedName(item, locale)}</option>)}
          </select>
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">{t('topic')}</span>
          <select value={topicId} onChange={event => { setTopicId(event.target.value); setSubjectId(''); setOtherTopicText('') }} className="h-10 w-full rounded-md border border-border bg-background px-3 outline-none focus:border-primary">
            <option value="">{t('selectTopic')}</option>
            {topics.filter(item => item.isActive).map(item => <option key={item.id} value={item.id}>{localizedName(item, locale)}</option>)}
          </select>
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">{t('subject')}</span>
          <select value={subjectId} disabled={!topicId} onChange={event => setSubjectId(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 outline-none focus:border-primary disabled:opacity-50">
            <option value="">{t('noSubject')}</option>
            {subjects.filter(item => item.isActive).map(item => <option key={item.id} value={item.id}>{localizedName(item, locale)}</option>)}
          </select>
        </label>
        {requiresOther && (
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">{t('otherTopic')}</span>
            <input value={otherTopicText} onChange={event => setOtherTopicText(event.target.value)} maxLength={200} className="h-10 w-full rounded-md border border-border bg-background px-3 outline-none focus:border-primary" />
          </label>
        )}
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">{t('priority')}</span>
          <select value={priority} onChange={event => setPriority(event.target.value as TicketPriority)} className="h-10 w-full rounded-md border border-border bg-background px-3 outline-none focus:border-primary">
            {PRIORITIES.map(item => <option key={item} value={item}>{tPriority(item)}</option>)}
          </select>
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">{t('vehicle')}</span>
          <input value={vehicleText} onChange={event => setVehicleText(event.target.value)} maxLength={100} className="h-10 w-full rounded-md border border-border bg-background px-3 outline-none focus:border-primary" />
        </label>
        {/* งานภายในไม่ใช้สถานที่ — เปิดเฉพาะ ticket จาก external portal (แจ้งซ่อม) */}
        {ticket.requester.type === 'External' && (
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">{t('location')}</span>
            <input value={locationText} onChange={event => setLocationText(event.target.value)} maxLength={200} className="h-10 w-full rounded-md border border-border bg-background px-3 outline-none focus:border-primary" />
          </label>
        )}
        <button type="button" disabled={triage.isPending} onClick={submit} className="flex h-11 w-full items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {triage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('save')}
        </button>
      </div>
    </BottomSheet>
  )
}
