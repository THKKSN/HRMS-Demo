'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'
import { toast } from 'sonner'
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

function message(error: unknown) {
  const data = (error as { response?: { data?: { message?: string; error?: string; errors?: string[] } } }).response?.data
  return data?.message ?? data?.errors?.[0] ?? data?.error ?? 'ไม่สามารถเปิดใบแจ้งเรื่องได้'
}

export default function NewTicketPage() {
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
    if (!companyId || !departmentId || !categoryId || !topicId || !subjectId || !detail.trim()) return toast.error('กรุณากรอกข้อมูลที่จำเป็นให้ครบ')
    if (requiresOther && !otherTopicText.trim()) return toast.error('กรุณาระบุหัวข้ออื่น ๆ')
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
      toast.success(`เปิดใบแจ้งเรื่อง ${result.ticketNo} แล้ว`)
      router.push(`/tickets/${result.id}`)
    } catch (error) {
      toast.error(message(error))
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold">แจ้งเรื่องภายใน</h1>
        <p className="mt-1 text-sm text-muted-foreground">ระบุหน่วยงานปลายทางและรายละเอียดที่ต้องการให้ตรวจสอบ</p>
      </div>
      <form onSubmit={submit} className="space-y-6">
        <section className="border-y border-border py-5">
          <h2 className="mb-4 text-sm font-semibold">หน่วยงานและประเภทเรื่อง</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="บริษัท">
              <div className="flex h-10 w-full items-center rounded-md border border-border bg-muted px-3 text-sm text-muted-foreground">
                {!companies.length
                  ? 'กำลังโหลดบริษัท...'
                  : selectedCompany?.name ?? 'ไม่พบบริษัทปลายทางในระบบแจ้งเรื่อง'}
              </div>
            </Field>
            <Field label="แผนกปลายทาง *">
              <Select value={departmentId} disabled={!companyId} onChange={event => { setDepartmentId(event.target.value); setCategoryId(''); setTopicId(''); setSubjectId(''); setOtherTopicText('') }}>
                <option value="">เลือกแผนก</option>
                {departments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            </Field>
            <Field label="หมวด *">
              <Select value={categoryId} disabled={!departmentId} onChange={event => { setCategoryId(event.target.value); setTopicId(''); setSubjectId(''); setOtherTopicText('') }}>
                <option value="">เลือกหมวด</option>
                {categories.filter(item => item.isActive).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            </Field>
            <Field label="หมวดย่อย *">
              <Select value={topicId} disabled={!categoryId} onChange={event => { setTopicId(event.target.value); setSubjectId(''); setOtherTopicText('') }}>
                <option value="">เลือกหมวดย่อย</option>
                {topics.filter(item => item.isActive).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            </Field>
            <Field label="หัวข้อ *">
              <Select value={subjectId} disabled={!topicId} onChange={event => { setSubjectId(event.target.value); setOtherTopicText('') }}>
                <option value="">เลือกหัวข้อ</option>
                {subjects.filter(item => item.isActive).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            </Field>
            {requiresOther && (
              <Field label="ระบุหัวข้ออื่น ๆ *" wide>
                <Input value={otherTopicText} onChange={event => setOtherTopicText(event.target.value)} maxLength={200} />
              </Field>
            )}
            {subjectGuidance && (
              <Field label="รายการแนะนำ" wide>
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
          <h2 className="text-sm font-semibold">รายละเอียด</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="รายละเอียดปัญหา *" wide>
              <div className="space-y-2">
                <textarea
                  rows={6}
                  value={detail}
                  onChange={event => setDetail(event.target.value)}
                  placeholder={subjectGuidance?.template}
                  maxLength={2000}
                  className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
                {subjectGuidance && <p className="text-xs text-emerald-700">template และรายการแนะนำถูกตั้งค่าจาก rule กลาง เพิ่มหัวข้อใหม่ได้จากจุดเดียว</p>}
              </div>
            </Field>
            <Field label="ความเร่งด่วน">
              <Select value={priority} onChange={event => setPriority(event.target.value as TicketPriority)}>
                <option value="Low">ปกติ</option>
                <option value="Medium">กลาง</option>
                <option value="High">ด่วน</option>
                <option value="Critical">ด่วนมาก</option>
              </Select>
            </Field>
            <Field label="เบอร์โทรติดต่อ"><Input value={contactPhone} onChange={event => setContactPhone(event.target.value)} maxLength={30} /></Field>
            <Field label="ข้อมูลติดต่อเพิ่มเติม" wide><Input value={contactNote} onChange={event => setContactNote(event.target.value)} maxLength={500} /></Field>
            <Field label="หลักฐานประกอบ" wide><FileUploadInput module="tickets" value={attachment} onChange={setAttachment} accept="image/*,.pdf" label="แนบรูปหรือเอกสาร" /></Field>
          </div>
        </section>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>ยกเลิก</Button>
          <Button type="submit" loading={create.isPending}><Send className="h-4 w-4" /> ส่งใบแจ้งเรื่อง</Button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <div className={`space-y-1.5 ${wide ? 'md:col-span-2' : ''}`}><Label>{label}</Label>{children}</div>
}
