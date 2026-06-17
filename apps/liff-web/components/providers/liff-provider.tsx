'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { initLiff, liff } from '@/lib/liff'

type LiffContextValue = {
  isReady: boolean
  isLoggedIn: boolean
  error: string | null
}

const LiffContext = createContext<LiffContextValue>({ isReady: false, isLoggedIn: false, error: null })

export function useLiffContext() {
  return useContext(LiffContext)
}

export function LiffProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    initLiff()
      .then(() => {
        setIsLoggedIn(liff.isLoggedIn())
        setIsReady(true)
      })
      .catch((err) => {
        console.error('LIFF init failed:', err)
        setError(err?.message ?? 'LIFF init failed')
      })
  }, [])

  return (
    <LiffContext.Provider value={{ isReady, isLoggedIn, error }}>
      {children}
    </LiffContext.Provider>
  )
}
