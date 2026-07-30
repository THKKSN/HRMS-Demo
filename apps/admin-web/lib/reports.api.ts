import { api } from './api'
import type {
  AttendanceDailySummaryDto,
  AttendanceTrendItemDto,
  AttendanceMonthlySummaryDto,
} from '@hrms/shared-types'

export const reportsApi = {
  getDailySummary: (date?: string) =>
    api
      .get<AttendanceDailySummaryDto>('/reports/attendance/daily-summary', {
        params: date ? { date } : undefined,
      })
      .then((r) => r.data),

  getTrend: (params?: { dateFrom?: string; dateTo?: string }) =>
    api
      .get<AttendanceTrendItemDto[]>('/reports/attendance/trend', { params })
      .then((r) => r.data),

  getMonthlySummary: (params?: { year?: number; month?: number; departmentId?: string }) =>
    api
      .get<AttendanceMonthlySummaryDto[]>('/reports/attendance/monthly-summary', { params })
      .then((r) => r.data),

  exportExcel: (params?: { year?: number; month?: number; departmentId?: string }) =>
    api
      .get<Blob>('/reports/attendance/export-excel', {
        params,
        responseType: 'blob',
      })
      .then((r) => r.data),
}
