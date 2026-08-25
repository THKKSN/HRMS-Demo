import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type CreateTicketBody, type TicketInboxParams, ticketsApi } from '@/lib/tickets.api'
import type { TicketStatus } from '@hrms/shared-types'

export const ticketKeys = {
  all: ['tickets'] as const,
  companies: () => [...ticketKeys.all, 'companies'] as const,
  departments: (companyId?: string) => [...ticketKeys.all, 'departments', companyId] as const,
  categories: (params?: object) => [...ticketKeys.all, 'categories', params] as const,
  topics: (params?: object) => [...ticketKeys.all, 'topics', params] as const,
  subjects: (params?: object) => [...ticketKeys.all, 'subjects', params] as const,
  subjectGuidance: (params?: object) => [...ticketKeys.all, 'subject-guidance', params] as const,
  inbox: (params?: object) => [...ticketKeys.all, 'inbox', params] as const,
  assigned: (params?: object) => [...ticketKeys.all, 'assigned', params] as const,
  my: (params?: object) => [...ticketKeys.all, 'my', params] as const,
  detail: (id: string) => [...ticketKeys.all, 'detail', id] as const,
  comments: (id: string) => [...ticketKeys.all, 'comments', id] as const,
  candidates: (id: string) => [...ticketKeys.all, 'candidates', id] as const,
}

export function useTicketInbox(params: TicketInboxParams, enabled = true) {
  return useQuery({
    queryKey: ticketKeys.inbox(params),
    queryFn: () => ticketsApi.getInbox(params),
    enabled,
  })
}

export function useAssignedTickets(params: { status?: TicketStatus; search?: string; history?: boolean; page?: number; pageSize?: number }, enabled = true) {
  return useQuery({
    queryKey: ticketKeys.assigned(params),
    queryFn: () => ticketsApi.getAssigned(params),
    enabled,
  })
}

export function useClaimableTickets(params: { search?: string; page?: number; pageSize?: number }, enabled = true) {
  return useQuery({
    queryKey: [...ticketKeys.all, 'claimable', params],
    queryFn: () => ticketsApi.getClaimable(params),
    enabled,
  })
}

export function useMyTickets(params: {
  status?: TicketStatus
  search?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}) {
  return useQuery({
    queryKey: ticketKeys.my(params),
    queryFn: () => ticketsApi.getMy(params),
  })
}

export function useTicket(id: string) {
  return useQuery({ queryKey: ticketKeys.detail(id), queryFn: () => ticketsApi.getById(id), enabled: !!id })
}

export function useTicketComments(id: string) {
  return useQuery({ queryKey: ticketKeys.comments(id), queryFn: () => ticketsApi.getComments(id), enabled: !!id })
}

export function useTicketAssignmentCandidates(id: string, enabled = true) {
  return useQuery({
    queryKey: ticketKeys.candidates(id),
    queryFn: () => ticketsApi.getAssignmentCandidates(id),
    enabled: !!id && enabled,
  })
}

function useTicketMutation<TVariables, TResult = unknown>(
  id: string,
  mutationFn: (variables: TVariables) => Promise<TResult>,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ticketKeys.all }),
  })
}

export function useStartTicket(id: string) {
  return useTicketMutation<string | undefined>(id, expected => ticketsApi.start(id, expected))
}

export function useClaimTicket(id: string) {
  return useTicketMutation<string | undefined>(id, expected => ticketsApi.claim(id, expected))
}

export function useAcceptTicket(id: string) {
  return useTicketMutation<string | undefined>(id, expected => ticketsApi.accept(id, expected))
}

export function useTriageTicket(id: string) {
  return useTicketMutation<Parameters<typeof ticketsApi.triage>[1]>(id, body => ticketsApi.triage(id, body))
}

export function useAssignTicket(id: string) {
  return useTicketMutation<Parameters<typeof ticketsApi.assign>[1]>(id, body => ticketsApi.assign(id, body))
}

export function useRejectTicket(id: string) {
  return useTicketMutation<Parameters<typeof ticketsApi.reject>[1]>(id, body => ticketsApi.reject(id, body))
}

export function useRequestTicketCancellation(id: string) {
  return useTicketMutation<{ reason: string; expectedUpdatedAt?: string }>(
    id,
    body => ticketsApi.requestCancellation(id, body.reason, body.expectedUpdatedAt),
  )
}

export function useUpdateTicketWorkDetail(id: string) {
  return useTicketMutation<
    Parameters<typeof ticketsApi.updateWorkDetail>[1],
    Awaited<ReturnType<typeof ticketsApi.updateWorkDetail>>
  >(id, body => ticketsApi.updateWorkDetail(id, body))
}

export function useUpdateTicketProgress(id: string) {
  return useTicketMutation<
    Parameters<typeof ticketsApi.updateProgress>[1],
    Awaited<ReturnType<typeof ticketsApi.updateProgress>>
  >(id, body => ticketsApi.updateProgress(id, body))
}

export function useRequestTicketInfo(id: string) {
  return useTicketMutation<{ message: string; expectedUpdatedAt?: string }>(id, body => ticketsApi.requestInfo(id, body.message, body.expectedUpdatedAt))
}

export function useResumeTicket(id: string) {
  return useTicketMutation<string | undefined>(id, expected => ticketsApi.resume(id, expected))
}

export function useResolveTicket(id: string) {
  return useTicketMutation<string | undefined>(id, expected => ticketsApi.resolve(id, expected))
}

export function useAddTicketComment(id: string) {
  return useTicketMutation<Parameters<typeof ticketsApi.addComment>[1]>(id, body => ticketsApi.addComment(id, body))
}

export function useAddTicketAttachment(id: string) {
  return useTicketMutation<Parameters<typeof ticketsApi.addAttachment>[1]>(id, body => ticketsApi.addAttachment(id, body))
}

export function useDeleteTicketAttachment(id: string) {
  return useTicketMutation<string>(id, attachmentId => ticketsApi.deleteAttachment(id, attachmentId))
}

export function useReturnTicketForRevision(id: string) {
  return useTicketMutation<Parameters<typeof ticketsApi.returnForRevision>[1]>(
    id,
    body => ticketsApi.returnForRevision(id, body),
  )
}

export function useCloseTicket(id: string) {
  return useTicketMutation<Parameters<typeof ticketsApi.close>[1]>(id, body => ticketsApi.close(id, body))
}

export function useConfirmTicketCompletion(id: string) {
  return useTicketMutation<string | undefined>(id, expected => ticketsApi.confirmCompletion(id, expected))
}

export function useApproveTicketCancellation(id: string) {
  return useTicketMutation<Parameters<typeof ticketsApi.approveCancellation>[1]>(
    id,
    body => ticketsApi.approveCancellation(id, body),
  )
}

export function useRejectTicketCancellation(id: string) {
  return useTicketMutation<Parameters<typeof ticketsApi.rejectCancellation>[1]>(
    id,
    body => ticketsApi.rejectCancellation(id, body),
  )
}

export function useTicketCompanies() {
  return useQuery({
    queryKey: ticketKeys.companies(),
    queryFn: ticketsApi.getCompanies,
  })
}

export function useTicketDepartments(companyId?: string) {
  return useQuery({
    queryKey: ticketKeys.departments(companyId),
    queryFn: () => ticketsApi.getDepartments(companyId),
    enabled: !!companyId,
  })
}

export function useTicketCategories(params?: { companyId?: string; departmentId?: string }) {
  return useQuery({
    queryKey: ticketKeys.categories(params),
    queryFn: () => ticketsApi.getCategories(params),
    enabled: !!params?.companyId && !!params?.departmentId,
  })
}

export function useTicketTopics(params?: { companyId?: string; departmentId?: string; categoryId?: string }) {
  return useQuery({
    queryKey: ticketKeys.topics(params),
    queryFn: () => ticketsApi.getTopics(params),
    enabled: !!params?.companyId && !!params?.departmentId && !!params?.categoryId,
  })
}

export function useTicketSubjects(params?: { companyId?: string; departmentId?: string; categoryId?: string; topicId?: string }) {
  return useQuery({
    queryKey: ticketKeys.subjects(params),
    queryFn: () => ticketsApi.getSubjects(params),
    enabled: !!params?.companyId && !!params?.departmentId && !!params?.categoryId && !!params?.topicId,
  })
}

export function useResolvedTicketSubjectGuidance(params?: {
  companyId?: string
  departmentId?: string
  categoryId?: string
  topicId?: string
  subjectId?: string
}) {
  return useQuery({
    queryKey: ticketKeys.subjectGuidance(params),
    queryFn: () => ticketsApi.resolveSubjectGuidance(params ?? {}),
    enabled: !!params?.companyId && !!params?.departmentId && !!params?.categoryId && !!params?.topicId && !!params?.subjectId,
  })
}

export function useCreateTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateTicketBody) => ticketsApi.createTicket(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ticketKeys.all }),
  })
}
