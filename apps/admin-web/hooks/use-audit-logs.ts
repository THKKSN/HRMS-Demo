import { useQuery } from '@tanstack/react-query'
import { auditApi } from '@/lib/audit.api'

export const auditLogKeys = {
  all: ['audit-logs'] as const,
  list: (params?: object) => [...auditLogKeys.all, 'list', params] as const,
}

export function useAuditLogs(params: {
  module?: string
  entityType?: string
  entityId?: string
  action?: string
  performedByEmployeeId?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}) {
  return useQuery({
    queryKey: auditLogKeys.list(params),
    queryFn: () => auditApi.getLogs(params),
  })
}
