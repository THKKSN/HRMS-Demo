'use client'

import { useEffect, useState } from 'react'

// 'system' = ตาม OS (ไม่เก็บค่าใน localStorage — inline script ใน layout ตีความ key ที่หายไปเป็น system)
export type ThemeMode = 'light' | 'dark' | 'system'

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyThemeClass(mode: ThemeMode) {
  const dark = mode === 'dark' || (mode === 'system' && systemPrefersDark())
  document.documentElement.classList.toggle('dark', dark)
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>('system')

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    setModeState(stored === 'dark' || stored === 'light' ? stored : 'system')
  }, [])

  // โหมด system ต้องตามการสลับธีมของ OS แบบสด
  useEffect(() => {
    if (mode !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyThemeClass('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [mode])

  function setMode(next: ThemeMode) {
    setModeState(next)
    applyThemeClass(next)
    if (next === 'system') localStorage.removeItem('theme')
    else localStorage.setItem('theme', next)
  }

  // ธีมที่แสดงผลจริงตอนนี้ (ใช้กับปุ่ม toggle บน header)
  const resolved: 'light' | 'dark' =
    mode === 'system'
      ? (typeof window !== 'undefined' && systemPrefersDark() ? 'dark' : 'light')
      : mode

  function toggle() {
    setMode(resolved === 'dark' ? 'light' : 'dark')
  }

  return { theme: resolved, mode, setMode, toggle }
}
