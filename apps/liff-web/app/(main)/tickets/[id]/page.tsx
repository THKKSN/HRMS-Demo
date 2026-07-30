'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  AlertTriangle, CheckCircle2, Clock3, ExternalLink, FileText, Loader2, MapPin,
  ImagePlus, MessageSquare, Paperclip, Play, RefreshCw, Save, Send, Trash2,
  UserRound, Wrench, XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import type { TicketAttachmentDto, TicketProblemType, TicketStatus } from '@hrms/shared-types'
import { PageHeader } from '@/components/layout/page-header'
import {
  useAddTicketAttachment,
  useAddTicketComment,
  useClaimTicket,
  useDeleteTicketAttachment,
  useRequestTicketInfo,
  useRequestTicketCancellation,
  useResolveTicket,
  useResumeTicket,
  useStartTicket,
  useTicket,
  useTicketComments,
  useUpdateTicketWorkDetail,
} from '@/hooks/use-tickets'
import { uploadTicketFile } from '@/lib/upload.api'
import { useProtectedFileUrl } from '@/hooks/use-protected-file-url'
import { TICKET_STATUS_LABEL } from '@/lib/ticket-status'

const problemTypes: { value: TicketProblemType; label: string }[] = [
  { value: 'SystemDefect', label: 'ระบบบกพร่อง' },
  { value: 'Enhancement', label: 'ปรับปรุงเพิ่มเติม' },
  { value: 'Other', label: 'อื่น ๆ' },
]

function apiMessage(error: unknown) {
  const response = (error as {
    response?: { data?: { message?: string; error?: string; errors?: string[]; details?: Array<{ error?: string }> } }
  })?.response?.data
  return response?.details?.[0]?.error ?? response?.errors?.[0] ?? response?.message
    ?? response?.error ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่'
}

function thaiDate(value?: string) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-border bg-background px-4 py-5">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function isImageAttachment(attachment: TicketAttachmentDto) {
  return attachment.contentType?.startsWith('image/')
    || /\.(?:jpe?g|png|webp|gif)(?:[?#].*)?$/i.test(attachment.url)
}

function AttachmentLink({
  attachment,
  fileName,
}: {
  attachment: TicketAttachmentDto
  fileName: string
}) {
  const url = useProtectedFileUrl(attachment.url)
  if (!url) return <div className="h-24 animate-pulse rounded-md bg-muted" />
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block">
      {isImageAttachment(attachment) ? (
        <div className="aspect-[4/3] overflow-hidden bg-muted">
          <img src={url} alt={fileName} loading="lazy" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="flex min-h-16 items-center gap-3 p-3">
          <FileText className="h-5 w-5 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate text-sm">{fileName}</span>
        </div>
      )}
      <div className="flex items-center gap-2 px-2.5 py-2 text-xs">
        <span className="min-w-0 flex-1 truncate">{fileName}</span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </div>
    </a>
  )
}

function AttachmentList({ attachments }: { attachments: TicketAttachmentDto[] }) {
  if (attachments.length === 0) return <p className="text-sm text-muted-foreground">ไม่มีหลักฐาน</p>
  return (
    <div className="grid grid-cols-2 gap-3">
      {attachments.map((item, index) => {
        const fileName = item.fileName || `หลักฐาน ${index + 1}`
        return (
          <div key={item.id} className={`${isImageAttachment(item) ? '' : 'col-span-full'} min-w-0 overflow-hidden rounded-md border border-border bg-background`}>
            <AttachmentLink attachment={item} fileName={fileName} />
          </div>
        )
      })}
    </div>
  )
}

function EditableEvidenceList({
  attachments,
  busyId,
  onDelete,
  onReplace,
}: {
  attachments: TicketAttachmentDto[]
  busyId?: string
  onDelete: (attachment: TicketAttachmentDto) => void
  onReplace: (attachment: TicketAttachmentDto, file?: File) => void
}) {
  if (attachments.length === 0) {
    return <p className="text-sm text-muted-foreground">ยังไม่มีหลักฐาน</p>
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {attachments.map((item, index) => {
        const fileName = item.fileName || `หลักฐาน ${index + 1}`
        const busy = busyId === item.id
        return (
          <div key={item.id} className="min-w-0 overflow-hidden rounded-md border border-border bg-background">
            <AttachmentLink attachment={item} fileName={fileName} />
            <div className="grid grid-cols-2 border-t border-border">
              <label className="flex h-9 cursor-pointer items-center justify-center gap-1.5 border-r border-border text-xs font-medium text-primary">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                เปลี่ยน
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  disabled={busy}
                  onChange={event => {
                    onReplace(item, event.target.files?.[0])
                    event.target.value = ''
                  }}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => onDelete(item)}
                className="flex h-9 items-center justify-center gap-1.5 text-xs font-medium text-destructive disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> ลบ
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function TicketWorkDetailPage() {
  const { id } = useParams<{ id: string }>()
  const ticketQuery = useTicket(id)
  const commentsQuery = useTicketComments(id)
  const startWork = useStartTicket(id)
  const claimWork = useClaimTicket(id)
  const saveWork = useUpdateTicketWorkDetail(id)
  const requestInfo = useRequestTicketInfo(id)
  const requestCancellation = useRequestTicketCancellation(id)
  const resumeWork = useResumeTicket(id)
  const resolveWork = useResolveTicket(id)
  const addComment = useAddTicketComment(id)
  const addAttachment = useAddTicketAttachment(id)
  const deleteAttachment = useDeleteTicketAttachment(id)
  const [problemType, setProblemType] = useState<TicketProblemType | ''>('')
  const [inspection, setInspection] = useState('')
  const [resolution, setResolution] = useState('')
  const [comment, setComment] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [showInfo, setShowInfo] = useState(false)
  const [showCancellation, setShowCancellation] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')
  const [uploadingStage, setUploadingStage] = useState<'Progress' | 'Resolved'>()
  const [editingAttachmentId, setEditingAttachmentId] = useState<string>()
  const ticket = ticketQuery.data

  useEffect(() => {
    if (!ticket) return
    setProblemType(ticket.problemType ?? '')
    setInspection(ticket.initialInspectionNote ?? '')
    setResolution(ticket.resolutionNote ?? '')
  }, [ticket?.id, ticket?.updatedAt])

  async function run(action: () => Promise<unknown>, message: string) {
    try {
      await action()
      toast.success(message)
    } catch (error) {
      toast.error(apiMessage(error))
    }
  }

  async function saveDetails() {
    if (!ticket) return
    await run(() => saveWork.mutateAsync({
      problemType: problemType || undefined,
      initialInspectionNote: inspection.trim() || undefined,
      resolutionNote: resolution.trim() || undefined,
      expectedUpdatedAt: ticket.updatedAt,
    }), 'บันทึกข้อมูลการทำงานแล้ว')
  }

  async function startTicket() {
    if (!ticket) return
    try {
      const saved = await saveWork.mutateAsync({
        problemType: problemType || undefined,
        initialInspectionNote: inspection.trim() || undefined,
        expectedUpdatedAt: ticket.updatedAt,
      })
      await startWork.mutateAsync(saved.updatedAt)
      toast.success('เริ่มดำเนินการแล้ว')
    } catch (error) {
      toast.error(apiMessage(error))
    }
  }

  async function submitResolution() {
    if (!ticket) return
    if (!problemType) return toast.error('กรุณาระบุประเภทปัญหา')
    if (!resolution.trim()) return toast.error('กรุณาระบุรายละเอียดการแก้ไข')
    if (!ticket.attachments.some(item => item.stage === 'Resolved')) {
      return toast.error('กรุณาแนบหลักฐานหลังแก้ไขอย่างน้อย 1 ไฟล์')
    }

    try {
      const saved = await saveWork.mutateAsync({
        problemType,
        initialInspectionNote: inspection.trim() || undefined,
        resolutionNote: resolution.trim(),
        expectedUpdatedAt: ticket.updatedAt,
      })
      await resolveWork.mutateAsync(saved.updatedAt)
      toast.success('ส่งงานให้ตรวจแล้ว')
    } catch (error) {
      toast.error(apiMessage(error))
    }
  }

  async function submitInfoRequest() {
    if (!ticket || !infoMessage.trim()) return toast.error('กรุณาระบุข้อมูลที่ต้องการ')
    await run(async () => {
      await requestInfo.mutateAsync({ message: infoMessage.trim(), expectedUpdatedAt: ticket.updatedAt })
      setInfoMessage('')
      setShowInfo(false)
    }, 'ส่งคำขอข้อมูลแล้ว')
  }

  async function submitCancellationRequest() {
    if (!ticket) return
    if (cancellationReason.trim().length < 10) {
      return toast.error('กรุณาระบุเหตุผลอย่างน้อย 10 ตัวอักษร')
    }
    await run(async () => {
      await requestCancellation.mutateAsync({
        reason: cancellationReason.trim(),
        expectedUpdatedAt: ticket.updatedAt,
      })
      setCancellationReason('')
      setShowCancellation(false)
    }, 'ส่งคำขอยกเลิกแล้ว')
  }

  async function submitComment() {
    if (!comment.trim()) return
    await run(async () => {
      await addComment.mutateAsync({ message: comment.trim(), commentType: 'General' })
      setComment('')
    }, 'ส่งข้อความแล้ว')
  }

  async function uploadEvidence(stage: 'Progress' | 'Resolved', file?: File) {
    if (!file) return
    setUploadingStage(stage)
    try {
      const uploaded = await uploadTicketFile(file)
      await addAttachment.mutateAsync({ ...uploaded, stage })
      toast.success('เพิ่มหลักฐานแล้ว')
    } catch (error) {
      toast.error(apiMessage(error))
    } finally {
      setUploadingStage(undefined)
    }
  }

  async function deleteEvidence(attachment: TicketAttachmentDto) {
    if (!window.confirm('ลบหลักฐานนี้หรือไม่')) return
    setEditingAttachmentId(attachment.id)
    try {
      await deleteAttachment.mutateAsync(attachment.id)
      toast.success('ลบหลักฐานแล้ว')
    } catch (error) {
      toast.error(apiMessage(error))
    } finally {
      setEditingAttachmentId(undefined)
    }
  }

  async function replaceEvidence(attachment: TicketAttachmentDto, file?: File) {
    if (!file || (attachment.stage !== 'Progress' && attachment.stage !== 'Resolved')) return
    setEditingAttachmentId(attachment.id)
    try {
      const uploaded = await uploadTicketFile(file)
      await addAttachment.mutateAsync({ ...uploaded, stage: attachment.stage })
      await deleteAttachment.mutateAsync(attachment.id)
      toast.success('เปลี่ยนหลักฐานแล้ว')
    } catch (error) {
      toast.error(apiMessage(error))
    } finally {
      setEditingAttachmentId(undefined)
    }
  }

  if (ticketQuery.isLoading) {
    return <div className="p-4"><div className="h-64 animate-pulse rounded-lg bg-muted" /></div>
  }
  if (!ticket) {
    return <div className="p-6 text-center text-sm text-destructive">ไม่พบ Ticket หรือไม่มีสิทธิ์เข้าถึง</div>
  }

  const createdEvidence = ticket.attachments.filter(a => a.stage === 'Created')
  const progressEvidence = ticket.attachments.filter(a => a.stage === 'Progress')
  const resolvedEvidence = ticket.attachments.filter(a => a.stage === 'Resolved')
  const showAfterWork = ticket.status !== 'Assigned' || !!ticket.resolutionNote || resolvedEvidence.length > 0
  const isBusy = startWork.isPending || resumeWork.isPending || resolveWork.isPending
    || saveWork.isPending || !!uploadingStage || !!editingAttachmentId

  return (
    <div className="min-h-screen bg-muted/30 pb-36">
      <PageHeader title={ticket.ticketNo} subtitle={TICKET_STATUS_LABEL[ticket.status]}/>

      <div className="border-b border-border bg-background px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base font-semibold">{ticket.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground">{ticket.categoryName} / {ticket.topicName}</p>
          </div>
          <span className="shrink-0 rounded bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
            {TICKET_STATUS_LABEL[ticket.status]}
          </span>
        </div>
      </div>

      {ticket.actions.isRequester && ticket.latestCancellationRequest?.status === 'Pending' && (
        <div className="flex gap-3 border-b border-amber-200 bg-amber-50 px-4 py-4 text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">กำลังรอพิจารณาคำขอยกเลิก</p>
            <p className="mt-1 text-xs leading-5">{ticket.latestCancellationRequest.reason}</p>
            <p className="mt-1 text-[11px] text-amber-700">
              ส่งเมื่อ {thaiDate(ticket.latestCancellationRequest.requestedAt)}
            </p>
          </div>
        </div>
      )}

      {ticket.actions.isRequester && ticket.latestCancellationRequest?.status === 'Rejected' && (
        <div className="flex gap-3 border-b border-red-200 bg-red-50 px-4 py-4 text-red-900">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">คำขอยกเลิกไม่ได้รับอนุมัติ</p>
            <p className="mt-1 text-xs leading-5">
              {ticket.latestCancellationRequest.reviewNote ?? 'ไม่ระบุเหตุผล'}
            </p>
          </div>
        </div>
      )}

      {ticket.actions.isRequester && ticket.status === 'Cancelled' && (
        <div className="flex gap-3 border-b border-zinc-200 bg-zinc-100 px-4 py-4 text-zinc-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">ใบแจ้งเรื่องนี้ถูกยกเลิกแล้ว</p>
            <p className="mt-1 text-xs leading-5">{ticket.cancellationReason ?? '-'}</p>
            <p className="mt-1 text-[11px] text-zinc-600">
              อนุมัติโดย {ticket.cancelledByEmployeeName ?? 'ผู้รับผิดชอบ'} · {thaiDate(ticket.cancelledAt)}
            </p>
          </div>
        </div>
      )}

      {ticket.actions.canRequestCancellation && (
        <div className="border-b border-border bg-background px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">ต้องการยกเลิกเรื่องนี้?</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                ผู้รับผิดชอบจะเป็นผู้พิจารณาคำขอ
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCancellation(true)}
              className="h-9 shrink-0 rounded-md border border-destructive px-3 text-xs font-semibold text-destructive"
            >
              ขอยกเลิก
            </button>
          </div>
        </div>
      )}

      <Section title="รายละเอียดปัญหา">
        <p className="whitespace-pre-wrap text-sm leading-6">{ticket.detail}</p>
        <div className="mt-4 space-y-2 text-xs text-muted-foreground">
          <p className="flex items-center gap-2"><UserRound className="h-4 w-4" />ผู้แจ้ง {ticket.requesterName}</p>
          {(ticket.locationText || ticket.vehicleText) && (
            <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{[ticket.locationText, ticket.vehicleText].filter(Boolean).join(' · ')}</p>
          )}
          <p className="flex items-center gap-2"><Clock3 className="h-4 w-4" />เปิดเรื่อง {thaiDate(ticket.createdAt)}</p>
        </div>
        <div className="mt-4"><AttachmentList attachments={createdEvidence} /></div>
      </Section>

      {ticket.currentAssignment && (
        <Section title="การมอบหมาย">
          <p className="text-sm font-medium">{ticket.currentAssignment.assignedToEmployeeName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {ticket.currentAssignment.assignmentSource === 'Manual'
              ? `มอบหมายโดย ${ticket.currentAssignment.assignedByEmployeeName ?? 'Supervisor'}`
              : ticket.currentAssignment.assignmentSource === 'SelfClaim'
                ? 'ผู้รับผิดชอบรับงานจาก Routing'
              : `ระบบมอบหมายอัตโนมัติจาก${ticket.currentAssignment.assignmentSource === 'AutoTopic' ? 'หัวข้อ' : 'หมวด'}`}
            {' · '}{thaiDate(ticket.currentAssignment.assignedAt)}
          </p>
          {ticket.currentAssignment.note && <p className="mt-3 rounded-md bg-muted p-3 text-sm">{ticket.currentAssignment.note}</p>}
        </Section>
      )}

      {(ticket.actions.canEditWorkDetail || ticket.problemType || ticket.initialInspectionNote || ticket.resolutionNote) && (
        <Section title="บันทึกการดำเนินงาน">
          <div className="space-y-5">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-primary text-xs font-semibold text-primary-foreground">1</span>
                <h3 className="text-sm font-semibold">ก่อนเริ่มงาน</h3>
              </div>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">ประเภทปัญหา</span>
                <select
                  value={problemType}
                  disabled={!ticket.actions.canEditWorkDetail}
                  onChange={event => setProblemType(event.target.value as TicketProblemType | '')}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 outline-none focus:border-primary disabled:bg-muted"
                >
                  <option value="">เลือกประเภทปัญหา</option>
                  {problemTypes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">ผลตรวจเบื้องต้น</span>
                <textarea rows={4} maxLength={2000} disabled={!ticket.actions.canEditWorkDetail} value={inspection} onChange={event => setInspection(event.target.value)} className="w-full resize-none rounded-md border border-border bg-background p-3 outline-none focus:border-primary disabled:bg-muted" />
              </label>
              <div>
                <p className="mb-2 text-sm font-medium">รูปก่อนทำ</p>
                {ticket.actions.canAddWorkAttachment ? (
                  <EditableEvidenceList
                    attachments={progressEvidence}
                    busyId={editingAttachmentId}
                    onDelete={deleteEvidence}
                    onReplace={replaceEvidence}
                  />
                ) : (
                  <AttachmentList attachments={progressEvidence} />
                )}
                {ticket.actions.canAddWorkAttachment && (
                  <label className="mt-3 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-primary text-sm font-semibold text-primary">
                    {uploadingStage === 'Progress'
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : progressEvidence.length > 0
                        ? <ImagePlus className="h-4 w-4" />
                        : <Paperclip className="h-4 w-4" />}
                    {uploadingStage === 'Progress' ? 'กำลังอัปโหลด' : progressEvidence.length > 0 ? 'เพิ่มรูปก่อนทำ' : 'แนบรูปก่อนทำ'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      disabled={!!uploadingStage}
                      onChange={event => {
                        uploadEvidence('Progress', event.target.files?.[0])
                        event.target.value = ''
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {showAfterWork && <div className="space-y-4 border-t border-border pt-5">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-green-600 text-xs font-semibold text-white">2</span>
                <h3 className="text-sm font-semibold">หลังทำงาน</h3>
              </div>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">รายละเอียดการแก้ไข</span>
                <textarea rows={5} maxLength={2000} disabled={!ticket.actions.canEditWorkDetail} value={resolution} onChange={event => setResolution(event.target.value)} className="w-full resize-none rounded-md border border-border bg-background p-3 outline-none focus:border-primary disabled:bg-muted" />
              </label>
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">รูปหลังทำ</p>
                  {ticket.actions.canEditWorkDetail && <span className="text-xs text-destructive">จำเป็นก่อนส่งตรวจ</span>}
                </div>
                {ticket.actions.canAddWorkAttachment ? (
                  <EditableEvidenceList
                    attachments={resolvedEvidence}
                    busyId={editingAttachmentId}
                    onDelete={deleteEvidence}
                    onReplace={replaceEvidence}
                  />
                ) : (
                  <AttachmentList attachments={resolvedEvidence} />
                )}
                {ticket.actions.canAddWorkAttachment && (
                  <label className="mt-3 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-primary text-sm font-semibold text-primary">
                    {uploadingStage === 'Resolved'
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : resolvedEvidence.length > 0
                        ? <ImagePlus className="h-4 w-4" />
                        : <Paperclip className="h-4 w-4" />}
                    {uploadingStage === 'Resolved' ? 'กำลังอัปโหลด' : resolvedEvidence.length > 0 ? 'เพิ่มรูปหลังทำ' : 'แนบรูปหลังทำ'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      disabled={!!uploadingStage}
                      onChange={event => {
                        uploadEvidence('Resolved', event.target.files?.[0])
                        event.target.value = ''
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>}

            {ticket.actions.canEditWorkDetail && (
              <button type="button" disabled={isBusy} onClick={saveDetails} className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-primary text-sm font-semibold text-primary disabled:opacity-50">
                {saveWork.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} บันทึกแบบร่าง
              </button>
            )}
          </div>
        </Section>
      )}

      <Section title="ข้อความ">
        <div className="space-y-3">
          {(commentsQuery.data?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีข้อความ</p>}
          {commentsQuery.data?.map(item => (
            <div key={item.id} className={`rounded-md p-3 text-sm ${item.commentType === 'RequestInfo' ? 'border border-amber-200 bg-amber-50' : 'bg-muted'}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold">{item.employeeName}</p>
                <p className="text-[10px] text-muted-foreground">{thaiDate(item.createdAt)}</p>
              </div>
              <p className="mt-1 whitespace-pre-wrap leading-5">{item.message}</p>
            </div>
          ))}
          {ticket.actions.canComment && (
            <div className="flex items-end gap-2">
              <textarea rows={2} maxLength={2000} value={comment} onChange={event => setComment(event.target.value)} placeholder="พิมพ์ข้อความ" className="min-h-11 flex-1 resize-none rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-primary" />
              <button type="button" title="ส่งข้อความ" disabled={!comment.trim() || addComment.isPending} onClick={submitComment} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-50">
                <Send className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </Section>

      {showInfo && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/40" onClick={() => setShowInfo(false)}>
          <div className="mx-auto w-full max-w-107.5 rounded-t-lg bg-background p-4" onClick={event => event.stopPropagation()}>
            <h2 className="text-base font-semibold">ขอข้อมูลเพิ่มจากผู้แจ้ง</h2>
            <textarea autoFocus rows={5} maxLength={2000} value={infoMessage} onChange={event => setInfoMessage(event.target.value)} className="mt-3 w-full resize-none rounded-md border border-border p-3 text-sm outline-none focus:border-primary" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setShowInfo(false)} className="h-10 rounded-md border border-border text-sm font-semibold">ยกเลิก</button>
              <button type="button" disabled={requestInfo.isPending} onClick={submitInfoRequest} className="h-10 rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50">ส่งคำขอ</button>
            </div>
          </div>
        </div>
      )}

      {showCancellation && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/40" onClick={() => setShowCancellation(false)}>
          <div className="mx-auto w-full max-w-107.5 rounded-t-lg bg-background p-4" onClick={event => event.stopPropagation()}>
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <h2 className="text-base font-semibold">ส่งคำขอยกเลิก</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Ticket จะยังดำเนินการตามปกติจนกว่า Supervisor จะอนุมัติ
                </p>
              </div>
            </div>
            <label className="mt-4 block text-sm font-medium">
              เหตุผลที่ต้องการยกเลิก
              <textarea
                autoFocus
                rows={5}
                maxLength={1000}
                value={cancellationReason}
                onChange={event => setCancellationReason(event.target.value)}
                placeholder="ระบุเหตุผลอย่างน้อย 10 ตัวอักษร"
                className="mt-2 w-full resize-none rounded-md border border-border p-3 text-sm outline-none focus:border-primary"
              />
            </label>
            <p className="mt-1 text-right text-[11px] text-muted-foreground">
              {cancellationReason.length}/1000
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={requestCancellation.isPending}
                onClick={() => setShowCancellation(false)}
                className="h-10 rounded-md border border-border text-sm font-semibold"
              >
                กลับ
              </button>
              <button
                type="button"
                disabled={requestCancellation.isPending || cancellationReason.trim().length < 10}
                onClick={submitCancellationRequest}
                className="flex h-10 items-center justify-center gap-2 rounded-md bg-destructive text-sm font-semibold text-white disabled:opacity-50"
              >
                {requestCancellation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                ยืนยันส่งคำขอ
              </button>
            </div>
          </div>
        </div>
      )}

      {(ticket.actions.canClaim || ticket.actions.canStart || ticket.actions.canResume || ticket.actions.canRequestInfo || ticket.actions.canResolve) && (
        <div className="fixed bottom-16 left-1/2 z-20 w-full max-w-107.5 -translate-x-1/2 border-t border-border bg-background p-3">
          <div className="flex gap-2">
            {ticket.actions.canClaim && (
              <button type="button" disabled={claimWork.isPending} onClick={() => run(() => claimWork.mutateAsync(ticket.updatedAt), 'รับงานนี้แล้ว')} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50">
                {claimWork.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                รับงานนี้
              </button>
            )}
            {ticket.actions.canRequestInfo && (
              <button type="button" onClick={() => setShowInfo(true)} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-border text-sm font-semibold">
                <MessageSquare className="h-4 w-4" /> ขอข้อมูล
              </button>
            )}
            {ticket.actions.canStart && (
              <button type="button" disabled={isBusy} onClick={startTicket} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50">
                {startWork.isPending || saveWork.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Play className="h-4 w-4" />}
                เริ่มงาน
              </button>
            )}
            {ticket.actions.canResume && (
              <button type="button" disabled={isBusy} onClick={() => run(() => resumeWork.mutateAsync(ticket.updatedAt), 'กลับมาดำเนินการแล้ว')} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50">
                <Wrench className="h-4 w-4" /> ดำเนินการต่อ
              </button>
            )}
            {ticket.actions.canResolve && (
              <button type="button" disabled={isBusy} onClick={submitResolution} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-green-600 text-sm font-semibold text-white disabled:opacity-50">
                {resolveWork.isPending || saveWork.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <CheckCircle2 className="h-4 w-4" />}
                ส่งงานให้ตรวจ
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
