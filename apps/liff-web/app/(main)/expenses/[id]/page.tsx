'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { ReactNode } from 'react'
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
import type { ExpenseClaimStatus, ExpenseClaimType } from '@hrms/shared-types'
import { useExpense } from '@/hooks/use-expenses'
import { EXPENSE_DOCUMENT_LABEL, isImageAttachmentUrl } from '@/lib/expense-attachments'
import { publicFileUrl } from '@/lib/public-file-url'

const STATUS_LABEL: Record<ExpenseClaimStatus, string> = {
  Draft: 'แบบร่าง',
  Pending: 'รอตรวจ',
  Approved: 'อนุมัติแล้ว',
  Rejected: 'ไม่อนุมัติ',
  Cancelled: 'ยกเลิก',
  Batched: 'เข้ารอบวางบิล',
  Paid: 'จ่ายแล้ว',
}

const STATUS_TONE: Record<ExpenseClaimStatus, string> = {
  Draft: 'border-slate-200 bg-slate-50 text-slate-700',
  Pending: 'border-amber-200 bg-amber-50 text-amber-800',
  Approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Rejected: 'border-red-200 bg-red-50 text-red-700',
  Cancelled: 'border-slate-200 bg-slate-100 text-slate-600',
  Batched: 'border-blue-200 bg-blue-50 text-blue-700',
  Paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

const TYPE_LABEL: Record<ExpenseClaimType, string> = {
  Fuel: 'ค่าน้ำมัน',
  Toll: 'ค่าทางด่วน',
  Parking: 'ค่าจอดรถ',
  Meal: 'ค่าอาหาร',
  Other: 'อื่น ๆ',
}

function formatDate(value?: string) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`))
}

function formatDateTime(value?: string) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function formatMoney(value?: number) {
  if (value == null) return '-'
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
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
  const params = useParams<{ id: string }>()
  const id = params.id
  const { data, isLoading, error } = useExpense(id)

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
          <h1 className="text-base font-semibold">รายละเอียดบิล</h1>
        </div>
        <div className="px-4 py-10 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 font-semibold">ไม่พบรายการ</p>
          <p className="mt-1 text-sm text-muted-foreground">รายการนี้อาจถูกลบหรือคุณไม่มีสิทธิ์ดู</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <div className="bg-[#0f8f72] px-4 pb-5 pt-4 text-white">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-white/75">{TYPE_LABEL[data.type]}</p>
            <h1 className="truncate text-lg font-bold">{data.billNo || 'รายการสร้างบิล'}</h1>
          </div>
          <span className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[data.status]}`}>
            {STATUS_LABEL[data.status]}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-white/15 px-3 py-2">
            <p className="text-[10px] text-white/70">ยอดเงิน</p>
            <p className="text-lg font-bold tabular-nums">{formatMoney(data.amount)}</p>
          </div>
          <div className="rounded-lg bg-white/15 px-3 py-2">
            <p className="text-[10px] text-white/70">วันที่เอกสาร</p>
            <p className="text-sm font-semibold">{formatDate(data.expenseDate)}</p>
          </div>
        </div>

        {data.status === 'Draft' && (
          <Link
            href={`/expenses/${data.id}/edit`}
            className="mt-4 flex h-11 items-center justify-center gap-2 rounded-lg bg-white text-sm font-bold text-[#0f8f72]"
          >
            <Edit3 className="h-4 w-4" />
            แก้ไขแบบร่าง
          </Link>
        )}
      </div>

      <div className="space-y-3 px-4 pt-3">
        {data.status === 'Draft' && (
          <div className="rounded-lg border border-slate-200 bg-background p-3 text-sm text-slate-700 shadow-sm">
            รายการนี้ยังเป็นแบบร่าง สามารถแก้ไขข้อมูลและแนบหลักฐานเพิ่มก่อนส่งเข้าตรวจได้
          </div>
        )}

        <Section title="ข้อมูลบิล" icon={ReceiptText}>
          <InfoRow label="ประเภท" value={TYPE_LABEL[data.type]} />
          <InfoRow label="ร้านค้า / ปั๊มน้ำมัน" value={data.merchantName} />
          <InfoRow label="เลขที่บิล" value={data.billNo} />
          <InfoRow label="TID" value={data.receiptTid} />
          <InfoRow label="BATCH" value={data.receiptBatch} />
          <InfoRow label="MID" value={data.receiptMid} />
          <InfoRow label="TRACE" value={data.receiptTrace} />
          <InfoRow label="วันที่ส่งรายการ" value={formatDateTime(data.createdAt)} />
        </Section>

        <Section title="ข้อมูลรถและงานขนส่ง" icon={Truck}>
          <InfoRow label="พนักงานขับรถ" value={data.driverName} />
          <InfoRow label="เบอร์รถ" value={data.vehicleNo} />
          <InfoRow label="ทะเบียนรถ" value={data.plateNo} />
          <InfoRow label="จำนวนลิตร" value={data.fuelLiters ? `${data.fuelLiters} ลิตร` : undefined} />
          <InfoRow label="เลขที่ใบขนส่ง" value={data.transportNo} />
          <InfoRow label="ต้นทาง / สถานที่" value={data.origin} />
          <InfoRow label="ลูกค้า" value={data.customerName} />
          <InfoRow label="จำนวนเที่ยว" value={data.tripCount ? `${data.tripCount} เที่ยว` : undefined} />
        </Section>

        {data.note && (
          <Section title="หมายเหตุ" icon={FileText}>
            <p className="whitespace-pre-wrap text-sm leading-6">{data.note}</p>
          </Section>
        )}

        <Section title={`หลักฐานแนบ (${data.attachmentFiles.length})`} icon={Paperclip}>
          {data.attachmentFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">ไม่มีหลักฐานแนบ</p>
          ) : (
            <div className="space-y-4">
              {(['PaymentOrder', 'Receipt', 'Other'] as const).map(documentType => {
                const files = data.attachmentFiles.filter(file => file.documentType === documentType)
                if (files.length === 0) return null
                return (
                  <div key={documentType}>
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">{EXPENSE_DOCUMENT_LABEL[documentType]}</p>
                    <div className="grid grid-cols-2 gap-3">
                      {files.map((file, index) => {
                        const href = publicFileUrl(file.url)
                        const label = file.fileName || `${EXPENSE_DOCUMENT_LABEL[file.documentType]} ${index + 1}`
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

        <Section title="การตรวจรายการ" icon={Banknote}>
          <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3">
            <p className="text-sm font-semibold">{STATUS_LABEL[data.status]}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {data.status === 'Draft'
                ? 'ยังไม่ส่งเข้าตรวจ กดแก้ไขแบบร่างแล้วเลือกส่งรายการเมื่อข้อมูลครบ'
                : 'รายการถูกส่งให้ผู้ดูแลตรวจสอบแล้ว หากข้อมูลไม่ครบให้ส่งรายการใหม่พร้อมหลักฐานที่ถูกต้อง'}
            </p>
          </div>
        </Section>
      </div>
    </div>
  )
}
