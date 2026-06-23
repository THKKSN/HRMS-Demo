'use client'

import { useState, Suspense, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, Pencil, X, RefreshCw, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { toast } from 'sonner'
import { useLeaveBalances, useAdjustBalance, useCreateLeaveBalance, useSeedBalances } from '@/hooks/use-leave-balances'
import { useLeaveTypes } from '@/hooks/use-leave-types'
import { useCompanies } from '@/hooks/use-companies'
import { useEmployees } from '@/hooks/use-employees'
import { useAuthStore } from '@/stores/auth.store'
import type { LeaveBalanceAdminDto } from '@/types/admin'

const CURRENT_YEAR = new Date().getFullYear()

// ── Create balance modal ──────────────────────────────────────────────────────

function CreateBalanceModal({ open, onClose, defaultYear }: { open: boolean; onClose: () => void; defaultYear: number }) {
  const [empId, setEmpId]       = useState('')
  const [ltId, setLtId]         = useState('')
  const [year, setYear]         = useState(defaultYear)
  const [totalDays, setTotalDays] = useState('0')
  const [error, setError]       = useState('')

  const createBalance = useCreateLeaveBalance()

  const { data: empData } = useEmployees({ page: 1, pageSize: 500, isActive: true })
  const employees = empData?.items ?? []

  const { data: leaveTypes = [] } = useLeaveTypes()
  const activeTypes = leaveTypes.filter((lt) => lt.isActive)

  async function handleSubmit() {
    if (!empId)  { setError('กรุณาเลือกพนักงาน'); return }
    if (!ltId)   { setError('กรุณาเลือกประเภทการลา'); return }
    const val = parseFloat(totalDays)
    if (isNaN(val) || val < 0) { setError('จำนวนวันต้องเป็นตัวเลข ≥ 0'); return }
    try {
      await createBalance.mutateAsync({ employeeId: empId, leaveTypeId: ltId, year, totalDays: val })
      toast.success('เพิ่มสิทธิ์สำเร็จ')
      setEmpId(''); setLtId(''); setTotalDays('0'); setError('')
      onClose()
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data
      setError(apiErr?.error === 'BALANCE_ALREADY_EXISTS' ? 'พนักงานนี้มีสิทธิ์ประเภทการลานี้อยู่แล้วในปีนี้' : 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="เพิ่มสิทธิ์วันลา (Manual)" size="sm">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="cb-emp">พนักงาน</Label>
          <Select id="cb-emp" value={empId} onChange={(e) => { setEmpId(e.target.value); setLtId(''); setError('') }}>
            <option value="">— เลือกพนักงาน —</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.fullName} ({e.employeeCode})</option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cb-lt">ประเภทการลา</Label>
          <Select id="cb-lt" value={ltId} onChange={(e) => { setLtId(e.target.value); setError('') }} disabled={!empId}>
            <option value="">— เลือกประเภทการลา —</option>
            {activeTypes.map((lt) => (
              <option key={lt.id} value={lt.id}>{lt.nameTh}</option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="cb-year">ปี</Label>
            <Input
              id="cb-year" type="number" min={2020} max={2099}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cb-days">จำนวนวัน</Label>
            <Input
              id="cb-days" type="number" min={0} step={0.5}
              value={totalDays}
              onChange={(e) => setTotalDays(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button loading={createBalance.isPending} onClick={handleSubmit}>บันทึก</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Inline edit/create cell ───────────────────────────────────────────────────

function InlineInput({
  value, error, isPending,
  onChange, onConfirm, onCancel,
}: {
  value: string; error: string; isPending: boolean
  onChange: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex flex-col gap-1 min-w-25">
      <div className="flex items-center gap-1">
        <Input
          type="number" min={0} step={0.5}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-20 text-right text-sm"
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') onConfirm(); if (e.key === 'Escape') onCancel() }}
        />
        <Button size="icon" className="h-7 w-7 shrink-0" loading={isPending} onClick={onConfirm}>
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={onCancel}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function BalanceCell({
  balance, empId, ltId, canEdit,
  editId, editValue, editError, isEditPending,
  createKey, createValue, createError, isCreatePending,
  onStartEdit, onConfirmEdit, onCancelEdit, onEditChange,
  onStartCreate, onConfirmCreate, onCancelCreate, onCreateChange,
}: {
  balance: LeaveBalanceAdminDto | undefined
  empId: string; ltId: string; canEdit: boolean
  editId: string | null; editValue: string; editError: string; isEditPending: boolean
  createKey: string | null; createValue: string; createError: string; isCreatePending: boolean
  onStartEdit: (id: string, current: number) => void
  onConfirmEdit: (id: string) => void
  onCancelEdit: () => void
  onEditChange: (v: string) => void
  onStartCreate: (empId: string, ltId: string) => void
  onConfirmCreate: (empId: string, ltId: string) => void
  onCancelCreate: () => void
  onCreateChange: (v: string) => void
}) {
  const cellKey = `${empId}-${ltId}`

  if (!balance) {
    if (canEdit && createKey === cellKey) {
      return (
        <td className="px-3 py-2 border-r border-border last:border-r-0">
          <InlineInput
            value={createValue} error={createError} isPending={isCreatePending}
            onChange={onCreateChange}
            onConfirm={() => onConfirmCreate(empId, ltId)}
            onCancel={onCancelCreate}
          />
        </td>
      )
    }
    return (
      <td className="px-3 py-2 text-center border-r border-border last:border-r-0">
        {canEdit ? (
          <button
            className="text-muted-foreground/40 hover:text-primary hover:font-bold transition-colors text-lg leading-none"
            title="คลิกเพื่อเพิ่มสิทธิ์"
            onClick={() => onStartCreate(empId, ltId)}
          >
            +
          </button>
        ) : (
          <span className="text-muted-foreground/30">—</span>
        )}
      </td>
    )
  }

  const isEditing = canEdit && editId === balance.id

  return (
    <td className="px-3 py-2 border-r border-border last:border-r-0">
      {isEditing ? (
        <InlineInput
          value={editValue} error={editError} isPending={isEditPending}
          onChange={onEditChange}
          onConfirm={() => onConfirmEdit(balance.id)}
          onCancel={onCancelEdit}
        />
      ) : (
        <div className={`flex items-center justify-center gap-2 min-w-20 ${canEdit ? 'group' : ''}`}>
          <div className="space-y-0.5 text-center">
            <div className="text-sm font-medium">{balance.totalDays}</div>
            <div className="text-xs text-muted-foreground leading-none">
              {balance.usedDays}
              {' | '}
              <span className="text-amber-500">{balance.pendingDays}</span>
              {' | '}
              <span className="text-green-600 font-medium">{balance.remainingDays}</span>
            </div>
          </div>
          {canEdit && (
            <Button
              size="icon" variant="ghost"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={() => onStartEdit(balance.id, balance.totalDays)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </td>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

function LeaveBalancesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const year = Number(searchParams.get('year') ?? CURRENT_YEAR)
  const [companyFilter, setCompanyFilter] = useState('')

  const currentUser = useAuthStore((s) => s.employee)
  const isAdmin  = currentUser?.roles.some((r) => r.role === 'Admin') ?? false
  const isHr     = currentUser?.roles.some((r) => r.role === 'Hr')    ?? false
  const canEdit  = isAdmin || isHr

  const { data: tree = [] } = useCompanies()
  const activeCompanies = useMemo(() => {
    const result: { id: string; name: string }[] = []
    function walk(nodes: typeof tree) {
      for (const n of nodes) {
        if (n.isActive) result.push({ id: n.id, name: n.name })
        walk(n.children)
      }
    }
    walk(tree)
    return result
  }, [tree])

  const [editId, setEditId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editError, setEditError] = useState('')
  const [createKey, setCreateKey] = useState<string | null>(null)
  const [createValue, setCreateValue] = useState('')
  const [createError, setCreateError] = useState('')
  const [seedOpen, setSeedOpen] = useState(false)
  const [createManualOpen, setCreateManualOpen] = useState(false)

  const { data, isLoading } = useLeaveBalances({ year, page: 1, pageSize: 999, companyId: companyFilter || undefined })
  const { data: leaveTypeList } = useLeaveTypes()
  const adjustBalance = useAdjustBalance()
  const createBalance = useCreateLeaveBalance()
  const seedBalances = useSeedBalances()

  function setYear(y: number) {
    router.push(`/leave-balances?year=${y}`)
  }

  function startEdit(id: string, current: number) {
    setEditId(id)
    setEditValue(String(current))
    setEditError('')
  }

  function cancelEdit() {
    setEditId(null)
    setEditValue('')
    setEditError('')
  }

  async function confirmEdit(id: string) {
    const val = parseFloat(editValue)
    if (isNaN(val) || val < 0) {
      setEditError('กรุณากรอกตัวเลขที่ถูกต้อง (≥ 0)')
      return
    }
    try {
      await adjustBalance.mutateAsync({ id, totalDays: val })
      toast.success('บันทึกสิทธิ์สำเร็จ')
      setEditId(null)
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data
      if (apiErr?.error === 'QUOTA_BELOW_USED')
        setEditError(apiErr.message ?? 'สิทธิ์น้อยกว่าวันที่ใช้ไปแล้ว')
      else
        setEditError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    }
  }

  function startCreate(empId: string, ltId: string) {
    setCreateKey(`${empId}-${ltId}`)
    setCreateValue('0')
    setCreateError('')
  }

  function cancelCreate() {
    setCreateKey(null)
    setCreateValue('')
    setCreateError('')
  }

  async function confirmCreate(empId: string, ltId: string) {
    const val = parseFloat(createValue)
    if (isNaN(val) || val < 0) {
      setCreateError('กรุณากรอกตัวเลขที่ถูกต้อง (≥ 0)')
      return
    }
    try {
      await createBalance.mutateAsync({ employeeId: empId, leaveTypeId: ltId, year, totalDays: val })
      toast.success('เพิ่มสิทธิ์สำเร็จ')
      setCreateKey(null)
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data
      setCreateError(apiErr?.error === 'BALANCE_ALREADY_EXISTS' ? 'มีสิทธิ์นี้อยู่แล้ว' : 'เกิดข้อผิดพลาด')
    }
  }

  async function handleSeed() {
    try {
      const res = await seedBalances.mutateAsync({ year, companyId: companyFilter || undefined })
      toast.success(`สร้างสิทธิ์แล้ว ${res.created} รายการ`)
      setSeedOpen(false)
    } catch {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
      setSeedOpen(false)
    }
  }

  // ── Pivot: leave type columns from API, group balances by employee ───────

  const leaveTypes = useMemo(
    () => (leaveTypeList ?? []).filter((lt) => lt.isActive).map((lt) => ({ id: lt.id, name: lt.nameTh })),
    [leaveTypeList],
  )

  const employeeRows = useMemo(() => {
    if (!data?.items) return []
    const map = new Map<string, { id: string; code: string; name: string; department?: string; balances: Map<string, LeaveBalanceAdminDto> }>()
    for (const b of data.items) {
      if (!map.has(b.employeeId)) {
        map.set(b.employeeId, { id: b.employeeId, code: b.employeeCode, name: b.employeeName, department: b.departmentName, balances: new Map() })
      }
      map.get(b.employeeId)!.balances.set(b.leaveTypeId, b)
    }
    return Array.from(map.values())
  }, [data])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">สิทธิ์วันลา</h1>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setCreateManualOpen(true)}>
              <Plus className="h-4 w-4" />
              เพิ่มสิทธิ์
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSeedOpen(true)}>
              <RefreshCw className="h-4 w-4" />
              Seed ปี {year}
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="w-56"
        >
          <option value="">ทุกบริษัท</option>
          {activeCompanies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">ปี:</span>
          {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                year === y
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-auto rounded-lg border border-border bg-background">
        <table className="w-full text-sm border-collapse">
          <thead>
            {/* Row 1: leave type names as group headers */}
            <tr className="border-b border-border bg-muted/50">
              <th
                rowSpan={2}
                className="px-4 py-3 text-left font-medium text-muted-foreground border-r border-border align-middle sticky left-0 bg-muted/50 z-10 min-w-35"
              >
                พนักงาน
              </th>
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <th key={i} className="px-3 py-2 text-center font-medium text-muted-foreground border-r border-border last:border-r-0">
                      <div className="h-4 w-16 animate-pulse rounded bg-muted mx-auto" />
                    </th>
                  ))
                : leaveTypes.map((lt) => (
                    <th
                      key={lt.id}
                      className="px-3 py-2 text-center font-medium text-foreground border-r border-border last:border-r-0 whitespace-nowrap"
                    >
                      {lt.name}
                    </th>
                  ))}
            </tr>
            {/* Row 2: legend */}
            <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
              {!isLoading &&
                leaveTypes.map((lt) => (
                  <th key={lt.id} className="px-3 py-1.5 text-center font-normal border-r border-border last:border-r-0">
                    ใช้ | รอ | คงเหลือ
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="px-4 py-3 border-r border-border sticky left-0 bg-background">
                    <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                  </td>
                  {Array.from({ length: 3 }).map((__, j) => (
                    <td key={j} className="px-3 py-3 border-r border-border last:border-r-0">
                      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))}

            {!isLoading && employeeRows.length === 0 && (
              <tr>
                <td
                  colSpan={leaveTypes.length + 1}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  ไม่พบข้อมูล — กดปุ่ม Seed เพื่อสร้างสิทธิ์
                </td>
              </tr>
            )}

            {!isLoading &&
              employeeRows.map((emp) => (
                <tr key={emp.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 border-r border-border sticky left-0 bg-background whitespace-nowrap">
                    <div className="font-medium text-sm">{emp.name}</div>
                    <div className="text-xs text-muted-foreground">{emp.code}{emp.department ? ` · ${emp.department}` : ''}</div>
                  </td>
                  {leaveTypes.map((lt) => (
                    <BalanceCell
                      key={lt.id}
                      balance={emp.balances.get(lt.id)}
                      empId={emp.id}
                      ltId={lt.id}
                      canEdit={canEdit}
                      editId={editId}
                      editValue={editValue}
                      editError={editError}
                      isEditPending={adjustBalance.isPending}
                      createKey={createKey}
                      createValue={createValue}
                      createError={createError}
                      isCreatePending={createBalance.isPending}
                      onStartEdit={startEdit}
                      onConfirmEdit={confirmEdit}
                      onCancelEdit={cancelEdit}
                      onEditChange={setEditValue}
                      onStartCreate={startCreate}
                      onConfirmCreate={confirmCreate}
                      onCancelCreate={cancelCreate}
                      onCreateChange={setCreateValue}
                    />
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!isLoading && employeeRows.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {employeeRows.length} พนักงาน · {leaveTypes.length} ประเภทการลา · ปี {year}
          {' · '}hover ที่ช่องสิทธิ์เพื่อแก้ไข
        </p>
      )}

      <ConfirmModal
        open={seedOpen}
        onClose={() => setSeedOpen(false)}
        onConfirm={handleSeed}
        title={`Seed สิทธิ์ปี ${year}`}
        description={`สร้างสิทธิ์วันลาปี ${year} ให้พนักงานทุกคน × ทุกประเภทการลา (ถ้ายังไม่มี)`}
        confirmLabel="Seed"
        loading={seedBalances.isPending}
      />

      <CreateBalanceModal
        open={createManualOpen}
        onClose={() => setCreateManualOpen(false)}
        defaultYear={year}
      />
    </div>
  )
}

export default function LeaveBalancesPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <LeaveBalancesPage />
    </Suspense>
  )
}
