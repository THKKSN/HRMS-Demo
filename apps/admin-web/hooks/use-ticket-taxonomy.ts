import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ticketTaxonomyApi } from '@/lib/ticket-taxonomy.api'

export const ticketTaxonomyKeys = {
  all: ['ticket-taxonomy'] as const,
  scope: () => [...ticketTaxonomyKeys.all, 'scope'] as const,
  categories: (companyId: string, departmentId: string) =>
    [...ticketTaxonomyKeys.all, 'categories', companyId, departmentId] as const,
  topics: (companyId: string, departmentId: string, categoryId: string) =>
    [...ticketTaxonomyKeys.all, 'topics', companyId, departmentId, categoryId] as const,
}

export function useTicketManagementScope() {
  return useQuery({
    queryKey: ticketTaxonomyKeys.scope(),
    queryFn: ticketTaxonomyApi.getScope,
    staleTime: 60_000,
  })
}

export function useManagedTicketCategories(companyId: string, departmentId: string) {
  return useQuery({
    queryKey: ticketTaxonomyKeys.categories(companyId, departmentId),
    queryFn: () => ticketTaxonomyApi.getCategories(companyId, departmentId),
    enabled: !!companyId && !!departmentId,
  })
}

export function useManagedTicketTopics(companyId: string, departmentId: string, categoryId: string) {
  return useQuery({
    queryKey: ticketTaxonomyKeys.topics(companyId, departmentId, categoryId),
    queryFn: () => ticketTaxonomyApi.getTopics(companyId, departmentId, categoryId),
    enabled: !!companyId && !!departmentId && !!categoryId,
  })
}

export function useCreateTicketCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ticketTaxonomyApi.createCategory,
    onSuccess: item => queryClient.invalidateQueries({
      queryKey: ticketTaxonomyKeys.categories(item.companyId, item.departmentId),
    }),
  })
}

export function useUpdateTicketCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: Parameters<typeof ticketTaxonomyApi.updateCategory>[1] & { id: string }) =>
      ticketTaxonomyApi.updateCategory(id, body),
    onSuccess: item => queryClient.invalidateQueries({
      queryKey: ticketTaxonomyKeys.categories(item.companyId, item.departmentId),
    }),
  })
}

export function useCreateTicketTopic() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ticketTaxonomyApi.createTopic,
    onSuccess: item => queryClient.invalidateQueries({
      queryKey: ticketTaxonomyKeys.topics(item.companyId, item.departmentId, item.categoryId),
    }),
  })
}

export function useUpdateTicketTopic() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: Parameters<typeof ticketTaxonomyApi.updateTopic>[1] & { id: string }) =>
      ticketTaxonomyApi.updateTopic(id, body),
    onSuccess: item => queryClient.invalidateQueries({
      queryKey: ticketTaxonomyKeys.topics(item.companyId, item.departmentId, item.categoryId),
    }),
  })
}
