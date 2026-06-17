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

      setAuth: (accessToken, refreshToken, employee) => {
        // เขียน cookie ให้ middleware อ่านได้ (SameSite=Lax, ไม่มี HttpOnly)
        document.cookie = `hrms-access-token=${accessToken}; path=/; SameSite=Lax`
        set({ accessToken, refreshToken, employee, isAuthenticated: true })
      },

      clearAuth: () => {
        document.cookie = 'hrms-access-token=; path=/; max-age=0'
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
      name: 'hrms-auth',
      partialize: (s) => ({
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        employee: s.employee,
        isAuthenticated: s.isAuthenticated,
      }),
    }
  )
)
