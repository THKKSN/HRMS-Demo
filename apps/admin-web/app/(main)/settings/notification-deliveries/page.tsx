'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
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
import { usePermissionGate } from '@/hooks/use-permission-gate'
import * as fmt from '@hrms/i18n/format'

const PAGE_SIZE = 20

// ป้ายสถานะอยู่ที่ `admin.settings.notifications.status.*` — ที่นี่เหลือแค่โทนสี
const STATUSES: NotificationDeliveryStatus[] = ['Pending', 'Processing', 'Sent', 'Failed', 'DeadLetter']

const STATUS_TONE: Record<NotificationDeliveryStatus, string> = {
  Pending: 'bg-amber-100 text-amber-800',
  Processing: 'bg-sky-100 text-sky-800',
  Sent: 'bg-emerald-100 text-emerald-800',
  Failed: 'bg-red-100 text-red-800',
  DeadLetter: 'bg-zinc-200 text-zinc-800',
}

function deliveryDateTime(value?: string) {
  if (!value) return '-'
  return fmt.formatDateTime(new Date(value), {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  })
}

function StatusBadge({ status }: { status: NotificationDeliveryStatus }) {
  const t = useTranslations('admin.settings.notifications.status')
  return (
    <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${STATUS_TONE[status]}`}>
      {t(status)}
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
  const t = useTranslations('admin.settings.notifications')
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
      {t('retry')}
    </Button>
  )
}

export default function NotificationDeliveriesPage() {
  const t = useTranslations('admin.settings.notifications')
  const tShell = useTranslations('admin.settings.shell')
  const tCommon = useTranslations('common')
  const { has } = usePermissionGate()
  const isAdmin = has('system:manage-notifications', ['Admin'])
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
      toast.success(t('retryQueued'))
    } catch {
      toast.error(t('retryFailed'))
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
        {tShell('noPagePermission')}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start gap-3">
        <BellRing className="mt-1 h-5 w-5 text-primary" />
        <div>
          <h1 className="text-xl font-semibold">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="border-l-4 border-l-amber-400 bg-background px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock3 className="h-4 w-4" /> {t('cardWaitingTitle')}
          </div>
          <p className="mt-1 text-sm font-medium">{t('cardWaitingValue')}</p>
        </div>
        <div className="border-l-4 border-l-red-500 bg-background px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <XCircle className="h-4 w-4" /> {t('cardRetryTitle')}
          </div>
          <p className="mt-1 text-sm font-medium">{t('cardRetryValue')}</p>
        </div>
        <div className="border-l-4 border-l-zinc-500 bg-background px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" /> {t('cardDeadLetterTitle')}
          </div>
          <p className="mt-1 text-sm font-medium">{t('cardDeadLetterValue')}</p>
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
          aria-label={t('filterStatus')}
        >
          <option value="">{t('allStatuses')}</option>
          {STATUSES.map((value) => (
            <option key={value} value={value}>{t(`status.${value}`)}</option>
          ))}
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('searchPlaceholder')}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">{tCommon('action.search')}</Button>
      </form>

      <div className="overflow-hidden border border-border bg-background">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">{t('colStatus')}</th>
                <th className="px-4 py-3 font-medium">{t('colReference')}</th>
                <th className="px-4 py-3 font-medium">{t('colRecipient')}</th>
                <th className="px-4 py-3 font-medium">{t('colAttempts')}</th>
                <th className="px-4 py-3 font-medium">{t('colNextAttempt')}</th>
                <th className="px-4 py-3 font-medium">{t('colLastError')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('colActions')}</th>
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
                  <td className="px-4 py-3 whitespace-nowrap">{deliveryDateTime(item.nextAttemptAt)}</td>
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
                <dt className="text-muted-foreground">{t('colRecipient')}</dt>
                <dd>{item.recipientName}</dd>
                <dt className="text-muted-foreground">{t('colAttemptCount')}</dt>
                <dd>{item.attemptCount}</dd>
                <dt className="text-muted-foreground">{t('colNextAttempt')}</dt>
                <dd>{deliveryDateTime(item.nextAttemptAt)}</dd>
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
            {tCommon('state.loading')}
          </div>
        )}
        {!deliveries.isLoading && (deliveries.data?.items.length ?? 0) === 0 && (
          <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Send className="h-4 w-4" /> {t('empty')}
          </div>
        )}
      </div>

      <footer className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{t('count', { count: deliveries.data?.totalCount ?? 0 })}</span>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
            title={t('prevPage')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-20 text-center">{t('pageOf', { page, total: totalPages })}</span>
          <Button
            size="icon"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((value) => value + 1)}
            title={t('nextPage')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </footer>
    </div>
  )
}
