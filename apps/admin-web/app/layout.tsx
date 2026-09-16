import type { Metadata } from 'next'
import { Noto_Sans_Thai } from 'next/font/google'
import './globals.css'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale } from 'next-intl/server'
import { QueryProvider } from '@/components/providers/query-provider'
import { LocaleProvider } from '@/components/providers/locale-provider'
import type { Locale } from '@hrms/i18n'
import { Toaster } from 'sonner'

const notoSansThai = Noto_Sans_Thai({
  variable: '--font-noto-sans-thai',
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
})

// ไอคอนแท็บมาจากไฟล์ app/icon.png + app/apple-icon.png (file-based metadata ของ Next)
// ซึ่งชนะ metadata.icons ที่ประกาศตรงนี้เสมอ จึงไม่ประกาศซ้ำให้สับสน
export const metadata: Metadata = {
  title: 'TBG Assistant',
  description: 'ระบบบริหารจัดการข้อมูลภายในองค์กร',
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // ภาษาของ request มาจาก cookie ผ่าน i18n/request.ts — ยังเป็น th เสมอจนกว่าจะมีตัวสลับภาษา (Phase 2.2)
  const locale = (await getLocale()) as Locale
  return (
    <html lang={locale} className={`${notoSansThai.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Apply theme + font size before first paint to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(t!=='light'&&d)){document.documentElement.classList.add('dark')}var f=localStorage.getItem('font-size');if(f==='small'){document.documentElement.style.fontSize='14px'}else if(f==='large'){document.documentElement.style.fontSize='18px'}})()` }} />
      </head>
      <body suppressHydrationWarning className="min-h-full bg-background text-foreground font-(family-name:--font-noto-sans-thai)">
        <NextIntlClientProvider>
          <LocaleProvider locale={locale}>
            <QueryProvider>
              {children}
              <Toaster position="top-right" richColors closeButton duration={3000} />
            </QueryProvider>
          </LocaleProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
