import { api } from './api'
import type { RoleLabelDto } from '@hrms/shared-types'

export const roleLabelsApi = {
  getAll: (companyId: string, includeInactive = false) =>
    api
      .get<RoleLabelDto[]>('/role-labels', { params: { companyId, includeInactive } })
      .then((r) => r.data),

  create: (body: { companyId: string; name: string }) =>
    api.post<RoleLabelDto>('/role-labels', body).then((r) => r.data),

  update: (id: string, body: { name: string; isActive: boolean }) =>
    api.put<RoleLabelDto>(`/role-labels/${id}`, body).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/role-labels/${id}`),
}
