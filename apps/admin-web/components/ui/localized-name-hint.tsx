'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

/**
 * แถบบอกสถานะชื่อภาษาอื่นของ master data (i18n Phase M)
 *
 * HR เป็นคนกรอกคำแปลเองผ่านฟอร์มในหน้า Admin จึงต้องเห็นจากในรายการเลยว่า
 * รายการไหนกรอกแล้ว รายการไหนยังขาด โดยไม่ต้องเปิดฟอร์มทีละอัน
 * ค่าที่ว่างไม่ได้แปลว่าผิด — หน้าจอที่สลับภาษาจะถอยไปใช้ชื่อไทยแทน
 */
export function LocalizedNameHint({
  nameEn,
  nameId,
  /** ซ่อนช่องอินโดนีเซียสำหรับข้อมูลที่ผู้แจ้งภายนอกไม่เห็น */
  showIndonesian = true,
  className,
}: {
  nameEn?: string | null
  nameId?: string | null
  showIndonesian?: boolean
  className?: string
}) {
  const t = useTranslations('admin.settings.localizedName')
  const en = nameEn?.trim()
  const id = nameId?.trim()

  return (
    <div className={cn('mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-4', className)}>
      {en
        ? <span className="min-w-0 truncate text-muted-foreground"><span className="font-semibold">EN</span> {en}</span>
        : <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">{t('missingEn')}</span>}
      {showIndonesian && (id
        ? <span className="min-w-0 truncate text-muted-foreground"><span className="font-semibold">ID</span> {id}</span>
        : <span className="rounded bg-whited px-1.5 py-0.5 font-medium text-muted-foreground">{t('missingId')}</span>)}
    </div>
  )
}
