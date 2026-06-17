// ─── Auth ────────────────────────────────────────────────────────────────────

export type AuthResultDto = {
  accessToken: string
  refreshToken: string
  expiresIn: number
  employee: EmployeeSummaryDto
}

// ─── Employee ────────────────────────────────────────────────────────────────

export type RoleClaim = {
  role: string
  companyId?: string
  departmentId?: string
}

export type EmployeeSummaryDto = {
  id: string
  employeeCode: string
  fullName: string
  email?: string
  avatarUrl?: string
  companyId: string
  roles: RoleClaim[]
}

export type EmployeeProfileDto = EmployeeSummaryDto & {
  phone?: string
  departmentId?: string
  hireDate?: string
}

export type EmployeeListItemDto = {
  id: string
  employeeCode: string
  fullName: string
  companyId: string
  departmentId?: string
  isActive: boolean
}

// ─── Leave ───────────────────────────────────────────────────────────────────

export type HalfDayType = 'Full' | 'Morning' | 'Afternoon'

export type LeaveStatus =
  | 'Draft'
  | 'PendingSupervisor'
  | 'PendingHr'
  | 'Approved'
  | 'Rejected'
  | 'Cancelled'

export type LeaveTypeDto = {
  id: string
  code: string
  nameTh: string
  nameEn?: string
  defaultDaysPerYear: number
  requiresAttachment: boolean
}

export type LeaveRequestDto = {
  id: string
  employeeId: string
  employeeName: string
  leaveTypeName: string
  dateFrom: string
  dateTo: string
  halfDay: HalfDayType
  totalDays: number
  reason?: string
  attachmentUrl?: string
  status: LeaveStatus
  supervisorComment?: string
  hrComment?: string
  createdAt: string
}

export type LeaveRequestListItemDto = {
  id: string
  leaveTypeName: string
  dateFrom: string
  dateTo: string
  totalDays: number
  status: LeaveStatus
  createdAt: string
}

export type PendingLeaveItemDto = {
  id: string
  employeeName: string
  leaveTypeName: string
  dateFrom: string
  dateTo: string
  totalDays: number
  status: LeaveStatus
  createdAt: string
}

export type LeaveBalanceDto = {
  leaveTypeId: string
  leaveTypeName: string
  year: number
  totalDays: number
  usedDays: number
  pendingDays: number
  remainingDays: number
}

// ─── Common ──────────────────────────────────────────────────────────────────

export type PagedResult<T> = {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
}

export type ApiError = {
  traceId: string
  error: string
  message: string
  details?: unknown
}
