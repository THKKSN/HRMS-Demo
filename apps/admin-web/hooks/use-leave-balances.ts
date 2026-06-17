import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leaveBalancesApi } from '@/lib/leave-balances.api'

export const balanceKeys = {
  all: ['leave-balances'] as const,
  list: (params: object) => [...balanceKeys.all, 'list', params] as const,
}

export function useLeaveBalances(params: { year: number; page?: number; pageSize?: number; employeeId?: string }) {
  return useQuery({
    queryKey: balanceKeys.list(params),
    queryFn: () => leaveBalancesApi.getAll(params),
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
    mutationFn: leaveBalancesApi.seed,
    onSuccess: () => qc.invalidateQueries({ queryKey: balanceKeys.all }),
  })
}
