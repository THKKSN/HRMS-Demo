'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import { api } from '@/lib/api'
import { liff } from '@/lib/liff'
import type { AuthResultDto } from '@hrms/shared-types'
import { isAxiosError } from 'axios'

/**
 * ใช้ใน root layout หรือ (main) layout
 * ตรวจ token ที่มีอยู่: ถ้า valid ก็ไม่ทำอะไร
 * ถ้า access token หมดอายุ → refresh → update store
 * ถ้า refresh ล้มเหลว → clearAuth → redirect /auth/link
 */
export function useLiffLogin() {
  const router = useRouter()
  const { accessToken, refreshToken, setAuth, clearAuth } = useAuthStore()
  const checked = useRef(false)

  useEffect(() => {
    if (checked.current) return
    checked.current = true

    if (!accessToken) {
      // ไม่มี token → middleware จะ redirect อยู่แล้ว ไม่ต้องทำอะไร
      return
    }

    const validateOrRefresh = async () => {
      try {
        // ping endpoint ที่ต้อง auth เพื่อตรวจ token
        await api.get('/auth/me')
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 401) {
          // access token หมด → ลอง refresh
          if (!refreshToken) {
            clearAuth()
            router.replace('/auth/link')
            return
          }
          try {
            const res = await api.post<AuthResultDto>('/auth/refresh', { refreshToken })
            const { accessToken: newAccess, refreshToken: newRefresh, employee } = res.data
            setAuth(newAccess, newRefresh, employee)
          } catch {
            clearAuth()
            router.replace('/auth/link')
          }
        }
      }
    }

    validateOrRefresh()
  }, [accessToken, refreshToken, setAuth, clearAuth, router])
}
