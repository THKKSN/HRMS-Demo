'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type FontSize = 'small' | 'medium' | 'large'
export type ThemeMode = 'system' | 'light' | 'dark'

type SettingsState = {
  fontSize: FontSize
  setFontSize: (size: FontSize) => void
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      fontSize: 'medium',
      setFontSize: (fontSize) => set({ fontSize }),
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'hrms-liff-settings' }
  )
)
