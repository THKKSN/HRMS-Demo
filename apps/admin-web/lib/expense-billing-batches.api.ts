import type {
  ExpenseBillingBatchDto,
  ExpenseBillingBatchListItemDto,
  ExpenseBillingBatchStatus,
  PagedResult,
} from '@hrms/shared-types'
import { api } from './api'

export type ExpenseBillingBatchListParams = {
  page?: number
  pageSize?: number
  status?: ExpenseBillingBatchStatus
  dateFrom?: string
  dateTo?: string
  batchNo?: string
}

export type CreateExpenseBillingBatchRequest = {
  periodFrom: string
  periodTo: string
  expenseClaimIds: string[]
  note?: string
}

export const expenseBillingBatchesApi = {
  getAll: (params?: ExpenseBillingBatchListParams) =>
    api.get<PagedResult<ExpenseBillingBatchListItemDto>>('/expense-billing-batches', { params }).then(r => r.data),

  getById: (id: string) =>
    api.get<ExpenseBillingBatchDto>(`/expense-billing-batches/${id}`).then(r => r.data),

  create: (body: CreateExpenseBillingBatchRequest) =>
    api.post<ExpenseBillingBatchDto>('/expense-billing-batches', body).then(r => r.data),

  exportExcel: (id: string) =>
    api.post<Blob>(`/expense-billing-batches/${id}/export`, undefined, { responseType: 'blob' }).then(r => r.data),

  markPaid: (id: string) =>
    api.post<ExpenseBillingBatchDto>(`/expense-billing-batches/${id}/mark-paid`).then(r => r.data),

  cancel: (id: string) =>
    api.post<ExpenseBillingBatchDto>(`/expense-billing-batches/${id}/cancel`).then(r => r.data),
}
