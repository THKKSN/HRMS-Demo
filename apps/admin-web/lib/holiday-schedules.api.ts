import { api } from './api'
import type { WeeklyHolidayScheduleDto } from '@/types/admin'
import type { BulkHolidayItem } from './holidays.api'

export const holidaySchedulesApi = {
  getAll: (companyId?: string, includeInactive = false) =>
    api
      .get<WeeklyHolidayScheduleDto[]>('/holiday-schedules', {
        params: { companyId, includeInactive },
      })
      .then((r) => r.data),

  getById: (id: string) =>
    api.get<WeeklyHolidayScheduleDto>(`/holiday-schedules/${id}`).then((r) => r.data),

  create: (body: {
    companyId?: string
    name: string
    dayOfWeek: number
    workDayOccurrences: number[]
  }) => api.post<WeeklyHolidayScheduleDto>('/holiday-schedules', body).then((r) => r.data),

  update: (
    id: string,
    body: {
      name: string
      dayOfWeek: number
      workDayOccurrences: number[]
      isActive: boolean
    },
  ) => api.put<WeeklyHolidayScheduleDto>(`/holiday-schedules/${id}`, body).then((r) => r.data),

  toggleStatus: (id: string, isActive: boolean) =>
    api
      .patch<WeeklyHolidayScheduleDto>(`/holiday-schedules/${id}/status`, { isActive })
      .then((r) => r.data),

  preview: (id: string, year: number) =>
    api
      .get<BulkHolidayItem[]>(`/holiday-schedules/${id}/preview`, { params: { year } })
      .then((r) => r.data),
}
