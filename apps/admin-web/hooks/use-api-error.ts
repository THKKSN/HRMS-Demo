'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { apiErrorTextDetailed, type ErrorsTranslator } from '@hrms/i18n/api-error'

/**
 * แปลง error จาก API เป็นข้อความที่ผู้ใช้อ่าน — **ตัวที่ควรใช้ทุกที่ในคอมโพเนนต์**
 *
 * กติกา D7 (แผน i18n ข้อ 3): API ส่ง `error` เป็น code และ `message` เป็นอังกฤษสำหรับ developer
 * ผู้ใช้จึงต้องเห็นคำแปลจาก `errors.<CODE>` เสมอ — ถ้าเห็นข้อความอังกฤษจาก server แปลว่า code นั้น
 * ยังไม่มีคีย์ใน `packages/i18n/messages/{th,en}/errors.json` (dev จะเตือนใน console ให้)
 *
 * `fallback` คือข้อความที่แปลแล้วสำหรับกรณี API ไม่ส่งอะไรมาเลย (ปกติคือ `tCommon('state.error')`)
 */
export function useApiError() {
  const tErrors = useTranslations('errors')
  return useCallback(
    (error: unknown, fallback: string) =>
      apiErrorTextDetailed(error, tErrors as unknown as ErrorsTranslator, fallback),
    [tErrors],
  )
}
