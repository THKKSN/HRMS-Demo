'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import type { TicketProblemType } from '@hrms/shared-types'
import { useApiError } from '@/hooks/use-api-error'

// ค่าคงที่ / helper / primitive ที่ทุก module ในหน้ารายละเอียด ticket ใช้ร่วมกัน
// รวมไว้ไฟล์เดียวเพื่อไม่ให้ module ลูก import ข้ามกันไปมาแล้วเกิด circular import
// ป้ายข้อความทั้งหมดอยู่ใน liff.ticket.detail.* — วันที่ใช้ useFmt() ในคอมโพเนนต์

// ประเภทปัญหาแบบ enum เดิม (ก่อนมี closeout reason) — ป้ายอยู่ที่ liff.ticket.detail.problemType.*
export const PROBLEM_TYPES: TicketProblemType[] = ['SystemDefect', 'Enhancement', 'Other']

export const MAX_ACTIVITY_FILES = 5
export const MAX_COMPLETION_FILES = 5
export const ACTIVITY_CARD_PREVIEW_COUNT = 3

/**
 * เรียก mutation แล้ว toast ผลลัพธ์ให้เป็นรูปแบบเดียวกันทุกปุ่มในหน้านี้
 * `errorFallback` = ข้อความที่แปลแล้วสำหรับกรณี API ไม่ส่งอะไรมาเลย (ผู้เรียกส่ง tCommon('state.error'))
 *
 * เป็น hook เพราะข้อความ error ต้องแปลจาก `code` ที่ API ส่งมา (กติกา D7) ซึ่งต้องใช้ translator ของ React
 */
export function useRunWithToast() {
  const apiError = useApiError()
  return useCallback(
    async (action: () => Promise<unknown>, message: string, errorFallback: string) => {
      try {
        await action()
        toast.success(message)
      } catch (error) {
        toast.error(apiError(error, errorFallback))
      }
    },
    [apiError],
  )
}

// primitive กลางย้ายไปอยู่ components/shared/bottom-sheet เพื่อให้ memo ใช้ร่วมได้
// re-export ไว้ที่นี่เพื่อไม่ต้องแก้ import ของ module ticket ทั้งหมด
export { BottomSheet, Section } from '@/components/shared/bottom-sheet'

// เครื่องหมายบังคับ/ไม่บังคับ — โชว์หลังเลือกประเภทปัญหาแล้วเท่านั้น ก่อนหน้านั้นเห็นแค่หัวเรื่อง
export function RequirementMark({ show, required }: { show: boolean; required: boolean }) {
  const t = useTranslations('liff.ticket.detail.completion')
  if (!show) return null
  return required
    ? <span className="text-destructive"> *</span>
    : <span className="text-xs font-normal text-muted-foreground">{t('notRequiredForType')}</span>
}
