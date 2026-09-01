import { api } from './api'
import type {
  TicketBacklogResultDto,
  TicketCategoryReportItemDto,
  TicketPriority,
  TicketProblemType,
  TicketQualityReportDto,
  TicketReportSummaryDto,
  TicketRequestType,
  TicketReportScopeDto,
  TicketRoutingReportDto,
  TicketStatus,
  TicketTrendItemDto,
  TicketWorkloadItemDto,
} from '@hrms/shared-types'

export type TicketReportParams = {
  dateFrom?: string
  dateTo?: string
  companyId?: string
  departmentId?: string
  categoryId?: string
  topicId?: string
  priority?: TicketPriority
  status?: TicketStatus
  responsibleEmployeeId?: string
  requestType?: TicketRequestType
  problemType?: TicketProblemType
  dateBasis?: 'CreatedAt' | 'ClosedAt'
}

export const ticketReportsApi = {
  scope: () =>
    api.get<TicketReportScopeDto>('/ticket-reports/scope').then(r => r.data),
  summary: (params: TicketReportParams) =>
    api.get<TicketReportSummaryDto>('/ticket-reports/summary', { params }).then(r => r.data),
  trend: (params: TicketReportParams) =>
    api.get<TicketTrendItemDto[]>('/ticket-reports/trend', { params }).then(r => r.data),
  backlog: (params: TicketReportParams & { page?: number; pageSize?: number }) =>
    api.get<TicketBacklogResultDto>('/ticket-reports/backlog', { params }).then(r => r.data),
  categories: (params: TicketReportParams) =>
    api.get<TicketCategoryReportItemDto[]>('/ticket-reports/categories', { params }).then(r => r.data),
  workload: (params: TicketReportParams) =>
    api.get<TicketWorkloadItemDto[]>('/ticket-reports/workload', { params }).then(r => r.data),
  quality: (params: TicketReportParams) =>
    api.get<TicketQualityReportDto>('/ticket-reports/quality', { params }).then(r => r.data),
  routing: (params: TicketReportParams) =>
    api.get<TicketRoutingReportDto>('/ticket-reports/routing', { params }).then(r => r.data),
  exportExcel: (params: TicketReportParams) =>
    api.get<Blob>('/ticket-reports/export', { params, responseType: 'blob' }).then(r => r.data),
}
