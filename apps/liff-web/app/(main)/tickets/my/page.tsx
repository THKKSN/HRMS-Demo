'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  AlertCircle,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Filter,
  Plus,
  Search,
  UserRound,
  X,
} from 'lucide-react'
import type { MyTicketItemDto, TicketPriority, TicketStatus } from '@hrms/shared-types'
import { PageHeader } from '@/components/layout/page-header'
import { TicketListTabs } from '@/components/tickets/ticket-list-tabs'
import { useMyTickets } from '@/hooks/use-tickets'
import { TICKET_STATUS_LABEL } from '@/lib/ticket-status'

const PAGE_SIZE = 10

const STATUS_TONE: Record<TicketStatus, string> = {
  Open: 'border-sky-200 bg-sky-50 text-sky-700',
  Assigned: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  InProgress: 'border-blue-200 bg-blue-50 text-blue-700',
  WaitingInfo: 'border-amber-200 bg-amber-50 text-amber-800',
  Resolved: 'border-cyan-200 bg-cyan-50 text-cyan-800',
  Closed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Rejected: 'border-red-200 bg-red-50 text-red-700',
  Cancelled: 'border-zinc-200 bg-zinc-100 text-zinc-700',
}

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  Low: 'ปกติ',
  Medium: 'ปานกลาง',
  High: 'เร่งด่วน',
  Critical: 'ด่วนมาก',
}

const PRIORITY_TONE: Record<TicketPriority, string> = {
  Low: 'text-slate-500',
  Medium: 'text-blue-600',
  High: 'text-orange-600',
  Critical: 'text-red-600',
}

const QUICK_STATUSES: Array<{ value?: TicketStatus; label: string }> = [
  { label: 'ทั้งหมด' },
  ...(Object.entries(TICKET_STATUS_LABEL) as Array<[TicketStatus, string]>)
    .map(([value, label]) => ({ value, label })),
]

const STATIONS = ['รับเรื่อง', 'มอบหมาย', 'ดำเนินการ', 'ตรวจรับ', 'ปิดงาน']

function thaiDate(value: string) {
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function activeStation(status: TicketStatus) {
  if (status === 'Open') return 0
  if (status === 'Assigned') return 1
  if (status === 'InProgress' || status === 'WaitingInfo') return 2
  if (status === 'Resolved') return 3
  if (status === 'Closed') return 4
  return -1
}

function StatusStation({ status }: { status: TicketStatus }) {
  const active = activeStation(status)
  if (active < 0) {
    return (
      <div className={`mt-4 rounded-md border px-3 py-2 text-center text-xs font-semibold ${STATUS_TONE[status]}`}>
        สิ้นสุดรายการ: {TICKET_STATUS_LABEL[status]}
      </div>
    )
  }

  return (
    <div className="mt-4">
      <div className="relative grid grid-cols-5">
        <div className="absolute left-[10%] right-[10%] top-2 h-0.5 bg-border" />
        <div
          className="absolute left-[10%] top-2 h-0.5 bg-primary transition-[width]"
          style={{ width: `${active * 20}%` }}
        />
        {STATIONS.map((station, index) => (
          <div key={station} className="relative flex min-w-0 flex-col items-center">
            <span className={`z-10 h-4 w-4 rounded-full border-2 ${
              index <= active
                ? 'border-primary bg-primary'
                : 'border-border bg-background'
            }`} />
            <span className={`mt-1.5 w-full truncate text-center text-[9px] ${
              index === active ? 'font-semibold text-primary' : 'text-muted-foreground'
            }`}>
              {station}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TicketCard({ ticket }: { ticket: MyTicketItemDto }) {
  return (
    <Link
      href={`/tickets/${ticket.id}`}
      className="block border-b border-border bg-background px-4 py-4 transition-colors active:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-xs font-bold text-primary">{ticket.ticketNo}</span>
            <span className={`text-[10px] font-semibold ${PRIORITY_TONE[ticket.priority]}`}>
              {PRIORITY_LABEL[ticket.priority]}
            </span>
          </div>
          <h2 className="mt-1 line-clamp-2 text-sm font-semibold leading-5">{ticket.title}</h2>
        </div>
        <span className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-semibold ${STATUS_TONE[ticket.status]}`}>
          {TICKET_STATUS_LABEL[ticket.status]}
        </span>
      </div>

      <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
        <p className="flex items-start gap-2">
          <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-2">
            {ticket.targetCompanyName} · {ticket.targetDepartmentName}
          </span>
        </p>
        <p className="pl-5">
          {ticket.categoryName} / {ticket.topicName}
          {ticket.otherTopicText ? `: ${ticket.otherTopicText}` : ''}
        </p>
      </div>

      <StatusStation status={ticket.status} />

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <UserRound className="h-3.5 w-3.5" />
          {ticket.currentAssigneeName ?? 'รอผู้รับผิดชอบ'}
        </span>
        <span className="flex items-center gap-1">
          <Clock3 className="h-3.5 w-3.5" />
          {thaiDate(ticket.updatedAt)}
        </span>
      </div>

      {ticket.hasPendingCancellation && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          กำลังรอพิจารณาคำขอยกเลิก
        </div>
      )}
    </Link>
  )
}

export default function MyTicketsPage() {
  const [status, setStatus] = useState<TicketStatus | undefined>()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  const query = useMyTickets({
    status,
    search: search || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    pageSize: PAGE_SIZE,
  })
  const totalCount = query.data?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const dateFilterCount = Number(!!dateFrom) + Number(!!dateTo)

  function selectStatus(nextStatus?: TicketStatus) {
    setStatus(nextStatus)
    setPage(1)
  }

  function clearDateFilters() {
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <PageHeader
        title="เรื่องของฉัน"
        subtitle={`${totalCount} รายการ`}
      />
      <TicketListTabs />

      <div className="border-b border-border bg-background">
        <div className="flex gap-2 px-4 py-3">
          <form
            className="relative min-w-0 flex-1"
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
              placeholder="ค้นหาเลข Ticket หรือชื่อเรื่อง"
              className="h-10 w-full rounded-md border border-border bg-muted/30 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </form>
          <button
            type="button"
            title="กรองวันที่"
            onClick={() => setShowFilters(true)}
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-background"
          >
            <Filter className="h-4 w-4" />
            {dateFilterCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                {dateFilterCount}
              </span>
            )}
          </button>
        </div>

        <div className="scrollbar-none flex gap-2 overflow-x-auto px-4 pb-3">
          {QUICK_STATUSES.map(item => {
            const active = status === item.value
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => selectStatus(item.value)}
                className={`h-8 shrink-0 rounded-md border px-3 text-xs font-semibold ${
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>

      </div>

      <div className="border-t border-border">
        {query.isLoading && Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="border-b border-border bg-background p-4">
            <div className="h-32 animate-pulse rounded-md bg-muted" />
          </div>
        ))}

        {query.isError && (
          <div className="m-4 rounded-md border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
            โหลดรายการไม่สำเร็จ กรุณาลองใหม่
          </div>
        )}

        {!query.isLoading && !query.isError && (query.data?.items.length ?? 0) === 0 && (
          <div className="px-6 py-16 text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-semibold">ไม่พบรายการแจ้งเรื่อง</p>
            <p className="mt-1 text-xs text-muted-foreground">ลองเปลี่ยนตัวกรองหรือแจ้งเรื่องใหม่</p>
          </div>
        )}

        {query.data?.items.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)}
      </div>

      {totalCount > 0 && (
        <div className="flex items-center justify-between border-t border-border bg-background px-4 py-3">
          <p className="text-xs text-muted-foreground">หน้า {page} จาก {totalPages}</p>
          <div className="flex gap-1">
            <button
              type="button"
              title="หน้าก่อน"
              disabled={page <= 1}
              onClick={() => setPage(value => value - 1)}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="หน้าถัดไป"
              disabled={page >= totalPages}
              onClick={() => setPage(value => value + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed bottom-20 left-1/2 z-20 flex w-full max-w-107.5 -translate-x-1/2 justify-end px-4">
        <Link
          href="/tickets/new"
          title="แจ้งเรื่องใหม่"
          aria-label="แจ้งเรื่องใหม่"
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background/80 active:scale-95"
        >
          <Plus className="h-6 w-6" />
        </Link>
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/40" onClick={() => setShowFilters(false)}>
          <div
            className="mx-auto w-full max-w-107.5 rounded-t-lg bg-background"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <h2 className="text-base font-semibold">กรองตามวันที่เปิดเรื่อง</h2>
              <button
                type="button"
                title="ปิด"
                onClick={() => setShowFilters(false)}
                className="flex h-9 w-9 items-center justify-center rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-muted-foreground">
                  ตั้งแต่
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={event => { setDateFrom(event.target.value); setPage(1) }}
                    className="mt-1 h-11 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
                  />
                </label>
                <label className="text-xs text-muted-foreground">
                  ถึง
                  <input
                    type="date"
                    value={dateTo}
                    onChange={event => { setDateTo(event.target.value); setPage(1) }}
                    className="mt-1 h-11 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={clearDateFilters}
                  className="h-11 rounded-md border border-border text-sm font-semibold"
                >
                  ล้างตัวกรอง
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilters(false)}
                  className="h-11 rounded-md bg-primary text-sm font-semibold text-primary-foreground"
                >
                  ดูผลลัพธ์
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
