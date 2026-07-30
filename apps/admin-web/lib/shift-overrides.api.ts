import { api } from './api'

export type ShiftOverrideDto = {
  id: string
  shiftId: string
  shiftName: string
  startTime: string
  endTime: string
  effectiveFrom: string
  effectiveTo: string | null
  reason: string | null
  isActive: boolean
  createdAt: string
}

export type CurrentShiftDto = {
  shiftId: string | null
  shiftName: string | null
  startTime: string | null
  endTime: string | null
  gracePeriodMinutes: number | null
  source: 'override' | 'department' | 'company' | 'none'
}

export const shiftOverridesApi = {
  getAll: (employeeId: string) =>
    api.get<ShiftOverrideDto[]>(`/employees/${employeeId}/shift-overrides`).then((r) => r.data),

  getCurrent: (employeeId: string) =>
    api.get<CurrentShiftDto>(`/employees/${employeeId}/shift-overrides/current`).then((r) => r.data),

  set: (employeeId: string, body: {
    shiftId: string
    effectiveFrom: string
    effectiveTo?: string | null
    reason?: string | null
  }) =>
    api.post<{ id: string }>(`/employees/${employeeId}/shift-overrides`, body).then((r) => r.data),

  remove: (employeeId: string, overrideId: string) =>
    api.delete(`/employees/${employeeId}/shift-overrides/${overrideId}`),
}
