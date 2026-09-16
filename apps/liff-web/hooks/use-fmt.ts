'use client'

import { useMemo } from 'react'
import { useLocale } from 'next-intl'
import { createFormatter } from '@hrms/i18n/format'

/**
 * formatter วันที่/ตัวเลขที่ผูกกับภาษาของ request (จาก NextIntlClientProvider)
 * ใช้แทน `import * as fmt from '@hrms/i18n/format'` ในคอมโพเนนต์ — SSR กับ client ได้ค่าเดียวกัน ไม่มีจอกระพริบภาษาไทย
 * ของที่อยู่นอก React tree (toast จาก store ฯลฯ) ยังใช้ fmt กลางที่ LocaleProvider ตั้ง locale ให้
 */
export function useFmt() {
  const locale = useLocale()
  return useMemo(() => createFormatter(locale), [locale])
}
