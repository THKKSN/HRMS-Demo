import { DEFAULT_LOCALE, INTL_LOCALE_TAG, type Locale } from './locales.ts'
import { isE164, parseE164 } from './countries.ts'

/**
 * จุดรวม format วันที่/เวลา/ตัวเลขของทั้งสองแอป — แทนที่ `toLocale*('th-TH', …)` ที่เคยกระจายอยู่ ~100 จุด
 *
 * Phase 0: ทุกฟังก์ชันใช้ locale ปัจจุบัน (`th` ถ้าไม่มีใครตั้ง) → ผลลัพธ์เหมือนของเดิมทุกตัวอักษร
 * Phase 1: จุดเรียกที่ render ใน React ควรส่ง `locale` จาก `useLocale()` เข้ามาตรง ๆ
 *          เพราะ `currentLocale` เป็น module state ฝั่ง client — บน server ที่รับหลาย request พร้อมกัน
 *          จะพึ่งค่านี้ไม่ได้ (จึงล็อกให้ตั้งได้เฉพาะในเบราว์เซอร์)
 */

export type DateInput = Date | string | number

let currentLocale: Locale = DEFAULT_LOCALE

export function getCurrentLocale(): Locale {
  return currentLocale
}

/** ตั้ง locale ให้ formatter ทั้งหมด — มีผลเฉพาะฝั่งเบราว์เซอร์ (ดูหมายเหตุด้านบน) */
export function setCurrentLocale(locale: Locale) {
  if (typeof window === 'undefined') return
  currentLocale = locale
}

function tag(locale?: Locale) {
  return INTL_LOCALE_TAG[locale ?? currentLocale]
}

function toDate(value: DateInput) {
  return value instanceof Date ? value : new Date(value)
}

/** วันที่แบบเต็ม — เดิมคือ `formatDate()` ใน lib/utils.ts (เช่น 14 กันยายน 2569) */
export function formatDate(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' },
  locale?: Locale,
) {
  return new Intl.DateTimeFormat(tag(locale), options).format(toDate(value))
}

/** วันที่แบบย่อ — เดิมคือ `formatDateShort()` ใน lib/utils.ts (เช่น 14 ก.ย. 2569) */
export function formatDateShort(value: DateInput, locale?: Locale) {
  return formatDate(value, { year: 'numeric', month: 'short', day: 'numeric' }, locale)
}

/** วันที่ + เวลา — รูปแบบที่ใช้บ่อยสุดในระบบคือ `{ dateStyle: 'medium', timeStyle: 'short' }` */
export function formatDateTime(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
  locale?: Locale,
) {
  return new Intl.DateTimeFormat(tag(locale), options).format(toDate(value))
}

/** เวลาอย่างเดียว — ค่าเริ่มต้น HH:mm ตามที่หน้าลงเวลาใช้ */
export function formatTime(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' },
  locale?: Locale,
) {
  return new Intl.DateTimeFormat(tag(locale), options).format(toDate(value))
}

/** ตัวเลขทั่วไป (จำนวนรายการ, จำนวนคน) — เดิมคือ `n.toLocaleString('th-TH')` */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions, locale?: Locale) {
  return new Intl.NumberFormat(tag(locale), options).format(value)
}

/** จำนวนเงิน ทศนิยม 2 ตำแหน่งเสมอ — เดิมกระจายอยู่ในหน้าเบิกค่าใช้จ่าย/รอบวางบิล */
export function formatMoney(value: number, locale?: Locale) {
  return formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 }, locale)
}

/** ปีอย่างเดียวตามปฏิทินของ locale (th → "2569", en → "2026") — แทนที่ `year + 543` ที่เคยบวกเองในหน้าจอ */
export function formatYear(year: number, locale?: Locale) {
  const parts = new Intl.DateTimeFormat(tag(locale), { year: 'numeric', timeZone: 'UTC' })
    .formatToParts(new Date(Date.UTC(year, 6, 1)))
  return parts.find((part) => part.type === 'year')?.value ?? String(year)
}

/**
 * ชื่อวันในสัปดาห์ตามภาษาที่เลือก — `day` นับแบบ `Date.getDay()` (0 = อาทิตย์)
 * ใช้ 2024-01-07 (วันอาทิตย์) เป็นจุดตั้งต้นแล้วบวกวัน จึงไม่ต้องมีตาราง hardcode ในหน้าจอ
 */
export function formatWeekday(day: number, options?: { short?: boolean }, locale?: Locale) {
  const date = new Date(Date.UTC(2024, 0, 7 + ((day % 7) + 7) % 7))
  return new Intl.DateTimeFormat(tag(locale), {
    weekday: options?.short ? 'short' : 'long',
    timeZone: 'UTC',
  }).format(date)
}

/** จัดกลุ่มเบอร์ในประเทศให้อ่านง่าย: ท้ายสุด 4 หลัก ก่อนหน้า 3 หลัก ที่เหลือไว้หน้าสุด */
function groupNationalNumber(digits: string) {
  if (digits.length <= 4) return digits
  if (digits.length <= 8) {
    const split = Math.ceil(digits.length / 2)
    return `${digits.slice(0, split)} ${digits.slice(split)}`
  }
  const last = digits.slice(-4)
  const middle = digits.slice(-7, -4)
  const head = digits.slice(0, -7)
  return `${head} ${middle} ${last}`
}

/**
 * เบอร์โทรที่เก็บเป็น E.164 → รูปแบบที่อ่านออก (`+66812345678` → `+66 81 234 5678`)
 *
 * จัดกลุ่มแบบกลาง ๆ ไม่ใช่ national format จริงของแต่ละประเทศ (ไม่ได้ใช้ metadata รายประเทศ)
 * ค่าที่ไม่ใช่ E.164 — เช่นข้อมูลเก่าที่ยังไม่ backfill — คืนค่าเดิมทั้งก้อนเพื่อให้หน้าจอยังแสดงผลปกติ
 */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return ''
  if (!isE164(value)) return value

  const parsed = parseE164(value)
  if (!parsed?.callingCode) return value
  return `+${parsed.callingCode} ${groupNationalNumber(parsed.nationalNumber)}`.trim()
}

export type Formatter = {
  formatDate: (value: DateInput, options?: Intl.DateTimeFormatOptions) => string
  formatDateShort: (value: DateInput) => string
  formatDateTime: (value: DateInput, options?: Intl.DateTimeFormatOptions) => string
  formatTime: (value: DateInput, options?: Intl.DateTimeFormatOptions) => string
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
  formatMoney: (value: number) => string
  formatYear: (year: number) => string
}

/**
 * formatter ที่ผูก locale ไว้ตายตัว — ใช้ใน React ผ่าน hook `useFmt()` ของแต่ละแอป (locale จาก `useLocale()`)
 * เพื่อให้ server render (SSR) กับ client ได้ข้อความเดียวกัน ไม่ต้องพึ่ง `currentLocale` ที่ตั้งได้เฉพาะเบราว์เซอร์
 */
export function createFormatter(locale: Locale): Formatter {
  return {
    formatDate: (value, options) => formatDate(value, options, locale),
    formatDateShort: (value) => formatDateShort(value, locale),
    formatDateTime: (value, options) => formatDateTime(value, options, locale),
    formatTime: (value, options) => formatTime(value, options, locale),
    formatNumber: (value, options) => formatNumber(value, options, locale),
    formatMoney: (value) => formatMoney(value, locale),
    formatYear: (year) => formatYear(year, locale),
  }
}
