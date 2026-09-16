import { api } from './api'
import type { MemoOverviewDto } from '@hrms/shared-types'

export type MemoReportParams = {
  dateFrom?: string
  dateTo?: string
  // บริษัทปลายทางที่รับเรื่อง (MemoType.CompanyId) — ความหมายเดียวกับตัวกรองบริษัทของรายงาน ticket
  companyId?: string
  topLimit?: number
}

export const memoReportsApi = {
  overview: (params: MemoReportParams) =>
    api.get<MemoOverviewDto>('/memo-reports/overview', { params }).then(r => r.data),
}
