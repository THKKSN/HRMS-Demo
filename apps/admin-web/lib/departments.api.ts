import { api } from './api'
import type { DepartmentListItemDto, DepartmentDto } from '@hrms/shared-types'

export const departmentsApi = {
  getAll: (companyId?: string, includeInactive = false) =>
    api
      .get<DepartmentListItemDto[]>('/departments', {
        params: { companyId, includeInactive },
      })
      .then((r) => r.data),

  getById: (id: string) =>
    api.get<DepartmentDto>(`/departments/${id}`).then((r) => r.data),

  create: (body: {
    companyId: string
    name: string
    deptType?: string
    managerEmployeeId?: string
  }) => api.post<DepartmentDto>('/departments', body).then((r) => r.data),

  update: (
    id: string,
    body: {
      name: string
      deptType?: string
      managerEmployeeId?: string
      isActive: boolean
    },
  ) => api.put<DepartmentDto>(`/departments/${id}`, body).then((r) => r.data),
}
