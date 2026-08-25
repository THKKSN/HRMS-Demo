import axios, { type InternalAxiosRequestConfig } from 'axios'

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

// Request: แนบ JWT
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAuthStore().getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
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
      } catch {
        getAuthStore().getState().clearAuth()
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/link'
        }
      }
    }
    return Promise.reject(err)
  }
)
