import { api } from './api'
import type { LeaveTypeAdminDto } from '@/types/admin'

export const leaveTypesApi = {
  getAll: () =>
    api.get<LeaveTypeAdminDto[]>('/leave-types').then((r) => r.data),

  create: (body: {
    code: string
    nameTh: string
    nameEn?: string
    defaultDaysPerYear: number
    requiresAttachment: boolean
  }) => api.post<LeaveTypeAdminDto>('/leave-types', body).then((r) => r.data),

  update: (
    id: string,
    body: {
      nameTh: string
      nameEn?: string
      defaultDaysPerYear: number
      requiresAttachment: boolean
    },
  ) => api.put<LeaveTypeAdminDto>(`/leave-types/${id}`, body).then((r) => r.data),

  toggleStatus: (id: string, isActive: boolean) =>
    api.patch(`/leave-types/${id}/status`, { isActive }),
}
