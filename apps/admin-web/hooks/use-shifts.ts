import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { shiftsApi } from '@/lib/shifts.api'

export const shiftKeys = {
  all: ['shifts'] as const,
  list: (companyId?: string, includeInactive?: boolean) =>
    [...shiftKeys.all, 'list', companyId, includeInactive] as const,
  detail: (id: string) => [...shiftKeys.all, 'detail', id] as const,
}

export function useShifts(companyId?: string, includeInactive = false) {
  return useQuery({
    queryKey: shiftKeys.list(companyId, includeInactive),
    queryFn: () => shiftsApi.getAll(companyId, includeInactive),
  })
}

export function useCreateShift() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: shiftsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: shiftKeys.all }),
  })
}

export function useUpdateShift() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: { id: string } & Parameters<typeof shiftsApi.update>[1]) =>
      shiftsApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: shiftKeys.all }),
  })
}

export function useToggleShiftStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      shiftsApi.toggleStatus(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: shiftKeys.all }),
  })
}
