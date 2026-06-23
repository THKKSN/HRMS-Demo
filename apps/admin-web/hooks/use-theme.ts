'use client'

import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('light')

  useEffect(() => {
    // Read current state from DOM (set by the inline script in layout)
    const isDark = document.documentElement.classList.contains('dark')
    setThemeState(isDark ? 'dark' : 'light')
  }, [])

  function applyTheme(t: Theme) {
    setThemeState(t)
    document.documentElement.classList.toggle('dark', t === 'dark')
    localStorage.setItem('theme', t)
  }

  function toggle() {
    applyTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return { theme, toggle }
}
