import { useQuery } from '@tanstack/react-query'
import { attendanceApi } from '@/lib/attendance.api'

export const attendanceKeys = {
  history: (from: string, to: string) => ['attendance', 'history', from, to] as const,
}

export function useMyAttendanceHistory(from: string, to: string) {
  return useQuery({
    queryKey: attendanceKeys.history(from, to),
    queryFn: () => attendanceApi.getMyHistory(from, to),
    staleTime: 60_000,
    enabled: !!from && !!to,
  })
}
