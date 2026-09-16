'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Eye, Info, ListTodo, Loader2, Maximize2, Paperclip, Pencil, PlusIcon, RefreshCcw, TimerReset,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MemoActivityCardModal } from '@/components/memos/memo-activity-card-modal'
import { MemoActivityModal } from '@/components/memos/memo-activity-modal'
import { AttachmentThumb, MemoAttachmentPreviewModal } from '@/components/memos/memo-attachment-preview'
import { memoKeys } from '@/hooks/use-memo'
import type { MemoActivityDto, MemoAttachmentDto } from '@hrms/shared-types'
import * as fmt from '@hrms/i18n/format'

// จำนวนการ์ดที่โชว์ก่อนต้องกดดูเพิ่ม — ค่าเดียวกับบอร์ดกิจกรรมของ Ticket
const ACTIVITY_PREVIEW_COUNT = 3
// ไฟล์แนบที่โชว์ในการ์ด เกินจากนี้ให้ไปดูในการ์ดเต็ม กันการ์ดใบเดียวยาวกลืนฟีด
const INLINE_ATTACHMENT_LIMIT = 3
// ความยาวข้อความที่ถือว่าต้องเปิดดูเต็ม
const MESSAGE_CLAMP_LENGTH = 320

// สองเลนแบบเดียวกับบอร์ด Ticket: บันทึกของคน (ฟ้า) vs เหตุการณ์ที่ระบบเขียนเอง เช่น การตีกลับ (เหลือง)
function activityLaneStyle(activity: MemoActivityDto) {
  return activity.isSystem
    ? {
        laneKey: 'laneSystem' as const,
        Icon: Info,
        surfaceClass: 'border-amber-200 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-900/30',
        iconClass: 'border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-700 dark:bg-amber-900 dark:text-amber-300',
        badgeClass: 'border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-900 dark:text-amber-200',
      }
    : {
        laneKey: 'laneProgress' as const,
        Icon: TimerReset,
        surfaceClass: 'border-border bg-background',
        iconClass: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-900 dark:text-sky-300',
        badgeClass: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-900 dark:text-sky-200',
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
  const t = useTranslations('admin.memo.activity')
  const tAttachment = useTranslations('admin.memo.attachment')
  const [previewFile, setPreviewFile] = useState<MemoAttachmentDto | null>(null)
  const { laneKey, Icon, surfaceClass, iconClass, badgeClass } = activityLaneStyle(activity)

  const hiddenFileCount = Math.max(activity.attachments.length - INLINE_ATTACHMENT_LIMIT, 0)
  const inlineFiles = activity.attachments.slice(0, INLINE_ATTACHMENT_LIMIT)
  const isLongMessage = activity.message.length > MESSAGE_CLAMP_LENGTH

  return (
    <article className={`group rounded-lg border p-4 ${surfaceClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className={`mt-0.5 shrink-0 rounded-full border p-2 ${iconClass}`}>
            <Icon className="h-4 w-4 text-current" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{activity.authorName ?? t('systemAuthor')}</p>
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badgeClass}`}>
                {t(laneKey)}
              </span>
              {isLatest && <Badge variant="secondary">latest</Badge>}
            </div>
            {/* stepLabel = ชื่อขั้นตอนที่ HR ตั้งเอง (ข้อมูล ไม่แปล) */}
            <p className="mt-1 text-xs text-muted-foreground">
              {activity.stepLabel ? `${activity.stepLabel} • ` : ''}
              {fmt.formatDateTime(new Date(activity.createdAt))}
            </p>
          </div>
        </div>

        {/* ปุ่มเครื่องมือ — จอเล็กโชว์ตลอด จอ md ขึ้นไปซ่อนไว้จน hover เหมือนการ์ดบอร์ด Ticket */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            title={t('openDetail')}
            aria-label={t('openDetail')}
            onClick={onOpenDetail}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border/70 text-muted-foreground transition-opacity hover:border-primary hover:text-primary focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          {activity.canEdit && (
            <button
              type="button"
              title={t('edit')}
              aria-label={t('edit')}
              onClick={onEdit}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border/70 text-muted-foreground transition-opacity hover:border-primary hover:text-primary focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <p className={`mt-3 whitespace-pre-wrap text-sm leading-5 text-foreground ${isLongMessage ? 'line-clamp-4' : ''}`}>
        {activity.message}
      </p>
      {isLongMessage && (
        <button
          type="button"
          onClick={onOpenDetail}
          className="mt-1 text-xs font-medium text-primary hover:underline"
        >
          {t('readFull')}
        </button>
      )}

      {activity.attachments.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-border/70 pt-3">
          {inlineFiles.map(file => (
            <button
              key={file.id}
              type="button"
              onClick={() => setPreviewFile(file)}
              title={tAttachment('previewTitle')}
              className="group/file flex w-full items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left text-xs hover:bg-muted"
            >
              <AttachmentThumb file={file} className="h-8 w-8" />
              <span className="min-w-0 flex-1 truncate group-hover/file:text-primary group-hover/file:underline">
                {file.fileName ?? tAttachment('fallbackName')}
              </span>
              <Eye className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover/file:text-primary" />
            </button>
          ))}
          {hiddenFileCount > 0 && (
            <button
              type="button"
              onClick={onOpenDetail}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border px-2 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary"
            >
              <Paperclip className="h-3.5 w-3.5" />
              {t('moreFiles', { count: hiddenFileCount })}
            </button>
          )}
        </div>
      )}

      {previewFile && (
        <MemoAttachmentPreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </article>
  )
}

/**
 * บันทึกความคืบหน้าของ Memo — วางรูปแบบเดียวกับบอร์ดกิจกรรมระหว่างดำเนินงานของ Ticket
 * เรียงล่าสุดไว้บนสุด · การ์ดที่แสดงไม่หมดเปิดดูเต็มใน modal ได้ · เจ้าของบันทึกแก้ข้อความได้
 */
export function MemoActivityFeed({
  memoId,
  activities,
  canAdd,
}: {
  memoId: string
  activities: MemoActivityDto[]
  canAdd: boolean
}) {
  const t = useTranslations('admin.memo.activity')
  const [composerOpen, setComposerOpen] = useState(false)
  const [editing, setEditing] = useState<MemoActivityDto | null>(null)
  const [detail, setDetail] = useState<MemoActivityDto | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const qc = useQueryClient()

  async function reload() {
    setRefreshing(true)
    try {
      await qc.invalidateQueries({ queryKey: memoKeys.byId(memoId) })
    } catch {
      toast.error(t('reloadFailed'))
    } finally {
      setRefreshing(false)
    }
  }

  // API ส่งมาเรียงเก่า→ใหม่ แต่ฟีดต้องเห็นความคืบหน้าล่าสุดก่อน จึงกลับลำดับที่นี่
  // (ไม่แก้ที่ API เพราะ LIFF ใช้ payload เดียวกันและเรียงตามลำดับเวลาอยู่)
  const ordered = useMemo(
    () => [...activities].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [activities],
  )
  const hiddenCount = Math.max(ordered.length - ACTIVITY_PREVIEW_COUNT, 0)
  const visible = showAll ? ordered : ordered.slice(0, ACTIVITY_PREVIEW_COUNT)

  return (
    <section>
      <div className="mb-3 rounded-md border border-border bg-background p-4">
        <div className="flex justify-between gap-2">
          <div className="flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">{t('title')}</h3>
          </div>
          <Button
            variant="outline"
            size="icon"
            title={t('reload')}
            aria-label={t('reload')}
            disabled={refreshing}
            onClick={reload}
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          </Button>
        </div>

        {/* บอกให้ชัดว่าต่างจากปุ่ม "ดำเนินการเสร็จ" ยังไง — สองอย่างนี้ถูกสับสนกันบ่อย */}
        <p className="mt-1 text-xs text-muted-foreground">{t('hint')}</p>

        {canAdd && (
          <div className="mt-2">
            <Button className="w-full" onClick={() => setComposerOpen(true)}>
              <PlusIcon className="h-4 w-4" /> {t('add')}
            </Button>
          </div>
        )}

        <div className="mt-4 space-y-3">
          {ordered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
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
                  className="flex h-10 w-full cursor-pointer items-center justify-center rounded-md border border-border bg-background text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {showAll ? t('collapse') : t('showMore', { count: hiddenCount })}
                </button>
              )}
            </>
          )}
        </div>

        {!canAdd && ordered.length > 0 && (
          <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">{t('closedNotice')}</p>
        )}
      </div>

      {composerOpen && (
        <MemoActivityModal memoId={memoId} onClose={() => setComposerOpen(false)} />
      )}

      {editing && (
        <MemoActivityModal memoId={memoId} activity={editing} onClose={() => setEditing(null)} />
      )}

      {detail && (
        <MemoActivityCardModal
          activity={detail}
          onEdit={() => { setEditing(detail); setDetail(null) }}
          onClose={() => setDetail(null)}
        />
      )}
    </section>
  )
}
