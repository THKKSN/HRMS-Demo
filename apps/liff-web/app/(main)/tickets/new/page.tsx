'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, AlertTriangle, ChevronLeft, FileText, ImagePlus, Loader2, MapPin, Paperclip, Send, X } from 'lucide-react'
import {
  applyTicketGuidanceSuggestion,
  applyTicketGuidanceTemplate,
  resolveTicketSubjectGuidance,
  type ResolvedTicketSubjectGuidance,
  type TicketPriority,
} from '@hrms/shared-types'
import {
  useCreateTicket,
  useTicketCategories,
  useTicketCompanies,
  useTicketDepartments,
  useResolvedTicketSubjectGuidance,
  useTicketSubjects,
  useTicketTopics,
} from '@/hooks/use-tickets'
import { uploadTicketAttachment } from '@/lib/upload.api'
import { useProfile } from '@/hooks/use-profile'

const MAX_FILES = 5
const MAX_SIZE = 10 * 1024 * 1024

// บริษัทปลายทางคงที่ของระบบแจ้งเรื่อง — ทุกใบส่งเข้าบริษัทนี้เสมอ ไม่ว่าผู้แจ้งอยู่บริษัทไหน
// ถ้าไม่ตั้ง env จะ fallback เป็นบริษัทของผู้แจ้งเอง (ใช้ตอน dev / e2e)
const FIXED_TICKET_COMPANY_ID = process.env.NEXT_PUBLIC_TICKET_COMPANY_ID ?? ''

const PRIORITIES: { value: TicketPriority; label: string; tone: string }[] = [
  { value: 'Low', label: 'ปกติ', tone: 'border-slate-200 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200' },
  { value: 'Medium', label: 'กลาง', tone: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-950/60 dark:text-sky-200' },
  { value: 'High', label: 'ด่วน', tone: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-200' },
  { value: 'Critical', label: 'ด่วนมาก', tone: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-950/60 dark:text-red-200' },
]

function PendingTicketFileItem({
  file,
  onRemove,
}: {
  file: File
  onRemove: () => void
}) {
  const previewUrl = useMemo(
    () => file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    [file]
  )

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
      {previewUrl ? (
        <img src={previewUrl} alt={file.name} className="h-12 w-12 shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 dark:bg-slate-900 dark:text-slate-500">
          <Paperclip className="h-4 w-4" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.name}</p>
        <p className="text-xs text-muted-foreground">{Math.ceil(file.size / 1024)} KB</p>
      </div>
      <button type="button" onClick={onRemove} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 dark:text-slate-400">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export default function NewTicketPage() {
  const { data: profile } = useProfile()
  const { data: companies, isLoading: companiesLoading } = useTicketCompanies()
  const { mutateAsync: createTicket } = useCreateTicket()

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
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{
    id: string
    ticketNo: string
    status: string
    routingOutcome: 'NotEvaluated' | 'NoMatch' | 'SupervisorQueue' | 'AutoAssigned'
    assigneeName?: string
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { data: departments, isLoading: departmentsLoading } = useTicketDepartments(companyId)
  const { data: categories, isLoading: categoriesLoading } = useTicketCategories({ companyId, departmentId })
  const { data: topics, isLoading: topicsLoading } = useTicketTopics({ companyId, departmentId, categoryId })
  const { data: subjects, isLoading: subjectsLoading } = useTicketSubjects({ companyId, departmentId, categoryId, topicId })
  const { data: resolvedSubjectGuidance } = useResolvedTicketSubjectGuidance({ companyId, departmentId, categoryId, topicId, subjectId })

  const selectedCompany = companies?.find(c => c.id === companyId)
  const selectedDepartment = departments?.find(d => d.id === departmentId)
  const selectedCategory = categories?.find(c => c.id === categoryId)
  const selectedTopic = topics?.find(t => t.id === topicId)
  const selectedSubject = subjects?.find(s => s.id === subjectId)
  const requiresOtherTopic = selectedSubject?.name.trim() === 'อื่น ๆ'
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

  const defaultPhone = profile?.phone ?? ''
  const displayPhone = contactPhone || defaultPhone

  const canSubmit = useMemo(
    () => !!companyId && !!departmentId && !!categoryId && !!topicId && !!subjectId
      && (!requiresOtherTopic || otherTopicText.trim().length > 0)
      && detail.trim().length > 0,
    [companyId, departmentId, categoryId, topicId, subjectId, requiresOtherTopic, otherTopicText, detail]
  )

  useEffect(() => {
    if (!subjectGuidance) return
    setDetail(currentDetail => applyTicketGuidanceTemplate(currentDetail, subjectGuidance))
  }, [subjectGuidance])

  // เลือก CompanyId ให้อัตโนมัติ ไม่ต้องให้ผู้แจ้งเลือกเอง
  // ห้าม fallback เป็น companies[0] เพราะ lookup คืนหลายบริษัท จะได้บริษัทผิด
  useEffect(() => {
    const targetCompanyId = FIXED_TICKET_COMPANY_ID || profile?.companyId
    if (!companies?.length || !targetCompanyId) return
    const autoCompanyId = companies.find(c => c.id === targetCompanyId)?.id
    if (!autoCompanyId || autoCompanyId === companyId) return
    setCompanyId(autoCompanyId)
    setDepartmentId('')
    setCategoryId('')
    setTopicId('')
    setSubjectId('')
    setOtherTopicText('')
  }, [companies, companyId, profile?.companyId])

  function resetAfterDepartmentChange(nextDepartmentId: string) {
    setDepartmentId(nextDepartmentId)
    setCategoryId('')
    setTopicId('')
    setSubjectId('')
    setOtherTopicText('')
  }

  function resetAfterCategoryChange(nextCategoryId: string) {
    setCategoryId(nextCategoryId)
    setTopicId('')
    setSubjectId('')
    setOtherTopicText('')
  }

  function handleTopicChange(nextTopicId: string) {
    setTopicId(nextTopicId)
    setSubjectId('')
    setOtherTopicText('')
  }

  function handleSubjectChange(nextSubjectId: string) {
    setSubjectId(nextSubjectId)
    setOtherTopicText('')
  }

  function handleDetailSuggestionSelect(suggestion: NonNullable<typeof subjectGuidance>['suggestions'][number]) {
    if (!subjectGuidance) return
    setDetail(currentDetail => applyTicketGuidanceSuggestion(currentDetail, suggestion, subjectGuidance))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files ?? [])
    e.target.value = ''

    const tooBig = incoming.filter(f => f.size > MAX_SIZE)
    if (tooBig.length) {
      setError(`ไฟล์ใหญ่เกิน 10 MB: ${tooBig.map(f => f.name).join(', ')}`)
      return
    }

    setFiles(prev => {
      const existing = new Set(prev.map(f => `${f.name}:${f.size}`))
      const next = [...prev, ...incoming.filter(f => !existing.has(`${f.name}:${f.size}`))]
      if (next.length > MAX_FILES) {
        setError(`แนบไฟล์ได้สูงสุด ${MAX_FILES} ไฟล์`)
        return next.slice(0, MAX_FILES)
      }
      setError(null)
      return next
    })
  }

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSubmit || submitting) return

    setError(null)
    setSubmitting(true)

    try {
      const attachmentUrls = files.length > 0
        ? await Promise.all(files.map(file => uploadTicketAttachment(file)))
        : undefined

      const result = await createTicket({
        requestType: 'Internal',
        targetCompanyId: companyId,
        targetDepartmentId: departmentId,
        categoryId,
        topicId,
        subjectId,
        otherTopicText: requiresOtherTopic ? otherTopicText.trim() : undefined,
        detail: detail.trim(),
        priority,
        contactPhone: displayPhone.trim() || undefined,
        contactNote: contactNote.trim() || undefined,
        attachmentUrls,
      })

      setCreated({
        id: result.id,
        ticketNo: result.ticketNo,
        status: result.status,
        routingOutcome: result.routingResult.outcome,
        assigneeName: result.routingResult.assigneeName,
      })
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; errors?: string[]; error?: string } } })?.response?.data
      setError(data?.message ?? data?.errors?.[0] ?? data?.error ?? 'ไม่สามารถส่งใบแจ้งเรื่องได้ กรุณาลองใหม่')
    } finally {
      setSubmitting(false)
    }
  }

  if (created) {
    return (
      <div className="min-h-screen bg-[#eef7f3] dark:bg-slate-950">
        <div className="bg-[#0f8f72] px-4 pb-6 pt-4 text-white">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold">ส่งใบแจ้งเรื่องแล้ว</h1>
              <p className="text-xs text-white/75">ระบบรับเรื่องเรียบร้อย</p>
            </div>
          </div>
        </div>

        <div className="px-4 pt-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
            <p className="text-sm text-muted-foreground">เลขที่ใบแจ้ง</p>
            <p className="mt-1 text-2xl font-bold text-[#0f8f72] dark:text-emerald-400">{created.ticketNo}</p>
            <div className="mt-4 space-y-2 text-sm">
              <p><span className="text-muted-foreground">บริษัทผู้รับ:</span> {selectedCompany?.name}</p>
              <p><span className="text-muted-foreground">แผนกผู้รับ:</span> {selectedDepartment?.name}</p>
              <p><span className="text-muted-foreground">หมวด:</span> {selectedCategory?.name} / {selectedTopic?.name}</p>
              <p>
                <span className="text-muted-foreground">หัวข้อ:</span> {selectedSubject?.name}
                {requiresOtherTopic && `: ${otherTopicText}`}
              </p>
              <p><span className="text-muted-foreground">สถานะ:</span> {created.status === 'Assigned' ? 'มอบหมายแล้ว' : 'รอ Supervisor รับเรื่อง'}</p>
              {created.routingOutcome === 'AutoAssigned' && (
                <p><span className="text-muted-foreground">ผู้รับผิดชอบ:</span> {created.assigneeName} (มอบหมายอัตโนมัติ)</p>
              )}
              {created.routingOutcome === 'SupervisorQueue' && (
                <p className="text-amber-700 dark:text-amber-300">พบผู้รับผิดชอบหลายคน กำลังรอ Supervisor มอบหมาย</p>
              )}
            </div>
            <div className="mt-5 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">ส่งเรื่องแล้ว การยกเลิกต้องได้รับอนุมัติ</p>
                <p className="mt-1 text-xs leading-5">
                  คุณสามารถส่งคำขอยกเลิกจากหน้ารายละเอียด ระบบจะส่งให้แผนก {selectedDepartment?.name} พิจารณา
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Link href={`/tickets/${created.id}`} className="flex h-11 items-center justify-center rounded-xl bg-[#0f8f72] text-sm font-semibold text-white">
                ดูรายละเอียด
              </Link>
              <Link href="/tickets/my" className="flex h-11 items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold dark:border-slate-600 dark:text-slate-100">
                ดูเรื่องทั้งหมด
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#eef7f3] dark:bg-slate-950">
      <div className="bg-[#0f8f72] px-4 pb-5 pt-4 text-white">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">แจ้งเรื่อง</h1>
            <p className="text-xs text-white/75">เลือกปลายทางและรายละเอียดปัญหา</p>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3 px-4 pb-28 pt-3">
        {error && (
          <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-950/60 dark:text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#0f8f72]" />
            <span className="text-sm font-semibold">ปลายทาง</span>
          </div>

          <div className="space-y-3">
            <ReadOnlyField
              label="บริษัท"
              value={
                companiesLoading || !profile
                  ? 'กำลังโหลดบริษัท...'
                  : selectedCompany?.name ?? 'ไม่พบบริษัทปลายทางในระบบแจ้งเรื่อง'
              }
            />

            <SelectField
              label="แผนก"
              value={departmentId}
              onChange={resetAfterDepartmentChange}
              disabled={!companyId || departmentsLoading}
              placeholder={!companyId ? 'กำลังเตรียมข้อมูลบริษัท...' : departmentsLoading ? 'กำลังโหลดแผนก...' : 'เลือกแผนก'}
              options={(departments ?? []).map(d => ({ value: d.id, label: d.name }))}
            />

            <SelectField
              label="หมวด"
              value={categoryId}
              onChange={resetAfterCategoryChange}
              disabled={!departmentId || categoriesLoading}
              placeholder={!departmentId ? 'เลือกแผนกก่อน' : categoriesLoading ? 'กำลังโหลดหมวด...' : 'เลือกหมวด'}
              options={(categories ?? []).map(c => ({ value: c.id, label: c.name }))}
            />

            <SelectField
              label="หมวดย่อย"
              value={topicId}
              onChange={handleTopicChange}
              disabled={!categoryId || topicsLoading}
              placeholder={!categoryId ? 'เลือกหมวดก่อน' : topicsLoading ? 'กำลังโหลดหมวดย่อย...' : 'เลือกหมวดย่อย'}
              options={(topics ?? []).map(t => ({ value: t.id, label: t.name }))}
            />

            <SelectField
              label="หัวข้อ"
              value={subjectId}
              onChange={handleSubjectChange}
              disabled={!topicId || subjectsLoading}
              placeholder={!topicId ? 'เลือกหมวดย่อยก่อน' : subjectsLoading ? 'กำลังโหลดหัวข้อ...' : 'เลือกหัวข้อ'}
              options={(subjects ?? []).map(s => ({ value: s.id, label: s.name }))}
            />

            {requiresOtherTopic && (
              <TextInput
                label="ระบุหัวข้ออื่น ๆ"
                value={otherTopicText}
                onChange={setOtherTopicText}
                placeholder="ระบุเรื่องหรืออุปกรณ์ที่ต้องการแจ้ง"
                maxLength={200}
              />
            )}

            {subjectGuidance && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/40 dark:bg-emerald-950/60">
                <span className="mb-2 block text-xs font-medium text-emerald-800 dark:text-emerald-200">รายการแนะนำ</span>
                <div className="flex flex-wrap gap-2">
                  {subjectGuidance.suggestions.map(suggestion => (
                    <button
                      key={suggestion.label}
                      type="button"
                      onClick={() => handleDetailSuggestionSelect(suggestion)}
                      className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-900/60 dark:text-emerald-200"
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[#0f8f72]" />
            <span className="text-sm font-semibold">รายละเอียดปัญหา</span>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">รายละเอียด</span>
              <textarea
                value={detail}
                onChange={e => setDetail(e.target.value)}
                placeholder={subjectGuidance ? subjectGuidance.template : 'อธิบายปัญหา สาเหตุเบื้องต้น หรือสิ่งที่ต้องการให้ตรวจสอบ'}
                maxLength={2000}
                rows={5}
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0f8f72] dark:border-slate-600 dark:bg-slate-800"
              />
            </label>

            {subjectGuidance && (
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                ระบบจะเติม template ตามหัวข้อที่ตั้งค่าไว้ และคุณยังแก้ข้อความเพิ่มเติมได้ตามปกติ
              </p>
            )}

            <div>
              <span className="mb-2 block text-xs font-medium text-muted-foreground">ความเร่งด่วน</span>
              <div className="grid grid-cols-4 gap-2">
                {PRIORITIES.map(item => {
                  const active = priority === item.value
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setPriority(item.value)}
                      className={`h-10 rounded-xl border text-xs font-semibold ${active ? item.tone : 'border-slate-200 bg-white text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#0f8f72]" />
            <span className="text-sm font-semibold">ข้อมูลเพิ่มเติม</span>
          </div>

          <div className="space-y-3">
            <TextInput label="เบอร์ติดต่อ" value={displayPhone} onChange={setContactPhone} placeholder="เบอร์ติดต่อกลับ" maxLength={30} />
            <TextInput label="หมายเหตุการติดต่อ" value={contactNote} onChange={setContactNote} placeholder="เช่น สะดวกช่วงเช้า รถอยู่ที่อู่" maxLength={500} />
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-[#0f8f72]" />
            <span className="text-sm font-semibold">หลักฐาน</span>
            <span className="ml-auto text-xs text-muted-foreground">{files.length}/{MAX_FILES}</span>
          </div>

          <label className="flex h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <ImagePlus className="mb-1 h-5 w-5" />
            แนบรูป / PDF
            <input type="file" multiple className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
          </label>

          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((file, idx) => (
                <PendingTicketFileItem
                  key={`${file.name}-${file.size}-${file.lastModified}`}
                  file={file}
                  onRemove={() => removeFile(idx)}
                />
              ))}
            </div>
          )}
        </section>

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="fixed bottom-20 left-1/2 flex h-12 w-[calc(100%-2rem)] max-w-[380px] -translate-x-1/2 items-center justify-center gap-2 rounded-2xl bg-[#0f8f72] text-sm font-bold text-white shadow-lg disabled:bg-slate-300"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          ส่งใบแจ้งเรื่อง
        </button>
      </form>
    </div>
  )
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
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#0f8f72] disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:disabled:bg-slate-900"
      >
        <option value="">{placeholder}</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex h-11 w-full items-center rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
        {value}
      </div>
    </div>
  )
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  maxLength: number
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#0f8f72] dark:border-slate-600 dark:bg-slate-800"
      />
    </label>
  )
}
