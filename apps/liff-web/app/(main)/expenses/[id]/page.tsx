'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import {
  Banknote,
  ChevronLeft,
  Edit3,
  ExternalLink,
  FileText,
  type LucideIcon,
  Loader2,
  Paperclip,
  ReceiptText,
  Truck,
} from 'lucide-react'
import type { ExpenseClaimStatus } from '@hrms/shared-types'
import { useExpense } from '@/hooks/use-expenses'
import { useFmt } from '@/hooks/use-fmt'
import { isImageAttachmentUrl } from '@/lib/expense-attachments'
import { publicFileUrl } from '@/lib/public-file-url'

const STATUS_TONE: Record<ExpenseClaimStatus, string> = {
  Draft: 'border-slate-200 bg-slate-50 text-slate-700',
  Pending: 'border-amber-200 bg-amber-50 text-amber-800',
  Approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Rejected: 'border-red-200 bg-red-50 text-red-700',
  Cancelled: 'border-slate-200 bg-slate-100 text-slate-600',
  Batched: 'border-blue-200 bg-blue-50 text-blue-700',
  Paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

function Section({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-background p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2.5 last:border-0">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right text-sm font-medium">{value}</span>
    </div>
  )
}

export default function ExpenseDetailPage() {
  const t = useTranslations('liff.expense.detail')
  const tType = useTranslations('status.expenseType')
  const tStatus = useTranslations('status.expenseClaim')
  const tDoc = useTranslations('status.expenseDocument')
  const fmt = useFmt()
  const params = useParams<{ id: string }>()
  const id = params.id
  const { data, isLoading, error } = useExpense(id)

  const formatDate = (value?: string) =>
    value ? fmt.formatDate(new Date(`${value}T00:00:00`), { dateStyle: 'medium' }) : '-'
  const formatDateTime = (value?: string) => (value ? fmt.formatDateTime(new Date(value)) : '-')
  const formatMoney = (value?: number) => (value == null ? '-' : fmt.formatMoney(value))

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-muted/30 pb-24">
        <div className="flex h-14 items-center gap-2 border-b border-border bg-background px-4">
          <Link href="/expenses" className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-semibold">{t('title')}</h1>
        </div>
        <div className="px-4 py-10 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 font-semibold">{t('notFound')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('notFoundHint')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <div className="bg-[#0f8f72] px-4 pb-5 pt-4 text-white">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-white/75">{tType(data.type)}</p>
            <h1 className="truncate text-lg font-bold">{data.billNo || t('untitled')}</h1>
          </div>
          <span className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[data.status]}`}>
            {tStatus(data.status)}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-white/15 px-3 py-2">
            <p className="text-[10px] text-white/70">{t('amount')}</p>
            <p className="text-lg font-bold tabular-nums">{formatMoney(data.amount)}</p>
          </div>
          <div className="rounded-lg bg-white/15 px-3 py-2">
            <p className="text-[10px] text-white/70">{t('documentDate')}</p>
            <p className="text-sm font-semibold">{formatDate(data.expenseDate)}</p>
          </div>
        </div>

        {data.status === 'Draft' && (
          <Link
            href={`/expenses/${data.id}/edit`}
            className="mt-4 flex h-11 items-center justify-center gap-2 rounded-lg bg-white text-sm font-bold text-[#0f8f72]"
          >
            <Edit3 className="h-4 w-4" />
            {t('editDraft')}
          </Link>
        )}
      </div>

      <div className="space-y-3 px-4 pt-3">
        {data.status === 'Draft' && (
          <div className="rounded-lg border border-slate-200 bg-background p-3 text-sm text-slate-700 shadow-sm">
            {t('draftNotice')}
          </div>
        )}

        <Section title={t('billInfo')} icon={ReceiptText}>
          <InfoRow label={t('type')} value={tType(data.type)} />
          <InfoRow label={t('merchant')} value={data.merchantName} />
          <InfoRow label={t('billNo')} value={data.billNo} />
          <InfoRow label="TID" value={data.receiptTid} />
          <InfoRow label="BATCH" value={data.receiptBatch} />
          <InfoRow label="MID" value={data.receiptMid} />
          <InfoRow label="TRACE" value={data.receiptTrace} />
          <InfoRow label={t('submittedAt')} value={formatDateTime(data.createdAt)} />
        </Section>

        <Section title={t('vehicleInfo')} icon={Truck}>
          <InfoRow label={t('driver')} value={data.driverName} />
          <InfoRow label={t('vehicleNo')} value={data.vehicleNo} />
          <InfoRow label={t('plateNo')} value={data.plateNo} />
          <InfoRow label={t('fuelLiters')} value={data.fuelLiters ? t('liters', { count: data.fuelLiters }) : undefined} />
          <InfoRow label={t('transportNo')} value={data.transportNo} />
          <InfoRow label={t('origin')} value={data.origin} />
          <InfoRow label={t('customer')} value={data.customerName} />
          <InfoRow label={t('tripCount')} value={data.tripCount ? t('trips', { count: data.tripCount }) : undefined} />
        </Section>

        {data.note && (
          <Section title={t('note')} icon={FileText}>
            <p className="whitespace-pre-wrap text-sm leading-6">{data.note}</p>
          </Section>
        )}

        <Section title={t('attachments', { count: data.attachmentFiles.length })} icon={Paperclip}>
          {data.attachmentFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noAttachments')}</p>
          ) : (
            <div className="space-y-4">
              {(['PaymentOrder', 'Receipt', 'Other'] as const).map(documentType => {
                const files = data.attachmentFiles.filter(file => file.documentType === documentType)
                if (files.length === 0) return null
                return (
                  <div key={documentType}>
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">{tDoc(documentType)}</p>
                    <div className="grid grid-cols-2 gap-3">
                      {files.map((file, index) => {
                        const href = publicFileUrl(file.url)
                        const label = file.fileName || `${tDoc(file.documentType)} ${index + 1}`
                        return (
                          <a
                            key={`${file.url}-${index}`}
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className={`${isImageAttachmentUrl(file.url) ? '' : 'col-span-full'} overflow-hidden rounded-lg border border-border bg-whited`}
                          >
                            {isImageAttachmentUrl(file.url) ? (
                              <div className="aspect-square bg-muted">
                                <img src={href} alt={label} loading="lazy" className="h-full w-full object-cover" />
                              </div>
                            ) : (
                              <div className="flex min-h-16 items-center gap-3 p-3">
                                <FileText className="h-5 w-5 shrink-0 text-primary" />
                                <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 border-t border-border px-3 py-2 text-xs">
                              <span className="min-w-0 flex-1 truncate">{label}</span>
                              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            </div>
                          </a>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        <Section title={t('review')} icon={Banknote}>
          <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3">
            <p className="text-sm font-semibold">{tStatus(data.status)}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {data.status === 'Draft' ? t('reviewDraft') : t('reviewSubmitted')}
            </p>
          </div>
        </Section>
      </div>
    </div>
  )
}
