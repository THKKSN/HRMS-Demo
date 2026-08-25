import { api } from './api'
import type {
  EmployeeListItemDto,
  EmployeeDetailDto,
  EmployeeRoleDto,
  PagedResult,
} from '@/types/admin'
import type { EmployeeProfileDto } from '@hrms/shared-types'

export type EmployeeListParams = {
  page?: number
  pageSize?: number
  search?: string
  isActive?: boolean
  companyId?: string
  departmentId?: string
  roleLabelId?: string
  role?: string
}

export const employeesApi = {
  getMe: () =>
    api.get<EmployeeProfileDto>('/employees/me').then((r) => r.data),

  getAll: (params?: EmployeeListParams) =>
    api.get<PagedResult<EmployeeListItemDto>>('/employees', { params }).then((r) => r.data),

  getById: (id: string) =>
    api.get<EmployeeDetailDto>(`/employees/${id}`).then((r) => r.data),

  create: (body: {
    employeeCode: string
    firstName: string
    lastName: string
    nickname?: string
    email?: string
    phone?: string
    nationalId?: string
    password: string
    hireDate?: string
    departmentId?: string
    companyId?: string
    roleLabelId?: string
  }) => api.post<EmployeeDetailDto>('/employees', body).then((r) => r.data),

  update: (
    id: string,
    body: {
      firstName: string
      lastName: string
      nickname?: string
      email?: string
      phone?: string
      hireDate?: string
      companyId?: string
      departmentId?: string
      roleLabelId?: string
      nationalId?: string
    },
  ) => api.put<EmployeeDetailDto>(`/employees/${id}`, body).then((r) => r.data),

  toggleStatus: (id: string, isActive: boolean) =>
    api.patch(`/employees/${id}/status`, { isActive }),

  setPassword: (id: string, newPassword: string) =>
    api.put(`/employees/${id}/password`, { newPassword }),

  getRoles: (id: string) =>
    api.get<EmployeeRoleDto[]>(`/employees/${id}/roles`).then((r) => r.data),

  addRole: (id: string, body: { roleId: string; departmentId?: string }) =>
    api.post<EmployeeRoleDto>(`/employees/${id}/roles`, body).then((r) => r.data),

  removeRole: (employeeId: string, roleId: string) =>
    api.delete(`/employees/${employeeId}/roles/${roleId}`),
}
