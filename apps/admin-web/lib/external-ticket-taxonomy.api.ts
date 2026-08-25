import { api } from './api'
import type {
  ExternalTicketCategoryDto,
  ExternalTicketConfigurationDto,
  ExternalTicketSubjectDto,
  ExternalTicketTopicDto,
} from '@hrms/shared-types'

export type ExternalTicketCategoryBody = {
  name: string
  description?: string
  sortOrder: number
}

export type ExternalTicketTopicBody = {
  externalTicketCategoryId: string
  name: string
  description?: string
  sortOrder: number
}

export type ExternalTicketSubjectBody = {
  externalTicketTopicId: string
  name: string
  description?: string
  template?: string
  suggestions?: string[]
  sortOrder: number
}

export const externalTicketTaxonomyApi = {
  getConfiguration: () =>
    api.get<ExternalTicketConfigurationDto>('/external-ticket-config').then(r => r.data),

  updateConfiguration: (body: {
    requireOaFriendship: boolean
    isEnabled: boolean
    expectedUpdatedAt: string
  }) =>
    api.put<ExternalTicketConfigurationDto>('/external-ticket-config', body).then(r => r.data),

  getCategories: () =>
    api.get<ExternalTicketCategoryDto[]>('/external-ticket-config/categories').then(r => r.data),

  createCategory: (body: ExternalTicketCategoryBody) =>
    api.post<ExternalTicketCategoryDto>('/external-ticket-config/categories', body).then(r => r.data),

  updateCategory: (id: string, body: ExternalTicketCategoryBody & { isActive: boolean }) =>
    api.put<ExternalTicketCategoryDto>(`/external-ticket-config/categories/${id}`, body).then(r => r.data),

  getTopics: (categoryId: string) =>
    api.get<ExternalTicketTopicDto[]>('/external-ticket-config/topics', {
      params: { categoryId },
    }).then(r => r.data),

  createTopic: (body: ExternalTicketTopicBody) =>
    api.post<ExternalTicketTopicDto>('/external-ticket-config/topics', body).then(r => r.data),

  updateTopic: (id: string, body: ExternalTicketTopicBody & { isActive: boolean }) =>
    api.put<ExternalTicketTopicDto>(`/external-ticket-config/topics/${id}`, body).then(r => r.data),

  getSubjects: (topicId: string) =>
    api.get<ExternalTicketSubjectDto[]>('/external-ticket-config/subjects', {
      params: { topicId },
    }).then(r => r.data),

  createSubject: (body: ExternalTicketSubjectBody) =>
    api.post<ExternalTicketSubjectDto>('/external-ticket-config/subjects', body).then(r => r.data),

  updateSubject: (id: string, body: ExternalTicketSubjectBody & { isActive: boolean }) =>
    api.put<ExternalTicketSubjectDto>(`/external-ticket-config/subjects/${id}`, body).then(r => r.data),
}
