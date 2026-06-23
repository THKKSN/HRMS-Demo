import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { holidaysApi, type BulkHolidayItem } from '@/lib/holidays.api'

export const holidayKeys = {
  all: ['holidays'] as const,
  list: (year: number, companyId?: string, includeInactive?: boolean) =>
    [...holidayKeys.all, 'list', year, companyId, includeInactive] as const,
  detail: (id: string) => [...holidayKeys.all, 'detail', id] as const,
}

export function useHolidays(year: number, companyId?: string, includeInactive = false) {
  return useQuery({
    queryKey: holidayKeys.list(year, companyId, includeInactive),
    queryFn: () => holidaysApi.getAll(year, companyId, includeInactive),
  })
}

export function useCreateHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: holidaysApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: holidayKeys.all }),
  })
}

export function useUpdateHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Parameters<typeof holidaysApi.update>[1]) =>
      holidaysApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: holidayKeys.all }),
  })
}

export function useToggleHolidayStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      holidaysApi.toggleStatus(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: holidayKeys.all }),
  })
}

export function useGenerateSaturdays(year: number, companyId?: string, holidayName?: string, enabled = false) {
  return useQuery({
    queryKey: [...holidayKeys.all, 'generate-saturdays', year, companyId, holidayName] as const,
    queryFn: () => holidaysApi.generateSaturdays(year, companyId, holidayName),
    enabled,
  })
}

export function useBulkCreateHolidays() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (holidays: BulkHolidayItem[]) => holidaysApi.bulkCreate(holidays),
    onSuccess: () => qc.invalidateQueries({ queryKey: holidayKeys.all }),
  })
}
