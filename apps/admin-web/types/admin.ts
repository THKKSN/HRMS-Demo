import type { PagedResult, RoleType } from '@hrms/shared-types'

export type { RoleType }

export type EmployeeRoleDto = {
  id: string
  role: RoleType
  companyId: string
  departmentId?: string
  isActive: boolean
}

export type EmployeeListItemDto = {
  id: string
  employeeCode: string
  fullName: string
  companyId: string
  companyName: string
  departmentId?: string
  departmentName?: string
  roles: string[]
  roleLabelId?: string
  roleLabelName?: string
  isActive: boolean
}

export type EmployeeDetailDto = {
  id: string
  employeeCode: string
  fullName: string
  email?: string
  phone?: string
  nationalIdMasked?: string
  nationalId?: string
  companyId?: string
  companyName?: string
  departmentId?: string
  departmentName?: string
  hireDate?: string
  isActive: boolean
  roles: EmployeeRoleDto[]
  roleLabelId?: string
  roleLabelName?: string
}

export type LeaveTypeAdminDto = {
  id: string
  code: string
  nameTh: string
  nameEn?: string
  defaultDaysPerYear: number
  requiresAttachment: boolean
  isActive: boolean
}

export type LeaveBalanceAdminDto = {
  id: string
  employeeId: string
  employeeCode: string
  employeeName: string
  departmentName?: string
  leaveTypeId: string
  leaveTypeName: string
  year: number
  totalDays: number
  usedDays: number
  pendingDays: number
  remainingDays: number
}

export type ShiftDto = {
  id: string
  companyId: string
  companyName: string
  name: string
  startTime: string
  endTime: string
  gracePeriodMinutes: number
  isActive: boolean
}

export type HolidayDto = {
  id: string
  companyId: string | null
  companyName: string | null
  name: string
  date: string
  isActive: boolean
}

export type WeeklyHolidayScheduleDto = {
  id: string
  companyId: string | null
  companyName: string | null
  name: string
  dayOfWeek: number          // 0=Sun, 1=Mon, ..., 6=Sat
  workDayOccurrences: number[] // [1] = ครั้งที่ 1 ทำงาน, [] = หยุดทุกสัปดาห์
  isActive: boolean
}

export type { PagedResult }
