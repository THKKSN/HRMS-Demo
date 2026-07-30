import { api } from './api'
import type {
  LeaveBalanceDto,
  LeaveRequestDto,
  LeaveRequestListItemDto,
  LeaveStatus,
  LeaveTypeDto,
  PagedResult,
  PendingLeaveItemDto,
  HalfDayType,
} from '@hrms/shared-types'

export type CreateLeaveBody = {
  leaveTypeId: string
  dateFrom: string
  dateTo: string
  halfDay: HalfDayType
  timeFrom?: string
  timeTo?: string
  reason?: string
  attachmentUrls?: string[]
}

export const leavesApi = {
  getLeaveTypes: () =>
    api.get<LeaveTypeDto[]>('/leave-types').then((r) => r.data),

  getMyLeaves: (params?: { page?: number; pageSize?: number; status?: LeaveStatus }) =>
    api.get<PagedResult<LeaveRequestListItemDto>>('/leaves', { params: { ...params, myOnly: true } }).then((r) => r.data),

  getAllLeaves: (params?: {
    page?: number
    pageSize?: number
    status?: LeaveStatus
    employeeId?: string
    search?: string
    dateFrom?: string
    dateTo?: string
  }) =>
    api.get<PagedResult<LeaveRequestListItemDto>>('/leaves', { params }).then((r) => r.data),

  getLeaveById: (id: string) =>
    api.get<LeaveRequestDto>(`/leaves/${id}`).then((r) => r.data),

  createLeave: (body: CreateLeaveBody) =>
    api.post<LeaveRequestDto>('/leaves', body).then((r) => r.data),

  cancelLeave: (id: string) =>
    api.post<void>(`/leaves/${id}/cancel`).then((r) => r.data),

  getMyLeaveBalance: (year: number) =>
    api
      .get<LeaveBalanceDto[]>('/employees/me/leave-balance', { params: { year } })
      .then((r) => r.data),

  getPendingApprovals: (params?: { page?: number; pageSize?: number }) =>
    api
      .get<PagedResult<PendingLeaveItemDto>>('/leaves/pending', { params })
      .then((r) => r.data),

  approveLeave: (id: string, comment?: string) =>
    api.post<LeaveRequestDto>(`/leaves/${id}/approve`, { comment }).then((r) => r.data),

  rejectLeave: (id: string, comment?: string) =>
    api.post<void>(`/leaves/${id}/reject`, { comment }).then((r) => r.data),

  requestCancelLeave: (id: string, reason?: string) =>
    api.post<void>(`/leaves/${id}/request-cancel`, { reason }).then((r) => r.data),

  getCancellationPending: (params?: { page?: number; pageSize?: number }) =>
    api.get<PagedResult<PendingLeaveItemDto>>('/leaves/cancellation-pending', { params }).then((r) => r.data),

  approveCancelLeave: (id: string, comment?: string) =>
    api.post<void>(`/leaves/${id}/approve-cancel`, { comment }).then((r) => r.data),

  rejectCancelLeave: (id: string, comment?: string) =>
    api.post<void>(`/leaves/${id}/reject-cancel`, { comment }).then((r) => r.data),
}
