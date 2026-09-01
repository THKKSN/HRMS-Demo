'use client'

import Link from 'next/link'
import { FileText, ChevronRight } from 'lucide-react'
import { useMemoInbox, useMemosForApproval } from '@/hooks/use-memo'

// การ์ด Memo ที่รอดำเนินการบน dashboard
// variant 'approval' = รออนุมัติ (Executive/Admin) · 'inbox' = รอรับทราบของแผนกปลายทาง (Supervisor)
export function MemoPendingCard({ variant }: { variant: 'approval' | 'inbox' }) {
  if (variant === 'approval') return <MemoApprovalCard />
  return <MemoInboxCard />
}

function MemoApprovalCard() {
  const { data: memos, isError } = useMemosForApproval('Pending')
  // 403 (ไม่มีสิทธิ์ memo:approve) หรือไม่มีเรื่องค้าง — ไม่ต้องแสดง
  if (isError || !memos || memos.length === 0) return null

  return (
    <Link
      href="/approvals/memos"
      className="flex items-center gap-3 rounded-2xl border border-indigo-300 bg-indigo-100 px-4 py-3.5 shadow-sm transition-opacity hover:opacity-90 dark:border-indigo-500/30 dark:bg-indigo-500/10"
    >
      <span className="inline-flex shrink-0 rounded-xl bg-indigo-100 p-2 dark:bg-indigo-500/20">
        <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-700">Memo รออนุมัติ</p>
        <p className="truncate text-xs text-indigo-700 dark:text-indigo-700">
          {memos.slice(0, 3).map(memo => memo.memoNo).join(' · ')}
          {memos.length > 3 ? ` และอีก ${memos.length - 3} เรื่อง` : ''}
        </p>
      </div>
      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-indigo-500 px-1.5 text-xs font-bold text-white">
        {memos.length > 99 ? '99+' : memos.length}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-indigo-400" />
    </Link>
  )
}

function MemoInboxCard() {
  const { data: memos, isError } = useMemoInbox()
  if (isError || !memos) return null
  const awaitingAck = memos.filter(memo => !memo.acknowledgedAt)
  if (awaitingAck.length === 0) return null

  return (
    <Link
      href="/memos/inbox"
      className="flex items-center gap-3 rounded-2xl border border-indigo-300 bg-indigo-100 px-4 py-3.5 shadow-sm transition-opacity hover:opacity-90 dark:border-indigo-500/30 dark:bg-indigo-500/10"
    >
      <span className="inline-flex shrink-0 rounded-xl bg-indigo-100 p-2 dark:bg-indigo-500/20">
        <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-700">Memo รอรับทราบ</p>
        <p className="text-xs text-indigo-300 dark:text-indigo-700">{awaitingAck.length} เรื่องรอแผนกรับทราบ</p>
      </div>
      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-indigo-500 px-1.5 text-xs font-bold text-white">
        {awaitingAck.length > 99 ? '99+' : awaitingAck.length}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-indigo-400" />
    </Link>
  )
}
