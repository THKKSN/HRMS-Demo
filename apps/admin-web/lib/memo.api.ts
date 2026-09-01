import { api } from './api'
import type { MemoCategoryDto, MemoDto, MemoInboxItemDto, MemoListItemDto, MemoStatus, MemoSubCategoryDto, MemoTypeDto, PendingMemoItemDto } from '@hrms/shared-types'

export const memoApi = {
  getTypes: (includeInactive = false) =>
    api.get<MemoTypeDto[]>('/memo-types', { params: { includeInactive } }).then(r => r.data),

  createType: (body: { name: string; companyId: string; departmentId: string }) =>
    api.post<MemoTypeDto>('/memo-types', body).then(r => r.data),

  updateType: (id: string, body: { name: string; companyId: string; departmentId: string }) =>
    api.put<MemoTypeDto>(`/memo-types/${id}`, body).then(r => r.data),

  toggleTypeStatus: (id: string, isActive: boolean) =>
    api.patch(`/memo-types/${id}/status`, { isActive }).then(r => r.data),

  getCategories: (memoTypeId: string, includeInactive = false) =>
    api.get<MemoCategoryDto[]>(`/memo-types/${memoTypeId}/categories`, {
      params: { includeInactive },
    }).then(r => r.data),

  createCategory: (body: { memoTypeId: string; name: string }) =>
    api.post<MemoCategoryDto>('/memo-categories', body).then(r => r.data),

  updateCategory: (id: string, body: { name: string }) =>
    api.put<MemoCategoryDto>(`/memo-categories/${id}`, body).then(r => r.data),

  toggleCategoryStatus: (id: string, isActive: boolean) =>
    api.patch(`/memo-categories/${id}/status`, { isActive }).then(r => r.data),

  getSubCategories: (memoCategoryId: string, includeInactive = false) =>
    api.get<MemoSubCategoryDto[]>(`/memo-categories/${memoCategoryId}/sub-categories`, {
      params: { includeInactive },
    }).then(r => r.data),

  createSubCategory: (body: { memoCategoryId: string; name: string }) =>
    api.post<MemoSubCategoryDto>('/memo-sub-categories', body).then(r => r.data),

  updateSubCategory: (id: string, body: { name: string }) =>
    api.put<MemoSubCategoryDto>(`/memo-sub-categories/${id}`, body).then(r => r.data),

  toggleSubCategoryStatus: (id: string, isActive: boolean) =>
    api.patch(`/memo-sub-categories/${id}/status`, { isActive }).then(r => r.data),

  getForApproval: (status?: MemoStatus) =>
    api.get<PendingMemoItemDto[]>('/memos/for-approval', { params: { status } }).then(r => r.data),

  getById: (id: string) =>
    api.get<MemoDto>(`/memos/${id}`).then(r => r.data),

  approve: (id: string, comment?: string) =>
    api.post<MemoDto>(`/memos/${id}/approve`, { comment }).then(r => r.data),

  reject: (id: string, reason: string) =>
    api.post<MemoDto>(`/memos/${id}/reject`, { reason }).then(r => r.data),

  create: (body: { memoTypeId: string; memoCategoryId: string; memoSubCategoryId: string; detail: string }) =>
    api.post<MemoDto>('/memos', body).then(r => r.data),

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
