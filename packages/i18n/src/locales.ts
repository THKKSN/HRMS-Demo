// ภาษาที่ระบบรองรับ — ลำดับตรงกับที่แสดงในตัวเลือกภาษา
export const SUPPORTED_LOCALES = ['th', 'en', 'id'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'th'

// cookie ตัวเดียวที่ทั้ง LIFF และ Admin ใช้จำภาษาที่ผู้ใช้เลือก (D2) — อ่านได้ทั้ง server/client
export const LOCALE_COOKIE = 'hrms-locale'
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

// เวลาทุกฟิลด์ในระบบเป็นเวลาไทย ไม่ว่าผู้ใช้เลือกภาษาอะไร (ดูแผน i18n ข้อ D2 และ project timezone)
export const APP_TIME_ZONE = 'Asia/Bangkok'

// BCP 47 tag ที่ส่งให้ Intl — th-TH ให้ปฏิทินพุทธศักราชเหมือนของเดิม, en-GB ให้ลำดับ วัน-เดือน-ปี ใกล้เคียงไทย
export const INTL_LOCALE_TAG: Record<Locale, string> = {
  th: 'th-TH',
  en: 'en-GB',
  id: 'id-ID',
}

// ชื่อภาษาในภาษาของตัวเอง — ใช้ในตัวเลือกภาษาเสมอ ห้ามแปล (คนที่อ่านภาษาปัจจุบันไม่ออกต้องยังเลือกได้)
export const LOCALE_NATIVE_NAME: Record<Locale, string> = {
  th: 'ไทย',
  en: 'English',
  id: 'Bahasa Indonesia',
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

/**
 * แปลง language tag ใด ๆ (`en-US`, `id`, `ja-JP`, `TH`) เป็นภาษาที่ระบบรองรับ
 * ภาษาที่ไม่รองรับตกไปที่ `fallback` — ค่าเริ่มต้นเป็น `th` แต่จุดที่รับค่าจาก LINE/เบราว์เซอร์
 * ควรส่ง `'en'` เพราะคนที่ตั้งเครื่องเป็นภาษาอื่นมีโอกาสอ่านไทยไม่ออก (D5)
 */
export function normalizeLocale(tag: string | null | undefined, fallback: Locale = DEFAULT_LOCALE): Locale {
  if (!tag) return fallback
  const primary = tag.trim().toLowerCase().split(/[-_]/)[0]
  return isLocale(primary) ? primary : fallback
}

export type ResolveLocaleInput = {
  /** ค่าจาก cookie `hrms-locale` — ผู้ใช้เคยเลือกเอง ชนะทุกกรณี */
  cookie?: string | null
  /** ภาษาของแอป LINE จาก `liff.getAppLanguage()` (เฉพาะ LIFF) หรือ Accept-Language */
  appLanguage?: string | null
}

/**
 * ลำดับตัดสินภาษาตามที่เคาะไว้ (D2): cookie → ภาษาแอป LINE → th
 * ภาษาแอปที่ไม่รองรับตกเป็น en ไม่ใช่ th
 */
export function resolveLocale({ cookie, appLanguage }: ResolveLocaleInput): Locale {
  if (isLocale(cookie)) return cookie
  if (appLanguage) return normalizeLocale(appLanguage, 'en')
  return DEFAULT_LOCALE
}
