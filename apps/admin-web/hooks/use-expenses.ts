import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { expensesApi, type ExpenseListParams } from '@/lib/expenses.api'

export const expenseKeys = {
  all: ['expenses'] as const,
  list: (params?: object) => [...expenseKeys.all, 'list', params] as const,
  detail: (id: string) => [...expenseKeys.all, 'detail', id] as const,
}

export function useExpenses(params?: ExpenseListParams) {
  return useQuery({
    queryKey: expenseKeys.list(params),
    queryFn: () => expensesApi.getAll(params),
    staleTime: 30_000,
  })
}

export function useExpense(id: string) {
  return useQuery({
    queryKey: expenseKeys.detail(id),
    queryFn: () => expensesApi.getById(id),
    enabled: !!id,
  })
}

export function useApproveExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) => expensesApi.approve(id, comment),
    onSuccess: data => {
      qc.invalidateQueries({ queryKey: expenseKeys.all })
      qc.setQueryData(expenseKeys.detail(data.id), data)
    },
  })
}

export function useRejectExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) => expensesApi.reject(id, comment),
    onSuccess: data => {
      qc.invalidateQueries({ queryKey: expenseKeys.all })
      qc.setQueryData(expenseKeys.detail(data.id), data)
    },
  })
}
