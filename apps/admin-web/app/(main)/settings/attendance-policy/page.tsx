'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Plus, Pencil, Save, X,
  ShieldAlert, ShieldCheck, ShieldX, TriangleAlert,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useCompanies } from '@/hooks/use-companies'
import {
  useAttendancePolicy,
  useUpsertAttendancePolicy,
  useAttendanceViolations,
} from '@/hooks/use-attendance-policy'
import type { CompanyTreeDto, AttendanceMonthlyViolationDto } from '@hrms/shared-types'

// ── helpers ───────────────────────────────────────────────────────────────────

function flattenCompanies(nodes: CompanyTreeDto[]): CompanyTreeDto[] {
  return nodes.flatMap((n) => [n, ...flattenCompanies(n.children)])
}

const MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

// ── Schema ────────────────────────────────────────────────────────────────────

const policySchema = z.object({
  maxLateMinutesPerMonth: z.number().int().min(0, 'ต้องไม่ติดลบ').max(1440, 'ไม่เกิน 1440 นาที'),
  maxLateCountPerMonth: z.number().int().min(0, 'ต้องไม่ติดลบ').max(31, 'ไม่เกิน 31 ครั้ง'),
  maxAbsenceCountPerMonth: z.number().int().min(0, 'ต้องไม่ติดลบ').max(31, 'ไม่เกิน 31 ครั้ง'),
})
type PolicyValues = z.infer<typeof policySchema>

// ── Policy Form Modal ─────────────────────────────────────────────────────────

function PolicyModal({
  open,
  onClose,
  companyId,
  defaultValues,
}: {
  open: boolean
  onClose: () => void
  companyId: string
  defaultValues: PolicyValues
}) {
  const upsert = useUpsertAttendancePolicy(companyId)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PolicyValues>({
    resolver: zodResolver(policySchema),
    defaultValues,
  })

  useEffect(() => {
    if (open) reset(defaultValues)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (values: PolicyValues) => {
    try {
      await upsert.mutateAsync({ companyId, ...values })
      toast.success('บันทึกกฎการเข้างานแล้ว')
      onClose()
    } catch {
      toast.error('บันทึกไม่สำเร็จ กรุณาลองใหม่')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-2xl bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <ShieldAlert className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-base font-semibold text-foreground">กฎการเข้างานรายเดือน</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-whited hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-5">
          <p className="text-sm text-muted-foreground">
            กำหนดเกณฑ์สายและขาดงาน — ค่า <span className="font-medium text-foreground">0</span> = ไม่จำกัด (ปิดเงื่อนไขนั้น)
          </p>

          <div className="space-y-4">
            {/* นาทีสาย */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                นาทีสายสะสมสูงสุด / เดือน
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={1440}
                  className="w-full rounded-xl border border-border bg-whited px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  {...register('maxLateMinutesPerMonth', { valueAsNumber: true })}
                />
                <span className="shrink-0 text-sm text-muted-foreground w-12">นาที</span>
              </div>
              {errors.maxLateMinutesPerMonth && (
                <p className="text-xs text-destructive">{errors.maxLateMinutesPerMonth.message}</p>
              )}
            </div>

            {/* ครั้งสาย */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                จำนวนครั้งสายสูงสุด / เดือน
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={31}
                  className="w-full rounded-xl border border-border bg-whited px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  {...register('maxLateCountPerMonth', { valueAsNumber: true })}
                />
                <span className="shrink-0 text-sm text-muted-foreground w-12">ครั้ง</span>
              </div>
              {errors.maxLateCountPerMonth && (
                <p className="text-xs text-destructive">{errors.maxLateCountPerMonth.message}</p>
              )}
            </div>

            {/* ครั้งขาด */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                จำนวนครั้งขาดงานสูงสุด / เดือน
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={31}
                  className="w-full rounded-xl border border-border bg-whited px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  {...register('maxAbsenceCountPerMonth', { valueAsNumber: true })}
                />
                <span className="shrink-0 text-sm text-muted-foreground w-12">ครั้ง</span>
              </div>
              {errors.maxAbsenceCountPerMonth && (
                <p className="text-xs text-destructive">{errors.maxAbsenceCountPerMonth.message}</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-whited transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={upsert.isPending}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Save className="h-4 w-4" />
              {upsert.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Policy Card ───────────────────────────────────────────────────────────────

function PolicyCard({ companyId }: { companyId: string }) {
  const { data: policy, isLoading } = useAttendancePolicy(companyId)
  const [modalOpen, setModalOpen] = useState(false)

  if (isLoading) {
    return <div className="h-36 animate-pulse rounded-2xl bg-whited" />
  }

  const modalDefaults: PolicyValues = policy
    ? {
        maxLateMinutesPerMonth: policy.maxLateMinutesPerMonth,
        maxLateCountPerMonth: policy.maxLateCountPerMonth,
        maxAbsenceCountPerMonth: policy.maxAbsenceCountPerMonth,
      }
    : { maxLateMinutesPerMonth: 90, maxLateCountPerMonth: 10, maxAbsenceCountPerMonth: 3 }

  return (
    <>
      {policy ? (
        /* มี policy แล้ว — แสดง summary card */
        <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <ShieldAlert className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">กฎการเข้างานรายเดือน</h2>
                <p className="text-xs text-muted-foreground">ค่า 0 = ไม่จำกัด</p>
              </div>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-whited hover:text-foreground transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              แก้ไข
            </button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-whited/60 p-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {policy.maxLateMinutesPerMonth === 0 ? '∞' : policy.maxLateMinutesPerMonth}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">นาทีสาย / เดือน</p>
            </div>
            <div className="rounded-xl bg-whited/60 p-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {policy.maxLateCountPerMonth === 0 ? '∞' : policy.maxLateCountPerMonth}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">ครั้งสาย / เดือน</p>
            </div>
            <div className="rounded-xl bg-whited/60 p-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {policy.maxAbsenceCountPerMonth === 0 ? '∞' : policy.maxAbsenceCountPerMonth}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">ครั้งขาด / เดือน</p>
            </div>
          </div>
        </div>
      ) : (
        /* ยังไม่มี policy — empty state */
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-background py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-whited">
            <ShieldAlert className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="mt-4 font-semibold text-foreground">ยังไม่มีกฎการเข้างาน</p>
          <p className="mt-1 text-sm text-muted-foreground">
            กำหนดเกณฑ์สายและขาดงานรายเดือนสำหรับบริษัทนี้
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-5 flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            เพิ่มกฎการเข้างาน
          </button>
        </div>
      )}

      <PolicyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        companyId={companyId}
        defaultValues={modalDefaults}
      />
    </>
  )
}

// ── Violations Table ──────────────────────────────────────────────────────────

function ViolationRow({ item }: { item: AttendanceMonthlyViolationDto }) {
  return (
    <tr className="border-b border-border last:border-0 hover:bg-whited/40 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {item.isViolated
            ? <ShieldX className="h-4 w-4 shrink-0 text-destructive" />
            : <ShieldCheck className="h-4 w-4 shrink-0 text-green-500" />}
          <span className="text-sm font-medium text-foreground">{item.employeeName}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-center text-sm">
        <span className={item.isLateCountViolated ? 'font-semibold text-destructive' : 'text-foreground'}>
          {item.totalLateCount}
        </span>
        {item.isLateCountViolated && <TriangleAlert className="ml-1 inline h-3.5 w-3.5 text-destructive" />}
      </td>
      <td className="px-4 py-3 text-center text-sm">
        <span className={item.isLateMinutesViolated ? 'font-semibold text-destructive' : 'text-foreground'}>
          {item.totalLateMinutes}
        </span>
        {item.isLateMinutesViolated && <TriangleAlert className="ml-1 inline h-3.5 w-3.5 text-destructive" />}
      </td>
      <td className="px-4 py-3 text-center text-sm">
        <span className={item.isAbsenceViolated ? 'font-semibold text-destructive' : 'text-foreground'}>
          {item.totalAbsenceCount}
        </span>
        {item.isAbsenceViolated && <TriangleAlert className="ml-1 inline h-3.5 w-3.5 text-destructive" />}
      </td>
      <td className="px-4 py-3 text-center">
        {item.isViolated ? (
          <span className="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
            ละเมิด
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600">
            ปกติ
          </span>
        )}
      </td>
    </tr>
  )
}

function ViolationsTable({ companyId }: { companyId: string }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data, isLoading } = useAttendanceViolations(companyId, year, month)
  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i)

  return (
    <div className="rounded-2xl border border-border bg-background shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">รายงานการละเมิดกฎ</h2>
          <p className="text-sm text-muted-foreground">สรุปสถิติสายและขาดงานรายบุคคล</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-whited" />
          ))}
        </div>
      ) : !data?.items.length ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShieldCheck className="h-10 w-10 text-green-500" />
          <p className="mt-3 font-medium text-foreground">ไม่พบข้อมูล</p>
          <p className="mt-1 text-sm text-muted-foreground">ยังไม่มีข้อมูลการเข้างานในเดือนนี้</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-whited/40">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">พนักงาน</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">สาย (ครั้ง)</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">สาย (นาที)</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">ขาด (ครั้ง)</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <ViolationRow key={item.employeeId} item={item} />
              ))}
            </tbody>
          </table>
          <div className="border-t border-border px-5 py-3">
            <p className="text-xs text-muted-foreground">
              ทั้งหมด {data.totalCount} คน ·{' '}
              <span className="font-medium text-destructive">
                ละเมิด {data.items.filter((i) => i.isViolated).length} คน
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AttendancePolicyPage() {
  const employee = useAuthStore((s) => s.employee)
  const { data: companiesTree } = useCompanies()

  const companies = companiesTree ? flattenCompanies(companiesTree) : []
  const defaultCompanyId = employee?.roles[0]?.companyId ?? companies[0]?.id ?? ''
  const [selectedCompanyId, setSelectedCompanyId] = useState('')

  const companyId = selectedCompanyId || defaultCompanyId

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">นโยบายการเข้างาน</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            ตั้งค่าเกณฑ์สายและขาดงานรายเดือนต่อบริษัท
          </p>
        </div>

        {companies.length > 1 && (
          <select
            value={companyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="rounded-xl border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {companyId ? (
        <>
          <PolicyCard companyId={companyId} />
          <ViolationsTable companyId={companyId} />
        </>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-border bg-background text-sm text-muted-foreground">
          กำลังโหลดข้อมูลบริษัท...
        </div>
      )}
    </div>
  )
}
