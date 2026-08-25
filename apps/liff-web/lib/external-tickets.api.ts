import type {
  ExternalReporterProfileDto,
  ExternalTicketCreatedDto,
  ExternalTicketFormDto,
  ExternalTicketListDto,
  ExternalTicketPortalDetailDto,
} from '@hrms/shared-types'
import { externalApi } from './external-api'

export const externalTicketsApi = {
  getForm: () =>
    externalApi.get<ExternalTicketFormDto>('/external/ticket-form').then(r => r.data),

  createTicket: (body: {
    externalTicketSubjectId: string
    detail: string
    locationText?: string
    contactPhone?: string
    contactNote?: string
  }) =>
    externalApi.post<ExternalTicketCreatedDto>('/external/tickets', body).then(r => r.data),

  getMyTickets: (page = 1, pageSize = 10) =>
    externalApi.get<ExternalTicketListDto>('/external/tickets', {
      params: { page, pageSize },
    }).then(r => r.data),

  getTicketDetail: (id: string) =>
    externalApi.get<ExternalTicketPortalDetailDto>(`/external/tickets/${id}`).then(r => r.data),

  getProfile: () =>
    externalApi.get<ExternalReporterProfileDto>('/external/profile').then(r => r.data),

  updateProfile: (body: {
    fullName: string
    phone: string
    email: string
    organization: string
  }) =>
    externalApi.put<ExternalReporterProfileDto>('/external/profile', body).then(r => r.data),
}
