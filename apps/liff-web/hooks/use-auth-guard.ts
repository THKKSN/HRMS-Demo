'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'

export function useAuthGuard() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [hasHydrated, setHasHydrated] = useState(false)

  useEffect(() => {
    const persist = useAuthStore.persist
    if (persist.hasHydrated()) {
      setHasHydrated(true)
      return
    }

    return persist.onFinishHydration(() => setHasHydrated(true))
  }, [])

  useEffect(() => {
    if (!hasHydrated) return

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
  }, [hasHydrated, isAuthenticated, router])

  return hasHydrated && isAuthenticated
}
