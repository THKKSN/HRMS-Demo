import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { departmentsApi } from '@/lib/departments.api'

export const deptKeys = {
  all: ['departments'] as const,
  list: (companyId?: string, includeInactive?: boolean) =>
    [...deptKeys.all, 'list', { companyId, includeInactive }] as const,
  detail: (id: string) => [...deptKeys.all, 'detail', id] as const,
}

export function useDepartments(companyId?: string, includeInactive = false) {
  return useQuery({
    queryKey: deptKeys.list(companyId, includeInactive),
    queryFn: () => departmentsApi.getAll(companyId, includeInactive),
    staleTime: 30_000,
  })
}

export function useCreateDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: departmentsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: deptKeys.all }),
  })
}

export function useUpdateDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string
      name: string
      deptType?: string
      managerEmployeeId?: string
      isActive: boolean
    }) => departmentsApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: deptKeys.all }),
  })
}
