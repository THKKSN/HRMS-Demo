import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ticketRoutingApi, type ResponsibilityScope } from '@/lib/ticket-routing.api'
import { ticketTaxonomyKeys } from './use-ticket-taxonomy'

const keys = {
  responsibilities: (scope: ResponsibilityScope) => ['ticket-routing', 'responsibilities', scope] as const,
  employees: (companyId: string, departmentId: string) => ['ticket-routing', 'employees', companyId, departmentId] as const,
  coverage: (companyId: string, departmentId: string) => ['ticket-routing', 'coverage', companyId, departmentId] as const,
}

export function useResponsibilities(scope: ResponsibilityScope) {
  return useQuery({ queryKey: keys.responsibilities(scope), queryFn: () => ticketRoutingApi.responsibilities(scope), enabled: !!scope.companyId && !!scope.departmentId })
}
export function useResponsibilityEmployees(companyId: string, departmentId: string) {
  return useQuery({ queryKey: keys.employees(companyId, departmentId), queryFn: () => ticketRoutingApi.employees(companyId, departmentId), enabled: !!companyId && !!departmentId })
}
export function useRoutingCoverage(companyId: string, departmentId: string) {
  return useQuery({ queryKey: keys.coverage(companyId, departmentId), queryFn: () => ticketRoutingApi.coverage(companyId, departmentId), enabled: !!companyId && !!departmentId })
}
export function useRoutingMutations(scope: ResponsibilityScope) {
  const client = useQueryClient()
  const refresh = () => {
    client.invalidateQueries({ queryKey: ['ticket-routing'] })
    client.invalidateQueries({ queryKey: ticketTaxonomyKeys.all })
  }
  return {
    create: useMutation({ mutationFn: ticketRoutingApi.create, onSuccess: refresh }),
    update: useMutation({ mutationFn: ({ id, ...body }: Parameters<typeof ticketRoutingApi.update>[1] & { id: string }) => ticketRoutingApi.update(id, body), onSuccess: refresh }),
    preview: useMutation({ mutationFn: ticketRoutingApi.preview }),
    topicMode: useMutation({ mutationFn: ({ id, mode }: Parameters<typeof ticketRoutingApi.updateTopicMode> extends [string, infer M] ? { id: string; mode: M } : never) => ticketRoutingApi.updateTopicMode(id, mode), onSuccess: refresh }),
    categoryMode: useMutation({ mutationFn: ({ id, enableFallback, mode }: { id: string; enableFallback: boolean; mode: import('@hrms/shared-types').TicketRoutingMode }) => ticketRoutingApi.updateCategoryMode(id, enableFallback, mode), onSuccess: refresh }),
  }
}
