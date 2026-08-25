'use client'

import { useEffect } from 'react'
import { useSettingsStore } from '@/stores/settings.store'

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const fontSize = useSettingsStore((s) => s.fontSize)

  useEffect(() => {
    document.documentElement.dataset.fontSize = fontSize
  }, [fontSize])

  return children
}
