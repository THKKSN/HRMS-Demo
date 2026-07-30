import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { LeaveStatus } from '@hrms/shared-types'
import { type CreateLeaveBody, leavesApi } from '@/lib/leaves.api'

export const leaveKeys = {
  all: ['leaves'] as const,
  list: (params?: object) => [...leaveKeys.all, 'list', params] as const,
  detail: (id: string) => [...leaveKeys.all, 'detail', id] as const,
  pending: (params?: object) => [...leaveKeys.all, 'pending', params] as const,
  cancellationPending: (params?: object) => [...leaveKeys.all, 'cancellation-pending', params] as const,
  balance: (year: number) => ['leave-balance', year] as const,
  types: () => ['leave-types'] as const,
}

export function useLeaveTypes() {
  return useQuery({
    queryKey: leaveKeys.types(),
    queryFn: leavesApi.getLeaveTypes,
  })
}

export function useMyLeaves(params?: { page?: number; pageSize?: number; status?: LeaveStatus }) {
  return useQuery({
    queryKey: leaveKeys.list({ ...params, myOnly: true }),
    queryFn: () => leavesApi.getMyLeaves(params),
  })
}

export function useAllLeaves(params?: {
  page?: number
  pageSize?: number
  status?: LeaveStatus
  employeeId?: string
  search?: string
  dateFrom?: string
  dateTo?: string
}) {
  return useQuery({
    queryKey: leaveKeys.list(params),
    queryFn: () => leavesApi.getAllLeaves(params),
  })
}

export function useLeaveById(id: string) {
  return useQuery({
    queryKey: leaveKeys.detail(id),
    queryFn: () => leavesApi.getLeaveById(id),
    enabled: !!id,
  })
}

export function useLeaveBalance(year = new Date().getFullYear()) {
  return useQuery({
    queryKey: leaveKeys.balance(year),
    queryFn: () => leavesApi.getMyLeaveBalance(year),
  })
}

export function useCreateLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateLeaveBody) => leavesApi.createLeave(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: leaveKeys.all }),
  })
}

export function useCancelLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => leavesApi.cancelLeave(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: leaveKeys.all })
      qc.invalidateQueries({ queryKey: leaveKeys.detail(id) })
    },
  })
}

export function usePendingApprovals(params?: { page?: number; pageSize?: number } | false) {
  return useQuery({
    queryKey: leaveKeys.pending(params || undefined),
    queryFn: () => leavesApi.getPendingApprovals(params || undefined),
    enabled: params !== false,
  })
}

export function useApproveLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      leavesApi.approveLeave(id, comment),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: leaveKeys.all })
      qc.invalidateQueries({ queryKey: leaveKeys.detail(id) })
    },
  })
}

export function useRejectLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      leavesApi.rejectLeave(id, comment),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: leaveKeys.all })
      qc.invalidateQueries({ queryKey: leaveKeys.detail(id) })
    },
  })
}

export function useRequestCancelLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      leavesApi.requestCancelLeave(id, reason),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: leaveKeys.all })
      qc.invalidateQueries({ queryKey: leaveKeys.detail(id) })
    },
  })
}

export function useCancellationPending(params?: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: leaveKeys.cancellationPending(params),
    queryFn: () => leavesApi.getCancellationPending(params),
    staleTime: 30_000,
  })
}

export function useApproveCancelLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      leavesApi.approveCancelLeave(id, comment),
    onSuccess: () => qc.invalidateQueries({ queryKey: leaveKeys.all }),
  })
}

export function useRejectCancelLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      leavesApi.rejectCancelLeave(id, comment),
    onSuccess: () => qc.invalidateQueries({ queryKey: leaveKeys.all }),
  })
}
