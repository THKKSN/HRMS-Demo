import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// formatter วันที่ย้ายไปรวมที่ @hrms/i18n (ใช้ locale ปัจจุบัน, ค่าเริ่มต้น th-TH เหมือนเดิม) — re-export ให้ import path เดิมใช้ต่อได้
export { formatDate, formatDateShort } from '@hrms/i18n/format'
