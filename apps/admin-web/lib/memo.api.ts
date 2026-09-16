import { api } from './api'
import type {
  MemoActivityDto, MemoAttachmentInput, MemoCategoryDto, MemoDto, MemoInboxItemDto, MemoListItemDto,
  MemoStatus, MemoStepInstanceDto, MemoStepKind, MemoStepTaskDto, MemoSubCategoryDto, MemoTypeDto,
  MemoWorkflowStepDto, PendingMemoItemDto, RoleType,
} from '@hrms/shared-types'

export type MemoTypeInput = {
  name: string
  nameEn?: string
  nameId?: string
  companyId: string
  departmentId: string
}

// ผู้อนุมัติด่านแรก — employeeId = null คือทุกคนใน role นั้น
export type FirstApproverInput = {
  roleCode: RoleType
  employeeId: string | null
}

export type MemoWorkflowStepInput = {
  label: string
  stepKind: MemoStepKind
  assigneeRoleCode: RoleType
  assigneeEmployeeId?: string | null
  sortOrder: number
}

export const memoApi = {
  getTypes: (includeInactive = false) =>
    api.get<MemoTypeDto[]>('/memo-types', { params: { includeInactive } }).then(r => r.data),

  createType: (body: MemoTypeInput) =>
    api.post<MemoTypeDto>('/memo-types', body).then(r => r.data),

  updateType: (id: string, body: MemoTypeInput) =>
    api.put<MemoTypeDto>(`/memo-types/${id}`, body).then(r => r.data),

  toggleTypeStatus: (id: string, isActive: boolean) =>
    api.patch(`/memo-types/${id}/status`, { isActive }).then(r => r.data),

  setFirstApprover: (id: string, body: FirstApproverInput) =>
    api.patch<MemoTypeDto>(`/memo-types/${id}/first-approver`, body).then(r => r.data),

  getCategories: (memoTypeId: string, includeInactive = false) =>
    api.get<MemoCategoryDto[]>(`/memo-types/${memoTypeId}/categories`, {
      params: { includeInactive },
    }).then(r => r.data),

  createCategory: (body: { memoTypeId: string; name: string; nameEn?: string; nameId?: string }) =>
    api.post<MemoCategoryDto>('/memo-categories', body).then(r => r.data),

  updateCategory: (id: string, body: { name: string; nameEn?: string; nameId?: string }) =>
    api.put<MemoCategoryDto>(`/memo-categories/${id}`, body).then(r => r.data),

  toggleCategoryStatus: (id: string, isActive: boolean) =>
    api.patch(`/memo-categories/${id}/status`, { isActive }).then(r => r.data),

  getSubCategories: (memoCategoryId: string, includeInactive = false) =>
    api.get<MemoSubCategoryDto[]>(`/memo-categories/${memoCategoryId}/sub-categories`, {
      params: { includeInactive },
    }).then(r => r.data),

  createSubCategory: (body: { memoCategoryId: string; name: string; nameEn?: string; nameId?: string }) =>
    api.post<MemoSubCategoryDto>('/memo-sub-categories', body).then(r => r.data),

  updateSubCategory: (id: string, body: { name: string; nameEn?: string; nameId?: string }) =>
    api.put<MemoSubCategoryDto>(`/memo-sub-categories/${id}`, body).then(r => r.data),

  toggleSubCategoryStatus: (id: string, isActive: boolean) =>
    api.patch(`/memo-sub-categories/${id}/status`, { isActive }).then(r => r.data),

  getForApproval: (status?: MemoStatus) =>
    api.get<PendingMemoItemDto[]>('/memos/for-approval', { params: { status } }).then(r => r.data),

  getById: (id: string) =>
    api.get<MemoDto>(`/memos/${id}`).then(r => r.data),

  approve: (id: string, comment?: string) =>
    api.post<MemoDto>(`/memos/${id}/approve`, { comment }).then(r => r.data),

  reject: (id: string, reason?: string) =>
    api.post<MemoDto>(`/memos/${id}/reject`, { reason }).then(r => r.data),

  create: (body: {
    memoTypeId: string
    memoCategoryId: string
    memoSubCategoryId: string
    detail: string
    attachments?: MemoAttachmentInput[]
  }) => api.post<MemoDto>('/memos', body).then(r => r.data),

  getWorkflowSteps: (memoTypeId: string, includeInactive = false) =>
    api.get<MemoWorkflowStepDto[]>(`/memo-types/${memoTypeId}/workflow-steps`, {
      params: { includeInactive },
    }).then(r => r.data),

  createWorkflowStep: (memoTypeId: string, body: MemoWorkflowStepInput) =>
    api.post<MemoWorkflowStepDto>(`/memo-types/${memoTypeId}/workflow-steps`, body).then(r => r.data),

  updateWorkflowStep: (id: string, body: MemoWorkflowStepInput) =>
    api.put<MemoWorkflowStepDto>(`/memo-workflow-steps/${id}`, body).then(r => r.data),

  toggleWorkflowStepStatus: (id: string, isActive: boolean) =>
    api.patch(`/memo-workflow-steps/${id}/status`, { isActive }).then(r => r.data),

  getStepTasks: () =>
    api.get<MemoStepTaskDto[]>('/memos/step-tasks').then(r => r.data),

  completeStep: (memoId: string, stepId: string, body: { note?: string; attachments?: MemoAttachmentInput[] }) =>
    api.post<MemoStepInstanceDto>(`/memos/${memoId}/steps/${stepId}/complete`, body).then(r => r.data),

  approveStep: (memoId: string, stepId: string, comment?: string) =>
    api.post<MemoStepInstanceDto>(`/memos/${memoId}/steps/${stepId}/approve`, { comment }).then(r => r.data),

  rejectStep: (memoId: string, stepId: string, reason: string) =>
    api.post<MemoStepInstanceDto>(`/memos/${memoId}/steps/${stepId}/reject`, { reason }).then(r => r.data),

  // targetStepInstanceId ว่าง = ขั้นก่อนหน้าติดกัน · toRequester = ย้อนถึงผู้ขอ (ขั้นอนุมัติเท่านั้น)
  returnStep: (memoId: string, stepId: string, body: {
    reason: string; targetStepInstanceId?: string; toRequester?: boolean
  }) => api.post<MemoStepInstanceDto>(`/memos/${memoId}/steps/${stepId}/return`, body).then(r => r.data),

  // ผู้ขอส่งเรื่องที่ถูกตีกลับมาหาตัวเองกลับเข้า workflow
  resubmit: (memoId: string, note?: string) =>
    api.post<MemoStepInstanceDto>(`/memos/${memoId}/resubmit`, { note }).then(r => r.data),

  addActivity: (memoId: string, body: { message: string; attachments?: MemoAttachmentInput[] }) =>
    api.post<MemoActivityDto>(`/memos/${memoId}/activities`, body).then(r => r.data),

  // แก้ได้เฉพาะข้อความ ไฟล์แนบเดิมคงอยู่
  updateActivity: (memoId: string, activityId: string, message: string) =>
    api.put<MemoActivityDto>(`/memos/${memoId}/activities/${activityId}`, { message }).then(r => r.data),

  getMine: (status?: MemoStatus) =>
    api.get<MemoListItemDto[]>('/memos/me', { params: { status } }).then(r => r.data),

  getInbox: (includeDelivered = false) =>
    api.get<MemoInboxItemDto[]>('/memos/inbox', { params: { includeDelivered } }).then(r => r.data),

  acknowledge: (id: string) =>
    api.post<MemoDto>(`/memos/${id}/acknowledge`).then(r => r.data),

  deliver: (id: string) =>
    api.post<MemoDto>(`/memos/${id}/deliver`).then(r => r.data),

  receive: (id: string) =>
    api.post<MemoDto>(`/memos/${id}/receive`).then(r => r.data),

  /** ขอ token อายุสั้นสำหรับเปิด PDF ผ่าน URL ตรง (แท็บใหม่แนบ JWT header ไม่ได้) */
  createPrintToken: (id: string) =>
    api.post<{ token: string; expiresIn: number }>(`/memos/${id}/print-token`).then(r => r.data),

  /** URL จริงของ PDF — เปิดตรงเพื่อให้ viewer ได้ชื่อไฟล์ {MemoNo}.pdf จาก Content-Disposition */
  printUrl: (id: string, token: string) =>
    `${api.defaults.baseURL}/memos/${id}/print?token=${token}`,
}
