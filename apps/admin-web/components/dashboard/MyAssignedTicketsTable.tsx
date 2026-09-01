'use client'

import Link from 'next/link'
import { Wrench } from 'lucide-react'
import type { TicketPriority, TicketStatus } from '@hrms/shared-types'
import { useAssignedTickets } from '@/hooks/use-tickets'
import { TICKET_STATUS_LABEL } from '@/lib/ticket-status'

// สถานะที่ถือว่า "ยังค้างอยู่ในมือ" ของผู้รับงาน
const PENDING_STATUSES: TicketStatus[] = ['Assigned', 'InProgress', 'WaitingInfo', 'Resolved']
const MAX_ROWS = 8

const STATUS_TONE: Partial<Record<TicketStatus, string>> = {
  Assigned: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  InProgress: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  WaitingInfo: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  Resolved: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
}

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  Low: 'ปกติ', Medium: 'กลาง', High: 'ด่วน', Critical: 'ด่วนมาก',
}

const PRIORITY_TONE: Record<TicketPriority, string> = {
  Low: 'text-muted-foreground',
  Medium: 'text-muted-foreground',
  High: 'font-semibold text-amber-600 dark:text-amber-400',
  Critical: 'font-semibold text-rose-600 dark:text-rose-400',
}

function thaiDate(value: string) {
  return new Date(value).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

// ตารางงานที่ได้รับมอบหมายที่ยังค้างอยู่ — ให้พนักงานเห็นว่ามีงานอะไรรอทำ/รอปิดบ้าง
export function MyAssignedTicketsTable() {
  const { data, isLoading, isError } = useAssignedTickets({ pageSize: 50 })
  // 403 (ไม่มีสิทธิ์ ticket:view-assigned) — ซ่อนทั้งการ์ด
  if (isError) return null

  const pending = (data?.items ?? []).filter(item => PENDING_STATUSES.includes(item.status))
  if (!isLoading && pending.length === 0) return null

  const workingCount = pending.filter(item => item.status !== 'Resolved').length
  const waitingReviewCount = pending.filter(item => item.status === 'Resolved').length

  return (
    <div className="rounded-2xl border border-border bg-background shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-xl bg-violet-100 p-2 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400">
            <Wrench className="h-4 w-4" />
          </span>
          <p className="text-sm font-semibold">งานที่ได้รับมอบหมาย</p>
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
            ค้าง {workingCount}{waitingReviewCount > 0 ? ` · รอตรวจรับ ${waitingReviewCount}` : ''}
          </span>
        </div>
        <Link href="/tickets/assigned" className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-400">
          ดูทั้งหมด
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2 p-4">
          {[0, 1, 2].map(index => <div key={index} className="h-9 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Ticket</th>
                <th className="py-2 pr-3 font-medium">เรื่อง</th>
                <th className="py-2 pr-3 font-medium">สถานะ</th>
                <th className="py-2 pr-3 font-medium">ความเร่งด่วน</th>
                <th className="py-2 pr-4 text-right font-medium">อัปเดตล่าสุด</th>
              </tr>
            </thead>
            <tbody>
              {pending.slice(0, MAX_ROWS).map(item => (
                <tr key={item.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <Link href={`/tickets/${item.id}`} className="font-medium text-violet-600 hover:underline dark:text-violet-400">
                      {item.ticketNo}
                    </Link>
                  </td>
                  <td className="max-w-60 truncate py-2.5 pr-3">{item.title}</td>
                  <td className="py-2.5 pr-3 whitespace-nowrap">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[item.status] ?? 'bg-muted text-muted-foreground'}`}>
                      {TICKET_STATUS_LABEL[item.status]}
                    </span>
                  </td>
                  <td className={`py-2.5 pr-3 text-xs whitespace-nowrap ${PRIORITY_TONE[item.priority]}`}>
                    {PRIORITY_LABEL[item.priority]}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                    {thaiDate(item.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pending.length > MAX_ROWS && (
            <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
              และอีก {pending.length - MAX_ROWS} งาน — ดูทั้งหมดที่หน้ากล่องงาน
            </p>
          )}
        </div>
      )}
    </div>
  )
}
