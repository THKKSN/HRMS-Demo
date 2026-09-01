'use client'

import { useEffect, useState } from 'react'

// ขนาดฟอนต์ทั้งแอป — scale ที่ root font-size (Tailwind ใช้หน่วย rem จึงขยาย/ย่อตามทั้งหน้า)
// ค่าเริ่มแรกถูก apply ก่อน first paint โดย inline script ใน app/layout.tsx
export type FontSize = 'small' | 'normal' | 'large'

const FONT_SIZE_PX: Record<FontSize, string> = {
  small: '14px',
  normal: '16px',
  large: '18px',
}

const STORAGE_KEY = 'font-size'

export function useFontSize() {
  const [fontSize, setFontSizeState] = useState<FontSize>('normal')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'small' || stored === 'large') setFontSizeState(stored)
  }, [])

  function setFontSize(size: FontSize) {
    setFontSizeState(size)
    document.documentElement.style.fontSize = size === 'normal' ? '' : FONT_SIZE_PX[size]
    if (size === 'normal') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, size)
  }

  return { fontSize, setFontSize }
}
