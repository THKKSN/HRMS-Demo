import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leaveTypesApi } from '@/lib/leave-types.api'

export const leaveTypeKeys = {
  all: ['leave-types'] as const,
  list: () => [...leaveTypeKeys.all, 'list'] as const,
}

export function useLeaveTypes() {
  return useQuery({
    queryKey: leaveTypeKeys.list(),
    queryFn: leaveTypesApi.getAll,
  })
}

export function useCreateLeaveType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: leaveTypesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: leaveTypeKeys.all }),
  })
}

export function useUpdateLeaveType(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Parameters<typeof leaveTypesApi.update>[1]) =>
      leaveTypesApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: leaveTypeKeys.all }),
  })
}

export function useToggleLeaveTypeStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      leaveTypesApi.toggleStatus(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: leaveTypeKeys.all }),
  })
}
