/** RoleType ฝั่ง backend (Hrms.Domain.Enums.RoleType) — ใช้ร่วมกันทั้งหน้ารายการและหน้ารายละเอียด */
export const ROLE_TYPES = ['Admin', 'Hr', 'Supervisor', 'Executive', 'Employee'] as const
export type RoleTypeCode = (typeof ROLE_TYPES)[number]

export const ROLE_LABEL_TH: Record<string, string> = {
  Admin:       'ผู้ดูแลระบบ',
  Hr:          'ฝ่ายบุคคล',
  Supervisor:  'หัวหน้างาน',
  Executive:   'ผู้บริหาร',
  Employee:    'พนักงาน',
}

export const ROLE_CHIP_CLASS: Record<string, string> = {
  Admin:       'bg-red-100 text-red-700 border-red-200',
  Hr:          'bg-purple-100 text-purple-700 border-purple-200',
  Supervisor:  'bg-blue-100 text-blue-700 border-blue-200',
  Executive:   'bg-amber-100 text-amber-700 border-amber-200',
  Employee:    'bg-slate-100 text-slate-600 border-slate-200',
}

export const ROLE_CHIP_FALLBACK = 'bg-slate-100 text-slate-600 border-slate-200'

export function roleChipClass(role: string) {
  return ROLE_CHIP_CLASS[role] ?? ROLE_CHIP_FALLBACK
}

/** ตัวย่อจากชื่อ-นามสกุล สำหรับ avatar */
export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  return (parts[0]?.slice(0, 2) ?? '??').toUpperCase()
}
