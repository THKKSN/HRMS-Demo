import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { shiftOverridesApi } from '@/lib/shift-overrides.api'

export const shiftOverrideKeys = {
  all: (employeeId: string) => ['shift-overrides', employeeId] as const,
  list: (employeeId: string) => [...shiftOverrideKeys.all(employeeId), 'list'] as const,
  current: (employeeId: string) => [...shiftOverrideKeys.all(employeeId), 'current'] as const,
}

export function useShiftOverrides(employeeId: string) {
  return useQuery({
    queryKey: shiftOverrideKeys.list(employeeId),
    queryFn: () => shiftOverridesApi.getAll(employeeId),
    staleTime: 60_000,
    enabled: !!employeeId,
  })
}

export function useCurrentShift(employeeId: string) {
  return useQuery({
    queryKey: shiftOverrideKeys.current(employeeId),
    queryFn: () => shiftOverridesApi.getCurrent(employeeId),
    staleTime: 60_000,
    enabled: !!employeeId,
  })
}

export function useSetShiftOverride(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { shiftId: string; effectiveFrom: string; effectiveTo?: string | null; reason?: string | null }) =>
      shiftOverridesApi.set(employeeId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: shiftOverrideKeys.all(employeeId) })
    },
  })
}

export function useRemoveShiftOverride(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (overrideId: string) => shiftOverridesApi.remove(employeeId, overrideId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: shiftOverrideKeys.all(employeeId) })
    },
  })
}
