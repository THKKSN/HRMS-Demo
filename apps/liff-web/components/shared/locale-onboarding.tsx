'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'
import {
  DEFAULT_LOCALE,
  LOCALE_NATIVE_NAME,
  SUPPORTED_LOCALES,
  normalizeLocale,
  setCurrentLocale,
  writeLocaleCookie,
  type Locale,
} from '@hrms/i18n'
import { getLiffAppLanguage } from '@/lib/liff'

/**
 * เปลี่ยนเป็น true ถ้าอยากให้ถามภาษาทุกคนที่เปิดครั้งแรก (แผน i18n งาน 1.2 กำหนดให้เป็น flag เดียว)
 * ค่าเริ่มต้น false = ถามเฉพาะคนที่ภาษาแอป LINE ไม่ใช่ไทย — คนไทยส่วนใหญ่ไม่ต้องเจอขั้นตอนเพิ่ม
 */
const ASK_EVERYONE_ON_FIRST_OPEN = false

// ธงประจำภาษา — ใช้แทนประโยคอธิบาย เพราะหน้านี้ห้ามมีข้อความที่ต้อง "อ่านออก" นอกจากชื่อภาษา
const LOCALE_FLAG: Record<Locale, string> = {
  th: '🇹🇭',
  en: '🇬🇧',
  id: '🇮🇩',
}

type Phase =
  | { kind: 'ready' }
  | { kind: 'detecting' }
  | { kind: 'ask'; guess: Locale }
  | { kind: 'switching'; target: Locale }

type LocaleOnboardingProps = {
  /** request นี้มี cookie hrms-locale แล้ว → ผู้ใช้เคยเลือก/ระบบเคยเดาไว้ ไม่ต้องทำอะไร */
  hasLocaleCookie: boolean
  /** ภาษาที่ server render มา — ใช้รอให้ router.refresh() เสร็จก่อนเปิดหน้าจริง กันจอกระพริบภาษาไทย */
  serverLocale: Locale
  children: ReactNode
}

/**
 * ด่านแรกก่อนเข้าแอป (ทั้ง (main) และ external) เมื่อยังไม่มี cookie ภาษา — ดูแผน i18n งาน 1.1–1.2
 *   ภาษาแอป LINE = th → เขียน cookie th เงียบ ๆ แล้วเข้าใช้งานเลย
 *   ภาษาอื่น          → แสดงหน้าเลือกภาษา 1 หน้า (pre-select ภาษาที่เดาได้) เลือกแล้วไม่ถามอีก
 * ทำงานก่อน liff.init()/login เสร็จ เพราะ getAppLanguage() เรียกได้ตั้งแต่ก่อน init
 */
export function LocaleOnboarding({ hasLocaleCookie, serverLocale, children }: LocaleOnboardingProps) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>(hasLocaleCookie ? { kind: 'ready' } : { kind: 'detecting' })

  useEffect(() => {
    if (phase.kind !== 'detecting') return
    let cancelled = false

    async function detect() {
      // E2E รันนอก LINE บนเครื่องภาษาอังกฤษ — ไม่ให้หน้าถามภาษาไปขวาง flow ทดสอบเดิม
      if (process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === 'true') {
        writeLocaleCookie(DEFAULT_LOCALE)
        if (!cancelled) setPhase({ kind: 'ready' })
        return
      }

      // ภาษาที่ไม่รองรับตกเป็น en ไม่ใช่ th (D5) — คนที่ตั้งเครื่องเป็นภาษาอื่นมีโอกาสอ่านไทยไม่ออก
      const guess = normalizeLocale(await getLiffAppLanguage(), 'en')
      if (cancelled) return

      if (!ASK_EVERYONE_ON_FIRST_OPEN && guess === DEFAULT_LOCALE) {
        writeLocaleCookie(DEFAULT_LOCALE)
        setPhase({ kind: 'ready' })
        return
      }
      setPhase({ kind: 'ask', guess })
    }

    detect()
    return () => {
      cancelled = true
    }
  }, [phase.kind])

  // เลือกภาษาที่ไม่ใช่ที่ server render มา → รอ refresh ให้ได้ภาษาใหม่ก่อนค่อยโชว์หน้าจริง
  useEffect(() => {
    if (phase.kind === 'switching' && phase.target === serverLocale) setPhase({ kind: 'ready' })
  }, [phase, serverLocale])

  function choose(locale: Locale) {
    writeLocaleCookie(locale)
    setCurrentLocale(locale)
    if (locale === serverLocale) {
      setPhase({ kind: 'ready' })
      return
    }
    setPhase({ kind: 'switching', target: locale })
    router.refresh()
  }

  if (phase.kind === 'ready') return <>{children}</>

  if (phase.kind === 'ask') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-12">
        <div className="text-5xl" aria-hidden>
          🌐
        </div>
        <ul className="w-full max-w-xs space-y-3">
          {SUPPORTED_LOCALES.map((locale: Locale) => {
            const selected = locale === phase.guess
            return (
              <li key={locale}>
                <button
                  type="button"
                  lang={locale}
                  onClick={() => choose(locale)}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left text-base font-semibold transition-colors ${
                    selected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-foreground'
                  }`}
                >
                  <span className="text-2xl" aria-hidden>
                    {LOCALE_FLAG[locale]}
                  </span>
                  <span className="flex-1">{LOCALE_NATIVE_NAME[locale]}</span>
                  {selected && <Check className="h-5 w-5" />}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  // detecting / switching — ไม่มีข้อความ เพราะยังไม่รู้ว่าผู้ใช้อ่านภาษาอะไรออก
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}
