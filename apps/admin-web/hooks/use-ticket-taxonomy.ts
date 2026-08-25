import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ticketTaxonomyApi } from '@/lib/ticket-taxonomy.api'

export const ticketTaxonomyKeys = {
  all: ['ticket-taxonomy'] as const,
  scope: () => [...ticketTaxonomyKeys.all, 'scope'] as const,
  categories: (companyId: string, departmentId: string) =>
    [...ticketTaxonomyKeys.all, 'categories', companyId, departmentId] as const,
  topics: (companyId: string, departmentId: string, categoryId: string) =>
    [...ticketTaxonomyKeys.all, 'topics', companyId, departmentId, categoryId] as const,
  subjects: (companyId: string, departmentId: string, categoryId: string, topicId: string) =>
    [...ticketTaxonomyKeys.all, 'subjects', companyId, departmentId, categoryId, topicId] as const,
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

export function useManagedTicketSubjects(companyId: string, departmentId: string, categoryId: string, topicId: string) {
  return useQuery({
    queryKey: ticketTaxonomyKeys.subjects(companyId, departmentId, categoryId, topicId),
    queryFn: () => ticketTaxonomyApi.getSubjects(companyId, departmentId, categoryId, topicId),
    enabled: !!companyId && !!departmentId && !!categoryId && !!topicId,
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

export function useCreateTicketSubject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ticketTaxonomyApi.createSubject,
    onSuccess: item => queryClient.invalidateQueries({
      queryKey: ticketTaxonomyKeys.subjects(item.companyId, item.departmentId, item.categoryId, item.topicId),
    }),
  })
}

export function useUpdateTicketSubject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: Parameters<typeof ticketTaxonomyApi.updateSubject>[1] & { id: string }) =>
      ticketTaxonomyApi.updateSubject(id, body),
    onSuccess: item => queryClient.invalidateQueries({
      queryKey: ticketTaxonomyKeys.subjects(item.companyId, item.departmentId, item.categoryId, item.topicId),
    }),
  })
}
