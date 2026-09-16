import type { useTranslations } from 'next-intl'

type TicketTranslator = ReturnType<typeof useTranslations<'liff.ticket'>>
type BoardStepKey = Parameters<TicketTranslator>[0] extends infer K
  ? K extends `boardStep.${infer Step}`
    ? Step
    : never
  : never

/**
 * ป้ายขั้นตอนบน station line — ค่า label ใน workflow (shared-types) เป็นไทยตายตัว
 * จึงแปลจาก key แทน (liff.ticket.boardStep.*) · key ที่ไม่รู้จัก (workflow ที่ HR ตั้งเองในอนาคต) ใช้ label เดิม
 */
export function boardStepLabel(t: TicketTranslator, step: { key: string; label: string }): string {
  const key = `boardStep.${step.key}` as `boardStep.${BoardStepKey}`
  return t.has(key) ? t(key) : step.label
}
