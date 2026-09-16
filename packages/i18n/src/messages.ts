import type { Locale } from './locales.ts'

export type Messages = Record<string, unknown>
export type MessageLoaders = Record<Locale, () => Promise<Messages>>

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// รวม override ทับ base ทีละชั้น — คีย์ที่ override ไม่มีจะยังเห็นค่าจาก base
export function deepMergeMessages(base: Messages, override: Messages): Messages {
  const result: Messages = { ...base }
  for (const [key, value] of Object.entries(override)) {
    const current = result[key]
    result[key] = isPlainObject(current) && isPlainObject(value) ? deepMergeMessages(current, value) : value
  }
  return result
}

/**
 * รวม messages ของภาษาที่ขอตามลำดับ fallback ที่เคาะไว้ (D5):
 *   id → en → th   /   en → th   /   th
 * ใช้ th เป็นฐานสุดท้ายเสมอ เพื่อให้คีย์ที่ยังไม่แปลแสดงเป็นไทยแทนที่จะ error หรือเป็นช่องว่าง
 * ตัว loader แยกออกมาให้แต่ละแอปส่ง messages ของตัวเอง (apps/<app>/messages) มารวมด้วยกฎเดียวกัน
 */
export async function loadMessagesWithFallback(locale: Locale, loaders: MessageLoaders): Promise<Messages> {
  const th = await loaders.th()
  if (locale === 'th') return th

  const en = deepMergeMessages(th, await loaders.en())
  if (locale === 'en') return en

  return deepMergeMessages(en, await loaders[locale]())
}

/**
 * messages ส่วนกลางใน packages/i18n/messages (common, status, errors …)
 * ใช้ switch/import ตรง ๆ แทน template import เพื่อให้ bundler เห็นไฟล์ที่ต้องรวมชัด ๆ
 */
export function loadMessages(locale: Locale): Promise<Messages> {
  return loadMessagesWithFallback(locale, {
    th: () => import('../messages/th/index.ts').then((m) => m.default as Messages),
    en: () => import('../messages/en/index.ts').then((m) => m.default as Messages),
    id: () => import('../messages/id/index.ts').then((m) => m.default as Messages),
  })
}
