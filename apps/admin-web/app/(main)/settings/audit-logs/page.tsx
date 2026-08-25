'use client'

import { useState } from 'react'
import {
  ShieldCheck, ChevronLeft, ChevronRight, RotateCcw,
  ChevronDown, ChevronRight as ChevronRt,
  Plus, Pencil, Trash2, CheckCircle2, XCircle, Ban,
  ToggleRight, ToggleLeft, UserPlus, UserMinus,
  Shield, ShieldOff, Settings2, Copy,
  Clock, CalendarDays, User, Building2, Layers,
  MapPin, FileText, Gift, Tag, Lock, ClipboardList,
  Calendar, Filter, FolderTree, PlayCircle, Paperclip,
  MessageSquare, HelpCircle, RotateCw, Undo2, Route,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useAuditLogs } from '@/hooks/use-audit-logs'
import { useAuthStore } from '@/stores/auth.store'
import type { AuditLogDto } from '@hrms/shared-types'

// ── Module Config ──────────────────────────────────────────────────────────────

type BadgeConfig = {
  label:  string
  icon:   React.ElementType
  bg:     string
  text:   string
  border: string
}

const MODULE_CONFIG: Record<string, BadgeConfig> = {
  attendance:           { label: 'การเข้างาน',          icon: Clock,          bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-l-blue-400' },
  leave:                { label: 'การลา',                icon: Calendar,       bg: 'bg-orange-100',  text: 'text-orange-700',  border: 'border-l-orange-400' },
  employee:             { label: 'พนักงาน',              icon: User,           bg: 'bg-violet-100',  text: 'text-violet-700',  border: 'border-l-violet-400' },
  company:              { label: 'บริษัท',               icon: Building2,      bg: 'bg-slate-100',   text: 'text-slate-700',   border: 'border-l-slate-400' },
  department:           { label: 'แผนก',                 icon: Layers,         bg: 'bg-sky-100',     text: 'text-sky-700',     border: 'border-l-sky-400' },
  location:             { label: 'สถานที่',               icon: MapPin,         bg: 'bg-green-100',   text: 'text-green-700',   border: 'border-l-green-400' },
  shift:                { label: 'กะงาน',                icon: Clock,          bg: 'bg-indigo-100',  text: 'text-indigo-700',  border: 'border-l-indigo-400' },
  'attendance-policy':  { label: 'นโยบายเข้างาน',       icon: ClipboardList,  bg: 'bg-cyan-100',    text: 'text-cyan-700',    border: 'border-l-cyan-400' },
  'leave-type':         { label: 'ประเภทการลา',          icon: FileText,       bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-l-amber-400' },
  holiday:              { label: 'วันหยุด',               icon: Gift,           bg: 'bg-rose-100',    text: 'text-rose-700',    border: 'border-l-rose-400' },
  'role-label':         { label: 'ตำแหน่งงาน',           icon: Tag,            bg: 'bg-teal-100',    text: 'text-teal-700',    border: 'border-l-teal-400' },
  'weekly-holiday':     { label: 'วันหยุดสัปดาห์',       icon: CalendarDays,   bg: 'bg-pink-100',    text: 'text-pink-700',    border: 'border-l-pink-400' },
  permission:           { label: 'สิทธิ์การใช้งาน',      icon: Lock,           bg: 'bg-yellow-100',  text: 'text-yellow-700',  border: 'border-l-yellow-400' },
  expense:              { label: 'การวางบิล',            icon: ClipboardList,  bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-l-emerald-400' },
  ticket:               { label: 'แจ้งเรื่อง',            icon: FolderTree,     bg: 'bg-fuchsia-100', text: 'text-fuchsia-700', border: 'border-l-fuchsia-400' },
  system:               { label: 'ระบบ',                 icon: Settings2,      bg: 'bg-gray-100',    text: 'text-gray-700',    border: 'border-l-gray-400' },
}

// ── Action Config ──────────────────────────────────────────────────────────────

type ActionConfig = {
  label: string
  icon:  React.ElementType
  bg:    string
  text:  string
  ring:  string
}

const ACTION_CONFIG: Record<string, ActionConfig> = {
  create:                 { label: 'สร้าง',              icon: Plus,          bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-300' },
  update:                 { label: 'แก้ไข',              icon: Pencil,        bg: 'bg-blue-100',    text: 'text-blue-700',    ring: 'ring-blue-300' },
  delete:                 { label: 'ลบ',                 icon: Trash2,        bg: 'bg-red-100',     text: 'text-red-700',     ring: 'ring-red-300' },
  activate:               { label: 'เปิดใช้งาน',         icon: ToggleRight,   bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-300' },
  deactivate:             { label: 'ปิดใช้งาน',          icon: ToggleLeft,    bg: 'bg-red-100',     text: 'text-red-700',     ring: 'ring-red-300' },
  approve:                { label: 'อนุมัติ',            icon: CheckCircle2,  bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-300' },
  reject:                 { label: 'ปฏิเสธ',             icon: XCircle,       bg: 'bg-red-100',     text: 'text-red-700',     ring: 'ring-red-300' },
  cancel:                 { label: 'ยกเลิก',             icon: Ban,           bg: 'bg-orange-100',  text: 'text-orange-700',  ring: 'ring-orange-300' },
  'create-draft':         { label: 'บันทึกแบบร่าง',          icon: Plus,          bg: 'bg-slate-100',   text: 'text-slate-700',   ring: 'ring-slate-300' },
  'update-draft':         { label: 'แก้ไขแบบร่าง',           icon: Pencil,        bg: 'bg-blue-100',    text: 'text-blue-700',    ring: 'ring-blue-300' },
  submit:                 { label: 'ส่งรายการ',           icon: CheckCircle2,  bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-300' },
  'submit-draft':         { label: 'ส่งแบบร่าง',             icon: CheckCircle2,  bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-300' },
  'ocr-enqueue':          { label: 'เริ่ม OCR',           icon: FileText,      bg: 'bg-cyan-100',    text: 'text-cyan-700',    ring: 'ring-cyan-300' },
  'ocr-apply':            { label: 'ผลลัพธ์ OCR',           icon: FileText,      bg: 'bg-indigo-100',  text: 'text-indigo-700',  ring: 'ring-indigo-300' },
  'export-expense-claims': { label: 'Export รายการวางรอบบิล', icon: ClipboardList, bg: 'bg-teal-100',    text: 'text-teal-700',    ring: 'ring-teal-300' },
  'create-expense-billing-batch': { label: 'สร้างการวางรอบบิล', icon: ClipboardList, bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-300' },
  'export-expense-billing-batch': { label: 'นำออกการวางรอบบิล', icon: ClipboardList, bg: 'bg-teal-100', text: 'text-teal-700', ring: 'ring-teal-300' },
  'mark-expense-billing-batch-paid': { label: 'บันทึกจ่ายเงิน', icon: CheckCircle2, bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-300' },
  'cancel-expense-billing-batch': { label: 'ยกเลิกการวางรอบบิล', icon: Ban, bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-300' },
  'start-work':           { label: 'เริ่มดำเนินการ',     icon: PlayCircle,    bg: 'bg-blue-100',    text: 'text-blue-700',    ring: 'ring-blue-300' },
  resolve:                { label: 'ส่งตรวจ',            icon: CheckCircle2,  bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-300' },
  close:                  { label: 'ปิดงาน',             icon: CheckCircle2,  bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-300' },
  'return-for-revision':  { label: 'ส่งกลับแก้ไข',       icon: Undo2,         bg: 'bg-orange-100',  text: 'text-orange-700',  ring: 'ring-orange-300' },
  'requester-confirm-completion': { label: 'ผู้แจ้งยืนยันงานเสร็จ', icon: CheckCircle2, bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-300' },
  'add-comment':          { label: 'แสดงความคิดเห็น',    icon: MessageSquare, bg: 'bg-slate-100',   text: 'text-slate-700',   ring: 'ring-slate-300' },
  'request-info':         { label: 'ขอข้อมูลเพิ่ม',      icon: HelpCircle,    bg: 'bg-amber-100',   text: 'text-amber-700',   ring: 'ring-amber-300' },
  'resume-work':          { label: 'กลับมาดำเนินการ',    icon: RotateCw,      bg: 'bg-blue-100',    text: 'text-blue-700',    ring: 'ring-blue-300' },
  'update-work-detail':   { label: 'อัปเดตข้อมูลงาน',    icon: Pencil,        bg: 'bg-blue-100',    text: 'text-blue-700',    ring: 'ring-blue-300' },
  'add-attachment':       { label: 'เพิ่มหลักฐาน',       icon: Paperclip,     bg: 'bg-cyan-100',    text: 'text-cyan-700',    ring: 'ring-cyan-300' },
  'remove-attachment':    { label: 'ลบหลักฐาน',          icon: Trash2,        bg: 'bg-red-100',     text: 'text-red-700',     ring: 'ring-red-300' },
  'auto-route-topic':     { label: 'จ่ายงานอัตโนมัติ (หัวข้อ)', icon: Route,   bg: 'bg-indigo-100',  text: 'text-indigo-700',  ring: 'ring-indigo-300' },
  'auto-route-category':  { label: 'จ่ายงานอัตโนมัติ (หมวด)', icon: Route,    bg: 'bg-indigo-100',  text: 'text-indigo-700',  ring: 'ring-indigo-300' },
  'routing-multiple-candidates': { label: 'รอ Supervisor เลือกผู้รับผิดชอบ', icon: Route, bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-300' },
  'routing-no-match':     { label: 'ไม่พบผู้รับผิดชอบ',  icon: Route,         bg: 'bg-gray-100',    text: 'text-gray-700',    ring: 'ring-gray-300' },
  'add-role':             { label: 'เพิ่มสิทธิ์',        icon: UserPlus,      bg: 'bg-violet-100',  text: 'text-violet-700',  ring: 'ring-violet-300' },
  'remove-role':          { label: 'ถอดสิทธิ์',          icon: UserMinus,     bg: 'bg-rose-100',    text: 'text-rose-700',    ring: 'ring-rose-300' },
  grant:                  { label: 'ให้สิทธิ์',          icon: Shield,        bg: 'bg-violet-100',  text: 'text-violet-700',  ring: 'ring-violet-300' },
  revoke:                 { label: 'ถอนสิทธิ์',          icon: ShieldOff,     bg: 'bg-rose-100',    text: 'text-rose-700',    ring: 'ring-rose-300' },
  'set-role-permissions': { label: 'ตั้งค่าสิทธิ์',      icon: Settings2,     bg: 'bg-indigo-100',  text: 'text-indigo-700',  ring: 'ring-indigo-300' },
  'bulk-create':          { label: 'สร้างแบบ Bulk',      icon: Copy,          bg: 'bg-teal-100',    text: 'text-teal-700',    ring: 'ring-teal-300' },
}

const DEFAULT_ACTION: ActionConfig = {
  label: 'อื่นๆ', icon: Settings2,
  bg: 'bg-gray-100', text: 'text-gray-700', ring: 'ring-gray-300',
}

const DEFAULT_MODULE: BadgeConfig = {
  label: 'อื่นๆ', icon: Settings2,
  bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-l-gray-400',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(dt: string) {
  return new Date(dt).toLocaleDateString('th-TH', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'Asia/Bangkok',
  })
}

function fmtTime(dt: string) {
  return new Date(dt).toLocaleTimeString('th-TH', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'Asia/Bangkok',
  })
}

function fmtDateKey(dt: string) {
  return new Date(dt).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'numeric', year: 'numeric',
    timeZone: 'Asia/Bangkok',
  })
}

// ── Module Badge ───────────────────────────────────────────────────────────────

function ModuleBadge({ module }: { module: string }) {
  const cfg = MODULE_CONFIG[module] ?? DEFAULT_MODULE
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  )
}

// ── Action Badge ───────────────────────────────────────────────────────────────

function ActionBadge({ action }: { action: string }) {
  const cfg = ACTION_CONFIG[action] ?? DEFAULT_ACTION
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${cfg.bg} ${cfg.text} ${cfg.ring}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  )
}

// ── Diff Viewer ────────────────────────────────────────────────────────────────

function DiffViewer({ oldValues, newValues }: { oldValues?: string | null; newValues?: string | null }) {
  const [open, setOpen] = useState(false)
  if (!oldValues && !newValues) return null

  const parseJson = (s?: string | null) => {
    if (!s) return null
    try { return JSON.parse(s) } catch { return s }
  }

  const hasOld = !!oldValues
  const hasNew = !!newValues
  const cols = hasOld && hasNew ? 'grid-cols-2' : 'grid-cols-1'

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRt className="h-3 w-3" />}
        ดูการเปลี่ยนแปลง
      </button>

      {open && (
        <div className={`mt-2 grid ${cols} gap-2`}>
          {hasOld && (
            <div>
              <div className="mb-1 flex items-center gap-1 text-xs font-medium text-red-500">
                <span className="h-2 w-2 rounded-full bg-red-400 inline-block" />
                ก่อนแก้ไข
              </div>
              <pre className="rounded-md border border-border border-l-4 border-l-red-400 bg-whited/60 p-2 text-xs overflow-x-auto text-foreground">
                {JSON.stringify(parseJson(oldValues), null, 2)}
              </pre>
            </div>
          )}
          {hasNew && (
            <div>
              <div className="mb-1 flex items-center gap-1 text-xs font-medium text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />
                หลังแก้ไข
              </div>
              <pre className="rounded-md border border-border border-l-4 border-l-emerald-400 bg-whited/60 p-2 text-xs overflow-x-auto text-foreground">
                {JSON.stringify(parseJson(newValues), null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Log Entry Card ─────────────────────────────────────────────────────────────

function LogEntry({ log }: { log: AuditLogDto }) {
  const modCfg = MODULE_CONFIG[log.module] ?? DEFAULT_MODULE

  return (
    <div className={`flex gap-0 border-b border-border last:border-0 hover:bg-whited/20 transition-colors`}>
      {/* Left colored border strip */}
      <div className={`w-1 shrink-0 rounded-tl rounded-bl ${modCfg.border.replace('border-l-', 'bg-').replace('400', '400')}`} />

      {/* Content */}
      <div className="flex-1 min-w-0 px-4 py-3">
        {/* Top row: badges + time */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <ModuleBadge module={log.module} />
            <ActionBadge action={log.action} />
          </div>
          <span className="text-xs font-mono text-muted-foreground shrink-0">
            {fmtTime(log.performedAt)}
          </span>
        </div>

        {/* Description */}
        <p className="mt-2 text-sm font-medium text-foreground leading-snug">
          {log.description}
        </p>

        {/* Meta row */}
        <div className="mt-1.5 flex items-center flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {log.performedByName ?? 'ไม่ระบุ'}
          </span>
          <span className="flex items-center gap-1 font-mono">
            {log.entityType}
            <span className="text-muted-foreground/60">·</span>
            {log.entityId.length > 8 ? `${log.entityId.slice(0, 8)}…` : log.entityId}
          </span>
        </div>

        {/* Diff viewer */}
        <DiffViewer oldValues={log.oldValues} newValues={log.newValues} />
      </div>
    </div>
  )
}

// ── Date Group Header ──────────────────────────────────────────────────────────

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 bg-whited/40 px-4 py-2 border-b border-border">
      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-xs font-semibold text-muted-foreground">{date}</span>
    </div>
  )
}

// ── Filters ────────────────────────────────────────────────────────────────────

type Filters = {
  module:   string
  action:   string
  dateFrom: string
  dateTo:   string
}

const DEFAULT_DATE_FROM = (() => {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
})()
const DEFAULT_DATE_TO = new Date().toISOString().slice(0, 10)

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AuditLogsPage() {
  const employee = useAuthStore((s) => s.employee)
  const isAdmin  = employee?.roles.some((r) => r.role === 'Admin') ?? false

  const [page,    setPage]    = useState(1)
  const [filters, setFilters] = useState<Filters>({
    module:   '',
    action:   '',
    dateFrom: DEFAULT_DATE_FROM,
    dateTo:   DEFAULT_DATE_TO,
  })

  const { data, isLoading, isError } = useAuditLogs({
    module:   filters.module   || undefined,
    action:   filters.action   || undefined,
    dateFrom: filters.dateFrom ? `${filters.dateFrom}T00:00:00` : undefined,
    dateTo:   filters.dateTo   ? `${filters.dateTo}T23:59:59`   : undefined,
    page,
    pageSize: 20,
  })

  const handleReset = () => {
    setFilters({ module: '', action: '', dateFrom: DEFAULT_DATE_FROM, dateTo: DEFAULT_DATE_TO })
    setPage(1)
  }

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        คุณไม่มีสิทธิ์เข้าถึงหน้านี้
      </div>
    )
  }

  // Group logs by date
  const grouped: { dateKey: string; dateLabel: string; logs: AuditLogDto[] }[] = []
  if (data?.items) {
    const map = new Map<string, AuditLogDto[]>()
    for (const log of data.items) {
      const key = fmtDateKey(log.performedAt)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(log)
    }
    for (const [key, logs] of map) {
      grouped.push({ dateKey: key, dateLabel: fmtDate(logs[0].performedAt), logs })
    }
  }

  const totalPages = data ? Math.ceil(data.totalCount / 20) : 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold leading-none">Audit Log</h1>
          <p className="text-sm text-muted-foreground mt-0.5">ประวัติการเปลี่ยนแปลงข้อมูลทั้งหมดในระบบ</p>
        </div>
        {data && (
          <span className="ml-auto text-sm text-muted-foreground">
            {data.totalCount.toLocaleString()} รายการ
          </span>
        )}
      </div>

      {/* Legend */}
      {/* <div className="rounded-lg border border-border bg-white p-3">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">สีของ Action</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(ACTION_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon
            return (
              <span key={key} className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ${cfg.bg} ${cfg.text} ${cfg.ring}`}>
                <Icon className="h-3 w-3" />
                {cfg.label}
              </span>
            )
          })}
        </div>
      </div> */}

      {/* Filters */}
      <div className="rounded-lg border border-border bg-background p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Module</Label>
            <Select
              value={filters.module}
              onChange={(e) => { setFilters((f) => ({ ...f, module: e.target.value })); setPage(1) }}
              className="w-40"
            >
              <option value="">ทั้งหมด</option>
              <option value="attendance">การเข้างาน</option>
              <option value="leave">การลา</option>
              <option value="employee">พนักงาน</option>
              <option value="company">บริษัท</option>
              <option value="department">แผนก</option>
              <option value="location">สถานที่</option>
              <option value="shift">กะงาน</option>
              <option value="attendance-policy">นโยบายเข้างาน</option>
              <option value="leave-type">ประเภทการลา</option>
              <option value="holiday">วันหยุด</option>
              <option value="role-label">ตำแหน่งงาน</option>
              <option value="weekly-holiday">วันหยุดสัปดาห์</option>
              <option value="permission">สิทธิ์การใช้งาน</option>
              <option value="expense">การวางบิล</option>
              <option value="ticket">แจ้งเรื่อง</option>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Action</Label>
            <Select
              value={filters.action}
              onChange={(e) => { setFilters((f) => ({ ...f, action: e.target.value })); setPage(1) }}
              className="w-44"
            >
              <option value="">ทั้งหมด</option>
              <optgroup label="ข้อมูล">
                <option value="create">สร้าง</option>
                <option value="update">แก้ไข</option>
                <option value="delete">ลบ</option>
                <option value="bulk-create">สร้างแบบ Bulk</option>
              </optgroup>
              <optgroup label="สถานะ">
                <option value="activate">เปิดใช้งาน</option>
                <option value="deactivate">ปิดใช้งาน</option>
              </optgroup>
              <optgroup label="การลา">
                <option value="approve">อนุมัติ</option>
                <option value="reject">ปฏิเสธ</option>
                <option value="cancel">ยกเลิก</option>
              </optgroup>
              <optgroup label="การวางบิล">
                <option value="create-draft">บันทึกร่าง</option>
                <option value="update-draft">แก้ไขร่าง</option>
                <option value="submit">ส่งรายการ</option>
                <option value="submit-draft">ส่งร่าง</option>
                <option value="export-expense-claims">Export รายการวางบิล</option>
                <option value="create-expense-billing-batch">สร้างรอบวางบิล</option>
                <option value="export-expense-billing-batch">Export รอบวางบิล</option>
                <option value="mark-expense-billing-batch-paid">บันทึกจ่ายเงิน</option>
                <option value="cancel-expense-billing-batch">ยกเลิกรอบวางบิล</option>
              </optgroup>
              <optgroup label="การใช้ OCR">
                <option value="ocr-enqueue">เริ่ม OCR</option>
                <option value="ocr-apply">ใช้ผล OCR</option>
              </optgroup>
              <optgroup label="สิทธิ์">
                <option value="add-role">เพิ่มสิทธิ์</option>
                <option value="remove-role">ถอดสิทธิ์</option>
                <option value="grant">ให้สิทธิ์</option>
                <option value="revoke">ถอนสิทธิ์</option>
                <option value="set-role-permissions">ตั้งค่าสิทธิ์</option>
              </optgroup>
              <optgroup label="แจ้งเรื่อง">
                <option value="start-work">เริ่มดำเนินการ</option>
                <option value="resolve">ส่งตรวจ</option>
                <option value="close">ปิดงาน</option>
                <option value="return-for-revision">ส่งกลับแก้ไข</option>
                <option value="requester-confirm-completion">ผู้แจ้งยืนยันงานเสร็จ</option>
                <option value="add-comment">แสดงความคิดเห็น</option>
                <option value="request-info">ขอข้อมูลเพิ่ม</option>
                <option value="resume-work">กลับมาดำเนินการ</option>
                <option value="update-work-detail">อัปเดตข้อมูลงาน</option>
                <option value="add-attachment">เพิ่มหลักฐาน</option>
                <option value="remove-attachment">ลบหลักฐาน</option>
                <option value="auto-route-topic">จ่ายงานอัตโนมัติ (หัวข้อ)</option>
                <option value="auto-route-category">จ่ายงานอัตโนมัติ (หมวด)</option>
                <option value="routing-multiple-candidates">รอ Supervisor เลือกผู้รับผิดชอบ</option>
                <option value="routing-no-match">ไม่พบผู้รับผิดชอบ</option>
              </optgroup>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">ตั้งแต่</Label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => { setFilters((f) => ({ ...f, dateFrom: e.target.value })); setPage(1) }}
              className="w-36"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">ถึงวันที่</Label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => { setFilters((f) => ({ ...f, dateTo: e.target.value })); setPage(1) }}
              className="w-36"
            />
          </div>

          <Button variant="outline" size="sm" onClick={handleReset} className="self-end">
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            รีเซ็ต
          </Button>
        </div>
      </div>

      {/* Log Feed */}
      <div className="rounded-lg border border-border bg-background overflow-hidden">

        {/* Loading skeleton */}
        {isLoading && (
          <div className="divide-y divide-border">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-0">
                <div className="w-1 bg-whited shrink-0" />
                <div className="flex-1 px-4 py-3 space-y-2">
                  <div className="flex gap-2">
                    <div className="h-5 w-20 bg-whited rounded animate-pulse" />
                    <div className="h-5 w-16 bg-whited rounded animate-pulse" />
                  </div>
                  <div className="h-4 w-3/4 bg-whited rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-whited rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="flex flex-col items-center justify-center py-16 text-destructive gap-2">
            <XCircle className="h-8 w-8" />
            <span className="text-sm">เกิดข้อผิดพลาดในการโหลดข้อมูล</span>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && data?.items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <ShieldCheck className="h-8 w-8 opacity-30" />
            <span className="text-sm">ไม่พบ Audit Log ในช่วงเวลานี้</span>
          </div>
        )}

        {/* Grouped log entries */}
        {!isLoading && !isError && grouped.map(({ dateKey, dateLabel, logs }) => (
          <div key={dateKey}>
            <DateSeparator date={dateLabel} />
            <div className="divide-y divide-border">
              {logs.map((log) => (
                <LogEntry key={log.id} log={log} />
              ))}
            </div>
          </div>
        ))}

        {/* Pagination */}
        {data && data.totalCount > 0 && (
          <div className="flex items-center justify-between border-t border-border bg-whited/20 px-4 py-3">
            <span className="text-sm text-muted-foreground">
              แสดง {((page - 1) * 20) + 1}–{Math.min(page * 20, data.totalCount)}{' '}
              จาก {data.totalCount.toLocaleString()} รายการ
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline" size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 text-sm font-medium">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline" size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
