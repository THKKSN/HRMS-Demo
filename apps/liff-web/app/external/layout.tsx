'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2, ShieldAlert } from 'lucide-react'
import { Toaster } from 'sonner'
import { isAxiosError } from 'axios'
import { useLiffContext } from '@/components/providers/liff-provider'
import { LanguageSwitcher } from '@/components/shared/language-switcher'
import { externalLogin } from '@/lib/external-api'
import { liff } from '@/lib/liff'
import { useExternalAuthStore } from '@/stores/external-auth.store'

const REGISTER_PATH = '/external/register'

type LoginErrorKey = 'friendRequired' | 'suspended' | 'loginFailed'

// แถบบนสุดของทุกหน้า external — ผู้แจ้งภายนอกไม่มีหน้าตั้งค่า จึงต้องเห็นปุ่มเปลี่ยนภาษาตั้งแต่หน้าแรก
// (รวมตอน loading/error ก่อน login เสร็จ) สีเดียวกับ header ของทุกหน้าให้กลืนเป็นแถบเดียว
function ExternalTopBar() {
  return (
    <div className="flex justify-end bg-external-brand px-4 pt-3">
      <LanguageSwitcher variant="pill" className="bg-white/20 text-white" />
    </div>
  )
}

// Layout แยกจาก (main) ของพนักงานทั้งหมด — ใช้ external auth คนละชุด ไม่มี BottomNav ของพนักงาน
export default function ExternalLayout({ children }: { children: ReactNode }) {
  const t = useTranslations('liff.external.layout')
  const { isReady, isLoggedIn, error: liffError } = useLiffContext()
  const { accessToken, expiresAt, reporter } = useExternalAuthStore()
  const [errorKey, setErrorKey] = useState<LoginErrorKey | null>(null)
  const loggingIn = useRef(false)
  const router = useRouter()
  const pathname = usePathname()

  const tokenValid = !!accessToken && !!expiresAt && expiresAt > Date.now() + 30_000

  // ลงทะเบียนครบ = กรอกข้อมูลผู้แจ้งครั้งแรกแล้ว (เกณฑ์เดียวกับที่ /external/new ใช้ก่อนหน้านี้)
  const profileComplete =
    !!reporter?.fullName && !!reporter?.phone && !!reporter?.email && !!reporter?.organization
  const onRegisterPage = pathname === REGISTER_PATH
  const needRegister = tokenValid && !profileComplete && !onRegisterPage
  const registerDone = tokenValid && profileComplete && onRegisterPage

  useEffect(() => {
    if (!isReady || liffError || tokenValid || loggingIn.current) return

    if (!isLoggedIn && process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS !== 'true') {
      liff.login({ redirectUri: window.location.href })
      return
    }

    loggingIn.current = true
    externalLogin()
      .catch((err) => {
        if (isAxiosError(err) && err.response?.status === 403) {
          const code = (err.response.data as { error?: string })?.error
          setErrorKey(code === 'LINE_OA_FRIEND_REQUIRED' ? 'friendRequired' : 'suspended')
        } else {
          setErrorKey('loginFailed')
        }
      })
      .finally(() => { loggingIn.current = false })
  }, [isReady, isLoggedIn, liffError, tokenValid])

  // เข้าครั้งแรก (ยังไม่มีข้อมูลผู้แจ้ง) → บังคับไปหน้าลงทะเบียนก่อน
  // ลงทะเบียนแล้วแต่เปิด /external/register ตรงๆ → กลับหน้ารายการเรื่องแจ้ง
  useEffect(() => {
    if (needRegister) router.replace(REGISTER_PATH)
    else if (registerDone) router.replace('/external')
  }, [needRegister, registerDone, router])

  // Toaster อยู่นอกเงื่อนไขทุกกรณี — ไม่ให้ toast หลุดตอนสลับหน้าไป/กลับจากหน้าลงทะเบียน
  return (
    // พื้นหลังของทั้งช่องทาง external (รวมจอ loading/error) ใช้ canvas เดียวกับหน้าเนื้อหา ไม่ใช่พื้นหลักของฝั่งพนักงาน
    <div className="flex min-h-screen flex-col bg-external-canvas">
      <ExternalTopBar />
      {liffError || errorKey ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <ShieldAlert className="h-10 w-10 text-red-500" />
          <p className="text-sm text-external-muted">{t(errorKey ?? 'liffUnavailable')}</p>
        </div>
      ) : !tokenValid || needRegister || registerDone ? (
        // รอ redirect ให้เสร็จก่อนค่อย render children — กันหน้าเดิมแวบขึ้นมาก่อนเด้ง
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-external-muted" />
          <p className="text-sm text-muted-foreground">
            {tokenValid ? t('opening') : t('loggingIn')}
          </p>
        </div>
      ) : (
        <main className="flex-1">{children}</main>
      )}
      <Toaster position="top-center" richColors />
    </div>
  )
}
