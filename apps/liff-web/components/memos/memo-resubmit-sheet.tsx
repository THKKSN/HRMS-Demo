'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, SendHorizonal } from 'lucide-react'
import type { MemoDto } from '@hrms/shared-types'
import { BottomSheet } from '@/components/shared/bottom-sheet'
import { useRunWithToast } from '@/components/memos/memo-detail-shared'
import { useResubmitMemo } from '@/hooks/use-memo'

/**
 * ผู้ขอส่งเรื่องที่ถูกขั้นอนุมัติตีกลับมา กลับเข้า workflow — เดินใหม่ตั้งแต่ขั้นแรก
 * รายละเอียดของใบเดิมแก้ไม่ได้ ข้อมูลเพิ่มเติมแนบผ่านบันทึกความคืบหน้าก่อนกดส่ง
 */
export function MemoResubmitSheet({ memo, onClose }: { memo: MemoDto; onClose: () => void }) {
  const t = useTranslations('liff.memo.resubmit')
  const tCommon = useTranslations('common')
  const runWithToast = useRunWithToast()
  const [note, setNote] = useState('')
  const resubmit = useResubmitMemo()

  async function submit() {
    const ok = await runWithToast(
      () => resubmit.mutateAsync({ memoId: memo.id, note: note.trim() || undefined }),
      t('toast'),
      tCommon('state.error'))
    if (ok) onClose()
  }

  return (
    <BottomSheet title={t('title')} onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/50">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">{t('reasonTitle')}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-amber-800 dark:text-amber-50">
            {memo.returnedToRequesterReason ?? t('noReason')}
          </p>
        </div>

        <p className="text-xs leading-5 text-muted-foreground">
          {t.rich('body', { b: (chunks) => <b className="text-foreground">{chunks}</b> })}
        </p>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">
            {t('note')}
            <span className="ml-1 text-xs font-normal text-muted-foreground">{tCommon('field.optional')}</span>
          </span>
          <textarea
            autoFocus
            rows={4}
            maxLength={1000}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={t('notePlaceholder')}
            className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
          />
        </label>

        <div className="space-y-2">
          <button
            type="button"
            disabled={resubmit.isPending}
            onClick={submit}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {resubmit.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <SendHorizonal className="h-4 w-4" />}
            {t('submit')}
          </button>
          <button
            type="button"
            disabled={resubmit.isPending}
            onClick={onClose}
            className="h-12 w-full rounded-xl border border-border bg-background text-sm font-semibold disabled:opacity-60"
          >
            {tCommon('action.cancel')}
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}
