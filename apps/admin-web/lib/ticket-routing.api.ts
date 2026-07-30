import { api } from './api'
import type {
  EmployeeResponsibilityDto,
  ResponsibilityEmployeeDto,
  TicketRoutingCoverageDto,
  TicketRoutingMode,
  TicketRoutingPreviewDto,
} from '@hrms/shared-types'

export type ResponsibilityScope = { companyId: string; departmentId: string; categoryId?: string; topicId?: string }
export type ResponsibilityBody = ResponsibilityScope & {
  employeeId: string
  effectiveFrom?: string
  effectiveTo?: string
  note?: string
}

export const ticketRoutingApi = {
  responsibilities: (params: ResponsibilityScope) =>
    api.get<EmployeeResponsibilityDto[]>('/employee-responsibilities', { params }).then(r => r.data),
  employees: (companyId: string, departmentId: string) =>
    api.get<ResponsibilityEmployeeDto[]>('/employee-responsibilities/employees', { params: { companyId, departmentId } }).then(r => r.data),
  create: (body: ResponsibilityBody) => api.post<EmployeeResponsibilityDto>('/employee-responsibilities', body).then(r => r.data),
  update: (id: string, body: { isActive: boolean; effectiveFrom?: string; effectiveTo?: string; note?: string; expectedUpdatedAt?: string }) =>
    api.put<EmployeeResponsibilityDto>(`/employee-responsibilities/${id}`, body).then(r => r.data),
  preview: (body: Required<Pick<ResponsibilityScope, 'companyId' | 'departmentId' | 'categoryId' | 'topicId'>>) =>
    api.post<TicketRoutingPreviewDto>('/ticket-routing/preview', body).then(r => r.data),
  coverage: (companyId: string, departmentId: string) =>
    api.get<TicketRoutingCoverageDto>('/ticket-routing/coverage', { params: { companyId, departmentId } }).then(r => r.data),
  updateTopicMode: (id: string, mode: TicketRoutingMode) =>
    api.put(`/ticket-topics/${id}/routing`, { mode }),
  updateCategoryMode: (id: string, enableFallback: boolean, mode: TicketRoutingMode) =>
    api.put(`/ticket-categories/${id}/routing`, { enableFallback, mode }),
}
