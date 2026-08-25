import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApplyExpenseOcrRequest, ExpenseClaimStatus } from '@hrms/shared-types'
import { type CreateExpenseBody, type UpdateExpenseBody, expensesApi } from '@/lib/expenses.api'

export const expenseKeys = {
  all: ['expenses'] as const,
  myList: (params?: object) => [...expenseKeys.all, 'my', params] as const,
  detail: (id: string) => [...expenseKeys.all, 'detail', id] as const,
  ocr: (id: string) => [...expenseKeys.detail(id), 'ocr'] as const,
}

export function useMyExpenses(params?: { page?: number; pageSize?: number; status?: ExpenseClaimStatus }) {
  return useQuery({
    queryKey: expenseKeys.myList(params),
    queryFn: () => expensesApi.getMy(params),
  })
}

export function useExpense(id: string) {
  return useQuery({
    queryKey: expenseKeys.detail(id),
    queryFn: () => expensesApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateExpenseBody) => expensesApi.create(body),
    onSuccess: data => {
      qc.invalidateQueries({ queryKey: expenseKeys.all })
      qc.setQueryData(expenseKeys.detail(data.id), data)
    },
  })
}

export function useUpdateExpense(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateExpenseBody) => expensesApi.update(id, body),
    onSuccess: data => {
      qc.invalidateQueries({ queryKey: expenseKeys.all })
      qc.setQueryData(expenseKeys.detail(data.id), data)
    },
  })
}

export function useDeleteExpenseDraft(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => expensesApi.deleteDraft(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expenseKeys.all })
      qc.removeQueries({ queryKey: expenseKeys.detail(id) })
    },
  })
}

export function useExpenseOcrResult(id: string, enabled = true) {
  return useQuery({
    queryKey: expenseKeys.ocr(id),
    queryFn: () => expensesApi.getOcrResult(id),
    enabled: !!id && enabled,
  })
}

export function useStartExpenseOcr(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => expensesApi.startOcr(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expenseKeys.ocr(id) })
    },
  })
}

export function useApplyExpenseOcr(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ApplyExpenseOcrRequest) => expensesApi.applyOcr(id, body),
    onSuccess: data => {
      qc.invalidateQueries({ queryKey: expenseKeys.all })
      qc.setQueryData(expenseKeys.detail(data.id), data)
      qc.invalidateQueries({ queryKey: expenseKeys.ocr(id) })
    },
  })
}
