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
