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
  national_id: string
  phone: string
  fullName: string
  email?: string
  avatarUrl?: string
  companyId: string
  roles: RoleClaim[]
}

export type EmployeeProfileDto = EmployeeSummaryDto & {
  phone?: string
  companyName?: string
  departmentId?: string
  departmentName?: string
  roleLabelName?: string
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
  timeFrom?: string
  timeTo?: string
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

// ─── Company ─────────────────────────────────────────────────────────────────

export type OrgType = 'Holding' | 'Subsidiary' | 'Branch'

export type CompanyDto = {
  id: string
  name: string
  nameEn?: string
  orgType: OrgType
  parentId?: string
  parentName?: string
  isActive: boolean
  isHeadquarters: boolean
}

export type CompanyTreeDto = {
  id: string
  name: string
  nameEn?: string
  orgType: OrgType
  isActive: boolean
  isHeadquarters: boolean
  children: CompanyTreeDto[]
}

// ─── Department ──────────────────────────────────────────────────────────────

export type DepartmentDto = {
  id: string
  companyId: string
  name: string
  deptType?: string
  managerEmployeeId?: string
  managerName?: string
  isActive: boolean
}

export type DepartmentListItemDto = DepartmentDto & {
  employeeCount: number
}

// ─── Address Reference ───────────────────────────────────────────────────────

export type ProvinceDto = {
  provinceId: number
  provinceName?: string
}

export type DistrictDto = {
  districtId: number
  districtName?: string
  provinceId?: number
}

export type SubDistrictDto = {
  subDistrictId: number
  subDistrictName?: string
  districtId?: number
  provinceId?: number
}

// ─── Location ────────────────────────────────────────────────────────────────

export type LocationDto = {
  id: string
  companyId: string
  name: string
  latitude: number
  longitude: number
  radiusMeters: number
  address?: string
  provinceId?: number
  provinceName?: string
  districtId?: number
  districtName?: string
  subDistrictId?: number
  subDistrictName?: string
  isActive: boolean
}

// ─── Role Label ──────────────────────────────────────────────────────────────

export type RoleType = 'Employee' | 'Supervisor' | 'Hr' | 'SchoolAdmin' | 'Executive' | 'Admin'

export type RoleLabelDto = {
  id: string
  companyId: string
  name: string
  isActive: boolean
}

// ─── Attendance ──────────────────────────────────────────────────────────────

export type AttendanceStatus = 'Present' | 'Late' | 'Absent' | 'HalfDay'

export type AttendanceTodayDto = {
  id?: string
  date: string
  checkInTime?: string
  checkOutTime?: string
  checkInLatitude?: number
  checkInLongitude?: number
  checkInSelfieUrl?: string
  checkOutSelfieUrl?: string
  locationId?: string
  locationName?: string
  isLate: boolean
  lateMinutes: number
  status?: AttendanceStatus
  remark?: string
  canCheckIn: boolean
  canCheckOut: boolean
  shiftName?: string
  shiftStart?: string
  shiftEnd?: string
}

export type AttendanceRecordDto = {
  id: string
  employeeId: string
  employeeFullName: string
  employeeCode: string
  date: string
  checkInTime?: string
  checkOutTime?: string
  checkInLatitude?: number
  checkInLongitude?: number
  checkInSelfieUrl?: string
  checkOutSelfieUrl?: string
  locationId?: string
  locationName?: string
  isLate: boolean
  lateMinutes: number
  status: AttendanceStatus
  remark?: string
}

// ─── Holiday ─────────────────────────────────────────────────────────────────

export type HolidayDto = {
  id: string
  companyId?: string
  companyName?: string
  name: string
  date: string      // "YYYY-MM-DD"
  isActive: boolean
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
