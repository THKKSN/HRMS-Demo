'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  FileText,
  Loader2,
  MapPin,
  Send,
  ShieldAlert,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ExternalTicketCreatedDto } from '@hrms/shared-types'
import {
  useCreateExternalTicket,
  useExternalTicketForm,
  useUpdateExternalProfile,
} from '@/hooks/use-external-tickets'
import { useExternalAuthStore } from '@/stores/external-auth.store'

function apiMessage(error: unknown) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message
    ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่'
}

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
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#0f8f72] disabled:bg-slate-100"
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
  required,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
  type?: string
  required?: boolean
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
        required={required}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#0f8f72]"
      />
    </label>
  )
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="bg-[#0f8f72] px-4 pb-5 pt-4 text-white">
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
  const { data: form, isLoading, isError } = useExternalTicketForm()
  const reporter = useExternalAuthStore(s => s.reporter)
  const updateProfile = useUpdateExternalProfile()
  const createTicket = useCreateExternalTicket()

  // --- profile step (ไม่มี consent — จัดการที่ระดับ LINE ไปแล้ว) ---
  const [fullName, setFullName] = useState(reporter?.fullName ?? '')
  const [phone, setPhone] = useState(reporter?.phone ?? '')
  const [email, setEmail] = useState(reporter?.email ?? '')
  const [organization, setOrganization] = useState(reporter?.organization ?? '')

  // --- ticket step ---
  const [categoryId, setCategoryId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [detail, setDetail] = useState('')
  const [locationText, setLocationText] = useState('')
  const [contactNote, setContactNote] = useState('')
  const [created, setCreated] = useState<ExternalTicketCreatedDto | null>(null)

  const profileComplete = !!reporter?.fullName && !!reporter?.phone && !!reporter?.email && !!reporter?.organization
  const needProfileStep = !profileComplete

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

  async function submitProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      await updateProfile.mutateAsync({
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        organization: organization.trim(),
      })
      toast.success('บันทึกข้อมูลผู้แจ้งแล้ว')
    } catch (err) {
      toast.error(apiMessage(err))
    }
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
      toast.error(apiMessage(err))
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef7f3]">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (isError || !form || !form.isEnabled) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#eef7f3] px-6 text-center">
        <ShieldAlert className="h-10 w-10 text-amber-500" />
        <p className="text-sm text-slate-600">
          ช่องทางแจ้งเรื่องสำหรับบุคคลภายนอกยังไม่เปิดใช้งานในขณะนี้
        </p>
        <Link href="/external" className="text-sm font-semibold text-[#0f8f72]">กลับหน้าหลัก</Link>
      </div>
    )
  }

  // --- สร้างเสร็จ → หน้า success แบบเดียวกับแจ้งเรื่องภายใน ---
  if (created) {
    return (
      <div className="min-h-screen bg-[#eef7f3]">
        <PageHeader title="ส่งใบแจ้งเรื่องแล้ว" subtitle="ระบบรับเรื่องเรียบร้อย" />

        <div className="px-4 pt-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">เลขที่ใบแจ้ง</p>
            <p className="mt-1 text-2xl font-bold text-[#0f8f72]">{created.ticketNo}</p>
            <div className="mt-4 space-y-2 text-sm">
              <p><span className="text-muted-foreground">หมวด:</span> {created.categoryName} / {created.topicName}</p>
              <p><span className="text-muted-foreground">หัวข้อ:</span> {created.subjectName}</p>
              <p><span className="text-muted-foreground">สถานะ:</span> รอเจ้าหน้าที่รับเรื่อง</p>
            </div>
            <div className="mt-5 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">เจ้าหน้าที่จะตรวจสอบและดำเนินการ</p>
                <p className="mt-1 text-xs leading-5">
                  ติดตามความคืบหน้าได้จากหน้ารายการของฉัน
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Link href={`/external/${created.id}`} className="flex h-11 items-center justify-center rounded-xl bg-[#0f8f72] text-sm font-semibold text-white">
                ดูรายละเอียด
              </Link>
              <Link href="/external" className="flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold">
                ดูเรื่องทั้งหมด
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- step 1: ข้อมูลผู้แจ้ง (ครั้งแรกครั้งเดียว) ---
  if (needProfileStep) {
    return (
      <div className="min-h-screen bg-[#eef7f3]">
        <PageHeader title="ข้อมูลผู้แจ้ง" subtitle="กรอกครั้งแรกครั้งเดียวก่อนแจ้งเรื่อง" />

        <form onSubmit={submitProfile} className="flex flex-col gap-3 px-4 pb-28 pt-3">
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <UserRound className="h-4 w-4 text-[#0f8f72]" />
              <span className="text-sm font-semibold">ข้อมูลติดต่อของคุณ</span>
            </div>

            <div className="space-y-3">
              <TextInput label="ชื่อ-นามสกุล" value={fullName} onChange={setFullName} placeholder="ชื่อจริงและนามสกุล" maxLength={200} required />
              <TextInput label="เบอร์โทรศัพท์" value={phone} onChange={setPhone} placeholder="เบอร์ติดต่อกลับ" maxLength={20} type="tel" required />
              <TextInput label="อีเมล" value={email} onChange={setEmail} placeholder="name@example.com" maxLength={320} type="email" required />
              <TextInput label="หน่วยงาน/บริษัท" value={organization} onChange={setOrganization} placeholder="ชื่อหน่วยงานหรือบริษัทของคุณ" maxLength={200} required />
            </div>
          </section>

          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="fixed bottom-6 left-1/2 flex h-12 w-[calc(100%-2rem)] max-w-[380px] -translate-x-1/2 items-center justify-center gap-2 rounded-2xl bg-[#0f8f72] text-sm font-bold text-white shadow-lg disabled:bg-slate-300"
          >
            {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            บันทึกและดำเนินการต่อ
          </button>
        </form>
      </div>
    )
  }

  // --- step 2: ฟอร์มแจ้งเรื่อง ---
  return (
    <div className="min-h-screen bg-[#eef7f3]">
      <PageHeader title="แจ้งเรื่อง (บุคคลภายนอก)" subtitle="เลือกหัวข้อและรายละเอียดปัญหา" />

      <form onSubmit={submitTicket} className="flex flex-col gap-3 px-4 pb-28 pt-3">
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#0f8f72]" />
            <span className="text-sm font-semibold">หัวข้อที่ต้องการแจ้ง</span>
          </div>

          <div className="space-y-3">
            <SelectField
              label="หมวด"
              value={categoryId}
              onChange={value => { setCategoryId(value); setTopicId(''); setSubjectId('') }}
              placeholder="เลือกหมวด"
              options={form.categories.map(c => ({ value: c.id, label: c.name }))}
            />
            <SelectField
              label="หมวดย่อย"
              value={topicId}
              onChange={value => { setTopicId(value); setSubjectId('') }}
              disabled={!categoryId}
              placeholder={!categoryId ? 'เลือกหมวดก่อน' : 'เลือกหมวดย่อย'}
              options={(selectedCategory?.topics ?? []).map(t => ({ value: t.id, label: t.name }))}
            />
            <SelectField
              label="หัวข้อ"
              value={subjectId}
              onChange={handleSubjectChange}
              disabled={!topicId}
              placeholder={!topicId ? 'เลือกหมวดย่อยก่อน' : 'เลือกหัวข้อ'}
              options={(selectedTopic?.subjects ?? []).map(s => ({ value: s.id, label: s.name }))}
            />
            {selectedSubject?.description && (
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">{selectedSubject.description}</p>
            )}
            {selectedSubject && selectedSubject.suggestions.length > 0 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <span className="mb-2 block text-xs font-medium text-emerald-800">รายการแนะนำ</span>
                <div className="flex flex-wrap gap-2">
                  {selectedSubject.suggestions.map(suggestion => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => applySuggestion(suggestion)}
                      className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-medium text-emerald-800"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[#0f8f72]" />
            <span className="text-sm font-semibold">รายละเอียดปัญหา</span>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">รายละเอียด</span>
            <textarea
              value={detail}
              onChange={e => setDetail(e.target.value)}
              placeholder="อธิบายปัญหา สาเหตุเบื้องต้น หรือสิ่งที่ต้องการให้ตรวจสอบ"
              maxLength={2000}
              rows={5}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0f8f72]"
            />
          </label>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#0f8f72]" />
            <span className="text-sm font-semibold">ข้อมูลเพิ่มเติม</span>
          </div>

          <div className="space-y-3">
            <TextInput label="สถานที่ (ถ้ามี)" value={locationText} onChange={setLocationText} placeholder="สถานที่เกิดเหตุหรือจุดที่ต้องการให้เข้าตรวจสอบ" maxLength={200} />
            <TextInput label="หมายเหตุการติดต่อ (ถ้ามี)" value={contactNote} onChange={setContactNote} placeholder="เช่น สะดวกช่วงเช้า ติดต่อผ่านไลน์" maxLength={500} />
          </div>
        </section>

        <button
          type="submit"
          disabled={!canSubmit || createTicket.isPending}
          className="fixed bottom-6 left-1/2 flex h-12 w-[calc(100%-2rem)] max-w-[380px] -translate-x-1/2 items-center justify-center gap-2 rounded-2xl bg-[#0f8f72] text-sm font-bold text-white shadow-lg disabled:bg-slate-300"
        >
          {createTicket.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          ส่งใบแจ้งเรื่อง
        </button>
      </form>
    </div>
  )
}
