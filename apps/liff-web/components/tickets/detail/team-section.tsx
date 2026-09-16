'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle2, Crown, Loader2, Sparkles, UserRound, UserRoundPlus, UserRoundX } from 'lucide-react'
import { toast } from 'sonner'
import type { TicketDetailDto, TicketTeamMemberDto } from '@hrms/shared-types'
import {
  useAddTicketTeamMembers,
  useApplyTicketTeamTemplate,
  useRemoveTicketTeamMember,
  useTicketAssignmentCandidates,
  useTicketTeamTemplateOptions,
} from '@/hooks/use-tickets'
import { useApiError } from '@/hooks/use-api-error'
import { BottomSheet, Section } from './ticket-detail-shared'

/**
 * ทีมงานของใบแจ้งเรื่อง — ผู้รับผิดชอบหลัก 1 คน + ผู้ร่วมงาน
 * บนมือถือใช้ BottomSheet เลือกทีละหลายคน แทน dropdown ที่กดยากบนจอเล็ก
 */
export function TeamSection({ ticket }: { ticket: TicketDetailDto }) {
  const t = useTranslations('liff.ticket.detail.team')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const errorFallback = tCommon('state.error')
  const canManage = ticket.actions.canManageTeam
  const candidatesQuery = useTicketAssignmentCandidates(ticket.id, canManage)
  const addMembers = useAddTicketTeamMembers(ticket.id)
  const removeMember = useRemoveTicketTeamMember(ticket.id)
  const applyTemplate = useApplyTicketTeamTemplate(ticket.id)
  const templateOptions = useTicketTeamTemplateOptions(ticket.id, canManage)
  const [showPicker, setShowPicker] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [removingId, setRemovingId] = useState<string>()
  const [applyingId, setApplyingId] = useState<string>()

  const owner = ticket.teamMembers.find(member => member.memberRole === 'Owner')
  const members = ticket.teamMembers.filter(member => member.memberRole === 'Member')
  const inTeam = new Set(ticket.teamMembers.map(member => member.employeeId))
  const options = (candidatesQuery.data ?? []).filter(candidate =>
    !inTeam.has(candidate.employeeId) && candidate.employeeId !== ticket.requesterEmployeeId)

  function toggle(employeeId: string) {
    setSelected(current => current.includes(employeeId)
      ? current.filter(item => item !== employeeId)
      : [...current, employeeId])
  }

  async function submit() {
    if (selected.length === 0) return toast.error(t('selectRequired'))
    try {
      await addMembers.mutateAsync({
        employeeIds: selected,
        note: note.trim() || undefined,
        expectedUpdatedAt: ticket.updatedAt,
      })
      toast.success(t('added'))
      setSelected([])
      setNote('')
      setShowPicker(false)
    } catch (error) {
      toast.error(apiError(error, errorFallback))
    }
  }

  async function remove(member: TicketTeamMemberDto) {
    setRemovingId(member.employeeId)
    try {
      await removeMember.mutateAsync({
        employeeId: member.employeeId,
        expectedUpdatedAt: ticket.updatedAt,
      })
      toast.success(t('removed'))
    } catch (error) {
      toast.error(apiError(error, errorFallback))
    } finally {
      setRemovingId(undefined)
    }
  }

  async function runTemplate(templateId: string) {
    setApplyingId(templateId)
    try {
      await applyTemplate.mutateAsync({ templateId, expectedUpdatedAt: ticket.updatedAt })
      toast.success(t('templateApplied'))
    } catch (error) {
      toast.error(apiError(error, errorFallback))
    } finally {
      setApplyingId(undefined)
    }
  }

  const usableTemplates = (templateOptions.data ?? []).filter(option => option.addableCount > 0)

  // ไม่มีทั้งทีมและสิทธิ์จัดทีม = ไม่ต้องเปลืองพื้นที่จอ
  if (!owner && !canManage) return null

  return (
    <Section title={t('title')}>
      {!owner ? (
        <p className="text-sm text-muted-foreground">{t('noOwner')}</p>
      ) : (
        <ul className="space-y-2">
          {[owner, ...members].map(member => (
            <li key={member.assignmentId} className="flex items-start gap-3 rounded-md border border-border p-3">
              <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                member.memberRole === 'Owner' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                {member.memberRole === 'Owner' ? <Crown className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{member.employeeName}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {member.memberRole === 'Owner' ? t('owner') : t('member')}
                  {member.departmentName ? ` · ${member.departmentName}` : ''}
                </p>
                {member.note && <p className="mt-1 text-xs text-muted-foreground">{member.note}</p>}
              </div>
              {member.canRemove && (
                <button
                  type="button"
                  aria-label={t('removeMember', { name: member.employeeName })}
                  disabled={!!removingId}
                  onClick={() => remove(member)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-destructive active:bg-destructive/10 disabled:opacity-50"
                >
                  {removingId === member.employeeId
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <UserRoundX className="h-4 w-4" />}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-md border border-dashed border-primary text-sm font-semibold text-primary"
        >
          <UserRoundPlus className="h-4 w-4" /> {t('addMember')}
        </button>
      )}

      {canManage && usableTemplates.length > 0 && (
        <div className="mt-3 space-y-2 rounded-md border border-dashed border-border p-3">
          <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> {t('templates')}
          </p>
          <div className="flex flex-wrap gap-2">
            {usableTemplates.map(option => (
              <button
                key={option.id}
                type="button"
                disabled={!!applyingId}
                onClick={() => runTemplate(option.id)}
                className="flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium active:bg-primary/10 disabled:opacity-50"
              >
                {applyingId === option.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {option.name} (+{option.addableCount})
              </button>
            ))}
          </div>
        </div>
      )}

      {owner && (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">{t('memberHint')}</p>
      )}

      {showPicker && (
        <BottomSheet title={t('addMember')} onClose={() => setShowPicker(false)}>
          {candidatesQuery.isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('loadingCandidates')}</p>
          ) : options.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('noCandidates')}</p>
          ) : (
            <ul className="max-h-64 space-y-1 overflow-y-auto">
              {options.map(candidate => {
                const checked = selected.includes(candidate.employeeId)
                return (
                  <li key={candidate.employeeId}>
                    <button
                      type="button"
                      onClick={() => toggle(candidate.employeeId)}
                      className={`flex min-h-12 w-full items-center gap-3 rounded-md border px-3 py-2 text-left ${
                        checked ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                      }`}>
                        {checked && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{candidate.employeeName}</span>
                        <span className="block text-xs text-muted-foreground">
                          {[candidate.departmentName, t('activeCount', { count: candidate.activeTicketCount }),
                            candidate.teamTicketCount > 0 ? t('teamCount', { count: candidate.teamTicketCount }) : null]
                            .filter(Boolean).join(' · ')}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <label className="mt-4 block text-sm font-medium">
            {t('scope')}
            <textarea
              rows={3}
              maxLength={1000}
              value={note}
              onChange={event => setNote(event.target.value)}
              placeholder={t('optional')}
              className="mt-2 w-full resize-none rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-primary"
            />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setShowPicker(false)} className="h-11 rounded-md border border-border text-sm font-semibold">
              {tCommon('action.cancel')}
            </button>
            <button
              type="button"
              disabled={selected.length === 0 || addMembers.isPending}
              onClick={submit}
              className="flex h-11 items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {addMembers.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {selected.length > 0 ? t('addCount', { count: selected.length }) : t('add')}
            </button>
          </div>
        </BottomSheet>
      )}
    </Section>
  )
}
