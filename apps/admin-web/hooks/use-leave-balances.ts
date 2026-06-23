import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leaveBalancesApi } from '@/lib/leave-balances.api'

export const balanceKeys = {
  all: ['leave-balances'] as const,
  list: (params: object) => [...balanceKeys.all, 'list', params] as const,
}

export function useLeaveBalances(params: { year: number; page?: number; pageSize?: number; employeeId?: string; companyId?: string }) {
  return useQuery({
    queryKey: balanceKeys.list(params),
    queryFn: () => leaveBalancesApi.getAll(params),
  })
}

export function useCreateLeaveBalance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { employeeId: string; leaveTypeId: string; year: number; totalDays: number }) =>
      leaveBalancesApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: balanceKeys.all }),
  })
}

export function useAdjustBalance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, totalDays }: { id: string; totalDays: number }) =>
      leaveBalancesApi.adjust(id, totalDays),
    onSuccess: () => qc.invalidateQueries({ queryKey: balanceKeys.all }),
  })
}

export function useSeedBalances() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { year: number; companyId?: string }) => leaveBalancesApi.seed(params),
    onSuccess: () => qc.invalidateQueries({ queryKey: balanceKeys.all }),
  })
}

export function useSeedBalancesForEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ employeeId, year }: { employeeId: string; year: number }) =>
      leaveBalancesApi.seedForEmployee(employeeId, year),
    onSuccess: () => qc.invalidateQueries({ queryKey: balanceKeys.all }),
  })
}
