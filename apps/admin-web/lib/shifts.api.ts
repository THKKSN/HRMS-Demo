import { api } from './api'
import type { ShiftDto } from '@/types/admin'

export const shiftsApi = {
  getAll: (companyId?: string, includeInactive = false) =>
    api
      .get<ShiftDto[]>('/shifts', { params: { companyId, includeInactive } })
      .then((r) => r.data),

  getById: (id: string) =>
    api.get<ShiftDto>(`/shifts/${id}`).then((r) => r.data),

  create: (body: {
    companyId: string
    name: string
    startTime: string
    endTime: string
    gracePeriodMinutes: number
  }) => api.post<ShiftDto>('/shifts', body).then((r) => r.data),

  update: (
    id: string,
    body: {
      name: string
      startTime: string
      endTime: string
      gracePeriodMinutes: number
      isActive: boolean
    },
  ) => api.put<ShiftDto>(`/shifts/${id}`, body).then((r) => r.data),

  toggleStatus: (id: string, isActive: boolean) =>
    api.patch<ShiftDto>(`/shifts/${id}/status`, { isActive }).then((r) => r.data),
}
