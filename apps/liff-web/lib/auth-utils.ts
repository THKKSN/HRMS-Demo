import type { EmployeeSummaryDto } from '@hrms/shared-types'

/**
 * เช็คสิทธิ์จาก permissionCodes เป็นหลัก (grant/revoke ผ่านหน้า Role Management มีผลโดยไม่ต้องแก้โค้ด)
 * fallbackRoles ใช้เฉพาะกรณี payload เก่าที่ auth response ยังไม่มี permissionCodes (token ก่อน deploy permission)
 */
export function hasPermission(
  employee: EmployeeSummaryDto | null | undefined,
  code: string,
  fallbackRoles?: string[],
): boolean {
  if (!employee) return false
  if (Array.isArray(employee.permissionCodes)) return employee.permissionCodes.includes(code)
  return fallbackRoles?.length ? employee.roles.some(r => fallbackRoles.includes(r.role)) : false
}

/** เหมือน hasPermission แต่ผ่านถ้ามี code ใดตัวหนึ่ง */
export function hasAnyPermission(
  employee: EmployeeSummaryDto | null | undefined,
  codes: string[],
  fallbackRoles?: string[],
): boolean {
  if (!employee) return false
  if (Array.isArray(employee.permissionCodes)) {
    const owned = employee.permissionCodes
    return codes.some(code => owned.includes(code))
  }
  return fallbackRoles?.length ? employee.roles.some(r => fallbackRoles.includes(r.role)) : false
}
