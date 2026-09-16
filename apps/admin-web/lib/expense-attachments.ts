import type { ExpenseAttachmentDocumentType } from '@hrms/shared-types'

// ป้ายประเภทเอกสารย้ายไปรวมที่ @hrms/i18n (ใช้ร่วมกับ liff-web)
export { EXPENSE_DOCUMENT_LABEL } from '@hrms/i18n/labels'

export function isImageAttachmentUrl(value: string) {
  return /\.(?:jpe?g|png|webp|gif)(?:[?#].*)?$/i.test(value)
}
