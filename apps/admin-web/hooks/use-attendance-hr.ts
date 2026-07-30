import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AttendanceStatus } from '@hrms/shared-types'
import { attendanceApi } from '@/lib/attendance.api'

export const attendanceHrKeys = {
  all: ['attendance-hr'] as const,
  list: (params?: object) => [...attendanceHrKeys.all, 'list', params] as const,
  detail: (id: string) => [...attendanceHrKeys.all, 'detail', id] as const,
  calendar: (employeeId: string, year: number, month: number) =>
    [...attendanceHrKeys.all, 'calendar', employeeId, year, month] as const,
  stats: (employeeId: string, year: number, month: number) =>
    [...attendanceHrKeys.all, 'stats', employeeId, year, month] as const,
}

export function useAttendanceRecords(params: {
  employeeId?: string
  departmentId?: string
  dateFrom?: string
  dateTo?: string
  status?: AttendanceStatus
  search?: string
  companyId?: string
  page?: number
  pageSize?: number
}) {
  return useQuery({
    queryKey: attendanceHrKeys.list(params),
    queryFn: () => attendanceApi.getRecords(params),
  })
}

export function useAttendanceRecordById(id: string) {
  return useQuery({
    queryKey: attendanceHrKeys.detail(id),
    queryFn: () => attendanceApi.getRecordById(id),
    enabled: !!id,
  })
}

export function useCreateAttendanceRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Parameters<typeof attendanceApi.createRecord>[0]) =>
      attendanceApi.createRecord(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: attendanceHrKeys.all }),
  })
}

export function useUpdateAttendanceRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: {
      id: string
      body: Parameters<typeof attendanceApi.updateRecord>[1]
    }) => attendanceApi.updateRecord(id, body),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: attendanceHrKeys.all })
      qc.invalidateQueries({ queryKey: attendanceHrKeys.detail(id) })
    },
  })
}

export function useEmployeeMonthlyCalendar(
  employeeId: string,
  year: number,
  month: number,
) {
  return useQuery({
    queryKey: attendanceHrKeys.calendar(employeeId, year, month),
    queryFn: () => attendanceApi.getEmployeeMonthlyCalendar(employeeId, year, month),
    enabled: !!employeeId,
  })
}

export function useEmployeeMonthlyStats(
  employeeId: string,
  year: number,
  month: number,
) {
  return useQuery({
    queryKey: attendanceHrKeys.stats(employeeId, year, month),
    queryFn: () => attendanceApi.getEmployeeMonthlyStats(employeeId, year, month),
    enabled: !!employeeId,
  })
}
