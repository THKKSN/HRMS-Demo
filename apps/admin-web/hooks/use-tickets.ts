import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ticketsApi, type CreateTicketBody, type TicketInboxParams } from '@/lib/tickets.api'

export const ticketKeys = {
  all: ['tickets'] as const,
  inbox: (params: TicketInboxParams) => [...ticketKeys.all, 'inbox', params] as const,
  assigned: (params?: object) => [...ticketKeys.all, 'assigned', params] as const,
  detail: (id: string) => [...ticketKeys.all, 'detail', id] as const,
  comments: (id: string) => [...ticketKeys.all, 'comments', id] as const,
  history: (id: string) => [...ticketKeys.all, 'history', id] as const,
  candidates: (id: string) => [...ticketKeys.all, 'candidates', id] as const,
  reviews: (id: string) => [...ticketKeys.all, 'reviews', id] as const,
  pendingCancellations: (params?: object) => [...ticketKeys.all, 'pending-cancellations', params] as const,
  lookup: (name: string, ...ids: string[]) => [...ticketKeys.all, 'lookup', name, ...ids] as const,
}

export function useCreateTicket() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (body: CreateTicketBody) => ticketsApi.create(body), onSuccess: () => queryClient.invalidateQueries({ queryKey: ticketKeys.all }) })
}

export function useTicketLookupCompanies() {
  return useQuery({ queryKey: ticketKeys.lookup('companies'), queryFn: ticketsApi.getLookupCompanies })
}
export function useTicketLookupDepartments(companyId: string) {
  return useQuery({ queryKey: ticketKeys.lookup('departments', companyId), queryFn: () => ticketsApi.getLookupDepartments(companyId), enabled: !!companyId })
}
export function useTicketCategories(companyId: string, departmentId: string) {
  return useQuery({ queryKey: ticketKeys.lookup('categories', companyId, departmentId), queryFn: () => ticketsApi.getCategories(companyId, departmentId), enabled: !!companyId && !!departmentId })
}
export function useTicketTopics(companyId: string, departmentId: string, categoryId: string) {
  return useQuery({ queryKey: ticketKeys.lookup('topics', companyId, departmentId, categoryId), queryFn: () => ticketsApi.getTopics(companyId, departmentId, categoryId), enabled: !!companyId && !!departmentId && !!categoryId })
}

export function useTicketInbox(params: TicketInboxParams) {
  return useQuery({
    queryKey: ticketKeys.inbox(params),
    queryFn: () => ticketsApi.getInbox(params),
  })
}

export function useAssignedTickets(params: {
  status?: import('@hrms/shared-types').TicketStatus
  search?: string
  history?: boolean
  page?: number
  pageSize?: number
}) {
  return useQuery({
    queryKey: ticketKeys.assigned(params),
    queryFn: () => ticketsApi.getAssigned(params),
  })
}

export function usePendingTicketCancellations(params: { search?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ticketKeys.pendingCancellations(params),
    queryFn: () => ticketsApi.getPendingCancellations(params),
  })
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ticketKeys.detail(id),
    queryFn: () => ticketsApi.getById(id),
    enabled: !!id,
  })
}

export function useTicketComments(id: string) {
  return useQuery({
    queryKey: ticketKeys.comments(id),
    queryFn: () => ticketsApi.getComments(id),
    enabled: !!id,
  })
}

export function useTicketAssignmentHistory(id: string, enabled = true) {
  return useQuery({
    queryKey: ticketKeys.history(id),
    queryFn: () => ticketsApi.getAssignmentHistory(id),
    enabled: !!id && enabled,
  })
}

export function useTicketAssignmentCandidates(id: string, enabled = true) {
  return useQuery({
    queryKey: ticketKeys.candidates(id),
    queryFn: () => ticketsApi.getAssignmentCandidates(id),
    enabled: !!id && enabled,
  })
}

export function useTicketReviews(id: string) {
  return useQuery({
    queryKey: ticketKeys.reviews(id),
    queryFn: () => ticketsApi.getReviews(id),
    enabled: !!id,
  })
}

function useTicketAction<TVariables, TResult = unknown>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ticketKeys.all }),
  })
}

export function useAcceptTicket(id: string) {
  return useTicketAction((expectedUpdatedAt?: string) => ticketsApi.accept(id, expectedUpdatedAt))
}

export function useTriageTicket(id: string) {
  return useTicketAction((body: Parameters<typeof ticketsApi.triage>[1]) => ticketsApi.triage(id, body))
}

export function useAssignTicket(id: string) {
  return useTicketAction((body: Parameters<typeof ticketsApi.assign>[1]) => ticketsApi.assign(id, body))
}

export function useRejectTicket(id: string) {
  return useTicketAction((body: Parameters<typeof ticketsApi.reject>[1]) => ticketsApi.reject(id, body))
}

export function useStartTicket(id: string) {
  return useTicketAction((expectedUpdatedAt?: string) => ticketsApi.start(id, expectedUpdatedAt))
}

export function useResumeTicket(id: string) {
  return useTicketAction((expectedUpdatedAt?: string) => ticketsApi.resume(id, expectedUpdatedAt))
}

export function useRequestTicketInfo(id: string) {
  return useTicketAction((body: Parameters<typeof ticketsApi.requestInfo>[1]) =>
    ticketsApi.requestInfo(id, body))
}

export function useAddTicketComment(id: string) {
  return useTicketAction((body: Parameters<typeof ticketsApi.addComment>[1]) =>
    ticketsApi.addComment(id, body))
}

export function useUpdateTicketWorkDetail(id: string) {
  return useTicketAction((body: Parameters<typeof ticketsApi.updateWorkDetail>[1]) =>
    ticketsApi.updateWorkDetail(id, body))
}

export function useResolveTicket(id: string) {
  return useTicketAction((expectedUpdatedAt?: string) => ticketsApi.resolve(id, expectedUpdatedAt))
}

export function useAddTicketAttachment(id: string) {
  return useTicketAction((body: Parameters<typeof ticketsApi.addAttachment>[1]) =>
    ticketsApi.addAttachment(id, body))
}

export function useDeleteTicketAttachment(id: string) {
  return useTicketAction((attachmentId: string) => ticketsApi.deleteAttachment(id, attachmentId))
}

export function useReturnTicketForRevision(id: string) {
  return useTicketAction((body: Parameters<typeof ticketsApi.returnForRevision>[1]) => ticketsApi.returnForRevision(id, body))
}

export function useCloseTicket(id: string) {
  return useTicketAction((body: Parameters<typeof ticketsApi.close>[1]) => ticketsApi.close(id, body))
}

export function useApproveTicketCancellation(id: string) {
  return useTicketAction((body: Parameters<typeof ticketsApi.approveCancellation>[1]) =>
    ticketsApi.approveCancellation(id, body))
}

export function useRejectTicketCancellation(id: string) {
  return useTicketAction((body: Parameters<typeof ticketsApi.rejectCancellation>[1]) =>
    ticketsApi.rejectCancellation(id, body))
}
