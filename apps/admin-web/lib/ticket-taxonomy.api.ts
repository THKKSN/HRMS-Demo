import { api } from './api'
import type {
  TicketCategoryDto,
  TicketManagementScopeDto,
  TicketSubjectDto,
  TicketTopicDto,
} from '@hrms/shared-types'

export type TicketTaxonomyItemBody = {
  name: string
  description?: string
  sortOrder: number
}

export const ticketTaxonomyApi = {
  getScope: () =>
    api.get<TicketManagementScopeDto>('/ticket-management/scope').then(r => r.data),

  getCategories: (companyId: string, departmentId: string) =>
    api.get<TicketCategoryDto[]>('/ticket-categories/manage', {
      params: { companyId, departmentId },
    }).then(r => r.data),

  createCategory: (body: TicketTaxonomyItemBody & { companyId: string; departmentId: string }) =>
    api.post<TicketCategoryDto>('/ticket-categories', body).then(r => r.data),

  updateCategory: (id: string, body: TicketTaxonomyItemBody & { isActive: boolean }) =>
    api.put<TicketCategoryDto>(`/ticket-categories/${id}`, body).then(r => r.data),

  getTopics: (companyId: string, departmentId: string, categoryId: string) =>
    api.get<TicketTopicDto[]>('/ticket-topics/manage', {
      params: { companyId, departmentId, categoryId },
    }).then(r => r.data),

  createTopic: (body: TicketTaxonomyItemBody & {
    companyId: string
    departmentId: string
    categoryId: string
    syncToExternalRepairSystem?: boolean
  }) => api.post<TicketTopicDto>('/ticket-topics', body).then(r => r.data),

  updateTopic: (id: string, body: TicketTaxonomyItemBody & {
    isActive: boolean
    syncToExternalRepairSystem?: boolean
  }) => api.put<TicketTopicDto>(`/ticket-topics/${id}`, body).then(r => r.data),

  getSubjects: (companyId: string, departmentId: string, categoryId: string, topicId: string) =>
    api.get<TicketSubjectDto[]>('/ticket-subjects/manage', {
      params: { companyId, departmentId, categoryId, topicId },
    }).then(r => r.data),

  createSubject: (body: TicketTaxonomyItemBody & {
    companyId: string
    departmentId: string
    categoryId: string
    topicId: string
  }) => api.post<TicketSubjectDto>('/ticket-subjects', body).then(r => r.data),

  updateSubject: (id: string, body: TicketTaxonomyItemBody & { isActive: boolean }) =>
    api.put<TicketSubjectDto>(`/ticket-subjects/${id}`, body).then(r => r.data),
}
