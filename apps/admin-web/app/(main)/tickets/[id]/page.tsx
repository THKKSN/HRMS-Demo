'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  CircleDot,
  ExternalLink,
  FileText,
  History,
  ImagePlus,
  Loader2,
  LockKeyhole,
  MessageSquare,
  Network,
  Pencil,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  UserRoundCheck,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import type {
  TicketAssignmentCandidateDto,
  TicketAttachmentDto,
  TicketDetailDto,
  TicketPriority,
  TicketProblemType,
} from '@hrms/shared-types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import {
  useAcceptTicket,
  useAssignTicket,
  useRejectTicket,
  useReturnTicketForRevision,
  useCloseTicket,
  useTicket,
  useTicketAssignmentCandidates,
  useTicketAssignmentHistory,
  useTicketReviews,
  useTriageTicket,
  useStartTicket,
  useResumeTicket,
  useUpdateTicketWorkDetail,
  useResolveTicket,
  useAddTicketAttachment,
  useDeleteTicketAttachment,
  useTicketComments,
  useAddTicketComment,
  useRequestTicketInfo,
} from '@/hooks/use-tickets'
import { useManagedTicketCategories, useManagedTicketTopics } from '@/hooks/use-ticket-taxonomy'
import { useProtectedFileUrl } from '@/hooks/use-protected-file-url'
import { uploadApi } from '@/lib/upload.api'
import { TICKET_STATUS_LABEL } from '@/lib/ticket-status'

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  Low: 'ปกติ', Medium: 'กลาง', High: 'ด่วน', Critical: 'ด่วนมาก',
}

const PROBLEM_TYPE_LABEL: Record<TicketProblemType, string> = {
  SystemDefect: 'ระบบบกพร่อง',
  Enhancement: 'ปรับปรุงเพิ่มเติม',
  Other: 'อื่น ๆ',
}

function apiMessage(error: unknown) {
  return (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message
    ?? (error as { response?: { data?: { error?: string } } })?.response?.data?.error
    ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่'
}

function thaiDateTime(value?: string) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function eventStation(action: string) {
  const value = action.toLowerCase()
  if (value.includes('reject')) {
    return { Icon: XCircle, station: 'border-red-200 bg-red-50 text-red-700' }
  }
  if (value.includes('close') || value.includes('resolve') || value.includes('approve')) {
    return { Icon: CheckCircle2, station: 'border-green-200 bg-green-50 text-green-700' }
  }
  if (value.includes('return') || value.includes('request-info') || value.includes('waiting')) {
    return { Icon: RotateCcw, station: 'border-amber-200 bg-amber-50 text-amber-700' }
  }
  if (value.includes('start') || value.includes('resume')) {
    return { Icon: Play, station: 'border-cyan-200 bg-cyan-50 text-cyan-700' }
  }
  if (value.includes('assign') || value.includes('claim') || value.includes('accept') || value.includes('routing')) {
    return { Icon: UserRoundCheck, station: 'border-blue-200 bg-blue-50 text-blue-700' }
  }
  return { Icon: CircleDot, station: 'border-border bg-muted text-muted-foreground' }
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 whitespace-pre-wrap text-foreground">{value || '-'}</dd>
    </div>
  )
}

function isImageAttachment(attachment: TicketAttachmentDto) {
  return attachment.contentType?.startsWith('image/')
    || /\.(?:jpe?g|png|webp|gif)(?:[?#].*)?$/i.test(attachment.url)
}

function AttachmentLink({
  attachment,
  fileName,
  list = false,
}: {
  attachment: TicketAttachmentDto
  fileName: string
  list?: boolean
}) {
  const url = useProtectedFileUrl(attachment.url)
  if (!url) return <div className="h-24 animate-pulse rounded-md bg-muted" />
  if (!isImageAttachment(attachment)) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-3 py-3 text-sm hover:text-primary">
        <FileText className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{fileName}</span>
        <ExternalLink className="h-4 w-4 shrink-0" />
      </a>
    )
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="group block min-w-0">
      <div className="aspect-[4/3] overflow-hidden bg-muted">
        <img src={url} alt={fileName} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" />
      </div>
      <div className={`flex items-center gap-2 px-3 py-2 text-xs ${list ? '' : 'border-t border-border'}`}>
        <span className="min-w-0 flex-1 truncate">{fileName}</span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </div>
    </a>
  )
}

function AttachmentList({ attachments }: { attachments: TicketAttachmentDto[] }) {
  if (attachments.length === 0) {
    return <p className="py-6 text-sm text-muted-foreground">ไม่มีไฟล์แนบ</p>
  }

  return (
    <div className="grid grid-cols-2 gap-3 py-3 sm:grid-cols-3 lg:grid-cols-4">
      {attachments.map((attachment, index) => {
        const fileName = attachment.fileName || `ไฟล์แนบ ${index + 1}`
        return (
          <div key={attachment.id} className={`${isImageAttachment(attachment) ? '' : 'col-span-full'} overflow-hidden rounded-md border border-border bg-background`}>
            <AttachmentLink attachment={attachment} fileName={fileName} list />
          </div>
        )
      })}
    </div>
  )
}

function EditableWorkAttachments({
  attachments,
  busyId,
  uploading,
  onAdd,
  onReplace,
  onDelete,
}: {
  attachments: TicketAttachmentDto[]
  busyId?: string
  uploading: boolean
  onAdd: (file?: File) => void
  onReplace: (attachment: TicketAttachmentDto, file?: File) => void
  onDelete: (attachment: TicketAttachmentDto) => void
}) {
  return (
    <div className="space-y-3">
      {attachments.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {attachments.map((attachment, index) => {
            const fileName = attachment.fileName || `หลักฐาน ${index + 1}`
            const busy = busyId === attachment.id
            return (
              <div key={attachment.id} className="min-w-0 overflow-hidden rounded-md border border-border">
                <AttachmentLink attachment={attachment} fileName={fileName} />
                <div className="grid grid-cols-2 border-t border-border">
                  <label className="flex h-9 cursor-pointer items-center justify-center border-r border-border text-xs font-medium text-primary">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'เปลี่ยน'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      disabled={busy}
                      className="hidden"
                      onChange={event => {
                        onReplace(attachment, event.target.files?.[0])
                        event.target.value = ''
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onDelete(attachment)}
                    className="flex h-9 items-center justify-center gap-1 text-xs font-medium text-destructive disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> ลบ
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        {uploading ? 'กำลังอัปโหลด...' : attachments.length > 0 ? 'เพิ่มหลักฐาน' : 'แนบหลักฐาน'}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          disabled={uploading}
          className="hidden"
          onChange={event => {
            onAdd(event.target.files?.[0])
            event.target.value = ''
          }}
        />
      </label>
    </div>
  )
}

function WorkModal({ ticket, onClose }: { ticket: TicketDetailDto; onClose: () => void }) {
  const startWork = useStartTicket(ticket.id)
  const resumeWork = useResumeTicket(ticket.id)
  const saveWork = useUpdateTicketWorkDetail(ticket.id)
  const resolveWork = useResolveTicket(ticket.id)
  const addAttachment = useAddTicketAttachment(ticket.id)
  const deleteAttachment = useDeleteTicketAttachment(ticket.id)
  const [problemType, setProblemType] = useState<TicketProblemType | ''>(ticket.problemType ?? '')
  const [inspection, setInspection] = useState(ticket.initialInspectionNote ?? '')
  const [resolution, setResolution] = useState(ticket.resolutionNote ?? '')
  const [uploadingStage, setUploadingStage] = useState<'Progress' | 'Resolved'>()
  const [busyAttachmentId, setBusyAttachmentId] = useState<string>()

  useEffect(() => {
    setProblemType(ticket.problemType ?? '')
    setInspection(ticket.initialInspectionNote ?? '')
    setResolution(ticket.resolutionNote ?? '')
  }, [ticket.problemType, ticket.initialInspectionNote, ticket.resolutionNote])

  const progressAttachments = ticket.attachments.filter(item => item.stage === 'Progress')
  const resolvedAttachments = ticket.attachments.filter(item => item.stage === 'Resolved')
  const busy = saveWork.isPending || startWork.isPending || resumeWork.isPending
    || resolveWork.isPending || !!uploadingStage || !!busyAttachmentId

  async function saveDetails() {
    return saveWork.mutateAsync({
      problemType: problemType || undefined,
      initialInspectionNote: inspection.trim() || undefined,
      resolutionNote: resolution.trim() || undefined,
      expectedUpdatedAt: ticket.updatedAt,
    })
  }

  async function saveDraft() {
    try {
      await saveDetails()
      toast.success('บันทึกข้อมูลการทำงานแล้ว')
    } catch (error) {
      toast.error(apiMessage(error))
    }
  }

  async function start() {
    try {
      const saved = await saveDetails()
      await startWork.mutateAsync(saved.updatedAt)
      toast.success('เริ่มดำเนินการแล้ว')
    } catch (error) {
      toast.error(apiMessage(error))
    }
  }

  async function resume() {
    try {
      await resumeWork.mutateAsync(ticket.updatedAt)
      toast.success('กลับมาดำเนินการแล้ว')
    } catch (error) {
      toast.error(apiMessage(error))
    }
  }

  async function resolve() {
    if (!problemType) return toast.error('กรุณาระบุประเภทปัญหา')
    if (!resolution.trim()) return toast.error('กรุณาระบุรายละเอียดการแก้ไข')
    if (resolvedAttachments.length === 0) {
      return toast.error('กรุณาแนบหลักฐานหลังทำอย่างน้อย 1 ไฟล์')
    }
    try {
      const saved = await saveDetails()
      await resolveWork.mutateAsync(saved.updatedAt)
      toast.success('ส่งงานให้ตรวจรับแล้ว')
      onClose()
    } catch (error) {
      toast.error(apiMessage(error))
    }
  }

  async function upload(stage: 'Progress' | 'Resolved', file?: File) {
    if (!file) return
    setUploadingStage(stage)
    try {
      const uploaded = await uploadApi.upload(file, 'tickets')
      await addAttachment.mutateAsync({
        url: uploaded.url,
        fileName: uploaded.fileName,
        contentType: uploaded.contentType,
        sizeBytes: uploaded.sizeBytes,
        stage,
      })
      toast.success('เพิ่มหลักฐานแล้ว')
    } catch (error) {
      toast.error(apiMessage(error))
    } finally {
      setUploadingStage(undefined)
    }
  }

  async function remove(attachment: TicketAttachmentDto) {
    if (!window.confirm('ยืนยันลบหลักฐานนี้หรือไม่')) return
    setBusyAttachmentId(attachment.id)
    try {
      await deleteAttachment.mutateAsync(attachment.id)
      toast.success('ลบหลักฐานแล้ว')
    } catch (error) {
      toast.error(apiMessage(error))
    } finally {
      setBusyAttachmentId(undefined)
    }
  }

  async function replace(attachment: TicketAttachmentDto, file?: File) {
    if (!file || (attachment.stage !== 'Progress' && attachment.stage !== 'Resolved')) return
    setBusyAttachmentId(attachment.id)
    try {
      const uploaded = await uploadApi.upload(file, 'tickets')
      await addAttachment.mutateAsync({
        url: uploaded.url,
        fileName: uploaded.fileName,
        contentType: uploaded.contentType,
        sizeBytes: uploaded.sizeBytes,
        stage: attachment.stage,
      })
      await deleteAttachment.mutateAsync(attachment.id)
      toast.success('เปลี่ยนหลักฐานแล้ว')
    } catch (error) {
      toast.error(apiMessage(error))
    } finally {
      setBusyAttachmentId(undefined)
    }
  }

  return (
    <Modal open onClose={onClose} title={`ดำเนินงาน · ${ticket.ticketNo}`} size="lg">
      <div className="space-y-6">
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">ข้อมูลก่อนเริ่มงาน</h3>
            <p className="mt-1 text-xs text-muted-foreground">บันทึกสิ่งที่ตรวจพบและหลักฐานก่อนดำเนินการ</p>
          </div>
          <div className="space-y-1.5">
            <Label>ประเภทปัญหา</Label>
            <Select
              value={problemType}
              disabled={!ticket.actions.canEditWorkDetail}
              onChange={event => setProblemType(event.target.value as TicketProblemType | '')}
            >
              <option value="">— เลือกประเภท —</option>
              {(Object.keys(PROBLEM_TYPE_LABEL) as TicketProblemType[]).map(item => (
                <option key={item} value={item}>{PROBLEM_TYPE_LABEL[item]}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>ผลตรวจสอบเบื้องต้น</Label>
            <textarea
              rows={4}
              maxLength={2000}
              value={inspection}
              disabled={!ticket.actions.canEditWorkDetail}
              onChange={event => setInspection(event.target.value)}
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary disabled:bg-muted"
            />
          </div>
          {ticket.actions.canAddWorkAttachment ? (
            <EditableWorkAttachments
              attachments={progressAttachments}
              busyId={busyAttachmentId}
              uploading={uploadingStage === 'Progress'}
              onAdd={file => upload('Progress', file)}
              onReplace={replace}
              onDelete={remove}
            />
          ) : (
            <AttachmentList attachments={progressAttachments} />
          )}
        </section>

        {ticket.status !== 'Assigned' && (
          <section className="space-y-4 border-t border-border pt-5">
            <div>
              <h3 className="text-sm font-semibold">ข้อมูลหลังดำเนินการ</h3>
              <p className="mt-1 text-xs text-muted-foreground">ต้องมีรายละเอียดการแก้ไขและหลักฐานหลังทำก่อนส่งตรวจรับ</p>
            </div>
            <div className="space-y-1.5">
              <Label>รายละเอียดการแก้ไข *</Label>
              <textarea
                rows={5}
                maxLength={2000}
                value={resolution}
                disabled={!ticket.actions.canEditWorkDetail}
                onChange={event => setResolution(event.target.value)}
                className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary disabled:bg-muted"
              />
            </div>
            {ticket.actions.canAddWorkAttachment ? (
              <EditableWorkAttachments
                attachments={resolvedAttachments}
                busyId={busyAttachmentId}
                uploading={uploadingStage === 'Resolved'}
                onAdd={file => upload('Resolved', file)}
                onReplace={replace}
                onDelete={remove}
              />
            ) : (
              <AttachmentList attachments={resolvedAttachments} />
            )}
          </section>
        )}

        <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-border bg-background pt-4">
          <Button variant="outline" disabled={busy} onClick={onClose}>ปิด</Button>
          {ticket.actions.canEditWorkDetail && (
            <Button variant="outline" loading={saveWork.isPending} disabled={busy} onClick={saveDraft}>
              <Save className="h-4 w-4" /> บันทึกแบบร่าง
            </Button>
          )}
          {ticket.actions.canStart && (
            <Button loading={startWork.isPending} disabled={busy} onClick={start}>
              <Play className="h-4 w-4" /> เริ่มดำเนินการ
            </Button>
          )}
          {ticket.actions.canResume && (
            <Button loading={resumeWork.isPending} disabled={busy} onClick={resume}>
              <Play className="h-4 w-4" /> ดำเนินการต่อ
            </Button>
          )}
          {ticket.actions.canResolve && (
            <Button loading={resolveWork.isPending} disabled={busy} onClick={resolve}>
              <Send className="h-4 w-4" /> ส่งตรวจรับ
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

function ConversationPanel({ ticket }: { ticket: TicketDetailDto }) {
  const commentsQuery = useTicketComments(ticket.id)
  const addComment = useAddTicketComment(ticket.id)
  const requestInfo = useRequestTicketInfo(ticket.id)
  const [mode, setMode] = useState<'public' | 'internal'>('public')
  const [message, setMessage] = useState('')
  const [requestMessage, setRequestMessage] = useState('')
  const [requestInfoOpen, setRequestInfoOpen] = useState(false)
  const comments = (commentsQuery.data ?? []).filter(comment =>
    mode === 'internal' ? comment.isInternal : !comment.isInternal)

  useEffect(() => {
    if (!ticket.actions.canAddInternalNote && mode === 'internal') setMode('public')
  }, [mode, ticket.actions.canAddInternalNote])

  async function sendComment() {
    if (!message.trim()) return
    try {
      await addComment.mutateAsync({
        message: message.trim(),
        commentType: 'General',
        isInternal: mode === 'internal',
      })
      setMessage('')
      toast.success(mode === 'internal' ? 'เพิ่มบันทึกภายในแล้ว' : 'ส่งข้อความถึงผู้แจ้งแล้ว')
    } catch (error) {
      toast.error(apiMessage(error))
    }
  }

  async function sendInfoRequest() {
    if (!requestMessage.trim()) return toast.error('กรุณาระบุข้อมูลที่ต้องการ')
    try {
      await requestInfo.mutateAsync({
        message: requestMessage.trim(),
        expectedUpdatedAt: ticket.updatedAt,
      })
      setRequestMessage('')
      setRequestInfoOpen(false)
      setMode('public')
      toast.success('ส่งคำขอข้อมูลและเปลี่ยนสถานะเป็นรอข้อมูลแล้ว')
    } catch (error) {
      toast.error(apiMessage(error))
    }
  }

  const canCompose = mode === 'internal'
    ? ticket.actions.canAddInternalNote
    : ticket.actions.canComment

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
        <h2 className="text-sm font-semibold">การสนทนา</h2>
        {ticket.actions.canRequestInfo && (
          <Button size="sm" variant="outline" onClick={() => setRequestInfoOpen(true)}>
            <MessageSquare className="h-4 w-4" /> ขอข้อมูลเพิ่ม
          </Button>
        )}
      </div>

      <div className="mt-3 flex border-b border-border">
        <button
          type="button"
          onClick={() => setMode('public')}
          className={`border-b-2 px-3 py-2 text-xs font-medium ${
            mode === 'public' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
          }`}
        >
          ข้อความถึงผู้แจ้ง
        </button>
        {ticket.actions.canAddInternalNote && (
          <button
            type="button"
            onClick={() => setMode('internal')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium ${
              mode === 'internal' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            <LockKeyhole className="h-3.5 w-3.5" /> บันทึกภายใน
          </button>
        )}
      </div>

      {mode === 'internal' && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          ผู้แจ้งและผู้รับผิดชอบทั่วไปจะไม่เห็นข้อความในส่วนนี้
        </div>
      )}

      <div className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
        {commentsQuery.isLoading && Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-md bg-muted" />
        ))}
        {commentsQuery.isError && (
          <div className="py-6 text-center text-sm text-destructive">
            <p>โหลดข้อความไม่สำเร็จ</p>
            <Button className="mt-2" size="sm" variant="outline" onClick={() => commentsQuery.refetch()}>
              <RefreshCw className="h-4 w-4" /> ลองใหม่
            </Button>
          </div>
        )}
        {!commentsQuery.isLoading && !commentsQuery.isError && comments.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {mode === 'internal' ? 'ยังไม่มีบันทึกภายใน' : 'ยังไม่มีข้อความ'}
          </p>
        )}
        {comments.map(comment => (
          <article
            key={comment.id}
            className={`rounded-md border px-3 py-2.5 text-sm ${
              comment.isInternal
                ? 'border-amber-200 bg-amber-50/70'
                : comment.commentType === 'RequestInfo'
                  ? 'border-orange-200 bg-orange-50'
                  : 'border-border bg-muted/30'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">{comment.employeeName}</p>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {thaiDateTime(comment.createdAt)}
              </span>
            </div>
            <p className="mt-1.5 whitespace-pre-wrap leading-5">{comment.message}</p>
            {comment.commentType === 'RequestInfo' && (
              <p className="mt-2 text-xs font-medium text-orange-700">คำขอข้อมูลเพิ่มเติม</p>
            )}
          </article>
        ))}
      </div>

      {canCompose ? (
        <div className="mt-3 space-y-2">
          <textarea
            rows={3}
            maxLength={2000}
            value={message}
            onChange={event => setMessage(event.target.value)}
            placeholder={mode === 'internal' ? 'เพิ่มบันทึกสำหรับ Supervisor/Admin' : 'พิมพ์ข้อความถึงผู้แจ้ง'}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{message.length}/2000</span>
            <Button
              size="sm"
              loading={addComment.isPending}
              disabled={!message.trim()}
              onClick={sendComment}
            >
              <Send className="h-4 w-4" />
              {mode === 'internal' ? 'บันทึกภายใน' : 'ส่งข้อความ'}
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
          Ticket สถานะนี้ไม่รับข้อความเพิ่มเติม
        </p>
      )}

      {requestInfoOpen && (
        <Modal open onClose={() => setRequestInfoOpen(false)} title="ขอข้อมูลเพิ่มจากผู้แจ้ง" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              ข้อความนี้จะแสดงในบทสนทนา ส่ง LINE ถึงผู้แจ้ง และเปลี่ยนสถานะเป็น “รอข้อมูล”
            </p>
            <div className="space-y-1.5">
              <Label>ข้อมูลที่ต้องการ *</Label>
              <textarea
                autoFocus
                rows={5}
                maxLength={2000}
                value={requestMessage}
                onChange={event => setRequestMessage(event.target.value)}
                className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRequestInfoOpen(false)}>ยกเลิก</Button>
              <Button
                loading={requestInfo.isPending}
                disabled={!requestMessage.trim()}
                onClick={sendInfoRequest}
              >
                <Send className="h-4 w-4" /> ส่งคำขอ
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  )
}

function AssignModal({
  ticket,
  candidates,
  onClose,
}: {
  ticket: TicketDetailDto
  candidates: TicketAssignmentCandidateDto[]
  onClose: () => void
}) {
  const assign = useAssignTicket(ticket.id)
  const [employeeId, setEmployeeId] = useState(ticket.currentAssignment?.assignedToEmployeeId ?? '')
  const [note, setNote] = useState('')

  async function submit() {
    if (!employeeId) return toast.error('กรุณาเลือกผู้รับผิดชอบ')
    try {
      await assign.mutateAsync({
        assignedToEmployeeId: employeeId,
        note: note.trim() || undefined,
        expectedUpdatedAt: ticket.updatedAt,
      })
      toast.success(ticket.currentAssignment ? 'เปลี่ยนผู้รับผิดชอบแล้ว' : 'มอบหมายงานแล้ว')
      onClose()
    } catch (error) {
      toast.error(apiMessage(error))
    }
  }

  return (
    <Modal open onClose={onClose} title={ticket.currentAssignment ? 'เปลี่ยนผู้รับผิดชอบ' : 'มอบหมายงาน'}>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="assignee">ผู้รับผิดชอบ *</Label>
          <Select id="assignee" value={employeeId} onChange={event => setEmployeeId(event.target.value)}>
            <option value="">— เลือกพนักงาน —</option>
            {candidates.map(candidate => (
              <option key={candidate.employeeId} value={candidate.employeeId}>
                {candidate.isRecommended ? 'แนะนำ · ' : ''}{candidate.employeeName} · {candidate.employeeCode} · งานค้าง {candidate.activeTicketCount}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="assign-note">คำสั่งหรือข้อมูลส่งต่อ</Label>
          <textarea
            id="assign-note"
            rows={4}
            maxLength={1000}
            value={note}
            onChange={event => setNote(event.target.value)}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button loading={assign.isPending} onClick={submit}>ยืนยันมอบหมาย</Button>
        </div>
      </div>
    </Modal>
  )
}

function TriageModal({ ticket, onClose }: { ticket: TicketDetailDto; onClose: () => void }) {
  const triage = useTriageTicket(ticket.id)
  const [categoryId, setCategoryId] = useState(ticket.categoryId)
  const [topicId, setTopicId] = useState(ticket.topicId)
  const [otherTopicText, setOtherTopicText] = useState(ticket.otherTopicText ?? '')
  const [priority, setPriority] = useState<TicketPriority>(ticket.priority)
  const [locationText, setLocationText] = useState(ticket.locationText ?? '')
  const [vehicleText, setVehicleText] = useState(ticket.vehicleText ?? '')
  const { data: categories = [] } = useManagedTicketCategories(ticket.targetCompanyId, ticket.targetDepartmentId)
  const { data: topics = [] } = useManagedTicketTopics(ticket.targetCompanyId, ticket.targetDepartmentId, categoryId)
  const selectedTopic = topics.find(topic => topic.id === topicId)
  const requiresOther = selectedTopic?.name.trim() === 'อื่น ๆ'

  async function submit() {
    if (!categoryId || !topicId) return toast.error('กรุณาเลือกหมวดและหัวข้อ')
    if (requiresOther && !otherTopicText.trim()) return toast.error('กรุณาระบุหัวข้ออื่น ๆ')
    try {
      await triage.mutateAsync({
        categoryId,
        topicId,
        otherTopicText: requiresOther ? otherTopicText.trim() : undefined,
        priority,
        locationText: locationText.trim() || undefined,
        vehicleText: vehicleText.trim() || undefined,
        expectedUpdatedAt: ticket.updatedAt,
      })
      toast.success('อัปเดตการจัดประเภทแล้ว')
      onClose()
    } catch (error) {
      toast.error(apiMessage(error))
    }
  }

  return (
    <Modal open onClose={onClose} title="จัดประเภทใบแจ้งเรื่อง" size="lg">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>หมวด</Label>
          <Select value={categoryId} onChange={event => { setCategoryId(event.target.value); setTopicId(''); setOtherTopicText('') }}>
            <option value="">— เลือกหมวด —</option>
            {categories.filter(item => item.isActive).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>หัวข้อย่อย</Label>
          <Select value={topicId} onChange={event => { setTopicId(event.target.value); setOtherTopicText('') }}>
            <option value="">— เลือกหัวข้อ —</option>
            {topics.filter(item => item.isActive).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
        </div>
        {requiresOther && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label>ระบุหัวข้ออื่น ๆ *</Label>
            <Input value={otherTopicText} onChange={event => setOtherTopicText(event.target.value)} maxLength={200} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label>ความเร่งด่วน</Label>
          <Select value={priority} onChange={event => setPriority(event.target.value as TicketPriority)}>
            {(Object.keys(PRIORITY_LABEL) as TicketPriority[]).map(item => <option key={item} value={item}>{PRIORITY_LABEL[item]}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>รถ / ทะเบียน</Label>
          <Input value={vehicleText} onChange={event => setVehicleText(event.target.value)} maxLength={100} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>สถานที่</Label>
          <Input value={locationText} onChange={event => setLocationText(event.target.value)} maxLength={200} />
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
        <Button loading={triage.isPending} onClick={submit}>บันทึก</Button>
      </div>
    </Modal>
  )
}

function RejectModal({ ticket, onClose }: { ticket: TicketDetailDto; onClose: () => void }) {
  const reject = useRejectTicket(ticket.id)
  const [reason, setReason] = useState('')

  async function submit() {
    if (!reason.trim()) return toast.error('กรุณาระบุเหตุผล')
    try {
      await reject.mutateAsync({ reason: reason.trim(), expectedUpdatedAt: ticket.updatedAt })
      toast.success('ปฏิเสธใบแจ้งเรื่องแล้ว')
      onClose()
    } catch (error) {
      toast.error(apiMessage(error))
    }
  }

  return (
    <Modal open onClose={onClose} title="ปฏิเสธใบแจ้งเรื่อง" size="sm">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>เหตุผล *</Label>
          <textarea
            rows={5}
            maxLength={1000}
            value={reason}
            onChange={event => setReason(event.target.value)}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button variant="destructive" loading={reject.isPending} onClick={submit}>ยืนยันปฏิเสธ</Button>
        </div>
      </div>
    </Modal>
  )
}

function ReviewModal({
  ticket,
  mode,
  onClose,
}: {
  ticket: TicketDetailDto
  mode: 'return' | 'close'
  onClose: () => void
}) {
  const returnTicket = useReturnTicketForRevision(ticket.id)
  const closeTicket = useCloseTicket(ticket.id)
  const [note, setNote] = useState('')
  const isReturn = mode === 'return'
  const pending = returnTicket.isPending || closeTicket.isPending

  async function submit() {
    if (isReturn && !note.trim()) return toast.error('กรุณาระบุสิ่งที่ต้องแก้ไข')
    try {
      if (isReturn) {
        await returnTicket.mutateAsync({ reviewNote: note.trim(), expectedUpdatedAt: ticket.updatedAt })
        toast.success('ส่งงานกลับแก้ไขแล้ว')
      } else {
        await closeTicket.mutateAsync({ reviewNote: note.trim() || undefined, expectedUpdatedAt: ticket.updatedAt })
        toast.success('ตรวจผ่านและปิดงานแล้ว')
      }
      onClose()
    } catch (error) {
      toast.error(apiMessage(error))
    }
  }

  return (
    <Modal open onClose={onClose} title={isReturn ? 'ส่งงานกลับแก้ไข' : 'ตรวจผ่านและปิดงาน'} size="sm">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>{isReturn ? 'สิ่งที่ต้องแก้ไข *' : 'หมายเหตุการตรวจรับ'}</Label>
          <textarea
            rows={5}
            maxLength={2000}
            value={note}
            onChange={event => setNote(event.target.value)}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button variant={isReturn ? 'outline' : 'default'} loading={pending} onClick={submit}>
            {isReturn ? 'ยืนยันส่งกลับ' : 'ยืนยันปิดงาน'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const ticketQuery = useTicket(id)
  const ticket = ticketQuery.data
  const canViewAssignmentHistory = !!ticket && !ticket.actions.isRequester
    && (ticket.actions.canAssign || ticket.actions.canViewTicketReport)
  const historyQuery = useTicketAssignmentHistory(id, canViewAssignmentHistory)
  const candidatesQuery = useTicketAssignmentCandidates(id, !!ticket?.actions.canAssign)
  const reviewsQuery = useTicketReviews(id)
  const accept = useAcceptTicket(id)
  const [modal, setModal] = useState<'assign' | 'triage' | 'reject' | 'return' | 'close' | 'work' | 'events' | null>(null)

  async function acceptTicket() {
    if (!ticket) return
    try {
      await accept.mutateAsync(ticket.updatedAt)
      toast.success('รับเรื่องแล้ว')
    } catch (error) {
      toast.error(apiMessage(error))
    }
  }

  if (ticketQuery.isLoading) return <div className="h-48 animate-pulse rounded-md bg-muted" />
  if (!ticket) return <div className="rounded-md border border-destructive/30 p-5 text-destructive">ไม่พบใบแจ้งเรื่องหรือไม่มีสิทธิ์เข้าถึง</div>

  const createdAttachments = ticket.attachments.filter(item => item.stage === 'Created')
  const progressAttachments = ticket.attachments.filter(item => item.stage === 'Progress')
  const resolvedAttachments = ticket.attachments.filter(item => item.stage === 'Resolved')
  const hasReceiverActions = ticket.actions.canAccept
    || ticket.actions.canTriage
    || ticket.actions.canAssign
    || ticket.actions.canReject
    || ticket.actions.canReturnForRevision
    || ticket.actions.canClose
  const hasWorkActions = ticket.actions.canStart
    || ticket.actions.canEditWorkDetail
    || ticket.actions.canResume
    || ticket.actions.canResolve

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div className="min-w-0">
          <Link href="/tickets/inbox" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> กลับกล่องงาน
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{ticket.ticketNo}</h1>
            <Badge>{TICKET_STATUS_LABEL[ticket.status]}</Badge>
            <Badge variant={ticket.priority === 'Critical' ? 'destructive' : ticket.priority === 'High' ? 'warning' : 'secondary'}>
              {PRIORITY_LABEL[ticket.priority]}
            </Badge>
          </div>
          <p className="mt-2 text-base font-medium">{ticket.title}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button variant="outline" onClick={() => setModal('events')}>
            <History className="h-4 w-4" /> เหตุการณ์ ({ticket.auditEvents.length})
          </Button>
          {hasWorkActions && (
            <Button onClick={() => setModal('work')}>
              <Play className="h-4 w-4" />
              {ticket.status === 'Assigned' ? 'เริ่มงาน' : 'ดำเนินงานและส่งตรวจ'}
            </Button>
          )}
          {hasReceiverActions && (
            <div className="border-l-2 border-primary pl-3">
              {/* <div className="mb-2 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">การจัดการฝ่ายผู้รับ</span>
                <span className="inline-flex items-center gap-1.5 rounded border border-border px-2 py-1">
                  <Building2 className="h-3.5 w-3.5" /> บริษัท {ticket.targetCompanyName}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded border border-border px-2 py-1">
                  <Network className="h-3.5 w-3.5" /> แผนก {ticket.targetDepartmentName}
                </span>
              </div> */}
              <div className="flex flex-wrap justify-end gap-2">
                {ticket.actions.canAccept && (
                  <Button variant="outline" loading={accept.isPending} onClick={acceptTicket}>
                    <CheckCircle2 className="h-4 w-4" /> รับเรื่อง
                  </Button>
                )}
                {ticket.actions.canTriage && <Button variant="outline" onClick={() => setModal('triage')}>
                  <Pencil className="h-4 w-4" /> จัดประเภท
                </Button>}
                {ticket.actions.canAssign && <Button onClick={() => setModal('assign')}>
                  <UserRoundCheck className="h-4 w-4" /> {ticket.currentAssignment ? 'เปลี่ยนผู้รับผิดชอบ' : 'มอบหมายงาน'}
                </Button>}
                {ticket.actions.canReject && <Button className="text-white" variant="destructive" onClick={() => setModal('reject')}>
                  <XCircle className="h-4 w-4" /> ปฏิเสธ
                </Button>}
                {ticket.actions.canReturnForRevision && (
                  <Button variant="outline" onClick={() => setModal('return')}>
                    <RotateCcw className="h-4 w-4" /> ส่งกลับแก้ไข
                  </Button>
                )}
                {ticket.actions.canClose && (
                  <Button onClick={() => setModal('close')}>
                    <ShieldCheck className="h-4 w-4" /> ตรวจผ่านและปิดงาน
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {ticket.actions.isRequester && (
        <div className="flex gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-100">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">ส่งใบแจ้งเรื่องแล้ว ไม่สามารถยกเลิกด้วยตนเองได้</p>
            <p className="mt-1 text-sm opacity-80">
              หากต้องการยกเลิก กรุณาติดต่อผู้รับผิดชอบหรือแผนก {ticket.targetDepartmentName} ของ {ticket.targetCompanyName}
            </p>
          </div>
        </div>
      )}

      {ticket.status === 'Rejected' && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">ปฏิเสธโดย {ticket.rejectedByEmployeeName ?? '-'}</p>
          <p className="mt-1">{ticket.rejectionReason}</p>
          <p className="mt-1 text-xs text-red-600">{thaiDateTime(ticket.rejectedAt)}</p>
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <section>
            <h2 className="border-b border-border pb-2 text-sm font-semibold">รายละเอียดปัญหา</h2>
            <dl className="divide-y divide-border/60">
              <InfoRow label="รายละเอียด" value={ticket.detail} />
              <InfoRow label="หมวด" value={`${ticket.categoryName} / ${ticket.topicName}${ticket.otherTopicText ? `: ${ticket.otherTopicText}` : ''}`} />
              <InfoRow label="รถ / ทะเบียน" value={ticket.vehicleText} />
              <InfoRow label="สถานที่" value={ticket.locationText} />
            </dl>
          </section>

          <section>
            <h2 className="border-b border-border pb-2 text-sm font-semibold">ผู้แจ้งและปลายทาง</h2>
            <dl className="divide-y divide-border/60">
              <InfoRow label="ผู้แจ้ง" value={ticket.requesterName} />
              <InfoRow label="บริษัทผู้แจ้ง" value={ticket.sourceCompanyName} />
              <InfoRow label="แผนกผู้แจ้ง" value={ticket.sourceDepartmentName} />
              <InfoRow label="ติดต่อ" value={[ticket.contactPhone, ticket.contactNote].filter(Boolean).join(' · ')} />
              <InfoRow label="บริษัทผู้รับ" value={ticket.targetCompanyName} />
              <InfoRow label="แผนกผู้รับ" value={ticket.targetDepartmentName} />
              <InfoRow label="เปิดเมื่อ" value={thaiDateTime(ticket.createdAt)} />
            </dl>
          </section>

          <section>
            <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
              <h2 className="text-sm font-semibold">หลักฐานตอนเปิดเรื่อง</h2>
              <span className="text-xs text-muted-foreground">{createdAttachments.length} ไฟล์</span>
            </div>
            <AttachmentList attachments={createdAttachments} />
          </section>

          {(ticket.problemType
            || ticket.initialInspectionNote
            || ticket.resolutionNote
            || progressAttachments.length > 0
            || resolvedAttachments.length > 0) && (
            <section>
              <h2 className="border-b border-border pb-2 text-sm font-semibold">ผลการดำเนินงาน</h2>
              <dl className="divide-y divide-border/60">
                <InfoRow label="ประเภทปัญหา" value={ticket.problemType ? PROBLEM_TYPE_LABEL[ticket.problemType] : undefined} />
                <InfoRow label="ตรวจสอบเบื้องต้น" value={ticket.initialInspectionNote} />
                <InfoRow label="การแก้ไข" value={ticket.resolutionNote} />
                <InfoRow label="ส่งงานโดย" value={ticket.resolvedByEmployeeName} />
                <InfoRow label="เวลาส่งงาน" value={thaiDateTime(ticket.resolvedAt)} />
              </dl>
              {progressAttachments.length > 0 && (
                <div className="mt-4 border-t border-border pt-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-muted-foreground">รูปก่อนทำ</p>
                    <span className="text-xs text-muted-foreground">{progressAttachments.length} ไฟล์</span>
                  </div>
                  <AttachmentList attachments={progressAttachments} />
                </div>
              )}
              {resolvedAttachments.length > 0 && (
                <div className="mt-4 border-t border-border pt-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-muted-foreground">รูปหลังทำ</p>
                    <span className="text-xs text-muted-foreground">{resolvedAttachments.length} ไฟล์</span>
                  </div>
                  <AttachmentList attachments={resolvedAttachments} />
                </div>
              )}
            </section>
          )}
        </div>

        <div className="space-y-6">
          <ConversationPanel ticket={ticket} />

          <section>
            <h2 className="border-b border-border pb-2 text-sm font-semibold">การรับและมอบหมาย</h2>
            <dl className="divide-y divide-border/60">
              <InfoRow label="ผู้รับเรื่อง" value={ticket.supervisorAcceptedByEmployeeName} />
              <InfoRow label="เวลารับเรื่อง" value={thaiDateTime(ticket.supervisorAcceptedAt)} />
              <InfoRow label="ผู้รับผิดชอบ" value={ticket.currentAssignment?.assignedToEmployeeName} />
              <InfoRow
                label="มอบหมายโดย"
                value={ticket.currentAssignment
                  ? ticket.currentAssignment.assignedByEmployeeName
                    ?? (ticket.currentAssignment.assignmentSource === 'SelfClaim' ? 'ผู้รับผิดชอบรับงานเอง' : 'ระบบอัตโนมัติ')
                  : undefined}
              />
              <InfoRow label="เวลามอบหมาย" value={thaiDateTime(ticket.currentAssignment?.assignedAt)} />
              <InfoRow label="คำสั่งงาน" value={ticket.currentAssignment?.note} />
            </dl>
          </section>

          {canViewAssignmentHistory && (
            <section>
              <h2 className="border-b border-border pb-2 text-sm font-semibold">ประวัติการมอบหมาย</h2>
              {(historyQuery.data?.length ?? 0) === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">ยังไม่มีประวัติการมอบหมาย</p>
              ) : (
                <div className="divide-y divide-border">
                  {historyQuery.data?.map(item => (
                    <div key={item.id} className="py-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{item.assignedToEmployeeName}</p>
                        {item.isActive && <Badge variant="success">ปัจจุบัน</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">โดย {item.assignedByEmployeeName} · {thaiDateTime(item.assignedAt)}</p>
                      {item.note && <p className="mt-1 text-muted-foreground">{item.note}</p>}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          <section>
            <h2 className="border-b border-border pb-2 text-sm font-semibold">ประวัติการตรวจรับ</h2>
            {(reviewsQuery.data?.length ?? 0) === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">ยังไม่มีการตรวจรับ</p>
            ) : (
              <div className="divide-y divide-border">
                {reviewsQuery.data?.map(review => (
                  <div key={review.id} className="py-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">รอบที่ {review.reviewRound}</p>
                      <Badge variant={review.decision === 'Approved' ? 'success' : 'warning'}>
                        {review.decision === 'Approved' ? 'ผ่าน' : 'ส่งกลับ'}
                      </Badge>
                    </div>
                    {review.reviewNote && <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{review.reviewNote}</p>}
                    <p className="mt-2 text-xs text-muted-foreground">{review.reviewedByEmployeeName} · {thaiDateTime(review.reviewedAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {modal === 'assign' && (
        <AssignModal ticket={ticket} candidates={candidatesQuery.data ?? []} onClose={() => setModal(null)} />
      )}
      {modal === 'triage' && <TriageModal ticket={ticket} onClose={() => setModal(null)} />}
      {modal === 'reject' && <RejectModal ticket={ticket} onClose={() => setModal(null)} />}
      {modal === 'return' && <ReviewModal ticket={ticket} mode="return" onClose={() => setModal(null)} />}
      {modal === 'close' && <ReviewModal ticket={ticket} mode="close" onClose={() => setModal(null)} />}
      {modal === 'work' && <WorkModal ticket={ticket} onClose={() => setModal(null)} />}
      {modal === 'events' && (
        <Modal open onClose={() => setModal(null)} title={`Status Station · ${ticket.ticketNo}`} size="lg">
          {ticket.auditEvents.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีเหตุการณ์</p>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between gap-4 border-y border-border py-3">
                <div>
                  <p className="text-xs text-muted-foreground">สถานะปัจจุบัน</p>
                  <p className="mt-1 text-sm font-semibold">{TICKET_STATUS_LABEL[ticket.status]}</p>
                </div>
                <Badge variant="secondary">{ticket.auditEvents.length} ขั้นตอน</Badge>
              </div>

              <div className="max-h-[60vh] overflow-y-auto pr-1">
                {ticket.auditEvents.map((event, index) => {
                  const { Icon, station } = eventStation(event.action)
                  return (
                    <div key={event.id} className="grid grid-cols-[36px_1fr] gap-3">
                      <div className="relative flex justify-center">
                        {index < ticket.auditEvents.length - 1 && (
                          <span className="absolute bottom-0 top-9 w-px bg-border" aria-hidden="true" />
                        )}
                        <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border ${station}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                      </div>
                      <div className="min-w-0 pb-5 pt-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="whitespace-pre-wrap text-sm font-medium leading-5">{event.description}</p>
                          {index === 0 && <Badge variant="success">ล่าสุด</Badge>}
                        </div>
                        <p className="mt-1.5 text-xs text-muted-foreground">{event.performedByName ?? 'ระบบ'}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{thaiDateTime(event.createdAt)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  )
}
