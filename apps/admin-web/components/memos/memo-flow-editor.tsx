'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowDown, ArrowUp, CheckCircle2, Lock, Pencil, Plus, Power, PowerOff, Send, Truck, UserCheck, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import type { MemoStepKind, MemoTypeDto, MemoWorkflowStepDto, RoleType } from '@hrms/shared-types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import {
  useCreateMemoWorkflowStep,
  useMemoWorkflowSteps,
  useSetMemoTypeFirstApprover,
  useToggleMemoWorkflowStepStatus,
  useUpdateMemoWorkflowStep,
} from '@/hooks/use-memo'
import { useEmployees } from '@/hooks/use-employees'
import { localizedName, type Locale } from '@hrms/i18n'
import { useApiError } from '@/hooks/use-api-error'

// ป้ายตำแหน่งอยู่ที่ @hrms/i18n/labels (status.roleType) — ที่นี่เหลือแค่ลำดับตัวเลือก
const STEP_ROLES: RoleType[] = ['Supervisor', 'Executive', 'Hr', 'Admin', 'Employee']
const APPROVER_ROLES: RoleType[] = ['Executive', 'Admin', 'Supervisor', 'Hr']

// แถวหนึ่งขั้นตอนในลำดับ — ขั้นมาตรฐานจะ locked (พื้นเทา ไม่มีปุ่มแก้)
function FlowRow({
  no,
  icon,
  title,
  detail,
  locked,
  badge,
  actions,
}: {
  no?: number
  icon: React.ReactNode
  title: string
  detail: string
  locked?: boolean
  badge?: React.ReactNode
  actions?: React.ReactNode
}) {
  const t = useTranslations('admin.settings.memoFlow')
  return (
    <div className={`flex items-center gap-3 px-3 py-3 ${locked ? 'bg-muted/40' : ''}`}>
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        locked ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
      }`}>
        {no ?? '—'}
      </span>
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium">{title}</span>
          {badge}
          {locked && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" /> {t('standardStep')}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</p>
      </div>
      {actions}
    </div>
  )
}

function FirstApproverForm({
  memoType,
  onClose,
}: {
  memoType: MemoTypeDto
  onClose: () => void
}) {
  const t = useTranslations('admin.settings.memoFlow')
  const tRole = useTranslations('status.roleType')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const [roleCode, setRoleCode] = useState<RoleType>(memoType.firstApproverRoleCode ?? 'Executive')
  const [mode, setMode] = useState<'all' | 'specific'>(memoType.firstApproverEmployeeId ? 'specific' : 'all')
  const [employeeId, setEmployeeId] = useState(memoType.firstApproverEmployeeId ?? '')
  const [error, setError] = useState('')

  const { data: candidates } = useEmployees({ role: roleCode, isActive: true, pageSize: 200 })
  const save = useSetMemoTypeFirstApprover()

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mode === 'specific' && !employeeId) return setError(t('selectApproverRequired'))
    setError('')
    try {
      await save.mutateAsync({
        id: memoType.id,
        roleCode,
        employeeId: mode === 'specific' ? employeeId : null,
      })
      toast.success(t('approverSaved'))
      onClose()
    } catch (err) {
      setError(apiError(err, tCommon('state.error')))
    }
  }

  return (
    <Modal open onClose={onClose} title={t('approverTitle')}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-xs text-muted-foreground">{t('approverHint')}</p>

        <div className="space-y-1.5">
          <Label htmlFor="approver-role">{t('roleLabel')} *</Label>
          <Select
            id="approver-role"
            value={roleCode}
            onChange={event => { setRoleCode(event.target.value as RoleType); setEmployeeId('') }}
          >
            {APPROVER_ROLES.map(role => (
              <option key={role} value={role}>{t('roleOption', { label: tRole(role), code: role })}</option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t('whoApproves')} *</Label>
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-3 text-sm hover:bg-muted/40">
            <input
              type="radio"
              className="mt-0.5"
              checked={mode === 'all'}
              onChange={() => { setMode('all'); setEmployeeId('') }}
            />
            <span>
              <span className="font-medium">{t('allWithRole')}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{t('allWithRoleHint')}</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-3 text-sm hover:bg-muted/40">
            <input
              type="radio"
              className="mt-0.5"
              checked={mode === 'specific'}
              onChange={() => setMode('specific')}
            />
            <span>
              <span className="font-medium">{t('specificPerson')}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{t('specificApproverHint')}</span>
            </span>
          </label>
          {mode === 'specific' && (
            <Select value={employeeId} onChange={event => setEmployeeId(event.target.value)}>
              <option value="">{t('selectEmployee')}</option>
              {(candidates?.items ?? []).map(employee => (
                <option key={employee.id} value={employee.id}>{employee.fullName}</option>
              ))}
            </Select>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>{tCommon('action.cancel')}</Button>
          <Button type="submit" loading={save.isPending}>{tCommon('action.save')}</Button>
        </div>
      </form>
    </Modal>
  )
}

function StepForm({
  initial,
  nextSortOrder,
  onClose,
  onSave,
}: {
  initial?: MemoWorkflowStepDto
  nextSortOrder: number
  onClose: () => void
  onSave: (values: {
    label: string; stepKind: MemoStepKind; assigneeRoleCode: RoleType
    assigneeEmployeeId: string | null; sortOrder: number
  }) => Promise<void>
}) {
  const t = useTranslations('admin.settings.memoFlow')
  const tRole = useTranslations('status.roleType')
  const tStepKind = useTranslations('status.memoStepKind')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const [label, setLabel] = useState(initial?.label ?? '')
  const [stepKind, setStepKind] = useState<MemoStepKind>(initial?.stepKind ?? 'Work')
  const [roleCode, setRoleCode] = useState<RoleType>(initial?.assigneeRoleCode ?? 'Supervisor')
  const [mode, setMode] = useState<'all' | 'specific'>(initial?.assigneeEmployeeId ? 'specific' : 'all')
  const [employeeId, setEmployeeId] = useState(initial?.assigneeEmployeeId ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const { data: employees } = useEmployees({ role: roleCode, isActive: true, pageSize: 200 })

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!label.trim()) return setError(t('stepNameRequired'))
    if (mode === 'specific' && !employeeId) return setError(t('selectAssigneeRequired'))

    setSaving(true)
    setError('')
    try {
      await onSave({
        label: label.trim(),
        stepKind,
        assigneeRoleCode: roleCode,
        assigneeEmployeeId: mode === 'specific' ? employeeId : null,
        sortOrder: initial?.sortOrder ?? nextSortOrder,
      })
      onClose()
    } catch (err) {
      setError(apiError(err, tCommon('state.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={initial ? t('editStepTitle') : t('addStepTitle')}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="step-label">{t('stepName')} *</Label>
          <Input
            id="step-label"
            value={label}
            onChange={event => setLabel(event.target.value)}
            maxLength={200}
            placeholder={t('stepNamePlaceholder')}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label>{t('stepKind')} *</Label>
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-3 text-sm hover:bg-muted/40">
            <input type="radio" className="mt-0.5" checked={stepKind === 'Work'} onChange={() => setStepKind('Work')} />
            <span>
              <span className="font-medium">{tStepKind('Work')}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{t('stepKindWorkHint')}</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-3 text-sm hover:bg-muted/40">
            <input type="radio" className="mt-0.5" checked={stepKind === 'Approval'} onChange={() => setStepKind('Approval')} />
            <span>
              <span className="font-medium">{tStepKind('Approval')}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{t('stepKindApprovalHint')}</span>
            </span>
          </label>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="step-role">{t('assigneeRole')} *</Label>
          <Select
            id="step-role"
            value={roleCode}
            onChange={event => { setRoleCode(event.target.value as RoleType); setEmployeeId('') }}
          >
            {STEP_ROLES.map(role => (
              <option key={role} value={role}>{t('roleOption', { label: tRole(role), code: role })}</option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t('whoAssigned')} *</Label>
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-3 text-sm hover:bg-muted/40">
            <input type="radio" className="mt-0.5" checked={mode === 'all'} onChange={() => { setMode('all'); setEmployeeId('') }} />
            <span>
              <span className="font-medium">{t('allWithRoleInUnit')}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{t('allWithRoleInUnitHint')}</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-3 text-sm hover:bg-muted/40">
            <input type="radio" className="mt-0.5" checked={mode === 'specific'} onChange={() => setMode('specific')} />
            <span>
              <span className="font-medium">{t('specificPerson')}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{t('specificAssigneeHint')}</span>
            </span>
          </label>
          {mode === 'specific' && (
            <Select value={employeeId} onChange={event => setEmployeeId(event.target.value)}>
              <option value="">{t('selectEmployee')}</option>
              {(employees?.items ?? []).map(employee => (
                <option key={employee.id} value={employee.id}>{employee.fullName}</option>
              ))}
            </Select>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>{tCommon('action.cancel')}</Button>
          <Button type="submit" loading={saving}>{tCommon('action.save')}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ลำดับขั้นตอนทั้งหมดของประเภทเรื่อง — เรียงเลขต่อเนื่องเหมือนที่ผู้ขอเห็นในหน้าติดตามสถานะ
// ขั้นมาตรฐาน (ส่งเรื่อง / แผนกรับทราบ / ส่งมอบ / ตรวจรับ) ล็อกไว้ แก้ได้แค่ผู้อนุมัติกับขั้นตอนที่เพิ่มเอง
export function MemoFlowEditor({ memoType }: { memoType: MemoTypeDto }) {
  const t = useTranslations('admin.settings.memoFlow')
  const tRole = useTranslations('status.roleType')
  const tStepKind = useTranslations('status.memoStepKind')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const locale = useLocale() as Locale
  const [stepForm, setStepForm] = useState<{ item?: MemoWorkflowStepDto } | null>(null)
  const [approverOpen, setApproverOpen] = useState(false)

  const { data: steps = [], isLoading } = useMemoWorkflowSteps(memoType.id, true)
  const createStep = useCreateMemoWorkflowStep()
  const updateStep = useUpdateMemoWorkflowStep()
  const toggleStep = useToggleMemoWorkflowStepStatus()

  const activeSteps = [...steps.filter(s => s.isActive)].sort((a, b) => a.sortOrder - b.sortOrder)
  const inactiveSteps = steps.filter(s => !s.isActive)
  const nextSortOrder = Math.max(0, ...activeSteps.map(s => s.sortOrder)) + 1
  const target = [
    localizedName({ name: memoType.companyName, nameEn: memoType.companyNameEn, nameId: memoType.companyNameId }, locale),
    localizedName({ name: memoType.departmentName, nameEn: memoType.departmentNameEn, nameId: memoType.departmentNameId }, locale),
  ].filter(Boolean).join(' / ')

  // ขั้นมาตรฐาน 3 ขั้นแรก แล้วต่อด้วยขั้นที่ตั้งค่าเอง จึงเริ่มนับขั้นเพิ่มเติมที่ 4
  const firstExtraNo = 4
  const deliverNo = firstExtraNo + activeSteps.length

  async function move(step: MemoWorkflowStepDto, direction: -1 | 1) {
    const index = activeSteps.findIndex(s => s.id === step.id)
    const swapWith = activeSteps[index + direction]
    if (!swapWith) return

    const payload = (s: MemoWorkflowStepDto, sortOrder: number) => ({
      id: s.id,
      label: s.label,
      stepKind: s.stepKind,
      assigneeRoleCode: s.assigneeRoleCode,
      assigneeEmployeeId: s.assigneeEmployeeId ?? null,
      sortOrder,
    })

    try {
      // พักตัวที่ถูกสลับไปลำดับว่างชั่วคราว เพราะ backend กันลำดับซ้ำในประเภทเรื่องเดียวกัน
      const parking = Math.max(0, ...steps.map(s => s.sortOrder)) + 1
      await updateStep.mutateAsync(payload(swapWith, parking))
      await updateStep.mutateAsync(payload(step, swapWith.sortOrder))
      await updateStep.mutateAsync(payload(swapWith, step.sortOrder))
    } catch (error) {
      toast.error(apiError(error, tCommon('state.error')))
    }
  }

  async function toggle(step: MemoWorkflowStepDto) {
    try {
      await toggleStep.mutateAsync({ id: step.id, isActive: !step.isActive })
      toast.success(step.isActive
        ? t('stepDeactivated', { name: step.label })
        : t('stepActivated', { name: step.label }))
    } catch (error) {
      toast.error(apiError(error, tCommon('state.error')))
    }
  }

  return (
    <section className="overflow-hidden rounded-md border border-border bg-background">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">{t('title')}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="divide-y divide-border">
        <FlowRow
          no={1}
          icon={<Send className="h-4 w-4" />}
          title={t('stepSubmitTitle')}
          detail={t('stepSubmitDetail')}
          locked
        />

        <FlowRow
          no={2}
          icon={<CheckCircle2 className="h-4 w-4" />}
          title={t('stepApproveTitle')}
          detail={t('stepApproveDetail', {
            assignee: memoType.firstApproverEmployeeName
              ?? t('assigneeEveryone', { role: tRole(memoType.firstApproverRoleCode ?? 'Executive') }),
          })}
          badge={<Badge>{tStepKind('Approval')}</Badge>}
          actions={
            <Button size="sm" variant="outline" onClick={() => setApproverOpen(true)}>
              <Pencil className="h-4 w-4" /> {t('changeApprover')}
            </Button>
          }
        />

        <FlowRow
          no={3}
          icon={<UserCheck className="h-4 w-4" />}
          title={t('stepAcknowledgeTitle')}
          detail={t('stepAcknowledgeDetail', { target })}
          locked
        />
      </div>

      <div className="flex items-center justify-between gap-2 border-y border-border bg-primary/5 px-4 py-2">
        <p className="text-xs font-medium text-primary">{t('extraStepsTitle')}</p>
        <Button size="sm" onClick={() => setStepForm({})}>
          <Plus className="h-4 w-4" /> {t('addStep')}
        </Button>
      </div>

      {isLoading ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">{tCommon('state.loading')}</div>
      ) : activeSteps.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">{t('noExtraSteps')}</div>
      ) : (
        <div className="divide-y divide-border">
          {activeSteps.map((step, index) => (
            <FlowRow
              key={step.id}
              no={firstExtraNo + index}
              icon={step.stepKind === 'Approval' ? <CheckCircle2 className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
              title={step.label}
              detail={step.assigneeEmployeeName
                ? t('stepDetailSpecific', { role: tRole(step.assigneeRoleCode), name: step.assigneeEmployeeName })
                : t('stepDetailAll', { role: tRole(step.assigneeRoleCode), target })}
              badge={
                <Badge variant={step.stepKind === 'Approval' ? 'default' : 'secondary'}>
                  {tStepKind(step.stepKind)}
                </Badge>
              }
              actions={
                <div className="flex shrink-0 items-center">
                  <Button size="icon" variant="ghost" title={t('moveUp')} disabled={index === 0} onClick={() => move(step, -1)}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title={t('moveDown')}
                    disabled={index === activeSteps.length - 1}
                    onClick={() => move(step, 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" title={t('editStep')} onClick={() => setStepForm({ item: step })}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" title={t('deactivateStep')} onClick={() => toggle(step)}>
                    <PowerOff className="h-4 w-4" />
                  </Button>
                </div>
              }
            />
          ))}
        </div>
      )}

      <div className="divide-y divide-border border-t border-border">
        <FlowRow
          no={deliverNo}
          icon={<Truck className="h-4 w-4" />}
          title={t('stepDeliverTitle')}
          detail={t('stepAcknowledgeDetail', { target })}
          locked
        />
        <FlowRow
          no={deliverNo + 1}
          icon={<UserCheck className="h-4 w-4" />}
          title={t('stepAcceptTitle')}
          detail={t('stepAcceptDetail')}
          locked
        />
      </div>

      {inactiveSteps.length > 0 && (
        <div className="border-t border-border">
          <p className="px-4 py-2 text-xs font-medium text-muted-foreground">{t('inactiveSteps')}</p>
          <div className="divide-y divide-border">
            {inactiveSteps.map(step => (
              <FlowRow
                key={step.id}
                icon={<Wrench className="h-4 w-4" />}
                title={step.label}
                detail={t('stepDetailSpecific', {
                  role: tRole(step.assigneeRoleCode),
                  name: step.assigneeEmployeeName ?? t('everyone'),
                })}
                badge={<Badge variant="secondary">{t('inactiveBadge')}</Badge>}
                actions={
                  <Button size="sm" variant="outline" onClick={() => toggle(step)}>
                    <Power className="h-4 w-4" /> {t('activateStep')}
                  </Button>
                }
              />
            ))}
          </div>
        </div>
      )}

      {approverOpen && (
        <FirstApproverForm memoType={memoType} onClose={() => setApproverOpen(false)} />
      )}

      {stepForm && (
        <StepForm
          initial={stepForm.item}
          nextSortOrder={nextSortOrder}
          onClose={() => setStepForm(null)}
          onSave={async values => {
            if (stepForm.item) {
              await updateStep.mutateAsync({ id: stepForm.item.id, ...values })
              toast.success(t('stepUpdated'))
            } else {
              await createStep.mutateAsync({ memoTypeId: memoType.id, ...values })
              toast.success(t('stepCreated'))
            }
          }}
        />
      )}
    </section>
  )
}
