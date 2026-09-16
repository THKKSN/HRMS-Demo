'use client'

import { useEffect, useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useDepartments } from '@/hooks/use-departments'
import { useRoleLabels } from '@/hooks/use-role-labels'
import { companyOptionLabel, useCompanyOptions } from '@/hooks/use-company-options'
import { useTranslations } from 'next-intl'
import { ROLE_TYPES } from '@/lib/employee-roles'

export type EmployeeStatusFilter = 'active' | 'inactive' | 'all'

export type EmployeeFilters = {
  search: string
  companyId: string
  departmentId: string
  roleLabelId: string
  role: string
  status: EmployeeStatusFilter
}

export const EMPTY_FILTERS: EmployeeFilters = {
  search: '', companyId: '', departmentId: '', roleLabelId: '', role: '', status: 'active',
}

// key ตรงกับคีย์ข้อความใน messages (admin.employees.search.status*)
const STATUS_OPTIONS: { value: EmployeeStatusFilter; labelKey: string }[] = [
  { value: 'active',   labelKey: 'statusActive' },
  { value: 'inactive', labelKey: 'statusInactive' },
  { value: 'all',      labelKey: 'statusAll' },
]

/** นับตัวกรองที่ถูกใช้งาน (ไม่นับช่องค้นหา และไม่นับสถานะค่าเริ่มต้น) */
export function countActiveFilters(f: EmployeeFilters) {
  return [
    f.companyId, f.departmentId, f.roleLabelId, f.role,
    f.status === 'active' ? '' : f.status,
  ].filter(Boolean).length
}

type ChipProps = { label: string; value: string; onClear: () => void }

function FilterChip({ label, value, onClear }: ChipProps) {
  const t = useTranslations('admin.employees.search')
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 py-1 pl-3 pr-1.5 text-xs text-foreground">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label={t('clearFilter', { label })}
        className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

type Props = {
  filters: EmployeeFilters
  onChange: (patch: Partial<EmployeeFilters>) => void
  onReset: () => void
  /** ข้อความสรุปผลลัพธ์ เช่น "พบ 42 รายการ" */
  resultLabel?: string
  isFetching?: boolean
}

export function EmployeeSearchPanel({ filters, onChange, onReset, resultLabel, isFetching }: Props) {
  const t = useTranslations('admin.employees.search')
  const tRole = useTranslations('status.roleType')
  const activeCount = countActiveFilters(filters)
  const [expanded, setExpanded] = useState(activeCount > 0)

  // input ของช่องค้นหาเป็น local state เพื่อให้พิมพ์ลื่น — ตัว debounce อยู่ที่ page
  const [searchInput, setSearchInput] = useState(filters.search)
  useEffect(() => { setSearchInput(filters.search) }, [filters.search])

  const { options: companies } = useCompanyOptions()
  const { data: departments = [] } = useDepartments(filters.companyId || undefined)
  const { data: roleLabels = [] }  = useRoleLabels(filters.companyId || undefined)

  const companyName    = companies.find((c) => c.id === filters.companyId)?.name
  const departmentName = departments.find((d) => d.id === filters.departmentId)?.name
  const roleLabelName  = roleLabels.find((r) => r.id === filters.roleLabelId)?.name
  const statusOption   = STATUS_OPTIONS.find((s) => s.value === filters.status)
  const statusLabel    = statusOption ? t(statusOption.labelKey) : undefined

  const scopedDisabled = !filters.companyId

  function updateSearch(value: string) {
    setSearchInput(value)
    onChange({ search: value })
  }

  return (
    <div className="rounded-xl border border-border bg-background">
      {/* แถวค้นหาหลัก */}
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => updateSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape' && searchInput) updateSearch('') }}
            placeholder={t('placeholder')}
            aria-label={t('ariaLabel')}
            className="h-10 pl-9 pr-9"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => updateSearch('')}
              aria-label={t('clearQuery')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-whited hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* สถานะ — segmented control */}
          <div className="flex h-10 items-center rounded-md border border-border p-1">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ status: opt.value })}
                aria-pressed={filters.status === opt.value}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  filters.status === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t(opt.labelKey)}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant={expanded ? 'default' : 'outline'}
            className="h-10 shrink-0"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {t('filters')}
            {activeCount > 0 && (
              <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                expanded ? 'bg-primary-foreground/20' : 'bg-primary/10 text-primary'
              }`}>
                {activeCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* ตัวกรองละเอียด */}
      {expanded && (
        <div className="grid grid-cols-1 gap-3 border-t border-border px-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="f-company" className="text-xs text-muted-foreground">{t('company')}</Label>
            <Select
              id="f-company"
              value={filters.companyId}
              onChange={(e) => onChange({ companyId: e.target.value, departmentId: '', roleLabelId: '' })}
            >
              <option value="">{t('allCompanies')}</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{companyOptionLabel(c)}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="f-dept" className="text-xs text-muted-foreground">{t('department')}</Label>
            <Select
              id="f-dept"
              value={filters.departmentId}
              onChange={(e) => onChange({ departmentId: e.target.value })}
              disabled={scopedDisabled}
            >
              <option value="">{scopedDisabled ? t('selectCompanyFirst') : t('allDepartments')}</option>
              {departments.filter((d) => d.isActive).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="f-rlabel" className="text-xs text-muted-foreground">{t('position')}</Label>
            <Select
              id="f-rlabel"
              value={filters.roleLabelId}
              onChange={(e) => onChange({ roleLabelId: e.target.value })}
              disabled={scopedDisabled}
            >
              <option value="">{scopedDisabled ? t('selectCompanyFirst') : t('allPositions')}</option>
              {roleLabels.filter((r) => r.isActive).map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="f-role" className="text-xs text-muted-foreground">{t('role')}</Label>
            <Select id="f-role" value={filters.role} onChange={(e) => onChange({ role: e.target.value })}>
              <option value="">{t('allRoles')}</option>
              {ROLE_TYPES.map((r) => (
                <option key={r} value={r}>{tRole(r)} ({r})</option>
              ))}
            </Select>
          </div>
        </div>
      )}

      {/* สรุปผล + chip ตัวกรองที่ใช้อยู่ */}
      {(activeCount > 0 || filters.search || resultLabel) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
          {resultLabel && (
            <span className={`text-xs text-muted-foreground transition-opacity ${isFetching ? 'opacity-50' : ''}`}>
              {resultLabel}
            </span>
          )}
          {filters.search && (
            <FilterChip label={t('searchChip')} value={filters.search} onClear={() => onChange({ search: '' })} />
          )}
          {filters.companyId && companyName && (
            <FilterChip label={t('company')} value={companyName}
              onClear={() => onChange({ companyId: '', departmentId: '', roleLabelId: '' })} />
          )}
          {filters.departmentId && departmentName && (
            <FilterChip label={t('department')} value={departmentName} onClear={() => onChange({ departmentId: '' })} />
          )}
          {filters.roleLabelId && roleLabelName && (
            <FilterChip label={t('position')} value={roleLabelName} onClear={() => onChange({ roleLabelId: '' })} />
          )}
          {filters.role && (
            <FilterChip label={t('roleChip')} value={tRole(filters.role)}
              onClear={() => onChange({ role: '' })} />
          )}
          {filters.status !== 'active' && statusLabel && (
            <FilterChip label={t('statusChip')} value={statusLabel} onClear={() => onChange({ status: 'active' })} />
          )}
          {(activeCount > 0 || filters.search) && (
            <button
              type="button"
              onClick={onReset}
              className="ml-auto text-xs font-medium text-primary hover:underline"
            >
              {t('clearAll')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
