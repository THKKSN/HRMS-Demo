'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MemoInboxList } from '@/components/memos/memo-inbox-list'
import { useMemoSections } from '@/components/memos/memo-section-nav'
import { usePermissionGate } from '@/hooks/use-permission-gate'

// เรื่องที่ส่งเข้าแผนกปลายทาง รอรับทราบ/ดำเนินการ/ส่งมอบ — เฉพาะหัวหน้าแผนก (memo:view-inbox)
export default function MemoInboxPage() {
  const router = useRouter()
  const { employee, hasAny } = usePermissionGate()
  const { defaultHref } = useMemoSections()
  const canViewInbox = hasAny(['memo:view-inbox'], ['Supervisor'])

  useEffect(() => {
    if (employee && !canViewInbox) router.replace(defaultHref)
  }, [employee, canViewInbox, defaultHref, router])

  if (!employee || !canViewInbox) return null

  return <MemoInboxList />
}
