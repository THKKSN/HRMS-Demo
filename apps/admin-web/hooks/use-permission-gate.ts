'use client'

import { useMemo } from 'react'
import { hasAnyRole } from '@/lib/permission'
import { useAuthStore } from '@/stores/auth.store'

/**
 * Hook กลางสำหรับ gate UI ด้วย permission code — หน้าต่างๆ ไม่ต้องอ่าน employee.roles ตรงๆ
 * (คนละตัวกับ usePermissions ใน use-permissions.ts ซึ่งเป็น query จัดการ role/permission matrix)
 *
 * - `has(code, fallbackRoles?)` — มี permission นี้ไหม (fallback เป็น role เฉพาะ payload เก่าที่ไม่มี permissionCodes)
 * - `hasAny(codes, fallbackRoles?)` — มี code ใดตัวหนึ่งไหม
 */
export function usePermissionGate() {
  const employee = useAuthStore((s) => s.employee)

  return useMemo(() => {
    const permissionCodes = new Set(employee?.permissionCodes ?? [])
    const hasPermissionPayload = Array.isArray(employee?.permissionCodes)

    const hasAny = (codes: string[], fallbackRoles?: string[]) => {
      if (!employee) return false
      if (hasPermissionPayload) return codes.some((code) => permissionCodes.has(code))
      return fallbackRoles?.length ? hasAnyRole(employee, fallbackRoles) : false
    }

    return {
      employee,
      permissionCodes,
      hasPermissionPayload,
      has: (code: string, fallbackRoles?: string[]) => hasAny([code], fallbackRoles),
      hasAny,
    }
  }, [employee])
}
