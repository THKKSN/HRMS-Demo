'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Clock3, MapPin, Search, Wrench } from 'lucide-react'
import type { TicketPriority, TicketStatus } from '@hrms/shared-types'
import { PageHeader } from '@/components/layout/page-header'
import { TicketListTabs } from '@/components/tickets/ticket-list-tabs'
import { useAssignedTickets, useClaimableTickets } from '@/hooks/use-tickets'
import { TICKET_STATUS_LABEL } from '@/lib/ticket-status'

const PAGE_SIZE = 10
type QueueMode = 'mine' | 'claimable' | 'history'

const priorityLabel: Record<TicketPriority, string> = {
  Low: 'ปกติ', Medium: 'กลาง', High: 'ด่วน', Critical: 'ด่วนมาก',
}

function priorityClass(priority: TicketPriority) {
  if (priority === 'Critical') return 'bg-red-50 text-red-700'
  if (priority === 'High') return 'bg-amber-50 text-amber-700'
  return 'bg-muted text-muted-foreground'
}

function statusClass(status: TicketStatus) {
  const styles: Record<TicketStatus, string> = {
    Open: 'border-amber-200 bg-amber-50 text-amber-700',
    Assigned: 'border-blue-200 bg-blue-50 text-blue-700',
    InProgress: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    WaitingInfo: 'border-orange-200 bg-orange-50 text-orange-700',
    Resolved: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    Closed: 'border-green-200 bg-green-50 text-green-700',
    Rejected: 'border-red-200 bg-red-50 text-red-700',
    Cancelled: 'border-gray-200 bg-gray-50 text-gray-600',
  }
  return styles[status]
}

function thaiDate(value: string) {
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

export default function AssignedTicketsPage() {
  const [mode, setMode] = useState<QueueMode>('mine')
  const [status, setStatus] = useState<TicketStatus | undefined>()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const isClaimable = mode === 'claimable'
  const params = { search: search || undefined, page, pageSize: PAGE_SIZE }
  const assignedQuery = useAssignedTickets(
    { ...params, status, history: mode === 'history' },
    !isClaimable,
  )
  const claimableQuery = useClaimableTickets(params, isClaimable)
  const query = isClaimable ? claimableQuery : assignedQuery
  const totalCount = query.data?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const firstItem = totalCount === 0 ? 0 : ((page - 1) * PAGE_SIZE) + 1
  const lastItem = Math.min(page * PAGE_SIZE, totalCount)

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <PageHeader title="งานของฉัน" subtitle={`${totalCount} รายการ`} />
      <TicketListTabs />
      <div className="sticky top-14 z-10 border-b border-border bg-background p-3">
        <div className="grid grid-cols-2 gap-2">
          <select
            aria-label="ประเภทคิวงาน"
            value={mode}
            onChange={event => {
              setMode(event.target.value as QueueMode)
              setPage(1)
            }}
            className="h-10 min-w-0 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="mine">งานของฉันทั้งหมด</option>
            <option value="claimable">งานที่รับได้</option>
            <option value="history">ประวัติการมอบหมาย</option>
          </select>
          <select
            aria-label="สถานะงาน"
            value={isClaimable ? 'Open' : (status ?? '')}
            disabled={isClaimable}
            onChange={event => {
              setStatus((event.target.value || undefined) as TicketStatus | undefined)
              setPage(1)
            }}
            className="h-10 min-w-0 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary disabled:bg-muted"
          >
            <option value="">ทุกสถานะ</option>
            {(Object.keys(TICKET_STATUS_LABEL) as TicketStatus[]).map(item => (
              <option key={item} value={item}>{TICKET_STATUS_LABEL[item]}</option>
            ))}
          </select>
          <form
            className="relative col-span-2"
            onSubmit={event => {
              event.preventDefault()
              setSearch(searchInput.trim())
              setPage(1)
            }}
          >
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              placeholder="ค้นหาเลข Ticket, เรื่อง, รถ หรือสถานที่"
              className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </form>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {query.isLoading && Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-lg border border-border bg-background" />
        ))}

        {!query.isLoading && (query.data?.items.length ?? 0) === 0 && (
          <div className="flex flex-col items-center py-16 text-center text-muted-foreground">
            <Wrench className="mb-3 h-9 w-9" />
            <p className="text-sm font-medium">ไม่มีงานในรายการนี้</p>
          </div>
        )}

        {query.data?.items.map(ticket => (
          <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="block rounded-lg border border-border bg-background p-4 active:bg-muted">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-primary">{ticket.ticketNo}</p>
                <h2 className="mt-1 line-clamp-2 text-sm font-semibold">{ticket.title}</h2>
              </div>
              <span className={`shrink-0 rounded px-2 py-1 text-[10px] font-semibold ${priorityClass(ticket.priority)}`}>
                {priorityLabel[ticket.priority]}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{ticket.categoryName} / {ticket.topicName}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {(ticket.locationText || ticket.vehicleText) && (
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{ticket.locationText || ticket.vehicleText}</span>
              )}
              <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{isClaimable ? 'แจ้งเมื่อ ' : 'มอบหมายเมื่อ '}{thaiDate(ticket.assignedAt)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="text-xs text-muted-foreground">ผู้แจ้ง {ticket.requesterName}</span>
              <span className={`shrink-0 rounded border px-2 py-1 text-[10px] font-semibold ${
                isClaimable ? 'border-blue-200 bg-blue-50 text-blue-700' : statusClass(ticket.status)
              }`}>
                {isClaimable ? 'กดเพื่อรับงาน' : TICKET_STATUS_LABEL[ticket.status]}
              </span>
            </div>
          </Link>
        ))}

        <div className="flex items-center justify-between border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            {firstItem}–{lastItem} จาก {totalCount} · หน้า {page}/{totalPages}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              title="หน้าก่อน"
              disabled={page <= 1}
              onClick={() => setPage(value => value - 1)}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="หน้าถัดไป"
              disabled={page >= totalPages}
              onClick={() => setPage(value => value + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
