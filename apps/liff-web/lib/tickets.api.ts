import type {
  TicketCategoryDto,
  TicketDto,
  TicketLookupCompanyDto,
  TicketLookupDepartmentDto,
  TicketPriority,
  TicketProblemType,
  TicketRequestType,
  TicketResolvedSubjectGuidanceDto,
  TicketStatus,
  TicketSubjectDto,
  TicketTopicDto,
  TicketDetailDto,
  TicketActionResultDto,
  TicketPendingCountsDto,
  TicketCommentDto,
  TicketCommentType,
  TicketAttachmentDto,
  AssignedTicketItemDto,
  TicketAssignmentCandidateDto,
  TicketInboxItemDto,
  MyTicketItemDto,
  PagedResult,
  TicketCancellationRequestDto,
} from '@hrms/shared-types'
import { api } from './api'

export type CreateTicketBody = {
  requestType: TicketRequestType
  targetCompanyId: string
  targetDepartmentId: string
  categoryId: string
  topicId: string
  subjectId: string
  otherTopicText?: string
  detail: string
  priority: TicketPriority
  vehicleText?: string
  locationText?: string
  contactPhone?: string
  contactNote?: string
  attachmentUrls?: string[]
}

export type TicketInboxParams = {
  status?: TicketStatus
  priority?: TicketPriority
  search?: string
  requestType?: TicketRequestType
  page?: number
  pageSize?: number
}

export type TriageTicketBody = {
  categoryId: string
  topicId: string
  subjectId?: string
  otherTopicText?: string
  priority: TicketPriority
  locationText?: string
  vehicleText?: string
  expectedUpdatedAt?: string
}

export const ticketsApi = {
  getCompanies: () =>
    api.get<TicketLookupCompanyDto[]>('/ticket-lookups/companies').then(r => r.data),

  getDepartments: (companyId?: string) =>
    api.get<TicketLookupDepartmentDto[]>('/ticket-lookups/departments', { params: { companyId } }).then(r => r.data),

  getCategories: (params?: { companyId?: string; departmentId?: string }) =>
    api.get<TicketCategoryDto[]>('/ticket-categories', { params }).then(r => r.data),

  getTopics: (params?: { companyId?: string; departmentId?: string; categoryId?: string }) =>
    api.get<TicketTopicDto[]>('/ticket-topics', { params }).then(r => r.data),

  getSubjects: (params?: { companyId?: string; departmentId?: string; categoryId?: string; topicId?: string }) =>
    api.get<TicketSubjectDto[]>('/ticket-subjects', { params }).then(r => r.data),

  resolveSubjectGuidance: (params: {
    companyId?: string
    departmentId?: string
    categoryId?: string
    topicId?: string
    subjectId?: string
  }) =>
    api.get<TicketResolvedSubjectGuidanceDto | null>('/ticket-subject-guidance-configs/resolve', { params }).then(r => r.data),

  createTicket: (body: CreateTicketBody) =>
    api.post<TicketDto>('/tickets', body).then(r => r.data),

  getAssigned: (params: { status?: TicketStatus; search?: string; history?: boolean; page?: number; pageSize?: number }) =>
    api.get<PagedResult<AssignedTicketItemDto>>('/tickets/assigned', { params }).then(r => r.data),

  getClaimable: (params: { search?: string; page?: number; pageSize?: number }) =>
    api.get<PagedResult<AssignedTicketItemDto>>('/tickets/claimable', { params }).then(r => r.data),

  getPendingCounts: () =>
    api.get<TicketPendingCountsDto>('/tickets/pending-counts').then(r => r.data),

  getInbox: (params: TicketInboxParams) =>
    api.get<PagedResult<TicketInboxItemDto>>('/tickets/inbox', { params }).then(r => r.data),

  getMy: (params: {
    status?: TicketStatus
    search?: string
    dateFrom?: string
    dateTo?: string
    page?: number
    pageSize?: number
  }) => api.get<PagedResult<MyTicketItemDto>>('/tickets/my', { params }).then(r => r.data),

  getById: (id: string) =>
    api.get<TicketDetailDto>(`/tickets/${id}`).then(r => r.data),

  claim: (id: string, expectedUpdatedAt?: string) =>
    api.post<TicketActionResultDto>(`/tickets/${id}/claim`, { expectedUpdatedAt }).then(r => r.data),

  requestCancellation: (id: string, reason: string, expectedUpdatedAt?: string) =>
    api.post<TicketCancellationRequestDto>(`/tickets/${id}/cancellation-request`, {
      reason,
      expectedUpdatedAt,
    }).then(r => r.data),

  getComments: (id: string) =>
    api.get<TicketCommentDto[]>(`/tickets/${id}/comments`).then(r => r.data),

  getAssignmentCandidates: (id: string) =>
    api.get<TicketAssignmentCandidateDto[]>(`/tickets/${id}/assignment-candidates`).then(r => r.data),

  accept: (id: string, expectedUpdatedAt?: string) =>
    api.post<TicketActionResultDto>(`/tickets/${id}/accept`, { expectedUpdatedAt }).then(r => r.data),

  triage: (id: string, body: TriageTicketBody) =>
    api.put<TicketActionResultDto>(`/tickets/${id}/triage`, body).then(r => r.data),

  assign: (id: string, body: { assignedToEmployeeId: string; note?: string; expectedUpdatedAt?: string }) =>
    api.post<TicketActionResultDto>(`/tickets/${id}/assign`, body).then(r => r.data),

  reject: (id: string, body: { reason: string; expectedUpdatedAt?: string }) =>
    api.post<TicketActionResultDto>(`/tickets/${id}/reject`, body).then(r => r.data),

  start: (id: string, expectedUpdatedAt?: string) =>
    api.post<TicketActionResultDto>(`/tickets/${id}/start`, { expectedUpdatedAt }).then(r => r.data),

  updateWorkDetail: (id: string, body: {
    problemType?: TicketProblemType
    initialInspectionNote?: string
    resolutionNote?: string
    expectedUpdatedAt?: string
  }) => api.put<TicketActionResultDto>(`/tickets/${id}/work-detail`, body).then(r => r.data),

  updateProgress: (id: string, body: {
    workState?: string
    blockerReason?: string
    nextAction?: string
    note?: string
    expectedUpdatedAt?: string
  }) => api.post<TicketActionResultDto>(`/tickets/${id}/progress`, body).then(r => r.data),

  requestInfo: (id: string, message: string, expectedUpdatedAt?: string) =>
    api.post<TicketActionResultDto>(`/tickets/${id}/request-info`, { message, expectedUpdatedAt }).then(r => r.data),

  resume: (id: string, expectedUpdatedAt?: string) =>
    api.post<TicketActionResultDto>(`/tickets/${id}/resume`, { expectedUpdatedAt }).then(r => r.data),

  resolve: (id: string, expectedUpdatedAt?: string) =>
    api.post<TicketActionResultDto>(`/tickets/${id}/resolve`, { expectedUpdatedAt }).then(r => r.data),

  addComment: (id: string, body: { message: string; commentType?: TicketCommentType; isInternal?: boolean }) =>
    api.post<TicketCommentDto>(`/tickets/${id}/comments`, body).then(r => r.data),

  addAttachment: (id: string, body: {
    url: string
    fileName?: string
    contentType?: string
    sizeBytes: number
    stage: 'Progress' | 'Resolved' | 'Comment'
    visibility?: 'Public' | 'Internal'
    ticketProgressEntryId?: string
  }) => api.post<TicketAttachmentDto>(`/tickets/${id}/attachments`, body).then(r => r.data),

  deleteAttachment: (id: string, attachmentId: string) =>
    api.delete(`/tickets/${id}/attachments/${attachmentId}`),

  returnForRevision: (id: string, body: { reviewNote: string; expectedUpdatedAt?: string }) =>
    api.post<TicketActionResultDto>(`/tickets/${id}/return`, body).then(r => r.data),

  close: (id: string, body: { reviewNote?: string; expectedUpdatedAt?: string }) =>
    api.post<TicketActionResultDto>(`/tickets/${id}/close`, body).then(r => r.data),

  confirmCompletion: (id: string, expectedUpdatedAt?: string) =>
    api.post<TicketActionResultDto>(`/tickets/${id}/confirm-completion`, { expectedUpdatedAt }).then(r => r.data),

  approveCancellation: (id: string, body: { reviewNote?: string; expectedUpdatedAt?: string }) =>
    api.post<TicketActionResultDto>(`/tickets/${id}/cancellation/approve`, body).then(r => r.data),

  rejectCancellation: (id: string, body: { reviewNote: string; expectedUpdatedAt?: string }) =>
    api.post<TicketActionResultDto>(`/tickets/${id}/cancellation/reject`, body).then(r => r.data),
}
