import { api } from './api'
import type { CompanyDto, CompanyTreeDto } from '@hrms/shared-types'

export const companiesApi = {
  getAll: (includeInactive = false) =>
    api.get<CompanyTreeDto[]>('/companies', { params: { includeInactive } }).then((r) => r.data),

  getById: (id: string) =>
    api.get<CompanyDto>(`/companies/${id}`).then((r) => r.data),

  create: (body: { name: string; nameEn?: string; orgType: string; parentId?: string }) =>
    api.post<CompanyDto>('/companies', body).then((r) => r.data),

  update: (
    id: string,
    body: { name: string; nameEn?: string; orgType: string; parentId?: string; isActive: boolean },
  ) => api.put<CompanyDto>(`/companies/${id}`, body).then((r) => r.data),
}
