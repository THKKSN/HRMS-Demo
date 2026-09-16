import type {
  MemoActivityDto, MemoAttachmentInput, MemoCategoryDto, MemoDto, MemoInboxItemDto, MemoListItemDto,
  MemoStatus, MemoStepInstanceDto, MemoSubCategoryDto, MemoTypeDto, PendingMemoItemDto,
} from '@hrms/shared-types'
import { api } from './api'

export type CreateMemoBody = {
  memoTypeId: string
  memoCategoryId: string
  memoSubCategoryId: string
  detail: string
  attachments?: MemoAttachmentInput[]
}

export const memoApi = {
  getTypes: () =>
    api.get<MemoTypeDto[]>('/memo-types').then(r => r.data),

  getCategories: (memoTypeId: string) =>
    api.get<MemoCategoryDto[]>(`/memo-types/${memoTypeId}/categories`).then(r => r.data),

  getSubCategories: (memoCategoryId: string) =>
    api.get<MemoSubCategoryDto[]>(`/memo-categories/${memoCategoryId}/sub-categories`).then(r => r.data),

  create: (body: CreateMemoBody) =>
    api.post<MemoDto>('/memos', body).then(r => r.data),

  getMine: (status?: MemoStatus) =>
    api.get<MemoListItemDto[]>('/memos/me', { params: { status } }).then(r => r.data),

  getById: (id: string) =>
    api.get<MemoDto>(`/memos/${id}`).then(r => r.data),

  // ผู้ขอต้นเรื่องยืนยันตรวจรับ หลังแผนกปลายทางส่งมอบ — ปิดจบ memo
  receive: (id: string) =>
    api.post<MemoDto>(`/memos/${id}/receive`).then(r => r.data),

  // ฝั่งผู้บริหาร (memo:approve)
  getForApproval: (status?: MemoStatus) =>
    api.get<PendingMemoItemDto[]>('/memos/for-approval', { params: { status } }).then(r => r.data),

  approve: (id: string, comment?: string) =>
    api.post<MemoDto>(`/memos/${id}/approve`, { comment }).then(r => r.data),

  reject: (id: string, reason?: string) =>
    api.post<MemoDto>(`/memos/${id}/reject`, { reason }).then(r => r.data),

  // ฝั่งหัวหน้าแผนกปลายทาง (memo:view-inbox + role Supervisor)
  getInbox: (includeDelivered = false) =>
    api.get<MemoInboxItemDto[]>('/memos/inbox', { params: { includeDelivered } }).then(r => r.data),

  acknowledge: (id: string) =>
    api.post<MemoDto>(`/memos/${id}/acknowledge`).then(r => r.data),

  deliver: (id: string) =>
    api.post<MemoDto>(`/memos/${id}/deliver`).then(r => r.data),

  printBlob: (id: string) =>
    api.get(`/memos/${id}/print`, { responseType: 'blob' }).then(r => r.data as Blob),

  // ── ขั้นตอนที่ตั้งค่าไว้ต่อประเภทเรื่อง (หลังแผนกรับทราบ) ────────────────────
  // ขั้น Work ปิดด้วย complete · ขั้น Approval ใช้ approve / reject (จบเรื่อง) / return (ตีกลับ)
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

  // ── บันทึกความคืบหน้า ────────────────────────────────────────────────────────
  addActivity: (memoId: string, body: { message: string; attachments?: MemoAttachmentInput[] }) =>
    api.post<MemoActivityDto>(`/memos/${memoId}/activities`, body).then(r => r.data),

  // แก้ได้เฉพาะข้อความ ไฟล์แนบเดิมคงอยู่
  updateActivity: (memoId: string, activityId: string, message: string) =>
    api.put<MemoActivityDto>(`/memos/${memoId}/activities/${activityId}`, { message }).then(r => r.data),
}
