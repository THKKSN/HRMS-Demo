import type { Locale } from './locales.ts'

/**
 * master data ที่ HR กรอกเอง (ประเภทใบแจ้ง, แผนก, ตำแหน่ง, กะ ฯลฯ) เก็บชื่อ 3 ภาษาเป็นคอลัมน์
 * `name` (ไทย — ของเดิม) + `nameEn` + `nameId` (i18n Phase M) — ส่วน LeaveType/SystemRole ใช้ `nameTh` แทน `name`
 */
export type LocalizedNamed = {
  name?: string | null
  nameTh?: string | null
  nameEn?: string | null
  nameId?: string | null
}

/**
 * เลือกชื่อตามภาษาที่ผู้ใช้ตั้ง — fallback: ภาษาที่เลือก → en → th
 * ช่องที่ HR ยังไม่กรอก (null/ว่าง) ข้ามไปภาษาถัดไป จึงไม่มีทางได้ค่าว่างกลับไปถ้ายังมีชื่อไทย
 */
export function localizedName(item: LocalizedNamed | null | undefined, locale: Locale): string {
  if (!item) return ''
  const th = pick(item.nameTh) ?? pick(item.name) ?? ''
  if (locale === 'th') return th
  const en = pick(item.nameEn)
  if (locale === 'en') return en ?? th
  return pick(item.nameId) ?? en ?? th
}

function pick(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}
