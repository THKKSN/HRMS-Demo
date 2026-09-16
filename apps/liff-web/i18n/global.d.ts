import type { Locale } from '@hrms/i18n'
import type sharedMessages from '@hrms/i18n/messages/th'
import type liffMessages from '@/messages/th'

// ให้ useTranslations()/t() ตรวจคีย์ตอน compile จากไฟล์ภาษาไทย (ต้นฉบับ) — คีย์ผิดจะ fail ที่ tsc ไม่ใช่ที่หน้าจอ
declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale
    Messages: typeof sharedMessages & typeof liffMessages
  }
}
