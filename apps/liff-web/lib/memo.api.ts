import type { MemoCategoryDto, MemoDto, MemoInboxItemDto, MemoListItemDto, MemoStatus, MemoSubCategoryDto, MemoTypeDto, PendingMemoItemDto } from '@hrms/shared-types'
import { api } from './api'

export type CreateMemoBody = {
  memoTypeId: string
  memoCategoryId: string
  memoSubCategoryId: string
  detail: string
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

  // ผู้ขอต้นเรื่องยืนยันรับของ/รับงาน หลังแผนกปลายทางส่งมอบ — ปิดจบ memo
  receive: (id: string) =>
    api.post<MemoDto>(`/memos/${id}/receive`).then(r => r.data),

  // ฝั่งผู้บริหาร (memo:approve)
  getForApproval: (status?: MemoStatus) =>
    api.get<PendingMemoItemDto[]>('/memos/for-approval', { params: { status } }).then(r => r.data),

  approve: (id: string, comment?: string) =>
    api.post<MemoDto>(`/memos/${id}/approve`, { comment }).then(r => r.data),

  reject: (id: string, reason: string) =>
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
}
