import { api } from './api'
import type { PermissionDto, RolePermissionSummaryDto } from '@hrms/shared-types'

export const permissionApi = {
  getAll: (module?: string) =>
    api
      .get<PermissionDto[]>('/permissions', { params: module ? { module } : undefined })
      .then((r) => r.data),

  getAllRoles: () =>
    api.get<RolePermissionSummaryDto[]>('/permissions/roles').then((r) => r.data),

  getRolePermissions: (roleId: string) =>
    api.get<RolePermissionSummaryDto>(`/permissions/roles/${roleId}`).then((r) => r.data),

  setRolePermissions: (roleId: string, permissionIds: string[]) =>
    api
      .put<RolePermissionSummaryDto>(`/permissions/roles/${roleId}`, { roleId, permissionIds })
      .then((r) => r.data),
}
