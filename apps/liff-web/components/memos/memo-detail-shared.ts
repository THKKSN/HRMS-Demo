'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { useApiError } from '@/hooks/use-api-error'

// helper ที่ทุก module ในหน้ารายละเอียด memo ใช้ร่วมกัน
// (BottomSheet / Section อยู่ที่ components/shared/bottom-sheet · วันที่ใช้ useFmt() ในคอมโพเนนต์)

export const MEMO_MAX_ATTACHMENTS = 10
export const MAX_ACTIVITY_MESSAGE = 4000
// การ์ดบันทึกที่โชว์ก่อนต้องกดดูเพิ่ม — ค่าเดียวกับบอร์ดกิจกรรมของ ticket
export const ACTIVITY_PREVIEW_COUNT = 3
// ไฟล์แนบที่โชว์ในการ์ด เกินจากนี้ให้เปิดดูในการ์ดเต็ม
export const INLINE_ATTACHMENT_LIMIT = 3

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/**
 * เรียก mutation แล้ว toast ผลลัพธ์รูปแบบเดียวกันทุกปุ่ม — คืน true เมื่อสำเร็จ
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
        return true
      } catch (error) {
        toast.error(apiError(error, errorFallback))
        return false
      }
    },
    [apiError],
  )
}
