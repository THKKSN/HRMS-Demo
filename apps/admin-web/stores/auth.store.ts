'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EmployeeSummaryDto } from '@hrms/shared-types'
import { api } from '@/lib/api'

type AuthState = {
  accessToken: string | null
  refreshToken: string | null
  employee: EmployeeSummaryDto | null
  isAuthenticated: boolean
  _hasHydrated: boolean
  setHasHydrated: (v: boolean) => void
  setAuth: (accessToken: string, refreshToken: string, employee: EmployeeSummaryDto) => void
  clearAuth: () => void
  refreshTokens: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      employee: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setHasHydrated: (v) => set({ _hasHydrated: v }),

      setAuth: (accessToken, refreshToken, employee) => {
        if (typeof document !== 'undefined') {
          document.cookie = 'hrms-admin-authed=1; path=/; SameSite=Lax'
        }
        set({ accessToken, refreshToken, employee, isAuthenticated: true })
      },

      clearAuth: () => {
        if (typeof document !== 'undefined') {
          document.cookie = 'hrms-admin-authed=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        }
        set({ accessToken: null, refreshToken: null, employee: null, isAuthenticated: false })
      },

      refreshTokens: async () => {
        const { refreshToken } = get()
        if (!refreshToken) throw new Error('No refresh token')
        const res = await api.post('/auth/refresh', { refreshToken })
        const { accessToken, refreshToken: newRefresh, employee } = res.data
        set({ accessToken, refreshToken: newRefresh, employee, isAuthenticated: true })
      },
    }),
    {
      name: 'hrms-admin-auth',
      partialize: (s) => ({
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        employee: s.employee,
        isAuthenticated: s.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
