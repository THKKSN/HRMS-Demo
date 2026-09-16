'use client'

import type { LucideIcon } from 'lucide-react'

// ── โทนสีตามความหมายข้อมูล — ชุดเดียวกับ quick-link เดิมของแอป ─────────────────

export type Tone = 'sky' | 'amber' | 'violet' | 'cyan' | 'emerald' | 'rose' | 'teal' | 'indigo' | 'orange' | 'blue' | 'slate'

export const TONE: Record<Tone, { chip: string; value: string }> = {
  sky:     { chip: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400',             value: 'text-sky-700 dark:text-sky-300' },
  amber:   { chip: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',     value: 'text-amber-700 dark:text-amber-300' },
  violet:  { chip: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400', value: 'text-violet-700 dark:text-violet-300' },
  cyan:    { chip: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400',         value: 'text-cyan-700 dark:text-cyan-300' },
  emerald: { chip: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400', value: 'text-emerald-700 dark:text-emerald-300' },
  rose:    { chip: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400',         value: 'text-rose-700 dark:text-rose-300' },
  teal:    { chip: 'bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400',         value: 'text-teal-700 dark:text-teal-300' },
  indigo:  { chip: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400', value: 'text-indigo-700 dark:text-indigo-300' },
  orange:  { chip: 'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400', value: 'text-orange-700 dark:text-orange-300' },
  blue:    { chip: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',         value: 'text-blue-700 dark:text-blue-300' },
  slate:   { chip: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400',     value: 'text-slate-700 dark:text-slate-300' },
}

// ── Helpers ────────────────────────────────────────────────────────────────────

// แสดงเป็นหน่วยประกอบ เช่น "1 วัน 12 ชม." ไม่ใช่ "1.5 วัน" — logic อยู่ใน lib เพื่อให้เขียน test ได้
export { duration } from '@/lib/format-duration'

export function percent(value?: number) {
  return `${Number(value ?? 0).toFixed(1)}%`
}

export const RANK_BADGE = ['🥇', '🥈', '🥉']

// ── KPI Card ───────────────────────────────────────────────────────────────────

export function KpiCard({
  label, value, hint, icon: Icon, tone,
}: {
  label: string
  value: string | number
  hint?: string
  icon: LucideIcon
  tone: Tone
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
      <div className={`inline-flex rounded-xl p-2 ${TONE[tone].chip}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${TONE[tone].value}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

// ── ช่องเดี่ยวในการ์ดที่รวมหลายตัวเลขไว้ด้วยกัน ────────────────────────────────
// ต่างจาก KpiCard ตรงที่ไม่มีกรอบ/เงาของตัวเอง — การ์ดแม่เป็นคนวาดกรอบและเส้นคั่น
// (แม่ใช้ grid gap-px บนพื้น bg-border เพื่อให้ได้เส้นคั่นถูกตำแหน่งทุกจำนวนคอลัมน์)

export function MetricCell({
  label, value, hint, icon: Icon, tone,
}: {
  label: string
  value: string | number
  hint?: string
  icon: LucideIcon
  tone: Tone
}) {
  return (
    <div className="flex flex-col justify-center bg-background p-4">
      <div className="flex items-center gap-2">
        <span className={`inline-flex shrink-0 rounded-lg p-1.5 ${TONE[tone].chip}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
      <p className={`mt-2 text-xl font-bold tabular-nums ${TONE[tone].value}`}>{value}</p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

// ── Mini progress bar ──────────────────────────────────────────────────────────

export function MiniBar({ value, max, className }: { value: number; max: number; className: string }) {
  const width = max > 0 ? Math.max(2, (value / max) * 100) : 0
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full ${className}`} style={{ width: `${width}%` }} />
    </div>
  )
}

// ── Segmented pill group ───────────────────────────────────────────────────────

export function SegmentGroup<T extends string | number>({
  options, value, onChange, render,
}: {
  options: readonly T[]
  value: T
  onChange: (option: T) => void
  render: (option: T) => string
}) {
  return (
    <div className="flex gap-0.5 rounded-full bg-muted p-0.5 text-xs">
      {options.map(option => (
        <button
          key={String(option)}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
            value === option
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {render(option)}
        </button>
      ))}
    </div>
  )
}

// ── เฉดสี bar ตามอันดับ (เข้ม → อ่อน) ─────────────────────────────────────────

export function rankBarClass(index: number, color: 'violet' | 'teal' | 'blue' | 'indigo') {
  const shades: Record<string, string[]> = {
    violet: ['bg-violet-500', 'bg-violet-400', 'bg-violet-300', 'bg-violet-200 dark:bg-violet-500/30'],
    teal:   ['bg-teal-500',   'bg-teal-400',   'bg-teal-300',   'bg-teal-200 dark:bg-teal-500/30'],
    blue:   ['bg-blue-500',   'bg-blue-400',   'bg-blue-300',   'bg-blue-200 dark:bg-blue-500/30'],
    indigo: ['bg-indigo-500', 'bg-indigo-400', 'bg-indigo-300', 'bg-indigo-200 dark:bg-indigo-500/30'],
  }
  return shades[color][Math.min(index, 3)]
}
