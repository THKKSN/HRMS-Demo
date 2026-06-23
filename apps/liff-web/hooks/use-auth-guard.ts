'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'

export function useAuthGuard() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    const liffState = new URLSearchParams(window.location.search).get('liff.state')

    if (!isAuthenticated) {
      const currentPath = window.location.pathname
      const next = liffState ?? currentPath
      const shouldSave = next && next !== '/' && !next.startsWith('/auth')
      router.replace(shouldSave ? `/auth/link?next=${encodeURIComponent(next)}` : '/auth/link')
    } else if (liffState && liffState !== '/' && !liffState.startsWith('/auth')) {
      // ผูกบัญชีแล้ว แต่ LIFF เปิดที่ root พร้อม liff.state → navigate ไปตรงๆ
      router.replace(liffState)
    }
  }, [isAuthenticated, router])

  return isAuthenticated
}
