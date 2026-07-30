'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Clock, Plus, Pencil, ChevronLeft, ChevronRight,
  Search, RotateCcw, Download, CalendarDays,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DateInput } from '@/components/ui/date-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  useAttendanceRecords,
  useCreateAttendanceRecord,
  useUpdateAttendanceRecord,
} from '@/hooks/use-attendance-hr'
import { useCompanies } from '@/hooks/use-companies'
import { useEmployees } from '@/hooks/use-employees'
import { useExportExcel } from '@/hooks/use-reports'
import { useAuthStore } from '@/stores/auth.store'
import type { AttendanceRecordHrDto, AttendanceStatus, CompanyTreeDto, EmployeeListItemDto } from '@hrms/shared-types'

function flattenCompanies(nodes: CompanyTreeDto[]): { id: string; name: string; isHeadquarters: boolean }[] {
  return nodes.flatMap((n) => [
    { id: n.id, name: n.name, isHeadquarters: n.isHeadquarters },
    ...flattenCompanies(n.children),
  ])
}

// ── helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  Present: 'มาทำงาน',
  Late:    'มาสาย',
  Absent:  'ขาดงาน',
  HalfDay: 'ครึ่งวัน',
}

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  Present: 'bg-emerald-100 text-emerald-700',
  Late:    'bg-amber-100 text-amber-700',
  Absent:  'bg-red-100 text-red-700',
  HalfDay: 'bg-blue-100 text-blue-700',
}

function fmtTime(dt?: string) {
  if (!dt) return '—'
  return new Date(dt).toLocaleTimeString('th-TH', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok',
  })
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit',
  })
}

function fmtDatetime(dt?: string) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('th-TH', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok',
  })
}

// API คืนค่า Thai time string "YYYY-MM-DDTHH:mm:ss..." ตัดแค่ 16 ตัวอักษรแรกให้ datetime-local input
function toLocalDatetimeValue(dt?: string): string {
  if (!dt) return ''
  return dt.substring(0, 16)
}

// ส่งเป็น Thai local time ตรงๆ (ไม่ convert เป็น UTC) เพราะ project เก็บ Thai time ทุกที่
function toThaiTimeString(localDt: string): string | undefined {
  if (!localDt) return undefined
  return localDt.length === 16 ? localDt + ':00' : localDt
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

const editSchema = z.object({
  checkInTime:  z.string().optional(),
  checkOutTime: z.string().optional(),
  isLate:       z.boolean(),
  lateMinutes:  z.number().int().min(0),
  status:       z.enum(['Present', 'Late', 'Absent', 'HalfDay']),
  remark:       z.string().max(500).optional(),
})

type EditValues = z.infer<typeof editSchema>

function EditModal({
  record,
  onClose,
}: {
  record: AttendanceRecordHrDto
  onClose: () => void
}) {
  const update = useUpdateAttendanceRecord()

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      checkInTime:  toLocalDatetimeValue(record.checkInTime),
      checkOutTime: toLocalDatetimeValue(record.checkOutTime),
      isLate:       record.isLate,
      lateMinutes:  record.lateMinutes,
      status:       record.status,
      remark:       record.remark ?? '',
    },
  })

  const isLate = watch('isLate')

  const onSubmit = handleSubmit(async (data) => {
    try {
      await update.mutateAsync({
        id: record.id,
        body: {
          id:           record.id,
          checkInTime:  toThaiTimeString(data.checkInTime ?? ''),
          checkOutTime: toThaiTimeString(data.checkOutTime ?? ''),
          isLate:       data.isLate,
          lateMinutes:  data.lateMinutes,
          status:       data.status,
          remark:       data.remark || undefined,
        },
      })
      toast.success('บันทึกการแก้ไขสำเร็จ')
      onClose()
    } catch {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
    }
  })

  return (
    <Modal open onClose={onClose} title="แก้ไขบันทึกการเข้างาน" size="lg">
      <div className="text-sm text-muted-foreground mb-4">
        <strong className="text-foreground">{record.employeeFullName}</strong>
        {' · '}{record.employeeCode}
        {record.departmentName && <span className="ml-1">· {record.departmentName}</span>}
        {' · '}{fmtDate(record.date)}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>เวลาเข้างาน</Label>
            <div className="relative">
              <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="datetime-local"
                className="pl-8"
                onClick={(e) => { try { (e.currentTarget as HTMLInputElement).showPicker() } catch {} }}
                {...register('checkInTime')}
              />
            </div>
          </div>
          <div>
            <Label>เวลาออกงาน</Label>
            <div className="relative">
              <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="datetime-local"
                className="pl-8"
                onClick={(e) => { try { (e.currentTarget as HTMLInputElement).showPicker() } catch {} }}
                {...register('checkOutTime')}
              />
            </div>
          </div>
        </div>

        <div>
          <Label>สถานะ</Label>
          <Select {...register('status')}>
            <option value="Present">มาทำงาน</option>
            <option value="Late">มาสาย</option>
            <option value="Absent">ขาดงาน</option>
            <option value="HalfDay">ครึ่งวัน</option>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isLate"
            className="h-4 w-4 rounded border-border"
            checked={isLate}
            onChange={(e) => setValue('isLate', e.target.checked)}
          />
          <Label htmlFor="isLate">มาสาย</Label>
          {isLate && (
            <div className="flex items-center gap-2 ml-auto">
              <Label>นาทีที่สาย</Label>
              <Input
                type="number"
                min={0}
                className="w-24"
                {...register('lateMinutes', { valueAsNumber: true })}
              />
            </div>
          )}
        </div>

        <div>
          <Label>หมายเหตุ</Label>
          <Input placeholder="ระบุหมายเหตุ (ถ้ามี)" {...register('remark')} />
          {errors.remark && <p className="text-xs text-destructive mt-0.5">{errors.remark.message}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? 'กำลังบันทึก…' : 'บันทึก'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Create Modal ──────────────────────────────────────────────────────────────

const createSchema = z.object({
  date:         z.string().min(1, 'กรุณาเลือกวันที่'),
  checkInTime:  z.string().optional(),
  checkOutTime: z.string().optional(),
  isLate:       z.boolean(),
  lateMinutes:  z.number().int().min(0),
  status:       z.enum(['Present', 'Late', 'Absent', 'HalfDay']),
  remark:       z.string().max(500).optional(),
})

type CreateValues = z.infer<typeof createSchema>

function CreateModal({
  onClose,
  companiesFlat,
}: {
  onClose: () => void
  companiesFlat: { id: string; name: string; isHeadquarters: boolean }[]
}) {
  const create = useCreateAttendanceRecord()
  const currentEmployee = useAuthStore((s) => s.employee)

  const [empSearch,    setEmpSearch]    = useState('')
  const [selectedEmp,  setSelectedEmp]  = useState<EmployeeListItemDto | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)

  const { data: empResults, isFetching: empLoading } = useEmployees({
    search:   empSearch.trim() || undefined,
    isActive: true,
    pageSize: 10,
  })
  const empList = empResults?.items ?? []

  const companyName = (emp: EmployeeListItemDto) =>
    companiesFlat.find((c) => c.id === emp.companyId)?.name ?? emp.companyId

  // ตรวจสอบสิทธิ์เบื้องต้นบน frontend (backend จะตรวจอีกรอบ)
  const isAdmin   = currentEmployee?.roles.some((r) => r.role === 'Admin') ?? false
  const hrCompanyIds = new Set(
    currentEmployee?.roles.filter((r) => r.role === 'Hr' && r.companyId).map((r) => r.companyId!) ?? []
  )
  const isHqHr = hrCompanyIds.size > 0 &&
    companiesFlat.some((c) => hrCompanyIds.has(c.id) && c.isHeadquarters)

  const accessWarning = selectedEmp && !isAdmin && !isHqHr &&
    !hrCompanyIds.has(selectedEmp.companyId)
    ? 'พนักงานคนนี้อยู่คนละบริษัท อาจไม่มีสิทธิ์บันทึก'
    : null

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { isLate: false, lateMinutes: 0, status: 'Present' },
  })

  const isLate = watch('isLate')

  const onSubmit = handleSubmit(async (data) => {
    if (!selectedEmp) { toast.error('กรุณาเลือกพนักงานก่อน'); return }
    try {
      await create.mutateAsync({
        employeeId:   selectedEmp.id,
        date:         data.date,
        checkInTime:  toThaiTimeString(data.checkInTime ?? ''),
        checkOutTime: toThaiTimeString(data.checkOutTime ?? ''),
        isLate:       data.isLate,
        lateMinutes:  data.lateMinutes,
        status:       data.status,
        remark:       data.remark || undefined,
      })
      toast.success('เพิ่มบันทึกการเข้างานสำเร็จ')
      onClose()
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { error?: string } } }
      if (err?.response?.status === 403) {
        toast.error('ไม่มีสิทธิ์จัดการพนักงานคนนี้')
      } else if (err?.response?.data?.error === 'DUPLICATE_ATTENDANCE_DATE') {
        toast.error('พนักงานมีบันทึกการเข้างานวันนี้แล้ว')
      } else {
        toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
      }
    }
  })

  return (
    <Modal open onClose={onClose} title="เพิ่มบันทึกการเข้างาน" size="lg">
      <form onSubmit={onSubmit} className="space-y-4">

        {/* ── Employee Search ─────────────────────────── */}
        <div>
          <Label>ค้นหาพนักงาน</Label>
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={empSearch}
                  onChange={(e) => { setEmpSearch(e.target.value); setShowDropdown(true); setSelectedEmp(null) }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="ชื่อ หรือ รหัสพนักงาน"
                  className="pl-8"
                  autoComplete="off"
                />
              </div>
              {selectedEmp && (
                <button type="button" onClick={() => { setSelectedEmp(null); setEmpSearch('') }}
                  className="text-xs text-muted-foreground hover:text-destructive shrink-0">
                  ล้าง
                </button>
              )}
            </div>

            {/* Dropdown results */}
            {showDropdown && empSearch.trim().length >= 1 && !selectedEmp && (
              <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg max-h-52 overflow-y-auto">
                {empLoading && (
                  <p className="px-3 py-2 text-sm text-muted-foreground">กำลังค้นหา…</p>
                )}
                {!empLoading && empList.length === 0 && (
                  <p className="px-3 py-2 text-sm text-muted-foreground">ไม่พบพนักงาน</p>
                )}
                {empList.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-whited transition-colors"
                    onMouseDown={(e) => { e.preventDefault(); setSelectedEmp(emp); setEmpSearch(''); setShowDropdown(false) }}
                  >
                    <span className="font-medium">{emp.fullName}</span>
                    <span className="ml-2 text-muted-foreground text-xs">{emp.employeeCode}</span>
                    <span className="ml-2 text-muted-foreground text-xs">· {companyName(emp)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected employee card */}
          {selectedEmp && (
            <div className={`mt-2 rounded-lg border p-3 text-sm ${accessWarning ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' : 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20'}`}>
              <p className="font-semibold text-foreground">{selectedEmp.fullName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{selectedEmp.employeeCode} · {companyName(selectedEmp)}</p>
              {accessWarning && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">⚠ {accessWarning}</p>
              )}
            </div>
          )}
        </div>

        {/* ── Date & Times ───────────────────────────── */}
        <div>
          <Label>วันที่</Label>
          <DateInput {...register('date')} error={!!errors.date} />
          {errors.date && <p className="text-xs text-destructive mt-0.5">{errors.date.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>เวลาเข้างาน</Label>
            <div className="relative">
              <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="datetime-local"
                className="pl-8"
                onClick={(e) => { try { (e.currentTarget as HTMLInputElement).showPicker() } catch {} }}
                {...register('checkInTime')}
              />
            </div>
          </div>
          <div>
            <Label>เวลาออกงาน</Label>
            <div className="relative">
              <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="datetime-local"
                className="pl-8"
                onClick={(e) => { try { (e.currentTarget as HTMLInputElement).showPicker() } catch {} }}
                {...register('checkOutTime')}
              />
            </div>
          </div>
        </div>

        <div>
          <Label>สถานะ</Label>
          <Select {...register('status')}>
            <option value="Present">มาทำงาน</option>
            <option value="Late">มาสาย</option>
            <option value="Absent">ขาดงาน</option>
            <option value="HalfDay">ครึ่งวัน</option>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="createIsLate"
            className="h-4 w-4 rounded border-border"
            checked={isLate}
            onChange={(e) => setValue('isLate', e.target.checked)}
          />
          <Label htmlFor="createIsLate">มาสาย</Label>
          {isLate && (
            <div className="flex items-center gap-2 ml-auto">
              <Label>นาทีที่สาย</Label>
              <Input
                type="number"
                min={0}
                className="w-24"
                {...register('lateMinutes', { valueAsNumber: true })}
              />
            </div>
          )}
        </div>

        <div>
          <Label>หมายเหตุ</Label>
          <Input placeholder="ระบุหมายเหตุ (ถ้ามี)" {...register('remark')} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button type="submit" disabled={create.isPending || !selectedEmp}>
            {create.isPending ? 'กำลังบันทึก…' : 'เพิ่มบันทึก'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Filter Bar ────────────────────────────────────────────────────────────────

type Filters = {
  search: string
  dateFrom: string
  dateTo: string
  status: AttendanceStatus | ''
  companyId: string
}

function FilterBar({
  filters,
  onChange,
  onReset,
  companies,
  showCompany,
}: {
  filters: Filters
  onChange: (f: Partial<Filters>) => void
  onReset: () => void
  companies: { id: string; name: string }[]
  showCompany: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2 items-end">
      {/* ค้นหาชื่อ */}
      <div>
        <Label className="text-xs text-muted-foreground">ค้นหา</Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="ชื่อ หรือ รหัสพนักงาน"
            className="pl-8 w-48"
          />
        </div>
      </div>

      {/* กรอง Company (Admin / HQ HR เท่านั้น) */}
      {showCompany && (
        <div>
          <Label className="text-xs text-muted-foreground">บริษัท</Label>
          <Select
            value={filters.companyId}
            onChange={(e) => onChange({ companyId: e.target.value })}
            className="w-44"
          >
            <option value="">ทั้งหมด</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
      )}

      <div>
        <Label className="text-xs text-muted-foreground">ตั้งแต่</Label>
        <Input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => onChange({ dateFrom: e.target.value })}
          className="w-36"
        />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">ถึง</Label>
        <Input
          type="date"
          value={filters.dateTo}
          onChange={(e) => onChange({ dateTo: e.target.value })}
          className="w-36"
        />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">สถานะ</Label>
        <Select
          value={filters.status}
          onChange={(e) => onChange({ status: e.target.value as AttendanceStatus | '' })}
          className="w-32"
        >
          <option value="">ทั้งหมด</option>
          <option value="Present">มาทำงาน</option>
          <option value="Late">มาสาย</option>
          <option value="Absent">ขาดงาน</option>
          <option value="HalfDay">ครึ่งวัน</option>
        </Select>
      </div>
      <Button variant="outline" size="sm" onClick={onReset} className="self-end">
        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
        รีเซ็ต
      </Button>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const DEFAULT_DATE_FROM = (() => {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
})()
const DEFAULT_DATE_TO = new Date().toISOString().slice(0, 10)

export default function AttendancePage() {
  const employee = useAuthStore((s) => s.employee)
  const isAdmin  = employee?.roles.some((r) => r.role === 'Admin') ?? false
  const isHr     = employee?.roles.some((r) => r.role === 'Hr')    ?? false

  const { data: companiesData } = useCompanies(false)
  const companies = flattenCompanies(companiesData ?? [])

  // HQ HR = มี HR role ที่ companyId ใดๆ ที่เป็น Headquarters (ตรงกับ ScopeGuard backend)
  const hrRoleCompanyIds = new Set(
    employee?.roles.filter((r) => r.role === 'Hr' && r.companyId).map((r) => r.companyId!) ?? []
  )
  const isHqHr = isHr && companies.some((c) => hrRoleCompanyIds.has(c.id) && c.isHeadquarters)
  const showCompanyFilter = isAdmin || isHqHr

  const [page,     setPage]     = useState(1)
  const [filters,  setFilters]  = useState<Filters>({
    search:   '',
    dateFrom: DEFAULT_DATE_FROM,
    dateTo:   DEFAULT_DATE_TO,
    status:   '',
    companyId: '',
  })
  const [editRecord,   setEditRecord]   = useState<AttendanceRecordHrDto | null>(null)
  const [showCreate,   setShowCreate]   = useState(false)
  const { exportExcel, loading: exporting } = useExportExcel()

  const { data, isLoading, isError } = useAttendanceRecords({
    search:    filters.search    || undefined,
    dateFrom:  filters.dateFrom  || undefined,
    dateTo:    filters.dateTo    || undefined,
    status:    filters.status    || undefined,
    companyId: filters.companyId || undefined,
    page,
    pageSize:  20,
  })

  const handleFilterChange = (f: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...f }))
    setPage(1)
  }

  const handleReset = () => {
    setFilters({ search: '', dateFrom: DEFAULT_DATE_FROM, dateTo: DEFAULT_DATE_TO, status: '', companyId: '' })
    setPage(1)
  }

  if (!isHr && !isAdmin) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        คุณไม่มีสิทธิ์เข้าถึงหน้านี้
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">บันทึกการเข้างาน</h1>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const now = new Date()
              exportExcel({ year: now.getFullYear(), month: now.getMonth() + 1 })
            }}
            disabled={exporting}
          >
            <Download className="h-4 w-4 mr-1.5" />
            {exporting ? 'กำลัง Export…' : 'Export Excel'}
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            เพิ่มบันทึก
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-border bg-background p-4">
        <FilterBar
          filters={filters}
          onChange={handleFilterChange}
          onReset={handleReset}
          companies={companies}
          showCompany={showCompanyFilter}
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-background overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-whited/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">พนักงาน</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">บริษัท</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">แผนก</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">วันที่</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">เข้างาน</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">ออกงาน</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">ชั่วโมง</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">สถานะ</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">สาย (นาที)</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">หมายเหตุ</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 10 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-whited rounded animate-pulse w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              )}
              {isError && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-destructive">
                    เกิดข้อผิดพลาดในการโหลดข้อมูล
                  </td>
                </tr>
              )}
              {!isLoading && !isError && data?.items.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                    ไม่พบบันทึกการเข้างาน
                  </td>
                </tr>
              )}
              {data?.items.map((r) => (
                <tr key={r.id} className="hover:bg-whited/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium text-foreground">{r.employeeFullName}</div>
                    <div className="text-xs text-muted-foreground">{r.employeeCode}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.companyName ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.departmentName ?? '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{fmtDate(r.date)}</td>
                  <td className="px-4 py-3 font-mono">{fmtTime(r.checkInTime)}</td>
                  <td className="px-4 py-3 font-mono">{fmtTime(r.checkOutTime)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.workDurationMinutes != null
                      ? `${Math.floor(r.workDurationMinutes / 60)}h ${r.workDurationMinutes % 60}m`
                      : '—'}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-center">
                    {r.isLate ? (
                      <span className="text-amber-600 font-medium">{r.lateMinutes}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-32 truncate">{r.remark ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setEditRecord(r)}
                      className="p-1.5 rounded-md hover:bg-whited transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalCount > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-sm text-muted-foreground">
              {((page - 1) * 20) + 1}–{Math.min(page * 20, data.totalCount)} จาก {data.totalCount} รายการ
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 text-sm">หน้า {page} / {Math.ceil(data.totalCount / 20)}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page * 20 >= data.totalCount}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {editRecord && (
        <EditModal record={editRecord} onClose={() => setEditRecord(null)} />
      )}
      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} companiesFlat={companies} />
      )}
    </div>
  )
}
