import { api } from './api'
import type { LeaveBalanceAdminDto, PagedResult } from '@/types/admin'

export const leaveBalancesApi = {
  getAll: (params: { year: number; page?: number; pageSize?: number; employeeId?: string }) =>
    api.get<PagedResult<LeaveBalanceAdminDto>>('/leave-balances', { params }).then((r) => r.data),

  create: (body: { employeeId: string; leaveTypeId: string; year: number; totalDays: number }) =>
    api.post<LeaveBalanceAdminDto>('/leave-balances', body).then((r) => r.data),

  adjust: (id: string, totalDays: number) =>
    api.put<LeaveBalanceAdminDto>(`/leave-balances/${id}`, { totalDays }).then((r) => r.data),

  seed: (year: number) =>
    api.post<{ created: number }>('/leave-balances/seed', { year }).then((r) => r.data),
}
