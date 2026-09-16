'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { ChevronDown, Globe, Loader2 } from 'lucide-react'
import {
  LOCALE_NATIVE_NAME,
  SUPPORTED_LOCALES,
  isLocale,
  setCurrentLocale,
  writeLocaleCookie,
  type Locale,
} from '@hrms/i18n'
import { cn } from '@/lib/utils'

type LanguageSwitcherProps = {
  /** `select` = ค่าท้ายแถวในหน้าตั้งค่า · `pill` = ปุ่มเล็กบนหัวหน้าจอ (external ไม่มีหน้าตั้งค่า) */
  variant?: 'select' | 'pill'
  className?: string
}

/**
 * ตัวสลับภาษาตัวเดียวใช้ทุก role (แผน i18n งาน 1.3) — เขียน cookie แล้ว refresh ให้ server render ภาษาใหม่
 * ชื่อภาษาแสดงในภาษาของตัวเองเสมอ (LOCALE_NATIVE_NAME) เพื่อให้คนที่อ่านภาษาปัจจุบันไม่ออกยังเลือกได้
 */
export function LanguageSwitcher({ variant = 'select', className }: LanguageSwitcherProps) {
  const locale = useLocale()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function changeLocale(next: string) {
    if (!isLocale(next) || next === locale) return
    writeLocaleCookie(next)
    setCurrentLocale(next)
    startTransition(() => router.refresh())
  }

  const options = SUPPORTED_LOCALES.map((value: Locale) => (
    <option key={value} value={value}>
      {LOCALE_NATIVE_NAME[value]}
    </option>
  ))

  if (variant === 'pill') {
    // select โปร่งใสวางทับ pill — ได้ native picker ของมือถือโดยหน้าตายังเป็นปุ่มเล็ก ๆ
    return (
      <label
        className={cn(
          'relative inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold',
          className,
        )}
      >
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
        <span>{LOCALE_NATIVE_NAME[locale]}</span>
        <select
          aria-label="Language"
          value={locale}
          disabled={isPending}
          onChange={(event) => changeLocale(event.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        >
          {options}
        </select>
      </label>
    )
  }

  // เหมือน pill คือ select โปร่งใสวางทับ แต่หน้าตาเป็น "ค่าปัจจุบัน + ลูกศร" ให้กลืนไปกับแถวอื่นในหน้าตั้งค่า
  return (
    <label
      className={cn(
        'relative flex items-center gap-1 text-sm font-medium',
        isPending && 'opacity-60',
        className,
      )}
    >
      <span>{LOCALE_NATIVE_NAME[locale]}</span>
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      )}
      <select
        aria-label="Language"
        value={locale}
        disabled={isPending}
        onChange={(event) => changeLocale(event.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {options}
      </select>
    </label>
  )
}
