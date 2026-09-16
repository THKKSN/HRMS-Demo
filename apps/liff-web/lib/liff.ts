import type LiffType from '@line/liff'

let liffInstance: typeof LiffType | null = null
let initialized = false

export function getLiffId(): string {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID
  if (!liffId) {
    throw new Error('Missing NEXT_PUBLIC_LIFF_ID')
  }

  return liffId
}

export function buildLiffUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `https://liff.line.me/${getLiffId()}${normalizedPath}`
}

async function getLiff(): Promise<typeof LiffType> {
  if (!liffInstance) {
    const mod = await import('@line/liff')
    liffInstance = mod.default
  }
  return liffInstance
}

export async function initLiff(): Promise<void> {
  if (initialized) return
  const liff = await getLiff()
  await liff.init({ liffId: getLiffId() })
  initialized = true
}

/**
 * ภาษาของแอป LINE ที่ผู้ใช้ตั้งไว้ (RFC 5646 เช่น "th", "en-US", "id") — ใช้เดาภาษาครั้งแรกที่เปิด (i18n D2)
 * เรียกได้ก่อน liff.init() (SDK ≥ 2.24) · นอก LIFF browser หรือ SDK เก่าจะตกไปใช้ภาษาของเบราว์เซอร์แทน
 */
export async function getLiffAppLanguage(): Promise<string | null> {
  try {
    const sdk = await getLiff()
    const language = sdk.getAppLanguage?.()
    if (language) return language
  } catch {
    // เปิดนอก LIFF (dev/E2E) — ไม่ถือเป็น error
  }
  return typeof navigator !== 'undefined' ? navigator.language : null
}

export const liff = new Proxy({} as typeof LiffType, {
  get(_target, prop) {
    if (!liffInstance) {
      throw new Error(`LIFF not initialized. Call initLiff() first.`)
    }
    return (liffInstance as any)[prop]
  },
})

export function getLiffAccessToken(): string | null {
  if (process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === 'true') {
    return 'e2e-line-access-token'
  }

  return liff.getAccessToken()
}
