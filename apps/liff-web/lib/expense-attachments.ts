import type { ExpenseAttachmentDocumentType, ExpenseAttachmentFileDto, ExpenseClaimType } from '@hrms/shared-types'

export const REQUIRED_FUEL_DOCUMENTS: ExpenseAttachmentDocumentType[] = ['PaymentOrder', 'Receipt']

export function hasRequiredExpenseDocuments(type: ExpenseClaimType, files: Pick<ExpenseAttachmentFileDto, 'documentType'>[]) {
  if (type !== 'Fuel') return files.length > 0
  return REQUIRED_FUEL_DOCUMENTS.every(documentType => files.some(file => file.documentType === documentType))
}

/**
 * รายชื่อเอกสารที่ยังขาด — ป้ายชื่อมาจากผู้เรียก (แปลตามภาษาแล้ว: `status.expenseDocument.*` และข้อความ "หลักฐานอย่างน้อย 1 ไฟล์")
 * ไฟล์นี้ไม่รู้จักภาษา จะได้ใช้ใน test/Node ตรง ๆ ได้
 */
export function missingExpenseDocumentLabels(
  type: ExpenseClaimType,
  files: Pick<ExpenseAttachmentFileDto, 'documentType'>[],
  labels: { document: (documentType: ExpenseAttachmentDocumentType) => string; anyFile: string },
) {
  if (type !== 'Fuel') return files.length > 0 ? [] : [labels.anyFile]
  return REQUIRED_FUEL_DOCUMENTS
    .filter(documentType => !files.some(file => file.documentType === documentType))
    .map(labels.document)
}

export function isImageAttachmentUrl(value: string) {
  return /\.(?:jpe?g|png|webp|gif)(?:[?#].*)?$/i.test(value)
}
