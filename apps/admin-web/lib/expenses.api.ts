import type { ExpenseClaimDto, ExpenseClaimStatus, ExpenseClaimType, PagedResult } from '@hrms/shared-types'
import { api } from './api'

export type ExpenseListParams = {
  page?: number
  pageSize?: number
  status?: ExpenseClaimStatus
  type?: ExpenseClaimType
  employeeId?: string
  employeeSearch?: string
  dateFrom?: string
  dateTo?: string
}

export const expensesApi = {
  getAll: (params?: ExpenseListParams) =>
    api.get<PagedResult<ExpenseClaimDto>>('/expenses', { params }).then((r) => r.data),

  exportExcel: (params?: ExpenseListParams) =>
    api.get<Blob>('/expenses/export', { params, responseType: 'blob' }).then((r) => r.data),

  getById: (id: string) =>
    api.get<ExpenseClaimDto>(`/expenses/${id}`).then((r) => r.data),

  approve: (id: string, comment?: string) =>
    api.post<ExpenseClaimDto>(`/expenses/${id}/approve`, { comment }).then((r) => r.data),

  reject: (id: string, comment: string) =>
    api.post<ExpenseClaimDto>(`/expenses/${id}/reject`, { comment }).then((r) => r.data),
}
