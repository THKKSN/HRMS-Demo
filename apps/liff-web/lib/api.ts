import axios, { type InternalAxiosRequestConfig } from 'axios'
import { readLocaleCookie } from '@hrms/i18n'

// ต้อง import แบบ lazy เพื่อกัน circular dependency (store ใช้ api, api ใช้ store)
function getAuthStore() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/stores/auth.store').useAuthStore
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Client-App': 'liff-web', // ให้ API รู้ช่องทางที่มา (เก็บลง ticket source_channel)
    'bypass-tunnel-reminder': 'true', // localtunnel interstitial bypass
  },
})

// Request: แนบ JWT + ภาษาปัจจุบัน
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAuthStore().getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`

  // ให้ API จำภาษาล่าสุดไว้ใช้ตอนส่ง notification ทาง LINE (แผน notification-i18n งาน N2.1)
  // อ่านจาก cookie ตรง ๆ ไม่ใช่ getCurrentLocale() เพราะ request แรก ๆ อาจยิงก่อน LocaleProvider ตั้งค่า
  // ยังไม่มี cookie = ผู้ใช้ยังไม่ผ่านหน้าเลือกภาษา → ไม่ส่ง header ดีกว่าส่งค่าที่เดาเอง
  const locale = readLocaleCookie()
  if (locale) config.headers['X-Locale'] = locale
  return config
})

/**
 * endpoint กลุ่ม /auth/* เป็นขั้นก่อนล็อกอิน — 401 ของกลุ่มนี้หมายถึง
 * "ข้อมูลที่กรอกไม่ถูกต้อง" ไม่ใช่ "access token หมดอายุ" การ refresh
 * จึงไม่มีความหมาย และการ redirect ทิ้งจะทำให้ผู้ใช้ไม่เห็น error เลย
 */
function isPreLoginAuthRequest(url: string | undefined) {
  return (url ?? '').startsWith('/auth/')
}

// Response: 401 → auto refresh → retry ครั้งเดียว
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (
      err.response?.status === 401 &&
      !original._retry &&
      !isPreLoginAuthRequest(original.url)
    ) {
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
            window.location.href = '/auth/link'
          }
        }
      }
    }
    return Promise.reject(err)
  }
)
