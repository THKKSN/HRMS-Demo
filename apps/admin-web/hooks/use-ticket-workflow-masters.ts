import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ticketWorkflowMastersApi } from '@/lib/ticket-workflow-masters.api'

export const ticketWorkflowMasterKeys = {
  all: ['ticket-workflow-masters'] as const,
  guidances: (companyId: string, departmentId: string) =>
    [...ticketWorkflowMasterKeys.all, 'guidances', companyId, departmentId] as const,
}

export function useTicketGuidanceConfigs(companyId: string, departmentId: string) {
  return useQuery({
    queryKey: ticketWorkflowMasterKeys.guidances(companyId, departmentId),
    queryFn: () => ticketWorkflowMastersApi.getGuidanceConfigs(companyId, departmentId),
    enabled: !!companyId && !!departmentId,
  })
}

export function useCreateTicketGuidanceConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ticketWorkflowMastersApi.createGuidanceConfig,
    onSuccess: item => queryClient.invalidateQueries({
      queryKey: ticketWorkflowMasterKeys.guidances(item.companyId, item.departmentId),
    }),
  })
}

export function useUpdateTicketGuidanceConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: Parameters<typeof ticketWorkflowMastersApi.updateGuidanceConfig>[1] & { id: string }) =>
      ticketWorkflowMastersApi.updateGuidanceConfig(id, body),
    onSuccess: item => queryClient.invalidateQueries({
      queryKey: ticketWorkflowMasterKeys.guidances(item.companyId, item.departmentId),
    }),
  })
}
