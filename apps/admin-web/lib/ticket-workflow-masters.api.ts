import { api } from './api'
import type {
  TicketSubjectGuidanceConfigDto,
  TicketGuidanceSuggestion,
} from '@hrms/shared-types'

export type TicketSubjectGuidanceConfigBody = {
  categoryId?: string
  topicId?: string
  subjectId?: string
  workflowDefinitionId?: string
  name: string
  suggestionTargetLabel?: string
  suggestions: TicketGuidanceSuggestion[]
  template: string
  priority: number
}

export const ticketWorkflowMastersApi = {
  getGuidanceConfigs: (companyId: string, departmentId: string) =>
    api.get<TicketSubjectGuidanceConfigDto[]>('/ticket-subject-guidance-configs/manage', {
      params: { companyId, departmentId },
    }).then(r => r.data),

  createGuidanceConfig: (body: TicketSubjectGuidanceConfigBody & { companyId: string; departmentId: string }) =>
    api.post<TicketSubjectGuidanceConfigDto>('/ticket-subject-guidance-configs', body).then(r => r.data),

  updateGuidanceConfig: (id: string, body: TicketSubjectGuidanceConfigBody & { isActive: boolean }) =>
    api.put<TicketSubjectGuidanceConfigDto>(`/ticket-subject-guidance-configs/${id}`, body).then(r => r.data),
}
