'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition, Suspense } from 'react'
import { Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useEmployees } from '@/hooks/use-employees'

const PAGE_SIZE = 20

function EmployeesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const search = searchParams.get('search') ?? ''
  const page = Number(searchParams.get('page') ?? '1')
  const showInactive = searchParams.get('inactive') === '1'

  const [searchInput, setSearchInput] = useState(search)

  const { data, isLoading } = useEmployees({
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    isActive: showInactive ? undefined : true,
  })

  function pushParams(updates: Record<string, string | undefined>) {
    const p = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v == null) p.delete(k)
      else p.set(k, v)
    }
    p.delete('page')
    startTransition(() => router.push(`/employees?${p.toString()}`))
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    pushParams({ search: searchInput || undefined })
  }

  const totalPages = data ? Math.ceil(data.totalCount / PAGE_SIZE) : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">พนักงาน</h1>
        <Link href="/employees/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            เพิ่มพนักงาน
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ค้นหาชื่อ / รหัสพนักงาน"
            className="pl-8"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </form>
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            className="rounded border-border"
            checked={showInactive}
            onChange={(e) => pushParams({ inactive: e.target.checked ? '1' : undefined })}
          />
          แสดงทั้งหมด (รวมปิดใช้งาน)
        </label>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">รหัส</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ชื่อ-นามสกุล</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">แผนก</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">สิทธิ์</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))}
            {!isLoading && data?.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  ไม่พบข้อมูลพนักงาน
                </td>
              </tr>
            )}
            {!isLoading &&
              data?.items.map((emp) => (
                <tr
                  key={emp.id}
                  onClick={() => router.push(`/employees/${emp.id}`)}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{emp.employeeCode}</td>
                  <td className="px-4 py-3 font-medium">{emp.fullName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{emp.departmentName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {emp.roles.map((r) => (
                        <Badge key={r} variant="secondary" className="text-xs">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={emp.isActive ? 'success' : 'secondary'}>
                      {emp.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                    </Badge>
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
              onClick={() => {
                const p = new URLSearchParams(searchParams.toString())
                p.set('page', String(page - 1))
                router.push(`/employees?${p.toString()}`)
              }}
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
              onClick={() => {
                const p = new URLSearchParams(searchParams.toString())
                p.set('page', String(page + 1))
                router.push(`/employees?${p.toString()}`)
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function EmployeesPageWrapper() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}>
      <EmployeesPage />
    </Suspense>
  )
}
