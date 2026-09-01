import axios, { type InternalAxiosRequestConfig } from 'axios'
import type { ExternalLineLoginResult } from '@hrms/shared-types'
import { getLiffAccessToken } from '@/lib/liff'

// axios instance แยกจากของพนักงาน — ใช้ external token คนละชุด ไม่ปน interceptor กัน
function getExternalAuthStore() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/stores/external-auth.store').useExternalAuthStore
}

export const externalApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'bypass-tunnel-reminder': 'true',
  },
})

externalApi.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getExternalAuthStore().getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/** Login ด้วย LIFF access token → external JWT (ไม่มี refresh token — หมดอายุก็เรียกซ้ำ) */
export async function externalLogin(): Promise<ExternalLineLoginResult> {
  const liffToken = getLiffAccessToken()
  if (!liffToken) throw new Error('LIFF_TOKEN_MISSING')
  const res = await externalApi.post<ExternalLineLoginResult>('/external/auth/line', {
    accessToken: liffToken,
  })
  const { accessToken, expiresIn, reporter } = res.data
  getExternalAuthStore().getState().setAuth(accessToken, expiresIn, reporter)
  return res.data
}

// 401 → login ใหม่ผ่าน LIFF token แล้ว retry ครั้งเดียว
externalApi.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean }
    const isLoginRequest = (original.url ?? '').includes('/external/auth/')
    if (err.response?.status === 401 && !original._retry && !isLoginRequest) {
      original._retry = true
      try {
        await externalLogin()
        const token = getExternalAuthStore().getState().accessToken
        original.headers.Authorization = `Bearer ${token}`
        return externalApi(original)
      } catch (loginErr) {
        // ล้าง auth เฉพาะเมื่อ login ใหม่โดนปฏิเสธจริง (401) — 429/network เป็นอาการชั่วคราว
        if (axios.isAxiosError(loginErr) && loginErr.response?.status === 401) {
          getExternalAuthStore().getState().clearAuth()
        }
      }
    }
    return Promise.reject(err)
  }
)
