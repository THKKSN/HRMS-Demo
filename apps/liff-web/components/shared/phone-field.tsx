'use client'

import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocale, useTranslations } from 'next-intl'
import { Check, ChevronDown, Search } from 'lucide-react'
import {
  callingCodeOf,
  countryFlag,
  countryName,
  sortedCountries,
  type Locale,
} from '@hrms/i18n'
import { cn } from '@/lib/utils'
import { BottomSheet } from './bottom-sheet'

/**
 * ช่องกรอกเบอร์โทรแบบสากล — เลือกประเทศ (ธง + รหัส) แล้วกรอกเบอร์ในประเทศ
 * ผู้เรียกเป็นคนประกอบ E.164 ด้วย `toE164(callingCodeOf(country), national)`
 * (แผน: docs/external-reporter-phone-e164-plan.md — Phase 2)
 */
export function PhoneField({
  country,
  onCountryChange,
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  valid,
  ariaLabel,
}: {
  /** ISO 3166-1 alpha-2 ของประเทศที่เลือกอยู่ */
  country: string
  onCountryChange: (iso: string) => void
  /** เบอร์ในประเทศตามที่ผู้ใช้พิมพ์ (ยังไม่ประกอบรหัสประเทศ) */
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  error?: string
  valid?: boolean
  ariaLabel?: string
}) {
  const t = useTranslations('liff.external.register')
  const locale = useLocale() as Locale
  const [pickerOpen, setPickerOpen] = useState(false)

  const calling = callingCodeOf(country) ?? ''

  return (
    <>
      <div
        className={cn(
          'flex h-12 items-center rounded-xl border bg-external-surface transition-colors',
          error ? 'border-red-300 dark:border-red-500/60' : 'border-external-line focus-within:border-external-brand',
        )}
      >
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          aria-label={t('phoneCountry')}
          className="flex h-full shrink-0 items-center gap-1 rounded-l-xl pl-3 pr-2 text-sm font-medium"
        >
          <span className="text-base leading-none">{countryFlag(country)}</span>
          <span>+{calling}</span>
          <ChevronDown className="h-3.5 w-3.5 text-external-muted" />
        </button>
        <span className="h-6 w-px shrink-0 bg-external-line" />
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          aria-label={ariaLabel}
          value={value}
          onChange={event => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          maxLength={20}
          className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-sm outline-none placeholder:text-external-muted"
        />
        {valid && !error && <Check className="mr-3 h-4 w-4 shrink-0 text-external-brand-text" />}
      </div>

      {/* portal ออกไปนอกฟอร์ม — แผ่นเลือกประเทศจะได้ไม่ติด stacking context หรือ label/form ที่ครอบช่องนี้อยู่ */}
      {pickerOpen && createPortal(
        <CountryPicker
          selected={country}
          locale={locale}
          onSelect={iso => { onCountryChange(iso); setPickerOpen(false) }}
          onClose={() => setPickerOpen(false)}
        />,
        document.body,
      )}
    </>
  )
}

// รายชื่อประเทศทั้งหมด (ไทยปักหมุดบนสุด) พร้อมช่องค้นหา — พิมพ์ได้ทั้งชื่อประเทศ, ISO และรหัสโทร
function CountryPicker({
  selected,
  locale,
  onSelect,
  onClose,
}: {
  selected: string
  locale: Locale
  onSelect: (iso: string) => void
  onClose: () => void
}) {
  const t = useTranslations('liff.external.register')
  const [query, setQuery] = useState('')

  const countries = useMemo(
    () => sortedCountries(locale).map(item => ({ ...item, name: countryName(item.iso, locale) })),
    [locale],
  )

  const results = useMemo(() => {
    const keyword = query.trim().toLowerCase().replace(/^\+/, '')
    if (!keyword) return countries
    return countries.filter(item =>
      item.name.toLowerCase().includes(keyword)
      || item.iso.toLowerCase().includes(keyword)
      || item.calling.startsWith(keyword))
  }, [countries, query])

  return (
    <BottomSheet title={t('phoneCountry')} onClose={onClose}>
      <div className="mb-3 flex h-11 items-center rounded-xl border border-border px-3">
        <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder={t('countrySearchPlaceholder')}
          className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </div>

      {results.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t('countrySearchEmpty')}</p>
      ) : (
        <ul className="divide-y divide-border">
          {results.map(item => (
            <li key={item.iso}>
              <button
                type="button"
                onClick={() => onSelect(item.iso)}
                className="flex w-full items-center gap-3 py-3 text-left"
              >
                <span className="text-lg leading-none">{countryFlag(item.iso)}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{item.name}</span>
                <span className="shrink-0 text-sm text-muted-foreground">+{item.calling}</span>
                {item.iso === selected && <Check className="h-4 w-4 shrink-0 text-external-brand-text" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </BottomSheet>
  )
}
