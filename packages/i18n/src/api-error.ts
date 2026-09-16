/**
 * แปลง error จาก API เป็นข้อความที่ผู้ใช้อ่าน — จุดเดียวของทั้ง LIFF และ Admin
 *
 * กติกา D7 (แผน i18n ข้อ 3): API ส่ง `error` เป็น **code** และ `message` เป็น **ภาษาอังกฤษสำหรับ developer**
 * ผู้ใช้จึงต้องเห็นคำแปลจาก `errors.<CODE>` เสมอ — `message` จาก server เป็นทางหนีทีไล่สุดท้ายเท่านั้น
 * และการที่มันโผล่บนหน้าจอแปลว่า code นั้นยังไม่มีคีย์ใน `packages/i18n/messages/{th,en}/errors.json`
 */

/**
 * รูปร่าง error ราย field ของ FluentValidation (งาน 3.10)
 * `field` เป็น camelCase ตรงกับชื่อช่องในฟอร์ม · `code` ใช้หาคำแปล · `message` เป็นอังกฤษสำหรับ developer
 * `error` คือรูปแบบเดิมก่อนงาน 3.10 — คงไว้อ่านได้เผื่อ response เก่าค้างอยู่ระหว่าง deploy
 *
 * `field` ยังไม่มีหน้าจอไหนใช้ (ทุกหน้าโชว์ error ก้อนเดียว) — มีไว้ให้ฟอร์มที่อยากแปะข้อความ
 * ใต้ช่องที่ผิดจริง ๆ หยิบไปใช้ได้ทันทีโดยไม่ต้องแก้ API อีก
 */
export type ApiFieldError = { field?: string; code?: string; message?: string; error?: string }

/** รูปร่าง error body ที่ `GlobalExceptionMiddleware` และ controller ส่งกลับมา */
type ApiErrorShape = {
  response?: {
    data?: {
      error?: string
      message?: string
      errors?: string[]
      details?: ApiFieldError[]
    }
  }
}

/** ข้อความของ detail ตัวหนึ่ง — รองรับทั้งรูปแบบใหม่ (`message`) และเดิม (`error`) */
function detailMessage(detail?: ApiFieldError): string | undefined {
  return detail?.message ?? detail?.error
}

/**
 * รูปร่างขั้นต่ำของ translator จาก `useTranslations('errors')`
 *
 * ใช้ `never` เป็นชนิดของ key เพื่อให้ translator ที่ next-intl สร้าง (ซึ่งรับเฉพาะคีย์ที่มีจริง)
 * ส่งเข้ามาได้โดยผู้เรียกไม่ต้อง cast — การ cast ไปเป็น `string` ทำครั้งเดียวข้างในนี้
 */
export type ErrorsTranslator = {
  (key: never): string
  has: (key: never) => boolean
}

type LooseTranslator = {
  (key: string): string
  has: (key: string) => boolean
}

/** error code จาก body ของ API (เช่น `OVERLAPPING_LEAVE`) — ไม่มี = undefined */
export function apiErrorCode(error: unknown): string | undefined {
  return (error as ApiErrorShape)?.response?.data?.error
}

/**
 * ข้อความดิบจาก API — **ไม่แปล** ใช้เมื่อผู้เรียกไม่มี translator เท่านั้น
 * ถ้ามี `useTranslations('errors')` อยู่แล้วให้ใช้ {@link apiErrorText} แทนเสมอ
 */
export function apiMessage(error: unknown, fallback: string): string {
  return (error as ApiErrorShape)?.response?.data?.message ?? fallback
}

/**
 * แบบละเอียดสำหรับ endpoint ที่ส่ง validation error เป็น `details`/`errors` (หน้าเบิกค่าใช้จ่าย)
 * ลำดับ: details[0] → errors[0] → message → error code → Error.message → fallback
 */
export function apiMessageDetailed(error: unknown, fallback: string): string {
  const response = (error as ApiErrorShape)?.response?.data
  return detailMessage(response?.details?.[0])
    ?? response?.errors?.[0]
    ?? response?.message
    ?? response?.error
    ?? (error instanceof Error ? error.message : undefined)
    ?? fallback
}

/**
 * ข้อความ error ที่แปลแล้ว — **ตัวที่ควรใช้ทุกที่ที่มี `useTranslations('errors')`**
 *
 * ลำดับ: คำแปลของ code → ข้อความจาก server → fallback ที่ผู้เรียกส่งมา
 * ระหว่าง dev จะเตือนใน console เมื่อ code ไม่มีคำแปล เพื่อให้เจอช่องว่างก่อนผู้ใช้เจอ
 */
export function apiErrorText(error: unknown, tErrors: ErrorsTranslator, fallback: string): string {
  const code = apiErrorCode(error)
  if (code) {
    const t = tErrors as unknown as LooseTranslator
    if (t.has(code)) return t(code)
    warnMissingCode(code)
  }
  return apiMessage(error, fallback)
}

/**
 * แบบแปลแล้ว + รองรับ endpoint ที่ส่ง `details` ราย field ของ FluentValidation
 *
 * **code ของ field ต้องมาก่อน code ก้อนกลาง** — `VALIDATION_ERROR` มีคำแปลอยู่แล้ว ถ้าเช็คมันก่อน
 * ผู้ใช้จะได้ "ข้อมูลไม่ถูกต้อง" ทุกครั้งแทนที่จะได้เหตุผลจริงว่าช่องไหนผิดยังไง
 *
 * ลำดับ: คำแปลของ details[0].code → คำแปลของ code (ที่ไม่ใช่ก้อนกลาง) → ข้อความจาก server → คำแปลก้อนกลาง → fallback
 * ใช้ผ่าน hook `useApiError()` ของแต่ละแอป ไม่ต้องเรียกตรง
 */
export function apiErrorTextDetailed(error: unknown, tErrors: ErrorsTranslator, fallback: string): string {
  const t = tErrors as unknown as LooseTranslator
  const response = (error as ApiErrorShape)?.response?.data
  const code = response?.error

  const detailCode = response?.details?.[0]?.code
  if (detailCode) {
    if (t.has(detailCode)) return t(detailCode)
    warnMissingCode(detailCode)
  }
  if (code && code !== 'VALIDATION_ERROR') {
    if (t.has(code)) return t(code)
    warnMissingCode(code)
  }
  return detailMessage(response?.details?.[0])
    ?? response?.errors?.[0]
    ?? (code && t.has(code) ? t(code) : undefined)
    ?? apiMessage(error, fallback)
}

const warned = new Set<string>()

function warnMissingCode(code: string) {
  if (process.env.NODE_ENV === 'production') return
  if (warned.has(code)) return
  warned.add(code)
  console.warn(
    `[i18n] error code "${code}" ไม่มีคำแปล — ผู้ใช้จะเห็นข้อความจาก API แทน ` +
    `เพิ่มคีย์ที่ packages/i18n/messages/{th,en}/errors.json`
  )
}
