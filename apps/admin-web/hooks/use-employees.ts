import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { employeesApi, type EmployeeListParams } from '@/lib/employees.api'

export const employeeKeys = {
  all: ['employees'] as const,
  list: (params?: object) => [...employeeKeys.all, 'list', params] as const,
  detail: (id: string) => [...employeeKeys.all, 'detail', id] as const,
  roles: (id: string) => [...employeeKeys.all, 'roles', id] as const,
}

export function useEmployees(params?: EmployeeListParams) {
  return useQuery({
    queryKey: employeeKeys.list(params),
    queryFn: () => employeesApi.getAll(params),
    placeholderData: (prev) => prev,
  })
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: () => employeesApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: employeesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: employeeKeys.all }),
  })
}

export function useUpdateEmployee(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Parameters<typeof employeesApi.update>[1]) =>
      employeesApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.detail(id) })
      qc.invalidateQueries({ queryKey: employeeKeys.list() })
    },
  })
}

export function useToggleEmployeeStatus(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (isActive: boolean) => employeesApi.toggleStatus(id, isActive),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.detail(id) })
      qc.invalidateQueries({ queryKey: employeeKeys.list() })
    },
  })
}

export function useSetPassword(id: string) {
  return useMutation({
    mutationFn: (newPassword: string) => employeesApi.setPassword(id, newPassword),
  })
}

export function useAddEmployeeRole(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { roleId: string; departmentId?: string }) =>
      employeesApi.addRole(employeeId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: employeeKeys.detail(employeeId) }),
  })
}

export function useRemoveEmployeeRole(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (roleId: string) => employeesApi.removeRole(employeeId, roleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: employeeKeys.detail(employeeId) }),
  })
}
