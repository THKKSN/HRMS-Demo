'use client'

import { useState } from 'react'
import {
  AlertTriangle, BellRing, ChevronLeft, ChevronRight,
  Clock3, RefreshCw, Search, Send, XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  useNotificationDeliveries,
  useRetryNotificationDelivery,
} from '@/hooks/use-notification-deliveries'
import type {
  NotificationDeliveryDto,
  NotificationDeliveryStatus,
} from '@/lib/notification-deliveries.api'
import { useAuthStore } from '@/stores/auth.store'

const PAGE_SIZE = 20
const statusConfig: Record<NotificationDeliveryStatus, {
  label: string
  className: string
}> = {
  Pending: { label: 'รอส่ง', className: 'bg-amber-100 text-amber-800' },
  Processing: { label: 'กำลังส่ง', className: 'bg-sky-100 text-sky-800' },
  Sent: { label: 'ส่งแล้ว', className: 'bg-emerald-100 text-emerald-800' },
  Failed: { label: 'ส่งไม่สำเร็จ', className: 'bg-red-100 text-red-800' },
  DeadLetter: { label: 'หยุดส่ง', className: 'bg-zinc-200 text-zinc-800' },
}

function thaiDateTime(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  })
}

function StatusBadge({ status }: { status: NotificationDeliveryStatus }) {
  const config = statusConfig[status]
  return (
    <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

function DeliveryActions({
  item,
  retrying,
  onRetry,
}: {
  item: NotificationDeliveryDto
  retrying: boolean
  onRetry: (id: string) => void
}) {
  const canRetry = item.status === 'Failed' || item.status === 'DeadLetter'
  if (!canRetry) return <span className="text-xs text-muted-foreground">-</span>
  return (
    <Button
      variant="outline"
      size="sm"
      loading={retrying}
      onClick={() => onRetry(item.id)}
    >
      <RefreshCw className="h-4 w-4" />
      ส่งใหม่
    </Button>
  )
}

export default function NotificationDeliveriesPage() {
  const employee = useAuthStore((state) => state.employee)
  const isAdmin = employee?.roles.some((role) => role.role === 'Admin') ?? false
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<NotificationDeliveryStatus | ''>('')
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const deliveries = useNotificationDeliveries({
    status: status || undefined,
    search: appliedSearch || undefined,
    page,
    pageSize: PAGE_SIZE,
  })
  const retry = useRetryNotificationDelivery()
  const totalPages = Math.max(
    1, Math.ceil((deliveries.data?.totalCount ?? 0) / PAGE_SIZE))

  const handleRetry = async (id: string) => {
    try {
      await retry.mutateAsync(id)
      toast.success('นำรายการกลับเข้าคิวส่งแล้ว')
    } catch {
      toast.error('ไม่สามารถนำรายการกลับเข้าคิวได้')
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
        คุณไม่มีสิทธิ์เข้าถึงหน้านี้
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start gap-3">
        <BellRing className="mt-1 h-5 w-5 text-primary" />
        <div>
          <h1 className="text-xl font-semibold">การแจ้งเตือน</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ตรวจสอบคิว LINE และนำรายการที่ส่งไม่สำเร็จกลับเข้าคิว
          </p>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="border-l-4 border-l-amber-400 bg-background px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock3 className="h-4 w-4" /> รอระบบดำเนินการ
          </div>
          <p className="mt-1 text-sm font-medium">Pending / Processing</p>
        </div>
        <div className="border-l-4 border-l-red-500 bg-background px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <XCircle className="h-4 w-4" /> รอส่งซ้ำอัตโนมัติ
          </div>
          <p className="mt-1 text-sm font-medium">Failed สูงสุด 5 ครั้ง</p>
        </div>
        <div className="border-l-4 border-l-zinc-500 bg-background px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" /> ต้องตรวจสอบ
          </div>
          <p className="mt-1 text-sm font-medium">Dead Letter</p>
        </div>
      </div>

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault()
          setPage(1)
          setAppliedSearch(search.trim())
        }}
      >
        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as NotificationDeliveryStatus | '')
            setPage(1)
          }}
          className="sm:w-48"
          aria-label="กรองสถานะ"
        >
          <option value="">ทุกสถานะ</option>
          {Object.entries(statusConfig).map(([value, config]) => (
            <option key={value} value={value}>{config.label}</option>
          ))}
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหา Ticket, Event หรือผู้รับ"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">ค้นหา</Button>
      </form>

      <div className="overflow-hidden border border-border bg-background">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">สถานะ</th>
                <th className="px-4 py-3 font-medium">Ticket / Event</th>
                <th className="px-4 py-3 font-medium">ผู้รับ</th>
                <th className="px-4 py-3 font-medium">ครั้ง</th>
                <th className="px-4 py-3 font-medium">ส่งครั้งถัดไป</th>
                <th className="px-4 py-3 font-medium">ข้อผิดพลาดล่าสุด</th>
                <th className="px-4 py-3 text-right font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {deliveries.data?.items.map((item) => (
                <tr key={item.id} className="align-top hover:bg-muted/20">
                  <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{item.entityReference ?? item.entityId}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.eventType}</p>
                  </td>
                  <td className="px-4 py-3">{item.recipientName}</td>
                  <td className="px-4 py-3 tabular-nums">{item.attemptCount}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{thaiDateTime(item.nextAttemptAt)}</td>
                  <td className="max-w-xs px-4 py-3 text-xs text-red-700">
                    <span className="line-clamp-3">{item.lastError ?? '-'}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DeliveryActions
                      item={item}
                      retrying={retry.isPending && retry.variables === item.id}
                      onRetry={handleRetry}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-border md:hidden">
          {deliveries.data?.items.map((item) => (
            <div key={item.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item.entityReference ?? item.entityId}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.eventType}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <dl className="grid grid-cols-[7rem_1fr] gap-y-1 text-sm">
                <dt className="text-muted-foreground">ผู้รับ</dt>
                <dd>{item.recipientName}</dd>
                <dt className="text-muted-foreground">จำนวนครั้ง</dt>
                <dd>{item.attemptCount}</dd>
                <dt className="text-muted-foreground">ส่งครั้งถัดไป</dt>
                <dd>{thaiDateTime(item.nextAttemptAt)}</dd>
              </dl>
              {item.lastError && (
                <p className="break-words border-l-2 border-l-red-500 pl-3 text-xs text-red-700">
                  {item.lastError}
                </p>
              )}
              <DeliveryActions
                item={item}
                retrying={retry.isPending && retry.variables === item.id}
                onRetry={handleRetry}
              />
            </div>
          ))}
        </div>

        {deliveries.isLoading && (
          <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
            กำลังโหลดข้อมูล...
          </div>
        )}
        {!deliveries.isLoading && (deliveries.data?.items.length ?? 0) === 0 && (
          <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Send className="h-4 w-4" /> ไม่พบรายการแจ้งเตือน
          </div>
        )}
      </div>

      <footer className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{deliveries.data?.totalCount ?? 0} รายการ</span>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
            title="หน้าก่อนหน้า"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-20 text-center">หน้า {page} / {totalPages}</span>
          <Button
            size="icon"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((value) => value + 1)}
            title="หน้าถัดไป"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </footer>
    </div>
  )
}
