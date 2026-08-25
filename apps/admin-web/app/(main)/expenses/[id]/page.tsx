'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import {
  Banknote,
  CheckCircle2,
  ChevronLeft,
  Eye,
  ExternalLink,
  FileText,
  Loader2,
  Paperclip,
  ReceiptText,
  Truck,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ExpenseAttachmentFileDto, ExpenseClaimStatus, ExpenseClaimType } from '@hrms/shared-types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Textarea } from '@/components/ui/textarea'
import { useApproveExpense, useExpense, useRejectExpense } from '@/hooks/use-expenses'
import { EXPENSE_DOCUMENT_LABEL, isImageAttachmentUrl } from '@/lib/expense-attachments'
import { publicFileUrl } from '@/lib/public-file-url'

const STATUS_LABEL: Record<ExpenseClaimStatus, string> = {
  Draft: 'แบบร่าง',
  Pending: 'รอตรวจ',
  Approved: 'อนุมัติแล้ว',
  Rejected: 'ปฏิเสธ',
  Cancelled: 'ยกเลิก',
  Batched: 'เข้ารอบวางบิล',
  Paid: 'จ่ายแล้ว',
}

const STATUS_VARIANT: Record<ExpenseClaimStatus, 'secondary' | 'warning' | 'success' | 'destructive' | 'outline'> = {
  Draft: 'secondary',
  Pending: 'warning',
  Approved: 'success',
  Rejected: 'destructive',
  Cancelled: 'outline',
  Batched: 'secondary',
  Paid: 'success',
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
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right text-sm font-medium">{value}</span>
    </div>
  )
}

function ReviewModal({
  action,
  onClose,
  onSubmit,
  loading,
}: {
  action: 'approve' | 'reject'
  onClose: () => void
  onSubmit: (comment: string) => void
  loading: boolean
}) {
  const [comment, setComment] = useState('')
  const isApprove = action === 'approve'

  return (
    <Modal open onClose={onClose} title={isApprove ? 'อนุมัติรายการสร้างบิล' : 'ปฏิเสธรายการสร้างบิล'} size="sm">
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">
            {isApprove ? 'ความคิดเห็น (ไม่จำเป็น)' : 'เหตุผลการปฏิเสธ *'}
          </label>
          <Textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={4}
            placeholder={isApprove ? 'ระบุหมายเหตุสำหรับรายการนี้' : 'ระบุเหตุผลให้พนักงานหรือบัญชีตรวจย้อนกลับได้'}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button
            variant={isApprove ? 'default' : 'destructive'}
            loading={loading}
            onClick={() => {
              if (!isApprove && !comment.trim()) {
                toast.error('กรุณาระบุเหตุผลการปฏิเสธ')
                return
              }
              onSubmit(comment.trim())
            }}
          >
            {isApprove ? 'อนุมัติ' : 'ปฏิเสธ'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function ImagePreviewModal({
  file,
  onClose,
}: {
  file: ExpenseAttachmentFileDto
  onClose: () => void
}) {
  const href = publicFileUrl(file.url)
  const label = file.fileName || EXPENSE_DOCUMENT_LABEL[file.documentType]

  return (
    <Modal open onClose={onClose} title={label} size="xl">
      <div className="space-y-3">
        <div className="overflow-hidden rounded-lg border border-border bg-muted">
          <img
            src={href}
            alt={label}
            className="max-h-[72dvh] w-full object-contain"
          />
        </div>
      </div>
    </Modal>
  )
}

export default function AdminExpenseDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const { data, isLoading, error } = useExpense(id)
  const approve = useApproveExpense()
  const reject = useRejectExpense()
  const [modal, setModal] = useState<'approve' | 'reject' | null>(null)
  const [previewFile, setPreviewFile] = useState<ExpenseAttachmentFileDto | null>(null)

  async function submitReview(comment: string) {
    if (!data || !modal) return
    try {
      if (modal === 'approve') {
        await approve.mutateAsync({ id: data.id, comment: comment || undefined })
        toast.success('อนุมัติรายการแล้ว')
      } else {
        await reject.mutateAsync({ id: data.id, comment })
        toast.success('ปฏิเสธรายการแล้ว')
      }
      setModal(null)
    } catch {
      toast.error('ดำเนินการไม่สำเร็จ กรุณาลองใหม่')
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push('/expenses')}>
          <ChevronLeft className="h-4 w-4" /> กลับ
        </Button>
        <div className="rounded-lg border border-border bg-background p-10 text-center text-muted-foreground">
          ไม่พบรายการสร้างบิล
        </div>
      </div>
    )
  }

  const canReview = data.status === 'Pending'
  const reviewLoading = approve.isPending || reject.isPending

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/expenses" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> กลับรายการ
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold">{data.billNo || 'รายการสร้างบิล'}</h1>
            <Badge variant={STATUS_VARIANT[data.status]}>{STATUS_LABEL[data.status]}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.employeeName} · {TYPE_LABEL[data.type]} · ส่งเมื่อ {formatDateTime(data.createdAt)}
          </p>
        </div>

        {canReview && (
          <div className="flex gap-2">
            <Button variant="outline" className="text-red-600" onClick={() => setModal('reject')}>
              <XCircle className="h-4 w-4" /> ปฏิเสธ
            </Button>
            <Button onClick={() => setModal('approve')}>
              <CheckCircle2 className="h-4 w-4" /> อนุมัติ
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Section title="ข้อมูลบิล" icon={ReceiptText}>
            <InfoRow label="พนักงาน" value={data.employeeName} />
            <InfoRow label="ประเภท" value={TYPE_LABEL[data.type]} />
            <InfoRow label="วันที่เอกสาร" value={formatDate(data.expenseDate)} />
            <InfoRow label="ยอดเงิน" value={`${formatMoney(data.amount)} บาท`} />
            <InfoRow label="ร้านค้า / ปั๊มน้ำมัน" value={data.merchantName} />
            <InfoRow label="เลขที่บิล" value={data.billNo} />
            <InfoRow label="TID" value={data.receiptTid} />
            <InfoRow label="BATCH" value={data.receiptBatch} />
            <InfoRow label="MID" value={data.receiptMid} />
            <InfoRow label="TRACE" value={data.receiptTrace} />
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
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Banknote className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">สรุปการตรวจ</h2>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">ยอดเงิน</p>
              <p className="mt-1 text-2xl font-bold">{formatMoney(data.amount)} บาท</p>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
                <span className="text-muted-foreground">สถานะ</span>
                <Badge variant={STATUS_VARIANT[data.status]}>{STATUS_LABEL[data.status]}</Badge>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">หลักฐานแนบ ({data.attachmentFiles.length})</h2>
            </div>
            {data.attachmentFiles.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">ไม่มีหลักฐานแนบ</p>
            ) : (
              <div className="space-y-4">
                {(['PaymentOrder', 'Receipt', 'Other'] as const).map(documentType => {
                  const files = data.attachmentFiles.filter(file => file.documentType === documentType)
                  if (files.length === 0) return null
                  return (
                    <div key={documentType}>
                      <p className="mb-2 text-xs font-semibold text-muted-foreground">{EXPENSE_DOCUMENT_LABEL[documentType]}</p>
                      <div className="grid gap-3">
                        {files.map((file, index) => {
                          const href = publicFileUrl(file.url)
                          const label = file.fileName || `${EXPENSE_DOCUMENT_LABEL[file.documentType]} ${index + 1}`
                          const isImage = isImageAttachmentUrl(file.url)
                          if (isImage) {
                            return (
                              <button
                                key={`${file.url}-${index}`}
                                type="button"
                                onClick={() => setPreviewFile(file)}
                                className="group overflow-hidden rounded-lg border border-border bg-muted/20 text-left transition hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              >
                                <div className="relative aspect-[4/3] bg-muted">
                                  <img src={href} alt={label} loading="lazy" className="h-full w-full object-cover" />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/25 group-hover:opacity-100">
                                    <span className="inline-flex items-center gap-2 rounded-md text-black bg-white px-3 py-2 text-xs font-semibold shadow-sm cursor-pointer">
                                      <Eye className="h-4 w-4" />
                                      ดูรูป
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 border-t border-border px-3 py-2 text-xs">
                                  <span className="min-w-0 flex-1 truncate">{label}</span>
                                  <Eye className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                </div>
                              </button>
                            )
                          }
                          return (
                            <a
                              key={`${file.url}-${index}`}
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              className="overflow-hidden rounded-lg border border-border bg-muted/20"
                            >
                              <div className="flex min-h-20 items-center gap-3 p-3">
                                <FileText className="h-5 w-5 shrink-0 text-primary" />
                                <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
                              </div>
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
          </div>
        </div>
      </div>

      {modal && (
        <ReviewModal
          action={modal}
          loading={reviewLoading}
          onClose={() => setModal(null)}
          onSubmit={submitReview}
        />
      )}

      {previewFile && (
        <ImagePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  )
}
