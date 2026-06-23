import type {
  HalfDayType,
  LeaveBalanceDto,
  LeaveRequestDto,
  LeaveRequestListItemDto,
  LeaveStatus,
  LeaveTypeDto,
  PagedResult,
  PendingLeaveItemDto,
} from '@hrms/shared-types'
import { api } from './api'

export type CreateLeaveBody = {
  leaveTypeId: string
  dateFrom: string
  dateTo: string
  halfDay: HalfDayType
  timeFrom?: string
  timeTo?: string
  reason?: string
  attachmentUrl?: string
}

export const leavesApi = {
  getLeaveTypes: () =>
    api.get<LeaveTypeDto[]>('/leave-types').then(r => r.data),

  getMyLeaves: (params?: { page?: number; pageSize?: number; status?: LeaveStatus }) =>
    api.get<PagedResult<LeaveRequestListItemDto>>('/leaves', { params }).then(r => r.data),

  getLeaveById: (id: string) =>
    api.get<LeaveRequestDto>(`/leaves/${id}`).then(r => r.data),

  createLeave: (body: CreateLeaveBody) =>
    api.post<LeaveRequestDto>('/leaves', body).then(r => r.data),

  cancelLeave: (id: string) =>
    api.post<void>(`/leaves/${id}/cancel`).then(r => r.data),

  getMyLeaveBalance: (year: number) =>
    api
      .get<LeaveBalanceDto[]>('/employees/me/leave-balance', { params: { year } })
      .then(r => r.data),

  getPendingApprovals: (params?: { page?: number; pageSize?: number }) =>
    api
      .get<PagedResult<PendingLeaveItemDto>>('/leaves/pending', { params })
      .then(r => r.data),

  approveLeave: (id: string, comment?: string) =>
    api.post<LeaveRequestDto>(`/leaves/${id}/approve`, { comment }).then(r => r.data),

  rejectLeave: (id: string, comment?: string) =>
    api.post<void>(`/leaves/${id}/reject`, { comment }).then(r => r.data),
}
