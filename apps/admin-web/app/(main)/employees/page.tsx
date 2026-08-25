'use client'

import { useCallback, useMemo, useState, useTransition, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Plus, UsersRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { useEmployees } from '@/hooks/use-employees'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { getInitials, ROLE_LABEL_TH, roleChipClass } from '@/lib/employee-roles'
import { CreateEmployeeModal } from './create-employee-modal'
import {
  EmployeeSearchPanel,
  EMPTY_FILTERS,
  countActiveFilters,
  type EmployeeFilters,
  type EmployeeStatusFilter,
} from './employee-search-panel'

const PAGE_SIZES = [20, 50, 100]

// ── URL <-> filters ───────────────────────────────────────────────────────────

function parseFilters(params: URLSearchParams): EmployeeFilters {
  const status = params.get('status')
  return {
    search:       params.get('search') ?? '',
    companyId:    params.get('companyId') ?? '',
    departmentId: params.get('departmentId') ?? '',
    roleLabelId:  params.get('roleLabelId') ?? '',
    role:         params.get('role') ?? '',
    status:       (status === 'inactive' || status === 'all' ? status : 'active') as EmployeeStatusFilter,
  }
}

function toSearchParams(filters: EmployeeFilters, page: number, pageSize: number) {
  const p = new URLSearchParams()
  if (filters.search)       p.set('search', filters.search)
  if (filters.companyId)    p.set('companyId', filters.companyId)
  if (filters.departmentId) p.set('departmentId', filters.departmentId)
  if (filters.roleLabelId)  p.set('roleLabelId', filters.roleLabelId)
  if (filters.role)         p.set('role', filters.role)
  if (filters.status !== 'active') p.set('status', filters.status)
  if (page > 1)             p.set('page', String(page))
  if (pageSize !== PAGE_SIZES[0]) p.set('pageSize', String(pageSize))
  return p
}

// ── Table row ─────────────────────────────────────────────────────────────────

function SkeletonRows({ rows, cols }: { rows: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-border last:border-0">
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="px-4 py-3.5">
              <div className="h-4 w-full max-w-28 animate-pulse rounded bg-whited" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function EmployeesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [createOpen, setCreateOpen] = useState(false)

  const filters  = useMemo(() => parseFilters(new URLSearchParams(searchParams.toString())), [searchParams])
  const page     = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const pageSize = Number(searchParams.get('pageSize') ?? PAGE_SIZES[0])

  // ค้นหาแบบ debounce — พิมพ์แล้วอัปเดต URL ทันที แต่ยิง query ช้ากว่า 350ms
  const debouncedSearch = useDebouncedValue(filters.search, 350)

  const { data, isLoading, isFetching } = useEmployees({
    page,
    pageSize,
    search:       debouncedSearch || undefined,
    isActive:     filters.status === 'all' ? undefined : filters.status === 'active',
    companyId:    filters.companyId || undefined,
    departmentId: filters.departmentId || undefined,
    roleLabelId:  filters.roleLabelId || undefined,
    role:         filters.role || undefined,
  })

  const navigate = useCallback((next: EmployeeFilters, nextPage: number, nextPageSize: number) => {
    const query = toSearchParams(next, nextPage, nextPageSize).toString()
    startTransition(() => router.replace(query ? `/employees?${query}` : '/employees', { scroll: false }))
  }, [router])

  const handleFilterChange = useCallback((patch: Partial<EmployeeFilters>) => {
    navigate({ ...filters, ...patch }, 1, pageSize)   // เปลี่ยนตัวกรอง = กลับหน้าแรกเสมอ
  }, [filters, pageSize, navigate])

  const handleReset  = useCallback(() => navigate(EMPTY_FILTERS, 1, pageSize), [navigate, pageSize])
  const goToPage     = (p: number) => navigate(filters, p, pageSize)
  const changeSize   = (s: number) => navigate(filters, 1, s)

  const items      = data?.items ?? []
  const totalCount = data?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const rangeFrom  = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeTo    = Math.min(page * pageSize, totalCount)
  const hasFilters = countActiveFilters(filters) > 0 || !!filters.search

  return (
    <div className="space-y-4">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">พนักงาน</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {isLoading ? 'กำลังโหลด…' : `ทั้งหมด ${totalCount.toLocaleString('th-TH')} คน`}
          </p>
        </div>
        <Button size="md" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />เพิ่มพนักงาน
        </Button>
      </div>

      {/* ── Search + filters ──────────────────────────────────────────────── */}
      <EmployeeSearchPanel
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleReset}
        isFetching={isFetching}
        resultLabel={isLoading ? 'กำลังค้นหา…' : `พบ ${totalCount.toLocaleString('th-TH')} รายการ`}
      />

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-border bg-background">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border bg-whited/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">พนักงาน</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">สังกัด</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ตำแหน่ง</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">สิทธิ์</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">สถานะ</th>
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody className={isFetching && !isLoading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            {isLoading && <SkeletonRows rows={6} cols={6} />}

            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-16">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-whited">
                      <UsersRound className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="font-medium">ไม่พบข้อมูลพนักงาน</p>
                    <p className="max-w-sm text-sm text-muted-foreground">
                      {hasFilters
                        ? 'ลองปรับคำค้นหาหรือล้างตัวกรองบางส่วน แล้วค้นหาอีกครั้ง'
                        : 'ยังไม่มีพนักงานในระบบ เริ่มต้นด้วยการเพิ่มพนักงานคนแรก'}
                    </p>
                    {hasFilters ? (
                      <Button size="sm" variant="outline" className="mt-2" onClick={handleReset}>
                        ล้างตัวกรองทั้งหมด
                      </Button>
                    ) : (
                      <Button size="sm" className="mt-2" onClick={() => setCreateOpen(true)}>
                        <Plus className="h-4 w-4" />เพิ่มพนักงาน
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {!isLoading && items.map((emp) => (
              <tr
                key={emp.id}
                tabIndex={0}
                role="link"
                onClick={() => router.push(`/employees/${emp.id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/employees/${emp.id}`) }}
                className="group cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-whited/50 focus:bg-whited/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              >
                {/* พนักงาน */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      emp.isActive ? 'bg-primary/10 text-primary' : 'bg-whited text-muted-foreground'
                    }`}>
                      {getInitials(emp.fullName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {emp.fullName}
                        {emp.nickname && (
                          <span className="ml-1.5 font-normal text-muted-foreground">({emp.nickname})</span>
                        )}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">{emp.employeeCode}</p>
                    </div>
                  </div>
                </td>

                {/* สังกัด */}
                <td className="px-4 py-3">
                  <p className="truncate text-foreground">{emp.companyName}</p>
                  <p className="truncate text-xs text-muted-foreground">{emp.departmentName ?? 'ไม่ระบุแผนก'}</p>
                </td>

                {/* ตำแหน่ง */}
                <td className="px-4 py-3 text-muted-foreground">{emp.roleLabelName ?? '—'}</td>

                {/* สิทธิ์ */}
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {emp.roles.length === 0 && <span className="text-muted-foreground">—</span>}
                    {emp.roles.map((r) => (
                      <span
                        key={r}
                        title={ROLE_LABEL_TH[r] ?? r}
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${roleChipClass(r)}`}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </td>

                {/* สถานะ */}
                <td className="px-4 py-3">
                  <Badge variant={emp.isActive ? 'success' : 'secondary'}>
                    {emp.isActive ? 'ปฏิบัติงานอยู่' : 'พ้นสภาพ'}
                  </Badge>
                </td>

                <td className="px-4 py-3 text-right">
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {totalCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>แสดง {rangeFrom.toLocaleString('th-TH')}–{rangeTo.toLocaleString('th-TH')} จาก {totalCount.toLocaleString('th-TH')}</span>
            <Select
              value={String(pageSize)}
              onChange={(e) => changeSize(Number(e.target.value))}
              aria-label="จำนวนรายการต่อหน้า"
              className="h-8 w-auto text-xs"
            >
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / หน้า</option>)}
            </Select>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1}
                aria-label="หน้าก่อนหน้า" onClick={() => goToPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="tabular-nums">หน้า {page} / {totalPages}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages}
                aria-label="หน้าถัดไป" onClick={() => goToPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      <CreateEmployeeModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultCompanyId={filters.companyId || undefined}
      />
    </div>
  )
}

export default function EmployeesPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <EmployeesPage />
    </Suspense>
  )
}
