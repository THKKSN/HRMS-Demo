import { api } from './api'
import type { HolidayDto } from '@/types/admin'

export type BulkHolidayItem = {
  name: string
  date: string   // "YYYY-MM-DD"
  companyId?: string
}

export type BulkCreateResult = {
  created: number
  skipped: number
}

export const holidaysApi = {
  getAll: (year: number, companyId?: string, includeInactive = false) =>
    api
      .get<HolidayDto[]>('/holidays', { params: { year, companyId, includeInactive } })
      .then((r) => r.data),

  getById: (id: string) =>
    api.get<HolidayDto>(`/holidays/${id}`).then((r) => r.data),

  create: (body: { companyId?: string; name: string; date: string }) =>
    api.post<HolidayDto>('/holidays', body).then((r) => r.data),

  update: (id: string, body: { name: string; date: string; isActive: boolean }) =>
    api.put<HolidayDto>(`/holidays/${id}`, body).then((r) => r.data),

  toggleStatus: (id: string, isActive: boolean) =>
    api.patch<HolidayDto>(`/holidays/${id}/status`, { isActive }).then((r) => r.data),

  generateSaturdays: (year: number, companyId?: string, holidayName?: string) =>
    api
      .get<BulkHolidayItem[]>('/holidays/generate-saturdays', {
        params: { year, companyId, holidayName },
      })
      .then((r) => r.data),

  bulkCreate: (holidays: BulkHolidayItem[]) =>
    api.post<BulkCreateResult>('/holidays/bulk', { holidays }).then((r) => r.data),
}
