import type { RoleClaim } from '@hrms/shared-types'

const SUPERVISOR_ROLES = ['Supervisor', 'Hr', 'Admin', 'Executive']
const HR_ROLES = ['Hr', 'Admin']

export function isSupervisorOrAbove(roles: RoleClaim[]): boolean {
  return roles.some(r => SUPERVISOR_ROLES.includes(r.role))
}

export function isHrOrAdmin(roles: RoleClaim[]): boolean {
  return roles.some(r => HR_ROLES.includes(r.role))
}
