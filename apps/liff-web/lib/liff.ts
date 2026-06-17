import type LiffType from '@line/liff'

let liffInstance: typeof LiffType | null = null
let initialized = false

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
  await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! })
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
