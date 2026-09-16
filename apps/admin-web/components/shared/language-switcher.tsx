'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Globe, Loader2 } from 'lucide-react'
import {
  LOCALE_NATIVE_NAME,
  SUPPORTED_LOCALES,
  isLocale,
  setCurrentLocale,
  writeLocaleCookie,
  type Locale,
} from '@hrms/i18n'
import { cn } from '@/lib/utils'

/**
 * ตัวสลับภาษาของ Admin — กติกาเดียวกับ LIFF (แผน i18n งาน 2.2)
 * เขียน cookie แล้ว refresh ให้ server render ภาษาใหม่ · ชื่อภาษาแสดงในภาษาของตัวเองเสมอ ห้ามแปล
 *
 * `icon` = ปุ่มบน header ข้างปุ่มโหมดสี (เห็นทุกหน้า ทุก role ไม่ผ่าน permission gate)
 * `cards` = การ์ดเลือกภาษาในหน้าตั้งค่าทั่วไป ให้เข้าชุดกับโหมดสี/ขนาดตัวอักษร
 */
export function LanguageSwitcher({
  variant = 'icon',
  className,
}: {
  variant?: 'icon' | 'cards'
  className?: string
}) {
  const locale = useLocale() as Locale
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function changeLocale(next: string) {
    if (!isLocale(next) || next === locale) return
    writeLocaleCookie(next)
    setCurrentLocale(next)
    startTransition(() => router.refresh())
  }

  if (variant === 'cards') {
    return (
      <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-3', className)}>
        {SUPPORTED_LOCALES.map((value: Locale) => {
          const active = value === locale
          return (
            <button
              key={value}
              type="button"
              onClick={() => changeLocale(value)}
              aria-pressed={active}
              disabled={isPending}
              className={cn(
                'flex flex-col items-center gap-1 rounded-2xl border-2 px-4 py-4 text-center transition-all disabled:opacity-60',
                active
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border bg-background text-muted-foreground hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm',
              )}
            >
              <span className={cn('text-sm font-semibold', active && 'text-foreground')}>
                {LOCALE_NATIVE_NAME[value]}
              </span>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">{value}</span>
            </button>
          )
        })}
      </div>
    )
  }

  // select โปร่งใสวางทับปุ่ม — ได้ native picker โดยหน้าตายังเป็นปุ่มไอคอนเหมือนปุ่มอื่นบน header
  return (
    <label
      className={cn(
        'relative flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-whited hover:text-foreground',
        isPending && 'opacity-60',
        className,
      )}
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
      <span className="hidden text-xs font-medium uppercase sm:inline">{locale}</span>
      <select
        aria-label="Language"
        value={locale}
        disabled={isPending}
        onChange={(event) => changeLocale(event.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {SUPPORTED_LOCALES.map((value: Locale) => (
          <option key={value} value={value}>
            {LOCALE_NATIVE_NAME[value]}
          </option>
        ))}
      </select>
    </label>
  )
}
