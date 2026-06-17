'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, Pencil, X, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLeaveBalances, useAdjustBalance, useSeedBalances } from '@/hooks/use-leave-balances'

const PAGE_SIZE = 30
const CURRENT_YEAR = new Date().getFullYear()

function LeaveBalancesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const year = Number(searchParams.get('year') ?? CURRENT_YEAR)
  const page = Number(searchParams.get('page') ?? '1')

  const [editId, setEditId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editError, setEditError] = useState('')
  const [seedMsg, setSeedMsg] = useState('')

  const { data, isLoading } = useLeaveBalances({ year, page, pageSize: PAGE_SIZE })
  const adjustBalance = useAdjustBalance()
  const seedBalances = useSeedBalances()

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString())
    p.set(key, value)
    if (key !== 'page') p.delete('page')
    router.push(`/leave-balances?${p.toString()}`)
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
      setEditId(null)
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data
      if (apiErr?.error === 'QUOTA_BELOW_USED')
        setEditError(apiErr.message ?? 'โควตาน้อยกว่าวันที่ใช้ไปแล้ว')
      else
        setEditError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    }
  }

  async function handleSeed() {
    if (!confirm(`Seed โควตาวันลาปี ${year} ให้พนักงานทุกคน × ทุกประเภทลา?`)) return
    try {
      const res = await seedBalances.mutateAsync(year)
      setSeedMsg(`สร้างแล้ว ${res.created} รายการ`)
      setTimeout(() => setSeedMsg(''), 3000)
    } catch {
      setSeedMsg('เกิดข้อผิดพลาด')
      setTimeout(() => setSeedMsg(''), 3000)
    }
  }

  const totalPages = data ? Math.ceil(data.totalCount / PAGE_SIZE) : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">โควตาวันลา</h1>
        <div className="flex items-center gap-2">
          {seedMsg && <span className="text-sm text-green-600">{seedMsg}</span>}
          <Button size="sm" variant="outline" loading={seedBalances.isPending} onClick={handleSeed}>
            <RefreshCw className="h-4 w-4" />
            Seed ปี {year}
          </Button>
        </div>
      </div>

      {/* Year selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">ปี:</span>
        {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => (
          <button
            key={y}
            onClick={() => setParam('year', String(y))}
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

      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">พนักงาน</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ประเภทลา</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">โควตา</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">ใช้ไป</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">รอ</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">คงเหลือ</th>
              <th className="px-4 py-3 w-16" />
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))}
            {!isLoading && (!data?.items || data.items.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  ไม่พบข้อมูล — กดปุ่ม Seed เพื่อสร้างโควตา
                </td>
              </tr>
            )}
            {!isLoading &&
              data?.items.map((b) => (
                <tr key={b.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">{b.employeeName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{b.leaveTypeName}</td>
                  <td className="px-4 py-3 text-right">
                    {editId === b.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-7 w-20 text-right text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') confirmEdit(b.id)
                            if (e.key === 'Escape') cancelEdit()
                          }}
                        />
                        <Button
                          size="icon"
                          className="h-7 w-7"
                          loading={adjustBalance.isPending}
                          onClick={() => confirmEdit(b.id)}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <span className="font-medium">{b.totalDays}</span>
                    )}
                    {editId === b.id && editError && (
                      <p className="text-xs text-destructive text-right mt-1">{editError}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{b.usedDays}</td>
                  <td className="px-4 py-3 text-right text-amber-600">{b.pendingDays}</td>
                  <td className="px-4 py-3 text-right font-medium text-green-700">{b.remainingDays}</td>
                  <td className="px-4 py-3">
                    {editId !== b.id && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => startEdit(b.id, b.totalDays)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>ทั้งหมด {data?.totalCount ?? 0} รายการ</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={page <= 1}
              onClick={() => setParam('page', String(page - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={page >= totalPages}
              onClick={() => setParam('page', String(page + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LeaveBalancesPageWrapper() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}>
      <LeaveBalancesPage />
    </Suspense>
  )
}
