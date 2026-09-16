'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  ChevronRight, Eye, Info, Paperclip, Pencil, PlusIcon, TimerReset,
} from 'lucide-react'
import type { MemoActivityDto, MemoAttachmentDto } from '@hrms/shared-types'
import { Section } from '@/components/shared/bottom-sheet'
import { ACTIVITY_PREVIEW_COUNT, INLINE_ATTACHMENT_LIMIT } from '@/components/memos/memo-detail-shared'
import {
  AttachmentThumb, MemoImagePreview, isImageAttachment, openAttachmentInNewTab,
} from '@/components/memos/memo-attachment-preview'
import {
  MemoActivityComposerSheet, MemoActivityDetailSheet,
} from '@/components/memos/memo-activity-sheets'
import { useFmt } from '@/hooks/use-fmt'

// ความยาวข้อความที่ถือว่าต้องเปิดดูเต็ม
const MESSAGE_CLAMP_LENGTH = 220

// สองเลนแบบเดียวกับบอร์ดกิจกรรมของ ticket: บันทึกของคน (ฟ้า) vs เหตุการณ์ที่ระบบเขียนเอง (เหลือง)
function laneStyle(activity: MemoActivityDto) {
  return activity.isSystem
    ? {
        laneKey: 'laneSystem' as const,
        Icon: Info,
        surfaceClass: 'border-amber-200 bg-amber-50/70',
        iconClass: 'border-amber-300 bg-amber-100 text-amber-700',
        badgeClass: 'border-amber-300 bg-amber-100 text-amber-800',
      }
    : {
        laneKey: 'laneProgress' as const,
        Icon: TimerReset,
        surfaceClass: 'border-border bg-background',
        iconClass: 'border-sky-200 bg-sky-50 text-sky-700',
        badgeClass: 'border-sky-200 bg-sky-50 text-sky-700',
      }
}

function ActivityCard({
  activity,
  isLatest,
  onOpenDetail,
  onEdit,
}: {
  activity: MemoActivityDto
  isLatest: boolean
  onOpenDetail: () => void
  onEdit: () => void
}) {
  const t = useTranslations('liff.memo.activity')
  const fmt = useFmt()
  const [previewFile, setPreviewFile] = useState<MemoAttachmentDto | null>(null)
  const { laneKey, Icon, surfaceClass, iconClass, badgeClass } = laneStyle(activity)

  const hiddenFileCount = Math.max(activity.attachments.length - INLINE_ATTACHMENT_LIMIT, 0)
  const inlineFiles = activity.attachments.slice(0, INLINE_ATTACHMENT_LIMIT)
  const isLongMessage = activity.message.length > MESSAGE_CLAMP_LENGTH

  function openFile(file: MemoAttachmentDto) {
    if (isImageAttachment(file)) setPreviewFile(file)
    else openAttachmentInNewTab(file)
  }

  return (
    <article className={`rounded-xl border p-3 ${surfaceClass}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 shrink-0 rounded-full border p-2 ${iconClass}`}>
          <Icon className="h-4 w-4 text-current" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-semibold">{activity.authorName ?? t('system')}</p>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${badgeClass}`}>
              {t(laneKey)}
            </span>
            {isLatest && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                {t('latest')}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {activity.stepLabel ? `${activity.stepLabel} • ` : ''}
            {fmt.formatDateTime(new Date(activity.createdAt))}
          </p>
        </div>
        {/* มือถือไม่มี hover — ปุ่มแก้ไขโชว์ตลอด ขนาด h-9 ให้นิ้วกดง่าย */}
        {activity.canEdit && (
          <button
            type="button"
            title={t('editNote')}
            onClick={onEdit}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <p className={`mt-2.5 whitespace-pre-wrap text-sm leading-5 ${isLongMessage ? 'line-clamp-4' : ''}`}>
        {activity.message}
      </p>
      {isLongMessage && (
        <button
          type="button"
          onClick={onOpenDetail}
          className="mt-1 flex items-center gap-0.5 text-xs font-semibold text-primary"
        >
          {t('readAll')} <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}

      {activity.attachments.length > 0 && (
        <div className="mt-2.5 space-y-1.5 border-t border-border/70 pt-2.5">
          {inlineFiles.map(file => (
            <button
              key={file.id}
              type="button"
              onClick={() => openFile(file)}
              className="flex w-full items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5 text-left"
            >
              <AttachmentThumb file={file} className="h-9 w-9" />
              <span className="min-w-0 flex-1 truncate text-xs">{file.fileName ?? t('attachmentFallback')}</span>
              <Eye className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </button>
          ))}
          {hiddenFileCount > 0 && (
            <button
              type="button"
              onClick={onOpenDetail}
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-xs font-semibold text-muted-foreground"
            >
              <Paperclip className="h-3.5 w-3.5" />
              {t('moreFiles', { count: hiddenFileCount })}
            </button>
          )}
        </div>
      )}

      {previewFile && (
        <MemoImagePreview file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </article>
  )
}

/**
 * บันทึกความคืบหน้าบนมือถือ — ฟีดการ์ดเรียงล่าสุดขึ้นบน
 * การ์ดที่แสดงไม่หมดกดเปิดดูเต็มเป็นแผ่นเลื่อน · เจ้าของบันทึกแก้ข้อความได้
 */
export function MemoActivitySection({
  memoId,
  activities,
  canAdd,
}: {
  memoId: string
  activities: MemoActivityDto[]
  canAdd: boolean
}) {
  const t = useTranslations('liff.memo.activity')
  const [composerOpen, setComposerOpen] = useState(false)
  const [editing, setEditing] = useState<MemoActivityDto | null>(null)
  const [detail, setDetail] = useState<MemoActivityDto | null>(null)
  const [showAll, setShowAll] = useState(false)

  // API ส่งมาเรียงเก่า→ใหม่ แต่ฟีดต้องเห็นความคืบหน้าล่าสุดก่อน จึงกลับลำดับที่นี่
  const ordered = useMemo(
    () => [...activities].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [activities],
  )
  const hiddenCount = Math.max(ordered.length - ACTIVITY_PREVIEW_COUNT, 0)
  const visible = showAll ? ordered : ordered.slice(0, ACTIVITY_PREVIEW_COUNT)

  return (
    <Section title={t('title')}>
      {/* บอกให้ชัดว่าต่างจากปุ่ม "ดำเนินการเสร็จ" ยังไง — สองอย่างนี้ถูกสับสนกันบ่อย */}
      <p className="-mt-2 mb-3 text-xs text-muted-foreground">{t('hint')}</p>

      {canAdd && (
        <button
          type="button"
          onClick={() => setComposerOpen(true)}
          className="mb-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground"
        >
          <PlusIcon className="h-4 w-4" /> {t('add')}
        </button>
      )}

      <div className="space-y-2.5">
        {ordered.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {canAdd ? t('emptyCanAdd') : t('empty')}
          </p>
        ) : (
          <>
            {visible.map((activity, index) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                isLatest={index === 0}
                onOpenDetail={() => setDetail(activity)}
                onEdit={() => setEditing(activity)}
              />
            ))}
            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAll(value => !value)}
                className="flex h-11 w-full items-center justify-center rounded-xl border border-border bg-background text-sm font-semibold text-muted-foreground"
              >
                {showAll ? t('showLess') : t('showMore', { count: hiddenCount })}
              </button>
            )}
          </>
        )}
      </div>

      {composerOpen && (
        <MemoActivityComposerSheet memoId={memoId} onClose={() => setComposerOpen(false)} />
      )}

      {editing && (
        <MemoActivityComposerSheet memoId={memoId} activity={editing} onClose={() => setEditing(null)} />
      )}

      {detail && (
        <MemoActivityDetailSheet
          activity={detail}
          onEdit={() => { setEditing(detail); setDetail(null) }}
          onClose={() => setDetail(null)}
        />
      )}
    </Section>
  )
}
