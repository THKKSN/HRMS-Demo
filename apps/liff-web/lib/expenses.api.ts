import type {
  ApplyExpenseOcrRequest,
  ExpenseAttachmentFileDto,
  ExpenseClaimDto,
  ExpenseClaimStatus,
  ExpenseClaimType,
  ExpenseOcrStartDto,
  ExpenseOcrSummaryDto,
  PagedResult
} from '@hrms/shared-types'
import { api } from './api'

export type CreateExpenseBody = {
  type: ExpenseClaimType
  expenseDate: string
  amount: number
  merchantName?: string
  billNo?: string
  receiptTid?: string
  receiptBatch?: string
  receiptMid?: string
  receiptTrace?: string
  driverName?: string
  vehicleNo?: string
  plateNo?: string
  fuelLiters?: number
  transportNo?: string
  origin?: string
  customerName?: string
  tripCount?: number
  note?: string
  attachmentUrls: string[]
  attachmentFiles?: ExpenseAttachmentFileDto[]
  saveAsDraft?: boolean
}

export type UpdateExpenseBody = CreateExpenseBody

export const expensesApi = {
  getMy: (params?: { page?: number; pageSize?: number; status?: ExpenseClaimStatus }) =>
    api.get<PagedResult<ExpenseClaimDto>>('/expenses/my', { params }).then(r => r.data),

  getById: (id: string) =>
    api.get<ExpenseClaimDto>(`/expenses/${id}`).then(r => r.data),

  create: (body: CreateExpenseBody) =>
    api.post<ExpenseClaimDto>('/expenses', body).then(r => r.data),

  update: (id: string, body: UpdateExpenseBody) =>
    api.put<ExpenseClaimDto>(`/expenses/${id}`, body).then(r => r.data),

  deleteDraft: (id: string) =>
    api.delete(`/expenses/${id}`).then(r => r.data),

  startOcr: (id: string) =>
    api.post<ExpenseOcrStartDto>(`/expenses/${id}/ocr`).then(r => r.data),

  getOcrResult: (id: string) =>
    api.get<ExpenseOcrSummaryDto>(`/expenses/${id}/ocr-result`).then(r => r.data),

  applyOcr: (id: string, body: ApplyExpenseOcrRequest) =>
    api.post<ExpenseClaimDto>(`/expenses/${id}/ocr/apply`, body).then(r => r.data),
}
