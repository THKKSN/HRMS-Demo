'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight, ClipboardList, Loader2, Plus } from 'lucide-react'
import { TICKET_STATUS_CLASS, TICKET_STATUS_LABEL } from '@/lib/ticket-status'
import { formatDateShort } from '@/lib/utils'
import { useExternalMyTickets } from '@/hooks/use-external-tickets'
import { useExternalAuthStore } from '@/stores/external-auth.store'

export default function ExternalHomePage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useExternalMyTickets(page)
  const reporter = useExternalAuthStore(s => s.reporter)

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1

  return (
    <div className="min-h-screen bg-[#eef7f3]">
      <div className="bg-[#0f8f72] px-4 pb-6 pt-5 text-white">
        <h1 className="text-lg font-bold">แจ้งเรื่อง (บุคคลภายนอก)</h1>
        <p className="mt-0.5 text-xs text-white/75">
          สวัสดี {reporter?.fullName ?? reporter?.lineDisplayName ?? ''}
        </p>
      </div>

      <div className="space-y-4 px-4 pt-4 pb-8">
        <Link
          href="/external/new"
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#0f8f72] text-sm font-bold text-white shadow-lg shadow-emerald-600/20"
        >
          <Plus className="h-4 w-4" /> แจ้งเรื่องใหม่
        </Link>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <ClipboardList className="h-4 w-4 text-[#0f8f72]" /> รายการของฉัน
          </h2>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : isError ? (
            <p className="py-10 text-center text-sm text-red-600">โหลดรายการไม่สำเร็จ กรุณาลองใหม่</p>
          ) : !data || data.items.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">ยังไม่มีใบแจ้งเรื่อง</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.items.map(ticket => (
                <Link
                  key={ticket.id}
                  href={`/external/${ticket.id}`}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-slate-500">{ticket.ticketNo}</p>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${TICKET_STATUS_CLASS[ticket.status]}`}>
                        {TICKET_STATUS_LABEL[ticket.status]}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm font-medium">{ticket.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {[ticket.categoryName, ticket.topicName].filter(Boolean).join(' / ') || '-'}
                      {' · '}{formatDateShort(ticket.createdAt)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                </Link>
              ))}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-3">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    ก่อนหน้า
                  </button>
                  <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    ถัดไป
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
