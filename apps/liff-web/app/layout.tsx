import type { Metadata } from 'next'
import Script from 'next/script'
import { cookies } from 'next/headers'
import { Noto_Sans_Thai } from 'next/font/google'
import './globals.css'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getTranslations } from 'next-intl/server'
import { LOCALE_COOKIE, type Locale } from '@hrms/i18n'
import { LiffProvider } from '@/components/providers/liff-provider'
import { LocaleProvider } from '@/components/providers/locale-provider'
import { QueryProvider } from '@/components/providers/query-provider'
import { FontSizeProvider } from '@/components/providers/font-size-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { LocaleOnboarding } from '@/components/shared/locale-onboarding'

const notoSansThai = Noto_Sans_Thai({
  variable: '--font-noto-sans-thai',
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
})

// ไอคอนแท็บมาจากไฟล์ app/icon.png + app/apple-icon.png (file-based metadata ของ Next)
// ซึ่งชนะ metadata.icons ที่ประกาศในโค้ดเสมอ จึงไม่ประกาศซ้ำให้สับสน — ชุดเดียวกับ admin-web
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('liff.meta')
  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // ภาษาของ request มาจาก cookie ผ่าน i18n/request.ts — ไม่มี cookie = th แล้วให้ LocaleOnboarding เดา/ถามฝั่ง client
  const locale = (await getLocale()) as Locale
  const hasLocaleCookie = (await cookies()).has(LOCALE_COOKIE)
  return (
    <html
      lang={locale}
      className={`${notoSansThai.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground font-(family-name:--font-noto-sans-thai)">
        {/* ตั้ง font size + theme ก่อน React hydrate เพื่อกันจอกระพริบ (สลับค่าหลัง mount) */}
        <Script id="font-size-init" strategy="beforeInteractive">
          {`try{var s=JSON.parse(localStorage.getItem('hrms-liff-settings')||'{}');var f=s.state&&s.state.fontSize;if(f)document.documentElement.dataset.fontSize=f;}catch(e){}`}
        </Script>
        <Script id="theme-init" strategy="beforeInteractive">
          {`try{var s=JSON.parse(localStorage.getItem('hrms-liff-settings')||'{}');var t=(s.state&&s.state.theme)||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}`}
        </Script>
        <NextIntlClientProvider>
          <LocaleProvider locale={locale}>
            <ThemeProvider>
              <FontSizeProvider>
                <LiffProvider>
                  <QueryProvider>
                    {/* mobile frame: จำกัดความกว้าง 430px กลางจอ */}
                    <div className="mx-auto max-w-107.5 min-h-screen flex flex-col">
                      <LocaleOnboarding hasLocaleCookie={hasLocaleCookie} serverLocale={locale}>
                        {children}
                      </LocaleOnboarding>
                    </div>
                  </QueryProvider>
                </LiffProvider>
              </FontSizeProvider>
            </ThemeProvider>
          </LocaleProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
