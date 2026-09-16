'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Plus, Pencil, Trash2, CheckCircle2, XCircle, Ban,
  ToggleRight, ToggleLeft, UserPlus, UserMinus,
  Shield, ShieldOff, Settings2, Copy, Check, X,
  Clock, CalendarDays, User, Building2, Layers,
  MapPin, FileText, Gift, Tag, Lock, ClipboardList,
  Calendar, FolderTree, PlayCircle, Paperclip,
  MessageSquare, HelpCircle, RotateCw, Undo2, Route,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AuditLogDto } from '@hrms/shared-types'
import * as fmt from '@hrms/i18n/format'

// ── Module Config ──────────────────────────────────────────────────────────────
// ป้ายชื่อ module/action อยู่ที่ `admin.settings.audit.module.*` / `.action.*` — ที่นี่เหลือแค่ไอคอนกับโทนสี

export type BadgeConfig = {
  icon:   React.ElementType
  bg:     string
  text:   string
  border: string
}

export const MODULE_CONFIG: Record<string, BadgeConfig> = {
  attendance:           { icon: Clock,          bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-l-blue-400' },
  leave:                { icon: Calendar,       bg: 'bg-orange-100',  text: 'text-orange-700',  border: 'border-l-orange-400' },
  employee:             { icon: User,           bg: 'bg-violet-100',  text: 'text-violet-700',  border: 'border-l-violet-400' },
  company:              { icon: Building2,      bg: 'bg-slate-100',   text: 'text-slate-700',   border: 'border-l-slate-400' },
  department:           { icon: Layers,         bg: 'bg-sky-100',     text: 'text-sky-700',     border: 'border-l-sky-400' },
  location:             { icon: MapPin,         bg: 'bg-green-100',   text: 'text-green-700',   border: 'border-l-green-400' },
  shift:                { icon: Clock,          bg: 'bg-indigo-100',  text: 'text-indigo-700',  border: 'border-l-indigo-400' },
  'attendance-policy':  { icon: ClipboardList,  bg: 'bg-cyan-100',    text: 'text-cyan-700',    border: 'border-l-cyan-400' },
  'leave-type':         { icon: FileText,       bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-l-amber-400' },
  holiday:              { icon: Gift,           bg: 'bg-rose-100',    text: 'text-rose-700',    border: 'border-l-rose-400' },
  'role-label':         { icon: Tag,            bg: 'bg-teal-100',    text: 'text-teal-700',    border: 'border-l-teal-400' },
  'weekly-holiday':     { icon: CalendarDays,   bg: 'bg-pink-100',    text: 'text-pink-700',    border: 'border-l-pink-400' },
  permission:           { icon: Lock,           bg: 'bg-yellow-100',  text: 'text-yellow-700',  border: 'border-l-yellow-400' },
  expense:              { icon: ClipboardList,  bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-l-emerald-400' },
  ticket:               { icon: FolderTree,     bg: 'bg-fuchsia-100', text: 'text-fuchsia-700', border: 'border-l-fuchsia-400' },
  memo:                 { icon: FileText,       bg: 'bg-lime-100',    text: 'text-lime-700',    border: 'border-l-lime-400' },
  system:               { icon: Settings2,      bg: 'bg-gray-100',    text: 'text-gray-700',    border: 'border-l-gray-400' },
}

/** module ที่ให้เลือกในตัวกรอง (ตามลำดับที่แสดง) */
export const FILTER_MODULES = [
  'attendance', 'leave', 'employee', 'company', 'department', 'location', 'shift',
  'attendance-policy', 'leave-type', 'holiday', 'role-label', 'weekly-holiday',
  'permission', 'expense', 'ticket', 'memo',
] as const

// ── Action Config ──────────────────────────────────────────────────────────────

export type ActionConfig = {
  icon:  React.ElementType
  bg:    string
  text:  string
  ring:  string
}

export const ACTION_CONFIG: Record<string, ActionConfig> = {
  create:                 { icon: Plus,          bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-300' },
  update:                 { icon: Pencil,        bg: 'bg-blue-100',    text: 'text-blue-700',    ring: 'ring-blue-300' },
  delete:                 { icon: Trash2,        bg: 'bg-red-100',     text: 'text-red-700',     ring: 'ring-red-300' },
  activate:               { icon: ToggleRight,   bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-300' },
  deactivate:             { icon: ToggleLeft,    bg: 'bg-red-100',     text: 'text-red-700',     ring: 'ring-red-300' },
  approve:                { icon: CheckCircle2,  bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-300' },
  reject:                 { icon: XCircle,       bg: 'bg-red-100',     text: 'text-red-700',     ring: 'ring-red-300' },
  cancel:                 { icon: Ban,           bg: 'bg-orange-100',  text: 'text-orange-700',  ring: 'ring-orange-300' },
  'create-draft':         { icon: Plus,          bg: 'bg-slate-100',   text: 'text-slate-700',   ring: 'ring-slate-300' },
  'update-draft':         { icon: Pencil,        bg: 'bg-blue-100',    text: 'text-blue-700',    ring: 'ring-blue-300' },
  submit:                 { icon: CheckCircle2,  bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-300' },
  'submit-draft':         { icon: CheckCircle2,  bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-300' },
  'ocr-enqueue':          { icon: FileText,      bg: 'bg-cyan-100',    text: 'text-cyan-700',    ring: 'ring-cyan-300' },
  'ocr-apply':            { icon: FileText,      bg: 'bg-indigo-100',  text: 'text-indigo-700',  ring: 'ring-indigo-300' },
  'export-expense-claims': { icon: ClipboardList, bg: 'bg-teal-100',   text: 'text-teal-700',    ring: 'ring-teal-300' },
  'create-expense-billing-batch': { icon: ClipboardList, bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-300' },
  'export-expense-billing-batch': { icon: ClipboardList, bg: 'bg-teal-100', text: 'text-teal-700', ring: 'ring-teal-300' },
  'mark-expense-billing-batch-paid': { icon: CheckCircle2, bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-300' },
  'cancel-expense-billing-batch': { icon: Ban, bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-300' },
  'start-work':           { icon: PlayCircle,    bg: 'bg-blue-100',    text: 'text-blue-700',    ring: 'ring-blue-300' },
  resolve:                { icon: CheckCircle2,  bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-300' },
  close:                  { icon: CheckCircle2,  bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-300' },
  'return-for-revision':  { icon: Undo2,         bg: 'bg-orange-100',  text: 'text-orange-700',  ring: 'ring-orange-300' },
  'requester-confirm-completion': { icon: CheckCircle2, bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-300' },
  'add-comment':          { icon: MessageSquare, bg: 'bg-slate-100',   text: 'text-slate-700',   ring: 'ring-slate-300' },
  'request-info':         { icon: HelpCircle,    bg: 'bg-amber-100',   text: 'text-amber-700',   ring: 'ring-amber-300' },
  'resume-work':          { icon: RotateCw,      bg: 'bg-blue-100',    text: 'text-blue-700',    ring: 'ring-blue-300' },
  'update-work-detail':   { icon: Pencil,        bg: 'bg-blue-100',    text: 'text-blue-700',    ring: 'ring-blue-300' },
  'add-attachment':       { icon: Paperclip,     bg: 'bg-cyan-100',    text: 'text-cyan-700',    ring: 'ring-cyan-300' },
  'remove-attachment':    { icon: Trash2,        bg: 'bg-red-100',     text: 'text-red-700',     ring: 'ring-red-300' },
  'auto-route-topic':     { icon: Route,         bg: 'bg-indigo-100',  text: 'text-indigo-700',  ring: 'ring-indigo-300' },
  'auto-route-category':  { icon: Route,         bg: 'bg-indigo-100',  text: 'text-indigo-700',  ring: 'ring-indigo-300' },
  'routing-multiple-candidates': { icon: Route, bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-300' },
  'routing-no-match':     { icon: Route,         bg: 'bg-gray-100',    text: 'text-gray-700',    ring: 'ring-gray-300' },
  'add-role':             { icon: UserPlus,      bg: 'bg-violet-100',  text: 'text-violet-700',  ring: 'ring-violet-300' },
  'remove-role':          { icon: UserMinus,     bg: 'bg-rose-100',    text: 'text-rose-700',    ring: 'ring-rose-300' },
  grant:                  { icon: Shield,        bg: 'bg-violet-100',  text: 'text-violet-700',  ring: 'ring-violet-300' },
  revoke:                 { icon: ShieldOff,     bg: 'bg-rose-100',    text: 'text-rose-700',    ring: 'ring-rose-300' },
  'set-role-permissions': { icon: Settings2,     bg: 'bg-indigo-100',  text: 'text-indigo-700',  ring: 'ring-indigo-300' },
  'bulk-create':          { icon: Copy,          bg: 'bg-teal-100',    text: 'text-teal-700',    ring: 'ring-teal-300' },
}

/** action ที่ให้เลือกในตัวกรอง จัดกลุ่มตามหัวข้อ (label ของกลุ่มอยู่ที่ `actionGroup.*`) */
export const FILTER_ACTION_GROUPS: { key: string; actions: string[] }[] = [
  { key: 'data',       actions: ['create', 'update', 'delete', 'bulk-create'] },
  { key: 'status',     actions: ['activate', 'deactivate'] },
  { key: 'leave',      actions: ['approve', 'reject', 'cancel'] },
  { key: 'billing',    actions: [
    'create-draft', 'update-draft', 'submit', 'submit-draft', 'export-expense-claims',
    'create-expense-billing-batch', 'export-expense-billing-batch',
    'mark-expense-billing-batch-paid', 'cancel-expense-billing-batch',
  ] },
  { key: 'ocr',        actions: ['ocr-enqueue', 'ocr-apply'] },
  { key: 'permission', actions: ['add-role', 'remove-role', 'grant', 'revoke', 'set-role-permissions'] },
  { key: 'ticket',     actions: [
    'start-work', 'resolve', 'close', 'return-for-revision', 'requester-confirm-completion',
    'add-comment', 'request-info', 'resume-work', 'update-work-detail',
    'add-attachment', 'remove-attachment', 'auto-route-topic', 'auto-route-category',
    'routing-multiple-candidates', 'routing-no-match',
  ] },
]

export const DEFAULT_ACTION: ActionConfig = {
  icon: Settings2, bg: 'bg-gray-100', text: 'text-gray-700', ring: 'ring-gray-300',
}

export const DEFAULT_MODULE: BadgeConfig = {
  icon: Settings2, bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-l-gray-400',
}

// ── Date helpers ───────────────────────────────────────────────────────────────

export function fmtDate(dt: string) {
  return fmt.formatDate(new Date(dt), {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'Asia/Bangkok',
  })
}

export function fmtDateShort(dt: string) {
  return fmt.formatDate(new Date(dt), {
    day: 'numeric', month: 'short', year: '2-digit',
    timeZone: 'Asia/Bangkok',
  })
}

export function fmtTime(dt: string) {
  return fmt.formatTime(new Date(dt), {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'Asia/Bangkok',
  })
}

// ── Avatar (LINE profile picture, fallback initials) ───────────────────────────

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-orange-500',
  'bg-rose-500', 'bg-teal-500', 'bg-indigo-500', 'bg-fuchsia-500',
]

export function UserAvatar({ name, avatarUrl }: { name?: string | null; avatarUrl?: string | null }) {
  const t = useTranslations('admin.settings.audit')
  const [imgError, setImgError] = useState(false)
  const display = name?.trim() || t('unknownUser')
  let hash = 0
  for (let i = 0; i < display.length; i++) hash = (hash * 31 + display.charCodeAt(i)) >>> 0
  const color = AVATAR_COLORS[hash % AVATAR_COLORS.length]
  const initial = display.charAt(0).toUpperCase()

  if (avatarUrl && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={display}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className="h-8 w-8 shrink-0 rounded-full object-cover border border-border"
      />
    )
  }

  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${color}`}>
      {initial}
    </span>
  )
}

// ── Badges ─────────────────────────────────────────────────────────────────────

export function ModuleBadge({ module }: { module: string }) {
  const t = useTranslations('admin.settings.audit')
  const cfg = MODULE_CONFIG[module] ?? DEFAULT_MODULE
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <Icon className="h-3 w-3" />
      {t(MODULE_CONFIG[module] ? `module.${module}` : 'module.other')}
    </span>
  )
}

export function ActionText({ action }: { action: string }) {
  const t = useTranslations('admin.settings.audit')
  const cfg = ACTION_CONFIG[action] ?? DEFAULT_ACTION
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide ${cfg.text}`}>
      <Icon className="h-3.5 w-3.5" />
      {t(ACTION_CONFIG[action] ? `action.${action}` : 'action.other')}
    </span>
  )
}

export function ActionBadge({ action }: { action: string }) {
  const t = useTranslations('admin.settings.audit')
  const cfg = ACTION_CONFIG[action] ?? DEFAULT_ACTION
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${cfg.bg} ${cfg.text} ${cfg.ring}`}>
      <Icon className="h-3 w-3" />
      {t(ACTION_CONFIG[action] ? `action.${action}` : 'action.other')}
    </span>
  )
}

// ── Entity ID chip ─────────────────────────────────────────────────────────────

export function EntityIdChip({ id }: { id: string }) {
  return (
    <span className="inline-block rounded border border-border bg-whited/60 px-2 py-0.5 font-mono text-xs text-muted-foreground">
      {id.length > 12 ? `${id.slice(0, 12)}…` : id}
    </span>
  )
}

// ── Copy button ────────────────────────────────────────────────────────────────

export function CopyButton({ value }: { value: string }) {
  const t = useTranslations('admin.settings.audit')
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
      title={t('copy')}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

// ── Detail Slide-over Panel ────────────────────────────────────────────────────

export function AuditLogDetailPanel({ log, open, onClose }: { log: AuditLogDto | null; open: boolean; onClose: () => void }) {
  const t = useTranslations('admin.settings.audit')
  const tCommon = useTranslations('common')
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const parseJson = (s?: string | null) => {
    if (!s) return null
    try { return JSON.parse(s) } catch { return s }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      />

      {/* Panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-background shadow-2xl transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {log && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div className="min-w-0">
                <h2 className="text-base font-semibold">{t('detailTitle')}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <ModuleBadge module={log.module} />
                  <ActionBadge action={log.action} />
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-whited hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Description */}
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">{t('description')}</div>
                <p className="text-sm text-foreground leading-relaxed">{log.description}</p>
              </div>

              {/* Performer + Time */}
              <div className="rounded-lg border border-border p-3 space-y-3">
                <div className="flex items-center gap-3">
                  <UserAvatar name={log.performedByName} avatarUrl={log.performedByAvatarUrl} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{log.performedByName ?? t('unknownUser')}</div>
                    <div className="text-xs text-muted-foreground">{t('performer')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4 shrink-0" />
                  <span>{fmtDate(log.performedAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span className="font-mono">{t('timeAt', { time: fmtTime(log.performedAt) })}</span>
                </div>
              </div>

              {/* Entity info */}
              <div className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Entity Type</span>
                  <span className="text-sm font-mono">{log.entityType}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Entity ID</span>
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm font-mono truncate">{log.entityId}</span>
                    <CopyButton value={log.entityId} />
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Log ID</span>
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm font-mono truncate">{log.id}</span>
                    <CopyButton value={log.id} />
                  </span>
                </div>
              </div>

              {/* Old / New values */}
              {(log.oldValues || log.newValues) && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2">{t('changes')}</div>
                  <div className="space-y-3">
                    {log.oldValues && (
                      <div>
                        <div className="mb-1 flex items-center gap-1 text-xs font-medium text-red-500">
                          <span className="h-2 w-2 rounded-full bg-red-400 inline-block" />
                          {t('beforeChange')}
                        </div>
                        <pre className="rounded-md border border-border border-l-4 border-l-red-400 bg-whited/60 p-2 text-xs overflow-x-auto text-foreground">
                          {JSON.stringify(parseJson(log.oldValues), null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.newValues && (
                      <div>
                        <div className="mb-1 flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />
                          {t('afterChange')}
                        </div>
                        <pre className="rounded-md border border-border border-l-4 border-l-emerald-400 bg-whited/60 p-2 text-xs overflow-x-auto text-foreground">
                          {JSON.stringify(parseJson(log.newValues), null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border px-5 py-3">
              <Button variant="outline" size="sm" onClick={onClose} className="w-full">
                {tCommon('action.close')}
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
