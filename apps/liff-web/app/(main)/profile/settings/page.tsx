'use client'

import { useTranslations } from 'next-intl'
import { ChevronDown, Languages, MonitorSmartphone, Type } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { LanguageSwitcher } from '@/components/shared/language-switcher'
import { useSettingsStore, type FontSize, type ThemeMode } from '@/stores/settings.store'

const FONT_SIZE_OPTIONS: FontSize[] = ['small', 'medium', 'large']
const THEME_OPTIONS: ThemeMode[] = ['system', 'light', 'dark']

// หัวข้อกลุ่มเหนือการ์ด list (สไตล์ตั้งค่าบนมือถือ)
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="px-1 pb-2 text-xs font-medium text-muted-foreground">{children}</h2>
}

// แถวในลิสต์: ไอคอน + ชื่อ ซ้าย · ตัวควบคุม ขวา — การ์ดเดียวคั่นด้วยเส้น ไม่แยกเป็นกล่องละอัน
function SettingRow({ icon: Icon, label, children }: {
  icon: React.ElementType
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-muted">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

/** select โปร่งใสวางทับค่าปัจจุบัน — ได้ native picker ของมือถือ โดยแถวยังดูเป็นลิสต์เรียบ ๆ */
function SettingSelect<T extends string>({ value, options, onChange, label }: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  label: string
}) {
  const current = options.find((option) => option.value === value)

  return (
    <label className="relative flex items-center gap-1 text-sm font-medium">
      <span>{current?.label ?? value}</span>
      <ChevronDown className="h-4 w-4 text-muted-foreground" />
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}

export default function ProfileSettingsPage() {
  const t = useTranslations('liff.profile')
  const tCommon = useTranslations('common')
  const { fontSize, setFontSize, theme, setTheme } = useSettingsStore()

  return (
    <>
      <PageHeader title={t('settings.title')} backHref="/profile" />
      <div className="px-4 py-6">

        <section>
          <SectionTitle>{t('settings.display')}</SectionTitle>
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">

            {/* ภาษา — ตัวสลับตัวเดียวกับ external (แผน i18n งาน 1.3) */}
            <SettingRow icon={Languages} label={tCommon('language.label')}>
              <LanguageSwitcher variant="select" />
            </SettingRow>

            {/* ขนาดตัวอักษร */}
            <SettingRow icon={Type} label={t('fontSize.label')}>
              <SettingSelect
                value={fontSize}
                onChange={setFontSize}
                label={t('fontSize.label')}
                options={FONT_SIZE_OPTIONS.map((value) => ({ value, label: t(`fontSize.${value}`) }))}
              />
            </SettingRow>

            {/* โหมดสี — ไว้สำหรับทดสอบ dark mode */}
            <SettingRow icon={MonitorSmartphone} label={t('theme.label')}>
              <SettingSelect
                value={theme}
                onChange={setTheme}
                label={t('theme.label')}
                options={THEME_OPTIONS.map((value) => ({ value, label: t(`theme.${value}`) }))}
              />
            </SettingRow>

          </div>
        </section>

        <p className="pt-6 text-center text-xs text-muted-foreground">
          {t('version', { version: process.env.NEXT_PUBLIC_APP_VERSION ?? '' })}
        </p>

      </div>
    </>
  )
}
