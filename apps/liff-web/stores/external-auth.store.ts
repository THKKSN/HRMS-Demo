'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ExternalReporterProfileDto } from '@hrms/shared-types'

// Auth ฝั่งบุคคลภายนอก — token คนละชุดกับพนักงาน ไม่มี refresh token
// (หมดอายุแล้ว layout จะ login ใหม่ผ่าน LIFF access token อัตโนมัติ)
type ExternalAuthState = {
  accessToken: string | null
  expiresAt: number | null // epoch ms
  reporter: ExternalReporterProfileDto | null
  setAuth: (accessToken: string, expiresIn: number, reporter: ExternalReporterProfileDto) => void
  setReporter: (reporter: ExternalReporterProfileDto) => void
  clearAuth: () => void
}

export const useExternalAuthStore = create<ExternalAuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      expiresAt: null,
      reporter: null,

      setAuth: (accessToken, expiresIn, reporter) =>
        set({ accessToken, expiresAt: Date.now() + expiresIn * 1000, reporter }),

      setReporter: (reporter) => set({ reporter }),

      clearAuth: () => set({ accessToken: null, expiresAt: null, reporter: null }),
    }),
    {
      name: 'hrms-external-auth',
      partialize: (s) => ({
        accessToken: s.accessToken,
        expiresAt: s.expiresAt,
        reporter: s.reporter,
      }),
    }
  )
)
