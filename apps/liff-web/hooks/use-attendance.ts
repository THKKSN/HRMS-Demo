import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { attendanceApi } from '@/lib/attendance.api'

export const attendanceKeys = {
  today: ['attendance', 'today'] as const,
  history: (from: string, to: string) => ['attendance', 'history', from, to] as const,
}

export function useAttendanceToday() {
  return useQuery({
    queryKey: attendanceKeys.today,
    queryFn: attendanceApi.getToday,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
}

export function useMyAttendanceHistory(from: string, to: string) {
  return useQuery({
    queryKey: attendanceKeys.history(from, to),
    queryFn: () => attendanceApi.getMyHistory(from, to),
    staleTime: 60_000,
    enabled: !!from && !!to,
  })
}

export function useCheckIn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: attendanceApi.checkIn,
    onSuccess: () => qc.invalidateQueries({ queryKey: attendanceKeys.today }),
  })
}

export function useCheckOut() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: attendanceApi.checkOut,
    onSuccess: () => qc.invalidateQueries({ queryKey: attendanceKeys.today }),
  })
}
