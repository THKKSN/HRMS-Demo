'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EmployeeSummaryDto } from '@hrms/shared-types'
import { api } from '@/lib/api'

// promise ของการ refresh ที่กำลังทำอยู่ — แชร์ให้ทุก caller ที่มาพร้อมกัน
let refreshInFlight: Promise<void> | null = null

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
        // single-flight: หลาย request โดน 401 พร้อมกันต้องแชร์การ refresh เดียว —
        // refresh token เป็นแบบ rotation ถ้ายิงคู่ขนาน ตัวหลังจะส่ง token ที่ถูก rotate ไปแล้ว → 401 → หลุดออกจากระบบ
        refreshInFlight ??= (async () => {
          const { refreshToken } = get()
          if (!refreshToken) throw new Error('No refresh token')
          const res = await api.post('/auth/refresh', { refreshToken })
          const { accessToken, refreshToken: newRefresh, employee } = res.data
          document.cookie = `hrms-access-token=${accessToken}; path=/; SameSite=Lax`
          set({ accessToken, refreshToken: newRefresh, employee, isAuthenticated: true })
        })()
        try {
          await refreshInFlight
        } finally {
          refreshInFlight = null
        }
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
