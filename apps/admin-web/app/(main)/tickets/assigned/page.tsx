'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight, ClipboardCheck, Search } from 'lucide-react'
import type { AssignedTicketScope, TicketPriority, TicketStatus } from '@hrms/shared-types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { TicketBoardSummary } from '@/components/tickets/ticket-board-summary'
import { SourceChannelIcon } from '@/components/tickets/source-channel-icon'
import { useAssignedTickets } from '@/hooks/use-tickets'
import { TICKET_STATUS_LABEL } from '@/lib/ticket-status'
import * as fmt from '@hrms/i18n/format'

const PAGE_SIZE = 10

// ขอบเขตงาน — เดิมเป็นแท็บด้านบน ย้ายมาเป็น filter ข้างช่องค้นหาให้อยู่รวมกับตัวกรองอื่น
const SCOPES: AssignedTicketScope[] = ['Current', 'History', 'All']

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

function shortDateTime(value?: string) {
  if (!value) return '-'
  return fmt.formatDateTime(new Date(value), {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export default function AssignedTicketsPage() {
  const t = useTranslations('admin.ticket.assigned')
  const tList = useTranslations('admin.ticket.list')
  const tStatus = useTranslations('status.ticket')
  const tPriority = useTranslations('status.ticketPriority')
  const searchParams = useSearchParams()
  // ยังรับ ?history=1 จากลิงก์เก่าไว้ก่อน แปลงเป็นค่า scope ตั้งต้น
  const [scope, setScope] = useState<AssignedTicketScope>(
    () => (searchParams.get('history') === '1' ? 'History' : 'Current'),
  )
  const [status, setStatus] = useState<TicketStatus | undefined>()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [requestType, setRequestType] = useState<'Internal' | 'External'>('Internal')
  const [page, setPage] = useState(1)

  const query = useAssignedTickets({
    status,
    search: search || undefined,
    scope,
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
    setScope(searchParams.get('history') === '1' ? 'History' : 'Current')
    setStatus(undefined)
    setPage(1)
  }, [searchParams])

  const totalCount = query.data?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const firstItem = totalCount === 0 ? 0 : ((page - 1) * PAGE_SIZE) + 1
  const lastItem = Math.min(page * PAGE_SIZE, totalCount)

  return (
    <div className="space-y-4">
      {/* แยกงานตามช่องทางแจ้ง — ภายใน (พนักงาน) / ภายนอก (external portal) */}
      <div className="flex gap-1 border-b border-border">
        <Button
          variant={requestType === 'Internal' ? 'default' : 'ghost'}
          onClick={() => { setRequestType('Internal'); setPage(1) }}
        >
          {t('internal')}
        </Button>
        <Button
          variant={requestType === 'External' ? 'default' : 'ghost'}
          onClick={() => { setRequestType('External'); setPage(1) }}
        >
          {t('external')}
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_200px_200px]">
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
            placeholder={tList('searchPlaceholder')}
          />
        </form>
        <Select
          value={scope}
          onChange={event => {
            setScope(event.target.value as AssignedTicketScope)
            setStatus(undefined)
            setPage(1)
          }}
        >
          {SCOPES.map(item => (
            <option key={item} value={item}>{t(`scope.${item}`)}</option>
          ))}
        </Select>
        <Select
          value={status ?? ''}
          onChange={event => {
            setStatus((event.target.value || undefined) as TicketStatus | undefined)
            setPage(1)
          }}
        >
          <option value="">{tList('allStatuses')}</option>
          {(Object.keys(TICKET_STATUS_LABEL) as TicketStatus[]).map(item => (
            <option key={item} value={item}>{tStatus(item)}</option>
          ))}
        </Select>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-background">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-border bg-muted/30 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">{tList('colTicket')}</th>
              <th className="px-4 py-3 font-medium">{tList('colRequester')}</th>
              <th className="px-4 py-3 font-medium">{tList('colTaxonomy')}</th>
              {requestType === 'External' && <th className="px-4 py-3 font-medium">{t('colLocation')}</th>}
              <th className="px-4 py-3 font-medium">{tList('colStatus')}</th>
              <th className="px-4 py-3 font-medium">{t('colAssignedAt')}</th>
              <th className="w-32 px-4 py-3 font-medium">{tList('colManage')}</th>
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
                  {t(`empty.${scope}`)}
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
                    {tPriority(ticket.priority)}
                  </span>
                  {/* งานที่ถูกดึงเข้าร่วมทีม ไม่ใช่งานที่ตัวเองเป็นเจ้าภาพ */}
                  {ticket.memberRole === 'Member' && (
                    <Badge variant="secondary" className="ml-1.5">{t('member')}</Badge>
                  )}
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
                      {ticket.requester.type === 'External' ? tList('external') : tList('internal')}
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
                  <Badge variant={statusVariant(ticket.status)}>{tStatus(ticket.status)}</Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{shortDateTime(ticket.assignedAt)}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/tickets/${ticket.id}`}
                    className={`inline-flex h-8 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ${
                      scope === 'History'
                        ? 'border border-border bg-background hover:bg-muted'
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
        <span>{tList('range', { from: firstItem, to: lastItem, total: totalCount })}</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(current => Math.max(1, current - 1))}
          >
            <ChevronLeft className="h-4 w-4" /> {tList('prev')}
          </Button>
          <span>{tList('pageOf', { page, total: totalPages })}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(current => current + 1)}
          >
            {tList('next')} <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
