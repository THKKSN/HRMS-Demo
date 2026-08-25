'use client'

import { useState } from 'react'
import { CheckCircle2, Plus, Route, UserRound, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { TicketCategoryDto, TicketRoutingMode, TicketTopicDto } from '@hrms/shared-types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useResponsibilities, useResponsibilityEmployees, useRoutingCoverage, useRoutingMutations } from '@/hooks/use-ticket-routing'

const modeLabel: Record<TicketRoutingMode, string> = {
  SupervisorAssign: 'ให้ Supervisor มอบหมาย',
  AutoAssignSingle: 'มอบหมายอัตโนมัติเมื่อพบ 1 คน',
}

export function RoutingPanel({ companyId, departmentId, categories, topics, categoryId, topicId, onCategory, onTopic }: {
  companyId: string; departmentId: string; categories: TicketCategoryDto[]; topics: TicketTopicDto[]
  categoryId: string; topicId: string; onCategory: (id: string) => void; onTopic: (id: string) => void
}) {
  const scope = { companyId, departmentId, categoryId: categoryId || undefined, topicId: topicId || undefined }
  const { data: responsibilities = [] } = useResponsibilities(scope)
  const { data: employees = [] } = useResponsibilityEmployees(companyId, departmentId)
  const { data: coverage } = useRoutingCoverage(companyId, departmentId)
  const mutations = useRoutingMutations(scope)
  const [employeeId, setEmployeeId] = useState('')
  const category = categories.find(item => item.id === categoryId)
  const topic = topics.find(item => item.id === topicId)

  async function add() {
    if (!categoryId || !employeeId) return toast.error('เลือกขอบเขตและพนักงานก่อน')
    try {
      await mutations.create.mutateAsync({ ...scope, categoryId, topicId: topicId || undefined, employeeId })
      setEmployeeId('')
      toast.success('เพิ่มผู้รับผิดชอบแล้ว')
    } catch (error) { toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'เพิ่มผู้รับผิดชอบไม่สำเร็จ') }
  }

  async function preview() {
    if (!categoryId || !topicId) return toast.error('เลือกหมวดย่อยก่อนทดสอบ')
    const result = await mutations.preview.mutateAsync({ companyId, departmentId, categoryId, topicId })
    const resultText = result.outcome === 'AutoAssigned' ? `มอบหมายอัตโนมัติให้ ${result.candidates[0]?.employeeName}`
      : result.outcome === 'SupervisorQueue' ? `ส่งเข้า Supervisor (${result.candidates.length} ผู้รับผิดชอบ)` : 'ไม่พบผู้รับผิดชอบ ส่งเข้า Supervisor'
    toast.success(resultText)
  }

  return (
    <div className="space-y-5">
      {coverage && <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ['หมวดย่อยทั้งหมด', coverage.totalTopics], ['ครอบคลุมแล้ว', coverage.coveredTopics], ['ยังไม่มีผู้ดูแล', coverage.uncoveredTopics],
          ['ตั้ง Auto', coverage.autoAssignTopics], ['Auto แต่หลายคน', coverage.autoAssignWithMultipleCandidates], ['ผู้ดูแลระดับหมวด', coverage.categoryFallbacks],
        ].map(([label, value]) => <div key={label} className="border-y border-border px-3 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}
      </div>}

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <section className="space-y-4 border-r border-border pr-4">
          <div><Label>หมวด</Label><Select value={categoryId} onChange={event => { onCategory(event.target.value); onTopic('') }}><option value="">เลือกหมวด</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></div>
          <div><Label>หมวดย่อย (เว้นว่าง = ดูแลทั้งหมวด)</Label><Select value={topicId} disabled={!categoryId} onChange={event => onTopic(event.target.value)}><option value="">ระดับหมวด / ทุกหมวดย่อย</option>{topics.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></div>
          {topic ? <div><Label>วิธีมอบหมายของหัวข้อ</Label><Select value={topic.routingMode} onChange={event => mutations.topicMode.mutate({ id: topic.id, mode: event.target.value as TicketRoutingMode })}>{Object.entries(modeLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></div>
            : category && <><p className="text-xs text-muted-foreground">ผู้รับผิดชอบระดับหมวดรับงานได้จากทุกหมวดย่อยในหมวดนี้</p><div><Label>วิธีมอบหมายระดับหมวด</Label><Select value={category.routingMode} onChange={event => mutations.categoryMode.mutate({ id: category.id, enableFallback: true, mode: event.target.value as TicketRoutingMode })}>{Object.entries(modeLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></div></>}
          <Button variant="outline" className="w-full" disabled={!topicId || mutations.preview.isPending} onClick={preview}><Route className="h-4 w-4" /> ทดสอบ Routing</Button>
        </section>

        <section>
          <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1"><Label>เพิ่มพนักงานรับผิดชอบ</Label><Select value={employeeId} disabled={!categoryId} onChange={event => setEmployeeId(event.target.value)}><option value="">เลือกพนักงานในแผนก</option>{employees.map(item => <option key={item.id} value={item.id}>{item.employeeName} · {item.employeeCode}</option>)}</Select></div>
            <Button disabled={!employeeId || mutations.create.isPending} onClick={add}><Plus className="h-4 w-4" /> เพิ่ม</Button>
          </div>
          <div className="divide-y divide-border">
            {responsibilities.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">ยังไม่มีผู้รับผิดชอบในขอบเขตนี้</p>}
            {responsibilities.map(item => <div key={item.id} className="flex min-h-16 items-center gap-3 py-3">
              <UserRound className="h-4 w-4 text-primary" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.employeeName} · {item.employeeCode}</p><p className="text-xs text-muted-foreground">{item.topicName ?? `${item.categoryName} (ทุกหมวดย่อย)`}</p></div>
              {!item.employeeIsEligible && <Badge variant="destructive">ไม่อยู่ในขอบเขต</Badge>}
              <Button size="icon" variant="ghost" title={item.isActive ? 'ปิดการรับผิดชอบ' : 'เปิดการรับผิดชอบ'} onClick={() => mutations.update.mutate({ id: item.id, isActive: !item.isActive, effectiveFrom: item.effectiveFrom, effectiveTo: item.effectiveTo, note: item.note, expectedUpdatedAt: item.updatedAt })}>{item.isActive ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}</Button>
            </div>)}
          </div>
        </section>
      </div>
    </div>
  )
}
