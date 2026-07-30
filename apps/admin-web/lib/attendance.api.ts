import { api } from './api'
import type {
  AttendanceRecordDto,
  AttendanceRecordHrDto,
  AttendanceStatus,
  EmployeeCalendarDayDto,
  EmployeeMonthlyStatsDto,
  PagedResult,
} from '@hrms/shared-types'

export const attendanceApi = {
  getMyHistory: (from: string, to: string, page = 1, pageSize = 31) =>
    api
      .get<PagedResult<AttendanceRecordDto>>('/attendance/me', {
        params: { from, to, page, pageSize },
      })
      .then((r) => r.data),

  // HR: list with filters
  getRecords: (params: {
    employeeId?: string
    departmentId?: string
    dateFrom?: string
    dateTo?: string
    status?: AttendanceStatus
    search?: string
    companyId?: string
    page?: number
    pageSize?: number
  }) =>
    api
      .get<PagedResult<AttendanceRecordHrDto>>('/attendance/records', { params })
      .then((r) => r.data),

  // HR: get by id
  getRecordById: (id: string) =>
    api
      .get<AttendanceRecordHrDto>(`/attendance/records/${id}`)
      .then((r) => r.data),

  // HR: create
  createRecord: (body: {
    employeeId: string
    date: string
    checkInTime?: string
    checkOutTime?: string
    isLate: boolean
    lateMinutes: number
    status: AttendanceStatus
    remark?: string
  }) =>
    api.post<{ id: string }>('/attendance/records', body).then((r) => r.data),

  // HR: update
  updateRecord: (
    id: string,
    body: {
      id: string
      checkInTime?: string
      checkOutTime?: string
      isLate: boolean
      lateMinutes: number
      status: AttendanceStatus
      remark?: string
    },
  ) => api.put(`/attendance/records/${id}`, body),

  // HR/Supervisor: employee monthly calendar
  getEmployeeMonthlyCalendar: (employeeId: string, year: number, month: number) =>
    api
      .get<EmployeeCalendarDayDto[]>(`/attendance/employees/${employeeId}/monthly-calendar`, {
        params: { year, month },
      })
      .then((r) => r.data),

  // HR/Supervisor: employee monthly stats
  getEmployeeMonthlyStats: (employeeId: string, year: number, month: number) =>
    api
      .get<EmployeeMonthlyStatsDto>(`/attendance/employees/${employeeId}/monthly-stats`, {
        params: { year, month },
      })
      .then((r) => r.data),
}
