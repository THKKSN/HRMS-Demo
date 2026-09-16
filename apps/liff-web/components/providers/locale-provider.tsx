'use client'

import { useEffect, type ReactNode } from 'react'
import { setCurrentLocale, type Locale } from '@hrms/i18n'

// sync ภาษาของ request เข้า formatter กลาง (@hrms/i18n/format) ฝั่งเบราว์เซอร์
// ตัวข้อความแปลใช้ NextIntlClientProvider อยู่แล้ว — ตัวนี้ดูแลเฉพาะ format วันที่/ตัวเลขนอก React tree
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  useEffect(() => {
    setCurrentLocale(locale)
  }, [locale])

  return <>{children}</>
}
