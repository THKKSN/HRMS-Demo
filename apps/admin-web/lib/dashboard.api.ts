import type {
  AccessibleCompanyItem,
  AdminDashboardDto,
  CompanyDashboardDto,
  MyDashboardDto,
  TeamDashboardDto,
} from '@hrms/shared-types'
import { api } from './api'

export const dashboardApi = {
  getMy:     () => api.get<MyDashboardDto>('/dashboard/my').then(r => r.data),
  getTeam:   () => api.get<TeamDashboardDto>('/dashboard/team').then(r => r.data),
  getCompany: (companyId?: string) =>
    api.get<CompanyDashboardDto>('/dashboard/company', {
      params: companyId ? { companyId } : undefined,
    }).then(r => r.data),
  getAccessibleCompanies: () =>
    api.get<AccessibleCompanyItem[]>('/dashboard/companies').then(r => r.data),
  getAdmin:  () => api.get<AdminDashboardDto>('/dashboard/admin').then(r => r.data),
}
