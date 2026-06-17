'use client'

import { useRouter } from 'next/navigation'
import { LogOut, User } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { api } from '@/lib/api'

export function Header() {
  const router = useRouter()
  const { employee, clearAuth } = useAuthStore()

  async function handleLogout() {
    const { refreshToken } = useAuthStore.getState()
    try {
      if (refreshToken) await api.post('/auth/logout', { refreshToken })
    } catch {
      // fire and forget
    }
    clearAuth()
    router.replace('/login')
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
      <div />
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{employee?.fullName ?? '—'}</span>
          {employee?.roles[0] && (
            <span className="text-muted-foreground">· {employee.roles[0].role}</span>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          ออกจากระบบ
        </button>
      </div>
    </header>
  )
}
