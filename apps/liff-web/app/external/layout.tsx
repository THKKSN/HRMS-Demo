'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Loader2, ShieldAlert } from 'lucide-react'
import { Toaster } from 'sonner'
import { isAxiosError } from 'axios'
import { useLiffContext } from '@/components/providers/liff-provider'
import { externalLogin } from '@/lib/external-api'
import { liff } from '@/lib/liff'
import { useExternalAuthStore } from '@/stores/external-auth.store'

// Layout แยกจาก (main) ของพนักงานทั้งหมด — ใช้ external auth คนละชุด ไม่มี BottomNav ของพนักงาน
export default function ExternalLayout({ children }: { children: ReactNode }) {
  const { isReady, isLoggedIn, error: liffError } = useLiffContext()
  const { accessToken, expiresAt } = useExternalAuthStore()
  const [error, setError] = useState<string | null>(null)
  const loggingIn = useRef(false)

  const tokenValid = !!accessToken && !!expiresAt && expiresAt > Date.now() + 30_000

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
          setError(code === 'LINE_OA_FRIEND_REQUIRED'
            ? 'กรุณาเพิ่มเพื่อน LINE Official Account ก่อนใช้งาน แล้วเปิดหน้านี้ใหม่อีกครั้ง'
            : 'บัญชีของท่านถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ')
        } else {
          setError('เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
        }
      })
      .finally(() => { loggingIn.current = false })
  }, [isReady, isLoggedIn, liffError, tokenValid])

  if (liffError || error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <ShieldAlert className="h-10 w-10 text-red-500" />
        <p className="text-sm text-slate-600">{error ?? 'ไม่สามารถเชื่อมต่อ LINE ได้ กรุณาเปิดผ่านแอป LINE'}</p>
      </div>
    )
  }

  if (!tokenValid) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        <p className="text-sm text-muted-foreground">กำลังเข้าสู่ระบบ...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">{children}</main>
      <Toaster position="top-center" richColors />
    </div>
  )
}
