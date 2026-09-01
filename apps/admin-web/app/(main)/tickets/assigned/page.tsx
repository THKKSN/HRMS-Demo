'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, ClipboardCheck, Search } from 'lucide-react'
import type { TicketPriority, TicketStatus } from '@hrms/shared-types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { TicketBoardSummary } from '@/components/tickets/ticket-board-summary'
import { SourceChannelIcon } from '@/components/tickets/source-channel-icon'
import { TicketWorkTabs } from '@/components/tickets/ticket-work-tabs'
import { useAssignedTickets } from '@/hooks/use-tickets'
import { TICKET_STATUS_LABEL } from '@/lib/ticket-status'

const PAGE_SIZE = 10

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  Low: 'ปกติ',
  Medium: 'กลาง',
  High: 'ด่วน',
  Critical: 'ด่วนมาก',
}

function statusVariant(status: TicketStatus): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' {
  if (status === 'WaitingInfo') return 'warning'
  if (status === 'Closed') return 'success'
  if (status === 'Rejected' || status === 'Cancelled') return 'destructive'
  return status === 'Assigned' || status === 'InProgress' ? 'default' : 'secondary'
}

function priorityClass(priority: TicketPriority) {
  if (priority === 'Critical') return 'bg-red-50 text-red-700'
  if (priority === 'High') return 'bg-amber-50 text-amber-700'
  return 'bg-muted text-muted-foreground'
}

function thaiDateTime(value?: string) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function AssignedTicketsPage() {
  const searchParams = useSearchParams()
  const [history, setHistory] = useState(() => searchParams.get('history') === '1')
  const [status, setStatus] = useState<TicketStatus | undefined>()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [requestType, setRequestType] = useState<'Internal' | 'External'>('Internal')
  const [page, setPage] = useState(1)

  const query = useAssignedTickets({
    status,
    search: search || undefined,
    history,
    requestType,
    page,
    pageSize: PAGE_SIZE,
  })

  useEffect(() => {
    const availablePages = Math.max(1, Math.ceil((query.data?.totalCount ?? 0) / PAGE_SIZE))
    if (!query.data || page <= availablePages) return
    setPage(availablePages)
  }, [page, query.data])

  useEffect(() => {
    setHistory(searchParams.get('history') === '1')
    setStatus(undefined)
    setPage(1)
  }, [searchParams])

  const totalCount = query.data?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const firstItem = totalCount === 0 ? 0 : ((page - 1) * PAGE_SIZE) + 1
  const lastItem = Math.min(page * PAGE_SIZE, totalCount)

  function changeMode(nextHistory: boolean) {
    setHistory(nextHistory)
    setStatus(undefined)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      <TicketWorkTabs
        active={history ? 'history' : 'current'}
        onAssignedModeChange={changeMode}
      />

      {/* แยกงานตามช่องทางแจ้ง — ภายใน (พนักงาน) / ภายนอก (external portal) */}
      <div className="flex gap-1 border-b border-border">
        <Button
          variant={requestType === 'Internal' ? 'default' : 'ghost'}
          onClick={() => { setRequestType('Internal'); setPage(1) }}
        >
          ภายใน
        </Button>
        <Button
          variant={requestType === 'External' ? 'default' : 'ghost'}
          onClick={() => { setRequestType('External'); setPage(1) }}
        >
          ภายนอก
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_240px]">
        <form
          className="relative"
          onSubmit={event => {
            event.preventDefault()
            setSearch(searchInput.trim())
            setPage(1)
          }}
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            className="pl-9"
            placeholder="ค้นหาเลข Ticket หรือชื่อเรื่อง"
          />
        </form>
        <Select
          value={status ?? ''}
          onChange={event => {
            setStatus((event.target.value || undefined) as TicketStatus | undefined)
            setPage(1)
          }}
        >
          <option value="">ทุกสถานะ</option>
          {(Object.keys(TICKET_STATUS_LABEL) as TicketStatus[]).map(item => (
            <option key={item} value={item}>{TICKET_STATUS_LABEL[item]}</option>
          ))}
        </Select>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-background">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-border bg-muted/30 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Ticket</th>
              <th className="px-4 py-3 font-medium">ผู้แจ้ง</th>
              <th className="px-4 py-3 font-medium">หมวด / หัวข้อ</th>
              {requestType === 'External' && <th className="px-4 py-3 font-medium">สถานที่</th>}
              <th className="px-4 py-3 font-medium">สถานะ</th>
              <th className="px-4 py-3 font-medium">รับงานเมื่อ</th>
              <th className="w-32 px-4 py-3 font-medium">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading && Array.from({ length: 5 }).map((_, index) => (
              <tr key={index} className="border-b border-border">
                <td colSpan={requestType === 'External' ? 7 : 6} className="px-4 py-4">
                  <div className="h-5 animate-pulse rounded bg-muted" />
                </td>
              </tr>
            ))}
            {!query.isLoading && (query.data?.items.length ?? 0) === 0 && (
              <tr>
                <td colSpan={requestType === 'External' ? 7 : 6} className="px-4 py-16 text-center text-muted-foreground">
                  {history ? 'ยังไม่มีประวัติงาน' : 'ยังไม่มีงานที่มอบหมายให้คุณ'}
                </td>
              </tr>
            )}
            {query.data?.items.map(ticket => (
              <tr key={ticket.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3">
                  <Link href={`/tickets/${ticket.id}`} className="flex items-center gap-1.5 font-medium text-primary hover:underline">
                    <SourceChannelIcon channel={ticket.sourceChannel} />
                    {ticket.ticketNo}
                  </Link>
                  <p className="mt-1 max-w-72 truncate font-medium">{ticket.title}</p>
                  <span className={`mt-1 inline-flex rounded px-1.5 py-0.5 text-xs ${priorityClass(ticket.priority)}`}>
                    {PRIORITY_LABEL[ticket.priority]}
                  </span>
                  <TicketBoardSummary
                    compact
                    workflowCurrentStepLabel={ticket.workflowCurrentStepLabel}
                    currentWorkState={ticket.currentWorkState}
                    currentBlockerReason={ticket.currentBlockerReason}
                    currentNextAction={ticket.currentNextAction}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span>{ticket.requesterName}{ticket.requester.nickname && ` (${ticket.requester.nickname})`}</span>
                    <Badge variant={ticket.requester.type === 'External' ? 'destructive' : 'secondary'}>
                      {ticket.requester.type === 'External' ? 'ภายนอก' : 'ภายใน'}
                    </Badge>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p>{ticket.categoryName}</p>
                  <p className="text-xs text-muted-foreground">{ticket.topicName}</p>
                </td>
                {requestType === 'External' && (
                  <td className="px-4 py-3 text-muted-foreground">
                    {ticket.locationText ?? ticket.vehicleText ?? '-'}
                  </td>
                )}
                <td className="px-4 py-3">
                  <Badge variant={statusVariant(ticket.status)}>{TICKET_STATUS_LABEL[ticket.status]}</Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{thaiDateTime(ticket.assignedAt)}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/tickets/${ticket.id}`}
                    className={`inline-flex h-8 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ${
                      history
                        ? 'border border-border bg-background hover:bg-whited'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    <ClipboardCheck className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>แสดง {firstItem}-{lastItem} จาก {totalCount} รายการ</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(current => Math.max(1, current - 1))}
          >
            <ChevronLeft className="h-4 w-4" /> ก่อนหน้า
          </Button>
          <span>หน้า {page} / {totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(current => current + 1)}
          >
            ถัดไป <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
