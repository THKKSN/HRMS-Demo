import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  expenseBillingBatchesApi,
  type CreateExpenseBillingBatchRequest,
  type ExpenseBillingBatchListParams,
} from '@/lib/expense-billing-batches.api'
import { expenseKeys } from './use-expenses'

export const expenseBillingBatchKeys = {
  all: ['expense-billing-batches'] as const,
  list: (params?: object) => [...expenseBillingBatchKeys.all, 'list', params] as const,
  detail: (id: string) => [...expenseBillingBatchKeys.all, 'detail', id] as const,
}

export function useExpenseBillingBatches(params?: ExpenseBillingBatchListParams) {
  return useQuery({
    queryKey: expenseBillingBatchKeys.list(params),
    queryFn: () => expenseBillingBatchesApi.getAll(params),
    staleTime: 30_000,
  })
}

export function useExpenseBillingBatch(id: string) {
  return useQuery({
    queryKey: expenseBillingBatchKeys.detail(id),
    queryFn: () => expenseBillingBatchesApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateExpenseBillingBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateExpenseBillingBatchRequest) => expenseBillingBatchesApi.create(body),
    onSuccess: data => {
      qc.invalidateQueries({ queryKey: expenseBillingBatchKeys.all })
      qc.invalidateQueries({ queryKey: expenseKeys.all })
      qc.setQueryData(expenseBillingBatchKeys.detail(data.id), data)
    },
  })
}

export function useMarkExpenseBillingBatchPaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => expenseBillingBatchesApi.markPaid(id),
    onSuccess: data => {
      qc.invalidateQueries({ queryKey: expenseBillingBatchKeys.all })
      qc.invalidateQueries({ queryKey: expenseKeys.all })
      qc.setQueryData(expenseBillingBatchKeys.detail(data.id), data)
    },
  })
}

export function useCancelExpenseBillingBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => expenseBillingBatchesApi.cancel(id),
    onSuccess: data => {
      qc.invalidateQueries({ queryKey: expenseBillingBatchKeys.all })
      qc.invalidateQueries({ queryKey: expenseKeys.all })
      qc.setQueryData(expenseBillingBatchKeys.detail(data.id), data)
    },
  })
}
