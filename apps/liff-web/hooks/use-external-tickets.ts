'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { externalTicketsApi } from '@/lib/external-tickets.api'
import { useExternalAuthStore } from '@/stores/external-auth.store'

export const externalTicketKeys = {
  all: ['external-tickets'] as const,
  form: () => [...externalTicketKeys.all, 'form'] as const,
  list: (page: number) => [...externalTicketKeys.all, 'list', page] as const,
  detail: (id: string) => [...externalTicketKeys.all, 'detail', id] as const,
  profile: () => [...externalTicketKeys.all, 'profile'] as const,
}

export function useExternalTicketForm() {
  const authed = useExternalAuthStore(s => !!s.accessToken)
  return useQuery({
    queryKey: externalTicketKeys.form(),
    queryFn: externalTicketsApi.getForm,
    enabled: authed,
    staleTime: 60_000,
  })
}

export function useExternalMyTickets(page = 1) {
  const authed = useExternalAuthStore(s => !!s.accessToken)
  return useQuery({
    queryKey: externalTicketKeys.list(page),
    queryFn: () => externalTicketsApi.getMyTickets(page),
    enabled: authed,
  })
}

export function useExternalTicketDetail(id: string) {
  const authed = useExternalAuthStore(s => !!s.accessToken)
  return useQuery({
    queryKey: externalTicketKeys.detail(id),
    queryFn: () => externalTicketsApi.getTicketDetail(id),
    enabled: authed && !!id,
  })
}

export function useCreateExternalTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: externalTicketsApi.createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: externalTicketKeys.all })
    },
  })
}

export function useUpdateExternalProfile() {
  const queryClient = useQueryClient()
  const setReporter = useExternalAuthStore(s => s.setReporter)
  return useMutation({
    mutationFn: externalTicketsApi.updateProfile,
    onSuccess: (reporter) => {
      setReporter(reporter)
      queryClient.invalidateQueries({ queryKey: externalTicketKeys.profile() })
    },
  })
}
