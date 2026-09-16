'use client'

import { useTranslations } from 'next-intl'
import { Modal } from './modal'
import { Button } from './button'

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
  loading?: boolean
}

export function ConfirmModal({
  open, onClose, onConfirm,
  title, description,
  // ไม่ใส่ค่า default ตรง signature เพราะข้อความต้องมาจาก useTranslations (เรียกใน component เท่านั้น)
  confirmLabel,
  cancelLabel,
  variant = 'default',
  loading,
}: ConfirmModalProps) {
  const tCommon = useTranslations('common')
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      {description && (
        <p className="text-sm text-muted-foreground mb-5">{description}</p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          {cancelLabel ?? tCommon('action.cancel')}
        </Button>
        <Button variant={variant} loading={loading} onClick={onConfirm}>
          {confirmLabel ?? tCommon('action.confirm')}
        </Button>
      </div>
    </Modal>
  )
}
