'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { SendHorizonal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useResubmitMemo } from '@/hooks/use-memo'
import type { MemoDto } from '@hrms/shared-types'
import { useApiError } from '@/hooks/use-api-error'

// ข้อความจาก API ยังเป็นไทย (รอ Phase 3) — fallback ส่งเข้ามาจากคำแปล
/**
 * ปุ่มของผู้ขอ เมื่อเรื่องถูกขั้นอนุมัติตีกลับมาให้แก้ไข — ส่งกลับเข้า workflow แล้วเดินใหม่ตั้งแต่ขั้นแรก
 * ตัวเรื่อง (รายละเอียด/หมวดหมู่) แก้ไม่ได้ ข้อมูลเพิ่มเติมแนบผ่านบันทึกความคืบหน้า
 */
export function MemoResubmitButton({ memo }: { memo: MemoDto }) {
  const t = useTranslations('admin.memo.resubmit')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const resubmit = useResubmitMemo()

  async function submit() {
    setError(null)
    try {
      await resubmit.mutateAsync({ memoId: memo.id, note: note.trim() || undefined })
      setOpen(false)
    } catch (submitError) {
      setError(apiError(submitError, t('failed')))
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <SendHorizonal className="h-4 w-4" /> {t('button')}
      </Button>

      {open && (
        <Modal open onClose={() => setOpen(false)} title={t('title')} size="md">
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/50">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                {t('returnedReason')}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-amber-800 dark:text-amber-50">
                {memo.returnedToRequesterReason ?? t('noReason')}
              </p>
            </div>

            <p className="text-xs leading-5 text-muted-foreground">{t('hint')}</p>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium">
                {t('noteLabel')}
                <span className="ml-1 text-xs font-normal text-muted-foreground">{t('optional')}</span>
              </span>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                maxLength={1000}
                rows={4}
                placeholder={t('notePlaceholder')}
                className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </label>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button variant="outline" disabled={resubmit.isPending} onClick={() => setOpen(false)}>
                {tCommon('action.cancel')}
              </Button>
              <Button loading={resubmit.isPending} onClick={submit}>
                <SendHorizonal className="h-4 w-4" /> {t('confirm')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
