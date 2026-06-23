import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { holidaySchedulesApi } from '@/lib/holiday-schedules.api'

export const scheduleKeys = {
  all: ['holiday-schedules'] as const,
  list: (companyId?: string, includeInactive?: boolean) =>
    [...scheduleKeys.all, 'list', companyId, includeInactive] as const,
  detail: (id: string) => [...scheduleKeys.all, 'detail', id] as const,
  preview: (id: string, year: number) => [...scheduleKeys.all, 'preview', id, year] as const,
}

export function useHolidaySchedules(companyId?: string, includeInactive = false) {
  return useQuery({
    queryKey: scheduleKeys.list(companyId, includeInactive),
    queryFn: () => holidaySchedulesApi.getAll(companyId, includeInactive),
  })
}

export function useHolidayScheduleById(id: string) {
  return useQuery({
    queryKey: scheduleKeys.detail(id),
    queryFn: () => holidaySchedulesApi.getById(id),
    enabled: !!id,
  })
}

export function usePreviewHolidaysFromSchedule(id: string, year: number, enabled = false) {
  return useQuery({
    queryKey: scheduleKeys.preview(id, year),
    queryFn: () => holidaySchedulesApi.preview(id, year),
    enabled: enabled && !!id,
  })
}

export function useCreateHolidaySchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: holidaySchedulesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduleKeys.all }),
  })
}

export function useUpdateHolidaySchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Parameters<typeof holidaySchedulesApi.update>[1]) =>
      holidaySchedulesApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduleKeys.all }),
  })
}

export function useToggleHolidayScheduleStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      holidaySchedulesApi.toggleStatus(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduleKeys.all }),
  })
}
