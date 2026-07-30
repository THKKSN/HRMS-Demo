import { api } from './api'
import type { OtRequestDto, OtStatus, PagedResult } from '@hrms/shared-types'

export type CreateOtBody = {
  date: string
  startTime: string
  endTime: string
  reason?: string
}

export const otApi = {
  getMy: (params?: { status?: OtStatus; year?: number; month?: number; page?: number; pageSize?: number }) =>
    api.get<PagedResult<OtRequestDto>>('/ot-requests/my', { params }).then((r) => r.data),

  getTeam: (params?: { status?: OtStatus; year?: number; month?: number; page?: number; pageSize?: number }) =>
    api.get<PagedResult<OtRequestDto>>('/ot-requests/team', { params }).then((r) => r.data),

  getAll: (params?: { companyId?: string; status?: OtStatus; year?: number; month?: number; page?: number; pageSize?: number }) =>
    api.get<PagedResult<OtRequestDto>>('/ot-requests', { params }).then((r) => r.data),

  create: (body: CreateOtBody) =>
    api.post<OtRequestDto>('/ot-requests', body).then((r) => r.data),

  approve: (id: string, comment?: string) =>
    api.post<OtRequestDto>(`/ot-requests/${id}/approve`, { comment }).then((r) => r.data),

  reject: (id: string, comment: string) =>
    api.post<OtRequestDto>(`/ot-requests/${id}/reject`, { comment }).then((r) => r.data),

  cancel: (id: string) =>
    api.post<OtRequestDto>(`/ot-requests/${id}/cancel`).then((r) => r.data),
}
