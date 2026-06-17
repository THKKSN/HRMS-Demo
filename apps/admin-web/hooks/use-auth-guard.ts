'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'

export function useAuthGuard() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const hasHydrated = useAuthStore((s) => s._hasHydrated)

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, hasHydrated, router])

  // ยังไม่ hydrate → แสดง loading (ไม่ redirect)
  if (!hasHydrated) return null
  return isAuthenticated
}
