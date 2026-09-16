import { cookies } from 'next/headers'
import type { AbstractIntlMessages } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'
import {
  APP_TIME_ZONE,
  LOCALE_COOKIE,
  deepMergeMessages,
  loadMessages,
  loadMessagesWithFallback,
  resolveLocale,
} from '@hrms/i18n'

// จุดเดียวที่ตัดสินว่า request นี้เป็นภาษาอะไร (โหมดไม่มี URL routing — ดูแผน i18n ข้อ D2)
// ไม่มี cookie → th; การเดาจาก liff.getAppLanguage() ทำฝั่ง client ครั้งแรกที่เปิด (LocaleOnboarding) แล้วเขียน cookie
export default getRequestConfig(async () => {
  const store = await cookies()
  const locale = resolveLocale({ cookie: store.get(LOCALE_COOKIE)?.value })

  // ส่วนกลาง (common/status) จาก packages/i18n + ของ liff เอง (apps/liff-web/messages) ใช้กฎ fallback เดียวกัน
  const [shared, app] = await Promise.all([
    loadMessages(locale),
    loadMessagesWithFallback(locale, {
      th: () => import('@/messages/th').then((m) => m.default),
      en: () => import('@/messages/en').then((m) => m.default),
      id: () => import('@/messages/id').then((m) => m.default),
    }),
  ])

  return {
    locale,
    timeZone: APP_TIME_ZONE,
    messages: deepMergeMessages(shared, app) as AbstractIntlMessages,
  }
})
