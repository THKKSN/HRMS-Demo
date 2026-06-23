import { api } from './api'
import type { AttendanceTodayDto, AttendanceRecordDto, PagedResult } from '@hrms/shared-types'

export const attendanceApi = {
  getToday: () =>
    api.get<AttendanceTodayDto>('/attendance/me/today').then(r => r.data),

  checkIn: (body: {
    locationId: string
    latitude: number
    longitude: number
    selfieUrl?: string
  }) => api.post<AttendanceTodayDto>('/attendance/check-in', body).then(r => r.data),

  checkOut: (body: {
    latitude?: number
    longitude?: number
    selfieUrl?: string
  }) => api.post<AttendanceTodayDto>('/attendance/check-out', body).then(r => r.data),

  getMyHistory: (from: string, to: string, page = 1, pageSize = 31) =>
    api.get<PagedResult<AttendanceRecordDto>>('/attendance/me', {
      params: { from, to, page, pageSize },
    }).then(r => r.data),
}
