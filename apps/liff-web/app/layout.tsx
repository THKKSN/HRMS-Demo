import type { Metadata } from 'next'
import Script from 'next/script'
import { Noto_Sans_Thai } from 'next/font/google'
import './globals.css'
import { LiffProvider } from '@/components/providers/liff-provider'
import { QueryProvider } from '@/components/providers/query-provider'
import { FontSizeProvider } from '@/components/providers/font-size-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'

const notoSansThai = Noto_Sans_Thai({
  variable: '--font-noto-sans-thai',
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'TBG Assistant',
  description: 'ระบบบริหารทรัพยากรบุคคล',
  icons: {
    icon: '/tbg-assistant.jpg',
    shortcut: '/tbg-assistant.jpg',
    apple: '/tbg-assistant.jpg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="th"
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
        <ThemeProvider>
          <FontSizeProvider>
            <LiffProvider>
              <QueryProvider>
                {/* mobile frame: จำกัดความกว้าง 430px กลางจอ */}
                <div className="mx-auto max-w-107.5 min-h-screen flex flex-col">
                  {children}
                </div>
              </QueryProvider>
            </LiffProvider>
          </FontSizeProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
