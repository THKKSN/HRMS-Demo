'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { CheckCircle2, ImagePlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { TicketAttachmentDto, TicketDetailDto } from '@hrms/shared-types'
import { localizedName } from '@hrms/i18n'
import {
  useAddTicketAttachment,
  useDeleteTicketAttachment,
  useResolveTicket,
  useTicketCloseoutReasonOptions,
  useUpdateTicketWorkDetail,
} from '@/hooks/use-tickets'
import { useApiError } from '@/hooks/use-api-error'
import { uploadTicketFile } from '@/lib/upload.api'
import { PendingTicketFileItem, UploadedEvidenceItem } from './ticket-attachments'
import {
  BottomSheet,
  MAX_COMPLETION_FILES,
  RequirementMark,
} from './ticket-detail-shared'

// ฟอร์มบันทึกจบงานก่อนส่งตรวจ — ช่องไหนบังคับขึ้นกับเหตุผลปิดงานที่เลือก
export function CompletionSheet({ ticket, onClose }: { ticket: TicketDetailDto; onClose: () => void }) {
  const t = useTranslations('liff.ticket.detail.completion')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const locale = useLocale()
  const errorFallback = tCommon('state.error')
  const saveWork = useUpdateTicketWorkDetail(ticket.id)
  const resolveWork = useResolveTicket(ticket.id)
  const addAttachment = useAddTicketAttachment(ticket.id)
  const deleteAttachment = useDeleteTicketAttachment(ticket.id)
  // ตัวเลือกประเภทปัญหามาจาก master ที่ backend กรองตามบริษัท/แผนก/หมวดของ ticket แล้ว (มี nameEn/nameId จาก Phase M)
  const optionsQuery = useTicketCloseoutReasonOptions(ticket.id)
  const closeoutOptions = optionsQuery.data ?? []
  const noReasonConfigured = !optionsQuery.isLoading && !optionsQuery.isError && closeoutOptions.length === 0
  const [closeoutReasonId, setCloseoutReasonId] = useState(ticket.closeoutReasonId ?? '')
  // ช่องไหนบังคับขึ้นกับเหตุผลที่เลือก — ยังไม่เลือกให้ถือว่าบังคับทั้งคู่ (ตรงกับ default ฝั่ง backend)
  const selectedOption = closeoutOptions.find(option => option.id === closeoutReasonId)
  const hasSelectedReason = !!selectedOption
  const requiresNote = selectedOption?.requiresResolutionNote ?? true
  const requiresEvidence = selectedOption?.requiresCompletionEvidence ?? true
  const [resolution, setResolution] = useState(ticket.resolutionNote ?? '')
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | undefined>()
  const uploadedEvidence = ticket.attachments.filter(item => item.stage === 'Resolved')
  const totalImages = uploadedEvidence.length + files.length
  const busy = saveWork.isPending || resolveWork.isPending || uploading || !!deletingId

  async function removeUploaded(attachment: TicketAttachmentDto) {
    if (!window.confirm(t('confirmDelete'))) return
    setDeletingId(attachment.id)
    try {
      await deleteAttachment.mutateAsync(attachment.id)
      toast.success(t('deleted'))
    } catch (error) {
      toast.error(apiError(error, errorFallback))
    } finally {
      setDeletingId(undefined)
    }
  }

  async function submit() {
    if (!closeoutReasonId) return toast.error(t('reasonRequired'))
    if (requiresNote && !resolution.trim()) return toast.error(t('noteRequired'))
    if (requiresEvidence && totalImages === 0) return toast.error(t('evidenceRequired'))
    if (totalImages > MAX_COMPLETION_FILES) {
      return toast.error(t('tooManyImages', { max: MAX_COMPLETION_FILES }))
    }

    try {
      const saved = await saveWork.mutateAsync({
        closeoutReasonId,
        resolutionNote: resolution.trim() || undefined,
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
        // ตัดไฟล์ที่ขึ้น server สำเร็จแล้วออกจาก state กันอัปโหลดซ้ำเมื่อกดส่งใหม่หลังเกิด error
        setFiles(current => current.filter(item => item !== file))
      }
      await resolveWork.mutateAsync(saved.updatedAt)
      toast.success(t('submitted'))
      onClose()
    } catch (error) {
      toast.error(apiError(error, errorFallback))
    } finally {
      setUploading(false)
    }
  }

  return (
    <BottomSheet title={t('title')} onClose={onClose}>
      <div className="space-y-5 pb-2">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/40 dark:bg-emerald-950/60">
          <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">{t('summaryTitle')}</p>
          <p className="mt-1 text-xs leading-5 text-emerald-800 dark:text-emerald-200">{t('summaryBody')}</p>
        </div>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">{t('closeoutReason')} <span className="text-destructive">*</span></span>
          <select
            value={closeoutReasonId}
            disabled={optionsQuery.isLoading || noReasonConfigured}
            onChange={event => setCloseoutReasonId(event.target.value)}
            className="h-11 w-full rounded-md border border-border bg-background px-3 outline-none focus:border-primary disabled:bg-muted"
          >
            <option value="">{optionsQuery.isLoading ? tCommon('state.loading') : t('selectType')}</option>
            {closeoutOptions.map(option => (
              <option
                key={option.id}
                value={option.id}
                disabled={option.isLegacySelection && option.id !== closeoutReasonId}
              >
                {localizedName(option, locale)}{option.isLegacySelection ? t('legacy') : ''}
              </option>
            ))}
          </select>
          {noReasonConfigured && (
            <p className="text-xs text-destructive">{t('noReasonConfigured')}</p>
          )}
          {!hasSelectedReason && !noReasonConfigured && !optionsQuery.isLoading && (
            <p className="text-xs text-muted-foreground">{t('selectHint')}</p>
          )}
          {optionsQuery.isError && (
            <p className="text-xs text-destructive">{t('loadFailed')}</p>
          )}
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">
            {t('resolutionNote')}
            <RequirementMark show={hasSelectedReason} required={requiresNote} />
          </span>
          <textarea rows={6} maxLength={2000} value={resolution} onChange={event => setResolution(event.target.value)} placeholder={t('resolutionPlaceholder')} className="w-full resize-none rounded-md border border-border bg-background p-3 outline-none focus:border-primary" />
        </label>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium">
              {t('evidence')}
              <RequirementMark show={hasSelectedReason} required={requiresEvidence} />
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              totalImages > MAX_COMPLETION_FILES
                ? 'bg-destructive/10 text-destructive'
                : totalImages > 0 ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            }`}>
              {t('imageCount', { count: totalImages, max: MAX_COMPLETION_FILES })}
            </span>
          </div>
          {uploadedEvidence.length > 0 && (
            <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-2">
              <p className="px-1 pt-1 text-xs text-muted-foreground">{t('uploadedHint')}</p>
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
          <label className={`flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 text-center active:bg-primary/10 ${
            totalImages > 0 ? 'border-primary bg-primary/5' : 'border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-800'
          }`}>
            <ImagePlus className="h-5 w-5 text-primary" />
            <span className="mt-2 text-sm font-medium">{totalImages > 0 ? t('addImage') : t('selectImage')}</span>
            <span className="mt-1 text-xs text-muted-foreground">{totalImages > 0 ? t('haveImages', { count: totalImages }) : t('formats')}</span>
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
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} {t('submit')}
        </button>
      </div>
    </BottomSheet>
  )
}
