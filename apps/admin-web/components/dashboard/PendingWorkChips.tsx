'use client'

import Link from 'next/link'
import { useTicketPendingCounts } from '@/hooks/use-tickets'

// แถวสรุปงานคงค้างของผู้ใช้ปัจจุบัน — แสดงเฉพาะรายการที่มีสิทธิ์เห็นและมีจำนวน > 0
// โทนสีตามประเภทงาน ชุดเดียวกับ quick-link ของแอป
const CHIP_TONES = {
  sky: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10',
  rose: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10',
  violet: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10',
  amber: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10',
} as const

const BADGE_TONES = {
  sky: 'bg-sky-500',
  rose: 'bg-rose-500',
  violet: 'bg-violet-500',
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
} as const

type ChipTone = keyof typeof CHIP_TONES

export function PendingWorkChips() {
  const { data: counts, isError } = useTicketPendingCounts()
  if (isError || !counts) return null

  const allChips: { key: string; label: string; href: string; count?: number | null; tone: ChipTone }[] = [
    { key: 'inboxUntriaged', label: 'เรื่องใหม่รอจัดการ', href: '/tickets/inbox', count: counts.inboxUntriaged, tone: 'sky' },
    { key: 'cancellationPending', label: 'คำขอยกเลิกรอตัดสิน', href: '/tickets/inbox', count: counts.cancellationPending, tone: 'rose' },
    { key: 'assignedActive', label: 'งานที่รับไว้กำลังทำ', href: '/tickets/assigned', count: counts.assignedActive, tone: 'violet' },
    { key: 'assignedWaitingInfo', label: 'งานรอข้อมูล', href: '/tickets/assigned', count: counts.assignedWaitingInfo, tone: 'amber' },
    { key: 'claimable', label: 'งานใหม่รอรับ', href: '/tickets/assigned', count: counts.claimable, tone: 'amber' },
    { key: 'awaitingMyConfirmation', label: 'เรื่องที่แจ้งรอตรวจรับ', href: '/tickets', count: counts.awaitingMyConfirmation, tone: 'emerald' },
  ]
  const chips = allChips.filter(chip => (chip.count ?? 0) > 0)

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map(chip => (
        <Link
          key={chip.key}
          href={chip.href}
          className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium shadow-sm transition-opacity hover:opacity-80 ${CHIP_TONES[chip.tone]}`}
        >
          {chip.label}
          <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold text-white ${BADGE_TONES[chip.tone]}`}>
            {(chip.count ?? 0) > 99 ? '99+' : chip.count}
          </span>
        </Link>
      ))}
    </div>
  )
}
