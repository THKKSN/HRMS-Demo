import type { PagedResult } from '@hrms/shared-types'

export type RoleType = 'Employee' | 'Supervisor' | 'Hr' | 'Admin' | 'Executive'

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
  departmentId?: string
  departmentName?: string
  roles: string[]
  isActive: boolean
}

export type EmployeeDetailDto = {
  id: string
  employeeCode: string
  fullName: string
  email?: string
  phone?: string
  nationalIdMasked?: string
  companyId: string
  departmentId?: string
  departmentName?: string
  hireDate?: string
  isActive: boolean
  roles: EmployeeRoleDto[]
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
  employeeName: string
  leaveTypeId: string
  leaveTypeName: string
  year: number
  totalDays: number
  usedDays: number
  pendingDays: number
  remainingDays: number
}

export type { PagedResult }
