import { api } from './api'
import type {
  PagedResult,
  TicketActionResultDto,
  TicketAssignmentCandidateDto,
  TicketAssignmentDto,
  TicketDetailDto,
  TicketInboxItemDto,
  TicketPriority,
  TicketRequestType,
  TicketResolvedSubjectGuidanceDto,
  TicketDto,
  TicketLookupCompanyDto,
  TicketLookupDepartmentDto,
  TicketCategoryDto,
  TicketTopicDto,
  TicketSubjectDto,
  TicketReviewDto,
  TicketStatus,
  TicketCancellationRequestDto,
  AssignedTicketItemDto,
  TicketAttachmentDto,
  TicketProblemType,
  TicketCommentDto,
  TicketCommentType,
  MyTicketItemDto,
} from '@hrms/shared-types'

export type TicketInboxParams = {
  companyId?: string
  departmentId?: string
  status?: TicketStatus
  priority?: TicketPriority
  categoryId?: string
  topicId?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  requestType?: TicketRequestType
  page?: number
  pageSize?: number
}

export type MyTicketParams = {
  status?: TicketStatus
  search?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

export type TriageTicketBody = {
  categoryId: string
  topicId: string
  subjectId?: string
  otherTopicText?: string
  detail?: string
  priority: TicketPriority
  locationText?: string
  vehicleText?: string
  expectedUpdatedAt?: string
}

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

export const ticketsApi = {
  create: (body: CreateTicketBody) => api.post<TicketDto>('/tickets', body).then(r => r.data),
  getLookupCompanies: () => api.get<TicketLookupCompanyDto[]>('/ticket-lookups/companies').then(r => r.data),
  getLookupDepartments: (companyId: string) => api.get<TicketLookupDepartmentDto[]>('/ticket-lookups/departments', { params: { companyId } }).then(r => r.data),
  getCategories: (companyId: string, departmentId: string) => api.get<TicketCategoryDto[]>('/ticket-categories', { params: { companyId, departmentId } }).then(r => r.data),
  getTopics: (companyId: string, departmentId: string, categoryId: string) => api.get<TicketTopicDto[]>('/ticket-topics', { params: { companyId, departmentId, categoryId } }).then(r => r.data),
  getSubjects: (companyId: string, departmentId: string, categoryId: string, topicId: string) =>
    api.get<TicketSubjectDto[]>('/ticket-subjects', { params: { companyId, departmentId, categoryId, topicId } }).then(r => r.data),
  resolveSubjectGuidance: (companyId: string, departmentId: string, categoryId: string, topicId: string, subjectId: string) =>
    api.get<TicketResolvedSubjectGuidanceDto | null>('/ticket-subject-guidance-configs/resolve', {
      params: { companyId, departmentId, categoryId, topicId, subjectId },
    }).then(r => r.data),
  getInbox: (params: TicketInboxParams) =>
    api.get<PagedResult<TicketInboxItemDto>>('/tickets/inbox', { params }).then(r => r.data),

  getAssigned: (params: {
    status?: TicketStatus
    search?: string
    history?: boolean
    requestType?: TicketRequestType
    page?: number
    pageSize?: number
  }) => api.get<PagedResult<AssignedTicketItemDto>>('/tickets/assigned', { params }).then(r => r.data),

  getMy: (params: MyTicketParams) =>
    api.get<PagedResult<MyTicketItemDto>>('/tickets/my', { params }).then(r => r.data),

  requestCancellation: (id: string, body: { reason: string; expectedUpdatedAt?: string }) =>
    api.post<TicketCancellationRequestDto>(`/tickets/${id}/cancellation-request`, body).then(r => r.data),

  getPendingCancellations: (params: { search?: string; page?: number; pageSize?: number }) =>
    api.get<PagedResult<TicketCancellationRequestDto>>('/tickets/cancellation-pending', { params }).then(r => r.data),

  getById: (id: string) =>
    api.get<TicketDetailDto>(`/tickets/${id}`).then(r => r.data),

  getComments: (id: string) =>
    api.get<TicketCommentDto[]>(`/tickets/${id}/comments`).then(r => r.data),

  getAssignmentHistory: (id: string) =>
    api.get<TicketAssignmentDto[]>(`/tickets/${id}/assignment-history`).then(r => r.data),

  getAssignmentCandidates: (id: string) =>
    api.get<TicketAssignmentCandidateDto[]>(`/tickets/${id}/assignment-candidates`).then(r => r.data),

  getReviews: (id: string) =>
    api.get<TicketReviewDto[]>(`/tickets/${id}/reviews`).then(r => r.data),

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

  resume: (id: string, expectedUpdatedAt?: string) =>
    api.post<TicketActionResultDto>(`/tickets/${id}/resume`, { expectedUpdatedAt }).then(r => r.data),

  requestInfo: (id: string, body: { message: string; expectedUpdatedAt?: string }) =>
    api.post<TicketActionResultDto>(`/tickets/${id}/request-info`, body).then(r => r.data),

  addComment: (id: string, body: {
    message: string
    commentType?: TicketCommentType
    isInternal?: boolean
  }) => api.post<TicketCommentDto>(`/tickets/${id}/comments`, body).then(r => r.data),

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

  resolve: (id: string, expectedUpdatedAt?: string) =>
    api.post<TicketActionResultDto>(`/tickets/${id}/resolve`, { expectedUpdatedAt }).then(r => r.data),

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
