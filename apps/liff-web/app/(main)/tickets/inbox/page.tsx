'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight, Clock3, Inbox, MapPin, Search, UserRound } from 'lucide-react'
import type { TicketInboxItemDto, TicketPriority, TicketStatus } from '@hrms/shared-types'
import { PageHeader } from '@/components/layout/page-header'
import { SourceChannelIcon } from '@/components/tickets/source-channel-icon'
import { TicketBoardSummary } from '@/components/tickets/ticket-board-summary'
import { TicketListTabs } from '@/components/tickets/ticket-list-tabs'
import { useFmt } from '@/hooks/use-fmt'
import { useTicketInbox } from '@/hooks/use-tickets'
import { hasPermission } from '@/lib/auth-utils'
import { TICKET_STATUS_CLASS, TICKET_STATUS_LABEL } from '@/lib/ticket-status'
import { useAuthStore } from '@/stores/auth.store'

const PAGE_SIZE = 10
const STATUSES = Object.keys(TICKET_STATUS_LABEL) as TicketStatus[]
const PRIORITIES: TicketPriority[] = ['Low', 'Medium', 'High', 'Critical']

function priorityClass(priority: TicketPriority) {
  if (priority === 'Critical') return 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-200'
  if (priority === 'High') return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200'
  return 'bg-muted text-muted-foreground'
}

function TicketInboxCard({ ticket }: { ticket: TicketInboxItemDto }) {
  const t = useTranslations('liff.ticket.list.queue')
  const tStatus = useTranslations('status.ticket')
  const tPriority = useTranslations('status.ticketPriority')
  const fmt = useFmt()
  const assignmentLabel = ticket.currentAssigneeName
    ? t('assignedTo', { name: ticket.currentAssigneeName })
    : ticket.isAccepted
      ? t('acceptedAwaitingAssign')
      : t('awaitingAccept')

  return (
    <Link
      href={`/tickets/${ticket.id}`}
      className="block rounded-lg border border-border bg-background p-4 active:bg-muted"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            {ticket.ticketNo}
            <SourceChannelIcon channel={ticket.sourceChannel} className="h-3.5 w-3.5 shrink-0" />
          </p>
          {/* title = ชื่อหัวข้อ (subject) — เคส "อื่น ๆ" แสดงข้อความที่ผู้แจ้งระบุแทน */}
          <h2 className="mt-1 line-clamp-2 text-sm font-semibold leading-5">{ticket.otherTopicText ?? ticket.title}</h2>
        </div>
        <span className={`shrink-0 rounded px-2 py-1 text-[10px] font-semibold ${priorityClass(ticket.priority)}`}>
          {tPriority(ticket.priority)}
        </span>
      </div>

      {/* หัวข้อ (subject) แสดงเป็น title อยู่แล้ว — บรรทัดนี้เหลือ หมวด / หมวดย่อย (snapshot ไทยจาก API ดูแผน Phase 1) */}
      <p className="mt-2 text-xs text-muted-foreground">
        {ticket.categoryName ?? ticket.externalTicketCategoryName ?? '-'} /{' '}
        {ticket.topicName ?? ticket.externalTicketTopicName ?? '-'}
      </p>

      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5">
          <UserRound className="h-3.5 w-3.5" />
          {t('requester', { name: ticket.requesterName })}{ticket.requester.nickname && ` (${ticket.requester.nickname})`}
          {ticket.sourceDepartmentName ? ` · ${ticket.sourceDepartmentName}` : ''}
        </p>
        <p className="line-clamp-1">{[ticket.targetCompanyName, ticket.targetDepartmentName].filter(Boolean).join(' · ')}</p>
        {(ticket.locationText || ticket.vehicleText) && (
          <p className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {[ticket.locationText, ticket.vehicleText].filter(Boolean).join(' · ')}
          </p>
        )}
        <p className="flex items-center gap-1.5">
          <Clock3 className="h-3.5 w-3.5" />
          {t('reportedAt', { time: fmt.formatDateTime(new Date(ticket.createdAt), { dateStyle: 'short', timeStyle: 'short' }) })}
        </p>
      </div>

      <TicketBoardSummary
        workflowCurrentStepLabel={ticket.workflowCurrentStepLabel}
        currentWorkState={ticket.currentWorkState}
        currentBlockerReason={ticket.currentBlockerReason}
        currentNextAction={ticket.currentNextAction}
      />

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
        <span className="min-w-0 truncate text-xs text-muted-foreground">{assignmentLabel}</span>
        <span className={`shrink-0 rounded border px-2 py-1 text-[10px] font-semibold ${TICKET_STATUS_CLASS[ticket.status]}`}>
          {tStatus(ticket.status)}
        </span>
      </div>
    </Link>
  )
}

export default function TicketInboxPage() {
  const t = useTranslations('liff.ticket.list')
  const tStatus = useTranslations('status.ticket')
  const tPriority = useTranslations('status.ticketPriority')
  const router = useRouter()
  const employee = useAuthStore(state => state.employee)
  const canViewInbox = hasPermission(employee, 'ticket:view-team', ['Admin', 'Hr', 'Supervisor'])
  const [status, setStatus] = useState<TicketStatus | undefined>()
  const [priority, setPriority] = useState<TicketPriority | undefined>()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [requestType, setRequestType] = useState<'Internal' | 'External'>('Internal')
  const [page, setPage] = useState(1)
  const params = {
    status,
    priority,
    search: search || undefined,
    requestType,
    page,
    pageSize: PAGE_SIZE,
  }
  const query = useTicketInbox(params, canViewInbox)
  const totalCount = query.data?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const firstItem = totalCount === 0 ? 0 : ((page - 1) * PAGE_SIZE) + 1
  const lastItem = Math.min(page * PAGE_SIZE, totalCount)

  useEffect(() => {
    if (employee && !canViewInbox) router.replace('/tickets/my')
  }, [canViewInbox, employee, router])

  if (!canViewInbox) return null

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <PageHeader title={t('inboxTitle')} subtitle={t('count', { count: totalCount })} />
      <TicketListTabs />

      <div className="sticky top-14 z-10 border-b border-border bg-background p-3">
        {/* แยกกล่องงานตามช่องทางแจ้ง — ภายใน (พนักงาน) / ภายนอก (external portal) */}
        <div className="mb-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => { setRequestType('Internal'); setPage(1) }}
            className={`h-9 rounded-md text-sm font-semibold ${requestType === 'Internal' ? 'bg-primary text-primary-foreground' : 'border border-border bg-background text-muted-foreground'}`}
          >
            {t('queue.internal')}
          </button>
          <button
            type="button"
            onClick={() => { setRequestType('External'); setPage(1) }}
            className={`h-9 rounded-md text-sm font-semibold ${requestType === 'External' ? 'bg-primary text-primary-foreground' : 'border border-border bg-background text-muted-foreground'}`}
          >
            {t('queue.external')}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            aria-label={t('queue.ticketStatus')}
            value={status ?? ''}
            onChange={event => {
              setStatus((event.target.value || undefined) as TicketStatus | undefined)
              setPage(1)
            }}
            className="h-10 min-w-0 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="">{t('queue.allStatuses')}</option>
            {STATUSES.map(item => (
              <option key={item} value={item}>{tStatus(item)}</option>
            ))}
          </select>
          <select
            aria-label={t('queue.priority')}
            value={priority ?? ''}
            onChange={event => {
              setPriority((event.target.value || undefined) as TicketPriority | undefined)
              setPage(1)
            }}
            className="h-10 min-w-0 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="">{t('queue.allPriorities')}</option>
            {PRIORITIES.map(item => (
              <option key={item} value={item}>{tPriority(item)}</option>
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
              placeholder={t('searchPlaceholderTeam')}
              className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </form>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {query.isLoading && Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-40 animate-pulse rounded-lg border border-border bg-background" />
        ))}

        {!query.isLoading && (query.data?.items.length ?? 0) === 0 && (
          <div className="flex flex-col items-center py-16 text-center text-muted-foreground">
            <Inbox className="mb-3 h-9 w-9" />
            <p className="text-sm font-medium">{t('queue.inboxEmpty')}</p>
          </div>
        )}

        {query.data?.items.map(ticket => <TicketInboxCard key={ticket.id} ticket={ticket} />)}

        <div className="flex items-center justify-between border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            {t('rangeOf', { from: firstItem, to: lastItem, total: totalCount, page, totalPages })}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              title={t('prevPage')}
              disabled={page <= 1}
              onClick={() => setPage(value => value - 1)}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              title={t('nextPage')}
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
