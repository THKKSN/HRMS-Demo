'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  AlertTriangle, CheckCircle2, ImagePlus, Loader2, MessageSquare, MoreVertical,
  Paperclip, Pencil, Pin, PinOff, RefreshCcw, RefreshCw, Wrench,
} from 'lucide-react'
import { toast } from 'sonner'
import type { TicketAttachmentDto, TicketDetailDto, TicketProgressEntryDto } from '@hrms/shared-types'
import { useFmt } from '@/hooks/use-fmt'
import {
  useAddTicketAttachment,
  useDeleteTicketAttachment,
  usePinTicketProgressEntry,
  useRefreshTicketDetail,
  useUpdateTicketProgress,
  useUpdateTicketProgressEntry,
} from '@/hooks/use-tickets'
import { useApiError } from '@/hooks/use-api-error'
import { uploadTicketFile } from '@/lib/upload.api'
import { getTicketProgressFeedStyle } from '@/lib/ticket-progress-feed'
import { AttachmentList, PendingTicketFileItem, UploadedEvidenceItem } from './ticket-attachments'
import {
  ACTIVITY_CARD_PREVIEW_COUNT,
  BottomSheet,
  MAX_ACTIVITY_FILES,
} from './ticket-detail-shared'

type ProgressCardLane = 'workState' | 'blockerReason' | 'nextAction'

// การ์ดหนึ่งใบมีหัวข้อได้ lane เดียว — ลำดับความสำคัญเดียวกับ getTicketProgressFeedStyle
function progressEntryLane(entry: Pick<TicketProgressEntryDto, 'workState' | 'blockerReason' | 'nextAction'>): ProgressCardLane {
  if (entry.workState?.trim()) return 'workState'
  if (entry.blockerReason?.trim()) return 'blockerReason'
  if (entry.nextAction?.trim()) return 'nextAction'
  return 'workState'
}

// บอร์ดกิจกรรมระหว่างดำเนินงาน — ฟอร์มเพิ่ม/แก้การ์ด, feed การ์ด และเมนูจัดการการ์ด
export function BoardRuntimeSection({ ticket }: { ticket: TicketDetailDto }) {
  const t = useTranslations('liff.ticket.detail.board')
  const tLane = useTranslations('liff.ticket.progressLane')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const fmt = useFmt()
  const errorFallback = tCommon('state.error')
  const updateProgress = useUpdateTicketProgress(ticket.id)
  const updateProgressEntry = useUpdateTicketProgressEntry(ticket.id)
  const pinProgressEntry = usePinTicketProgressEntry(ticket.id)
  const addAttachment = useAddTicketAttachment(ticket.id)
  const deleteAttachment = useDeleteTicketAttachment(ticket.id)
  const refreshBoard = useRefreshTicketDetail(ticket.id)
  const canComposeProgress = ticket.actions.canEditWorkDetail
    || ticket.actions.canRequestInfo
    || ticket.actions.canResume
    || ticket.actions.canResolve
  const canAttachActivityFiles = ticket.actions.canAddAttachment
  const [cardLane, setCardLane] = useState<ProgressCardLane>('workState')
  const [cardTitleDraft, setCardTitleDraft] = useState('')
  const [noteDraft, setNoteDraft] = useState('')
  // ผู้ดูแลการ์ด (งานย่อย) — ว่าง = ยกให้คนที่กดบันทึกเอง เหมือนพฤติกรรมเดิม
  const [ownerDraft, setOwnerDraft] = useState('')
  const [activityFiles, setActivityFiles] = useState<File[]>([])
  const [uploadingActivityFiles, setUploadingActivityFiles] = useState(false)
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string>()
  const [isCardComposerOpen, setIsCardComposerOpen] = useState(false)
  // เก็บแค่ id แล้ว derive จาก ticket เพื่อให้รายการรูปของการ์ดอัปเดตตาม query หลังลบ/เพิ่ม
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  // การ์ดใบที่เปิดเมนู "..." อยู่ — เก็บแค่ id แล้ว derive จาก ticket ให้ปุ่มในเมนูสะท้อนสถานะปักหมุดล่าสุด
  const [actionMenuEntryId, setActionMenuEntryId] = useState<string | null>(null)
  const [showAllProgressFeed, setShowAllProgressFeed] = useState(false)
  const editingEntry = editingEntryId
    ? ticket.progressEntries.find(entry => entry.id === editingEntryId) ?? null
    : null
  const isEditing = editingEntry !== null
  const existingActivityFiles = editingEntry?.attachments ?? []
  const totalActivityFiles = existingActivityFiles.length + activityFiles.length
  const remainingActivityFileSlots = Math.max(0, MAX_ACTIVITY_FILES - existingActivityFiles.length)
  const pinningEntryId = pinProgressEntry.isPending ? pinProgressEntry.variables?.entryId : undefined
  const savingProgress = updateProgress.isPending
    || updateProgressEntry.isPending
    || uploadingActivityFiles
    || addAttachment.isPending
    || !!deletingAttachmentId
  const dateTime = (value: string) => fmt.formatDateTime(new Date(value))

  useEffect(() => {
    setCardTitleDraft('')
    setNoteDraft('')
    setActivityFiles([])
  }, [ticket.updatedAt])

  // preset ของ workflow เป็นข้อความที่ HR ตั้งเอง — ไม่แปล
  const presetGroups = useMemo(() => ({
    workState: ticket.workflowInProgressPresets.filter(item => item.isActive && item.kind === 'work_state'),
    blockerReason: ticket.workflowInProgressPresets.filter(item => item.isActive && item.kind === 'blocker_reason'),
    nextAction: ticket.workflowInProgressPresets.filter(item => item.isActive && item.kind === 'next_action'),
  }), [ticket.workflowInProgressPresets])

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
  // backend เรียงการ์ดที่ปักหมุดขึ้นก่อน ตัวแรกของ list จึงไม่ใช่การ์ดล่าสุดเสมอไป — หา latest จากเวลาสร้างแทน
  const latestEntryId = ticket.progressEntries.reduce<TicketProgressEntryDto | undefined>((latest, entry) => (
    !latest || entry.createdAt > latest.createdAt ? entry : latest
  ), undefined)?.id
  const actionMenuEntry = actionMenuEntryId
    ? ticket.progressEntries.find(entry => entry.id === actionMenuEntryId) ?? null
    : null

  const laneOptions: Array<{ key: ProgressCardLane; className: string }> = [
    { key: 'workState', className: 'border-sky-600 bg-sky-600 text-white shadow-sm' },
    { key: 'blockerReason', className: 'border-amber-500 bg-amber-500 text-white shadow-sm' },
    // การ์ด "งานถัดไป" ระบบเป็นคนสร้าง — โชว์ตัวเลือกนี้เฉพาะตอนแก้ไขการ์ดที่อยู่ lane นี้อยู่แล้ว
    ...(editingEntry && progressEntryLane(editingEntry) === 'nextAction'
      ? [{ key: 'nextAction' as const, className: 'border-violet-500 bg-violet-500 text-white shadow-sm' }]
      : []),
  ]

  function addActivityFiles(files: File[]) {
    if (files.length === 0) return
    setActivityFiles(current => [...current, ...files].slice(0, remainingActivityFileSlots))
  }

  function resetComposerDraft() {
    setCardLane('workState')
    setCardTitleDraft('')
    setNoteDraft('')
    setOwnerDraft('')
    setActivityFiles([])
    setEditingEntryId(null)
  }

  function clearActivityDraft() {
    resetComposerDraft()
    setIsCardComposerOpen(false)
  }

  function openCardCreator() {
    // ร่างที่ค้างอยู่ของโหมดเพิ่มยังเก็บไว้ (พฤติกรรมเดิม) — ล้างเฉพาะเมื่อค้างมาจากโหมดแก้ไข
    if (editingEntryId) resetComposerDraft()
    setIsCardComposerOpen(true)
  }

  function openCardEditor(entry: TicketProgressEntryDto) {
    const lane = progressEntryLane(entry)
    setEditingEntryId(entry.id)
    setCardLane(lane)
    setCardTitleDraft(entry[lane] ?? '')
    setNoteDraft(entry.note ?? '')
    setOwnerDraft(entry.ownerEmployeeId ?? '')
    setActivityFiles([])
    setIsCardComposerOpen(true)
  }

  async function removeExistingActivityFile(attachment: TicketAttachmentDto) {
    if (!window.confirm(t('confirmDeleteImage'))) return
    setDeletingAttachmentId(attachment.id)
    try {
      await deleteAttachment.mutateAsync(attachment.id)
      toast.success(t('imageDeleted'))
    } catch (error) {
      toast.error(apiError(error, errorFallback))
    } finally {
      setDeletingAttachmentId(undefined)
    }
  }

  async function reloadBoard() {
    try {
      await refreshBoard.mutateAsync()
    } catch (error) {
      toast.error(apiError(error, errorFallback))
    }
  }

  async function togglePin(entry: TicketProgressEntryDto) {
    const isPinned = !entry.pinnedAt
    try {
      await pinProgressEntry.mutateAsync({ entryId: entry.id, isPinned, expectedUpdatedAt: ticket.updatedAt })
      toast.success(isPinned ? t('pinnedToast') : t('unpinnedToast'))
    } catch (error) {
      toast.error(apiError(error, errorFallback))
    }
  }

  async function saveProgress() {
    const title = cardTitleDraft.trim()
    if (!title) {
      toast.error(t('titleRequired'))
      return
    }

    const payload = {
      workState: cardLane === 'workState' ? title : undefined,
      blockerReason: cardLane === 'blockerReason' ? title : undefined,
      nextAction: cardLane === 'nextAction' ? title : undefined,
      note: noteDraft.trim() || undefined,
      expectedUpdatedAt: ticket.updatedAt,
      ownerEmployeeId: ownerDraft || undefined,
    }
    const editing = editingEntry
    const savedLabel = editing ? t('edited') : t('added')

    try {
      const filesToUpload = activityFiles
      const result = editing
        ? await updateProgressEntry.mutateAsync({ entryId: editing.id, ...payload })
        : await updateProgress.mutateAsync(payload)
      const progressEntryId = editing?.id ?? result.progressEntryId
      if (filesToUpload.length > 0) {
        if (!progressEntryId) {
          toast.error(t('savedButNoLink', { saved: savedLabel }))
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
              ticketProgressEntryId: progressEntryId,
            })
          }
          toast.success(editing ? t('editedWithImages') : t('addedWithImages'))
        } catch (error) {
          toast.error(t('savedButAttachFailed', { saved: savedLabel, error: apiError(error, errorFallback) }))
        } finally {
          setUploadingActivityFiles(false)
        }
      } else {
        toast.success(savedLabel)
      }
      clearActivityDraft()
    } catch (error) {
      toast.error(apiError(error, errorFallback))
    }
  }

  return (
    <section className="p-4">
      {/* คนอื่นในทีมลงการ์ดพร้อมกันได้ — ปุ่มนี้ดึงบอร์ดล่าสุดมาดูโดยไม่ต้องรีโหลดหน้า */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[14px] font-semibold">{t('title')}</span>
        <button
          type="button"
          title={t('reload')}
          aria-label={t('reload')}
          disabled={refreshBoard.isPending}
          onClick={reloadBoard}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground active:bg-primary/10 disabled:opacity-50"
        >
          {refreshBoard.isPending
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <RefreshCcw className="h-4 w-4" />}
        </button>
      </div>
      <div className="flex flex-col gap-4">
        {canComposeProgress && (
          <button type="button" onClick={openCardCreator} className="order-start flex h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm active:scale-[0.99]">
            {t('addEntry')}
          </button>
        )}

        {(canComposeProgress || isEditing) && isCardComposerOpen && (
          <BottomSheet title={isEditing ? t('editEntry') : t('addEntry')} onClose={() => setIsCardComposerOpen(false)}>
          <div className="space-y-6">
            {editingEntry && (
              <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <Pencil className="h-3.5 w-3.5 shrink-0" />
                <span>{t('editingOf', { name: editingEntry.createdByEmployeeName, time: dateTime(editingEntry.createdAt) })}</span>
              </div>
            )}

            <div className={`grid gap-3 ${laneOptions.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {laneOptions.map(item => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setCardLane(item.key)}
                  className={`min-h-15 rounded-xl border px-3 py-3 text-left text-sm font-semibold ${
                    cardLane === item.key ? item.className : 'border-slate-200 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <span className="block text-[11px] font-medium opacity-75">{t('entryType')}</span>
                  <span className="mt-1 block">{t(`lane.${item.key}`)}</span>
                </button>
              ))}
            </div>

            <div className="space-y-5">
              <label className="block space-y-1.5 text-sm">
                <span className="font-semibold">{t('cardTitle')}</span>
                <input value={cardTitleDraft} maxLength={200} onChange={event => setCardTitleDraft(event.target.value)} placeholder={t(`composer.${cardLane}.placeholder`)} className="h-11 w-full rounded-xl border border-border bg-background px-3 outline-none focus:border-primary" />
                <div className="flex flex-wrap gap-2">
                  {presetGroups[cardLane].slice(0, 8).map(preset => (
                    <button key={preset.key} type="button" onClick={() => setCardTitleDraft(preset.label)} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:border-primary hover:text-primary dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                      {preset.label}
                    </button>
                  ))}
                </div>
              </label>

              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">{t('note')}</span>
                <textarea rows={3} maxLength={2000} value={noteDraft} onChange={event => setNoteDraft(event.target.value)} placeholder={t('notePlaceholder')} className="w-full resize-none rounded-md border border-border bg-background p-3 outline-none focus:border-primary" />
              </label>
              {ticket.teamMembers.length > 1 && (
                <label className="block space-y-1.5 text-sm">
                  <span className="font-medium">{t('owner')}</span>
                  <select
                    value={ownerDraft}
                    onChange={event => setOwnerDraft(event.target.value)}
                    className="h-11 w-full rounded-md border border-border bg-background px-3 outline-none focus:border-primary"
                  >
                    <option value="">{t('ownerSelf')}</option>
                    {ticket.teamMembers.map(member => (
                      <option key={member.employeeId} value={member.employeeId}>
                        {member.employeeName}{member.memberRole === 'Owner' ? t('ownerIsMain') : ''}
                      </option>
                    ))}
                  </select>
                  <span className="block text-xs text-muted-foreground">{t('ownerHint')}</span>
                </label>
              )}

              {canAttachActivityFiles && <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium">{t('images')}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    totalActivityFiles > 0 ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {t('imageCount', { count: totalActivityFiles, max: MAX_ACTIVITY_FILES })}
                  </span>
                </div>
                {existingActivityFiles.length > 0 && (
                  <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-2">
                    <p className="px-1 pt-1 text-xs text-muted-foreground">{t('existingImagesHint')}</p>
                    {existingActivityFiles.map(item => (
                      <UploadedEvidenceItem
                        key={item.id}
                        attachment={item}
                        disabled={savingProgress}
                        deleting={deletingAttachmentId === item.id}
                        onDelete={() => removeExistingActivityFile(item)}
                      />
                    ))}
                  </div>
                )}
                <label className={`flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 text-center active:bg-primary/10 ${
                  totalActivityFiles > 0 ? 'border-primary bg-primary/5' : 'border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-800'
                }`}>
                  <ImagePlus className="h-5 w-5 text-primary" />
                  <span className="mt-2 text-sm font-medium">{totalActivityFiles > 0 ? t('addImage') : t('selectImage')}</span>
                  <span className="mt-1 text-xs text-muted-foreground">
                    {activityFiles.length > 0 ? t('newlySelected', { count: activityFiles.length }) : t('formats')}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={savingProgress || totalActivityFiles >= MAX_ACTIVITY_FILES}
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
                  <span>{t('noAttachPermission')}</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
              <button type="button" disabled={savingProgress} onClick={() => setIsCardComposerOpen(false)} className="h-11 rounded-xl border border-border text-sm font-semibold disabled:opacity-50">{tCommon('action.cancel')}</button>
              <button type="button" disabled={savingProgress} onClick={saveProgress} className="flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50">
                {savingProgress ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? t('saveEdit') : t('saveCard')}
              </button>
            </div>
          </div>
          </BottomSheet>
        )}

        <div className="rounded-2xl border border-border bg-background p-3">
          <div className="mt-3 space-y-2">
            {progressFeed.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('empty')}</p>
            ) : (
              <>
                {visibleProgressFeed.map(entry => {
                  const Icon = entry.Icon
                  const isPinned = !!entry.pinnedAt
                  const isPinning = pinningEntryId === entry.id
                  return (
                    <div
                      key={entry.id}
                      data-progress-lane={entry.lane}
                      data-pinned={isPinned || undefined}
                      className={`rounded-lg border p-3 ${entry.surfaceClass} ${isPinned ? 'ring-1 ring-amber-300/70' : ''}`}
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
                                {tLane(entry.lane)}
                              </span>
                              {isPinned && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                                  <Pin className="h-3 w-3" /> {t('pinned')}
                                </span>
                              )}
                              {entry.id === latestEntryId && <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700 dark:border-slate-500/40 dark:bg-slate-900/70 dark:text-slate-200">{t('latest')}</span>}
                            </div>
                            <p className="mt-1 text-[11px] text-muted-foreground">{entry.createdByEmployeeName} · {dateTime(entry.createdAt)}</p>
                          </div>
                        </div>
                        {/* มือถือไม่มี hover — ปุ่มโชว์ตลอด ขนาด h-9 เท่าปุ่มปิดของ BottomSheet ให้นิ้วกดง่าย */}
                        {(entry.canPin || entry.canEdit) && (
                          <button
                            type="button"
                            aria-label={t('cardMenu')}
                            aria-haspopup="menu"
                            disabled={isPinning}
                            onClick={() => setActionMenuEntryId(entry.id)}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background/70 text-muted-foreground active:bg-primary/10 disabled:opacity-50"
                          >
                            {isPinning
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <MoreVertical className="h-4 w-4" />}
                          </button>
                        )}
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
                    {showAllProgressFeed ? t('showLess') : t('showMore', { count: hiddenProgressFeedCount })}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* action sheet ของการ์ด — ใช้ BottomSheet เดียวกับฟอร์มอื่นในหน้านี้ ปุ่มสูง h-12 ให้กดง่ายบนมือถือ */}
        {actionMenuEntry && (
          <BottomSheet title={t('manageCard')} onClose={() => setActionMenuEntryId(null)}>
            <div className="space-y-3 pb-2">
              <div className="rounded-xl border border-border bg-muted/40 px-3 py-2">
                <p className="truncate text-sm font-semibold">
                  {progressEntryLane(actionMenuEntry) === 'blockerReason'
                    ? actionMenuEntry.blockerReason
                    : progressEntryLane(actionMenuEntry) === 'nextAction'
                      ? actionMenuEntry.nextAction
                      : actionMenuEntry.workState}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {actionMenuEntry.createdByEmployeeName} · {dateTime(actionMenuEntry.createdAt)}
                </p>
              </div>
              <div className="space-y-2">
                {actionMenuEntry.canPin && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = actionMenuEntry
                      setActionMenuEntryId(null)
                      togglePin(target)
                    }}
                    className="flex h-12 w-full items-center gap-3 rounded-xl border border-border px-3 text-sm font-semibold active:bg-primary/10"
                  >
                    {actionMenuEntry.pinnedAt
                      ? <><PinOff className="h-4 w-4 shrink-0" /> {t('unpin')}</>
                      : <><Pin className="h-4 w-4 shrink-0" /> {t('pin')}</>}
                  </button>
                )}
                {actionMenuEntry.canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = actionMenuEntry
                      setActionMenuEntryId(null)
                      openCardEditor(target)
                    }}
                    className="flex h-12 w-full items-center gap-3 rounded-xl border border-border px-3 text-sm font-semibold active:bg-primary/10"
                  >
                    <Pencil className="h-4 w-4 shrink-0" /> {t('editCard')}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActionMenuEntryId(null)}
                className="h-11 w-full rounded-xl border border-border text-sm font-semibold"
              >
                {tCommon('action.close')}
              </button>
            </div>
          </BottomSheet>
        )}
      </div>
    </section>
  )
}
