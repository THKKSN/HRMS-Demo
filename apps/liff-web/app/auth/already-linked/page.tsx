'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
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
          // 401 = token หมดอายุ / ไม่พบ → ให้ link ใหม่
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
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
        <p className="text-sm text-destructive">{errorMsg}</p>
        <button
          onClick={() => router.replace('/auth/link')}
          className="mt-6 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        >
          ลองใหม่
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">กำลังเข้าสู่ระบบ...</p>
    </div>
  )
}
