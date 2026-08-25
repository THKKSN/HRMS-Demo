'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, CheckCircle2, Clock3, ExternalLink, FileText, Loader2, MapPin,
  ImagePlus, MessageSquare, Paperclip, Pencil, Play, RefreshCw, RotateCcw, Save, Send,
  ShieldCheck, Trash2,
  UserRound, Wrench, XCircle,
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
import { PageHeader } from '@/components/layout/page-header'
import {
  useAddTicketAttachment,
  useAddTicketComment,
  useAcceptTicket,
  useApproveTicketCancellation,
  useAssignTicket,
  useClaimTicket,
  useCloseTicket,
  useConfirmTicketCompletion,
  useDeleteTicketAttachment,
  useRejectTicket,
  useRejectTicketCancellation,
  useRequestTicketInfo,
  useRequestTicketCancellation,
  useReturnTicketForRevision,
  useResolveTicket,
  useResumeTicket,
  useStartTicket,
  useTicket,
  useTicketAssignmentCandidates,
  useTicketCategories,
  useTicketComments,
  useTicketTopics,
  useTriageTicket,
  useUpdateTicketWorkDetail,
  useUpdateTicketProgress,
} from '@/hooks/use-tickets'
import { uploadTicketFile } from '@/lib/upload.api'
import { useProtectedFileUrl } from '@/hooks/use-protected-file-url'
import { getTicketProgressFeedStyle } from '@/lib/ticket-progress-feed'
import { TICKET_STATUS_CLASS, TICKET_STATUS_LABEL } from '@/lib/ticket-status'

const problemTypes: { value: TicketProblemType; label: string }[] = [
  { value: 'SystemDefect', label: 'ระบบบกพร่อง' },
  { value: 'Enhancement', label: 'ปรับปรุงเพิ่มเติม' },
  { value: 'Other', label: 'อื่น ๆ' },
]

const priorityLabel: Record<TicketPriority, string> = {
  Low: 'ปกติ',
  Medium: 'กลาง',
  High: 'ด่วน',
  Critical: 'ด่วนมาก',
}

const MAX_ACTIVITY_FILES = 5
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
    <div className="flex items-center gap-3 rounded-xl border border-border bg-white p-2.5 shadow-sm dark:bg-slate-900">
      {previewUrl ? (
        <img src={previewUrl} alt={file.name} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10">
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
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-destructive disabled:opacity-50"
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

function StatusStationLine({
  categoryName,
  topicName,
  subjectName,
  status,
  workflowName,
  workflowAutoAcknowledgeAfterDays,
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
  workflowSteps: TicketDetailDto['workflowSteps']
  workflowCurrentStepKey?: string
  workflowCurrentStepIndexByStatus: TicketDetailDto['workflowCurrentStepIndexByStatus']
}) {
  const workflow = createTicketBoardWorkflowFromDto({ workflowName, workflowAutoAcknowledgeAfterDays, workflowSteps, workflowCurrentStepIndexByStatus })
    ?? resolveTicketBoardWorkflow({ categoryName, topicName, subjectName })
  const railRef = useRef<HTMLDivElement>(null)
  const stationState = (index: number) => getTicketBoardWorkflowStepState(
    workflow,
    status,
    index,
    workflowCurrentStepKey,
  )

  useEffect(() => {
    const centerCurrentStation = () => {
      const rail = railRef.current
      const currentStation = rail?.querySelector<HTMLElement>('[data-station-state="current"]')
      if (!rail || !currentStation) return
      rail.scrollLeft = currentStation.offsetLeft - (rail.clientWidth - currentStation.clientWidth) / 2
    }

    centerCurrentStation()
    window.addEventListener('resize', centerCurrentStation)
    return () => window.removeEventListener('resize', centerCurrentStation)
  }, [status, workflow.steps])

  return (
    <div className="overflow-hidden border-b border-border bg-linear-to-br from-white via-slate-50 to-sky-50/60 px-4 py-5 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-sm font-semibold text-slate-950 dark:text-slate-50">สถานะการดำเนินงาน</p></div>
        {status === 'AwaitingRequesterConfirmation' && workflow.autoAcknowledgeAfterDays ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">ระบบจะปิดงานอัตโนมัติใน {workflow.autoAcknowledgeAfterDays} วัน</span> : null}
      </div>
      <div ref={railRef} className="mt-6 overflow-x-auto scroll-smooth pb-2">
        <div className="flex min-w-max items-start px-1">
          {workflow.steps.map((step, index) => {
            const state = stationState(index)
            const nextState = index < workflow.steps.length - 1 ? stationState(index + 1) : null
            return <div key={step.key} className="flex items-start">
              <div className="w-30 text-center" data-station-state={state}>
                <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full border-4 ${state === 'complete' ? 'border-emerald-600 bg-emerald-600 text-white' : state === 'current' ? 'animate-pulse border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25' : 'border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500'}`}>
                  {state === 'complete' ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-current" />}
                </div>
                <p className={`mt-2 text-[11px] font-semibold leading-4 ${state === 'upcoming' ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>{step.label}</p>
                {state === 'current' ? <p className="mt-1 text-[9px] font-bold tracking-wide text-primary">สถานะปัจจุบัน</p> : null}
              </div>
              {nextState ? <div className={`mt-4 w-8 border-t-2 ${nextState === 'upcoming' ? 'border-dashed border-slate-300 dark:border-slate-600' : 'border-solid border-emerald-500'}`} /> : null}
            </div>
          })}
        </div>
      </div>
    </div>
  )
}

function WorkflowStepTimeline({
  categoryName,
  topicName,
  subjectName,
  status,
  workflowName,
  workflowAutoAcknowledgeAfterDays,
  workflowSteps,
  workflowCurrentStepIndexByStatus,
}: {
  categoryName?: string
  topicName?: string
  subjectName: string
  status: TicketStatus
  workflowName?: string
  workflowAutoAcknowledgeAfterDays?: number
  workflowSteps: TicketDetailDto['workflowSteps']
  workflowCurrentStepIndexByStatus: TicketDetailDto['workflowCurrentStepIndexByStatus']
}) {
  const workflow = createTicketBoardWorkflowFromDto({
    workflowName,
    workflowAutoAcknowledgeAfterDays,
    workflowSteps,
    workflowCurrentStepIndexByStatus,
  }) ?? resolveTicketBoardWorkflow({ categoryName, topicName, subjectName })

  return (
    <div className="border-b border-border bg-background px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">ขั้นตอนการดำเนินงาน</p>
          <p className="mt-1 text-xs text-muted-foreground">{workflow.name}</p>
        </div>
        {workflow.autoAcknowledgeAfterDays ? (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
            Auto รับทราบ {workflow.autoAcknowledgeAfterDays} วัน
          </span>
        ) : null}
      </div>
      <div className="mt-4 space-y-3">
        {workflow.steps.map((step, index) => {
          const state = getTicketBoardWorkflowStepState(workflow, status, index)
          const dotClass = state === 'complete'
            ? 'border-emerald-600 bg-emerald-600'
            : state === 'current'
              ? 'border-primary bg-primary'
              : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800'
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
    </div>
  )
}

function BoardRuntimeSection({ ticket }: { ticket: TicketDetailDto }) {
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
      placeholder: 'เช่น โทรกลับผู้แจ้ง, ส่งตรวจ',
      presets: presetGroups.nextAction,
    },
  } as const

  const progressFeed = ticket.progressEntries.map((entry) => {
    const style = getTicketProgressFeedStyle(entry)
    const Icon = style.lane === 'closed'
      ? CheckCircle2
      : style.lane === 'process'
        ? Wrench
        : style.lane === 'hold'
          ? AlertTriangle
          : style.lane === 'waiting'
            ? RefreshCw
            : MessageSquare

    return { ...entry, ...style, Icon }
  })
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

    try {
      const filesToUpload = activityFiles
      const result = await updateProgress.mutateAsync({
        workState: cardLane === 'workState' ? cardTitleDraft.trim() : undefined,
        blockerReason: cardLane === 'blockerReason' ? cardTitleDraft.trim() : undefined,
        nextAction: undefined,
        note: noteDraft.trim() || undefined,
        expectedUpdatedAt: ticket.updatedAt,
      })
      if (filesToUpload.length > 0) {
        if (!result.progressEntryId) {
          toast.error('เพิ่มการ์ดแล้ว แต่ยังไม่สามารถผูกรูปกับการ์ดได้')
          clearActivityDraft()
          return
        }

        setUploadingActivityFiles(true)
        try {
          for (const file of filesToUpload) {
            const uploaded = await uploadTicketFile(file)
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
    <Section title="กิจกรรมระหว่างการดำเนินงาน">
      <div className="flex flex-col gap-4">
        {canComposeProgress && (
          <button type="button" onClick={() => setIsCardComposerOpen(true)} className="order-start flex h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm active:scale-[0.99]">
            เพิ่มบันทึกการดำเนินงาน
          </button>
        )}

        {canComposeProgress && isCardComposerOpen && (
          <BottomSheet title="เพิ่มบันทึกการดำเนินงาน" onClose={() => setIsCardComposerOpen(false)}>
          <div className="space-y-6">
            <div className="hidden">
              {ticket && false && <div>
                <p className="text-sm font-semibold">Create board card</p>
                <p className="mt-1 text-xs text-muted-foreground">เพิ่มการ์ดใหม่พร้อม note/log แล้วระบบจะเรียงต่อใน activity feed ตามเวลา</p>
              </div>}
              <button
                type="button"
                disabled={savingProgress}
                onClick={saveProgress}
                className="flex h-9 shrink-0 items-center justify-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                {savingProgress ? <Loader2 className="h-4 w-4 animate-spin" /> : 'เพิ่มการ์ด'}
              </button>
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
                  className={`min-h-15 rounded-xl border px-3 py-3 text-left text-sm font-semibold ${
                    cardLane === item.key ? item.className : 'border-slate-200 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <span className="block text-[11px] font-medium opacity-75">ประเภทบันทึก</span>
                  <span className="mt-1 block">{item.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-5">
              <label className="block space-y-1.5 text-sm">
                <span className="font-semibold">หัวข้อการบันทึก</span>
                <input value={cardTitleDraft} maxLength={200} onChange={event => setCardTitleDraft(event.target.value)} placeholder={laneComposerMeta[cardLane].placeholder} className="h-11 w-full rounded-xl border border-border bg-background px-3 outline-none focus:border-primary" />
                <div className="flex flex-wrap gap-2">
                  {laneComposerMeta[cardLane].presets.slice(0, 8).map(preset => (
                    <button key={preset.key} type="button" onClick={() => setCardTitleDraft(preset.label)} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:border-primary hover:text-primary dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                      {preset.label}
                    </button>
                  ))}
                </div>
              </label>

              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">รายละเอียด / log ของการ์ด</span>
                <textarea rows={3} maxLength={2000} value={noteDraft} onChange={event => setNoteDraft(event.target.value)} placeholder="บันทึกรายละเอียดที่คนเกี่ยวข้องควรเห็นในรอบนี้" className="w-full resize-none rounded-md border border-border bg-background p-3 outline-none focus:border-primary" />
              </label>

              {canAttachActivityFiles && <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium">รูปกิจกรรม</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    activityFiles.length > 0 ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {activityFiles.length}/{MAX_ACTIVITY_FILES} รูป
                  </span>
                </div>
                <label className={`flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 text-center active:bg-primary/10 ${
                  activityFiles.length > 0 ? 'border-primary bg-primary/5' : 'border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-800'
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
                  <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-2">
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
                <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-muted-foreground dark:border-slate-600 dark:bg-slate-800">
                  <Paperclip className="h-4 w-4 shrink-0" />
                  <span>บัญชีนี้ไม่มีสิทธิ์แนบรูปกิจกรรม</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
              <button type="button" disabled={savingProgress} onClick={() => setIsCardComposerOpen(false)} className="h-11 rounded-xl border border-border text-sm font-semibold disabled:opacity-50">ยกเลิก</button>
              <button type="button" disabled={savingProgress} onClick={saveProgress} className="flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50">
                {savingProgress ? <Loader2 className="h-4 w-4 animate-spin" /> : 'บันทึกการ์ด'}
              </button>
            </div>
          </div>
          </BottomSheet>
        )}

        <div className="rounded-2xl border border-border bg-background p-3">
          <div className="mt-3 space-y-2">
            {progressFeed.length === 0 ? (
              <p className="text-xs text-muted-foreground">ยังไม่มีการ์ดกิจกรรมในช่วงการดำเนินงาน</p>
            ) : (
              <>
                {visibleProgressFeed.map((entry, index) => {
                  const Icon = entry.Icon
                  return (
            <div
              key={entry.id}
              data-progress-lane={entry.lane}
              className={`rounded-lg border p-3 ${entry.surfaceClass}`}
            >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className={`rounded-full border p-2 ${entry.iconClass}`}>
                          <Icon className="h-4 w-4 text-current" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold">{entry.title}</p>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${entry.badgeClass}`}>
                              {entry.laneLabel}
                            </span>
                            {index === 0 && <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700 dark:border-slate-500/40 dark:bg-slate-900/70 dark:text-slate-200">latest</span>}
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">{entry.createdByEmployeeName} · {thaiDate(entry.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                    {entry.note && <p className="mt-2 whitespace-pre-wrap text-xs leading-5">{entry.note}</p>}
                    {!!entry.attachments?.length && (
                      <div className="mt-3 border-t border-border/70 pt-3">
                        <AttachmentList attachments={entry.attachments} />
                      </div>
                    )}
                  </div>
                  )
                })}
                {hiddenProgressFeedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAllProgressFeed(value => !value)}
                    className="flex h-11 w-full items-center justify-center rounded-xl bg-background text-sm font-semibold text-gray-300 hover:text-gray-500"
                  >
                    {showAllProgressFeed ? 'Show less' : `Show ${hiddenProgressFeedCount} more`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Section>
  )
}

function isImageAttachment(attachment: TicketAttachmentDto) {
  return attachment.contentType?.startsWith('image/')
    || /\.(?:jpe?g|png|webp|gif)(?:[?#].*)?$/i.test(attachment.url)
}

function TicketImagePreviewSheet({
  url,
  fileName,
  onClose,
}: {
  url: string
  fileName: string
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black/80" onClick={onClose}>
      <div className="flex min-h-16 items-center justify-between gap-3 bg-background px-4" onClick={event => event.stopPropagation()}>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{fileName}</p>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border"
          title="เปิดไฟล์"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
        <button type="button" title="ปิด" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border">
          <XCircle className="h-4 w-4" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-3" onClick={event => event.stopPropagation()}>
        <img src={url} alt={fileName} className="max-h-full max-w-full object-contain" />
      </div>
    </div>
  )
}

function AttachmentLink({
  attachment,
  fileName,
}: {
  attachment: TicketAttachmentDto
  fileName: string
}) {
  const url = useProtectedFileUrl(attachment.url)
  const [previewOpen, setPreviewOpen] = useState(false)
  if (!url) return <div className="h-24 animate-pulse rounded-md bg-muted" />
  if (isImageAttachment(attachment)) {
    return (
      <>
        <button type="button" onClick={() => setPreviewOpen(true)} className="block w-full text-left">
          <div className="aspect-[4/3] overflow-hidden bg-muted">
            <img src={url} alt={fileName} loading="lazy" className="h-full w-full object-cover" />
          </div>
          <div className="flex items-center gap-2 px-2.5 py-2 text-xs">
            <span className="min-w-0 flex-1 truncate">{fileName}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </div>
        </button>
        {previewOpen && (
          <TicketImagePreviewSheet
            url={url}
            fileName={fileName}
            onClose={() => setPreviewOpen(false)}
          />
        )}
      </>
    )
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className="block">
      <div className="flex min-h-16 items-center gap-3 p-3">
        <FileText className="h-5 w-5 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate text-sm">{fileName}</span>
      </div>
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

function BottomSheet({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/40" onClick={onClose}>
      <div className="mx-auto max-h-[85vh] w-full max-w-107.5 overflow-y-auto rounded-t-lg bg-background p-4" onClick={event => event.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" title="ปิด" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-md border border-border">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function CompletionSheet({ ticket, onClose }: { ticket: TicketDetailDto; onClose: () => void }) {
  const saveWork = useUpdateTicketWorkDetail(ticket.id)
  const resolveWork = useResolveTicket(ticket.id)
  const addAttachment = useAddTicketAttachment(ticket.id)
  const [problemType, setProblemType] = useState<TicketProblemType | ''>(ticket.problemType ?? '')
  const [resolution, setResolution] = useState(ticket.resolutionNote ?? '')
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const busy = saveWork.isPending || resolveWork.isPending || uploading

  async function submit() {
    if (!problemType) return toast.error('กรุณาเลือกประเภทปัญหา')
    if (!resolution.trim()) return toast.error('กรุณาระบุรายละเอียดการดำเนินงานและผลการแก้ไข')
    if (files.length === 0) return toast.error('กรุณาแนบภาพประกอบการจบงานอย่างน้อย 1 ภาพ')

    try {
      const saved = await saveWork.mutateAsync({
        problemType,
        resolutionNote: resolution.trim(),
        expectedUpdatedAt: ticket.updatedAt,
      })
      setUploading(true)
      for (const file of files) {
        const uploaded = await uploadTicketFile(file)
        await addAttachment.mutateAsync({
          url: uploaded.url,
          fileName: uploaded.fileName,
          contentType: uploaded.contentType,
          sizeBytes: uploaded.sizeBytes,
          stage: 'Resolved',
        })
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
    <BottomSheet title="บันทึกจบงาน" onClose={onClose}>
      <div className="space-y-5 pb-2">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/40 dark:bg-emerald-950/60">
          <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">สรุปงานก่อนส่งตรวจ</p>
          <p className="mt-1 text-xs leading-5 text-emerald-800 dark:text-emerald-200">ผู้แจ้งเรื่องจะใช้ข้อมูลและภาพชุดนี้ตรวจรับงาน</p>
        </div>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">ประเภทปัญหา <span className="text-destructive">*</span></span>
          <select value={problemType} onChange={event => setProblemType(event.target.value as TicketProblemType | '')} className="h-11 w-full rounded-md border border-border bg-background px-3 outline-none focus:border-primary">
            <option value="">— เลือกประเภท —</option>
            {problemTypes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">รายละเอียดการดำเนินงานและผลการแก้ไข <span className="text-destructive">*</span></span>
          <textarea rows={6} maxLength={2000} value={resolution} onChange={event => setResolution(event.target.value)} placeholder="ระบุสิ่งที่ดำเนินการ ผลลัพธ์ และข้อควรทราบสำหรับผู้ตรวจรับ" className="w-full resize-none rounded-md border border-border bg-background p-3 outline-none focus:border-primary" />
        </label>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium">ภาพประกอบการจบงาน <span className="text-destructive">*</span></span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              files.length > 0 ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            }`}>
              {files.length}/5 ภาพ
            </span>
          </div>
          <label className={`flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 text-center active:bg-primary/10 ${
            files.length > 0 ? 'border-primary bg-primary/5' : 'border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-800'
          }`}>
            <ImagePlus className="h-5 w-5 text-primary" />
            <span className="mt-2 text-sm font-medium">{files.length > 0 ? 'เพิ่มภาพหลักฐาน' : 'เลือกภาพหลักฐาน'}</span>
            <span className="mt-1 text-xs text-muted-foreground">{files.length > 0 ? `เลือกแล้ว ${files.length} ภาพ` : 'JPG, PNG หรือ WEBP'}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={busy || files.length >= 5}
              className="hidden"
              onChange={event => {
                const selectedFiles = Array.from(event.currentTarget.files ?? [])
                event.currentTarget.value = ''
                setFiles(current => [...current, ...selectedFiles].slice(0, 5))
              }}
            />
          </label>
          {files.length > 0 && (
            <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-2">
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
        <button type="button" disabled={busy} onClick={submit} className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-green-600 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} ยืนยันส่งตรวจจบ
        </button>
      </div>
    </BottomSheet>
  )
}

function TriageSheet({ ticket, onClose }: { ticket: TicketDetailDto; onClose: () => void }) {
  const triage = useTriageTicket(ticket.id)
  const [categoryId, setCategoryId] = useState(ticket.categoryId)
  const [topicId, setTopicId] = useState(ticket.topicId)
  const [otherTopicText, setOtherTopicText] = useState(ticket.otherTopicText ?? '')
  const [priority, setPriority] = useState<TicketPriority>(ticket.priority)
  const [locationText, setLocationText] = useState(ticket.locationText ?? '')
  const [vehicleText, setVehicleText] = useState(ticket.vehicleText ?? '')
  const { data: categories = [] } = useTicketCategories({ companyId: ticket.targetCompanyId, departmentId: ticket.targetDepartmentId })
  const { data: topics = [] } = useTicketTopics({ companyId: ticket.targetCompanyId, departmentId: ticket.targetDepartmentId, categoryId })
  const selectedTopic = topics.find(topic => topic.id === topicId)
  const requiresOther = selectedTopic?.name.trim() === 'อื่น ๆ'

  async function submit() {
    if (!categoryId || !topicId) return toast.error('กรุณาเลือกหมวดและหมวดย่อย')
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
    <BottomSheet title="จัดประเภทใบแจ้งเรื่อง" onClose={onClose}>
      <div className="space-y-4">
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">หมวด</span>
          <select value={categoryId} onChange={event => { setCategoryId(event.target.value); setTopicId(''); setOtherTopicText('') }} className="h-10 w-full rounded-md border border-border bg-background px-3 outline-none focus:border-primary">
            <option value="">เลือกหมวด</option>
            {categories.filter(item => item.isActive).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">หัวข้อ</span>
          <select value={topicId} onChange={event => { setTopicId(event.target.value); setOtherTopicText('') }} className="h-10 w-full rounded-md border border-border bg-background px-3 outline-none focus:border-primary">
            <option value="">เลือกหัวข้อ</option>
            {topics.filter(item => item.isActive).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        {requiresOther && (
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">ระบุหัวข้ออื่น ๆ</span>
            <input value={otherTopicText} onChange={event => setOtherTopicText(event.target.value)} maxLength={200} className="h-10 w-full rounded-md border border-border bg-background px-3 outline-none focus:border-primary" />
          </label>
        )}
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">ความเร่งด่วน</span>
          <select value={priority} onChange={event => setPriority(event.target.value as TicketPriority)} className="h-10 w-full rounded-md border border-border bg-background px-3 outline-none focus:border-primary">
            {(Object.keys(priorityLabel) as TicketPriority[]).map(item => <option key={item} value={item}>{priorityLabel[item]}</option>)}
          </select>
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">รถ / ทะเบียน</span>
          <input value={vehicleText} onChange={event => setVehicleText(event.target.value)} maxLength={100} className="h-10 w-full rounded-md border border-border bg-background px-3 outline-none focus:border-primary" />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">สถานที่</span>
          <input value={locationText} onChange={event => setLocationText(event.target.value)} maxLength={200} className="h-10 w-full rounded-md border border-border bg-background px-3 outline-none focus:border-primary" />
        </label>
        <button type="button" disabled={triage.isPending} onClick={submit} className="flex h-11 w-full items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {triage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'บันทึก'}
        </button>
      </div>
    </BottomSheet>
  )
}

function AssignSheet({
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
    <BottomSheet title={ticket.currentAssignment ? 'เปลี่ยนผู้รับผิดชอบ' : 'มอบหมายงาน'} onClose={onClose}>
      <div className="space-y-4">
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">ผู้รับผิดชอบ</span>
          <select value={employeeId} onChange={event => setEmployeeId(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 outline-none focus:border-primary">
            <option value="">เลือกพนักงาน</option>
            {candidates.map(candidate => (
              <option key={candidate.employeeId} value={candidate.employeeId}>
                {candidate.isRecommended ? 'แนะนำ · ' : ''}{candidate.employeeName} · งานค้าง {candidate.activeTicketCount}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">คำสั่งหรือข้อมูลส่งต่อ</span>
          <textarea rows={4} maxLength={1000} value={note} onChange={event => setNote(event.target.value)} className="w-full resize-none rounded-md border border-border bg-background p-3 outline-none focus:border-primary" />
        </label>
        <button type="button" disabled={assign.isPending} onClick={submit} className="flex h-11 w-full items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {assign.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ยืนยันมอบหมาย'}
        </button>
      </div>
    </BottomSheet>
  )
}

function RejectSheet({ ticket, onClose }: { ticket: TicketDetailDto; onClose: () => void }) {
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
    <BottomSheet title="ปฏิเสธใบแจ้งเรื่อง" onClose={onClose}>
      <div className="space-y-4">
        <textarea autoFocus rows={5} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} placeholder="ระบุเหตุผล" className="w-full resize-none rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-primary" />
        <button type="button" disabled={reject.isPending || !reason.trim()} onClick={submit} className="flex h-11 w-full items-center justify-center rounded-md bg-destructive text-sm font-semibold text-white disabled:opacity-50">
          {reject.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ยืนยันปฏิเสธ'}
        </button>
      </div>
    </BottomSheet>
  )
}

function ReviewSheet({ ticket, mode, onClose }: { ticket: TicketDetailDto; mode: 'return' | 'close'; onClose: () => void }) {
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
    <BottomSheet title={isReturn ? 'ส่งงานกลับแก้ไข' : 'ตรวจผ่านและปิดงาน'} onClose={onClose}>
      <div className="space-y-4">
        <textarea autoFocus rows={5} maxLength={2000} value={note} onChange={event => setNote(event.target.value)} placeholder={isReturn ? 'สิ่งที่ต้องแก้ไข' : 'หมายเหตุการตรวจรับ'} className="w-full resize-none rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-primary" />
        <button type="button" disabled={pending || (isReturn && !note.trim())} onClick={submit} className="flex h-11 w-full items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : isReturn ? 'ยืนยันส่งกลับ' : 'ยืนยันปิดงาน'}
        </button>
      </div>
    </BottomSheet>
  )
}

function CancellationReviewSheet({
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
  const pending = approve.isPending || reject.isPending

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
    <BottomSheet title={isApprove ? 'อนุมัติการยกเลิก' : 'ไม่อนุมัติการยกเลิก'} onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-md bg-muted p-3 text-sm">
          <p className="font-semibold">{ticket.ticketNo} · {ticket.title}</p>
          <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
            {ticket.latestCancellationRequest?.reason ?? '-'}
          </p>
        </div>
        {isApprove && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-100">
            เมื่ออนุมัติ ระบบจะเปลี่ยน Ticket เป็นยกเลิกและปิดการมอบหมายที่กำลังทำงานอยู่
          </div>
        )}
        <textarea
          autoFocus
          rows={5}
          maxLength={1000}
          value={note}
          onChange={event => setNote(event.target.value)}
          placeholder={isApprove ? 'หมายเหตุ (ถ้ามี)' : 'เหตุผลที่ไม่อนุมัติ'}
          className="w-full resize-none rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-primary"
        />
        <button
          type="button"
          disabled={pending || (!isApprove && !note.trim())}
          onClick={submit}
          className={`flex h-11 w-full items-center justify-center rounded-md text-sm font-semibold text-white disabled:opacity-50 ${
            isApprove ? 'bg-primary' : 'bg-destructive'
          }`}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : isApprove ? 'ยืนยันอนุมัติ' : 'ยืนยันไม่อนุมัติ'}
        </button>
      </div>
    </BottomSheet>
  )
}

export default function TicketWorkDetailPage() {
  const { id } = useParams<{ id: string }>()
  const ticketQuery = useTicket(id)
  const commentsQuery = useTicketComments(id)
  const startWork = useStartTicket(id)
  const claimWork = useClaimTicket(id)
  const acceptTicket = useAcceptTicket(id)
  const confirmCompletion = useConfirmTicketCompletion(id)
  const saveWork = useUpdateTicketWorkDetail(id)
  const requestInfo = useRequestTicketInfo(id)
  const requestCancellation = useRequestTicketCancellation(id)
  const resumeWork = useResumeTicket(id)
  const resolveWork = useResolveTicket(id)
  const addComment = useAddTicketComment(id)
  const addAttachment = useAddTicketAttachment(id)
  const deleteAttachment = useDeleteTicketAttachment(id)
  const candidatesQuery = useTicketAssignmentCandidates(id, !!ticketQuery.data?.actions.canAssign)
  const [problemType, setProblemType] = useState<TicketProblemType | ''>('')
  const [inspection, setInspection] = useState('')
  const [resolution, setResolution] = useState('')
  const [comment, setComment] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [showInfo, setShowInfo] = useState(false)
  const [showCancellation, setShowCancellation] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)
  const [supervisorSheet, setSupervisorSheet] = useState<'triage' | 'assign' | 'reject' | 'return' | 'close' | null>(null)
  const [cancellationReview, setCancellationReview] = useState<'approve' | 'reject' | null>(null)
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

  async function acceptReceiverTicket() {
    if (!ticket) return
    await run(() => acceptTicket.mutateAsync(ticket.updatedAt), 'รับเรื่องแล้ว')
  }

  async function confirmTicketCompletion() {
    if (!ticket) return
    await run(() => confirmCompletion.mutateAsync(ticket.updatedAt), 'บันทึกจบงานตรวจรับเรียบร้อย')
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
  const hasSupervisorActions = ticket.actions.canAccept
    || ticket.actions.canTriage
    || ticket.actions.canAssign
    || ticket.actions.canReject
    || ticket.actions.canReturnForRevision
    || ticket.actions.canClose
  const canReviewCancellation = ticket.actions.isReceiverSide
    && ticket.latestCancellationRequest?.status === 'Pending'
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
          <span
            className={`shrink-0 rounded px-2 py-1 text-xs font-semibold ${TICKET_STATUS_CLASS[ticket.status]}`}
            data-ticket-status={ticket.status}
          >
            {TICKET_STATUS_LABEL[ticket.status]}
          </span>
        </div>
      </div>

      <StatusStationLine
        categoryName={ticket.categoryName}
        topicName={ticket.topicName}
        subjectName={ticket.subjectName ?? ticket.title}
        status={ticket.status}
        workflowName={ticket.workflowName}
        workflowAutoAcknowledgeAfterDays={ticket.workflowAutoAcknowledgeAfterDays}
        workflowSteps={ticket.workflowSteps}
        workflowCurrentStepKey={ticket.workflowCurrentStepKey}
        workflowCurrentStepIndexByStatus={ticket.workflowCurrentStepIndexByStatus}
      />

      <BoardRuntimeSection ticket={ticket} />

      {ticket.actions.isRequester && ticket.latestCancellationRequest?.status === 'Pending' && (
        <div className="flex gap-3 border-b border-amber-200 bg-amber-50 px-4 py-4 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">กำลังรอพิจารณาคำขอยกเลิก</p>
            <p className="mt-1 text-xs leading-5">{ticket.latestCancellationRequest.reason}</p>
            <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
              ส่งเมื่อ {thaiDate(ticket.latestCancellationRequest.requestedAt)}
            </p>
          </div>
        </div>
      )}

      {canReviewCancellation && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-4 text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">มีคำขอยกเลิกจากผู้แจ้ง</p>
              <p className="mt-1 whitespace-pre-wrap text-xs leading-5">
                {ticket.latestCancellationRequest?.reason}
              </p>
              <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                ส่งเมื่อ {thaiDate(ticket.latestCancellationRequest?.requestedAt)}
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCancellationReview('reject')}
              className="h-10 rounded-md border border-amber-300 bg-background text-sm font-semibold text-amber-900 dark:border-amber-500/40 dark:text-amber-100"
            >
              ไม่อนุมัติ
            </button>
            <button
              type="button"
              onClick={() => setCancellationReview('approve')}
              className="h-10 rounded-md bg-primary text-sm font-semibold text-primary-foreground"
            >
              อนุมัติยกเลิก
            </button>
          </div>
        </div>
      )}

      {ticket.actions.isRequester && ticket.latestCancellationRequest?.status === 'Rejected' && (
        <div className="flex gap-3 border-b border-red-200 bg-red-50 px-4 py-4 text-red-900 dark:border-red-500/40 dark:bg-red-950/60 dark:text-red-100">
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
        <div className="flex gap-3 border-b border-zinc-200 bg-zinc-100 px-4 py-4 text-zinc-800 dark:border-zinc-500/40 dark:bg-zinc-900/70 dark:text-zinc-200">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">ใบแจ้งเรื่องนี้ถูกยกเลิกแล้ว</p>
            <p className="mt-1 text-xs leading-5">{ticket.cancellationReason ?? '-'}</p>
            <p className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400">
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

      {hasSupervisorActions && (
        <Section title="จัดการงาน">
          <div className="space-y-3">
            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">{ticket.targetCompanyName} · {ticket.targetDepartmentName}</p>
              <p className="mt-1">
                {ticket.currentAssignment
                  ? `ผู้รับผิดชอบปัจจุบัน: ${ticket.currentAssignment.assignedToEmployeeName}`
                  : ticket.status === 'Open'
                    ? 'ยังไม่มีผู้รับผิดชอบ'
                    : 'ยังไม่พบข้อมูลผู้รับผิดชอบ'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ticket.actions.canAccept && (
                <button type="button" disabled={acceptTicket.isPending} onClick={acceptReceiverTicket} className="flex h-10 items-center justify-center gap-2 rounded-md border border-primary text-sm font-semibold text-primary disabled:opacity-50">
                  {acceptTicket.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  รับเรื่อง
                </button>
              )}
              {ticket.actions.canTriage && (
                <button type="button" onClick={() => setSupervisorSheet('triage')} className="flex h-10 items-center justify-center gap-2 rounded-md border border-border text-sm font-semibold">
                  <Pencil className="h-4 w-4" /> จัดประเภท
                </button>
              )}
              {ticket.actions.canAssign && (
                <button type="button" onClick={() => setSupervisorSheet('assign')} className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                  <UserRound className="h-4 w-4" />
                  {ticket.currentAssignment ? 'เปลี่ยนผู้รับผิดชอบ' : 'มอบหมายงาน'}
                </button>
              )}
              {ticket.actions.canReject && (
                <button type="button" onClick={() => setSupervisorSheet('reject')} className="flex h-10 items-center justify-center gap-2 rounded-md bg-destructive text-sm font-semibold text-white">
                  <XCircle className="h-4 w-4" /> ปฏิเสธ
                </button>
              )}
              {ticket.actions.canReturnForRevision && (
                <button type="button" onClick={() => setSupervisorSheet('return')} className="flex h-10 items-center justify-center gap-2 rounded-md border border-border text-sm font-semibold">
                  <RotateCcw className="h-4 w-4" /> ส่งกลับแก้ไข
                </button>
              )}
              {ticket.actions.canClose && (
                <button type="button" onClick={() => setSupervisorSheet('close')} className="flex h-10 items-center justify-center gap-2 rounded-md bg-green-600 text-sm font-semibold text-white">
                  <ShieldCheck className="h-4 w-4" /> ปิดงาน
                </button>
              )}
            </div>
          </div>
        </Section>
      )}

      <Section title="รายละเอียดปัญหา">
        <p className="whitespace-pre-wrap text-sm leading-6">{ticket.detail}</p>
        <div className="mt-4 space-y-2 text-xs text-muted-foreground">
          <p className="flex items-center gap-2">
            <UserRound className="h-4 w-4" />ผู้แจ้ง {ticket.requesterName}
            {ticket.requester.nickname && ` (${ticket.requester.nickname})`}
          </p>
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

      <div className="hidden">
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
              {/* {ticket && false && <div>
                <p className="mb-2 text-sm font-medium">รูปก่อนทำ</p>
                {ticket!.actions.canAddWorkAttachment ? (
                  <EditableEvidenceList
                    attachments={progressEvidence}
                    busyId={editingAttachmentId}
                    onDelete={deleteEvidence}
                    onReplace={replaceEvidence}
                  />
                ) : (
                  <AttachmentList attachments={progressEvidence} />
                )}
                {ticket!.actions.canAddWorkAttachment && (
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
              </div>} */}
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
              {false && <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">รูปหลังทำ</p>
                  {ticket!.actions.canEditWorkDetail && <span className="text-xs text-destructive">จำเป็นก่อนส่งตรวจ</span>}
                </div>
                {ticket!.actions.canAddWorkAttachment ? (
                  <EditableEvidenceList
                    attachments={resolvedEvidence}
                    busyId={editingAttachmentId}
                    onDelete={deleteEvidence}
                    onReplace={replaceEvidence}
                  />
                ) : (
                  <AttachmentList attachments={resolvedEvidence} />
                )}
                {ticket!.actions.canAddWorkAttachment && (
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
              </div>}
            </div>}

            {ticket.actions.canEditWorkDetail && (
              <button type="button" disabled={isBusy} onClick={saveDetails} className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-primary text-sm font-semibold text-primary disabled:opacity-50">
                {saveWork.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} บันทึกแบบร่าง
              </button>
            )}
          </div>
        </Section>
      )}
      </div>

      <Section title="ข้อความ">
        <div className="space-y-3">
          {(commentsQuery.data?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีข้อความ</p>}
          {commentsQuery.data?.map(item => (
            <div key={item.id} className={`rounded-md p-3 text-sm ${item.commentType === 'RequestInfo' ? 'border border-amber-200 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-950/60' : 'bg-muted'}`}>
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

      {supervisorSheet === 'triage' && <TriageSheet ticket={ticket} onClose={() => setSupervisorSheet(null)} />}
      {supervisorSheet === 'assign' && (
        <AssignSheet
          ticket={ticket}
          candidates={candidatesQuery.data ?? []}
          onClose={() => setSupervisorSheet(null)}
        />
      )}
      {supervisorSheet === 'reject' && <RejectSheet ticket={ticket} onClose={() => setSupervisorSheet(null)} />}
      {supervisorSheet === 'return' && <ReviewSheet ticket={ticket} mode="return" onClose={() => setSupervisorSheet(null)} />}
      {supervisorSheet === 'close' && <ReviewSheet ticket={ticket} mode="close" onClose={() => setSupervisorSheet(null)} />}
      {showCompletion && <CompletionSheet ticket={ticket} onClose={() => setShowCompletion(false)} />}
      {cancellationReview && (
        <CancellationReviewSheet
          ticket={ticket}
          decision={cancellationReview}
          onClose={() => setCancellationReview(null)}
        />
      )}

      {(ticket.actions.canClaim || ticket.actions.canStart || ticket.actions.canResume || ticket.actions.canRequestInfo || ticket.actions.canResolve || (ticket.actions.isRequester && ticket.status === 'AwaitingRequesterConfirmation')) && (
        <div className="fixed bottom-16 left-1/2 z-20 w-full max-w-107.5 -translate-x-1/2 border-t border-border bg-background p-3">
          <div className="flex gap-2">
            {ticket.actions.isRequester && ticket.status === 'AwaitingRequesterConfirmation' && (
              <button type="button" disabled={confirmCompletion.isPending} onClick={confirmTicketCompletion} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-green-600 text-sm font-semibold text-white disabled:opacity-50">
                {confirmCompletion.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                บันทึกจบงานตรวจรับ
              </button>
            )}
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
              <button type="button" disabled={isBusy} onClick={() => setShowCompletion(true)} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-green-600 text-sm font-semibold text-white disabled:opacity-50">
                <CheckCircle2 className="h-4 w-4" />
                ส่งงานเพื่อตรวจสอบ
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
