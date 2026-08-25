import type { ExpenseAttachmentDocumentType, ExpenseAttachmentFileDto, ExpenseClaimType } from '@hrms/shared-types'

export const EXPENSE_DOCUMENT_LABEL: Record<ExpenseAttachmentDocumentType, string> = {
  PaymentOrder: 'ใบสั่งจ่าย',
  Receipt: 'ใบเสร็จชำระเงิน',
  Other: 'เอกสารอื่น',
}

export const REQUIRED_FUEL_DOCUMENTS: ExpenseAttachmentDocumentType[] = ['PaymentOrder', 'Receipt']

export function hasRequiredExpenseDocuments(type: ExpenseClaimType, files: Pick<ExpenseAttachmentFileDto, 'documentType'>[]) {
  if (type !== 'Fuel') return files.length > 0
  return REQUIRED_FUEL_DOCUMENTS.every(documentType => files.some(file => file.documentType === documentType))
}

export function missingExpenseDocumentLabels(type: ExpenseClaimType, files: Pick<ExpenseAttachmentFileDto, 'documentType'>[]) {
  if (type !== 'Fuel') return files.length > 0 ? [] : ['หลักฐานอย่างน้อย 1 ไฟล์']
  return REQUIRED_FUEL_DOCUMENTS
    .filter(documentType => !files.some(file => file.documentType === documentType))
    .map(documentType => EXPENSE_DOCUMENT_LABEL[documentType])
}

export function isImageAttachmentUrl(value: string) {
  return /\.(?:jpe?g|png|webp|gif)(?:[?#].*)?$/i.test(value)
}
