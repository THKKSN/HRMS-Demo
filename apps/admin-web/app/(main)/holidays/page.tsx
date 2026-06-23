'use client'

import { useState, useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Wand2, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateInput } from '@/components/ui/date-input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import {
  useHolidays,
  useCreateHoliday,
  useUpdateHoliday,
  useToggleHolidayStatus,
  useBulkCreateHolidays,
} from '@/hooks/use-holidays'
import { useHolidaySchedules, usePreviewHolidaysFromSchedule } from '@/hooks/use-holiday-schedules'
import { useCompanies } from '@/hooks/use-companies'
import { useAuthStore } from '@/stores/auth.store'
import type { HolidayDto } from '@/types/admin'
import type { CompanyTreeDto } from '@hrms/shared-types'

function flattenCompanies(nodes: CompanyTreeDto[]): CompanyTreeDto[] {
  return nodes.flatMap((n) => [n, ...flattenCompanies(n.children)])
}

function thaiDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive mt-0.5">{message}</p>
}

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = [
  CURRENT_YEAR - 2,
  CURRENT_YEAR - 1,
  CURRENT_YEAR,
  CURRENT_YEAR + 1,
  CURRENT_YEAR + 2,
]

// ── Create schema ─────────────────────────────────────────────────────────────

const createSchema = z
  .object({
    scope: z.enum(['national', 'company']),
    companyId: z.string().optional(),
    name: z.string().min(1, 'กรุณาระบุชื่อวันหยุด').max(200),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'รูปแบบวันที่ไม่ถูกต้อง'),
  })
  .refine((d) => d.scope === 'national' || !!d.companyId, {
    message: 'กรุณาเลือกบริษัท',
    path: ['companyId'],
  })

type CreateValues = z.infer<typeof createSchema>

// ── Edit schema ───────────────────────────────────────────────────────────────

const editSchema = z.object({
  name: z.string().min(1, 'กรุณาระบุชื่อวันหยุด').max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'รูปแบบวันที่ไม่ถูกต้อง'),
})

type EditValues = z.infer<typeof editSchema>

// ── Create Modal ──────────────────────────────────────────────────────────────

function CreateModal({
  open,
  onClose,
  defaultYear,
  canSeeAll,
  companies,
}: {
  open: boolean
  onClose: () => void
  defaultYear: number
  canSeeAll: boolean
  companies: CompanyTreeDto[]
}) {
  const create = useCreateHoliday()
  const {
    register,
    handleSubmit,
    watch,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      scope: canSeeAll ? 'national' : 'company',
      companyId: '',
      name: '',
      date: `${defaultYear}-01-01`,
    },
  })

  const scope = watch('scope')

  async function onSubmit(values: CreateValues) {
    try {
      await create.mutateAsync({
        companyId: values.scope === 'company' ? values.companyId : undefined,
        name: values.name,
        date: values.date,
      })
      toast.success(`เพิ่มวันหยุด "${values.name}" สำเร็จ`)
      reset()
      onClose()
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data
      if (apiErr?.error === 'DUPLICATE_HOLIDAY')
        toast.error('มีวันหยุดวันนี้ใน scope นี้อยู่แล้ว')
      else toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
      void setError
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="เพิ่มวันหยุดใหม่">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {canSeeAll && (
          <div className="space-y-1.5">
            <Label>ประเภทวันหยุด</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" value="national" {...register('scope')} />
                ทั้งระบบ (วันหยุดนักขัตฤกษ์)
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" value="company" {...register('scope')} />
                เฉพาะบริษัท
              </label>
            </div>
          </div>
        )}

        {scope === 'company' && (
          <div className="space-y-1.5">
            <Label htmlFor="c-company">บริษัท *</Label>
            <select
              id="c-company"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...register('companyId')}
            >
              <option value="">— เลือกบริษัท —</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <FieldError message={errors.companyId?.message} />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="c-name">ชื่อวันหยุด *</Label>
          <Input id="c-name" placeholder="เช่น วันปีใหม่" {...register('name')} />
          <FieldError message={errors.name?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="c-date">วันที่ *</Label>
          <DateInput id="c-date" {...register('date')} />
          <FieldError message={errors.date?.message} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit" loading={isSubmitting}>
            บันทึก
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

function EditModal({ item, onClose }: { item: HolidayDto; onClose: () => void }) {
  const update = useUpdateHoliday()
  const toggle = useToggleHolidayStatus()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: item.name,
      date: item.date,
    },
  })

  async function onSubmit(values: EditValues) {
    try {
      await update.mutateAsync({
        id: item.id,
        name: values.name,
        date: values.date,
        isActive: item.isActive,
      })
      toast.success(`บันทึก "${values.name}" สำเร็จ`)
      onClose()
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data
      if (apiErr?.error === 'DUPLICATE_HOLIDAY')
        toast.error('มีวันหยุดวันนี้ใน scope นี้อยู่แล้ว')
      else toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
    }
  }

  async function handleToggle() {
    try {
      await toggle.mutateAsync({ id: item.id, isActive: !item.isActive })
      toast.success(`${item.isActive ? 'ปิด' : 'เปิด'}ใช้งาน "${item.name}" สำเร็จ`)
      onClose()
    } catch {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
    }
  }

  return (
    <Modal open onClose={onClose} title={`แก้ไขวันหยุด: ${item.name}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label>ขอบเขต</Label>
          <div className="text-sm text-muted-foreground">
            {item.companyId === null ? (
              <span className="inline-flex items-center gap-1.5">
                <Badge variant="outline" className="text-blue-600 border-blue-300">
                  ทั้งระบบ
                </Badge>
                วันหยุดนักขัตฤกษ์ (ไม่สามารถเปลี่ยนได้)
              </span>
            ) : (
              <span>
                เฉพาะบริษัท:{' '}
                <span className="font-medium text-foreground">{item.companyName}</span>{' '}
                (ไม่สามารถเปลี่ยนได้)
              </span>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="e-name">ชื่อวันหยุด *</Label>
          <Input id="e-name" {...register('name')} />
          <FieldError message={errors.name?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="e-date">วันที่ *</Label>
          <DateInput id="e-date" {...register('date')} />
          <FieldError message={errors.date?.message} />
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          <Button
            type="button"
            variant={item.isActive ? 'destructive' : 'outline'}
            onClick={handleToggle}
            loading={toggle.isPending}
          >
            {item.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
              บันทึก
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

// ── Generate From Schedule Wizard ─────────────────────────────────────────────

const DAY_NAMES: Record<number, string> = {
  0: 'อาทิตย์', 1: 'จันทร์', 2: 'อังคาร', 3: 'พุธ',
  4: 'พฤหัสบดี', 5: 'ศุกร์', 6: 'เสาร์',
}

function GenerateFromScheduleModal({
  open,
  onClose,
  defaultYear,
}: {
  open: boolean
  onClose: () => void
  defaultYear: number
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const [scheduleId, setScheduleId] = useState('')
  const [year, setYear] = useState(defaultYear)

  const { data: schedules } = useHolidaySchedules()
  const activeSchedules = schedules?.filter((s) => s.isActive) ?? []

  const [previewEnabled, setPreviewEnabled] = useState(false)
  const { data: previewItems, isLoading: isPreviewing } = usePreviewHolidaysFromSchedule(
    scheduleId, year, previewEnabled,
  )

  const bulkCreate = useBulkCreateHolidays()

  function handlePreview() {
    if (!scheduleId) { toast.error('กรุณาเลือกกฎวันหยุด'); return }
    setPreviewEnabled(true)
    setStep(2)
  }

  async function handleConfirm() {
    if (!previewItems?.length) return
    try {
      const result = await bulkCreate.mutateAsync(previewItems)
      toast.success(`สร้างสำเร็จ ${result.created} รายการ (ข้ามซ้ำ ${result.skipped} รายการ)`)
      handleClose()
    } catch {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
    }
  }

  function handleClose() {
    setStep(1)
    setScheduleId('')
    setPreviewEnabled(false)
    onClose()
  }

  const selectedSchedule = activeSchedules.find((s) => s.id === scheduleId)

  return (
    <Modal open={open} onClose={handleClose} title="สร้างวันหยุดจากกฎ">
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="g-schedule">กฎวันหยุด *</Label>
            <select
              id="g-schedule"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={scheduleId}
              onChange={(e) => { setScheduleId(e.target.value); setPreviewEnabled(false) }}
            >
              <option value="">— เลือกกฎ —</option>
              {activeSchedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({DAY_NAMES[s.dayOfWeek]}{s.companyName ? ` · ${s.companyName}` : ''})
                </option>
              ))}
            </select>
            {activeSchedules.length === 0 && (
              <p className="text-xs text-muted-foreground">
                ยังไม่มีกฎที่ใช้งานอยู่ — สร้างกฎได้ที่หน้า &quot;กฎวันหยุด&quot;
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="g-year">ปี</Label>
            <select
              id="g-year"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={year}
              onChange={(e) => { setYear(Number(e.target.value)); setPreviewEnabled(false) }}
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>{y + 543}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>ยกเลิก</Button>
            <Button type="button" onClick={handlePreview} disabled={!scheduleId}>
              ดูรายการ →
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
            กฎ: <span className="font-medium">{selectedSchedule?.name}</span>
            {' · '}ปี {year + 543}
          </div>

          {isPreviewing && (
            <div className="py-6 text-center text-sm text-muted-foreground animate-pulse">
              กำลังคำนวณรายการ...
            </div>
          )}

          {!isPreviewing && previewItems && (
            <>
              <p className="text-sm text-muted-foreground">
                พบ <span className="font-semibold text-foreground">{previewItems.length}</span> วันหยุด
              </p>
              <div className="max-h-56 overflow-y-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/80">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">วันที่</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">ชื่อวันหยุด</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewItems.map((item) => (
                      <tr key={item.date} className="border-t border-border">
                        <td className="px-3 py-1.5 text-muted-foreground">{thaiDate(item.date)}</td>
                        <td className="px-3 py-1.5">{item.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setStep(1); setPreviewEnabled(false) }}
            >
              <ChevronLeft className="h-4 w-4" />
              ย้อนกลับ
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              loading={bulkCreate.isPending}
              disabled={!previewItems?.length}
            >
              ยืนยันสร้าง {previewItems?.length ?? 0} รายการ
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HolidaysPage() {
  const employee = useAuthStore((s) => s.employee)
  const isAdmin = employee?.roles.some((r) => r.role === 'Admin') ?? false
  const isHr = employee?.roles.some((r) => r.role === 'Hr') ?? false

  const { data: companiesTree } = useCompanies()
  const allCompanies = useMemo(() => flattenCompanies(companiesTree ?? []), [companiesTree])

  const myCompany = allCompanies.find((c) => c.id === employee?.companyId)
  const isHqHr = isHr && (myCompany?.isHeadquarters ?? false)
  const canSeeAll = isAdmin || isHqHr

  const [year, setYear] = useState(CURRENT_YEAR)
  const [companyId, setCompanyId] = useState<string | undefined>(
    canSeeAll ? undefined : (employee?.companyId ?? undefined),
  )
  const [includeInactive, setIncludeInactive] = useState(false)

  const { data: holidays, isLoading } = useHolidays(year, companyId, includeInactive)

  const [createOpen, setCreateOpen] = useState(false)
  const [editItem, setEditItem] = useState<HolidayDto | null>(null)
  const [generateOpen, setGenerateOpen] = useState(false)

  const [searchName, setSearchName] = useState('')
  const [searchDate, setSearchDate] = useState('')
  const [page, setPage] = useState(1)

  const PAGE_SIZE = 20

  const filteredHolidays = useMemo(() => {
    let list = holidays ?? []
    if (searchName.trim()) {
      const q = searchName.trim().toLowerCase()
      list = list.filter((h) => h.name.toLowerCase().includes(q))
    }
    if (searchDate) {
      list = list.filter((h) => h.date === searchDate)
    }
    return list
  }, [holidays, searchName, searchDate])

  const totalPages = Math.max(1, Math.ceil(filteredHolidays.length / PAGE_SIZE))
  const pagedHolidays = filteredHolidays.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => { setPage(1) }, [searchName, searchDate])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">วันหยุด</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setGenerateOpen(true)}>
            <Wand2 className="h-4 w-4" />
            สร้างจากกฎ
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            เพิ่มวันหยุด
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>
              {y + 543}
            </option>
          ))}
        </select>

        {canSeeAll && (
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={companyId ?? ''}
            onChange={(e) => setCompanyId(e.target.value || undefined)}
          >
            <option value="">ทุกบริษัท</option>
            {allCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}

        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded border-border"
          />
          รวมที่ปิดใช้งาน
        </label>

        <Input
          type="text"
          placeholder="ค้นหาชื่อวันหยุด..."
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          className="w-48"
        />

        <DateInput
          value={searchDate}
          onChange={(e) => setSearchDate(e.target.value)}
          className="w-44"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ชื่อวันหยุด</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">วันที่</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">บริษัท</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">สถานะ</th>
              <th className="px-4 py-3 w-12" />
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))}

            {!isLoading && filteredHolidays.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  {holidays?.length === 0
                    ? 'ยังไม่มีวันหยุดในปีนี้ — กด "+ เพิ่มวันหยุด" เพื่อเริ่มต้น'
                    : 'ไม่พบวันหยุดที่ตรงกับเงื่อนไขการค้นหา'}
                </td>
              </tr>
            )}

            {!isLoading &&
              pagedHolidays.map((h) => (
                <tr
                  key={h.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{h.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{thaiDate(h.date)}</td>
                  <td className="px-4 py-3">
                    {h.companyId === null ? (
                      <Badge variant="outline" className="text-blue-600 border-blue-300">
                        ทั้งระบบ
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">{h.companyName}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={h.isActive ? 'success' : 'secondary'}>
                      {h.isActive ? 'ใช้งาน' : 'ปิด'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setEditItem(h)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!isLoading && filteredHolidays.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            แสดง {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredHolidays.length)}{' '}
            จาก {filteredHolidays.length} รายการ
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ก่อนหน้า
            </Button>
            <span className="px-1">
              หน้า {page} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              ถัดไป
            </Button>
          </div>
        </div>
      )}

      <CreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultYear={year}
        canSeeAll={canSeeAll}
        companies={canSeeAll ? allCompanies : allCompanies.filter((c) => c.id === employee?.companyId)}
      />
      {editItem && <EditModal item={editItem} onClose={() => setEditItem(null)} />}
      <GenerateFromScheduleModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        defaultYear={year}
      />
    </div>
  )
}
