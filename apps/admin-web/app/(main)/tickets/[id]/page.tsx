'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  CircleDot,
  ExternalLink,
  FileText,
  History,
  ImagePlus,
  ListTodo,
  Loader2,
  LockKeyhole,
  MessageSquare,
  Network,
  Pencil,
  Play,
  Route,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  TimerReset,
  Trash2,
  TriangleAlert,
  UserRoundCheck,
  XCircle,
  PlusIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import type {
  TicketAssignmentCandidateDto,
  TicketAttachmentDto,
  TicketDetailDto,
  TicketPriority,
  TicketProblemType,
  TicketStatus,
} from '@hrms/shared-types'
import { createTicketBoardWorkflowFromDto, getTicketBoardWorkflowStepState, resolveTicketBoardWorkflow } from '@hrms/shared-types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { SourceChannelIcon } from '@/components/tickets/source-channel-icon'
import {
  useAcceptTicket,
  useApproveTicketCancellation,
  useAssignTicket,
  useRejectTicket,
  useRejectTicketCancellation,
  useReturnTicketForRevision,
  useCloseTicket,
  useConfirmTicketCompletion,
  useTicket,
  useTicketAssignmentCandidates,
  useTicketAssignmentHistory,
  useTicketReviews,
  useTriageTicket,
  useStartTicket,
  useResumeTicket,
  useUpdateTicketWorkDetail,
  useUpdateTicketProgress,
  useResolveTicket,
  useAddTicketAttachment,
  useDeleteTicketAttachment,
  useTicketComments,
  useAddTicketComment,
  useRequestTicketInfo,
  useRequestTicketCancellation,
} from '@/hooks/use-tickets'
import { useManagedTicketCategories, useManagedTicketSubjects, useManagedTicketTopics } from '@/hooks/use-ticket-taxonomy'
import { useProtectedFileUrl } from '@/hooks/use-protected-file-url'
import { uploadApi } from '@/lib/upload.api'
import { getTicketProgressFeedStyle } from '@/lib/ticket-progress-feed'
import { TICKET_STATUS_CLASS, TICKET_STATUS_LABEL } from '@/lib/ticket-status'

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  Low: 'ปกติ', Medium: 'กลาง', High: 'ด่วน', Critical: 'ด่วนมาก',
}

const PROBLEM_TYPE_LABEL: Record<TicketProblemType, string> = {
  SystemDefect: 'ระบบบกพร่อง',
  Enhancement: 'ปรับปรุงเพิ่มเติม',
  Other: 'อื่น ๆ',
}

const MAX_ACTIVITY_FILES = 5
const MAX_COMPLETION_FILES = 5
const ACTIVITY_CARD_PREVIEW_COUNT = 3

function PendingTicketFileItem({
  file,
  disabled,
  onRemove,
}: {
  file: File
  disabled: boolean
  onRemove: () => void
}) {
  const previewUrl = useMemo(
    () => file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    [file],
  )

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-white p-2.5 shadow-sm">
      {previewUrl ? (
        <img src={previewUrl} alt={file.name} className="h-14 w-14 shrink-0 rounded-md object-cover" />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <FileText className="h-6 w-6 text-primary" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{file.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
      </div>
      <button
        type="button"
        title="เอารูปออก"
        disabled={disabled}
        onClick={onRemove}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-destructive hover:bg-destructive/10 disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

function apiMessage(error: unknown) {
  const response = (error as {
    response?: { data?: { message?: string; error?: string; errors?: string[]; details?: Array<{ error?: string }> } }
  })?.response?.data
  return response?.details?.[0]?.error ?? response?.errors?.[0] ?? response?.message
    ?? response?.error ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่'
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

function InfoRow({ label, value, children }: { label: string; value?: string | null; children?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 whitespace-pre-wrap text-foreground">{children ?? (value || '-')}</dd>
    </div>
  )
}

function StatusStationLine({
  categoryName,
  topicName,
  subjectName,
  status,
  workflowName,
  workflowAutoAcknowledgeAfterDays,
  workflowBoardSteps,
  workflowSteps,
  workflowCurrentStepKey,
  workflowCurrentStepIndexByStatus,
}: {
  categoryName?: string
  topicName?: string
  subjectName: string
  status: TicketStatus
  workflowName?: string
  workflowAutoAcknowledgeAfterDays?: number
  workflowBoardSteps: TicketDetailDto['workflowBoardSteps']
  workflowSteps: TicketDetailDto['workflowSteps']
  workflowCurrentStepKey?: string
  workflowCurrentStepIndexByStatus: TicketDetailDto['workflowCurrentStepIndexByStatus']
}) {
  const workflow = useMemo(() => {
    if (workflowBoardSteps.length > 0) {
      return {
        key: 'ticket-snapshot',
        name: workflowName ?? 'Ticket Workflow',
        autoAcknowledgeAfterDays: workflowAutoAcknowledgeAfterDays,
        steps: workflowBoardSteps.map((step, index, allSteps) => ({
          key: step.key,
          label: step.label,
          actorType: (step.actorType as 'requester' | 'supervisor' | 'assignee' | 'system' | undefined) ?? (index === 0 ? 'requester' : index === allSteps.length - 1 ? 'requester' : 'assignee'),
          kind: (step.kind as 'start' | 'queue' | 'working' | 'review' | 'acceptance' | 'end' | undefined) ?? (index === 0 ? 'start' : index === allSteps.length - 1 ? 'end' : 'queue'),
        })),
        currentStepKeyByStatus: Object.entries(workflowCurrentStepIndexByStatus).reduce((result, [ticketStatus, stepIndex]) => {
          if (typeof stepIndex === 'number' && workflowBoardSteps[stepIndex]) result[ticketStatus as TicketStatus] = workflowBoardSteps[stepIndex].key
          return result
        }, {} as Partial<Record<TicketStatus, string>>),
      }
    }
    return createTicketBoardWorkflowFromDto({ workflowName, workflowAutoAcknowledgeAfterDays, workflowSteps, workflowCurrentStepIndexByStatus })
      ?? resolveTicketBoardWorkflow({ categoryName, topicName, subjectName })
  }, [categoryName, subjectName, topicName, workflowAutoAcknowledgeAfterDays, workflowBoardSteps, workflowCurrentStepIndexByStatus, workflowName, workflowSteps])
  const stationState = (index: number) => getTicketBoardWorkflowStepState(
    workflow,
    status,
    index,
    workflowCurrentStepKey,
  )

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-background p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-sm font-semibold text-slate-950">สถานะการดำเนินงาน</p></div>
        {status === 'AwaitingRequesterConfirmation' && workflow.autoAcknowledgeAfterDays ? <Badge variant="warning">ระบบจะปิดงานอัตโนมัติใน {workflow.autoAcknowledgeAfterDays} วัน</Badge> : null}
      </div>
      <div className="mt-6 overflow-x-auto pb-2">
        <div className="flex min-w-max items-start justify-center px-2">
          {workflow.steps.map((step, index) => {
            const state = stationState(index)
            const nextState = index < workflow.steps.length - 1 ? stationState(index + 1) : null
            return <div key={step.key} className="flex items-start">
              <div className="w-36 text-center" data-station-state={state}>
                <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full border-4 ${state === 'complete' ? 'border-emerald-600 bg-emerald-600 text-white' : state === 'current' ? 'animate-pulse border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25' : 'border-slate-300 bg-white text-slate-400'}`}>
                  {state === 'complete' ? <CheckCircle2 className="h-5 w-5" /> : <span className="h-2.5 w-2.5 rounded-full bg-current" />}
                </div>
                <p className={`mt-3 text-xs font-semibold leading-5 ${state === 'upcoming' ? 'text-slate-400' : 'text-slate-600'}`}>{step.label}</p>
                {state === 'current' ? <p className="mt-1 text-[10px] font-bold tracking-wide text-primary">สถานะปัจจุบัน</p> : null}
              </div>
              {nextState ? <div className={`mt-5 w-12 border-t-2 ${nextState === 'upcoming' ? 'border-dashed border-slate-300' : 'border-solid border-emerald-500'}`} /> : null}
            </div>
          })}
        </div>
      </div>
    </section>
  )
}

function WorkflowStepTimeline({
  categoryName,
  topicName,
  subjectName,
  status,
  workflowName,
  workflowAutoAcknowledgeAfterDays,
  workflowBoardSteps,
  workflowSteps,
  workflowCurrentStepKey,
  workflowCurrentStepIndexByStatus,
}: {
  categoryName?: string
  topicName?: string
  subjectName: string
  status: TicketStatus
  workflowName?: string
  workflowAutoAcknowledgeAfterDays?: number
  workflowBoardSteps: TicketDetailDto['workflowBoardSteps']
  workflowSteps: TicketDetailDto['workflowSteps']
  workflowCurrentStepKey?: string
  workflowCurrentStepIndexByStatus: TicketDetailDto['workflowCurrentStepIndexByStatus']
}) {
  const workflow = useMemo(() => {
    if (workflowBoardSteps.length > 0) {
      return {
        key: 'ticket-snapshot',
        name: workflowName ?? 'Ticket Workflow',
        autoAcknowledgeAfterDays: workflowAutoAcknowledgeAfterDays,
        steps: workflowBoardSteps.map((step, index, allSteps) => ({
          key: step.key,
          label: step.label,
          actorType: (step.actorType as 'requester' | 'supervisor' | 'assignee' | 'system' | undefined)
            ?? (index === 0 ? 'requester' : index === allSteps.length - 1 ? 'requester' : 'assignee'),
          kind: (step.kind as 'start' | 'queue' | 'working' | 'review' | 'acceptance' | 'end' | undefined)
            ?? (index === 0 ? 'start' : index === allSteps.length - 1 ? 'end' : 'queue'),
        })),
        currentStepKeyByStatus: Object.entries(workflowCurrentStepIndexByStatus).reduce((result, [ticketStatus, stepIndex]) => {
          if (typeof stepIndex === 'number' && workflowBoardSteps[stepIndex]) {
            result[ticketStatus as TicketStatus] = workflowBoardSteps[stepIndex].key
          }
          return result
        }, {} as Partial<Record<TicketStatus, string>>),
      }
    }

    return createTicketBoardWorkflowFromDto({
      workflowName,
      workflowAutoAcknowledgeAfterDays,
      workflowSteps,
      workflowCurrentStepIndexByStatus,
    }) ?? resolveTicketBoardWorkflow({ categoryName, topicName, subjectName })
  }, [
    categoryName,
    topicName,
    subjectName,
    workflowName,
    workflowAutoAcknowledgeAfterDays,
    workflowBoardSteps,
    workflowSteps,
    workflowCurrentStepIndexByStatus,
  ])

  return (
    <section className="rounded-md border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">ขั้นตอนการดำเนินงาน</p>
          <p className="mt-1 text-xs text-muted-foreground">{workflow.name}</p>
        </div>
        {workflow.autoAcknowledgeAfterDays ? (
          <Badge variant="warning">Auto รับทราบ {workflow.autoAcknowledgeAfterDays} วัน</Badge>
        ) : null}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-1">
        {workflow.steps.map((step, index) => {
          const state = getTicketBoardWorkflowStepState(
            workflow,
            status,
            index,
            workflowCurrentStepKey,
          )
          const dotClass = state === 'complete'
            ? 'border-emerald-600 bg-emerald-600'
            : state === 'current'
              ? 'border-primary bg-primary'
              : 'border-slate-300 bg-white'
          const textClass = state === 'upcoming' ? 'text-muted-foreground' : 'text-foreground'

          return (
            <div key={step.key} className="grid grid-cols-[20px_1fr] gap-3">
              <div className="flex justify-center pt-1">
                <span className={`h-3.5 w-3.5 rounded-full border-2 ${dotClass}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-medium ${textClass}`}>{step.label}</p>
                {state === 'current' && <p className="mt-0.5 text-xs text-primary">สถานะปัจจุบัน</p>}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function BoardRuntimePanel({ ticket }: { ticket: TicketDetailDto }) {
  const updateProgress = useUpdateTicketProgress(ticket.id)
  const addAttachment = useAddTicketAttachment(ticket.id)
  const canComposeProgress = ticket.actions.canEditWorkDetail
    || ticket.actions.canRequestInfo
    || ticket.actions.canResume
    || ticket.actions.canResolve
  const canAttachActivityFiles = ticket.actions.canAddAttachment
  const [cardLane, setCardLane] = useState<'workState' | 'blockerReason'>('workState')
  const [cardTitleDraft, setCardTitleDraft] = useState('')
  const [noteDraft, setNoteDraft] = useState('')
  const [activityFiles, setActivityFiles] = useState<File[]>([])
  const [uploadingActivityFiles, setUploadingActivityFiles] = useState(false)
  const [isCardComposerOpen, setIsCardComposerOpen] = useState(false)
  const [showAllProgressFeed, setShowAllProgressFeed] = useState(false)
  const savingProgress = updateProgress.isPending || uploadingActivityFiles || addAttachment.isPending

  useEffect(() => {
    setCardTitleDraft('')
    setNoteDraft('')
    setActivityFiles([])
  }, [ticket.updatedAt])

  const currentStepLabel = useMemo(() => {
    const source = ticket.workflowBoardSteps.length > 0 ? ticket.workflowBoardSteps : ticket.workflowSteps
    return source.find(step => step.key === ticket.workflowCurrentStepKey)?.label
  }, [ticket.workflowBoardSteps, ticket.workflowCurrentStepKey, ticket.workflowSteps])

  const presetGroups = useMemo(() => ({
    workState: ticket.workflowInProgressPresets.filter(item => item.isActive && item.kind === 'work_state'),
    blockerReason: ticket.workflowInProgressPresets.filter(item => item.isActive && item.kind === 'blocker_reason'),
    nextAction: ticket.workflowInProgressPresets.filter(item => item.isActive && item.kind === 'next_action'),
  }), [ticket.workflowInProgressPresets])

  const laneComposerMeta = {
    workState: {
      label: 'บันทึกความคืบหน้า',
      placeholder: 'เช่น ตรวจสอบ Log, ทดสอบเอกสาร, ติดต่อผู้ใช้งาน',
      presets: presetGroups.workState,
    },
    blockerReason: {
      label: 'สิ่งที่รอหรือกำลังติดขัด',
      placeholder: 'เช่น รอ Vendor, รออะไหล่, รอข้อมูลเพิ่มเติม',
      presets: presetGroups.blockerReason,
    },
    nextAction: {
      label: 'การ์ดงานถัดไป',
      placeholder: 'เช่น นัดทดสอบรอบถัดไป, โทรกลับผู้แจ้ง, ส่งตรวจ',
      presets: presetGroups.nextAction,
    },
  } as const

  const progressFeed = useMemo(() => (
    ticket.progressEntries.map((entry) => {
      const style = getTicketProgressFeedStyle(entry)
      const Icon = style.lane === 'closed'
        ? CheckCircle2
        : style.lane === 'process'
          ? TimerReset
          : style.lane === 'hold'
            ? TriangleAlert
            : style.lane === 'waiting'
              ? Route
              : ListTodo

      return { ...entry, ...style, Icon }
    })
  ), [ticket.progressEntries])
  const hiddenProgressFeedCount = Math.max(progressFeed.length - ACTIVITY_CARD_PREVIEW_COUNT, 0)
  const visibleProgressFeed = showAllProgressFeed
    ? progressFeed
    : progressFeed.slice(0, ACTIVITY_CARD_PREVIEW_COUNT)

  function addActivityFiles(files: File[]) {
    if (files.length === 0) return
    setActivityFiles(current => [...current, ...files].slice(0, MAX_ACTIVITY_FILES))
  }

  function clearActivityDraft() {
    setCardTitleDraft('')
    setNoteDraft('')
    setActivityFiles([])
    setIsCardComposerOpen(false)
  }

  async function saveProgress() {
    if (!cardTitleDraft.trim()) {
      toast.error('กรุณาระบุชื่อการ์ดก่อนบันทึก')
      return
    }

    const payload = {
      workState: cardLane === 'workState' ? cardTitleDraft.trim() : undefined,
      blockerReason: cardLane === 'blockerReason' ? cardTitleDraft.trim() : undefined,
      nextAction: undefined,
      note: noteDraft.trim() || undefined,
      expectedUpdatedAt: ticket.updatedAt,
    }

    try {
      const filesToUpload = activityFiles
      const result = await updateProgress.mutateAsync(payload)
      if (filesToUpload.length > 0) {
        if (!result.progressEntryId) {
          toast.error('เพิ่มการ์ดแล้ว แต่ยังไม่สามารถผูกรูปกับการ์ดได้')
          clearActivityDraft()
          return
        }

        setUploadingActivityFiles(true)
        try {
          for (const file of filesToUpload) {
            const uploaded = await uploadApi.upload(file, 'tickets')
            await addAttachment.mutateAsync({
              url: uploaded.url,
              fileName: uploaded.fileName,
              contentType: uploaded.contentType,
              sizeBytes: uploaded.sizeBytes,
              stage: 'Progress',
              ticketProgressEntryId: result.progressEntryId,
            })
          }
          toast.success('เพิ่มการ์ดพร้อมรูปแล้ว')
        } catch (error) {
          toast.error(`เพิ่มการ์ดแล้ว แต่แนบรูปไม่สำเร็จ: ${apiMessage(error)}`)
        } finally {
          setUploadingActivityFiles(false)
        }
      } else {
        toast.success('เพิ่มการ์ดในบอร์ดแล้ว')
      }
      clearActivityDraft()
    } catch (error) {
      toast.error(apiMessage(error))
    }
  }

  return (
    <section>
        {currentStepLabel && <Badge variant="info">{currentStepLabel}</Badge>}

      <div className="rounded-md border border-border bg-background p-4 mb-3">
        <div className="flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">กิจกรรมระหว่างการดำเนินงาน</h3>
        </div>
        {canComposeProgress && (
        <div>
          <Button className="w-full" onClick={() => setIsCardComposerOpen(true)}>
            <PlusIcon className="h-4 w-4" /> เพิ่มบันทึกการดำเนินงาน
          </Button>
        </div>
      )}
        <div className="mt-4 space-y-3">
          {progressFeed.length === 0 ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีการ์ดกิจกรรมในช่วงการดำเนินงาน</p>
          ) : (
            <>
              {visibleProgressFeed.map((entry, index) => {
                const Icon = entry.Icon
                return (
          <article
            key={entry.id}
            data-progress-lane={entry.lane}
            className={`rounded-lg border p-4 ${entry.surfaceClass}`}
          >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 rounded-full border p-2 ${entry.iconClass}`}>
                        <Icon className="h-4 w-4 text-current" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{entry.title}</p>
                          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${entry.badgeClass}`}>
                            {entry.laneLabel}
                          </span>
                          {index === 0 && <Badge variant="secondary">latest</Badge>}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          โดย {entry.createdByEmployeeName} • {thaiDateTime(entry.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {entry.ownerEmployeeName && <Badge variant="outline">{entry.ownerEmployeeName}</Badge>}
                      {entry.dueAt && <Badge variant="secondary">กำหนด: {thaiDateTime(entry.dueAt)}</Badge>}
                    </div>
                  </div>
                  {entry.note && <p className="mt-3 whitespace-pre-wrap text-sm leading-5 text-foreground">{entry.note}</p>}
                  {!!entry.attachments?.length && (
                    <div className="mt-3 border-t border-border/70 pt-3">
                      <AttachmentList attachments={entry.attachments} />
                    </div>
                  )}
                </article>
                )
              })}
              {hiddenProgressFeedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllProgressFeed(value => !value)}
                  className="flex h-10 w-full items-center justify-center rounded-md bg-background text-sm font-medium text-gray-300 transition-colors hover:text-gray-500 cursor:pointer"
                >
                  {showAllProgressFeed ? 'Show less' : `Show ${hiddenProgressFeedCount} more`}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {canComposeProgress && isCardComposerOpen && (
        <Modal open={isCardComposerOpen} onClose={() => setIsCardComposerOpen(false)} title="เพิ่มบันทึกการดำเนินงาน" size="lg">
        <section className="space-y-6">
          <div className="hidden">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Add Activity</h3>
              <p className="mt-1 text-xs text-muted-foreground">เพิ่มการ์ดใหม่พร้อม note/log แล้วระบบจะเรียงต่อใน activity feed ตามเวลาทันที</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'workState', label: 'ดำเนินการ', className: 'border-sky-600 bg-sky-600 text-white shadow-sm' },
              { key: 'blockerReason', label: 'รอ / ติดขัด', className: 'border-amber-500 bg-amber-500 text-white shadow-sm' },
            ].map(item => (
              <button
                key={item.key}
                type="button"
                onClick={() => setCardLane(item.key as 'workState' | 'blockerReason')}
                className={`min-h-15 rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${
                  cardLane === item.key ? item.className : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="block text-[11px] font-medium opacity-75">ประเภทบันทึก</span>
                <span className="mt-1 block">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label>หัวข้อการบันทึก</Label>
              <Input
                value={cardTitleDraft}
                maxLength={200}
                onChange={event => setCardTitleDraft(event.target.value)}
                placeholder={laneComposerMeta[cardLane].placeholder}
              />
              <div className="flex flex-wrap gap-2">
                {laneComposerMeta[cardLane].presets.slice(0, 8).map(preset => (
                  <button
                    key={preset.key}
                    type="button"
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                    onClick={() => setCardTitleDraft(preset.label)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <Label>รายละเอียด / log ของการ์ด</Label>
            <Textarea
              rows={3}
              maxLength={2000}
              value={noteDraft}
              onChange={event => setNoteDraft(event.target.value)}
              placeholder="บันทึกรายละเอียดที่ทีมและผู้เกี่ยวข้องควรเห็นจากการ์ดใบนี้"
            />
          </div>
          {canAttachActivityFiles && <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <Label>รูปกิจกรรม</Label>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                activityFiles.length > 0 ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'
              }`}>
                {activityFiles.length}/{MAX_ACTIVITY_FILES} รูป
              </span>
            </div>
            <label className={`flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-4 text-center hover:border-primary hover:bg-primary/5 ${
              activityFiles.length > 0 ? 'border-primary bg-primary/5' : 'border-slate-300 bg-slate-50'
            }`}>
              <ImagePlus className="h-5 w-5 text-primary" />
              <span className="mt-2 text-sm font-medium">{activityFiles.length > 0 ? 'เพิ่มรูปกิจกรรม' : 'เลือกรูปแนบการ์ด'}</span>
              <span className="mt-1 text-xs text-muted-foreground">
                {activityFiles.length > 0 ? `เลือกแล้ว ${activityFiles.length} รูป` : 'JPG, PNG หรือ WEBP'}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={savingProgress || activityFiles.length >= MAX_ACTIVITY_FILES}
                className="hidden"
                onChange={event => {
                  const selectedFiles = Array.from(event.currentTarget.files ?? [])
                  event.currentTarget.value = ''
                  addActivityFiles(selectedFiles)
                }}
              />
            </label>
            {activityFiles.length > 0 && (
              <div className="space-y-2 rounded-md border border-border bg-muted/30 p-2">
                {activityFiles.map((file, index) => (
                  <PendingTicketFileItem
                    key={`${file.name}-${file.lastModified}-${index}`}
                    file={file}
                    disabled={savingProgress}
                    onRemove={() => setActivityFiles(current => current.filter((_, itemIndex) => itemIndex !== index))}
                  />
                ))}
              </div>
            )}
          </div>}
          {!canAttachActivityFiles && (
            <div className="flex items-center gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-muted-foreground">
              <ImagePlus className="h-4 w-4 shrink-0" />
              <span>บัญชีนี้ไม่มีสิทธิ์แนบรูปกิจกรรม</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" disabled={savingProgress} onClick={() => setIsCardComposerOpen(false)}>ยกเลิก</Button>
            <Button type="button" onClick={saveProgress} loading={savingProgress} disabled={savingProgress}>บันทึกการ์ด</Button>
          </div>
        </section>
        </Modal>
      )}
    </section>
  )
}

function isImageAttachment(attachment: TicketAttachmentDto) {
  return attachment.contentType?.startsWith('image/')
    || /\.(?:jpe?g|png|webp|gif)(?:[?#].*)?$/i.test(attachment.url)
}

function TicketImagePreviewModal({
  url,
  fileName,
  onClose,
}: {
  url: string
  fileName: string
  onClose: () => void
}) {
  return (
    <Modal open onClose={onClose} title={fileName} size="xl">
      <div className="space-y-3">
        {/* <div className="flex justify-end">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-whited"
          >
            <ExternalLink className="h-4 w-4" />
            เปิดไฟล์
          </a>
        </div> */}
        <div className="overflow-hidden rounded-md border border-border bg-muted">
          <img src={url} alt={fileName} className="max-h-[72dvh] w-full object-contain" />
        </div>
      </div>
    </Modal>
  )
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
  const [previewOpen, setPreviewOpen] = useState(false)
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
    <>
      <button type="button" onClick={() => setPreviewOpen(true)} className="group block w-full min-w-0 text-left">
        <div className="aspect-[4/3] overflow-hidden bg-muted">
          <img src={url} alt={fileName} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" />
        </div>
        <div className={`flex items-center gap-2 px-3 py-2 text-xs ${list ? '' : 'border-t border-border'}`}>
          <span className="min-w-0 flex-1 truncate">{fileName}</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </div>
      </button>
      {previewOpen && (
        <TicketImagePreviewModal
          url={url}
          fileName={fileName}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </>
  )
}

function AttachmentList({ attachments }: { attachments: TicketAttachmentDto[] }) {
  if (attachments.length === 0) {
    return <p className="py-6 text-sm text-muted-foreground">ไม่มีไฟล์แนบ</p>
  }

  return (
    <div className="grid grid-cols-2 gap-3 py-3 sm:grid-cols-3 lg:grid-cols-2">
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

function UploadedEvidenceItem({
  attachment,
  disabled,
  deleting,
  onDelete,
}: {
  attachment: TicketAttachmentDto
  disabled: boolean
  deleting: boolean
  onDelete: () => void
}) {
  const url = useProtectedFileUrl(attachment.url)
  const isImage = isImageAttachment(attachment)

  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-white p-2.5 shadow-sm">
      {isImage && url ? (
        <img src={url} alt={attachment.fileName} className="h-14 w-14 shrink-0 rounded-md object-cover" />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <FileText className="h-6 w-6 text-primary" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{attachment.fileName}</p>
        <p className="mt-0.5 text-xs text-emerald-600">อัปโหลดแล้ว</p>
      </div>
      <button
        type="button"
        title="ลบภาพที่อัปโหลดแล้ว"
        disabled={disabled}
        onClick={onDelete}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-destructive disabled:opacity-50"
      >
        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </button>
    </div>
  )
}

function CompletionModal({ ticket, onClose }: { ticket: TicketDetailDto; onClose: () => void }) {
  const saveWork = useUpdateTicketWorkDetail(ticket.id)
  const resolveWork = useResolveTicket(ticket.id)
  const addAttachment = useAddTicketAttachment(ticket.id)
  const deleteAttachment = useDeleteTicketAttachment(ticket.id)
  const [problemType, setProblemType] = useState<TicketProblemType | ''>(ticket.problemType ?? '')
  const [resolution, setResolution] = useState(ticket.resolutionNote ?? '')
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | undefined>()
  const uploadedEvidence = ticket.attachments.filter(item => item.stage === 'Resolved')
  const totalImages = uploadedEvidence.length + files.length
  const busy = saveWork.isPending || resolveWork.isPending || uploading || !!deletingId

  async function removeUploaded(attachment: TicketAttachmentDto) {
    if (!window.confirm('ลบภาพหลักฐานนี้หรือไม่')) return
    setDeletingId(attachment.id)
    try {
      await deleteAttachment.mutateAsync(attachment.id)
      toast.success('ลบภาพหลักฐานแล้ว')
    } catch (error) {
      toast.error(apiMessage(error))
    } finally {
      setDeletingId(undefined)
    }
  }

  async function submit() {
    if (!problemType) return toast.error('กรุณาเลือกประเภทปัญหา')
    if (!resolution.trim()) return toast.error('กรุณาระบุรายละเอียดการดำเนินงานและผลการแก้ไข')
    if (totalImages === 0) return toast.error('กรุณาแนบภาพประกอบการจบงานอย่างน้อย 1 ภาพ')
    if (totalImages > MAX_COMPLETION_FILES) {
      return toast.error(`ภาพประกอบเกิน ${MAX_COMPLETION_FILES} ภาพ กรุณาลบภาพที่อัปโหลดแล้วออกก่อนส่งตรวจ`)
    }

    try {
      const saved = await saveWork.mutateAsync({
        problemType,
        resolutionNote: resolution.trim(),
        expectedUpdatedAt: ticket.updatedAt,
      })
      setUploading(true)
      for (const file of files) {
        const uploaded = await uploadApi.upload(file, 'tickets')
        await addAttachment.mutateAsync({
          url: uploaded.url,
          fileName: uploaded.fileName,
          contentType: uploaded.contentType,
          sizeBytes: uploaded.sizeBytes,
          stage: 'Resolved',
        })
        // ตัดไฟล์ที่ขึ้น server สำเร็จแล้วออกจาก state กันอัปโหลดซ้ำเมื่อกดส่งใหม่หลังเกิด error
        setFiles(current => current.filter(item => item !== file))
      }
      await resolveWork.mutateAsync(saved.updatedAt)
      toast.success('ส่งงานเพื่อตรวจสอบแล้ว')
      onClose()
    } catch (error) {
      toast.error(apiMessage(error))
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={`บันทึกจบงาน · ${ticket.ticketNo}`} size="md">
      <div className="space-y-5">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-900">สรุปงานก่อนส่งตรวจ</p>
          <p className="mt-1 text-xs leading-5 text-emerald-800">ข้อมูลชุดนี้จะแสดงให้ผู้แจ้งเรื่องและผู้ตรวจรับใช้ยืนยันผลการดำเนินงาน</p>
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">ประเภทปัญหา <span className="text-destructive">*</span></span>
          <Select value={problemType} onChange={event => setProblemType(event.target.value as TicketProblemType | '')}>
            <option value="">— เลือกประเภท —</option>
            {(Object.keys(PROBLEM_TYPE_LABEL) as TicketProblemType[]).map(item => (
              <option key={item} value={item}>{PROBLEM_TYPE_LABEL[item]}</option>
            ))}
          </Select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">รายละเอียดการดำเนินงานและผลการแก้ไข <span className="text-destructive">*</span></span>
          <textarea rows={6} maxLength={2000} value={resolution} onChange={event => setResolution(event.target.value)} placeholder="ระบุสิ่งที่ดำเนินการ ผลลัพธ์ และข้อควรทราบสำหรับผู้ตรวจรับ" className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
        </label>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <Label>ภาพประกอบการจบงาน <span className="text-destructive">*</span></Label>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              totalImages > MAX_COMPLETION_FILES
                ? 'bg-destructive/10 text-destructive'
                : totalImages > 0 ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'
            }`}>
              {totalImages}/{MAX_COMPLETION_FILES} ภาพ
            </span>
          </div>
          {uploadedEvidence.length > 0 && (
            <div className="space-y-2 rounded-md border border-border bg-muted/30 p-2">
              <p className="px-1 pt-1 text-xs text-muted-foreground">ภาพที่อัปโหลดไว้แล้ว — ลบได้ก่อนส่งตรวจ</p>
              {uploadedEvidence.map(item => (
                <UploadedEvidenceItem
                  key={item.id}
                  attachment={item}
                  disabled={busy}
                  deleting={deletingId === item.id}
                  onDelete={() => removeUploaded(item)}
                />
              ))}
            </div>
          )}
          <label className={`flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 text-center hover:border-primary hover:bg-primary/5 ${
            totalImages > 0 ? 'border-primary bg-primary/5' : 'border-slate-300 bg-slate-50'
          }`}>
            <ImagePlus className="h-5 w-5 text-primary" />
            <span className="mt-2 text-sm font-medium">{totalImages > 0 ? 'เพิ่มภาพหลักฐาน' : 'เลือกภาพหลักฐาน'}</span>
            <span className="mt-1 text-xs text-muted-foreground">{totalImages > 0 ? `มีแล้ว ${totalImages} ภาพ` : 'JPG, PNG หรือ WEBP'}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={busy || totalImages >= MAX_COMPLETION_FILES}
              className="hidden"
              onChange={event => {
                const selectedFiles = Array.from(event.currentTarget.files ?? [])
                event.currentTarget.value = ''
                setFiles(current => [...current, ...selectedFiles].slice(0, Math.max(0, MAX_COMPLETION_FILES - uploadedEvidence.length)))
              }}
            />
          </label>
          {files.length > 0 && (
            <div className="space-y-2 rounded-md border border-border bg-muted/30 p-2">
              {files.map((file, index) => (
                <PendingTicketFileItem
                  key={`${file.name}-${file.lastModified}-${index}`}
                  file={file}
                  disabled={busy}
                  onRemove={() => setFiles(current => current.filter((_, itemIndex) => itemIndex !== index))}
                />
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" disabled={busy} onClick={onClose}>ยกเลิก</Button>
          <Button loading={busy} disabled={busy} onClick={submit}><Send className="h-4 w-4" /> ยืนยันส่งตรวจจบ</Button>
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
                {candidate.isRecommended ? 'แนะนำ · ' : ''}{candidate.employeeName}
                {!candidate.isInTargetDepartment && candidate.departmentName ? ` · ${candidate.departmentName}` : ''}
                {' · '}{candidate.employeeCode} · งานค้าง {candidate.activeTicketCount}
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
  const [subjectId, setSubjectId] = useState(ticket.subjectId ?? '')
  const [otherTopicText, setOtherTopicText] = useState(ticket.otherTopicText ?? '')
  const [detail, setDetail] = useState(ticket.detail ?? '')
  const [locationText, setLocationText] = useState(ticket.locationText ?? '')
  const { data: categories = [] } = useManagedTicketCategories(ticket.targetCompanyId, ticket.targetDepartmentId ?? '')
  const { data: topics = [] } = useManagedTicketTopics(ticket.targetCompanyId, ticket.targetDepartmentId ?? '', categoryId ?? '')
  const { data: subjects = [] } = useManagedTicketSubjects(ticket.targetCompanyId, ticket.targetDepartmentId ?? '', categoryId ?? '', topicId ?? '')
  const selectedTopic = topics.find(topic => topic.id === topicId)
  const selectedSubject = subjects.find(subject => subject.id === subjectId)
  const requiresOther = selectedTopic?.name.trim() === 'อื่น ๆ' || selectedSubject?.name.trim() === 'อื่น ๆ'

  async function submit() {
    if (!categoryId || !topicId) return toast.error('กรุณาเลือกหมวดและหมวดย่อย')
    if (requiresOther && !otherTopicText.trim()) return toast.error('กรุณาระบุหัวข้ออื่น ๆ')
    try {
      await triage.mutateAsync({
        categoryId,
        topicId,
        subjectId: subjectId || undefined,
        otherTopicText: requiresOther ? otherTopicText.trim() : undefined,
        detail: detail.trim() || undefined,
        priority: ticket.priority,
        locationText: locationText.trim() || undefined,
        vehicleText: ticket.vehicleText ?? undefined,
        expectedUpdatedAt: ticket.updatedAt,
      })
      toast.success('แก้ไขข้อมูลแล้ว')
      onClose()
    } catch (error) {
      toast.error(apiMessage(error))
    }
  }

  return (
    <Modal open onClose={onClose} title="แก้ไขข้อมูลใบแจ้งเรื่อง" size="lg">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>หมวด</Label>
          <Select value={categoryId} onChange={event => { setCategoryId(event.target.value); setTopicId(''); setSubjectId(''); setOtherTopicText('') }}>
            <option value="">— เลือกหมวด —</option>
            {categories.filter(item => item.isActive).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>หัวข้อย่อย</Label>
          <Select value={topicId} onChange={event => { setTopicId(event.target.value); setSubjectId(''); setOtherTopicText('') }}>
            <option value="">— เลือกหัวข้อ —</option>
            {topics.filter(item => item.isActive).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>หัวข้อ</Label>
          <Select value={subjectId} disabled={!topicId} onChange={event => setSubjectId(event.target.value)}>
            <option value="">— ไม่ระบุ —</option>
            {subjects.filter(item => item.isActive).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
        </div>
        {requiresOther && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label>ระบุหัวข้ออื่น ๆ *</Label>
            <Input value={otherTopicText} onChange={event => setOtherTopicText(event.target.value)} maxLength={200} />
          </div>
        )}
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Detail</Label>
          <textarea
            rows={5}
            maxLength={2000}
            value={detail}
            onChange={event => setDetail(event.target.value)}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        {/* งานภายในไม่ใช้สถานที่ — เปิดเฉพาะ ticket จาก external portal (แจ้งซ่อม) */}
        {ticket.requester.type === 'External' && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label>สถานที่</Label>
            <Input value={locationText} onChange={event => setLocationText(event.target.value)} maxLength={200} />
          </div>
        )}
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

function RequestCancellationModal({ ticket, onClose }: { ticket: TicketDetailDto; onClose: () => void }) {
  const requestCancellation = useRequestTicketCancellation(ticket.id)
  const [reason, setReason] = useState('')

  async function submit() {
    const trimmedReason = reason.trim()
    if (trimmedReason.length < 1) {
      toast.error('กรุณาระบุเหตุผลอย่างน้อย 1 ตัวอักษร')
      return
    }

    try {
      await requestCancellation.mutateAsync({
        reason: trimmedReason,
        expectedUpdatedAt: ticket.updatedAt,
      })
      toast.success('ส่งคำขอยกเลิกแล้ว')
      onClose()
    } catch (error) {
      toast.error(apiMessage(error))
    }
  }

  return (
    <Modal open onClose={onClose} title="ส่งคำขอยกเลิก" size="sm">
      <div className="space-y-4">
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          คำขอนี้จะถูกส่งให้ผู้ดูแลของ {ticket.targetDepartmentName ?? ticket.targetCompanyName} พิจารณา Ticket จะยังไม่ถูกยกเลิกทันที
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ticket-cancellation-reason">เหตุผลที่ต้องการยกเลิก *</Label>
          <textarea
            id="ticket-cancellation-reason"
            rows={5}
            maxLength={1000}
            value={reason}
            onChange={event => setReason(event.target.value)}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            placeholder="ระบุเหตุผลที่ต้องการยกเลิก Ticket นี้"
          />
          <p className="text-right text-xs text-muted-foreground">{reason.length}/1000</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={requestCancellation.isPending} onClick={onClose}>ยกเลิก</Button>
          <Button
            variant="destructive"
            loading={requestCancellation.isPending}
            disabled={reason.trim().length < 1}
            onClick={submit}
          >
            ส่งคำขอยกเลิก
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function CancellationReviewModal({
  ticket,
  decision,
  onClose,
}: {
  ticket: TicketDetailDto
  decision: 'approve' | 'reject'
  onClose: () => void
}) {
  const approve = useApproveTicketCancellation(ticket.id)
  const reject = useRejectTicketCancellation(ticket.id)
  const [note, setNote] = useState('')
  const isApprove = decision === 'approve'
  const isReviewing = approve.isPending || reject.isPending

  async function submit() {
    if (!isApprove && !note.trim()) return toast.error('กรุณาระบุเหตุผลที่ไม่อนุมัติ')

    try {
      if (isApprove) {
        await approve.mutateAsync({
          reviewNote: note.trim() || undefined,
          expectedUpdatedAt: ticket.updatedAt,
        })
        toast.success('อนุมัติการยกเลิก Ticket แล้ว')
      } else {
        await reject.mutateAsync({
          reviewNote: note.trim(),
          expectedUpdatedAt: ticket.updatedAt,
        })
        toast.success('ไม่อนุมัติคำขอยกเลิกแล้ว')
      }
      onClose()
    } catch (error) {
      toast.error(apiMessage(error))
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isApprove ? 'อนุมัติการยกเลิก' : 'ไม่อนุมัติการยกเลิก'}
      size="sm"
    >
      <div className="space-y-4">
        <div className="rounded-md bg-muted p-3 text-sm">
          <p className="font-semibold">
            {ticket.ticketNo} · {ticket.otherTopicText ?? ticket.title}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
            {ticket.latestCancellationRequest?.reason ?? '-'}
          </p>
        </div>
        {isApprove && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            เมื่ออนุมัติ ระบบจะเปลี่ยน Ticket เป็นยกเลิกและปิดการมอบหมายที่กำลังทำงานอยู่
          </div>
        )}
        <label className="block text-sm font-medium">
          {isApprove ? 'หมายเหตุ (ถ้ามี)' : 'เหตุผลที่ไม่อนุมัติ *'}
          <textarea
            rows={5}
            maxLength={1000}
            value={note}
            onChange={event => setNote(event.target.value)}
            className="mt-2 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={isReviewing} onClick={onClose}>กลับ</Button>
          <Button
            variant={isApprove ? 'default' : 'destructive'}
            loading={isReviewing}
            disabled={!isApprove && !note.trim()}
            onClick={submit}
          >
            {isApprove ? 'ยืนยันอนุมัติ' : 'ยืนยันไม่อนุมัติ'}
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
  const confirmCompletion = useConfirmTicketCompletion(id)
  const startWork = useStartTicket(id)
  const saveWorkForStart = useUpdateTicketWorkDetail(id)
  const [modal, setModal] = useState<'assign' | 'triage' | 'reject' | 'return' | 'close' | 'completion' | 'events' | 'cancelRequest' | 'approveCancellation' | 'rejectCancellation' | null>(null)

  async function acceptTicket() {
    if (!ticket) return
    try {
      await accept.mutateAsync(ticket.updatedAt)
      toast.success('รับเรื่องแล้ว')
    } catch (error) {
      toast.error(apiMessage(error))
    }
  }

  async function startTicket() {
    if (!ticket) return
    try {
      const saved = await saveWorkForStart.mutateAsync({ expectedUpdatedAt: ticket.updatedAt })
      await startWork.mutateAsync(saved.updatedAt)
      toast.success('เริ่มดำเนินการแล้ว')
    } catch (error) {
      toast.error(apiMessage(error))
    }
  }

  async function confirmTicketCompletion() {
    if (!ticket) return
    try {
      await confirmCompletion.mutateAsync(ticket.updatedAt)
      toast.success('บันทึกจบงานตรวจรับเรียบร้อย')
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
    || ticket.actions.canStart
    || ticket.actions.canReturnForRevision
    || ticket.actions.canClose
    || ticket.actions.canResolve
  const canReviewCancellation = ticket.actions.isReceiverSide
    && ticket.latestCancellationRequest?.status === 'Pending'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div className="min-w-0">
          <Link href="/tickets" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> กลับ
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="flex items-center gap-1.5 text-xl font-semibold">
              <SourceChannelIcon channel={ticket.sourceChannel} className="h-5 w-5 shrink-0" />
              {ticket.ticketNo}
            </h1>
            <Badge className={TICKET_STATUS_CLASS[ticket.status]} data-ticket-status={ticket.status}>
              {TICKET_STATUS_LABEL[ticket.status]}
            </Badge>
            <Badge variant={ticket.priority === 'Critical' ? 'destructive' : ticket.priority === 'High' ? 'warning' : 'secondary'}>
              {PRIORITY_LABEL[ticket.priority]}
            </Badge>
          </div>
          {/* title = ชื่อหัวข้อ (subject) — เคส "อื่น ๆ" แสดงข้อความที่ผู้แจ้งระบุแทน */}
          <p className="mt-2 text-base font-medium">
            {ticket.otherTopicText ?? ticket.title}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button variant="outline" onClick={() => setModal('events')}>
            <History className="h-4 w-4" /> เหตุการณ์ ({ticket.auditEvents.length})
          </Button>
          {ticket.actions.isRequester && ticket.status === 'AwaitingRequesterConfirmation' && (
            <Button loading={confirmCompletion.isPending} onClick={confirmTicketCompletion}>
              <CheckCircle2 className="h-4 w-4" /> บันทึกจบงานตรวจรับ
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
                  <Pencil className="h-4 w-4" /> แก้ไขข้อมูล
                </Button>}
                {ticket.actions.canAssign && <Button onClick={() => setModal('assign')}>
                  <UserRoundCheck className="h-4 w-4" /> {ticket.currentAssignment ? 'เปลี่ยนผู้รับผิดชอบ' : 'มอบหมายงาน'}
                </Button>}
                {ticket.actions.canStart && (
                  <Button loading={startWork.isPending || saveWorkForStart.isPending} onClick={startTicket}>
                    <Play className="h-4 w-4" /> เริ่มงาน
                  </Button>
                )}
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
                {ticket.actions.canResolve && (
                  <Button onClick={() => setModal('completion')}>
                    <Send className="h-4 w-4" /> ส่งงานเพื่อตรวจสอบ
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <StatusStationLine
        categoryName={ticket.categoryName}
        topicName={ticket.topicName}
        subjectName={ticket.subjectName ?? ticket.title}
        status={ticket.status}
        workflowName={ticket.workflowName}
        workflowAutoAcknowledgeAfterDays={ticket.workflowAutoAcknowledgeAfterDays}
        workflowBoardSteps={ticket.workflowBoardSteps}
        workflowSteps={ticket.workflowSteps}
        workflowCurrentStepKey={ticket.workflowCurrentStepKey}
        workflowCurrentStepIndexByStatus={ticket.workflowCurrentStepIndexByStatus}
      />

      {ticket.actions.isRequester && ticket.latestCancellationRequest?.status === 'Pending' && (
        <div className="flex gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-500">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">กำลังรอพิจารณาคำขอยกเลิก</p>
            <p className="mt-1 whitespace-pre-wrap text-sm opacity-80">{ticket.latestCancellationRequest.reason}</p>
            <p className="mt-1 text-xs opacity-70">ส่งเมื่อ {thaiDateTime(ticket.latestCancellationRequest.requestedAt)}</p>
          </div>
        </div>
      )}

      {canReviewCancellation && (
        <div className="flex flex-wrap gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-500">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">มีคำขอยกเลิกจากผู้แจ้ง</p>
            <p className="mt-1 whitespace-pre-wrap text-sm opacity-80">
              {ticket.latestCancellationRequest?.reason}
            </p>
            <p className="mt-1 text-xs opacity-70">
              ส่งเมื่อ {thaiDateTime(ticket.latestCancellationRequest?.requestedAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <Button variant="outline" onClick={() => setModal('rejectCancellation')}>
              <XCircle className="h-4 w-4" /> ไม่อนุมัติ
            </Button>
            <Button onClick={() => setModal('approveCancellation')}>
              <CheckCircle2 className="h-4 w-4" /> อนุมัติยกเลิก
            </Button>
          </div>
        </div>
      )}

      {ticket.actions.isRequester && ticket.latestCancellationRequest?.status === 'Rejected' && (
        <div className="flex gap-3 rounded-md border border-red-500/30 bg-red-500/10 p-4 text-red-900 dark:text-red-400">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">คำขอยกเลิกไม่ได้รับอนุมัติ</p>
            <p className="mt-1 whitespace-pre-wrap text-sm opacity-80">
              {ticket.latestCancellationRequest.reviewNote ?? 'ไม่ระบุเหตุผล'}
            </p>
          </div>
        </div>
      )}

      {ticket.actions.isRequester && ticket.status === 'Cancelled' && (
        <div className="flex gap-3 rounded-md border border-border bg-muted/50 p-4 text-muted-foreground">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">ใบแจ้งเรื่องนี้ถูกยกเลิกแล้ว</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{ticket.cancellationReason ?? '-'}</p>
            <p className="mt-1 text-xs">อนุมัติโดย {ticket.cancelledByEmployeeName ?? 'ผู้รับผิดชอบ'} · {thaiDateTime(ticket.cancelledAt)}</p>
          </div>
        </div>
      )}

      {ticket.actions.canRequestCancellation && (
        <div className="flex flex-wrap gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-500">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">ส่งใบแจ้งเรื่องแล้ว ไม่สามารถยกเลิกด้วยตนเองได้</p>
            <p className="mt-1 text-sm opacity-80">
              ส่งคำขอให้ผู้ดูแลของ {ticket.targetDepartmentName ?? ticket.targetCompanyName} พิจารณา ยังคงสถานะ Ticket เดิมจนกว่าจะอนุมัติ
            </p>
          </div>
          <Button variant="outline" onClick={() => setModal('cancelRequest')}>
            ขอยกเลิก
          </Button>
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
              <InfoRow
                label="หมวด/ย่อย/หัวข้อ"
                value={ticket.requestType === 'External'
                  ? [ticket.externalTicketCategoryName, ticket.externalTicketTopicName, ticket.externalTicketSubjectName]
                      .filter(Boolean).join(' / ') || '-'
                  : [ticket.categoryName ?? '-', ticket.topicName ?? '-', ticket.otherTopicText]
                      .filter(Boolean).join(' / ')}
              />
              <InfoRow label="รายละเอียด" value={ticket.detail} />
            </dl>
          </section>

          <div className="grid gap-6 sm:grid-cols-2">
            <section>
              <h2 className="border-b border-border pb-2 text-sm font-semibold">ผู้แจ้ง</h2>
              <dl className="divide-y divide-border/60">
                <InfoRow label="ผู้แจ้ง">
                  <div className="flex items-center gap-2">
                    <span>
                      {ticket.requester.nickname
                        ? `${ticket.requesterName} (${ticket.requester.nickname})`
                        : ticket.requesterName}
                    </span>
                    <Badge variant={ticket.requester.type === 'External' ? 'destructive' : 'secondary'}>
                      {ticket.requester.type === 'External' ? 'ภายนอก' : 'ภายใน'}
                    </Badge>
                  </div>
                </InfoRow>
                <InfoRow label="บริษัทผู้แจ้ง" value={ticket.sourceCompanyName} />
                <InfoRow label="แผนกผู้แจ้ง" value={ticket.sourceDepartmentName} />
                <InfoRow label="ติดต่อ" value={[ticket.contactPhone, ticket.contactNote].filter(Boolean).join(' · ')} />
                <InfoRow label="เปิดเมื่อ" value={thaiDateTime(ticket.createdAt)} />
              </dl>
            </section>

            <section>
              <h2 className="border-b border-border pb-2 text-sm font-semibold">ปลายทาง</h2>
              <dl className="divide-y divide-border/60">
                <InfoRow label="บริษัทผู้รับ" value={ticket.targetCompanyName} />
                <InfoRow label="แผนกผู้รับ" value={ticket.targetDepartmentName ?? (ticket.requestType === 'External' ? 'รอ Supervisor จ่ายงาน (ไม่ผูกแผนก)' : '-')} />
              </dl>
            </section>
            <section>

            </section>
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
          </div>

          <section>
            <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
              <h2 className="text-sm font-semibold">หลักฐานตอนเปิดเรื่อง</h2>
              <span className="text-xs text-muted-foreground">{createdAttachments.length} ไฟล์</span>
            </div>
            <AttachmentList attachments={createdAttachments} />
          </section>

          {resolvedAttachments.length > 0 && (
            <section>
              <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
                <h2 className="text-sm font-semibold">หลักฐานปิดเรื่อง</h2>
                <span className="text-xs text-muted-foreground">{resolvedAttachments.length} ไฟล์</span>
              </div>
              {(ticket.resolvedByEmployeeName || ticket.resolvedAt) && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {[
                    ticket.resolvedByEmployeeName ? `ส่งงานโดย ${ticket.resolvedByEmployeeName}` : null,
                    ticket.resolvedAt ? thaiDateTime(ticket.resolvedAt) : null,
                  ].filter(Boolean).join(' · ')}
                </p>
              )}
              <AttachmentList attachments={resolvedAttachments} />
            </section>
          )}

          {/* {(ticket.problemType
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
          )} */}
        </div>

        <div className="space-y-6">
          <BoardRuntimePanel ticket={ticket} />

          <ConversationPanel ticket={ticket} />

          {/* <section>
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
          </section> */}

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
      {modal === 'completion' && <CompletionModal ticket={ticket} onClose={() => setModal(null)} />}
      {modal === 'cancelRequest' && <RequestCancellationModal ticket={ticket} onClose={() => setModal(null)} />}
      {modal === 'approveCancellation' && (
        <CancellationReviewModal ticket={ticket} decision="approve" onClose={() => setModal(null)} />
      )}
      {modal === 'rejectCancellation' && (
        <CancellationReviewModal ticket={ticket} decision="reject" onClose={() => setModal(null)} />
      )}
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
                          {index === 0 && <Badge variant="success">latest</Badge>}
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
