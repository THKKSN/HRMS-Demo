'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MemoApprovalTable } from '@/components/memos/memo-approval-table'
import { MemoInboxList } from '@/components/memos/memo-inbox-list'
import { MemoSectionNav, useMemoSections } from '@/components/memos/memo-section-nav'
import { useAuthStore } from '@/stores/auth.store'

// หน้ารวม "งาน Memo" — แสดง section ตาม permission ของผู้ใช้:
// - memo:approve (Executive/Admin) → ตารางรออนุมัติ
// - memo:view-inbox (Supervisor แผนกปลายทาง) → รายการเข้าแผนก รอรับทราบ/ส่งมอบ
// มีทั้งคู่ → เห็นทั้งสอง section ซ้อนกัน
export default function MemoTasksPage() {
  const router = useRouter()
  const employee = useAuthStore((s) => s.employee)
  const { canApprove, canViewInbox } = useMemoSections()

  useEffect(() => {
    if (employee && !canApprove && !canViewInbox) router.replace('/my/memos')
  }, [employee, canApprove, canViewInbox, router])

  if (!employee || (!canApprove && !canViewInbox)) return null

  return (
    <div className="space-y-8">
      <MemoSectionNav />
      {canApprove && <MemoApprovalTable />}
      {canViewInbox && <MemoInboxList />}
    </div>
  )
}
