'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, EyeIcon, Inbox, Search } from 'lucide-react'
import { toast } from 'sonner'
import type { TicketInboxItemDto, TicketPriority, TicketStatus } from '@hrms/shared-types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TicketBoardSummary } from '@/components/tickets/ticket-board-summary'
import { SourceChannelIcon } from '@/components/tickets/source-channel-icon'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useAssignTicket, useTicketAssignmentCandidates, useTicketInbox } from '@/hooks/use-tickets'
import {
  useManagedTicketCategories,
  useManagedTicketTopics,
  useTicketManagementScope,
} from '@/hooks/use-ticket-taxonomy'
import { hasAnyPermission, hasAnyRole } from '@/lib/permission'
import { useAuthStore } from '@/stores/auth.store'

const PAGE_SIZE = 10

const STATUS_LABEL: Record<TicketStatus, string> = {
  AwaitingRequesterConfirmation: 'รอผู้แจ้งตรวจรับ',
  Open: 'เรื่องใหม่',
  Assigned: 'มอบหมายแล้ว',
  InProgress: 'กำลังดำเนินการ',
  WaitingInfo: 'รอข้อมูล',
  Resolved: 'รอตรวจปิด',
  Closed: 'ปิดแล้ว',
  Rejected: 'ปฏิเสธ',
  Cancelled: 'ยกเลิก',
}

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  Low: 'ปกติ',
  Medium: 'กลาง',
  High: 'ด่วน',
  Critical: 'ด่วนมาก',
}

function statusVariant(status: TicketStatus): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' {
  if (status === 'Open' || status === 'WaitingInfo') return 'warning'
  if (status === 'Closed') return 'success'
  if (status === 'Rejected' || status === 'Cancelled') return 'destructive'
  return status === 'Assigned' || status === 'InProgress' ? 'default' : 'secondary'
}

function priorityClass(priority: TicketPriority) {
  if (priority === 'Critical') return 'text-red-700 bg-red-50'
  if (priority === 'High') return 'text-amber-700 bg-amber-50'
  return 'text-muted-foreground bg-muted/50'
}

function thaiDateTime(value: string) {
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

// สถานะที่ backend ยอมให้มอบหมาย/เปลี่ยนผู้รับผิดชอบได้ (ดู AssignTicketCommand)
const ASSIGNABLE_STATUSES: TicketStatus[] = ['Open', 'Assigned', 'InProgress', 'WaitingInfo']

function apiMessage(error: unknown) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message
    ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่'
}

function InlineAssignCell({ ticket }: { ticket: TicketInboxItemDto }) {
  // โหลดรายชื่อ candidate เมื่อผู้ใช้เปิด dropdown เท่านั้น กันยิง API ทุกแถวตอนโหลดหน้า
  const [candidatesEnabled, setCandidatesEnabled] = useState(false)
  const candidatesQuery = useTicketAssignmentCandidates(ticket.id, candidatesEnabled)
  const assign = useAssignTicket(ticket.id)
  const candidates = candidatesQuery.data ?? []

  async function onSelect(employeeId: string) {
    if (!employeeId || employeeId === ticket.currentAssigneeEmployeeId) return
    try {
      await assign.mutateAsync({ assignedToEmployeeId: employeeId })
      toast.success(ticket.currentAssigneeName ? 'เปลี่ยนผู้รับผิดชอบแล้ว' : 'มอบหมายงานแล้ว')
    } catch (error) {
      toast.error(apiMessage(error))
    }
  }

  return (
    <div className="space-y-1">
      <Select
        className="h-8 min-w-44"
        value={ticket.currentAssigneeEmployeeId ?? ''}
        disabled={assign.isPending}
        onFocus={() => setCandidatesEnabled(true)}
        onChange={event => onSelect(event.target.value)}
      >
        <option value="" disabled>
          {assign.isPending ? 'กำลังมอบหมาย...' : '— มอบหมายให้ —'}
        </option>
        {/* ก่อน candidates โหลดเสร็จ ให้มี option ของผู้รับผิดชอบปัจจุบันไว้แสดงค่า */}
        {!candidatesQuery.data && ticket.currentAssigneeEmployeeId && (
          <option value={ticket.currentAssigneeEmployeeId}>{ticket.currentAssigneeName}</option>
        )}
        {candidatesQuery.isLoading && <option disabled>กำลังโหลดรายชื่อ...</option>}
        {candidatesQuery.isError && <option disabled>ไม่มีสิทธิ์มอบหมายงานใบนี้</option>}
        {candidates.map(candidate => (
          <option key={candidate.employeeId} value={candidate.employeeId}>
            {candidate.isRecommended ? 'แนะนำ · ' : ''}{candidate.employeeName}
            {!candidate.isInTargetDepartment && candidate.departmentName ? ` · ${candidate.departmentName}` : ''}
            {' · งานค้าง '}{candidate.activeTicketCount}
          </option>
        ))}
      </Select>
      {ticket.currentAssigneeName ? (
        <p className="text-xs text-muted-foreground">
          มอบหมายโดย {ticket.assignedByEmployeeName ?? 'ระบบอัตโนมัติ'}
          {ticket.assignedAt ? ` · ${thaiDateTime(ticket.assignedAt)}` : ''}
        </p>
      ) : (
        ticket.isAccepted && <p className="text-xs text-muted-foreground">รับเรื่องแล้ว</p>
      )}
    </div>
  )
}

export default function TicketInboxPage() {
  const router = useRouter()
  const employee = useAuthStore((s) => s.employee)
  // gate เดียวกับ backend (GetTicketInboxQuery เช็ค ticket:view-team) — Employee เข้าหน้านี้ไม่ได้
  const permissionCodes = new Set(employee?.permissionCodes ?? [])
  const hasPermissionPayload = Array.isArray(employee?.permissionCodes)
  const canViewInbox =
    hasAnyPermission(permissionCodes, ['ticket:view-team']) ||
    (!hasPermissionPayload && hasAnyRole(employee, ['Admin', 'Hr', 'Supervisor']))

  const [status, setStatus] = useState<TicketStatus | undefined>()
  const [companyId, setCompanyId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [priority, setPriority] = useState<TicketPriority | undefined>()
  const [categoryId, setCategoryId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [requestType, setRequestType] = useState<'Internal' | 'External'>('Internal')
  const [page, setPage] = useState(1)

  const { data: scope } = useTicketManagementScope()
  const departments = useMemo(
    () => scope?.departments.filter(department => !companyId || department.companyId === companyId) ?? [],
    [scope, companyId],
  )
  const { data: categories = [] } = useManagedTicketCategories(companyId, departmentId)
  const { data: topics = [] } = useManagedTicketTopics(companyId, departmentId, categoryId)

  const query = useTicketInbox({
    companyId: companyId || undefined,
    departmentId: departmentId || undefined,
    status,
    priority,
    categoryId: categoryId || undefined,
    topicId: topicId || undefined,
    search: search || undefined,
    requestType,
    page,
    pageSize: PAGE_SIZE,
  })

  useEffect(() => {
    if (!companyId && scope?.companies.length === 1) setCompanyId(scope.companies[0].id)
  }, [scope, companyId])

  useEffect(() => {
    if (companyId && departments.length === 1 && !departmentId) setDepartmentId(departments[0].id)
    if (departmentId && !departments.some(department => department.id === departmentId)) {
      setDepartmentId('')
      setCategoryId('')
      setTopicId('')
    }
  }, [companyId, departmentId, departments])

  useEffect(() => {
    if (employee && !canViewInbox) router.replace('/tickets')
  }, [employee, canViewInbox, router])

  const totalCount = query.data?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const firstItem = totalCount === 0 ? 0 : ((page - 1) * PAGE_SIZE) + 1
  const lastItem = Math.min(page * PAGE_SIZE, totalCount)

  function resetPage() {
    setPage(1)
  }

  if (!employee || !canViewInbox) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">กล่องงานแจ้งเรื่อง</h1>
          <p className="mt-1 text-sm text-muted-foreground">ตรวจสอบ รับเรื่อง และมอบหมายงานของแผนก</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Inbox className="h-4 w-4" />
          {query.data?.totalCount ?? 0} รายการ
        </div>
      </div>

      {/* แยกกล่องงานตามช่องทางแจ้ง — ภายใน (พนักงาน) / ภายนอก (external portal) */}
      <div className="flex gap-1 border-b border-border">
        <Button
          variant={requestType === 'Internal' ? 'default' : 'ghost'}
          onClick={() => { setRequestType('Internal'); resetPage() }}
        >
          ภายใน
        </Button>
        <Button
          variant={requestType === 'External' ? 'default' : 'ghost'}
          onClick={() => { setRequestType('External'); resetPage() }}
        >
          ภายนอก
        </Button>
      </div>

      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Select
          value={companyId}
          onChange={event => {
            setCompanyId(event.target.value)
            setDepartmentId('')
            setCategoryId('')
            setTopicId('')
            resetPage()
          }}
        >
          <option value="">ทุกบริษัท</option>
          {(scope?.companies ?? []).map(company => (
            <option key={company.id} value={company.id}>{company.name}</option>
          ))}
        </Select>
        <Select
          value={departmentId}
          onChange={event => {
            setDepartmentId(event.target.value)
            setCategoryId('')
            setTopicId('')
            resetPage()
          }}
        >
          <option value="">ทุกแผนกที่ดูแล</option>
          {departments.map(department => (
            <option key={department.id} value={department.id}>{department.name}</option>
          ))}
        </Select>
        <Select
          value={status ?? ''}
          onChange={event => {
            setStatus((event.target.value || undefined) as TicketStatus | undefined)
            resetPage()
          }}
        >
          <option value="">ทุกสถานะ</option>
          {(Object.keys(STATUS_LABEL) as TicketStatus[]).map(item => (
            <option key={item} value={item}>{STATUS_LABEL[item]}</option>
          ))}
        </Select>
        <Select value={priority ?? ''} onChange={event => { setPriority((event.target.value || undefined) as TicketPriority | undefined); resetPage() }}>
          <option value="">ทุกความเร่งด่วน</option>
          {(Object.keys(PRIORITY_LABEL) as TicketPriority[]).map(item => (
            <option key={item} value={item}>{PRIORITY_LABEL[item]}</option>
          ))}
        </Select>
        <Select
          value={categoryId}
          disabled={!departmentId}
          onChange={event => { setCategoryId(event.target.value); setTopicId(''); resetPage() }}
        >
          <option value="">ทุกหมวด</option>
          {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
        </Select>
        <Select
          value={topicId}
          disabled={!categoryId}
          onChange={event => { setTopicId(event.target.value); resetPage() }}
        >
          <option value="">ทุกหัวข้อ</option>
          {topics.map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
        </Select>
        <form
          className="relative"
          onSubmit={event => { event.preventDefault(); setSearch(searchInput.trim()); resetPage() }}
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            className="pl-9"
            placeholder="เลข Ticket หรือเรื่อง"
          />
        </form>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-background">
        <table className="w-full min-w-[1120px] text-sm">
          <thead className="border-b border-border bg-muted/30 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Ticket</th>
              <th className="px-4 py-3 font-medium">ผู้แจ้ง</th>
              <th className="px-4 py-3 font-medium text-center">หมวดหมู่</th>
              {requestType === 'External' && <th className="px-4 py-3 font-medium">สถานที่</th>}
              <th className="px-4 py-3 font-medium text-center">การมอบหมาย</th>
              <th className="px-4 py-3 font-medium text-center">สถานะ</th>
              <th className="px-4 py-3 font-medium text-center">เปิดเมื่อ</th>
              <th className="px-4 py-3 font-medium">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading && Array.from({ length: PAGE_SIZE }).map((_, index) => (
              <tr key={index} className="border-b border-border">
                <td colSpan={requestType === 'External' ? 8 : 7} className="px-4 py-3"><div className="h-5 animate-pulse rounded bg-muted" /></td>
              </tr>
            ))}
            {!query.isLoading && (query.data?.items.length ?? 0) === 0 && (
              <tr><td colSpan={requestType === 'External' ? 8 : 7} className="px-4 py-16 text-center text-muted-foreground">ไม่พบใบแจ้งเรื่องในเงื่อนไขที่เลือก</td></tr>
            )}
            {query.data?.items.map(ticket => (
              <tr key={ticket.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3">
                  <p className="flex items-center gap-1.5 font-medium text-primary">
                    {ticket.ticketNo}
                    <SourceChannelIcon channel={ticket.sourceChannel} />
                  </p>
                  {/* title = ชื่อหัวข้อ (subject) — เคส "อื่น ๆ" แสดงข้อความที่ผู้แจ้งระบุแทน */}
                  <p className="mt-1 max-w-72 truncate font-medium">{ticket.otherTopicText ?? ticket.title}</p>
                  <span className={`mt-1 inline-flex rounded px-1.5 py-0.5 text-xs ${priorityClass(ticket.priority)}`}>{PRIORITY_LABEL[ticket.priority]}</span>
                  
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <p>{ticket.requesterName}{ticket.requester.nickname && ` (${ticket.requester.nickname})`}</p>
                    <Badge variant={ticket.requester.type === 'External' ? 'destructive' : 'secondary'}>
                      {ticket.requester.type === 'External' ? 'ภายนอก' : 'ภายใน'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{ticket.sourceDepartmentName ?? '-'}</p>
                </td>
                <td className="px-4 py-3 text-center">
                  <p>{ticket.categoryName ?? ticket.externalTicketCategoryName ?? '-'}</p>
                  {/* หัวข้อ (subject) แสดงเป็น title อยู่แล้ว — บรรทัดนี้เหลือ หมวดย่อย (topic) */}
                  <p className="text-xs text-muted-foreground">
                    {ticket.topicName ?? ticket.externalTicketTopicName ?? '-'}
                  </p>
                </td>
                {requestType === 'External' && (
                  <td className="px-4 py-3 text-muted-foreground">{ticket.locationText ?? ticket.vehicleText ?? '-'}</td>
                )}
                <td className="px-4 py-3">
                  {ASSIGNABLE_STATUSES.includes(ticket.status) ? (
                    <InlineAssignCell ticket={ticket} />
                  ) : ticket.currentAssigneeName ? (
                    <>
                      <p className="font-medium">{ticket.currentAssigneeName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        มอบหมายโดย {ticket.assignedByEmployeeName ?? 'ระบบอัตโนมัติ'}
                      </p>
                      {ticket.assignedAt && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{thaiDateTime(ticket.assignedAt)}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-amber-700">ยังไม่มอบหมาย</span>
                      {ticket.isAccepted && <p className="text-xs text-muted-foreground">รับเรื่องแล้ว</p>}
                    </>
                  )}
                </td>
                <td className="px-4 py-3 flex-col justify-items-center text-center"><Badge variant={statusVariant(ticket.status)}>{STATUS_LABEL[ticket.status]}</Badge>
                  <TicketBoardSummary
                    compact
                    workflowCurrentStepLabel={ticket.workflowCurrentStepLabel}
                    currentWorkState={ticket.currentWorkState}
                    currentBlockerReason={ticket.currentBlockerReason}
                    currentNextAction={ticket.currentNextAction}
                  /></td>
                <td className="px-4 py-3 text-muted-foreground text-center">{thaiDateTime(ticket.createdAt)}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/tickets/${ticket.id}`}
                    title="ดูรายละเอียด"
                    className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-sm text-muted-foreground hover:bg-muted/80"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          แสดง {firstItem}–{lastItem} จาก {totalCount} รายการ · หน้า {page} จาก {totalPages}
        </p>
        <div className="flex gap-1">
          <Button size="icon" variant="outline" disabled={page <= 1} onClick={() => setPage(value => value - 1)} title="หน้าก่อน">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" disabled={page >= totalPages} onClick={() => setPage(value => value + 1)} title="หน้าถัดไป">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
