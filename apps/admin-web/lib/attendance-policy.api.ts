import { api } from './api'
import type { AttendancePolicyDto, AttendanceMonthlyViolationDto, PagedResult } from '@hrms/shared-types'
import { isAxiosError } from 'axios'

export const attendancePolicyApi = {
  get: (companyId: string) =>
    api
      .get<AttendancePolicyDto>('/attendance-policies', { params: { companyId } })
      .then((r) => r.data)
      .catch((err: unknown) => {
        if (isAxiosError(err) && err.response?.status === 404) return null
        throw err
      }),

  upsert: (data: {
    companyId: string
    maxLateMinutesPerMonth: number
    maxLateCountPerMonth: number
    maxAbsenceCountPerMonth: number
  }) =>
    api.put<AttendancePolicyDto>('/attendance-policies', data).then((r) => r.data),

  getViolations: (params: {
    year: number
    month: number
    employeeId?: string
    page?: number
    pageSize?: number
  }) =>
    api
      .get<PagedResult<AttendanceMonthlyViolationDto>>('/attendance-policies/violations', { params })
      .then((r) => r.data),
}
