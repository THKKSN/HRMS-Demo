'use client'

import Link from 'next/link'
import { Maximize2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { EmployeeCreateForm } from './employee-create-form'

type Props = {
  open: boolean
  onClose: () => void
  defaultCompanyId?: string
}

export function CreateEmployeeModal({ open, onClose, defaultCompanyId }: Props) {
  // unmount ตอนปิด เพื่อให้ฟอร์มเริ่มใหม่ทุกครั้งที่เปิด ไม่มีค่าเดิมค้าง
  if (!open) return null

  return (
    <Modal open={open} onClose={onClose} title="เพิ่มพนักงานใหม่" size="xl">
      <div className="max-w-3xl">
        <div className="mb-4 flex justify-end">
          <Link
            href={defaultCompanyId ? `/employees/new?companyId=${defaultCompanyId}` : '/employees/new'}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <Maximize2 className="h-3.5 w-3.5" />เปิดในหน้าเต็ม
          </Link>
        </div>
        <EmployeeCreateForm
          defaultCompanyId={defaultCompanyId}
          onSuccess={onClose}
          onCancel={onClose}
          stickyActions
        />
      </div>
    </Modal>
  )
}
