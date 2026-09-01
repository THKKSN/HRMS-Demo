import type { EmployeeSummaryDto } from '@hrms/shared-types'

export function hasAnyRole(employee: EmployeeSummaryDto | null, roles: string[]) {
  return employee?.roles.some((role) => roles.includes(role.role)) ?? false
}

export function hasAnyPermission(permissionCodes: Set<string>, permissions?: string[]) {
  return !permissions?.length || permissions.some((permission) => permissionCodes.has(permission))
}

export function hasAllPermissions(permissionCodes: Set<string>, permissions?: string[]) {
  return !permissions?.length || permissions.every((permission) => permissionCodes.has(permission))
}

type PermissionGatedNavItem = {
  permissions?: string[]
  allPermissions?: string[]
  fallbackRoles?: string[]
  excludeRoles?: string[]
}

/**
 * ตัดสินใจว่าเมนู/ลิงก์นี้ควรแสดงให้ employee เห็นไหม
 *
 * ลำดับการเช็ค:
 * 0. ถ้า role ของผู้ใช้อยู่ใน excludeRoles และไม่มี role ใน fallbackRoles เลย — ซ่อนทันที
 *    (ใช้ปิดเมนูจาก role ที่ถือ permission ผ่านๆ แต่ไม่ได้ตั้งใจให้ใช้หน้านั้น เช่น Executive)
 * 1. ถ้ามี permissions/allPermissions ระบุไว้ — ต้องมี permission ตรงตามเงื่อนไข
 * 2. ถ้าไม่ผ่าน permission แต่ auth response ยังไม่เคยส่ง permissionCodes มาเลย (token เก่า /
 *    ยังไม่ผ่าน login flow ที่ฝัง permission) — fallback ไปเช็ค role ตรงๆ แทน (backward-compat)
 * 3. ถ้าไม่มี permissions rule เลยแต่มี fallbackRoles — เช็ค role ตรงๆ
 * 4. ถ้าไม่มีเงื่อนไขใดเลย — แสดงให้ทุกคนเห็น
 */
export function canSeeItem(
  item: PermissionGatedNavItem,
  employee: EmployeeSummaryDto | null,
  permissionCodes: Set<string>,
  hasPermissionPayload: boolean,
) {
  if (
    item.excludeRoles?.length &&
    hasAnyRole(employee, item.excludeRoles) &&
    !hasAnyRole(employee, item.fallbackRoles ?? [])
  ) {
    return false
  }

  const hasPermissionRule = Boolean(item.permissions?.length || item.allPermissions?.length)

  if (hasPermissionRule) {
    const allowedByPermission =
      hasAnyPermission(permissionCodes, item.permissions) &&
      hasAllPermissions(permissionCodes, item.allPermissions)

    if (allowedByPermission) return true
    return !hasPermissionPayload && hasAnyRole(employee, item.fallbackRoles ?? [])
  }

  if (item.fallbackRoles?.length) {
    return hasAnyRole(employee, item.fallbackRoles)
  }

  return true
}
