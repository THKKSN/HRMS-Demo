'use client'

import { useState, useMemo } from 'react'
import { Check, Pencil, Plus, RefreshCw, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { useLeaveTypes } from '@/hooks/use-leave-types'
import { useLeaveBalances, useAdjustBalance, useCreateLeaveBalance, useSeedBalancesForEmployee } from '@/hooks/use-leave-balances'
import type { LeaveBalanceAdminDto, EmployeeListItemDto } from '@/types/admin'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1]

// ── Inline input ──────────────────────────────────────────────────────────────

function InlineInput({
  value, error, isPending,
  onChange, onConfirm, onCancel,
}: {
  value: string; error: string; isPending: boolean
  onChange: (v: string) => void; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div className="flex flex-col gap-1">
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

// ── Modal ─────────────────────────────────────────────────────────────────────

type Props = { emp: EmployeeListItemDto | null; onClose: () => void }

export function EmployeeLeaveModal({ emp, onClose }: Props) {
  const [year, setYear] = useState(CURRENT_YEAR)
  const [editId, setEditId]     = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editError, setEditError] = useState('')
  const [createLtId, setCreateLtId]     = useState<string | null>(null)
  const [createValue, setCreateValue]   = useState('0')
  const [createError, setCreateError]   = useState('')

  const { data: leaveTypes = [] }  = useLeaveTypes()
  const { data: balanceData, isLoading } = useLeaveBalances(
    emp ? { year, employeeId: emp.id, companyId: emp.companyId, pageSize: 50 } : { year, pageSize: 0 },
  )
  const adjustBalance  = useAdjustBalance()
  const createBalance  = useCreateLeaveBalance()
  const seedForEmployee = useSeedBalancesForEmployee()

  const balanceMap = useMemo(() => {
    const map = new Map<string, LeaveBalanceAdminDto>()
    for (const b of balanceData?.items ?? []) map.set(b.leaveTypeId, b)
    return map
  }, [balanceData])

  const activeTypes = leaveTypes.filter((lt) => lt.isActive)

  // ── edit handlers ──────────────────────────────────────────────────────────
  function startEdit(balance: LeaveBalanceAdminDto) {
    setEditId(balance.id); setEditValue(String(balance.totalDays)); setEditError('')
  }
  function cancelEdit() { setEditId(null); setEditValue(''); setEditError('') }
  async function confirmEdit(balanceId: string) {
    const val = parseFloat(editValue)
    if (isNaN(val) || val < 0) { setEditError('กรุณากรอกตัวเลขที่ถูกต้อง (≥ 0)'); return }
    try {
      await adjustBalance.mutateAsync({ id: balanceId, totalDays: val })
      toast.success('บันทึกสิทธิ์สำเร็จ')
      setEditId(null)
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data
      setEditError(apiErr?.error === 'QUOTA_BELOW_USED' ? (apiErr.message ?? 'สิทธิ์น้อยกว่าวันที่ใช้ไปแล้ว') : 'เกิดข้อผิดพลาด')
    }
  }

  // ── create handlers ────────────────────────────────────────────────────────
  function startCreate(ltId: string) { setCreateLtId(ltId); setCreateValue('0'); setCreateError('') }
  function cancelCreate() { setCreateLtId(null); setCreateValue(''); setCreateError('') }
  async function confirmCreate(ltId: string) {
    if (!emp) return
    const val = parseFloat(createValue)
    if (isNaN(val) || val < 0) { setCreateError('กรุณากรอกตัวเลขที่ถูกต้อง (≥ 0)'); return }
    try {
      await createBalance.mutateAsync({ employeeId: emp.id, leaveTypeId: ltId, year, totalDays: val })
      toast.success('เพิ่มสิทธิ์สำเร็จ')
      setCreateLtId(null)
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data
      setCreateError(apiErr?.error === 'BALANCE_ALREADY_EXISTS' ? 'มีสิทธิ์นี้อยู่แล้ว' : 'เกิดข้อผิดพลาด')
    }
  }

  // ── seed handler ───────────────────────────────────────────────────────────
  async function handleSeed() {
    if (!emp) return
    try {
      const res = await seedForEmployee.mutateAsync({ employeeId: emp.id, year })
      if (res.created === 0) toast.info('สิทธิ์ครบทุกประเภทการลาแล้ว')
      else toast.success(`สร้างสิทธิ์วันลาแล้ว ${res.created} รายการ`)
    } catch {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
    }
  }

  const missingCount = activeTypes.filter((lt) => !balanceMap.has(lt.id)).length

  return (
    <Modal
      open={!!emp}
      onClose={onClose}
      title={`สิทธิ์วันลา — ${emp?.fullName ?? ''}`}
      size="lg"
    >
      {/* header row */}
      <div className="flex items-center justify-between gap-3 mb-4">
        {/* year tabs */}
        <div className="flex items-center gap-1">
          {YEARS.map((y) => (
            <button
              key={y}
              onClick={() => { setYear(y); setEditId(null); setCreateLtId(null) }}
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

        {/* seed button */}
        {missingCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            loading={seedForEmployee.isPending}
            onClick={handleSeed}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Seed ที่ขาด ({missingCount})
          </Button>
        )}
      </div>

      {/* table */}
      <div className="overflow-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">ประเภทการลา</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground w-20">ค่าเริ่มต้น</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground w-28">สิทธิ์</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground w-16">ใช้ไป</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground w-16">รอ</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground w-20">คงเหลือ</th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-3 py-3">
                      <div className="h-4 w-16 animate-pulse rounded bg-muted mx-auto" />
                    </td>
                  ))}
                </tr>
              ))}

            {!isLoading && activeTypes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground text-sm">
                  ยังไม่มีประเภทการลาในบริษัทนี้
                </td>
              </tr>
            )}

            {!isLoading &&
              activeTypes.map((lt) => {
                const balance = balanceMap.get(lt.id)
                const isEditing = editId !== null && balance?.id === editId
                const isCreating = createLtId === lt.id

                return (
                  <tr key={lt.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    {/* leave type name */}
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{lt.nameTh}</div>
                      {lt.nameEn && <div className="text-xs text-muted-foreground">{lt.nameEn}</div>}
                    </td>

                    {/* default days */}
                    <td className="px-3 py-2.5 text-center text-muted-foreground">
                      {lt.defaultDaysPerYear}
                    </td>

                    {/* quota (editable) */}
                    <td className="px-3 py-2.5">
                      {!balance && !isCreating && (
                        <button
                          className="mx-auto flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-primary hover:font-medium transition-colors"
                          onClick={() => startCreate(lt.id)}
                        >
                          <Plus className="h-3 w-3" />
                          เพิ่มสิทธิ์
                        </button>
                      )}
                      {!balance && isCreating && (
                        <InlineInput
                          value={createValue} error={createError}
                          isPending={createBalance.isPending}
                          onChange={setCreateValue}
                          onConfirm={() => confirmCreate(lt.id)}
                          onCancel={cancelCreate}
                        />
                      )}
                      {balance && !isEditing && (
                        <div className="flex items-center justify-center gap-2 group">
                          <span className="font-medium">{balance.totalDays}</span>
                          <Button
                            size="icon" variant="ghost"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={() => startEdit(balance)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      {balance && isEditing && (
                        <InlineInput
                          value={editValue} error={editError}
                          isPending={adjustBalance.isPending}
                          onChange={setEditValue}
                          onConfirm={() => confirmEdit(balance.id)}
                          onCancel={cancelEdit}
                        />
                      )}
                    </td>

                    {/* used / pending / remaining */}
                    <td className="px-3 py-2.5 text-center text-muted-foreground">
                      {balance ? balance.usedDays : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-center text-amber-500">
                      {balance ? balance.pendingDays : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-center font-medium text-green-600">
                      {balance ? balance.remainingDays : '—'}
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {emp?.companyName} · ปี {year} · hover ที่สิทธิ์เพื่อแก้ไข
      </p>
    </Modal>
  )
}
