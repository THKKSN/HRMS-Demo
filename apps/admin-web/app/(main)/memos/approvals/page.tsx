'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MemoApprovalTable } from '@/components/memos/memo-approval-table'
import { useMemoSections } from '@/components/memos/memo-section-nav'
import { usePermissionGate } from '@/hooks/use-permission-gate'

// คิว Approval List — เฉพาะผู้มีสิทธิ์ memo:approve (Executive/Admin)
// ผู้อนุมัติที่ถูกปักหมุดรายเรื่องจะเห็นเฉพาะเรื่องของตัวเอง (กรองฝั่ง API)
export default function MemoApprovalsPage() {
  const router = useRouter()
  const { employee, hasAny } = usePermissionGate()
  const { defaultHref } = useMemoSections()
  const canApprove = hasAny(['memo:approve'], ['Admin', 'Executive'])

  useEffect(() => {
    if (employee && !canApprove) router.replace(defaultHref)
  }, [employee, canApprove, defaultHref, router])

  if (!employee || !canApprove) return null

  return <MemoApprovalTable />
}
