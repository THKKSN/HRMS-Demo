import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { permissionApi } from '@/lib/permission.api'

export const permissionKeys = {
  all: ['permissions'] as const,
  list: (module?: string) => ['permissions', 'list', module ?? 'all'] as const,
  roles: () => ['permissions', 'roles'] as const,
}

export function usePermissions(module?: string) {
  return useQuery({
    queryKey: permissionKeys.list(module),
    queryFn: () => permissionApi.getAll(module),
    staleTime: 5 * 60_000,
  })
}

export function useAllRolePermissions(enabled = true) {
  return useQuery({
    queryKey: permissionKeys.roles(),
    queryFn: () => permissionApi.getAllRoles(),
    staleTime: 60_000,
    enabled,
  })
}

export function useSetRolePermissions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) =>
      permissionApi.setRolePermissions(roleId, permissionIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: permissionKeys.roles() }),
  })
}
