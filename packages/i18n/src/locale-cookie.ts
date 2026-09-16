import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isLocale, type Locale } from './locales.ts'

/**
 * เขียน/อ่าน cookie ภาษาฝั่งเบราว์เซอร์ (ฝั่ง server อ่านผ่าน next/headers ใน i18n/request.ts ของแต่ละแอป)
 * cookie ตัวเดียวใช้ร่วมกันทั้ง LIFF และ Admin — ดูแผน i18n ข้อ D2
 * หลังเขียนต้องเรียก router.refresh() ให้ server render ข้อความภาษาใหม่ (โหมดไม่มี URL routing)
 */
export function writeLocaleCookie(locale: Locale) {
  if (typeof document === 'undefined') return
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax${secure}`
}

export function readLocaleCookie(): Locale | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LOCALE_COOKIE}=`))
  const value = match?.slice(LOCALE_COOKIE.length + 1)
  return isLocale(value) ? value : null
}
