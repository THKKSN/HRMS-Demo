'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Building2, Check, Clock3, Loader2, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { callingCodeOf, isE164, isSupportedCountry, parseE164, toE164 } from '@hrms/i18n'
import { useApiError } from '@/hooks/use-api-error'
import { cn } from '@/lib/utils'
import { PhoneField } from '@/components/shared/phone-field'
import { useUpdateExternalProfile } from '@/hooks/use-external-tickets'
import { useExternalAuthStore } from '@/stores/external-auth.store'

// ประเทศเริ่มต้นเมื่อยังไม่เคยกรอก — ลูกค้าส่วนใหญ่อยู่ไทย ส่วนผู้ใช้ภาษาอินโดฯ เดาเป็นอินโดนีเซีย
const DEFAULT_COUNTRY_BY_LOCALE: Record<string, string> = { th: 'TH', id: 'ID', en: 'TH' }

type FieldKey = 'fullName' | 'phone' | 'email' | 'organization'

const FIELD_KEYS: FieldKey[] = ['fullName', 'phone', 'email', 'organization']

// ช่องกรอก 1 ช่อง: ไอคอนนำหน้า · ติ๊กถูกเมื่อกรอกถูกต้อง · ข้อความเตือนใต้ช่องเมื่อออกจากช่องแล้วยังไม่ผ่าน
function Field({
  icon: Icon,
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  maxLength,
  type = 'text',
  inputMode,
  autoComplete,
  error,
  valid,
}: {
  icon: React.ElementType
  label: string
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  placeholder?: string
  maxLength?: number
  type?: string
  inputMode?: 'text' | 'tel' | 'email'
  autoComplete?: string
  error?: string
  valid: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-external-muted">
        {label} <span className="text-red-500">*</span>
      </span>
      <div
        className={cn(
          'flex h-12 items-center rounded-xl border bg-external-surface transition-colors',
          error ? 'border-red-300 dark:border-red-500/60' : 'border-external-line focus-within:border-external-brand',
        )}
      >
        <Icon className={cn('ml-3 h-4 w-4 shrink-0', error ? 'text-red-400' : 'text-external-muted')} />
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          maxLength={maxLength}
          inputMode={inputMode}
          autoComplete={autoComplete}
          className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-sm outline-none placeholder:text-external-muted"
        />
        {valid && <Check className="mr-3 h-4 w-4 shrink-0 text-external-brand-text" />}
      </div>
      {error && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{error}</span>}
    </label>
  )
}

// หน้าลงทะเบียนครั้งแรกของบุคคลภายนอก — layout เด้งมาที่นี่เมื่อโปรไฟล์ยังไม่ครบ
// ไม่มีปุ่มย้อนกลับ เพราะยังไม่ลงทะเบียนก็ใช้งานหน้าอื่นไม่ได้
export default function ExternalRegisterPage() {
  const t = useTranslations('liff.external.register')
  const tCommon = useTranslations('common')
  const apiError = useApiError()
  const locale = useLocale()
  const router = useRouter()
  const reporter = useExternalAuthStore(s => s.reporter)
  const updateProfile = useUpdateExternalProfile()

  // เบอร์ที่เคยบันทึกไว้เป็น E.164 → แยกกลับเป็นประเทศ + เบอร์ในประเทศเพื่อเติมลงฟอร์ม
  const savedPhone = parseE164(reporter?.phone, reporter?.phoneCountry)

  const [fullName, setFullName] = useState(reporter?.fullName ?? '')
  const [phoneCountry, setPhoneCountry] = useState(
    savedPhone?.country
      ?? (isSupportedCountry(reporter?.phoneCountry) ? reporter!.phoneCountry!.toUpperCase() : null)
      ?? DEFAULT_COUNTRY_BY_LOCALE[locale]
      ?? 'TH',
  )
  const [phone, setPhone] = useState(savedPhone?.nationalNumber ?? reporter?.phone ?? '')
  const [email, setEmail] = useState(reporter?.email ?? '')
  const [organization, setOrganization] = useState(reporter?.organization ?? '')
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({})

  const phoneE164 = toE164(callingCodeOf(phoneCountry) ?? '', phone)

  // เกณฑ์เดียวกับที่ layout ใช้ตัดสินว่า "ลงทะเบียนครบ" — บังคับครบทั้ง 4 ช่อง
  const valid: Record<FieldKey, boolean> = {
    fullName: fullName.trim().length > 0,
    phone: isE164(phoneE164),
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
    organization: organization.trim().length > 0,
  }
  const filledCount = FIELD_KEYS.filter(key => valid[key]).length
  const canSubmit = filledCount === FIELD_KEYS.length

  // เตือนเฉพาะช่องที่ผู้ใช้แตะแล้วและยังมีค่าค้างอยู่ — ช่องว่างที่ยังไม่เริ่มกรอกไม่ต้องขึ้นแดง
  function errorOf(key: FieldKey, value: string, message: string) {
    if (valid[key] || !touched[key] || value.trim().length === 0) return undefined
    return message
  }

  async function submitProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit || updateProfile.isPending) return
    try {
      await updateProfile.mutateAsync({
        fullName: fullName.trim(),
        phone: phoneE164,
        phoneCountry,
        email: email.trim(),
        organization: organization.trim(),
      })
      toast.success(t('success'))
      router.replace('/external')
    } catch (err) {
      toast.error(apiError(err, tCommon('state.error')))
    }
  }

  return (
    <div className="min-h-full bg-external-canvas">
      {/* hero ต่อจากแถบภาษาของ layout ให้เป็นพื้นเขียวผืนเดียว */}
      <div className="bg-external-brand px-4 pb-10 pt-2 text-white">
        <div className="flex items-center gap-3">
          {reporter?.pictureUrl ? (
            <img
              src={reporter.pictureUrl}
              alt={reporter.lineDisplayName ?? ''}
              className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-white/40"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15">
              <UserRound className="h-7 w-7" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">{t('title')}</h1>
            <p className="mt-0.5 text-xs leading-5 text-white/75">
              {reporter?.lineDisplayName
                ? t('introWithName', { name: reporter.lineDisplayName })
                : t('intro')}
            </p>
          </div>
        </div>

        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium">
          <Clock3 className="h-3 w-3" />
          {t('timeHint')}
        </span>
      </div>

      {/* การ์ดฟอร์มเลื่อนขึ้นทับขอบ hero */}
      <form onSubmit={submitProfile} className="relative -mt-6 px-4">
        <section className="rounded-3xl bg-external-surface p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">{t('contactSection')}</span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                canSubmit ? 'bg-external-brand/10 text-external-brand-text' : 'bg-external-line/60 text-external-muted',
              )}
            >
              {t('progress', { done: filledCount, total: FIELD_KEYS.length })}
            </span>
          </div>

          <div className="space-y-3.5">
            <Field
              icon={UserRound}
              label={t('fullName')}
              value={fullName}
              onChange={setFullName}
              onBlur={() => setTouched(prev => ({ ...prev, fullName: true }))}
              placeholder={t('fullNamePlaceholder')}
              maxLength={200}
              autoComplete="name"
              valid={valid.fullName}
            />
            {/* ใช้ div ไม่ใช่ label — ข้างในมีปุ่มเลือกประเทศ ถ้าเป็น label คลิกที่ใดก็ตามจะถูก forward ไปกดปุ่มนั้น */}
            <div className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-external-muted">
                <Phone className="h-3.5 w-3.5 text-external-muted" />
                {t('phone')} <span className="text-red-500">*</span>
              </span>
              <PhoneField
                country={phoneCountry}
                onCountryChange={setPhoneCountry}
                value={phone}
                onChange={setPhone}
                onBlur={() => setTouched(prev => ({ ...prev, phone: true }))}
                placeholder={t('phonePlaceholder')}
                ariaLabel={t('phone')}
                valid={valid.phone}
                error={errorOf('phone', phone, t('invalidPhone'))}
              />
              {errorOf('phone', phone, t('invalidPhone')) && (
                <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{t('invalidPhone')}</span>
              )}
            </div>
            <Field
              icon={Mail}
              label={t('email')}
              value={email}
              onChange={setEmail}
              onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
              placeholder={t('emailPlaceholder')}
              maxLength={320}
              type="email"
              inputMode="email"
              autoComplete="email"
              valid={valid.email}
              error={errorOf('email', email, t('invalidEmail'))}
            />
            <Field
              icon={Building2}
              label={t('organization')}
              value={organization}
              onChange={setOrganization}
              onBlur={() => setTouched(prev => ({ ...prev, organization: true }))}
              placeholder={t('organizationPlaceholder')}
              maxLength={200}
              autoComplete="organization"
              valid={valid.organization}
            />
          </div>

          <div className="mt-4 flex gap-2.5 rounded-2xl bg-external-canvas p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-external-brand-text" />
            <p className="text-xs leading-5 text-external-muted">{t('privacyNote')}</p>
          </div>
        </section>

        {/* แถบปุ่มติดขอบล่าง — เลื่อนอ่านฟอร์มได้โดยปุ่มไม่ทับเนื้อหา */}
        <div className="sticky bottom-0 -mx-4 mt-4 bg-gradient-to-t from-external-canvas via-external-canvas to-transparent px-4 pb-5 pt-4">
          <button
            type="submit"
            disabled={!canSubmit || updateProfile.isPending}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-external-brand text-sm font-bold text-white shadow-lg shadow-external-brand/25 transition-colors disabled:bg-external-line disabled:text-external-muted disabled:shadow-none"
          >
            {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t('submit')}
          </button>
          {!canSubmit && (
            <p className="mt-2 text-center text-[11px] text-external-muted">{t('requiredHint')}</p>
          )}
        </div>
      </form>
    </div>
  )
}
