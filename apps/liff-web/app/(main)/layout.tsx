'use client'

import type { ReactNode } from 'react'
import { BottomNav } from '@/components/layout/bottom-nav'
import { useAuthGuard } from '@/hooks/use-auth-guard'
import { useLiffLogin } from '@/hooks/use-liff-login'

export default function MainLayout({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthGuard()
  useLiffLogin()

  if (!isAuthenticated) return null

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 pb-16">{children}</main>
      <BottomNav />
    </div>
  )
}
