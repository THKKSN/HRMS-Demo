import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { roleLabelsApi } from '@/lib/role-labels.api'

export const roleLabelKeys = {
  all: ['role-labels'] as const,
  byCompany: (companyId: string, includeInactive = false) =>
    [...roleLabelKeys.all, companyId, includeInactive] as const,
}

export function useRoleLabels(companyId?: string, includeInactive = false) {
  return useQuery({
    queryKey: roleLabelKeys.byCompany(companyId ?? '', includeInactive),
    queryFn: () => roleLabelsApi.getAll(companyId!, includeInactive),
    enabled: !!companyId,
    staleTime: 30_000,
  })
}

export function useCreateRoleLabel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: roleLabelsApi.create,
    onSuccess: (_, variables) =>
      qc.invalidateQueries({ queryKey: roleLabelKeys.byCompany(variables.companyId) }),
  })
}

export function useUpdateRoleLabel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; name: string; isActive: boolean }) =>
      roleLabelsApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: roleLabelKeys.all }),
  })
}

export function useDeleteRoleLabel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: roleLabelsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: roleLabelKeys.all }),
  })
}
