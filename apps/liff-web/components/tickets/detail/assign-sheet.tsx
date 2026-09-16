'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { TicketAssignmentCandidateDto, TicketDetailDto } from '@hrms/shared-types'
import { useAssignTicket } from '@/hooks/use-tickets'
import { useMe } from '@/hooks/use-employee'
import { useApiError } from '@/hooks/use-api-error'
import { BottomSheet } from './ticket-detail-shared'

// มอบหมาย / เปลี่ยนผู้รับผิดชอบหลักของใบแจ้งเรื่อง
export function AssignSheet({
  ticket,
  candidates,
  onClose,
}: {
  ticket: TicketDetailDto
  candidates: TicketAssignmentCandidateDto[]
  onClose: () => void
}) {
  const t = useTranslations('liff.ticket.detail.assign')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const assign = useAssignTicket(ticket.id)
  const { data: me } = useMe()
  const [employeeId, setEmployeeId] = useState(ticket.currentAssignment?.assignedToEmployeeId ?? '')
  const [note, setNote] = useState('')
  // งานที่เริ่มดำเนินการแล้ว backend บังคับให้ระบุเหตุผลที่เปลี่ยนตัว — ต้องบอกในฟอร์ม ไม่ให้เจอ error หลังกด
  const noteRequired = ticket.status === 'InProgress' || ticket.status === 'WaitingInfo'
  // ผู้แจ้งที่เป็นหัวหน้าแผนกปลายทางต้องจ่ายงานเข้าตัวเองได้ (เปิดเรื่องเองแล้วทำเอง)
  // จึงห้ามตัดตัวเองออกเพราะเป็นผู้แจ้ง — ตัดเฉพาะกรณีที่ถือใบนี้อยู่แล้ว
  const selfCandidate = me?.id ? candidates.find(candidate => candidate.employeeId === me.id) : undefined
  const alreadyMine = !!me?.id && me.id === ticket.currentAssignment?.assignedToEmployeeId
  const canPickSelf = !!selfCandidate && !alreadyMine
  // รายชื่อมีเฉพาะพนักงานของบริษัทปลายทาง — บัญชีข้ามบริษัทจะไม่อยู่ในลิสต์และ backend ก็ปฏิเสธ
  const selfOutOfScope = !!me?.id && !selfCandidate

  async function submit() {
    if (!employeeId) return toast.error(t('assigneeRequired'))
    if (noteRequired && !note.trim()) {
      return toast.error(t('reasonRequired'))
    }
    try {
      await assign.mutateAsync({
        assignedToEmployeeId: employeeId,
        note: note.trim() || undefined,
        expectedUpdatedAt: ticket.updatedAt,
      })
      toast.success(ticket.currentAssignment ? t('reassigned') : t('assigned'))
      onClose()
    } catch (error) {
      toast.error(apiError(error, tCommon('state.error')))
    }
  }

  return (
    <BottomSheet title={ticket.currentAssignment ? t('reassignTitle') : t('assignTitle')} onClose={onClose}>
      <div className="space-y-4">
        <label className="block space-y-1.5 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-medium">{t('assignee')} <span className="text-destructive">*</span></span>
            {canPickSelf && (
              <button type="button" onClick={() => setEmployeeId(me!.id)} className="text-xs font-medium text-primary">
                {t('assignSelf')}
              </button>
            )}
          </div>
          <select value={employeeId} onChange={event => setEmployeeId(event.target.value)} className="h-11 w-full rounded-md border border-border bg-background px-3 outline-none focus:border-primary">
            <option value="">{t('selectEmployee')}</option>
            {candidates.map(candidate => (
              <option key={candidate.employeeId} value={candidate.employeeId}>
                {candidate.isRecommended ? t('recommended') : ''}{candidate.employeeName}
                {me?.id === candidate.employeeId ? t('me') : ''}
                {!candidate.isInTargetDepartment && candidate.departmentName ? ` · ${candidate.departmentName}` : ''}
                {t('activeCount', { count: candidate.activeTicketCount })}
              </option>
            ))}
          </select>
          {alreadyMine && (
            <span className="block text-xs text-muted-foreground">{t('alreadyMine')}</span>
          )}
          {selfOutOfScope && (
            <span className="block text-xs text-muted-foreground">{t('selfOutOfScope')}</span>
          )}
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">
            {noteRequired ? `${t('reasonLabel')} ` : t('noteLabel')}
            {noteRequired && <span className="text-destructive">*</span>}
          </span>
          <textarea
            rows={4}
            maxLength={1000}
            value={note}
            onChange={event => setNote(event.target.value)}
            placeholder={noteRequired ? t('reasonPlaceholder') : undefined}
            className="w-full resize-none rounded-md border border-border bg-background p-3 outline-none focus:border-primary"
          />
          {noteRequired && (
            <span className="block text-xs text-muted-foreground">{t('reasonHint')}</span>
          )}
        </label>
        <button type="button" disabled={assign.isPending} onClick={submit} className="flex h-11 w-full items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {assign.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('confirm')}
        </button>
      </div>
    </BottomSheet>
  )
}
