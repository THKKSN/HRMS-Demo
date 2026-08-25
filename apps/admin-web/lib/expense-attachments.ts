import type { ExpenseAttachmentDocumentType } from '@hrms/shared-types'

export const EXPENSE_DOCUMENT_LABEL: Record<ExpenseAttachmentDocumentType, string> = {
  PaymentOrder: 'ใบสั่งจ่าย',
  Receipt: 'ใบเสร็จชำระเงิน',
  Other: 'เอกสารอื่น',
}

export function isImageAttachmentUrl(value: string) {
  return /\.(?:jpe?g|png|webp|gif)(?:[?#].*)?$/i.test(value)
}
