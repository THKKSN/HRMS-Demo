'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, LogOut, Moon, Sun, User } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useTheme } from '@/hooks/use-theme'
import { api } from '@/lib/api'

export function Header() {
  const router = useRouter()
  const { employee, clearAuth } = useAuthStore()
  const { theme, toggle } = useTheme()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleLogout() {
    setOpen(false)
    const { refreshToken } = useAuthStore.getState()
    try {
      if (refreshToken) await api.post('/auth/logout', { refreshToken })
    } catch {
      // fire and forget
    }
    clearAuth()
    router.replace('/login')
  }

  const displayRole = employee?.roles[0]?.role ?? ''

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
      <div />
      <div className="flex items-center gap-2">
        {/* theme toggle */}
        <button
          onClick={toggle}
          title={theme === 'dark' ? 'เปลี่ยนเป็น Light mode' : 'เปลี่ยนเป็น Dark mode'}
          className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* user dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-muted transition-colors"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
              <User className="h-3.5 w-3.5" />
            </div>
            <div className="text-left leading-tight">
              <div className="font-medium text-foreground">{employee?.fullName ?? '—'}</div>
              {displayRole && <div className="text-xs text-muted-foreground">{displayRole}</div>}
            </div>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-1 w-52 rounded-lg border border-border bg-background shadow-lg z-50">
              <div className="px-3 py-2.5 border-b border-border">
                <p className="text-sm font-medium text-foreground">{employee?.fullName ?? '—'}</p>
                {employee?.email && (
                  <p className="text-xs text-muted-foreground truncate">{employee.email}</p>
                )}
              </div>
              <div className="p-1">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  ออกจากระบบ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
