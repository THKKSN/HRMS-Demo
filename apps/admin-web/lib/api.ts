import axios, { type InternalAxiosRequestConfig } from 'axios'
import { readLocaleCookie } from '@hrms/i18n'

function getAuthStore() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/stores/auth.store').useAuthStore
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Client-App': 'admin-web', // ให้ API รู้ช่องทางที่มา (เก็บลง ticket source_channel)
  },
})

// Request: แนบ JWT + ภาษาปัจจุบัน
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAuthStore().getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`

  // ให้ API จำภาษาล่าสุดไว้ใช้ตอนส่ง notification ทาง LINE (แผน notification-i18n งาน N2.1)
  // อ่านจาก cookie ตรง ๆ ไม่ใช่ getCurrentLocale() เพราะ request แรก ๆ อาจยิงก่อน LocaleProvider ตั้งค่า
  const locale = readLocaleCookie()
  if (locale) config.headers['X-Locale'] = locale
  return config
})

/**
 * endpoint กลุ่ม /auth/* (login, refresh) — 401 ของกลุ่มนี้คือ "ข้อมูล/token ที่ส่งไปไม่ถูกต้อง"
 * ไม่ใช่ access token หมดอายุ ห้าม trigger refresh ซ้อน (โดยเฉพาะ /auth/refresh เอง)
 */
function isAuthRequest(url: string | undefined) {
  return (url ?? '').startsWith('/auth/')
}

// Response: 401 → auto refresh → retry ครั้งเดียว
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (err.response?.status === 401 && !original._retry && !isAuthRequest(original.url)) {
      original._retry = true
      try {
        await getAuthStore().getState().refreshTokens()
        const token = getAuthStore().getState().accessToken
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      } catch (refreshErr) {
        // เด้งออกเฉพาะเมื่อ refresh token ใช้ไม่ได้จริง (401) —
        // 429/network error เป็นอาการชั่วคราว ห้าม logout ไม่งั้นผู้ใช้หลุดทั้งที่ token ยังดี
        if (axios.isAxiosError(refreshErr) && refreshErr.response?.status === 401) {
          getAuthStore().getState().clearAuth()
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
        }
      }
    }
    return Promise.reject(err)
  }
)
