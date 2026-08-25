import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { externalTicketTaxonomyApi } from '@/lib/external-ticket-taxonomy.api'

export const externalTicketTaxonomyKeys = {
  all: ['external-ticket-taxonomy'] as const,
  configuration: () => [...externalTicketTaxonomyKeys.all, 'configuration'] as const,
  categories: () => [...externalTicketTaxonomyKeys.all, 'categories'] as const,
  topics: (categoryId: string) => [...externalTicketTaxonomyKeys.all, 'topics', categoryId] as const,
  subjects: (topicId: string) => [...externalTicketTaxonomyKeys.all, 'subjects', topicId] as const,
}

export function useExternalTicketConfiguration() {
  return useQuery({
    queryKey: externalTicketTaxonomyKeys.configuration(),
    queryFn: externalTicketTaxonomyApi.getConfiguration,
    staleTime: 60_000,
  })
}

export function useUpdateExternalTicketConfiguration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: externalTicketTaxonomyApi.updateConfiguration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: externalTicketTaxonomyKeys.configuration() })
    },
  })
}

export function useExternalTicketCategories() {
  return useQuery({
    queryKey: externalTicketTaxonomyKeys.categories(),
    queryFn: externalTicketTaxonomyApi.getCategories,
    staleTime: 60_000,
  })
}

export function useCreateExternalTicketCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: externalTicketTaxonomyApi.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: externalTicketTaxonomyKeys.categories() })
    },
  })
}

export function useUpdateExternalTicketCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: Parameters<typeof externalTicketTaxonomyApi.updateCategory>[1] & { id: string }) =>
      externalTicketTaxonomyApi.updateCategory(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: externalTicketTaxonomyKeys.categories() })
    },
  })
}

export function useExternalTicketTopics(categoryId: string) {
  return useQuery({
    queryKey: externalTicketTaxonomyKeys.topics(categoryId),
    queryFn: () => externalTicketTaxonomyApi.getTopics(categoryId),
    enabled: !!categoryId,
    staleTime: 60_000,
  })
}

export function useCreateExternalTicketTopic() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: externalTicketTaxonomyApi.createTopic,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: externalTicketTaxonomyKeys.topics(data.externalTicketCategoryId) })
    },
  })
}

export function useUpdateExternalTicketTopic() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: Parameters<typeof externalTicketTaxonomyApi.updateTopic>[1] & { id: string }) =>
      externalTicketTaxonomyApi.updateTopic(id, body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: externalTicketTaxonomyKeys.topics(data.externalTicketCategoryId) })
    },
  })
}

export function useExternalTicketSubjects(topicId: string) {
  return useQuery({
    queryKey: externalTicketTaxonomyKeys.subjects(topicId),
    queryFn: () => externalTicketTaxonomyApi.getSubjects(topicId),
    enabled: !!topicId,
    staleTime: 60_000,
  })
}

export function useCreateExternalTicketSubject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: externalTicketTaxonomyApi.createSubject,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: externalTicketTaxonomyKeys.subjects(data.externalTicketTopicId) })
    },
  })
}

export function useUpdateExternalTicketSubject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: Parameters<typeof externalTicketTaxonomyApi.updateSubject>[1] & { id: string }) =>
      externalTicketTaxonomyApi.updateSubject(id, body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: externalTicketTaxonomyKeys.subjects(data.externalTicketTopicId) })
    },
  })
}
