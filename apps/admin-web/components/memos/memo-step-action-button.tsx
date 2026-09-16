'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ClipboardCheck, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MemoStepActionModal } from '@/components/memos/memo-step-action-modal'
import type { MemoDto, MemoStepInstanceDto } from '@hrms/shared-types'

/**
 * ขั้นที่ผู้ใช้ปัจจุบันลงมือได้ — server คำนวณ canAct มาให้แล้ว
 * แยกออกมาเป็นฟังก์ชันเพื่อให้ทุกหน้า detail หาขั้นเดียวกันโดยไม่ต้องเขียนเงื่อนไขซ้ำ
 */
export function findActionableStep(memo: MemoDto): MemoStepInstanceDto | undefined {
  return (memo.steps ?? []).find(step => step.status === 'Current' && step.canAct)
}

/**
 * ปุ่มดำเนินการขั้นตอนปัจจุบัน — วางในแถบปุ่มบน header ชุดเดียวกับ อนุมัติ/รับทราบ/ส่งมอบ
 * ฟอร์มจริงอยู่ใน modal ส่วน "ขั้นไหนกำลังรออยู่" อ่านได้จาก Status Station แล้วจึงไม่ทำแถบซ้ำ
 */
export function MemoStepActionButton({ memoId, step }: { memoId: string; step: MemoStepInstanceDto }) {
  const t = useTranslations('admin.memo.step')
  const [open, setOpen] = useState(false)
  const isWork = step.stepKind === 'Work'
  const Icon = isWork ? Wrench : ClipboardCheck

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Icon className="h-4 w-4" />
        {isWork ? t('doWork') : t('review')}
      </Button>

      {open && (
        <MemoStepActionModal memoId={memoId} step={step} onClose={() => setOpen(false)} />
      )}
    </>
  )
}
