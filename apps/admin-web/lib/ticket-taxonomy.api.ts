import { api } from './api'
import type {
  TicketCategoryDto,
  TicketCloseoutReasonDto,
  TicketTeamTemplateDto,
  TicketManagementScopeDto,
  TicketSubjectDto,
  TicketTopicDto,
} from '@hrms/shared-types'

export type TicketTaxonomyItemBody = {
  name: string
  // ชื่อภาษาอื่น (i18n Phase M) — ไม่ส่ง = คงค่าเดิม, ส่ง '' = ล้าง
  nameEn?: string
  nameId?: string
  description?: string
  sortOrder: number
}

export type TicketCloseoutReasonBody = TicketTaxonomyItemBody & {
  /** id หมวดที่จำกัดการใช้ — ว่าง = ใช้ได้ทุกหมวดใน scope */
  categoryIds: string[]
  requiresResolutionNote: boolean
  requiresCompletionEvidence: boolean
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

  // เหตุผลปิดงาน/ประเภทปัญหา — list คืนทั้งของแผนกที่เลือกและระดับบริษัทที่แผนกนี้ใช้ร่วม
  getCloseoutReasons: (companyId: string, departmentId: string) =>
    api.get<TicketCloseoutReasonDto[]>('/ticket-closeout-reasons/manage', {
      params: { companyId, departmentId },
    }).then(r => r.data),

  createCloseoutReason: (body: TicketCloseoutReasonBody & { companyId: string; departmentId?: string }) =>
    api.post<TicketCloseoutReasonDto>('/ticket-closeout-reasons', body).then(r => r.data),

  updateCloseoutReason: (id: string, body: TicketCloseoutReasonBody & { isActive: boolean }) =>
    api.put<TicketCloseoutReasonDto>(`/ticket-closeout-reasons/${id}`, body).then(r => r.data),

  // ทีมสำเร็จรูป — list คืนทั้งของแผนกที่เลือกและระดับบริษัทที่แผนกนี้ใช้ร่วม
  getTeamTemplates: (companyId: string, departmentId: string) =>
    api.get<TicketTeamTemplateDto[]>('/ticket-team-templates/manage', {
      params: { companyId, departmentId },
    }).then(r => r.data),

  createTeamTemplate: (body: TicketTaxonomyItemBody & {
    companyId: string
    departmentId?: string
    employeeIds: string[]
  }) => api.post<TicketTeamTemplateDto>('/ticket-team-templates', body).then(r => r.data),

  updateTeamTemplate: (id: string, body: TicketTaxonomyItemBody & {
    isActive: boolean
    employeeIds: string[]
  }) => api.put<TicketTeamTemplateDto>(`/ticket-team-templates/${id}`, body).then(r => r.data),
}
