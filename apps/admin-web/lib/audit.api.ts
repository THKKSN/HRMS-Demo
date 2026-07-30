import { api } from './api'
import type { AuditLogDto, PagedResult } from '@hrms/shared-types'

export const auditApi = {
  getLogs: (params: {
    module?: string
    entityType?: string
    entityId?: string
    action?: string
    performedByEmployeeId?: string
    dateFrom?: string
    dateTo?: string
    page?: number
    pageSize?: number
  }) =>
    api
      .get<PagedResult<AuditLogDto>>('/audit-logs', { params })
      .then((r) => r.data),
}
