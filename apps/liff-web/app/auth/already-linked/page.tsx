'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RefreshCcw } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'
import type { AuthResultDto, ApiError } from '@hrms/shared-types'
import { isAxiosError } from 'axios'

export default function AlreadyLinkedPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const lineAccessToken = sessionStorage.getItem('liff_access_token')
    if (!lineAccessToken) {
      router.replace('/auth/link')
      return
    }

    let cancelled = false

    const autoLogin = async () => {
      try {
        const res = await api.post<AuthResultDto>('/auth/line', {
          accessToken: lineAccessToken,
        })
        if (cancelled) return
        sessionStorage.removeItem('liff_access_token')
        const { accessToken, refreshToken, employee } = res.data
        setAuth(accessToken, refreshToken, employee)
        router.replace('/')
      } catch (err) {
        if (cancelled) return
        if (isAxiosError(err)) {
          const data = err.response?.data as ApiError | undefined
          if (err.response?.status === 401) {
            sessionStorage.removeItem('liff_access_token')
            router.replace('/auth/link')
            return
          }
          setErrorMsg(data?.message ?? 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่')
        }
      }
    }

    autoLogin()
    return () => { cancelled = true }
  }, [router, setAuth])

  if (errorMsg) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
          <RefreshCcw className="h-7 w-7 text-destructive" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-foreground">เข้าสู่ระบบไม่สำเร็จ</p>
          <p className="text-sm text-destructive">{errorMsg}</p>
        </div>
        <button
          onClick={() => router.replace('/auth/link')}
          className="rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 transition-colors hover:bg-primary/90"
        >
          ลองใหม่อีกครั้ง
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 py-16 text-center">
      {/* Animated ring */}
      <div className="relative flex h-20 w-20 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-foreground">กำลังเข้าสู่ระบบ</p>
        <p className="text-sm text-muted-foreground">พบบัญชีที่ผูกไว้แล้ว กำลังดำเนินการ...</p>
      </div>
    </div>
  )
}
