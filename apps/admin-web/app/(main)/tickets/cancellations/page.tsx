'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Search,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import type { TicketCancellationRequestDto } from '@hrms/shared-types'
import {
  useApproveTicketCancellation,
  usePendingTicketCancellations,
  useRejectTicketCancellation,
} from '@/hooks/use-tickets'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'

const PAGE_SIZE = 10

function thaiDateTime(value: string) {
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function apiMessage(error: unknown) {
  const response = (error as {
    response?: { data?: { message?: string; error?: string; errors?: string[] } }
  })?.response?.data
  return response?.errors?.[0] ?? response?.message ?? response?.error
    ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่'
}

type ReviewState = {
  ticket: TicketCancellationRequestDto
  decision: 'approve' | 'reject'
}

function MobileCancellationCard({
  item,
  onApprove,
  onReject,
}: {
  item: TicketCancellationRequestDto
  onApprove: () => void
  onReject: () => void
}) {
  return (
    <article className="rounded-md border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/tickets/${item.ticketId}`}
            className="text-sm font-semibold text-primary"
          >
            {item.ticketNo}
          </Link>
          <h2 className="mt-1 line-clamp-2 text-sm font-medium">{item.ticketTitle}</h2>
        </div>
        <Badge variant="warning" className="shrink-0">รอพิจารณา</Badge>
      </div>

      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">ผู้แจ้ง</dt>
          <dd className="mt-0.5 font-medium">{item.requestedByEmployeeName}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">ปลายทาง</dt>
          <dd className="mt-0.5">{item.targetCompanyName}</dd>
          <dd className="text-xs text-muted-foreground">{item.targetDepartmentName}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">เหตุผลขอยกเลิก</dt>
          <dd className="mt-1 whitespace-pre-wrap rounded-md bg-muted/50 p-3 leading-6">
            {item.reason}
          </dd>
        </div>
      </dl>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock3 className="h-3.5 w-3.5" /> {thaiDateTime(item.requestedAt)}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4">
        <Button className="w-full" variant="outline" onClick={onReject}>
          <X className="h-4 w-4" /> ไม่อนุมัติ
        </Button>
        <Button className="w-full" onClick={onApprove}>
          <Check className="h-4 w-4" /> อนุมัติ
        </Button>
      </div>
    </article>
  )
}

export default function TicketCancellationsPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [review, setReview] = useState<ReviewState>()
  const [reviewNote, setReviewNote] = useState('')
  const query = usePendingTicketCancellations({
    search: search || undefined,
    page,
    pageSize: PAGE_SIZE,
  })
  const approve = useApproveTicketCancellation(review?.ticket.ticketId ?? '')
  const reject = useRejectTicketCancellation(review?.ticket.ticketId ?? '')
  const totalCount = query.data?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const isReviewing = approve.isPending || reject.isPending

  function openReview(ticket: TicketCancellationRequestDto, decision: 'approve' | 'reject') {
    setReview({ ticket, decision })
    setReviewNote('')
  }

  function closeReview() {
    if (isReviewing) return
    setReview(undefined)
    setReviewNote('')
  }

  async function submitReview() {
    if (!review) return
    if (review.decision === 'reject' && !reviewNote.trim()) {
      toast.error('กรุณาระบุเหตุผลที่ไม่อนุมัติ')
      return
    }

    try {
      const body = {
        reviewNote: reviewNote.trim() || undefined,
        expectedUpdatedAt: review.ticket.ticketUpdatedAt,
      }
      if (review.decision === 'approve') {
        await approve.mutateAsync(body)
        toast.success('อนุมัติการยกเลิก Ticket แล้ว')
      } else {
        await reject.mutateAsync({
          reviewNote: reviewNote.trim(),
          expectedUpdatedAt: review.ticket.ticketUpdatedAt,
        })
        toast.success('ปฏิเสธคำขอยกเลิกแล้ว')
      }
      setReview(undefined)
      setReviewNote('')
    } catch (error) {
      toast.error(apiMessage(error))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">คำขอยกเลิก Ticket</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            พิจารณาคำขอจากผู้แจ้งในแผนกที่คุณดูแล
          </p>
        </div>
        <Badge variant={totalCount > 0 ? 'warning' : 'secondary'}>{totalCount} รายการ</Badge>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <form
          className="relative w-full max-w-md flex-1"
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
            placeholder="เลข Ticket ชื่อเรื่อง หรือชื่อผู้แจ้ง"
            className="pl-9"
          />
        </form>
        <Button className="w-full sm:w-auto" variant="outline" onClick={() => { setSearch(searchInput.trim()); setPage(1) }}>
          ค้นหา
        </Button>
      </div>

      <div className="space-y-3 md:hidden">
        {query.isLoading && Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-64 animate-pulse rounded-md border border-border bg-background" />
        ))}
        {!query.isLoading && query.isError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-10 text-center text-sm text-destructive">
            โหลดคำขอยกเลิกไม่สำเร็จ
          </div>
        )}
        {!query.isLoading && !query.isError && (query.data?.items.length ?? 0) === 0 && (
          <div className="rounded-md border border-border bg-background px-4 py-14 text-center text-sm text-muted-foreground">
            <Ban className="mx-auto mb-3 h-8 w-8 opacity-40" />
            ไม่มีคำขอยกเลิกที่รอพิจารณา
          </div>
        )}
        {query.data?.items.map(item => (
          <MobileCancellationCard
            key={item.id}
            item={item}
            onReject={() => openReview(item, 'reject')}
            onApprove={() => openReview(item, 'approve')}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-md border border-border bg-background md:block">
        <table className="w-full min-w-[1040px] text-sm">
          <thead className="border-b border-border bg-muted/30 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Ticket</th>
              <th className="px-4 py-3 font-medium">ผู้แจ้ง</th>
              <th className="px-4 py-3 font-medium">ปลายทาง</th>
              <th className="px-4 py-3 font-medium">เหตุผลขอยกเลิก</th>
              <th className="px-4 py-3 font-medium">ส่งคำขอเมื่อ</th>
              <th className="px-4 py-3 text-right font-medium">ดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading && Array.from({ length: 5 }).map((_, index) => (
              <tr key={index} className="border-b border-border">
                <td colSpan={6} className="px-4 py-3">
                  <div className="h-6 animate-pulse rounded bg-muted" />
                </td>
              </tr>
            ))}
            {!query.isLoading && query.isError && (
              <tr>
                <td colSpan={6} className="px-4 py-14 text-center text-destructive">
                  โหลดคำขอยกเลิกไม่สำเร็จ
                </td>
              </tr>
            )}
            {!query.isLoading && !query.isError && (query.data?.items.length ?? 0) === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                  <Ban className="mx-auto mb-3 h-8 w-8 opacity-40" />
                  ไม่มีคำขอยกเลิกที่รอพิจารณา
                </td>
              </tr>
            )}
            {query.data?.items.map(item => (
              <tr key={item.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/tickets/${item.ticketId}`} className="font-semibold text-primary hover:underline">
                    {item.ticketNo}
                  </Link>
                  <p className="mt-1 max-w-64 truncate">{item.ticketTitle}</p>
                </td>
                <td className="px-4 py-3">{item.requestedByEmployeeName}</td>
                <td className="px-4 py-3">
                  <p>{item.targetCompanyName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.targetDepartmentName}</p>
                </td>
                <td className="max-w-80 px-4 py-3">
                  <p className="line-clamp-3 whitespace-pre-wrap">{item.reason}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock3 className="h-4 w-4" /> {thaiDateTime(item.requestedAt)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => openReview(item, 'reject')}>
                      <X className="h-4 w-4" /> ไม่อนุมัติ
                    </Button>
                    <Button size="sm" onClick={() => openReview(item, 'approve')}>
                      <Check className="h-4 w-4" /> อนุมัติ
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3 md:border-0 md:pt-0">
        <p className="text-xs text-muted-foreground">หน้า {page} จาก {totalPages}</p>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="outline"
            title="หน้าก่อน"
            disabled={page <= 1}
            onClick={() => setPage(value => value - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            title="หน้าถัดไป"
            disabled={page >= totalPages}
            onClick={() => setPage(value => value + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Modal
        open={!!review}
        onClose={closeReview}
        title={review?.decision === 'approve' ? 'อนุมัติการยกเลิก' : 'ไม่อนุมัติการยกเลิก'}
      >
        {review && (
          <div className="space-y-4">
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-semibold">{review.ticket.ticketNo} · {review.ticket.ticketTitle}</p>
              <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{review.ticket.reason}</p>
            </div>
            {review.decision === 'approve' && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                เมื่ออนุมัติ ระบบจะเปลี่ยน Ticket เป็นยกเลิกและปิดการมอบหมายที่กำลังทำงานอยู่
              </div>
            )}
            <label className="block text-sm font-medium">
              {review.decision === 'reject' ? 'เหตุผลที่ไม่อนุมัติ' : 'หมายเหตุ (ถ้ามี)'}
              <textarea
                rows={4}
                maxLength={1000}
                value={reviewNote}
                onChange={event => setReviewNote(event.target.value)}
                className="mt-2 w-full resize-none rounded-md border border-border bg-background p-3 outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
              <Button className="w-full sm:w-auto" variant="outline" disabled={isReviewing} onClick={closeReview}>กลับ</Button>
              <Button
                className="w-full sm:w-auto"
                variant={review.decision === 'approve' ? 'default' : 'destructive'}
                loading={isReviewing}
                onClick={submitReview}
              >
                {review.decision === 'approve' ? 'ยืนยันอนุมัติ' : 'ยืนยันไม่อนุมัติ'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
