'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'
import { toast } from 'sonner'
import type { TicketPriority } from '@hrms/shared-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { FileUploadInput } from '@/components/shared/file-upload-input'
import type { UploadResult } from '@/lib/upload.api'
import { useCreateTicket, useTicketCategories, useTicketLookupCompanies, useTicketLookupDepartments, useTicketTopics } from '@/hooks/use-tickets'

function message(error: unknown) {
  const data = (error as { response?: { data?: { message?: string; error?: string; errors?: string[] } } }).response?.data
  return data?.message ?? data?.errors?.[0] ?? data?.error ?? 'ไม่สามารถเปิดใบแจ้งเรื่องได้'
}

export default function NewTicketPage() {
  const router = useRouter()
  const create = useCreateTicket()
  const [companyId, setCompanyId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [otherTopicText, setOtherTopicText] = useState('')
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [priority, setPriority] = useState<TicketPriority>('Medium')
  const [vehicleText, setVehicleText] = useState('')
  const [locationText, setLocationText] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactNote, setContactNote] = useState('')
  const [attachment, setAttachment] = useState<UploadResult | null>(null)
  const { data: companies = [] } = useTicketLookupCompanies()
  const { data: departments = [] } = useTicketLookupDepartments(companyId)
  const { data: categories = [] } = useTicketCategories(companyId, departmentId)
  const { data: topics = [] } = useTicketTopics(companyId, departmentId, categoryId)
  const requiresOther = topics.find(item => item.id === topicId)?.name.trim() === 'อื่น ๆ'

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!companyId || !departmentId || !categoryId || !topicId || !title.trim() || !detail.trim()) return toast.error('กรุณากรอกข้อมูลที่จำเป็นให้ครบ')
    if (requiresOther && !otherTopicText.trim()) return toast.error('กรุณาระบุหัวข้ออื่น ๆ')
    try {
      const result = await create.mutateAsync({
        requestType: 'Internal', targetCompanyId: companyId, targetDepartmentId: departmentId,
        categoryId, topicId, otherTopicText: requiresOther ? otherTopicText.trim() : undefined,
        title: title.trim(), detail: detail.trim(), priority,
        vehicleText: vehicleText.trim() || undefined, locationText: locationText.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined, contactNote: contactNote.trim() || undefined,
        attachmentUrls: attachment ? [attachment.url] : undefined,
      })
      toast.success(`เปิดใบแจ้งเรื่อง ${result.ticketNo} แล้ว`)
      router.push(`/tickets/${result.id}`)
    } catch (error) { toast.error(message(error)) }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div><h1 className="text-xl font-semibold">แจ้งเรื่องภายใน</h1><p className="mt-1 text-sm text-muted-foreground">ระบุหน่วยงานปลายทางและรายละเอียดที่ต้องการให้ตรวจสอบ</p></div>
      <form onSubmit={submit} className="space-y-6">
        <section className="border-y border-border py-5">
          <h2 className="mb-4 text-sm font-semibold">หน่วยงานและประเภทเรื่อง</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="บริษัท *"><Select value={companyId} onChange={event => { setCompanyId(event.target.value); setDepartmentId(''); setCategoryId(''); setTopicId('') }}><option value="">เลือกบริษัท</option>{companies.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
            <Field label="แผนกปลายทาง *"><Select value={departmentId} disabled={!companyId} onChange={event => { setDepartmentId(event.target.value); setCategoryId(''); setTopicId('') }}><option value="">เลือกแผนก</option>{departments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
            <Field label="หมวด *"><Select value={categoryId} disabled={!departmentId} onChange={event => { setCategoryId(event.target.value); setTopicId('') }}><option value="">เลือกหมวด</option>{categories.filter(item => item.isActive).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
            <Field label="หัวข้อย่อย *"><Select value={topicId} disabled={!categoryId} onChange={event => { setTopicId(event.target.value); setOtherTopicText('') }}><option value="">เลือกหัวข้อ</option>{topics.filter(item => item.isActive).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
            {requiresOther && <Field label="ระบุหัวข้ออื่น ๆ *" wide><Input value={otherTopicText} onChange={event => setOtherTopicText(event.target.value)} maxLength={200} /></Field>}
          </div>
        </section>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold">รายละเอียด</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="ชื่อเรื่อง *" wide><Input value={title} onChange={event => setTitle(event.target.value)} maxLength={200} /></Field>
            <Field label="รายละเอียดปัญหา *" wide><textarea rows={6} value={detail} onChange={event => setDetail(event.target.value)} maxLength={2000} className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" /></Field>
            <Field label="ความเร่งด่วน"><Select value={priority} onChange={event => setPriority(event.target.value as TicketPriority)}><option value="Low">ปกติ</option><option value="Medium">กลาง</option><option value="High">ด่วน</option><option value="Critical">ด่วนมาก</option></Select></Field>
            <Field label="รถ / ทะเบียน"><Input value={vehicleText} onChange={event => setVehicleText(event.target.value)} maxLength={100} /></Field>
            <Field label="สถานที่"><Input value={locationText} onChange={event => setLocationText(event.target.value)} maxLength={200} /></Field>
            <Field label="เบอร์โทรติดต่อ"><Input value={contactPhone} onChange={event => setContactPhone(event.target.value)} maxLength={30} /></Field>
            <Field label="ข้อมูลติดต่อเพิ่มเติม" wide><Input value={contactNote} onChange={event => setContactNote(event.target.value)} maxLength={500} /></Field>
            <Field label="หลักฐานประกอบ" wide><FileUploadInput module="general" value={attachment} onChange={setAttachment} accept=".pdf,.jpg,.jpeg,.png,.webp" label="แนบรูปหรือเอกสาร" /></Field>
          </div>
        </section>
        <div className="flex justify-end gap-2 border-t border-border pt-4"><Button type="button" variant="outline" onClick={() => router.back()}>ยกเลิก</Button><Button type="submit" loading={create.isPending}><Send className="h-4 w-4" /> ส่งใบแจ้งเรื่อง</Button></div>
      </form>
    </div>
  )
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <div className={`space-y-1.5 ${wide ? 'md:col-span-2' : ''}`}><Label>{label}</Label>{children}</div>
}
